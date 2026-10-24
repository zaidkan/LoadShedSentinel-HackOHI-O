"""Deterministic planning checks; no live grid or crew operations."""
import copy
import math
import unittest
from pathlib import Path

NOW = '2026-10-24T18:00:00Z'
WORKBOOK = Path(__file__).resolve().parents[1] / 'aep_challenge_hack26/data/Install_Labor_HackOHIO.xlsx'


def evidence(kind, value, key='e1', quality='modeled', provenance='modeled_sensor', **extra):
    return dict(id=key, incident_id='i1', asset_id='a1', timestamp_utc=NOW,
                kind=kind, value=value, quality=quality, provenance=provenance,
                visibility='operator', **extra)


def snapshot(rows):
    return dict(incident_id='i1', current_asset_id='a1', timestamp_utc=NOW, evidence=rows)


class EngineTests(unittest.TestCase):
    def test_required_services_exist(self):
        root = Path(__file__).resolve().parents[1]
        for name in ['pipeline/import_labor.py', 'engine/diagnosis.py', 'engine/crew.py', 'engine/restoration.py', 'engine/energy.py']:
            self.assertTrue((root / name).is_file(), name)

    def test_multiplier_once(self):
        from engine.restoration import labor_person_hours
        result = labor_person_hours(6)
        self.assertEqual(result['raw_direct_hours'], 6)
        self.assertEqual(result['indirect_multiplier_applied'], 4.5)
        self.assertEqual(result['adjusted_person_hours'], 27)
        adjusted = labor_person_hours(27, hour_basis='adjusted_person_hours')
        self.assertEqual(adjusted['adjusted_person_hours'], 27)
        self.assertEqual(adjusted['indirect_multiplier_applied'], 1)
        self.assertIsNone(adjusted['raw_direct_hours'])
        for value in [-1, math.nan, math.inf, True]:
            with self.assertRaises(ValueError): labor_person_hours(value)
        with self.assertRaises(ValueError): labor_person_hours(6, hour_basis='crew_hours')

    def test_workbook_audit_and_missingness(self):
        from pipeline.import_labor import load_labor_catalog
        catalog = load_labor_catalog(WORKBOOK)
        self.assertEqual(len(catalog['sheets']), 5)
        self.assertEqual(catalog['indirect_multiplier'], 4.5)
        self.assertEqual(sum(s['formula_count'] for s in catalog['sheets']), 3)
        self.assertEqual(len(catalog['sha256']), 64)
        refs = {r['code']: r for r in catalog['records']}
        self.assertEqual(refs['CNC-HTA-10']['install_hours'], .096)
        self.assertEqual(refs['POL:Medium']['install_hours'], 2.50295207667732)
        self.assertEqual(refs['XCO']['remove_hours'], .12800000000000009)
        self.assertIsNone(refs['LABOR:Junction Pole Work']['install_hours'])
        self.assertEqual(refs['LABOR:Hand Dig']['quantity_unit'], 'cubic_foot')
        self.assertTrue(all(r['source']['sheet'] and r['source']['cells'] for r in refs.values()))

    def test_damage_mapping_requires_sizes_and_quantities(self):
        from pipeline.import_labor import load_labor_catalog, map_damage_to_work_packages
        c = load_labor_catalog(WORKBOOK)
        mapped = map_damage_to_work_packages(dict(asset_type='Pole', pole_height_ft=45, quantity=2, operation='replace'), c)
        self.assertEqual(mapped['work_packages'][0]['labor_ref']['code'], 'POL:Medium')
        self.assertEqual(mapped['work_packages'][0]['quantity'], 2)
        self.assertTrue(mapped['requires_dispatcher_review'])
        for damage in [dict(asset_type='Pole', quantity=1), dict(asset_type='Transformer', transformer_kva=37.5, quantity=1), dict(asset_type='primary', quantity=1), dict(asset_type='Fuse Bank')]:
            self.assertFalse(map_damage_to_work_packages(damage, c)['work_packages'])
        self.assertEqual(map_damage_to_work_packages(dict(asset_type='Transformer', transformer_kva=25, quantity=1), c)['work_packages'][0]['labor_ref']['code'], 'TRANSFORMER:25')

    def test_local_cutout_is_not_transformer_replacement(self):
        from engine.diagnosis import assess_incident
        from engine.crew import recommend_crew
        rows = [evidence('cutout_state', 'OPEN'), evidence('temperature_state', 'NORMAL', 'e2')]
        result = assess_incident(snapshot(rows))
        self.assertEqual(result['primary_code'], 'LOCAL_PROTECTION_OPERATION')
        self.assertEqual(result['equipment_condition'], 'INSUFFICIENT_EVIDENCE')
        crew = recommend_crew(result, rows)
        self.assertFalse(crew['approved'])
        self.assertNotIn('rated transformer', ' '.join(crew['material_categories']))
        self.assertTrue(all(h['score_type'] != 'calibrated_probability' for h in result['hypotheses']))

    def test_upstream_control_avoids_local_replacement(self):
        from engine.diagnosis import assess_incident
        from engine.crew import recommend_crew
        rows = [evidence('upstream_trip', True), evidence('widespread_outage', True, 'e2')]
        d = assess_incident(snapshot(rows))
        self.assertEqual(d['primary_code'], 'UPSTREAM_FEEDER_INTERRUPTION')
        self.assertEqual(recommend_crew(d, rows)['candidate_damage_class'], 'upstream_feeder')

    def test_distress_then_confirmed_damage_changes_package(self):
        from engine.diagnosis import assess_incident
        from engine.crew import recommend_crew
        rows = [evidence('temperature_state', 'ABNORMAL'), evidence('acoustic_anomaly', True, 'e2')]
        d = assess_incident(snapshot(rows))
        self.assertEqual(d['primary_code'], 'POSSIBLE_EQUIPMENT_DISTRESS')
        self.assertEqual(recommend_crew(d, rows)['basis'], 'assessment_required')
        confirmed = evidence('field_damage', 'transformer', 'e3', quality='field_confirmed', provenance='scenario')
        rows += [confirmed]
        crew = recommend_crew(assess_incident(snapshot(rows)), rows)
        self.assertEqual(crew['candidate_damage_class'], 'transformer_replacement')
        self.assertEqual(crew['basis'], 'field_confirmed')
        self.assertFalse(crew['approved'])
        self.assertIn('scenario', crew['reason'].lower())
        confirmed['quality'] = 'reported'
        self.assertNotEqual(recommend_crew(assess_incident(snapshot(rows)), rows)['candidate_damage_class'], 'transformer_replacement')

    def test_unknown_and_conflicting_evidence_abstain(self):
        from engine.diagnosis import assess_incident
        from engine.crew import recommend_crew
        for rows in [[], [evidence('cutout_state', 'OPEN'), evidence('cutout_state', 'CLOSED', 'e2')], [evidence('temperature_state', 'HOT', quality='missing')]]:
            d = assess_incident(snapshot(rows))
            self.assertEqual(d['primary_code'], 'INSUFFICIENT_EVIDENCE')
            self.assertEqual(recommend_crew(d, rows)['basis'], 'assessment_required')
            self.assertIsNone(d['hypotheses'][0]['score'])

    def test_evidence_isolation_and_determinism(self):
        from engine.diagnosis import assess_incident
        row = evidence('field_damage', 'transformer', quality='field_confirmed', provenance='scenario')
        row['incident_id'] = 'other'
        self.assertEqual(assess_incident(snapshot([row]))['primary_code'], 'INSUFFICIENT_EVIDENCE')
        row['incident_id'] = 'i1'; row['asset_id'] = 'other'
        self.assertEqual(assess_incident(snapshot([row]))['primary_code'], 'INSUFFICIENT_EVIDENCE')
        rows = [evidence('cutout_state', 'OPEN'), evidence('temperature_state', 'NORMAL', 'e2')]
        original = copy.deepcopy(rows)
        self.assertEqual(assess_incident(snapshot(rows)), assess_incident(snapshot(list(reversed(rows)))))
        self.assertEqual(rows, original)

    def test_workload_crew_and_unavailable(self):
        from engine.restoration import estimate_restoration
        damage = dict(quantity=1, operation='install', quantity_unit='construction_unit')
        ref = dict(install_hours=6, remove_hours=2, hour_basis='direct_job_site_hours', quantity_unit='construction_unit', source={'sheet': 'synthetic', 'cells': ['B2']})
        r = estimate_restoration(damage, ref, dict(timestamp_utc=NOW, crew_size=3))
        self.assertEqual(r['labor_work_hours'], 27)
        self.assertEqual(r['expected_hours'], 9)
        self.assertEqual(r['kind'], 'scenario_planning')
        self.assertLessEqual(r['lower_hours'], r['expected_hours'])
        self.assertLessEqual(r['expected_hours'], r['upper_hours'])
        self.assertEqual(estimate_restoration(damage, ref, dict(timestamp_utc=NOW, crew_size=6))['expected_hours'], 4.5)
        for context in [dict(timestamp_utc=NOW), dict(timestamp_utc=NOW, crew_size=0), dict(timestamp_utc=NOW, crew_size=True)]:
            self.assertEqual(estimate_restoration(damage, ref, context)['kind'], 'unavailable')
        self.assertEqual(estimate_restoration(damage, None, dict(timestamp_utc=NOW, crew_size=3))['kind'], 'unavailable')
        with self.assertRaises(ValueError): estimate_restoration(damage, ref, dict(timestamp_utc=NOW, crew_size=3, travel_hours=2))
        bad = {**damage, 'quantity_unit': 'feet'}
        self.assertEqual(estimate_restoration(bad, ref, dict(timestamp_utc=NOW, crew_size=3))['kind'], 'unavailable')

    def test_dependency_and_shared_crews(self):
        from engine.restoration import schedule_tasks
        a = dict(id='a', person_hours=27, crew_size=3, crew_id='one', dependencies=[])
        b = dict(id='b', person_hours=27, crew_size=3, crew_id='two', dependencies=[])
        context = dict(duration_factors=[1, 1, 1])
        self.assertEqual(schedule_tasks([a, b], context)['full_repair_hours'], [9, 9, 9])
        self.assertEqual(schedule_tasks([a, {**b, 'dependencies': ['a']}], context)['full_repair_hours'], [18, 18, 18])
        self.assertEqual(schedule_tasks([a, {**b, 'crew_id': 'one'}], context)['full_repair_hours'], [18, 18, 18])
        self.assertEqual(schedule_tasks([b, a], context), schedule_tasks([a, b], context))
        for tasks in [[a, {**a}], [{**a, 'dependencies': ['missing']}], [{**a, 'dependencies': ['b']}, {**b, 'dependencies': ['a']}]]:
            with self.assertRaises(ValueError): schedule_tasks(tasks, context)

    def test_energy_math_bounds_and_buffer(self):
        from engine.energy import daily_energy_wh, simulate_energy
        self.assertAlmostEqual(daily_energy_wh({}), .648)
        result = simulate_energy({}, {'segments': [{'hours': 24, 'irradiance_fraction': 0}]}, dict(start_utc=NOW, hours=24, connectivity='ONLINE'))
        self.assertAlmostEqual(result['solar']['battery_soc_pct'], 100 * (41 - .648) / 41)
        self.assertEqual(result['solar']['solar_w'], 25)
        event = {'id': 'alarm', 'timestamp_utc': NOW}
        off = simulate_energy({'initial_soc_pct': 0}, {'segments': [{'hours': 24, 'irradiance_fraction': 0}]}, dict(start_utc=NOW, hours=24, connectivity='OFFLINE', events=[event]))
        self.assertEqual(off['solar']['battery_soc_pct'], 0)
        self.assertEqual(off['buffered_events'], [event])
        self.assertGreater(off['unserved_wh'], 0)
        sunny = simulate_energy({}, {'segments': [{'hours': 24, 'irradiance_fraction': 1}]}, dict(start_utc=NOW, hours=24, connectivity='ONLINE', buffered_events=[event]))
        self.assertEqual(sunny['solar']['battery_soc_pct'], 100)
        self.assertEqual(sunny['delivered_events'], [event])
        self.assertEqual(sunny['buffered_events'], [])
        for point in sunny['trace']: self.assertTrue(0 <= point['battery_soc_pct'] <= 100)
        for cfg in [{'nominal_wh': 0}, {'standby_w': -1}, {'initial_soc_pct': math.nan}, {'usable_fraction': 2}]:
            with self.assertRaises(ValueError): simulate_energy(cfg, {'segments': [{'hours': 24, 'irradiance_fraction': 0}]}, dict(start_utc=NOW, hours=24))


    def test_staged_restoration_preserves_upstream_blockers_and_confirmation(self):
        from engine.restoration import evaluate_restoration
        blockers = {'p-local': ['upstream', 'local'], 'p-neighbor': ['upstream']}
        local = evaluate_restoration(blockers, ['local'], ['p-local'])
        self.assertEqual(local[0]['remaining_blockers'], ['upstream'])
        self.assertFalse(local[0]['modeled_restored'])
        upstream = evaluate_restoration(blockers, ['upstream'])
        self.assertFalse(upstream[0]['ready_for_review'])
        self.assertTrue(upstream[1]['ready_for_review'])
        self.assertFalse(upstream[1]['modeled_restored'])
        released = evaluate_restoration(blockers, ['upstream'], ['p-neighbor'])
        self.assertTrue(released[1]['modeled_restored'])
        self.assertFalse(released[0]['modeled_restored'])
        with self.assertRaises(ValueError): evaluate_restoration(blockers, ['unknown'])

    def test_latest_evidence_and_confirmation_are_hypothesis_specific(self):
        from engine.diagnosis import assess_incident
        older = evidence('cutout_state', 'CLOSED', 'old'); older['timestamp_utc'] = '2026-10-24T17:00:00Z'
        rows = [older, evidence('cutout_state', 'OPEN'), evidence('upstream_trip', True, 'trip'), evidence('field_damage', 'transformer', 'field', quality='field_confirmed', provenance='scenario')]
        d = assess_incident(snapshot(rows))
        self.assertNotEqual(d['primary_code'], 'INSUFFICIENT_EVIDENCE')
        by_code = {h['code']: h for h in d['hypotheses']}
        self.assertTrue(by_code['UPSTREAM_FEEDER_INTERRUPTION']['requires_field_confirmation'])
        self.assertFalse(by_code['POSSIBLE_EQUIPMENT_DISTRESS']['requires_field_confirmation'])
        self.assertEqual(assess_incident(snapshot(rows + [rows[1]])), d)

    def test_energy_retries_cold_capacity_and_time_preservation(self):
        from engine.energy import simulate_energy, daily_energy_wh
        self.assertAlmostEqual(daily_energy_wh({'retry_attempts': 1}), .936)
        event = {'id': 'x', 'timestamp_utc': '2026-10-24T18:30:00Z'}
        inputs = dict(start_utc=NOW, hours=2, events=[event])
        original = copy.deepcopy(inputs)
        result = simulate_energy({'usable_fraction': .8, 'cold_derating': .5}, {'segments': [{'hours': 1, 'irradiance_fraction': 0, 'connectivity': 'OFFLINE'}, {'hours': 1, 'irradiance_fraction': 1, 'connectivity': 'ONLINE'}]}, inputs)
        self.assertEqual(result['delivered_events'], [event])
        self.assertEqual(result['buffered_events'], [])
        self.assertEqual(inputs, original)
        self.assertLessEqual(max(p['battery_wh'] for p in result['trace']), 41 * .8 * .5)
        with self.assertRaises(ValueError): simulate_energy({}, {'segments': [{'hours': 1, 'irradiance_fraction': 0}]}, dict(start_utc=NOW, hours=2))

    def test_outputs_match_authoritative_model_fields(self):
        import ast
        from engine.diagnosis import assess_incident
        from engine.crew import recommend_crew
        from engine.restoration import estimate_restoration
        from engine.energy import simulate_energy
        schema_path = Path('/Users/zaid/Larp-MAXXX/hackathon/api/schemas.py')
        if not schema_path.exists(): self.skipTest('Integrator schema source not available')
        classes = {node.name: {child.target.id for child in node.body if isinstance(child, ast.AnnAssign)}
                   for node in ast.parse(schema_path.read_text()).body if isinstance(node, ast.ClassDef)}
        d = assess_incident(snapshot([evidence('cutout_state', 'OPEN')]))
        outputs = {'Hypothesis': d['hypotheses'][0], 'CrewPackage': recommend_crew(d, [evidence('cutout_state', 'OPEN')]),
                   'Restoration': estimate_restoration(None, None, {'timestamp_utc': NOW}),
                   'SolarNode': simulate_energy({}, {'segments': [{'hours': 1, 'irradiance_fraction': 0}]}, {'start_utc': NOW, 'hours': 1})['solar']}
        for name, output in outputs.items(): self.assertEqual(set(output), classes[name], name)


if __name__ == '__main__':
    unittest.main()

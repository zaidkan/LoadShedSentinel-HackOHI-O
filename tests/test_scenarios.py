"""Behavior and runtime contract checks for the four modeled demonstrations."""
import copy
import unittest

class ScenarioTests(unittest.TestCase):
    def generate(self, scenario, context=None):
        from engine.scenarios import generate_scenario
        return generate_scenario(scenario, {} if context is None else context)

    def test_all_scenarios_validate_as_typed_snapshots(self):
        from api.schemas import ScenarioSnapshot
        cases = {
            'local_protection': 'LOCAL_PROTECTION_OPERATION',
            'upstream_feeder': 'UPSTREAM_FEEDER_INTERRUPTION',
            'confirmed_replacement': 'POSSIBLE_EQUIPMENT_DISTRESS',
            'insufficient_evidence': 'INSUFFICIENT_EVIDENCE',
        }
        for name, primary in cases.items():
            with self.subTest(scenario=name):
                snapshot = self.generate(name)
                self.assertIsInstance(snapshot, ScenarioSnapshot)
                restored = ScenarioSnapshot.model_validate_json(snapshot.model_dump_json())
                self.assertEqual(restored, snapshot)
                self.assertEqual(snapshot.hypotheses[0].code, primary)
                self.assertFalse(snapshot.crew_recommendation.approved)
                self.assertIn('demonstration', snapshot.disclosure.lower())
                self.assertIn('not', snapshot.disclosure.lower())
                self.assertTrue(all(e.provenance in ('scenario', 'modeled_sensor') for e in snapshot.evidence))
                self.assertTrue(all(n.delivery_mode == 'demo' for n in snapshot.notifications))

    def test_local_protection_does_not_infer_transformer_replacement(self):
        snap = self.generate('local_protection')
        self.assertEqual(snap.cutout_status, 'OPEN')
        self.assertEqual(snap.status, 'OUTAGE')
        self.assertEqual(len(snap.affected_premise_tokens), 3)
        self.assertEqual(snap.impact_source.provenance if hasattr(snap.impact_source, 'provenance') else snap.impact_source['provenance'], 'aep_challenge')
        self.assertEqual(snap.current_asset_id, snap.impact_source['fault_asset_token'])
        self.assertEqual(snap.crew_recommendation.candidate_damage_class, 'protection_or_unknown')
        self.assertTrue(snap.hypotheses[0].requires_field_confirmation)
        self.assertFalse(any(e.kind == 'field_damage' for e in snap.evidence))

    def test_upstream_interrupts_wider_footprint_without_opening_local_cutout(self):
        local = self.generate('local_protection')
        snap = self.generate('upstream_feeder')
        self.assertEqual(snap.cutout_status, 'CLOSED')
        self.assertEqual(len(snap.affected_premise_tokens), 16)
        self.assertEqual(snap.impact_source['fault_asset_kind'], 'CIRCUIT_BREAKER')
        self.assertTrue(set(local.affected_premise_tokens) < set(snap.affected_premise_tokens))
        self.assertEqual(snap.crew_recommendation.candidate_damage_class, 'upstream_feeder')
        trip = next(e for e in snap.evidence if e.kind == 'upstream_trip')
        self.assertIs(trip.value, True)
        self.assertNotEqual(trip.asset_id, snap.current_asset_id)
        self.assertTrue(any(e.kind == 'upstream_protection_state' and e.value == 'OPEN' for e in snap.evidence))

    def test_replacement_has_explicit_scenario_field_confirmation(self):
        snap = self.generate('confirmed_replacement')
        self.assertEqual(snap.crew_recommendation.candidate_damage_class, 'transformer_replacement')
        self.assertEqual(snap.crew_recommendation.basis, 'field_confirmed')
        field = next(e for e in snap.evidence if e.kind == 'field_damage')
        self.assertEqual((field.value, field.quality, field.provenance), ('transformer', 'field_confirmed', 'scenario'))
        self.assertFalse(snap.hypotheses[0].requires_field_confirmation)
        self.assertTrue(any(e.kind == 'oil_condition' and 'boiling' in e.value for e in snap.evidence))
        self.assertTrue(any('transformer' in m for m in snap.crew_recommendation.material_categories))

    def test_contradiction_abstains_without_outage_confirmation_or_estimate(self):
        snap = self.generate('insufficient_evidence')
        self.assertEqual(snap.cutout_status, 'UNKNOWN')
        self.assertEqual(snap.status, 'UNDER_REVIEW')
        self.assertEqual(snap.crew_recommendation.basis, 'assessment_required')
        self.assertIsNone(snap.hypotheses[0].score)
        self.assertGreaterEqual(len(snap.hypotheses[0].contradicting_evidence_ids), 2)
        self.assertEqual(snap.restoration.kind, 'unavailable')
        self.assertIsNone(snap.restoration.expected_hours)
        self.assertEqual(snap.customer_risk.band, 'UNKNOWN')
        self.assertEqual(snap.affected_premise_tokens, [])
        self.assertEqual(snap.notifications, [])

    def test_person_hours_and_ordered_scenario_ranges(self):
        expected = {'local_protection': (4.5, 2.25), 'upstream_feeder': (13.5, 4.5), 'confirmed_replacement': (27, 9)}
        for name, (labor, duration) in expected.items():
            snap = self.generate(name)
            plan = snap.restoration
            self.assertEqual(plan.kind, 'scenario_planning')
            self.assertEqual(plan.labor_work_hours, labor)
            self.assertEqual(plan.expected_hours, duration)
            self.assertEqual(plan.labor_work_unit, 'person-hours')
            self.assertLess(plan.lower_hours, plan.expected_hours)
            self.assertGreater(plan.upper_hours, plan.expected_hours)
            self.assertIn('illustrative', ' '.join(plan.assumptions).lower())
            self.assertIn('not workbook', ' '.join(plan.assumptions).lower())

    def test_crew_and_delays_recompute_with_no_double_indirect_allowance(self):
        snap = self.generate('confirmed_replacement', {'crew_size': 6, 'queue_hours': 2, 'access_hours': [1, 2, 3]})
        self.assertEqual(snap.restoration.expected_hours, 8.5)  # 27 / 6 + 2 + 2
        self.assertEqual(snap.restoration.labor_work_hours, 27)
        with self.assertRaises(ValueError): self.generate('local_protection', {'travel_hours': 1})

    def test_context_ids_timestamps_and_support_refs_are_consistent(self):
        context = dict(incident_id='INC-X', current_asset_id='T-X', upstream_asset_id='R-X',
                       local_premise_tokens=['P-A'], feeder_premise_tokens=['P-A', 'P-B'],
                       selected_premise_token='P-A', timestamp_utc='2026-10-24T15:00:00-04:00', revision=3)
        snap = self.generate('upstream_feeder', context)
        self.assertEqual(snap.timestamp_utc, '2026-10-24T19:00:00Z')
        self.assertEqual((snap.incident_id, snap.current_asset_id, snap.revision), ('INC-X', 'T-X', 3))
        self.assertEqual(snap.affected_premise_tokens, ['P-A', 'P-B'])
        self.assertEqual(snap.selected_premise_token, 'P-A')
        ids = {e.id for e in snap.evidence}
        self.assertEqual(len(ids), len(snap.evidence))
        for e in snap.evidence:
            self.assertEqual(e.incident_id, 'INC-X')
            self.assertEqual(e.timestamp_utc, snap.timestamp_utc)
            self.assertIn(e.asset_id, ('T-X', 'R-X'))
        for h in snap.hypotheses:
            self.assertTrue(set(h.supporting_evidence_ids + h.contradicting_evidence_ids) <= ids)
        self.assertEqual(snap.restoration.last_updated_utc, snap.timestamp_utc)

    def test_inputs_and_returned_snapshots_are_isolated(self):
        context = {'local_premise_tokens': ['P-A'], 'feeder_premise_tokens': ['P-A', 'P-B'], 'duration_factors': [.5, 1, 2]}
        original = copy.deepcopy(context)
        first = self.generate('local_protection', context)
        second = self.generate('local_protection', context)
        self.assertEqual(first, second)
        first.evidence.clear(); first.affected_premise_tokens.append('P-C')
        self.assertEqual(context, original)
        self.assertGreater(len(second.evidence), 0)
        self.assertNotIn('P-C', self.generate('local_protection', context).affected_premise_tokens)

    def test_rejects_invalid_scenario_and_context_boundaries(self):
        for name in ['', 'local_fuse', None, []]:
            with self.subTest(name=name), self.assertRaises(ValueError): self.generate(name)
        invalid = [None, [], {'timestamp_utc': '2026-10-24'}, {'timestamp_utc': '1800-01-01T00:00:00Z'},
                   {'crew_size': 0}, {'crew_size': True}, {'crew_size': 1.5}, {'crew_size': 101},
                   {'queue_hours': -1}, {'duration_factors': [1, .5, 2]}, {'incident_id': ''},
                   {'current_asset_id': 'secret/path'}, {'revision': True}, {'revision': 0},
                   {'local_premise_tokens': []}, {'local_premise_tokens': ['P-A', 'P-A']},
                   {'selected_premise_token': 'P-FOREIGN'}, {'upstream_asset_id': self.generate('local_protection').current_asset_id},
                   {'feeder_premise_tokens': ['P-FOREIGN']}, {'evidence': []}]
        from engine.scenarios import generate_scenario
        for context in invalid:
            with self.subTest(context=context), self.assertRaises(ValueError): generate_scenario('local_protection', context)

    def test_solar_is_a_bounded_modeled_node(self):
        solar = self.generate('local_protection').solar
        self.assertEqual((solar.solar_w, solar.nominal_wh, solar.provenance), (25, 41, 'modeled_sensor'))
        self.assertGreater(solar.battery_soc_pct, 0)
        self.assertLessEqual(solar.battery_soc_pct, 100)
        self.assertGreater(solar.modeled_runtime_days, 0)


if __name__ == '__main__':
    unittest.main()

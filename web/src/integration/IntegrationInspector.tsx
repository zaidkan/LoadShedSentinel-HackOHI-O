import { useEffect, useSyncExternalStore } from 'react';
import { incidentStore } from '../state/incidentStore';
import './inspector.css';

/** Temporary integration surface. Persons 3/5 replace visuals with typed page components. */
export function IntegrationInspector() {
  const { scenarios, scenarioId, snapshot: s, customer: c, loading, error } = useSyncExternalStore(incidentStore.subscribe, incidentStore.getSnapshot);
  useEffect(() => { void incidentStore.load(); }, []);
  return <main className="integration-inspector">
    <header><span className="eyebrow">LOADSHED SENTINEL · PERSON 4</span><h1>Integration console</h1><p>One scenario, synchronized operator and customer responses.</p></header>
    <aside className="disclosure">Synthetic starter data. Grid imports, labor calculations and final visual pages await the other module owners.</aside>
    <section className="controls" aria-label="Scenario controls">
      <label>Scenario <select disabled={loading} value={scenarioId} onChange={e => void incidentStore.load(e.target.value)}>{scenarios.map(x => <option value={x.id} key={x.id}>{x.title}</option>)}</select></label>
      <button disabled={loading} onClick={() => void incidentStore.act('advance')}>Advance event</button>
      <button disabled={loading} onClick={() => void incidentStore.reset()}>Reset run</button>
      <button disabled={loading} onClick={() => void incidentStore.load()}>Refresh</button>
      <a href="/api/health" target="_blank" rel="noreferrer">API health</a>
    </section>
    {error && <p role="alert" className="error">{error}</p>}
    <p role="status" aria-live="polite">{loading ? 'Synchronizing…' : s ? `Revision ${s.revision} · ${s.phase.replaceAll('_', ' ')}` : 'Start the API to load a scenario.'}</p>
    {s && c && <>
      <label>Selected home <select disabled={loading} value={s.selected_premise_token} onChange={e => void incidentStore.act('select_premise', e.target.value)}>{s.premise_states.map(p => <option key={p.premise_token}>{p.premise_token}</option>)}</select></label>
      <div className="panels">
        <section aria-label="Operator response"><h2>Operator state</h2><p>Source: synthetic fixture · cutout {s.cutout_status}</p><p><strong>{s.impact_summary.known_affected_count}</strong> affected · <strong>{s.impact_summary.restored_in_scenario_count}</strong> restored</p>
          <h3>Selected supply path</h3><ol>{s.selected_supply_path.asset_tokens.map(x => <li key={x}>{x}</li>)}</ol>
          <h3>Repair events</h3>{!s.repair_tasks.length && <p>Advance to activate scenario evidence.</p>}{s.repair_tasks.map(t => <div className="task" key={t.task_id}><strong>{t.task_id}</strong><span>{t.status}</span><button disabled={loading || t.status === 'COMPLETE'} onClick={() => void incidentStore.act(t.status === 'PENDING' ? 'start_repair' : 'complete_repair', t.task_id)}>{t.status === 'PENDING' ? 'Start repair' : 'Complete repair'}</button></div>)}
          <h3>Household states</h3><ul>{s.premise_states.map(p => <li key={p.premise_token}>{p.premise_token}: {p.status} · {p.remaining_blocking_fault_ids.length} blockers</li>)}</ul>
          <h3>Assessment</h3>{s.hypotheses.map(h => <p key={h.code}>{h.label}</p>)}<p>{s.crew_recommendation.reason}</p>
        </section>
        <section aria-label="Customer response"><h2>Customer-safe response</h2><p>Revision {c.revision} · {c.premise_token}</p><p className="status">{c.status.replaceAll('_', ' ')}</p><p>{c.explanation}</p>
          <p>{c.restoration.kind === 'unavailable' ? 'Restoration estimate unavailable.' : `${c.restoration.lower_hours}–${c.restoration.upper_hours} hours remaining (illustrative scenario).`}</p>
          <label className="check"><input type="checkbox" checked={c.preferences.opted_in ?? false} disabled={loading} onChange={e => void incidentStore.setPreferences({ ...c.preferences, opted_in: e.target.checked })}/> Opt in to in-app demo alerts</label>
          <label className="check"><input type="checkbox" checked={c.preferences.needs?.medical_equipment ?? false} disabled={loading} onChange={e => void incidentStore.setPreferences({ ...c.preferences, needs: { ...c.preferences.needs, medical_equipment: e.target.checked } })}/> Declared medical-device power needs</label>
          <h3>Preparation</h3><ul>{c.plan.guidance.map(g => <li key={g}>{g}</li>)}</ul><p>{c.plan.alert_reason}</p>
          <h3>Demo alert history</h3>{!c.notifications.length && <p>No messages. Opt in before advancing to see the full sequence.</p>}{c.notifications.map(n => <article className="notification" key={n.id}><strong>{n.type.replaceAll('_', ' ')}</strong><p>{n.text}</p></article>)}
        </section>
      </div>
      <footer>{s.disclosure}</footer>
    </>}
  </main>;
}

import type { Action, CustomerSnapshot, Preferences, ScenarioSummary, Snapshot } from '../../../contracts/types';
import { api, ApiError } from '../services/api';

type State = { scenarios: ScenarioSummary[]; scenarioId: string; snapshot: Snapshot | null; customer: CustomerSnapshot | null; loading: boolean; error: string | null };
let state: State = { scenarios: [], scenarioId: 'multi_fault', snapshot: null, customer: null, loading: false, error: null };
const listeners = new Set<() => void>();
let generation = 0;
function publish(patch: Partial<State>) { state = { ...state, ...patch }; listeners.forEach(fn => fn()); }
async function readPair(id: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const snapshot = await api.snapshot(id);
    const customer = await api.customer(id, snapshot.selected_premise_token);
    if (snapshot.revision === customer.revision && snapshot.run_id === customer.run_id) return { snapshot, customer };
  }
  throw new Error('Scenario changed while refreshing. Try again.');
}
async function operation(fn: (current: Snapshot) => Promise<unknown>) {
  if (state.loading || !state.snapshot) return;
  const current = state.snapshot;
  const ticket = ++generation;
  publish({ loading: true, error: null });
  try {
    await fn(current);
    const pair = await readPair(current.scenario_id);
    if (ticket === generation) publish({ ...pair, loading: false });
  } catch (error) {
    if (ticket !== generation) return;
    if (error instanceof ApiError && error.status === 409) {
      try { const pair = await readPair(current.scenario_id); if (ticket === generation) publish(pair); } catch { /* preserve last known state */ }
    }
    if (ticket === generation) publish({ loading: false, error: error instanceof Error ? error.message : String(error) });
  }
}
export const incidentStore = {
  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
  getSnapshot: () => state,
  async load(scenarioId = state.scenarioId) {
    const ticket = ++generation;
    publish({ loading: true, error: null, scenarioId, snapshot: null, customer: null });
    try {
      const [scenarios, pair] = await Promise.all([api.scenarios(), readPair(scenarioId)]);
      if (ticket === generation) publish({ scenarios, ...pair, loading: false });
    } catch (error) {
      if (ticket === generation) publish({ loading: false, error: error instanceof Error ? error.message : String(error) });
    }
  },
  act(action: Action['action'], target_id?: string) {
    return operation(s => api.action(s.scenario_id, { action_id: crypto.randomUUID(), expected_revision: s.revision, action, ...(target_id ? { target_id } : {}) }));
  },
  reset() { return operation(s => api.reset(s.scenario_id, s.revision, crypto.randomUUID())); },
  setPreferences(preferences: Preferences) {
    return operation(s => api.preferences(s.scenario_id, s.selected_premise_token, s.revision, crypto.randomUUID(), preferences));
  },
};

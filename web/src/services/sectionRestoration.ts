import type { ScenarioSnapshot } from '../../../contracts/types';
import { getSessionId } from './api';

export type SectionAction = 'start' | 'isolate_section' | 'authorize_unaffected' | 'complete_repair' | 'authorize_repaired' | 'select_unaffected_premise' | 'select_faulted_premise';

export interface SectionRestorationState {
  phase: 'UPSTREAM_TRIP' | 'SECTION_ISOLATED' | 'UNAFFECTED_RESTORED' | 'REPAIR_COMPLETE' | 'REPAIRED_SECTION_RESTORED' | 'ALL_RESTORED';
  status?: 'OUTAGE' | 'PARTIALLY_RESTORED' | 'RESTORED';
  fault_asset_token: string;
  isolating_asset_token: string;
  all_premise_tokens: string[];
  isolated_premise_tokens: string[];
  unaffected_premise_tokens: string[];
  restored_premise_tokens: string[];
  still_out_premise_tokens: string[];
  isolation_confirmed: boolean;
  repair_complete: boolean;
  authorized_unaffected?: boolean;
  authorized_repaired?: boolean;
  assumptions: string[];
}

export async function sectionRestorationAction(action: SectionAction, snapshot: ScenarioSnapshot): Promise<ScenarioSnapshot> {
  const response = await fetch('/api/restoration/section-action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Session-ID': getSessionId() },
    body: JSON.stringify({ action, incident_id: snapshot.incident_id, expected_revision: snapshot.revision }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(typeof payload?.detail === 'string' ? payload.detail : `Section action failed (${response.status}).`);
  }
  return response.json();
}

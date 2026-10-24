import type { Action, CustomerSnapshot, Preferences, ScenarioSummary, Snapshot } from '../../../contracts/types';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  // Retry transport failures with the SAME action ID. Server deduplicates mutations.
  for (let attempt = 0; ; attempt++) {
    let response: Response;
    try {
      response = await fetch(`/api${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });
    } catch (error) {
      if (attempt === 0) continue;
      throw error;
    }
    const data = await response.json();
    if (!response.ok) throw new ApiError(response.status, typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail));
    return data as T;
  }
}
const segment = encodeURIComponent;
export const api = {
  scenarios: () => request<ScenarioSummary[]>('/scenarios'),
  snapshot: (id: string) => request<Snapshot>(`/incidents/${segment(id)}/snapshot`),
  customer: (id: string, premise: string) => request<CustomerSnapshot>(`/customer/${segment(id)}/${segment(premise)}/snapshot`),
  action: (id: string, body: Action) => request<Snapshot>(`/scenarios/${segment(id)}/actions`, body),
  reset: (id: string, expected_revision: number, action_id: string) => request<Snapshot>(`/scenarios/${segment(id)}/reset`, { expected_revision, action_id }),
  preferences: (id: string, premise: string, expected_revision: number, action_id: string, preferences: Preferences) =>
    request<CustomerSnapshot>(`/customer/${segment(id)}/${segment(premise)}/preferences`, { expected_revision, action_id, preferences }),
};

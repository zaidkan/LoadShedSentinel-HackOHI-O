import { RotateCcw } from 'lucide-react';
import { useId } from 'react';
import { useIncident } from '../../app/incident';
import { humanize } from '../utility/presentation';

export function scenarioName(title: string) {
  return title.replace(/\s*\([^)]*\)\s*$/, '');
}

export function scenarioQualifier(title: string) {
  return title.match(/\(([^)]*)\)\s*$/)?.[1] ?? null;
}

/** Shared scenario controls. Selecting a scenario changes the single server-side incident both views read. */
export function IncidentBar({ audience }: { audience: 'operator' | 'customer' }) {
  const { snapshot, scenarios, selectedScenarioId, activeAssetToken, selectableAssets, busy, actionError, chooseScenario, chooseAsset, reset } = useIncident();
  const uid = useId();
  if (!snapshot) return null;
  const source = snapshot.impact_source;
  const scope = source
    ? snapshot.status === 'UNDER_REVIEW'
      ? `AEP supplied-path sample of ${source.sample_premise_count} premises. Affected count not asserted while evidence conflicts.`
      : `${snapshot.affected_premise_tokens.length} simulated dependent ${snapshot.affected_premise_tokens.length === 1 ? 'premise' : 'premises'} in a ${source.sample_premise_count}-premise AEP supplied-path sample. Not a live outage or a territory-wide estimate.`
    : 'Demonstration scenario. Not a live outage.';
  return <section className="incident-bar" aria-label="Demonstration incident controls" data-busy={busy}>
    <div className="incident-bar-inner page">
      <div className="incident-bar-controls">
        <label className="incident-control" htmlFor={`${uid}-scenario`}>
          <span>Scenario</span>
          <select id={`${uid}-scenario`} className="select" value={selectedScenarioId} disabled={busy} onChange={event => void chooseScenario(event.target.value)}>
            {scenarios.map(scenario => <option key={scenario.id} value={scenario.id}>{scenarioName(scenario.title)}</option>)}
          </select>
        </label>
        {selectableAssets.length ? <label className="incident-control" htmlFor={`${uid}-asset`}>
          <span>{audience === 'operator' ? 'AEP source equipment' : 'Equipment'}</span>
          <select id={`${uid}-asset`} className="select mono" value={activeAssetToken} disabled={busy} onChange={event => void chooseAsset(event.target.value)}>
            {selectableAssets.map(asset => <option key={asset.asset_token} value={asset.asset_token}>
              {asset.kind === 'TRANSFORMER' ? 'Transformer' : 'Breaker'} …{asset.asset_token.slice(-8)} · {asset.dependent_premises_in_sample} sample premises
            </option>)}
          </select>
        </label> : null}
        <button type="button" className="btn-quiet incident-reset" onClick={() => void reset()} disabled={busy} title="Reset scenario to its base state">
          <RotateCcw aria-hidden="true" />Reset
        </button>
      </div>
      <p className="incident-bar-scope" role="status">
        <span className="state" data-state={snapshot.status.toLowerCase()}>{humanize(snapshot.status)}</span>
        <span>{busy ? 'Loading incident…' : scope}</span>
      </p>
      {actionError ? <p className="incident-bar-error" role="alert">{actionError}</p> : null}
    </div>
  </section>;
}

import React from 'react';
import type { ScenarioSnapshot } from '../../../../contracts/types';
import { GitCompare, ArrowRight } from 'lucide-react';

export interface CounterfactualCompareCardProps {
  snapshot: ScenarioSnapshot;
  onSelectScenario?: (scenarioId: string) => void;
}

/** Illustrative comparisons support review; they do not establish field outcomes or savings. */
export const CounterfactualCompareCard: React.FC<CounterfactualCompareCardProps> = ({ snapshot, onSelectScenario }) => {
  const isLocal = snapshot.scenario_id === 'local_protection';
  const isUpstream = snapshot.scenario_id === 'upstream_feeder';
  const withheld = snapshot.scenario_id === 'insufficient_evidence' || snapshot.status === 'UNDER_REVIEW' || snapshot.cutout_status === 'UNKNOWN';
  const comparison = isLocal ? 'upstream_feeder' : 'local_protection';
  const action = isLocal ? 'Compare Upstream Feeder' : isUpstream ? 'Compare Local Protection' : 'Load Baseline Comparison';
  const count = `${snapshot.affected_premise_tokens.length} sample premises`;

  return <section className="utility-counterfactual-card" aria-labelledby="counterfactual-heading">
    <div className="counterfactual-header">
      <div className="counterfactual-title-group">
        <div className="counterfactual-badge"><GitCompare size={16} aria-hidden="true" /><span>Modeled Scenario Comparison</span></div>
        <h3 id="counterfactual-heading" className="counterfactual-title">Counterfactual Incident Comparator</h3>
        <p className="counterfactual-subtitle">Compare illustrative local protection and upstream interruption baselines. These are scenario assumptions, not a field diagnosis of the selected asset.</p>
      </div>
      {onSelectScenario && <div className="counterfactual-actions">
        <button type="button" className="counterfactual-switch-btn" onClick={() => onSelectScenario(comparison)}>
          <span>{action}</span><ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>}
    </div>

    {withheld ? <div className="counterfactual-impact-banner" role="note">
      <div className="counterfactual-impact-text"><strong>Comparison withheld.</strong> Evidence is insufficient or conflicting for <code>{snapshot.current_asset_id}</code>. Impact count and energization are not asserted. Resolve evidence gaps through field assessment before selecting local or upstream work.</div>
    </div> : <>
      <p className="counterfactual-subtitle">Selected asset: <code>{snapshot.current_asset_id}</code>. Current scenario footprint: {count}; simulated impact, not live service confirmation.</p>
      <div className="counterfactual-grid">
        <div className={`counterfactual-col ${isLocal ? 'active' : ''}`}>
          <div className="counterfactual-col-header">
            <div className="counterfactual-hypothesis"><span className="hypothesis-tag">Illustrative baseline A</span><h4>Local protection operation</h4></div>
            {isLocal && <span className="active-pill">Selected comparison</span>}
          </div>
          <dl className="counterfactual-metrics">
            <div><dt>Baseline cutout</dt><dd>OPEN · assumed</dd></div>
            <div><dt>Scenario footprint</dt><dd className="mono">{isLocal ? count : 'Not evaluated for this snapshot'}</dd></div>
            <div><dt>Equipment to assess</dt><dd>Local distribution protection</dd></div>
            <div><dt>Work to review</dt><dd>Local protection assessment; repair package requires confirmation</dd></div>
          </dl>
        </div>
        <div className={`counterfactual-col ${isUpstream ? 'active' : ''}`}>
          <div className="counterfactual-col-header">
            <div className="counterfactual-hypothesis"><span className="hypothesis-tag">Illustrative baseline B</span><h4>Upstream feeder interruption</h4></div>
            {isUpstream && <span className="active-pill">Selected comparison</span>}
          </div>
          <dl className="counterfactual-metrics">
            <div><dt>Baseline cutout</dt><dd>CLOSED · assumed; does not confirm energization</dd></div>
            <div><dt>Scenario footprint</dt><dd className="mono">{isUpstream ? count : 'Not evaluated for this snapshot'}</dd></div>
            <div><dt>Equipment to assess</dt><dd>Upstream circuit-breaker path; physical substation connectivity unknown</dd></div>
            <div><dt>Work to review</dt><dd>Upstream assessment; repair package requires confirmation</dd></div>
          </dl>
        </div>
      </div>
      <div className="counterfactual-impact-banner">
        <div className="counterfactual-impact-text"><strong>Potential to avoid inappropriate local work, subject to field verification.</strong> Modeled inputs do not establish energization, authorize dispatch, or demonstrate labor or cost savings.</div>
      </div>
    </>}
  </section>;
};

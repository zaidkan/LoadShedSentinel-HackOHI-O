import React from 'react';
import type { ScenarioSnapshot } from '../../../../contracts/types';
import { GitCompare, ShieldCheck, ArrowRight } from 'lucide-react';

export interface CounterfactualCompareCardProps {
  snapshot: ScenarioSnapshot;
  onSelectScenario?: (scenarioId: string) => void;
}

export const CounterfactualCompareCard: React.FC<CounterfactualCompareCardProps> = ({
  snapshot,
  onSelectScenario,
}) => {
  const isLocal = snapshot.scenario_id === 'local_protection';
  const isUpstream = snapshot.scenario_id === 'upstream_feeder';

  return (
    <section className="utility-counterfactual-card" aria-labelledby="counterfactual-heading">
      <div className="counterfactual-header">
        <div className="counterfactual-title-group">
          <div className="counterfactual-badge">
            <GitCompare className="w-4 h-4 text-sky-400 inline mr-1" />
            <span>Scenario comparison · operator review</span>
          </div>
          <h3 id="counterfactual-heading" className="counterfactual-title">
            Counterfactual Incident Comparator
          </h3>
          <p className="counterfactual-subtitle">
            Differentiate local device operations from upstream breaker trips before dispatching heavy equipment.
          </p>
        </div>

        {onSelectScenario && (
          <div className="counterfactual-actions">
            {isLocal ? (
              <button
                type="button"
                className="counterfactual-switch-btn"
                onClick={() => onSelectScenario('upstream_feeder')}
              >
                <span>Compare Upstream Feeder</span>
                <ArrowRight className="w-4 h-4 inline ml-1" />
              </button>
            ) : isUpstream ? (
              <button
                type="button"
                className="counterfactual-switch-btn"
                onClick={() => onSelectScenario('local_protection')}
              >
                <span>Compare Local Protection</span>
                <ArrowRight className="w-4 h-4 inline ml-1" />
              </button>
            ) : (
              <button
                type="button"
                className="counterfactual-switch-btn"
                onClick={() => onSelectScenario('local_protection')}
              >
                <span>Load Baseline Comparison</span>
                <ArrowRight className="w-4 h-4 inline ml-1" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="counterfactual-grid">
        {/* Hypothesis A */}
        <div className={`counterfactual-col ${isLocal ? 'active' : ''}`}>
          <div className="counterfactual-col-header">
            <div className="flex items-center gap-2">
              <span className="hypothesis-tag">Hypothesis A</span>
              <h4>Local Cutout Blown</h4>
            </div>
            {isLocal && <span className="active-pill">Active Scenario</span>}
          </div>
          <dl className="counterfactual-metrics">
            <div>
              <dt>Physical Cutout</dt>
              <dd className="text-amber-400 font-mono">OPEN (-117.5° Drop)</dd>
            </div>
            <div>
              <dt>Impact Scope</dt>
              <dd className="font-mono">{isLocal ? `${snapshot.affected_premise_tokens.length} Sample Premises` : 'Load local scenario to calculate'}</dd>
            </div>
            <div>
              <dt>Target Equipment</dt>
              <dd>Local Distribution Fuse</dd>
            </div>
            <div>
              <dt>Proposed capabilities</dt>
              <dd className="text-emerald-400">2-Person Line Crew (Fuse Link)</dd>
            </div>
          </dl>
        </div>

        {/* Hypothesis B */}
        <div className={`counterfactual-col ${isUpstream ? 'active' : ''}`}>
          <div className="counterfactual-col-header">
            <div className="flex items-center gap-2">
              <span className="hypothesis-tag">Hypothesis B</span>
              <h4>Upstream Feeder Lockout</h4>
            </div>
            {isUpstream && <span className="active-pill">Active Scenario</span>}
          </div>
          <dl className="counterfactual-metrics">
            <div>
              <dt>Physical Cutout</dt>
              <dd className="text-sky-400 font-mono">CLOSED (Latched 0°)</dd>
            </div>
            <div>
              <dt>Impact Scope</dt>
              <dd className="font-mono">{isUpstream ? `${snapshot.affected_premise_tokens.length} Sample Premises` : 'Load upstream scenario to calculate'}</dd>
            </div>
            <div>
              <dt>Target Equipment</dt>
              <dd>Supplied upstream circuit breaker; internal station path unknown</dd>
            </div>
            <div>
              <dt>Proposed capabilities</dt>
              <dd className="text-sky-400">Substation Breaker Patrol Crew</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Decisive Operational Impact Banner */}
      <div className="counterfactual-impact-banner">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="counterfactual-impact-text">
          <strong>Different evidence can change the proposed work package.</strong>
          <span>
            {' '}These are modeled local-protection and upstream-interruption scenarios. Cutout position alone cannot confirm voltage, transformer damage or safe energization. The active scenario supplies its premise count; load the other scenario to calculate that footprint. No dispatch, avoided outage or dollar saving is demonstrated. Conditional response savings are explored separately in Prevention & Evidence.
          </span>
        </div>
      </div>
    </section>
  );
};

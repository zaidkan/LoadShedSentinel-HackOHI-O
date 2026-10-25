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
            <span>Flagship Feature · AEP Storm Misdispatch Defense</span>
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
              <dd className="font-mono">3 Sample Premises</dd>
            </div>
            <div>
              <dt>Target Equipment</dt>
              <dd>Local Distribution Fuse</dd>
            </div>
            <div>
              <dt>Required Dispatch</dt>
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
              <dd className="font-mono">16 Sample Premises (Full Branch)</dd>
            </div>
            <div>
              <dt>Target Equipment</dt>
              <dd>Substation Circuit Breaker</dd>
            </div>
            <div>
              <dt>Required Dispatch</dt>
              <dd className="text-sky-400">Substation Breaker Patrol Crew</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Decisive Operational Impact Banner */}
      <div className="counterfactual-impact-banner">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="counterfactual-impact-text">
          <strong>Heavy Equipment Misdispatch Prevented:</strong>
          <span>
            {' '}Sentinel physical cutout telemetry confirms transformer energization state before rolling a truck. Avoids premature 3-person heavy bucket/crane callout (saving ~8.974 labor person-hours and estimated $12,000 storm deployment cost per false incident).
          </span>
        </div>
      </div>
    </section>
  );
};

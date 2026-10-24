import React, { useState, useEffect } from 'react';
import { CustomerPage } from './pages/CustomerPage';
import { UtilityPage } from './pages/UtilityPage';
import { fetchCurrentScenario, fetchScenarios, selectScenario, resetScenario, fetchAEPAssets, ScenarioMeta, AEPSourceAsset } from './services/api';
import type { ScenarioSnapshot } from '../../contracts/types';
import { Zap, Home, RefreshCw, Layers } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'customer' | 'utility'>('utility');
  const [snapshot, setSnapshot] = useState<ScenarioSnapshot | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioMeta[]>([]);
  const [aepAssets, setAepAssets] = useState<AEPSourceAsset[]>([]);
  const [activeAssetToken, setActiveAssetToken] = useState('');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('local_protection');
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    initApp();
  }, []);

  async function initApp() {
    setLoading(true);
    setConnectionError(false);
    try {
      const [scList, curr, assets] = await Promise.all([
        fetchScenarios().catch(() => []),
        fetchCurrentScenario(),
        fetchAEPAssets().catch(() => []),
      ]);
      setScenarios(scList);
      setAepAssets(assets);
      setSnapshot(curr);
      setActiveAssetToken(curr?.impact_source?.fault_asset_token || '');
      if (curr?.scenario_id) {
        setSelectedScenarioId(curr.scenario_id);
      }
    } catch (e) {
      console.error('Failed to initialize app:', e);
      setConnectionError(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectScenario(scenarioId: string) {
    try {
      const next = await selectScenario(scenarioId);
      setSnapshot(next);
      setSelectedScenarioId(scenarioId);
      setActiveAssetToken(next.impact_source?.fault_asset_token || '');
    } catch (e) {
      console.error('Failed to select scenario:', e);
    }
  }

  async function handleSelectAsset(assetToken: string) {
    try {
      const next = await selectScenario(selectedScenarioId, assetToken);
      setSnapshot(next);
      setActiveAssetToken(next.impact_source?.fault_asset_token || '');
    } catch (e) {
      console.error('Failed to select AEP asset:', e);
    }
  }

  async function handleReset() {
    try {
      const reset = await resetScenario();
      setSnapshot(reset);
      if (reset?.scenario_id) setSelectedScenarioId(reset.scenario_id);
      setActiveAssetToken(reset?.impact_source?.fault_asset_token || '');
    } catch (e) {
      console.error('Failed to reset scenario:', e);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Navigation */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 lg:py-0 lg:min-h-14 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-white font-black tracking-tight flex items-center gap-1.5 text-base">
              <span className="text-blue-500">LOAD</span>SHED
              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-medium">
                SENTINEL
              </span>
            </span>
          </div>

          {/* Demonstration Scenario Selector */}
          <div className="flex min-w-0 w-full lg:w-auto flex-wrap items-center gap-2">
            <div className="flex min-w-0 max-w-full items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 text-xs">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400 hidden sm:inline">Scenario:</span>
              <select
                value={selectedScenarioId}
                aria-label="Select demonstration scenario"
                onChange={(e) => handleSelectScenario(e.target.value)}
                className="min-w-0 max-w-48 bg-transparent text-white font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 cursor-pointer"
              >
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                    {s.title}
                  </option>
                ))}
              </select>
            </div>

            {aepAssets.length > 0 && (
              <div className="flex min-w-0 max-w-full items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 text-xs">
                <span className="text-slate-400 hidden lg:inline">AEP asset:</span>
                <select
                  value={activeAssetToken}
                  onChange={(e) => handleSelectAsset(e.target.value)}
                  aria-label="Select source-derived AEP equipment for simulation"
                  className="min-w-0 bg-transparent text-white font-medium max-w-48 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 cursor-pointer"
                >
                  {aepAssets
                    .filter(a => a.kind === (selectedScenarioId === 'upstream_feeder' ? 'CIRCUIT_BREAKER' : 'TRANSFORMER'))
                    .map(a => <option key={a.asset_token} value={a.asset_token} className="bg-slate-900 text-white">
                      {a.kind === 'TRANSFORMER' ? 'Transformer' : 'Breaker'} {a.asset_token.slice(-8)} · {a.dependent_premises_in_sample} sample premises
                    </option>)}
                </select>
              </div>
            )}

            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
              title="Reset scenario to base state"
            >
              <RefreshCw className="w-3 h-3" /> Reset
            </button>

            {/* Screen Switcher */}
            <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800 lg:ml-2 max-w-full flex-wrap">
              <button
                onClick={() => setActiveTab('utility')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition ${
                  activeTab === 'utility'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5" /> Utility Console
              </button>
              <button
                onClick={() => setActiveTab('customer')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition ${
                  activeTab === 'customer'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Home className="w-3.5 h-3.5" /> Customer Concierge
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="min-w-0 flex-1 pb-12">
        {snapshot?.impact_source && (
          <p className="mx-auto max-w-7xl px-4 pt-3 text-xs text-slate-400" role="status">
            AEP supplied-path sample · {snapshot.impact_source.sample_premise_count} premises ·
            {snapshot.status === 'UNDER_REVIEW' ? ' affected count unknown; ' : ` ${snapshot.affected_premise_tokens.length} simulated dependent premises; `}
            not a live outage or whole-territory estimate.
          </p>
        )}
        {connectionError ? (
          <div role="alert" className="mx-4 my-6 rounded-lg border border-amber-800 bg-amber-950/30 p-4 text-amber-100 flex flex-wrap items-center justify-between gap-4">
            <p>Unable to connect to LoadShed Sentinel. Check your connection and try again.</p>
            <button
              type="button"
              onClick={initApp}
              className="min-h-11 rounded border border-amber-700 px-4 py-2 text-sm font-semibold hover:bg-amber-900/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
            >
              Retry Connection
            </button>
          </div>
        ) : loading || !snapshot ? (
          <div className="flex items-center justify-center min-h-[400px] text-slate-500">
            Loading LoadShed Sentinel...
          </div>
        ) : activeTab === 'customer' ? (
          <CustomerPage
            key={`${snapshot.incident_id}-${snapshot.revision}-${snapshot.current_asset_id}`}
            snapshot={snapshot}
            scenarioId={selectedScenarioId}
          />
        ) : (
          <UtilityPage snapshot={snapshot} />
        )}
      </main>
    </div>
  );
};

export default App;

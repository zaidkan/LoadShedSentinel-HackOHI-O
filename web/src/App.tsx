import React, { useState, useEffect } from 'react';
import { CustomerPage } from './pages/CustomerPage';
import { UtilityPage } from './pages/UtilityPage';
import { fetchCurrentScenario, fetchScenarios, selectScenario, resetScenario, ScenarioMeta } from './services/api';
import type { ScenarioSnapshot } from '../../contracts/types';
import { Zap, Home, RefreshCw, Layers } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'customer' | 'utility'>('utility');
  const [snapshot, setSnapshot] = useState<ScenarioSnapshot | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioMeta[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('local_protection');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initApp();
  }, []);

  async function initApp() {
    try {
      const [scList, curr] = await Promise.all([
        fetchScenarios().catch(() => []),
        fetchCurrentScenario(),
      ]);
      setScenarios(scList);
      setSnapshot(curr);
      if (curr?.scenario_id) {
        setSelectedScenarioId(curr.scenario_id);
      }
    } catch (e) {
      console.error('Failed to initialize app:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectScenario(scenarioId: string) {
    try {
      setSelectedScenarioId(scenarioId);
      const next = await selectScenario(scenarioId);
      setSnapshot(next);
    } catch (e) {
      console.error('Failed to select scenario:', e);
    }
  }

  async function handleReset() {
    try {
      const reset = await resetScenario();
      setSnapshot(reset);
      if (reset?.scenario_id) setSelectedScenarioId(reset.scenario_id);
    } catch (e) {
      console.error('Failed to reset scenario:', e);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Navigation */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-white font-black tracking-tight flex items-center gap-1.5 text-base">
              <span className="text-blue-500">LOAD</span>SHED
              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-medium">
                SENTINEL
              </span>
            </span>
          </div>

          {/* Demonstration Scenario Selector */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800 text-xs">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400 hidden sm:inline">Scenario:</span>
              <select
                value={selectedScenarioId}
                onChange={(e) => handleSelectScenario(e.target.value)}
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer"
              >
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                    {s.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
              title="Reset scenario to base state"
            >
              <RefreshCw className="w-3 h-3" /> Reset
            </button>

            {/* Screen Switcher */}
            <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800 ml-2">
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
      <main className="flex-1 pb-12">
        {loading || !snapshot ? (
          <div className="flex items-center justify-center min-h-[400px] text-slate-500">
            Loading LoadShed Sentinel...
          </div>
        ) : activeTab === 'customer' ? (
          <CustomerPage />
        ) : (
          <UtilityPage snapshot={snapshot} />
        )}
      </main>
    </div>
  );
};

export default App;

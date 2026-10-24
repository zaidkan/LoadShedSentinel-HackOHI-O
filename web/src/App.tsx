import React, { useState, useEffect } from 'react';
import { CustomerPage } from './pages/CustomerPage';
import { UtilityPage } from './pages/UtilityPage';
import { fetchCurrentScenario, advanceScenario, resetScenario } from './services/api';
import type { ScenarioSnapshot } from '../../contracts/types';
import { Zap, Home, Play, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'customer' | 'utility'>('utility');
  const [snapshot, setSnapshot] = useState<ScenarioSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSnapshot();
  }, []);

  async function loadSnapshot() {
    try {
      const data = await fetchCurrentScenario();
      setSnapshot(data);
    } catch (e) {
      console.error('Failed to load scenario snapshot:', e);
    } finally {
      setLoading(false);
    }
  }

  async function handleTriggerFault() {
    try {
      const next = await advanceScenario({
        status: 'OUTAGE',
        cutout_status: 'OPEN',
        restoration_summary: 'Cutout fuse blown on secondary surge; line crew assessment scheduled',
      });
      setSnapshot(next);
    } catch (e) {
      console.error('Failed to advance scenario:', e);
    }
  }

  async function handleReset() {
    try {
      const reset = await resetScenario();
      setSnapshot(reset);
    } catch (e) {
      console.error('Failed to reset scenario:', e);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Navigation */}
      <nav className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-white font-black tracking-tight flex items-center gap-1.5 text-base">
              <span className="text-blue-500">LOAD</span>SHED
              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-medium">
                SENTINEL
              </span>
            </span>
          </div>

          {/* Quick Scenario Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerFault}
              className="flex items-center gap-1 px-2.5 py-1 bg-rose-600/80 hover:bg-rose-500 text-white rounded text-xs font-semibold transition"
              title="Simulate pole-top fault (trigger blown cutout & outage)"
            >
              <Play className="w-3 h-3" /> Trigger Fault
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition"
              title="Reset scenario to normal base state"
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

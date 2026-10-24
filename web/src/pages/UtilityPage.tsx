import React, { useEffect, useState } from 'react';
import { fetchCurrentScenario, advanceScenario, resetScenario } from '../services/api';
import { ScenarioSnapshot } from '../../../contracts/types';
import { Activity, Zap, RefreshCw, Play } from 'lucide-react';

export const UtilityPage: React.FC = () => {
  const [snapshot, setSnapshot] = useState<ScenarioSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const data = await fetchCurrentScenario();
      setSnapshot(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdvance() {
    try {
      const next = await advanceScenario({
        status: 'OUTAGE',
        cutout_status: 'OPEN',
        restoration_summary: 'Field assessment scheduled; cutout blown on secondary surge',
      });
      setSnapshot(next);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleReset() {
    try {
      const reset = await resetScenario();
      setSnapshot(reset);
    } catch (e) {
      console.error(e);
    }
  }

  if (loading) {
    return <div className="p-8 text-slate-400">Loading Utility Console...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-400" />
            Utility Engineering Console
          </h1>
          <p className="text-xs text-slate-400">
            Pole-top asset twin, sensor telemetry HUD, and crew work order generator.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAdvance}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-sm font-semibold transition"
          >
            <Play className="w-4 h-4" /> Trigger Fault
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-sm transition"
          >
            <RefreshCw className="w-4 h-4" /> Reset
          </button>
        </div>
      </div>

      {/* Grid: 3D Twin Viewport Placeholder & Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 min-h-[400px] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">Asset: {snapshot?.current_asset_id}</span>
            <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
              snapshot?.cutout_status === 'OPEN' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              Cutout Switch: {snapshot?.cutout_status}
            </span>
          </div>

          <div className="my-auto text-center py-12">
            <div className="inline-block p-4 rounded-full bg-slate-950/80 border border-slate-800 mb-3">
              <Activity className="w-10 h-10 text-blue-400 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-slate-200">Procedural 3D Twin Viewport</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Active canvas rendered by Bob (Role 3) in `web/src/three/`. Displays pole, transformer cylinder, cutout switch, and solar node.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-3 rounded-lg border border-slate-800/80 text-center text-xs">
            <div>
              <span className="text-slate-500 block">Battery SoC</span>
              <span className="font-bold text-white">{snapshot?.solar.battery_soc_pct}%</span>
            </div>
            <div>
              <span className="text-slate-500 block">Solar Generation</span>
              <span className="font-bold text-white">{snapshot?.solar.solar_w}W</span>
            </div>
            <div>
              <span className="text-slate-500 block">Node Link</span>
              <span className="font-bold text-emerald-400">{snapshot?.solar.connectivity}</span>
            </div>
          </div>
        </div>

        {/* Right Rail: Crew & Restoration */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-3">
              Recommended Work Package
            </h3>
            <div className="space-y-2 text-xs">
              <div className="text-slate-300">
                <span className="text-slate-500">Damage Class:</span>{' '}
                <span className="font-mono text-amber-400">{snapshot?.crew_recommendation.candidate_damage_class}</span>
              </div>
              <div className="text-slate-300">
                <span className="text-slate-500">Reason:</span> {snapshot?.crew_recommendation.reason}
              </div>
              <div className="pt-2 border-t border-slate-800 text-slate-400">
                <span className="text-slate-500 block mb-1">Required Capabilities:</span>
                <ul className="list-disc pl-4 space-y-0.5">
                  {snapshot?.crew_recommendation.capabilities.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-3">
              Restoration Planning Math
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Labor Work:</span>
                <span className="font-bold text-white">
                  {snapshot?.restoration.labor_work_hours} {snapshot?.restoration.labor_work_unit}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ETA Window:</span>
                <span className="font-bold text-amber-400">
                  {snapshot?.restoration.lower_hours}h – {snapshot?.restoration.upper_hours}h (exp: {snapshot?.restoration.expected_hours}h)
                </span>
              </div>
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 italic">
                AEP standard 4.5x indirect labor factor applied; final crew dispatch subject to utility dispatcher approval.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { CustomerPage } from './pages/CustomerPage';
import { UtilityPage } from './pages/UtilityPage';
import { Zap, Home } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'customer' | 'utility'>('customer');

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Navigation */}
      <nav className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-white font-black tracking-tight flex items-center gap-1.5 text-base">
              <span className="text-blue-500">LOAD</span>SHED
              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-medium">
                SENTINEL
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/60 p-1 rounded-lg border border-slate-800">
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
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 pb-12">
        {activeTab === 'customer' ? <CustomerPage /> : <UtilityPage />}
      </main>
    </div>
  );
};

export default App;

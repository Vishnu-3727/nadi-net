import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, Radio, Database, CheckCircle2 } from 'lucide-react';
import { EmergencySeverity } from '../types';

interface Props {
  activeScenarioName: string;
  activeSeverity: EmergencySeverity;
  onReset: () => void;
  isResetting?: boolean;
}

export const TopBar: React.FC<Props> = ({
  activeScenarioName,
  activeSeverity,
  onReset,
  isResetting = false,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-IN', { hour12: false }) + ' IST');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const severityColor =
    activeSeverity === 'CRITICAL'
      ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
      : activeSeverity === 'SEVERE'
      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';

  return (
    <header className="h-16 bg-[#090e17] border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-50">
      {/* Title & Brand */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-700 flex items-center justify-center shadow-lg shadow-cyan-900/30">
          <ShieldAlert className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold tracking-tight text-white font-mono">
              NADI-NET
            </h1>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
              v1.0 CEG K!HACKS
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            Chennai Urban Flood Response Intelligence & Emergency Resource Optimisation
          </p>
        </div>
      </div>

      {/* Middle Status Indicators */}
      <div className="flex items-center space-x-4">
        {/* Active Scenario Badge */}
        <div className="flex items-center space-x-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="text-xs text-slate-400 font-mono">Active Scenario:</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${severityColor}`}>
            {activeScenarioName}
          </span>
        </div>

        {/* Offline Self-Contained Guarantee */}
        <div className="hidden lg:flex items-center space-x-1.5 text-xs text-emerald-400/90 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1.5 rounded-lg font-mono">
          <Database className="w-3.5 h-3.5" />
          <span>OFFLINE DEMO READY</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        <div className="text-right hidden sm:block">
          <div className="text-xs font-mono text-slate-200 font-medium">{currentTime}</div>
          <div className="text-[10px] text-slate-500 font-mono">GCC Emergency Ops Grid</div>
        </div>

        {/* Reset button */}
        <button
          onClick={onReset}
          disabled={isResetting}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg border border-slate-700 text-xs font-medium transition cursor-pointer disabled:opacity-50"
          title="Reset emergency scenario to baseline Scenario A"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Reset Scenario</span>
        </button>
      </div>
    </header>
  );
};

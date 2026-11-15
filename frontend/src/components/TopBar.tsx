import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  RefreshCw,
  Radio,
  Database,
  CloudRain,
  Waves,
  AlertCircle,
  PlusCircle,
} from 'lucide-react';
import { EmergencySeverity } from '../types';

interface Props {
  activeScenarioName: string;
  activeSeverity: EmergencySeverity;
  onReset: () => void;
  onOpenSOS?: () => void;
  isResetting?: boolean;
}

export const TopBar: React.FC<Props> = ({
  activeScenarioName,
  activeSeverity,
  onReset,
  onOpenSOS,
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
    <header className="min-h-16 py-2 bg-[#080d1a] border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-50 backdrop-blur-md shadow-lg shadow-black/40">
      {/* Title & Brand */}
      <div className="flex items-center space-x-3 shrink-0">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-cyan-900/40 ring-1 ring-cyan-400/30 shrink-0">
          <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white font-mono leading-none bg-gradient-to-r from-white via-slate-200 to-cyan-300 bg-clip-text text-transparent">
              NADI-NET
            </h1>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-700/60 font-mono font-semibold">
              v2.0 CEG K!HACKS
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium hidden md:block">
            Chennai Urban Flood Response Intelligence & Emergency Resource Optimisation
          </p>
        </div>
      </div>

      {/* Middle Environmental Telemetry & Status Indicators */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        {/* Environmental Telemetry Strip (WeCare Inspired) */}
        <div className="hidden 2xl:flex items-center space-x-3 px-3 py-1 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] font-mono text-slate-400">
          <div className="flex items-center space-x-1.5 text-cyan-300">
            <CloudRain className="w-3.5 h-3.5" />
            <span>85 mm / 3h</span>
          </div>
          <span className="text-slate-700">|</span>
          <div className="flex items-center space-x-1.5 text-amber-300">
            <Waves className="w-3.5 h-3.5" />
            <span>Chembarambakkam: 12.4k cfs</span>
          </div>
        </div>

        {/* Active Scenario Badge */}
        <div className="flex items-center space-x-2 bg-slate-900/90 px-2.5 py-1.5 rounded-xl border border-slate-800/80 shadow-inner">
          <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" />
          <span className="text-xs text-slate-400 font-mono hidden xl:inline">Scenario:</span>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-lg border whitespace-nowrap truncate max-w-[140px] sm:max-w-[200px] md:max-w-xs ${severityColor}`}
            title={activeScenarioName}
          >
            {activeScenarioName}
          </span>
        </div>

        {/* Offline Self-Contained Guarantee */}
        <div className="hidden lg:flex items-center space-x-1.5 text-xs text-emerald-400/90 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1.5 rounded-xl font-mono whitespace-nowrap shadow-sm">
          <Database className="w-3.5 h-3.5 shrink-0" />
          <span>OFFLINE READY</span>
        </div>
      </div>

      {/* Right Controls: SOS Report Button, Clock, Reset */}
      <div className="flex items-center space-x-2.5 shrink-0">
        {/* WeCare / SLDA Inspired Citizen SOS / Field Incident Trigger */}
        {onOpenSOS && (
          <button
            onClick={onOpenSOS}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white rounded-xl border border-red-500/40 text-xs font-bold shadow-lg shadow-red-950/50 hover:shadow-red-900/70 transition cursor-pointer active:scale-95"
            title="Log citizen SOS or field incident report"
          >
            <AlertCircle className="w-3.5 h-3.5 animate-pulse text-white" />
            <span className="hidden sm:inline">Citizen SOS</span>
            <span className="sm:hidden">SOS</span>
          </button>
        )}

        <div className="text-right hidden sm:block">
          <div className="text-xs font-mono text-slate-200 font-semibold leading-tight">{currentTime}</div>
          <div className="text-[10px] text-slate-500 font-mono leading-tight">GCC Ops Grid</div>
        </div>

        {/* Reset button */}
        <button
          onClick={onReset}
          disabled={isResetting}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-700 text-xs font-medium transition cursor-pointer disabled:opacity-50 whitespace-nowrap shadow-sm"
          title="Reset emergency scenario to baseline Scenario A"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Reset</span>
        </button>
      </div>
    </header>
  );
};


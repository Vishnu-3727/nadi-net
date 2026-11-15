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
      ? 'bg-red-500/10 text-red-400 border-red-500/30'
      : activeSeverity === 'SEVERE'
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      : 'bg-zinc-800 text-zinc-200 border-zinc-700';

  return (
    <header className="min-h-16 py-2.5 bg-[#121215] border-b border-zinc-800 px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-50 shadow-md">
      {/* Title & Brand */}
      <div className="flex items-center space-x-3.5 shrink-0">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white shrink-0 shadow-sm">
          <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-zinc-200" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white font-mono leading-none">
              NADI-NET
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono font-semibold">
              v2.0 CEG K!HACKS
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 font-medium hidden md:block">
            Chennai Urban Flood Response Intelligence & Emergency Resource Optimisation
          </p>
        </div>
      </div>

      {/* Middle Environmental Telemetry & Status Indicators */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        {/* WeCare Environmental Telemetry Strip */}
        <div className="hidden xl:flex items-center space-x-3 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300">
          <div className="flex items-center space-x-1.5 text-zinc-300 font-medium">
            <CloudRain className="w-3.5 h-3.5 text-sky-400" />
            <span>85 mm / 3h</span>
          </div>
          <span className="text-zinc-700">|</span>
          <div className="flex items-center space-x-1.5 text-zinc-300 font-medium">
            <Waves className="w-3.5 h-3.5 text-amber-400" />
            <span>Reservoir: 12.4k cfs</span>
          </div>
          <span className="text-zinc-700">|</span>
          <div className="flex items-center space-x-1 text-zinc-300 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Adyar: Safe</span>
          </div>
        </div>

        {/* Active Scenario Badge */}
        <div className="flex items-center space-x-2 bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800 shadow-sm">
          <Radio className="w-3.5 h-3.5 text-zinc-400 animate-pulse shrink-0" />
          <span className="text-xs text-zinc-400 font-mono hidden 2xl:inline">Scenario:</span>
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-lg border whitespace-nowrap truncate max-w-[140px] sm:max-w-[200px] md:max-w-xs ${severityColor}`}
            title={activeScenarioName}
          >
            {activeScenarioName}
          </span>
        </div>

        {/* Offline Guarantee */}
        <div className="hidden lg:flex items-center space-x-1.5 text-xs text-zinc-300 bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 rounded-xl font-mono whitespace-nowrap shadow-sm">
          <Database className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
          <span>OFFLINE READY</span>
        </div>
      </div>

      {/* Right Controls: SOS Report Button, Clock, Reset */}
      <div className="flex items-center space-x-2.5 shrink-0">
        {onOpenSOS && (
          <button
            onClick={onOpenSOS}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer active:scale-95"
            title="Log citizen SOS or field incident report"
          >
            <AlertCircle className="w-3.5 h-3.5 text-white" />
            <span>Citizen SOS</span>
          </button>
        )}

        <div className="text-right hidden sm:block">
          <div className="text-xs font-mono text-zinc-200 font-bold leading-tight flex items-center justify-end gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{currentTime}</span>
          </div>
          <div className="text-[10px] text-zinc-500 font-mono leading-tight">GCC Ops Grid</div>
        </div>

        {/* Reset button */}
        <button
          onClick={onReset}
          disabled={isResetting}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl border border-zinc-800 text-xs font-medium transition cursor-pointer disabled:opacity-50 whitespace-nowrap shadow-sm"
          title="Reset emergency scenario to baseline Scenario A"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin text-zinc-300' : ''}`} />
          <span>Reset</span>
        </button>
      </div>
    </header>
  );
};


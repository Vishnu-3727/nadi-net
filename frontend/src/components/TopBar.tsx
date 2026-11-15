import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  RefreshCw,
  Radio,
  Database,
  CloudRain,
  Waves,
  AlertCircle,
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
      ? 'bg-red-50 text-red-700 border-red-200'
      : activeSeverity === 'SEVERE'
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : 'bg-emerald-50 text-emerald-800 border-emerald-200';

  return (
    <header className="min-h-16 py-2.5 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-50 shadow-xs">
      {/* Title & Brand */}
      <div className="flex items-center space-x-3.5 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-white shrink-0 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 font-mono leading-none">
              NADI-NET
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono font-bold">
              SLDA GOVTECH v2.0
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium hidden md:block">
            Chennai Urban Flood Response Intelligence & Emergency Resource Optimisation
          </p>
        </div>
      </div>

      {/* Middle Environmental Telemetry & Status Indicators */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        {/* Environmental Telemetry Strip */}
        <div className="hidden xl:flex items-center space-x-3 px-3.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] font-mono text-slate-700 shadow-2xs">
          <div className="flex items-center space-x-1.5 font-medium">
            <CloudRain className="w-3.5 h-3.5 text-sky-600" />
            <span>85 mm / 3h</span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center space-x-1.5 font-medium">
            <Waves className="w-3.5 h-3.5 text-amber-600" />
            <span>Reservoir: 12.4k cfs</span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center space-x-1 font-medium text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Adyar: Safe</span>
          </div>
        </div>

        {/* Active Scenario Badge */}
        <div className="flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
          <Radio className="w-3.5 h-3.5 text-slate-500 animate-pulse shrink-0" />
          <span className="text-xs text-slate-500 font-mono hidden 2xl:inline">Scenario:</span>
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-lg border whitespace-nowrap truncate max-w-[140px] sm:max-w-[200px] md:max-w-xs ${severityColor}`}
            title={activeScenarioName}
          >
            {activeScenarioName}
          </span>
        </div>

        {/* Offline Guarantee */}
        <div className="hidden lg:flex items-center space-x-1.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl font-mono whitespace-nowrap shadow-2xs">
          <Database className="w-3.5 h-3.5 shrink-0 text-slate-500" />
          <span>OFFLINE READY</span>
        </div>
      </div>

      {/* Right Controls: SOS Report Button, Clock, Reset */}
      <div className="flex items-center space-x-2.5 shrink-0">
        {onOpenSOS && (
          <button
            onClick={onOpenSOS}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition cursor-pointer active:scale-95"
            title="Log citizen SOS or field incident report"
          >
            <AlertCircle className="w-3.5 h-3.5 text-white" />
            <span>Citizen SOS</span>
          </button>
        )}

        <div className="text-right hidden sm:block">
          <div className="text-xs font-mono text-slate-900 font-bold leading-tight flex items-center justify-end gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{currentTime}</span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono leading-tight">GCC Operations</div>
        </div>

        {/* Reset button */}
        <button
          onClick={onReset}
          disabled={isResetting}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-xl border border-slate-200 text-xs font-medium transition cursor-pointer disabled:opacity-50 whitespace-nowrap shadow-2xs"
          title="Reset emergency scenario to baseline Scenario A"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin text-slate-700' : ''}`} />
          <span>Reset</span>
        </button>
      </div>
    </header>
  );
};

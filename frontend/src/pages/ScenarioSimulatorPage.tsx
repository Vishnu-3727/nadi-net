import React, { useState } from 'react';
import {
  Sliders,
  Play,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { ScenarioData, CommandCenterOverviewData } from '../types';
import { ProvenanceBadge } from '../components/ProvenanceBadge';
import { api } from '../services/api';

interface Props {
  scenarios: ScenarioData[];
  activeScenarioId: string;
  overview: CommandCenterOverviewData | null;
  onSimulationComplete: () => void;
}

export const ScenarioSimulatorPage: React.FC<Props> = ({
  scenarios,
  activeScenarioId,
  overview,
  onSimulationComplete,
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(activeScenarioId);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  // Custom Controls State
  const activeScn = scenarios.find((s) => s.id === selectedScenarioId) || scenarios[0];
  const [customRainfall, setCustomRainfall] = useState<number>(activeScn?.rainfall_intensity_mm || 120);
  const [customWaterLevel, setCustomWaterLevel] = useState<number>(activeScn?.water_level_index || 0.5);
  const [customTeams, setCustomTeams] = useState<number>(activeScn?.available_rescue_teams || 10);
  const [lastDeltas, setLastDeltas] = useState<{
    scenarioName: string;
    rainDelta: number;
    exposedDelta: number;
    criticalDelta: number;
  } | null>(null);

  const handleSelectPredefined = (scn: ScenarioData) => {
    setSelectedScenarioId(scn.id);
    setCustomRainfall(scn.rainfall_intensity_mm);
    setCustomWaterLevel(scn.water_level_index);
    setCustomTeams(scn.available_rescue_teams);
  };

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      const overrides = {
        rainfall_intensity_mm: customRainfall,
        water_level_index: customWaterLevel,
        available_rescue_teams: customTeams,
      };
      const res = await api.simulateScenario(selectedScenarioId, overrides);

      setLastDeltas({
        scenarioName: activeScn.name,
        rainDelta: customRainfall - (overview?.metrics.find((m) => m.label.includes('Severity')) ? 85 : 0),
        exposedDelta: res.data.risk_summary.total_exposed_population,
        criticalDelta: res.data.risk_summary.category_counts['Critical'] || 0,
      });

      onSimulationComplete();
    } catch (err) {
      alert(`Simulation execution failed: ${err}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await api.resetScenario();
      setSelectedScenarioId('SCN-A');
      const scnA = scenarios.find((s) => s.id === 'SCN-A');
      if (scnA) {
        setCustomRainfall(scnA.rainfall_intensity_mm);
        setCustomWaterLevel(scnA.water_level_index);
        setCustomTeams(scnA.available_rescue_teams);
      }
      setLastDeltas(null);
      onSimulationComplete();
    } catch (err) {
      alert(`Reset failed: ${err}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-xl border border-slate-800 bg-[#0d1527] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">
              Dynamic Emergency Scenario Simulator
            </h2>
            <ProvenanceBadge provenance="SIMULATED" size="sm" />
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Simulates dynamic extreme flood events. Changing scenario parameters propagates immediately through
            risk re-calculation, graph road severance, OR-Tools resource optimisation, and command centre indicators.
          </p>
        </div>

        <button
          onClick={handleReset}
          disabled={isResetting}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition cursor-pointer flex items-center space-x-2 shrink-0"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin text-cyan-400' : ''}`} />
          <span>Restore Baseline Scenario A</span>
        </button>
      </div>

      {/* Predefined Scenarios Cards */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">
          PRECONFIGURED EMERGENCY SCENARIOS
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scenarios.map((scn) => {
            const isSelected = selectedScenarioId === scn.id;
            let badgeBg = 'bg-emerald-950 text-emerald-400 border-emerald-800';
            if (scn.severity === 'SEVERE') badgeBg = 'bg-amber-950 text-amber-400 border-amber-800';
            if (scn.severity === 'CRITICAL') badgeBg = 'bg-red-950 text-red-400 border-red-800';

            return (
              <div
                key={scn.id}
                onClick={() => handleSelectPredefined(scn)}
                className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'border-cyan-500 bg-cyan-950/30 shadow-lg shadow-cyan-900/20 ring-1 ring-cyan-500'
                    : 'border-slate-800 bg-[#0d1527] hover:border-slate-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${badgeBg}`}>
                      {scn.severity}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{scn.id}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{scn.name}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{scn.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 text-[11px] font-mono grid grid-cols-2 gap-1.5 text-slate-400">
                  <div>Rainfall: <b className="text-white">{scn.rainfall_intensity_mm} mm</b></div>
                  <div>Teams: <b className="text-cyan-400">{scn.available_rescue_teams} units</b></div>
                  <div>Blocked Roads: <b className="text-red-400">{scn.blocked_edge_ids.length}</b></div>
                  <div>Water Level: <b className="text-white">{scn.water_level_index}</b></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Controls & Live Execution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0d1527] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              SCENARIO TUNING CONTROLS
            </h3>
            <span className="text-xs text-cyan-400 font-mono font-bold">{selectedScenarioId}</span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Rainfall Slider */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Rainfall Intensity (24h Deluge):</span>
                <span className="font-mono font-bold text-cyan-400">{customRainfall} mm</span>
              </div>
              <input
                type="range"
                min="50"
                max="500"
                step="10"
                value={customRainfall}
                onChange={(e) => setCustomRainfall(parseInt(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                <span>50 mm (Monsoon)</span>
                <span>350 mm (Michaung)</span>
                <span>500 mm (Catastrophic)</span>
              </div>
            </div>

            {/* Water Level Index */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Water Basin Overflow Index (0 - 1.0):</span>
                <span className="font-mono font-bold text-cyan-400">{customWaterLevel.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={customWaterLevel}
                onChange={(e) => setCustomWaterLevel(parseFloat(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                <span>0.1 (Normal Flow)</span>
                <span>0.6 (Bankfull)</span>
                <span>1.0 (Severe Breach)</span>
              </div>
            </div>

            {/* Available Rescue Teams */}
            <div>
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Available Rescue Teams:</span>
                <span className="font-mono font-bold text-cyan-400">{customTeams} Units</span>
              </div>
              <input
                type="range"
                min="2"
                max="25"
                step="1"
                value={customTeams}
                onChange={(e) => setCustomTeams(parseInt(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                <span>2 (Severe Deficit)</span>
                <span>10 (Nominal)</span>
                <span>25 (Surge Mobilised)</span>
              </div>
            </div>

            <button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center justify-center space-x-2 shadow-lg shadow-cyan-900/40"
            >
              <Play className={`w-4 h-4 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? 'Propagating Simulation State...' : 'Simulate & Propagate Scenario'}</span>
            </button>
          </div>
        </div>

        {/* Dynamic Before-vs-After Comparison (2 cols) */}
        <div className="lg:col-span-2 p-4 rounded-xl border border-slate-800 bg-[#0d1527] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              SYSTEM STATE IMPACT & PROPAGATION AUDIT
            </h3>
            <span className="text-xs font-mono text-slate-400">Deterministic Backend Recalculation</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px]">RAINFALL FORCING</span>
              <div className="text-lg font-bold text-white mt-1">{customRainfall} mm</div>
              <span className="text-[10px] text-cyan-400">IMD Sensor Simulation</span>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px]">EXPOSED POPULATION</span>
              <div className="text-lg font-bold text-amber-400 mt-1">
                {overview?.metrics.find((m) => m.label.includes('Exposed'))?.value || '—'}
              </div>
              <span className="text-[10px] text-slate-400">MCDA Vulnerability</span>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px]">RESCUE TEAMS ACTIVE</span>
              <div className="text-lg font-bold text-emerald-400 mt-1">
                {overview?.metrics.find((m) => m.label.includes('Rescue'))?.value || '—'}
              </div>
              <span className="text-[10px] text-slate-400">Google OR-Tools Allocation</span>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-500 block text-[10px]">ROAD SEVERANCES</span>
              <div className="text-lg font-bold text-red-400 mt-1">
                {overview?.total_blocked_roads || 0} Corridors
              </div>
              <span className="text-[10px] text-slate-400">NetworkX Graph Penalties</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/40 text-xs text-slate-300 space-y-2">
            <div className="font-semibold text-white flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Multi-Module State Coherence Guarantee</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              When a scenario change is triggered above, NADI-NET does <b>not</b> fake UI animations. The backend
              executes the full chain: (1) Re-evaluates 15 GCC zones using the MCDA risk engine; (2) Reweights the
              NetworkX Chennai road graph with blocked river bridges; (3) Solves the OR-Tools MILP optimizer with
              new resource constraints; (4) Writes an audit log record into SQLite; and (5) Updates all dashboard
              and geospatial layers simultaneously.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

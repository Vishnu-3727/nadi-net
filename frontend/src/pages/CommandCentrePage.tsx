import React, { useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Truck,
  Building2,
  Users,
  Shield,
  Clock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import {
  CommandCenterOverviewData,
  ZoneRiskAssessmentData,
  RoadNetworkData,
  FacilitiesData,
  OptimisationResultData,
} from '../types';
import { ChennaiMap } from '../components/ChennaiMap';
import { ProvenanceBadge } from '../components/ProvenanceBadge';

interface Props {
  overview: CommandCenterOverviewData | null;
  zones: ZoneRiskAssessmentData[];
  roadNetwork: RoadNetworkData | null;
  facilities: FacilitiesData | null;
  allocations: OptimisationResultData | null;
  onNavigateTab: (tab: any) => void;
  onSelectZone: (zone: ZoneRiskAssessmentData) => void;
}

export const CommandCentrePage: React.FC<Props> = ({
  overview,
  zones,
  roadNetwork,
  facilities,
  allocations,
  onNavigateTab,
  onSelectZone,
}) => {
  const [selectedZone, setSelectedZone] = useState<ZoneRiskAssessmentData | null>(null);

  if (!overview) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 font-mono">
        Loading Command Centre Grid...
      </div>
    );
  }

  const handleMapZoneClick = (z: ZoneRiskAssessmentData) => {
    setSelectedZone(z);
    onSelectZone(z);
  };

  return (
    <div className="space-y-6">
      {/* 1. Emergency Severity Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg ${
          overview.active_severity === 'CRITICAL'
            ? 'bg-red-950/40 border-red-800/80 text-red-200'
            : overview.active_severity === 'SEVERE'
            ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
            : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
        }`}
      >
        <div className="flex items-center space-x-3.5 min-w-0">
          <div
            className={`p-2.5 rounded-lg shrink-0 ${
              overview.active_severity === 'CRITICAL'
                ? 'bg-red-500/20 text-red-400'
                : overview.active_severity === 'SEVERE'
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}
          >
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-black/40 border border-current shrink-0">
                SEVERITY: {overview.active_severity}
              </span>
              <span className="text-sm font-bold text-white truncate">
                {overview.active_scenario_name}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 line-clamp-2">
              Coordinated Decision-Support Grid for Greater Chennai Corporation (GCC) & State Disaster Management Authority
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0 self-end md:self-auto">
          <ProvenanceBadge provenance="SIMULATED" size="sm" />
          <button
            onClick={() => onNavigateTab('simulator')}
            className="px-3 py-1.5 bg-black/50 hover:bg-black/80 text-white rounded-lg text-xs font-medium border border-current transition flex items-center space-x-1 cursor-pointer whitespace-nowrap"
          >
            <span>Change Scenario</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {overview.metrics.map((m, idx) => {
          let statusBorder = 'border-slate-800';
          let valColor = 'text-white';
          if (m.status === 'critical') {
            statusBorder = 'border-red-900/60 bg-red-950/20';
            valColor = 'text-red-400';
          } else if (m.status === 'warning') {
            statusBorder = 'border-amber-900/60 bg-amber-950/20';
            valColor = 'text-amber-400';
          } else if (m.status === 'good') {
            statusBorder = 'border-emerald-900/60 bg-emerald-950/20';
            valColor = 'text-emerald-400';
          } else {
            statusBorder = 'border-slate-800 bg-[#0d1527]';
          }

          return (
            <div
              key={idx}
              className={`p-3 rounded-xl border flex flex-col justify-between min-h-[105px] overflow-hidden ${statusBorder}`}
            >
              <div>
                <div className="flex items-start justify-between gap-1.5 mb-2">
                  <span className="text-[11px] font-medium text-slate-400 leading-tight line-clamp-1">{m.label}</span>
                  <ProvenanceBadge provenance={m.provenance} size="sm" />
                </div>
                <div className={`text-lg sm:text-xl font-bold font-mono tracking-tight leading-none mt-1 ${valColor}`}>
                  {m.value}
                </div>
              </div>
              <div className="text-[10px] text-slate-500 mt-2 truncate">{m.subtext}</div>
            </div>
          );
        })}
      </div>

      {/* 3. Central Map & Inspection Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map (2 cols) */}
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <span>Geospatial Situation Map (Chennai GCC Operational Grid)</span>
              <ProvenanceBadge provenance="OBSERVED" size="sm" />
            </h2>
            <button
              onClick={() => onNavigateTab('geospatial')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer"
            >
              <span>Full Layer Controls</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>

          <ChennaiMap
            zones={zones}
            roadNetwork={roadNetwork || undefined}
            facilities={facilities || undefined}
            selectedZoneId={selectedZone?.zone_id}
            onSelectZone={handleMapZoneClick}
            height="460px"
          />
        </div>

        {/* Selected Zone Quick Inspector or High Priority Alerts */}
        <div className="space-y-4">
          {selectedZone ? (
            <div className="p-4 rounded-xl border border-cyan-800/80 bg-cyan-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                    ZONE {selectedZone.zone_id} INSPECTOR
                  </span>
                  <h3 className="text-base font-bold text-white">{selectedZone.name}</h3>
                </div>
                <ProvenanceBadge provenance={selectedZone.provenance} size="sm" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">RISK SCORE</span>
                  <span className="text-lg font-bold text-amber-400">
                    {selectedZone.flood_risk_score} / 100
                  </span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">PRIORITY</span>
                  <span className="text-lg font-bold text-red-400">
                    Priority {selectedZone.recommended_priority}
                  </span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">EXPOSED POP.</span>
                  <span className="text-sm font-semibold text-slate-200">
                    {selectedZone.estimated_exposed_population.toLocaleString()}
                  </span>
                </div>
                <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">ELEVATION</span>
                  <span className="text-sm font-semibold text-slate-200">
                    {selectedZone.baseline_elevation_m} m AMSL
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-mono">
                  CONTRIBUTING FACTORS
                </span>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span>Rainfall Impact:</span>
                    <span className="font-mono">{selectedZone.contributing_factors.rainfall_contribution} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Elevation Deficit:</span>
                    <span className="font-mono">{selectedZone.contributing_factors.elevation_contribution} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Historical Risk:</span>
                    <span className="font-mono">{selectedZone.contributing_factors.historical_contribution} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Drainage Factor:</span>
                    <span className="font-mono">{selectedZone.contributing_factors.drainage_contribution} pts</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  onSelectZone(selectedZone);
                  onNavigateTab('routing');
                }}
                className="w-full py-2 bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center space-x-1.5"
              >
                <span>Plan Rescue Route to {selectedZone.name}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-slate-800 bg-[#0d1527] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center space-x-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>CRITICAL ALERTS ({overview.alerts.length})</span>
                </h3>
                <ProvenanceBadge provenance="MODEL_ESTIMATE" size="sm" />
              </div>

              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {overview.alerts.map((alt) => (
                  <div
                    key={alt.id}
                    className="p-2.5 rounded-lg border border-red-950 bg-red-950/20 text-xs space-y-1 hover:border-red-800/80 transition cursor-pointer"
                    onClick={() => {
                      const found = zones.find((z) => z.zone_id === alt.zone_id);
                      if (found) handleMapZoneClick(found);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-red-300">
                        Zone {alt.zone_id}: {alt.zone_name}
                      </span>
                      <span className="text-[10px] font-mono text-red-400 bg-red-950 px-1.5 py-0.5 rounded border border-red-800">
                        {alt.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300">{alt.message}</p>
                    <div className="text-[10px] text-amber-400 font-medium">
                      Action: {alt.action_required}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Logs Feed */}
          <div className="p-3.5 rounded-xl border border-slate-800 bg-[#0d1527] space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Recent System Activity</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">SQLite Audit</span>
            </div>
            <div className="space-y-1.5 text-xs">
              {overview.recent_activities.slice(0, 4).map((a) => (
                <div key={a.id} className="p-2 rounded bg-slate-900/60 border border-slate-800 text-[11px] space-y-0.5">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono">
                    <span>{a.action_type}</span>
                    <span>{a.timestamp}</span>
                  </div>
                  <div className="text-slate-300 line-clamp-1">{a.message}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Active Resource Allocations Quick Glance */}
      {allocations && (
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0d1527] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Truck className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-200">
                Active Tactical Rescue Assignments ({allocations.total_assigned_teams} Units Deployed)
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('optimisation')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer font-medium"
            >
              <span>Inspect MILP Solver Details</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                  <th className="py-2 px-3">Team</th>
                  <th className="py-2 px-3">Agency</th>
                  <th className="py-2 px-3">Destination Zone</th>
                  <th className="py-2 px-3">Priority</th>
                  <th className="py-2 px-3">Travel Time</th>
                  <th className="py-2 px-3">Vehicle</th>
                  <th className="py-2 px-3">Supplies Allocated</th>
                  <th className="py-2 px-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
                {allocations.assignments.slice(0, 5).map((asg) => (
                  <tr key={asg.team_id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-semibold text-white">{asg.team_name}</td>
                    <td className="py-2.5 px-3 text-cyan-400">{asg.agency}</td>
                    <td className="py-2.5 px-3">
                      Zone {asg.assigned_zone_id}: {asg.assigned_zone_name}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-400 border border-red-800">
                        P{asg.zone_priority}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-amber-400">{asg.estimated_arrival_time_min} min</td>
                    <td className="py-2.5 px-3 text-slate-400">{asg.vehicle_used}</td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-300">
                      {asg.allocated_supplies.food_packets} Meals | {asg.allocated_supplies.water_litres}L Water | {asg.allocated_supplies.medical_kits} Med
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        onClick={() => {
                          const targetZone = zones.find((z) => z.zone_id === asg.assigned_zone_id);
                          if (targetZone) onSelectZone(targetZone);
                          onNavigateTab('routing');
                        }}
                        className="text-cyan-400 hover:text-cyan-300 underline text-[11px] cursor-pointer"
                      >
                        Inspect Route
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

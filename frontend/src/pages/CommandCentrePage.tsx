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
  MapPin,
  LifeBuoy,
  Waves,
  Navigation,
  CheckCircle2,
  Radio,
  Activity,
  Compass,
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
  reportedIncidents?: any[];
  onOpenSOS?: () => void;
  onNavigateTab: (tab: any) => void;
  onSelectZone: (zone: ZoneRiskAssessmentData) => void;
}

export const CommandCentrePage: React.FC<Props> = ({
  overview,
  zones,
  roadNetwork,
  facilities,
  allocations,
  reportedIncidents = [],
  onOpenSOS,
  onNavigateTab,
  onSelectZone,
}) => {
  const [selectedZone, setSelectedZone] = useState<ZoneRiskAssessmentData | null>(null);

  if (!overview) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-400 font-mono">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
          <span>Synchronizing Chennai Emergency Ops Grid...</span>
        </div>
      </div>
    );
  }

  const handleMapZoneClick = (zone: ZoneRiskAssessmentData) => {
    setSelectedZone(zone);
    onSelectZone(zone);
  };

  const getSeverityBadge = () => {
    if (overview.active_severity === 'CRITICAL') {
      return 'bg-red-500/10 text-red-400 border-red-500/30';
    }
    if (overview.active_severity === 'SEVERE') {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    }
    return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Neutral High-Contrast Emergency Operations Banner */}
      <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700/80 flex items-center justify-center text-zinc-300 shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className={`text-xs font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-md border shrink-0 ${getSeverityBadge()}`}>
                  SEVERITY: {overview.active_severity}
                </span>
                <span className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                  {overview.active_scenario_name}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
                Coordinated Emergency Response Grid for Greater Chennai Corporation (GCC) & State Disaster Management Authority
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0 self-end md:self-auto">
            <ProvenanceBadge provenance="SIMULATED" size="sm" />
            {onOpenSOS && (
              <button
                onClick={onOpenSOS}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center space-x-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
              >
                <LifeBuoy className="w-3.5 h-3.5" />
                <span>Broadcast Citizen SOS</span>
              </button>
            )}
            <button
              onClick={() => onNavigateTab('simulator')}
              className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-xl text-xs font-medium border border-zinc-700 transition flex items-center space-x-1 cursor-pointer whitespace-nowrap shadow-sm"
            >
              <span>Change Scenario</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Neutral Dark 4-Card Quick Actions Hub */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <button
          onClick={onOpenSOS}
          className="p-4 rounded-2xl bg-[#121215] border border-zinc-800 hover:border-zinc-700 transition duration-150 text-left group cursor-pointer shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-red-400 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span>CITIZEN RELAY</span>
            </span>
            <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-red-400 group-hover:scale-105 transition">
              <LifeBuoy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm font-bold text-white group-hover:text-zinc-200 transition">Log Citizen SOS</div>
          <div className="text-[11px] text-zinc-400 mt-1">Direct relay to nearest TNFRS & NDRF depot</div>
        </button>

        <button
          onClick={() => onNavigateTab('routing')}
          className="p-4 rounded-2xl bg-[#121215] border border-zinc-800 hover:border-zinc-700 transition duration-150 text-left group cursor-pointer shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span>NAVIGATION</span>
            </span>
            <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sky-400 group-hover:scale-105 transition">
              <Navigation className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm font-bold text-white group-hover:text-zinc-200 transition">Rescue Navigation</div>
          <div className="text-[11px] text-zinc-400 mt-1">Dijkstra detours around submerged bridges</div>
        </button>

        <button
          onClick={() => onNavigateTab('optimisation')}
          className="p-4 rounded-2xl bg-[#121215] border border-zinc-800 hover:border-zinc-700 transition duration-150 text-left group cursor-pointer shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>MILP SOLVER</span>
            </span>
            <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400 group-hover:scale-105 transition">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm font-bold text-white group-hover:text-zinc-200 transition">OR-Tools Allocator</div>
          <div className="text-[11px] text-zinc-400 mt-1">Strict team & supply capacity optimization</div>
        </button>

        <button
          onClick={() => onNavigateTab('flood_intelligence')}
          className="p-4 rounded-2xl bg-[#121215] border border-zinc-800 hover:border-zinc-700 transition duration-150 text-left group cursor-pointer shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-violet-400 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              <span>FLOOD INTEL</span>
            </span>
            <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-violet-400 group-hover:scale-105 transition">
              <Waves className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm font-bold text-white group-hover:text-zinc-200 transition">15 Zones Risk Grid</div>
          <div className="text-[11px] text-zinc-400 mt-1">AHP multi-criteria score & factor decomposition</div>
        </button>
      </div>

      {/* 3. Refined Neutral Metric Cards (Clean Vercel/Linear Style) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {overview.metrics.map((m, idx) => {
          let CardIcon = Activity;
          let iconColor = 'text-zinc-400';

          if (idx === 0) {
            CardIcon = AlertTriangle;
            iconColor = 'text-amber-400';
          } else if (idx === 1) {
            CardIcon = MapPin;
            iconColor = 'text-sky-400';
          } else if (idx === 2) {
            CardIcon = Users;
            iconColor = 'text-indigo-400';
          } else if (idx === 3) {
            CardIcon = Shield;
            iconColor = 'text-emerald-400';
          } else if (idx === 4) {
            CardIcon = Navigation;
            iconColor = 'text-red-400';
          } else if (idx === 5) {
            CardIcon = Building2;
            iconColor = 'text-teal-400';
          }

          return (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-[#121215] border border-zinc-800 flex flex-col justify-between min-h-[110px] shadow-sm hover:border-zinc-700 transition"
            >
              <div>
                <div className="flex items-start justify-between gap-1.5 mb-2">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <CardIcon className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />
                    <span className="text-[11px] font-medium text-zinc-400 leading-tight truncate">
                      {m.label}
                    </span>
                  </div>
                  <ProvenanceBadge provenance={m.provenance} size="sm" />
                </div>
                <div className="text-xl sm:text-2xl font-bold font-mono tracking-tight leading-none mt-1 text-white">
                  {m.value}
                </div>
              </div>
              <div className="text-[10px] text-zinc-500 mt-2 truncate font-medium">{m.subtext}</div>
            </div>
          );
        })}
      </div>

      {/* 4. Central Map & Inspection / Incident Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map (2 cols) */}
        <div className="lg:col-span-2 space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>Geospatial Situation Map (Chennai GCC Operational Grid)</span>
              <ProvenanceBadge provenance="OBSERVED" size="sm" />
            </h2>
            <button
              onClick={() => onNavigateTab('geospatial')}
              className="text-xs text-zinc-300 hover:text-white flex items-center space-x-1 cursor-pointer font-medium"
            >
              <span>Full Layer Controls</span>
              <ExternalLink className="w-3 h-3 text-zinc-400" />
            </button>
          </div>

          <ChennaiMap
            zones={zones}
            roadNetwork={roadNetwork || undefined}
            facilities={facilities || undefined}
            selectedZoneId={selectedZone?.zone_id}
            onSelectZone={handleMapZoneClick}
            height="480px"
          />
        </div>

        {/* Selected Zone Inspector OR Incident & Critical Alerts Panel */}
        <div className="space-y-4">
          {selectedZone ? (
            <div className="p-4.5 rounded-2xl bg-[#121215] border border-zinc-700 space-y-3.5 shadow-md">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider font-bold">
                    ZONE {selectedZone.zone_id} INSPECTOR
                  </span>
                  <h3 className="text-base font-bold text-white">{selectedZone.name}</h3>
                </div>
                <ProvenanceBadge provenance={selectedZone.provenance} size="sm" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">RISK SCORE</span>
                  <span className="text-lg font-bold text-amber-400">
                    {selectedZone.flood_risk_score} / 100
                  </span>
                </div>
                <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">PRIORITY TIER</span>
                  <span className="text-lg font-bold text-red-400">
                    Priority {selectedZone.recommended_priority}
                  </span>
                </div>
                <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">EXPOSED POP.</span>
                  <span className="text-sm font-bold text-white">
                    {selectedZone.estimated_exposed_population.toLocaleString()}
                  </span>
                </div>
                <div className="bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">ELEVATION</span>
                  <span className="text-sm font-bold text-zinc-300">
                    {selectedZone.baseline_elevation_m} m AMSL
                  </span>
                </div>
              </div>

              <div className="text-xs text-zinc-300 bg-zinc-900 p-3 rounded-xl border border-zinc-800 space-y-1.5">
                <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-mono font-bold">
                  CONTRIBUTING FACTORS
                </span>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Rainfall Impact:</span>
                    <span className="font-mono text-sky-400 font-semibold">{selectedZone.contributing_factors.rainfall_contribution} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Elevation Deficit:</span>
                    <span className="font-mono text-amber-400 font-semibold">{selectedZone.contributing_factors.elevation_contribution} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Historical Vulnerability:</span>
                    <span className="font-mono text-rose-400 font-semibold">{selectedZone.contributing_factors.historical_contribution} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Drainage Inadequacy:</span>
                    <span className="font-mono text-zinc-300 font-semibold">{selectedZone.contributing_factors.drainage_contribution} pts</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  onSelectZone(selectedZone);
                  onNavigateTab('routing');
                }}
                className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center space-x-1.5 border border-zinc-700"
              >
                <span>Navigate Rescue Route to {selectedZone.name}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="p-4.5 rounded-2xl bg-[#121215] border border-zinc-800 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center space-x-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span>CRITICAL INCIDENT FEED ({overview.alerts.length + reportedIncidents.length})</span>
                </h3>
                <ProvenanceBadge provenance="MODEL_ESTIMATE" size="sm" />
              </div>

              <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
                {/* User-Reported Incidents (WeCare style) */}
                {reportedIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    className="p-3.5 rounded-xl border border-red-500/30 bg-zinc-900 text-xs space-y-1.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-red-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                        <span>Zone {inc.zone_id}: {inc.zone_name}</span>
                      </span>
                      <span className="text-[9px] font-mono font-bold text-red-400 bg-red-950 px-2 py-0.5 rounded-full border border-red-800">
                        SOS: {inc.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-300 font-medium">{inc.location}</p>
                    <div className="text-[10px] text-amber-300 flex items-center justify-between">
                      <span>Stranded Citizens: {inc.affected_count}</span>
                      <span className="font-mono text-zinc-400">{inc.timestamp}</span>
                    </div>
                  </div>
                ))}

                {/* Simulated Scenario Alerts */}
                {overview.alerts.map((alt) => (
                  <div
                    key={alt.id}
                    className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 text-xs space-y-1.5 transition cursor-pointer"
                    onClick={() => {
                      const found = zones.find((z) => z.zone_id === alt.zone_id);
                      if (found) handleMapZoneClick(found);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-zinc-200">
                        Zone {alt.zone_id}: {alt.zone_name}
                      </span>
                      <span className="text-[9px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800 font-bold">
                        {alt.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400">{alt.message}</p>
                    <div className="text-[10px] text-zinc-400 font-medium">
                      Action: <span className="text-zinc-200">{alt.action_required}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Logs Feed */}
          <div className="p-3.5 rounded-2xl bg-[#121215] border border-zinc-800 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-zinc-300 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Recent System Activity</span>
              </h3>
              <span className="text-[10px] text-zinc-400 font-mono">SQLite Audit</span>
            </div>
            <div className="space-y-1.5 text-xs">
              {overview.recent_activities.slice(0, 4).map((a) => (
                <div key={a.id} className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800/80 text-[11px] space-y-0.5">
                  <div className="flex items-center justify-between text-zinc-400 text-[10px] font-mono">
                    <span className="text-zinc-300 font-semibold">{a.action_type}</span>
                    <span>{a.timestamp}</span>
                  </div>
                  <div className="text-zinc-400 line-clamp-1">{a.message}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Clean Rescue Deployments Grid */}
      {allocations && (
        <div className="p-5 rounded-2xl bg-[#121215] border border-zinc-800 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Active Tactical Rescue Deployments ({allocations.total_assigned_teams} Units Deployed)
                </h3>
                <p className="text-[11px] text-zinc-400">
                  OR-Tools CBC Mixed-Integer Linear Program assignments with one-trip capacity bounds
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('optimisation')}
              className="text-xs text-zinc-300 hover:text-white flex items-center space-x-1 cursor-pointer font-bold"
            >
              <span>Inspect MILP Solver Details</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {allocations.assignments.slice(0, 6).map((asg) => (
              <div
                key={asg.team_id}
                className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition duration-150 space-y-2.5 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>{asg.team_name}</span>
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold">
                      {asg.agency}
                    </span>
                  </div>

                  <div className="text-xs text-zinc-300 flex items-center justify-between py-1 border-t border-zinc-800">
                    <span className="text-zinc-500">Assigned Zone:</span>
                    <span className="font-semibold text-white">Zone {asg.assigned_zone_id} ({asg.assigned_zone_name})</span>
                  </div>

                  <div className="text-xs text-zinc-300 flex items-center justify-between py-1 border-t border-zinc-800">
                    <span className="text-zinc-500">Vehicle Profile:</span>
                    <span className="font-mono text-zinc-300 text-[11px]">{asg.vehicle_used}</span>
                  </div>

                  <div className="text-xs text-zinc-300 flex items-center justify-between py-1 border-t border-zinc-800">
                    <span className="text-zinc-500">Estimated Arrival:</span>
                    <span className="font-mono text-amber-400 font-bold">{asg.estimated_arrival_time_min} mins</span>
                  </div>

                  <div className="mt-2.5 p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-400 space-y-0.5 font-mono">
                    <div className="text-zinc-500 uppercase tracking-wider text-[9px] font-bold">Ration Payload</div>
                    <div>{asg.allocated_supplies.food_packets} Meals · {asg.allocated_supplies.water_litres}L Water · {asg.allocated_supplies.medical_kits} Med</div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const targetZone = zones.find((z) => z.zone_id === asg.assigned_zone_id);
                    if (targetZone) onSelectZone(targetZone);
                    onNavigateTab('routing');
                  }}
                  className="w-full mt-2.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Inspect Route Topology</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

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
  PhoneCall,
  Send,
  Radio,
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
      <div className="flex items-center justify-center h-full text-slate-400 font-mono">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span>Synchronizing Chennai Emergency Ops Grid...</span>
        </div>
      </div>
    );
  }

  const handleMapZoneClick = (zone: ZoneRiskAssessmentData) => {
    setSelectedZone(zone);
    onSelectZone(zone);
  };

  const getMetricIcon = (idx: number) => {
    switch (idx) {
      case 0:
        return AlertTriangle;
      case 1:
        return MapPin;
      case 2:
        return Users;
      case 3:
        return Shield;
      case 4:
        return Navigation;
      case 5:
        return Building2;
      default:
        return AlertCircle;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. SLDA / WeCare Inspired Emergency Action Banner */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl relative overflow-hidden backdrop-blur-xl ${
          overview.active_severity === 'CRITICAL'
            ? 'bg-gradient-to-r from-red-950/80 via-slate-900/90 to-red-950/40 border-red-800/80 text-red-200'
            : overview.active_severity === 'SEVERE'
            ? 'bg-gradient-to-r from-amber-950/80 via-slate-900/90 to-amber-950/40 border-amber-800/80 text-amber-200'
            : 'bg-gradient-to-r from-emerald-950/80 via-slate-900/90 to-cyan-950/40 border-emerald-800/80 text-emerald-200'
        }`}
      >
        <div className="flex items-center space-x-3.5 min-w-0 z-10">
          <div
            className={`p-3 rounded-2xl shrink-0 ring-1 shadow-xl ${
              overview.active_severity === 'CRITICAL'
                ? 'bg-red-500/20 text-red-400 ring-red-500/40 shadow-red-950/50'
                : overview.active_severity === 'SEVERE'
                ? 'bg-amber-500/20 text-amber-400 ring-amber-500/40 shadow-amber-950/50'
                : 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/40 shadow-emerald-950/50'
            }`}
          >
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-black/50 border border-current shrink-0 shadow-sm">
                SEVERITY: {overview.active_severity}
              </span>
              <span className="text-sm sm:text-base font-bold text-white truncate">
                {overview.active_scenario_name}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 line-clamp-1 font-medium">
              Coordinated Decision-Support Grid for Greater Chennai Corporation (GCC) & State Disaster Management Authority
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0 self-end md:self-auto z-10">
          <ProvenanceBadge provenance="SIMULATED" size="sm" />
          {onOpenSOS && (
            <button
              onClick={onOpenSOS}
              className="px-3.5 py-1.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white rounded-xl text-xs font-bold border border-red-400/50 shadow-lg shadow-red-950/60 transition flex items-center space-x-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
            >
              <LifeBuoy className="w-3.5 h-3.5 animate-spin" />
              <span>Broadcast SOS</span>
            </button>
          )}
          <button
            onClick={() => onNavigateTab('simulator')}
            className="px-3.5 py-1.5 bg-slate-900/80 hover:bg-slate-800 text-white rounded-xl text-xs font-medium border border-slate-700/80 transition flex items-center space-x-1 cursor-pointer whitespace-nowrap shadow-sm"
          >
            <span>Change Scenario</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Quick Action Dispatch Hub (SLDA Inspired) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={onOpenSOS}
          className="p-3.5 rounded-2xl bg-gradient-to-b from-[#111827] to-[#0a101d] border border-red-900/50 hover:border-red-500/60 transition text-left group cursor-pointer shadow-lg hover:shadow-red-950/40"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-red-400 font-bold">
              Citizen Dispatch
            </span>
            <LifeBuoy className="w-4 h-4 text-red-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-xs font-bold text-white">Log Field Incident SOS</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Relay coordinates to TNFRS</div>
        </button>

        <button
          onClick={() => onNavigateTab('routing')}
          className="p-3.5 rounded-2xl bg-gradient-to-b from-[#111827] to-[#0a101d] border border-cyan-900/50 hover:border-cyan-500/60 transition text-left group cursor-pointer shadow-lg hover:shadow-cyan-950/40"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
              Rescue Navigation
            </span>
            <Navigation className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-xs font-bold text-white">Flood Detour Routing</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Bypass submerged river bridges</div>
        </button>

        <button
          onClick={() => onNavigateTab('optimisation')}
          className="p-3.5 rounded-2xl bg-gradient-to-b from-[#111827] to-[#0a101d] border border-amber-900/50 hover:border-amber-500/60 transition text-left group cursor-pointer shadow-lg hover:shadow-amber-950/40"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
              MILP Allocation
            </span>
            <Truck className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-xs font-bold text-white">OR-Tools Dispatch Solver</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Optimal team & ration allocation</div>
        </button>

        <button
          onClick={() => onNavigateTab('flood_intelligence')}
          className="p-3.5 rounded-2xl bg-gradient-to-b from-[#111827] to-[#0a101d] border border-blue-900/50 hover:border-blue-500/60 transition text-left group cursor-pointer shadow-lg hover:shadow-blue-950/40"
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold">
              AHP MCDA Model
            </span>
            <Waves className="w-4 h-4 text-blue-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-xs font-bold text-white">15 GCC Zones Risk Grid</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Multi-criteria factor attribution</div>
        </button>
      </div>

      {/* 3. Key Metrics Cards with Visual Icons */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {overview.metrics.map((m, idx) => {
          let statusBorder = 'border-slate-800/80 bg-gradient-to-b from-[#0f172a]/90 to-[#090d16]';
          let valColor = 'text-white';
          let iconColor = 'text-cyan-400';
          if (m.status === 'critical') {
            statusBorder = 'border-red-900/60 bg-gradient-to-b from-red-950/30 to-[#090d16]';
            valColor = 'text-red-400';
            iconColor = 'text-red-400';
          } else if (m.status === 'warning') {
            statusBorder = 'border-amber-900/60 bg-gradient-to-b from-amber-950/30 to-[#090d16]';
            valColor = 'text-amber-400';
            iconColor = 'text-amber-400';
          } else if (m.status === 'good') {
            statusBorder = 'border-emerald-900/60 bg-gradient-to-b from-emerald-950/30 to-[#090d16]';
            valColor = 'text-emerald-400';
            iconColor = 'text-emerald-400';
          }

          const CardIcon = getMetricIcon(idx);

          return (
            <div
              key={idx}
              className={`p-3.5 rounded-2xl border flex flex-col justify-between min-h-[110px] overflow-hidden shadow-lg transition duration-200 hover:border-cyan-500/40 ${statusBorder}`}
            >
              <div>
                <div className="flex items-start justify-between gap-1.5 mb-2">
                  <div className="flex items-center space-x-1.5 min-w-0">
                    <CardIcon className={`w-3.5 h-3.5 shrink-0 ${iconColor}`} />
                    <span className="text-[11px] font-medium text-slate-300 leading-tight truncate">
                      {m.label}
                    </span>
                  </div>
                  <ProvenanceBadge provenance={m.provenance} size="sm" />
                </div>
                <div className={`text-lg sm:text-xl font-bold font-mono tracking-tight leading-none mt-1.5 ${valColor}`}>
                  {m.value}
                </div>
              </div>
              <div className="text-[10px] text-slate-400 mt-2 truncate font-medium">{m.subtext}</div>
            </div>
          );
        })}
      </div>

      {/* 4. Central Map & Inspection / Incident Panel */}
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
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer font-medium"
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
            height="470px"
          />
        </div>

        {/* Selected Zone Inspector OR Incident & Critical Alerts Panel */}
        <div className="space-y-4">
          {selectedZone ? (
            <div className="p-4 rounded-2xl border border-cyan-800/80 bg-gradient-to-b from-cyan-950/40 to-[#0a101d] space-y-3.5 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-bold">
                    ZONE {selectedZone.zone_id} INSPECTOR
                  </span>
                  <h3 className="text-base font-bold text-white">{selectedZone.name}</h3>
                </div>
                <ProvenanceBadge provenance={selectedZone.provenance} size="sm" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">RISK SCORE</span>
                  <span className="text-lg font-bold text-amber-400">
                    {selectedZone.flood_risk_score} / 100
                  </span>
                </div>
                <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">PRIORITY TIER</span>
                  <span className="text-lg font-bold text-red-400">
                    Priority {selectedZone.recommended_priority}
                  </span>
                </div>
                <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">EXPOSED POP.</span>
                  <span className="text-sm font-semibold text-slate-200">
                    {selectedZone.estimated_exposed_population.toLocaleString()}
                  </span>
                </div>
                <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">ELEVATION</span>
                  <span className="text-sm font-semibold text-slate-200">
                    {selectedZone.baseline_elevation_m} m AMSL
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-300 bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-mono font-bold">
                  CONTRIBUTING FACTORS
                </span>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Rainfall Impact:</span>
                    <span className="font-mono text-cyan-300">{selectedZone.contributing_factors.rainfall_contribution} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Elevation Deficit:</span>
                    <span className="font-mono text-amber-300">{selectedZone.contributing_factors.elevation_contribution} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Historical Vulnerability:</span>
                    <span className="font-mono text-rose-300">{selectedZone.contributing_factors.historical_contribution} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Drainage Inadequacy:</span>
                    <span className="font-mono text-slate-300">{selectedZone.contributing_factors.drainage_contribution} pts</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  onSelectZone(selectedZone);
                  onNavigateTab('routing');
                }}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-lg shadow-cyan-950/50"
              >
                <span>Navigate Rescue Route to {selectedZone.name}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl border border-slate-800 bg-[#0d1527]/90 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center space-x-1.5">
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
                    className="p-3 rounded-xl border border-red-500/40 bg-gradient-to-r from-red-950/40 to-slate-900/60 text-xs space-y-1.5 shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-red-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                        <span>Zone {inc.zone_id}: {inc.zone_name}</span>
                      </span>
                      <span className="text-[9px] font-mono font-bold text-red-400 bg-red-950/80 px-2 py-0.5 rounded-full border border-red-800">
                        SOS: {inc.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-200 font-medium">{inc.location}</p>
                    <div className="text-[10px] text-amber-300 flex items-center justify-between">
                      <span>People Stranded: {inc.affected_count}</span>
                      <span className="font-mono text-slate-400">{inc.timestamp}</span>
                    </div>
                  </div>
                ))}

                {/* Simulated Scenario Alerts */}
                {overview.alerts.map((alt) => (
                  <div
                    key={alt.id}
                    className="p-3 rounded-xl border border-red-950 bg-red-950/20 text-xs space-y-1.5 hover:border-red-800/80 transition cursor-pointer"
                    onClick={() => {
                      const found = zones.find((z) => z.zone_id === alt.zone_id);
                      if (found) handleMapZoneClick(found);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-red-300">
                        Zone {alt.zone_id}: {alt.zone_name}
                      </span>
                      <span className="text-[9px] font-mono text-red-400 bg-red-950 px-2 py-0.5 rounded-full border border-red-800 font-bold">
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
          <div className="p-3.5 rounded-2xl border border-slate-800/90 bg-[#0d1527]/70 space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Recent System Activity</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">SQLite Audit</span>
            </div>
            <div className="space-y-1.5 text-xs">
              {overview.recent_activities.slice(0, 4).map((a) => (
                <div key={a.id} className="p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] space-y-0.5">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono">
                    <span className="text-cyan-400">{a.action_type}</span>
                    <span>{a.timestamp}</span>
                  </div>
                  <div className="text-slate-300 line-clamp-1">{a.message}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 5. SLDA-Inspired Tactical Rescue Dispatch Grid */}
      {allocations && (
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-800/90 bg-[#0d1527]/80 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Active Tactical Rescue Deployments ({allocations.total_assigned_teams} Units Deployed)
                </h3>
                <p className="text-[11px] text-slate-400">
                  OR-Tools CBC Mixed-Integer Linear Program assignments with one-trip capacity bounds
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('optimisation')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 cursor-pointer font-medium"
            >
              <span>Inspect MILP Solver Details</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {allocations.assignments.slice(0, 6).map((asg) => (
              <div
                key={asg.team_id}
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-cyan-500/50 transition duration-200 space-y-2.5 shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{asg.team_name}</span>
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold">
                      {asg.agency}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 flex items-center justify-between py-1 border-t border-slate-800/60">
                    <span className="text-slate-400">Assigned Zone:</span>
                    <span className="font-semibold text-white">Zone {asg.assigned_zone_id} ({asg.assigned_zone_name})</span>
                  </div>

                  <div className="text-xs text-slate-300 flex items-center justify-between py-1 border-t border-slate-800/60">
                    <span className="text-slate-400">Vehicle Profile:</span>
                    <span className="font-mono text-cyan-300 text-[11px]">{asg.vehicle_used}</span>
                  </div>

                  <div className="text-xs text-slate-300 flex items-center justify-between py-1 border-t border-slate-800/60">
                    <span className="text-slate-400">Estimated Arrival:</span>
                    <span className="font-mono text-amber-400 font-bold">{asg.estimated_arrival_time_min} mins</span>
                  </div>

                  <div className="mt-2 p-2 rounded-lg bg-black/40 border border-slate-800 text-[10px] text-slate-300 space-y-0.5 font-mono">
                    <div className="text-slate-500 uppercase tracking-wider text-[9px]">Ration Payload</div>
                    <div>{asg.allocated_supplies.food_packets} Meals · {asg.allocated_supplies.water_litres}L Water · {asg.allocated_supplies.medical_kits} Med</div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const targetZone = zones.find((z) => z.zone_id === asg.assigned_zone_id);
                    if (targetZone) onSelectZone(targetZone);
                    onNavigateTab('routing');
                  }}
                  className="w-full mt-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center space-x-1"
                >
                  <Navigation className="w-3 h-3" />
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

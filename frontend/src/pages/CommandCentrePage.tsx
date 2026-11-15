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
  Flame,
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
      <div className="flex items-center justify-center h-full text-slate-400 font-mono">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span>Synchronizing Chennai Emergency Ops Grid...</span>
        </div>
      </div>
    );
  }

  const handleMapZoneClick = (zone: ZoneRiskAssessmentData) => {
    setSelectedZone(zone);
    onSelectZone(zone);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. WeCare & SLDA Inspired Hero Emergency Operations Banner */}
      <div
        className={`p-5 rounded-2xl border relative overflow-hidden backdrop-blur-2xl shadow-2xl transition duration-300 ${
          overview.active_severity === 'CRITICAL'
            ? 'bg-gradient-to-r from-red-950/70 via-[#130b0e] to-rose-950/40 border-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.15)] text-red-200'
            : overview.active_severity === 'SEVERE'
            ? 'bg-gradient-to-r from-amber-950/70 via-[#14100c] to-orange-950/40 border-amber-500/30 shadow-[0_0_40px_rgba(245,158,11,0.15)] text-amber-200'
            : 'bg-gradient-to-r from-emerald-950/70 via-[#0b1411] to-teal-950/40 border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.15)] text-emerald-200'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
          <div className="flex items-center space-x-4 min-w-0">
            <div
              className={`p-3.5 rounded-2xl shrink-0 ring-1 shadow-2xl ${
                overview.active_severity === 'CRITICAL'
                  ? 'bg-red-500/20 text-red-400 ring-red-500/40 shadow-red-950/80'
                  : overview.active_severity === 'SEVERE'
                  ? 'bg-amber-500/20 text-amber-400 ring-amber-500/40 shadow-amber-950/80'
                  : 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/40 shadow-emerald-950/80'
              }`}
            >
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-mono font-black tracking-wider uppercase px-3 py-1 rounded-full bg-black/60 border border-current shrink-0 shadow-sm">
                  SEVERITY: {overview.active_severity}
                </span>
                <span className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                  {overview.active_scenario_name}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 font-medium line-clamp-1">
                Coordinated Emergency Response Grid for Greater Chennai Corporation (GCC) & State Disaster Management Authority
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0 self-end md:self-auto">
            <ProvenanceBadge provenance="SIMULATED" size="sm" />
            {onOpenSOS && (
              <button
                onClick={onOpenSOS}
                className="px-4 py-2 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold border border-red-400/50 shadow-[0_0_25px_rgba(239,68,68,0.5)] transition flex items-center space-x-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
              >
                <LifeBuoy className="w-3.5 h-3.5 animate-spin" />
                <span>Broadcast Citizen SOS</span>
              </button>
            )}
            <button
              onClick={() => onNavigateTab('simulator')}
              className="px-3.5 py-2 bg-white/[0.06] hover:bg-white/[0.12] text-white rounded-xl text-xs font-semibold border border-white/[0.1] transition flex items-center space-x-1 cursor-pointer whitespace-nowrap shadow-sm"
            >
              <span>Change Scenario</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Distinct 4-Card Operational Hub (WeCare / SLDA Inspired - Breaking Monotone Blue) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Coral/Crimson SOS Card */}
        <button
          onClick={onOpenSOS}
          className="p-4 rounded-2xl bg-gradient-to-br from-[#1c1214] via-[#120b0d] to-[#0d090a] border border-red-500/25 hover:border-red-500/60 transition duration-200 text-left group cursor-pointer shadow-xl hover:shadow-[0_0_25px_rgba(239,68,68,0.2)]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
              <span>CITIZEN RELAY</span>
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-110 transition">
              <LifeBuoy className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm font-bold text-white group-hover:text-rose-200 transition">Log Citizen SOS</div>
          <div className="text-[11px] text-slate-400 mt-1">Direct relay to nearest TNFRS & NDRF depot</div>
        </button>

        {/* Emerald/Mint Routing Card */}
        <button
          onClick={() => onNavigateTab('routing')}
          className="p-4 rounded-2xl bg-gradient-to-br from-[#0f1b16] via-[#0b1410] to-[#080d0b] border border-emerald-500/25 hover:border-emerald-500/60 transition duration-200 text-left group cursor-pointer shadow-xl hover:shadow-[0_0_25px_rgba(16,185,129,0.2)]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>NAVIGATION</span>
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition">
              <Navigation className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm font-bold text-white group-hover:text-emerald-200 transition">Rescue Navigation</div>
          <div className="text-[11px] text-slate-400 mt-1">Dijkstra detours around submerged bridges</div>
        </button>

        {/* Amber/Gold Allocation Card */}
        <button
          onClick={() => onNavigateTab('optimisation')}
          className="p-4 rounded-2xl bg-gradient-to-br from-[#1c160e] via-[#14100a] to-[#0d0a07] border border-amber-500/25 hover:border-amber-500/60 transition duration-200 text-left group cursor-pointer shadow-xl hover:shadow-[0_0_25px_rgba(245,158,11,0.2)]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>MILP SOLVER</span>
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 transition">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm font-bold text-white group-hover:text-amber-200 transition">OR-Tools Allocator</div>
          <div className="text-[11px] text-slate-400 mt-1">Strict team & supply capacity optimization</div>
        </button>

        {/* Violet/Indigo Risk Card */}
        <button
          onClick={() => onNavigateTab('flood_intelligence')}
          className="p-4 rounded-2xl bg-gradient-to-br from-[#181324] via-[#110d1a] to-[#0a0810] border border-violet-500/25 hover:border-violet-500/60 transition duration-200 text-left group cursor-pointer shadow-xl hover:shadow-[0_0_25px_rgba(139,92,246,0.2)]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-violet-400 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              <span>FLOOD INTEL</span>
            </span>
            <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400 group-hover:scale-110 transition">
              <Waves className="w-4 h-4" />
            </div>
          </div>
          <div className="text-sm font-bold text-white group-hover:text-violet-200 transition">15 Zones Risk Grid</div>
          <div className="text-[11px] text-slate-400 mt-1">AHP multi-criteria score & factor decomposition</div>
        </button>
      </div>

      {/* 3. Modern Executive KPI Indicators (6 Dynamic Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {overview.metrics.map((m, idx) => {
          let cardBg = 'bg-[#10141e]/90 border-white/[0.08]';
          let valColor = 'text-white';
          let iconColor = 'text-slate-400';
          let CardIcon = Activity;

          if (idx === 0) {
            CardIcon = AlertTriangle;
            cardBg = 'bg-gradient-to-b from-[#1a1012] to-[#0e0a0b] border-rose-500/30';
            valColor = 'text-rose-400';
            iconColor = 'text-rose-400';
          } else if (idx === 1) {
            CardIcon = MapPin;
            cardBg = 'bg-gradient-to-b from-[#1a140f] to-[#0e0c0a] border-amber-500/30';
            valColor = 'text-amber-400';
            iconColor = 'text-amber-400';
          } else if (idx === 2) {
            CardIcon = Users;
            cardBg = 'bg-gradient-to-b from-[#141224] to-[#0c0a17] border-violet-500/30';
            valColor = 'text-violet-300';
            iconColor = 'text-violet-400';
          } else if (idx === 3) {
            CardIcon = Shield;
            cardBg = 'bg-gradient-to-b from-[#0e1a14] to-[#09110d] border-emerald-500/30';
            valColor = 'text-emerald-400';
            iconColor = 'text-emerald-400';
          } else if (idx === 4) {
            CardIcon = Navigation;
            cardBg = 'bg-gradient-to-b from-[#1a1114] to-[#0e090b] border-red-500/30';
            valColor = 'text-red-400';
            iconColor = 'text-red-400';
          } else if (idx === 5) {
            CardIcon = Building2;
            cardBg = 'bg-gradient-to-b from-[#0e1a17] to-[#091210] border-teal-500/30';
            valColor = 'text-teal-400';
            iconColor = 'text-teal-400';
          }

          return (
            <div
              key={idx}
              className={`p-4 rounded-2xl border flex flex-col justify-between min-h-[115px] overflow-hidden shadow-lg transition duration-200 hover:scale-[1.02] ${cardBg}`}
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
                <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight leading-none mt-1.5 ${valColor}`}>
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
        <div className="lg:col-span-2 space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>Geospatial Situation Map (Chennai GCC Operational Grid)</span>
              <ProvenanceBadge provenance="OBSERVED" size="sm" />
            </h2>
            <button
              onClick={() => onNavigateTab('geospatial')}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 cursor-pointer font-semibold"
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
            height="480px"
          />
        </div>

        {/* Selected Zone Inspector OR Incident & Critical Alerts Panel */}
        <div className="space-y-4">
          {selectedZone ? (
            <div className="p-4.5 rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-[#101c17] to-[#0a120f] space-y-3.5 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider font-bold">
                    ZONE {selectedZone.zone_id} INSPECTOR
                  </span>
                  <h3 className="text-base font-black text-white">{selectedZone.name}</h3>
                </div>
                <ProvenanceBadge provenance={selectedZone.provenance} size="sm" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-black/50 p-2.5 rounded-xl border border-white/[0.08]">
                  <span className="text-slate-400 block text-[10px]">RISK SCORE</span>
                  <span className="text-lg font-black text-amber-400">
                    {selectedZone.flood_risk_score} / 100
                  </span>
                </div>
                <div className="bg-black/50 p-2.5 rounded-xl border border-white/[0.08]">
                  <span className="text-slate-400 block text-[10px]">PRIORITY TIER</span>
                  <span className="text-lg font-black text-rose-400">
                    Priority {selectedZone.recommended_priority}
                  </span>
                </div>
                <div className="bg-black/50 p-2.5 rounded-xl border border-white/[0.08]">
                  <span className="text-slate-400 block text-[10px]">EXPOSED POP.</span>
                  <span className="text-sm font-bold text-white">
                    {selectedZone.estimated_exposed_population.toLocaleString()}
                  </span>
                </div>
                <div className="bg-black/50 p-2.5 rounded-xl border border-white/[0.08]">
                  <span className="text-slate-400 block text-[10px]">ELEVATION</span>
                  <span className="text-sm font-bold text-slate-200">
                    {selectedZone.baseline_elevation_m} m AMSL
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-300 bg-black/40 p-3 rounded-xl border border-white/[0.08] space-y-1.5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-mono font-bold">
                  CONTRIBUTING FACTORS
                </span>
                <div className="space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Rainfall Impact:</span>
                    <span className="font-mono text-sky-400 font-semibold">{selectedZone.contributing_factors.rainfall_contribution} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Elevation Deficit:</span>
                    <span className="font-mono text-amber-400 font-semibold">{selectedZone.contributing_factors.elevation_contribution} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Historical Vulnerability:</span>
                    <span className="font-mono text-rose-400 font-semibold">{selectedZone.contributing_factors.historical_contribution} pts</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Drainage Inadequacy:</span>
                    <span className="font-mono text-slate-300 font-semibold">{selectedZone.contributing_factors.drainage_contribution} pts</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  onSelectZone(selectedZone);
                  onNavigateTab('routing');
                }}
                className="w-full py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-950/60"
              >
                <span>Navigate Rescue Route to {selectedZone.name}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="p-4.5 rounded-2xl border border-white/[0.08] bg-[#0e121b]/90 space-y-3 shadow-xl backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-white uppercase tracking-wider font-mono flex items-center space-x-1.5">
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
                    className="p-3.5 rounded-xl border border-rose-500/40 bg-gradient-to-r from-rose-950/40 to-slate-900/60 text-xs space-y-1.5 shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-300 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                        <span>Zone {inc.zone_id}: {inc.zone_name}</span>
                      </span>
                      <span className="text-[9px] font-mono font-bold text-rose-300 bg-rose-950/90 px-2 py-0.5 rounded-full border border-rose-700">
                        SOS: {inc.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-200 font-medium">{inc.location}</p>
                    <div className="text-[10px] text-amber-300 flex items-center justify-between">
                      <span>Stranded Citizens: {inc.affected_count}</span>
                      <span className="font-mono text-slate-400">{inc.timestamp}</span>
                    </div>
                  </div>
                ))}

                {/* Simulated Scenario Alerts */}
                {overview.alerts.map((alt) => (
                  <div
                    key={alt.id}
                    className="p-3.5 rounded-xl border border-red-500/20 bg-gradient-to-r from-red-950/25 to-slate-900/50 text-xs space-y-1.5 hover:border-red-500/50 transition cursor-pointer"
                    onClick={() => {
                      const found = zones.find((z) => z.zone_id === alt.zone_id);
                      if (found) handleMapZoneClick(found);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-red-300">
                        Zone {alt.zone_id}: {alt.zone_name}
                      </span>
                      <span className="text-[9px] font-mono text-red-300 bg-red-950 px-2 py-0.5 rounded-full border border-red-700 font-bold">
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
          <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-[#0e121b]/70 space-y-2.5 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Recent System Activity</span>
              </h3>
              <span className="text-[10px] text-emerald-400 font-mono">SQLite Audit</span>
            </div>
            <div className="space-y-1.5 text-xs">
              {overview.recent_activities.slice(0, 4).map((a) => (
                <div key={a.id} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-[11px] space-y-0.5">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] font-mono">
                    <span className="text-emerald-400 font-semibold">{a.action_type}</span>
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
        <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0e121b]/80 space-y-4 shadow-xl backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
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
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center space-x-1 cursor-pointer font-bold"
            >
              <span>Inspect MILP Solver Details</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {allocations.assignments.slice(0, 6).map((asg) => (
              <div
                key={asg.team_id}
                className="p-4 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:border-emerald-500/40 transition duration-200 space-y-2.5 shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{asg.team_name}</span>
                    </span>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 font-bold">
                      {asg.agency}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 flex items-center justify-between py-1 border-t border-white/[0.06]">
                    <span className="text-slate-400">Assigned Zone:</span>
                    <span className="font-semibold text-white">Zone {asg.assigned_zone_id} ({asg.assigned_zone_name})</span>
                  </div>

                  <div className="text-xs text-slate-300 flex items-center justify-between py-1 border-t border-white/[0.06]">
                    <span className="text-slate-400">Vehicle Profile:</span>
                    <span className="font-mono text-cyan-300 text-[11px] font-medium">{asg.vehicle_used}</span>
                  </div>

                  <div className="text-xs text-slate-300 flex items-center justify-between py-1 border-t border-white/[0.06]">
                    <span className="text-slate-400">Estimated Arrival:</span>
                    <span className="font-mono text-amber-400 font-bold">{asg.estimated_arrival_time_min} mins</span>
                  </div>

                  <div className="mt-2.5 p-2 rounded-lg bg-black/50 border border-white/[0.06] text-[10px] text-slate-300 space-y-0.5 font-mono">
                    <div className="text-slate-500 uppercase tracking-wider text-[9px] font-bold">Ration Payload</div>
                    <div>{asg.allocated_supplies.food_packets} Meals · {asg.allocated_supplies.water_litres}L Water · {asg.allocated_supplies.medical_kits} Med</div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const targetZone = zones.find((z) => z.zone_id === asg.assigned_zone_id);
                    if (targetZone) onSelectZone(targetZone);
                    onNavigateTab('routing');
                  }}
                  className="w-full mt-2.5 py-2 bg-white/[0.06] hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center space-x-1.5"
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

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
  Sliders,
  Filter,
  Layers,
  ChevronRight,
  Flame,
  Phone,
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
  const [activeTriageFilter, setActiveTriageFilter] = useState<'ALL' | 'CRITICAL' | 'VERY_HIGH'>('ALL');

  if (!overview) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 font-mono">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          <span>Synchronizing Chennai Emergency Ops Grid...</span>
        </div>
      </div>
    );
  }

  const handleMapZoneClick = (zone: ZoneRiskAssessmentData) => {
    setSelectedZone(zone);
    onSelectZone(zone);
  };

  const filteredZones = zones
    .filter((z) => {
      if (activeTriageFilter === 'CRITICAL') return z.flood_risk_score >= 70;
      if (activeTriageFilter === 'VERY_HIGH') return z.flood_risk_score >= 50;
      return true;
    })
    .sort((a, b) => b.flood_risk_score - a.flood_risk_score);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* 1. Tactical Mission Header HUD */}
      <div className="bg-[#11141d] border border-[#222838] rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Situation Title & Scenario */}
          <div className="flex items-center space-x-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-[#181d2a] border border-[#2d354a] flex items-center justify-center shrink-0 shadow-inner">
              <Activity className="w-6 h-6 text-amber-400" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  {overview.active_severity} FLOOD ADVISORY
                </span>
                <span className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
                  {overview.active_scenario_name}
                </span>
                <span className="text-[10px] font-mono text-slate-400 bg-[#181d2a] px-2 py-0.5 rounded-md border border-[#262e42] hidden sm:inline">
                  GCC OPS ROOM
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                Real-time topological flood routing, multi-criteria risk scoring, and OR-Tools MILP resource dispatch
              </p>
            </div>
          </div>

          {/* Quick Scenario & SOS Actions */}
          <div className="flex items-center space-x-2.5 shrink-0 self-end lg:self-auto">
            {onOpenSOS && (
              <button
                onClick={onOpenSOS}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-950/50 transition flex items-center space-x-2 cursor-pointer active:scale-95"
              >
                <LifeBuoy className="w-3.5 h-3.5" />
                <span>Log Citizen SOS</span>
              </button>
            )}
            <button
              onClick={() => onNavigateTab('simulator')}
              className="px-3.5 py-2 bg-[#181d2a] hover:bg-[#202738] text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-[#2d354a] transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              <span>Simulate Deluge</span>
            </button>
          </div>
        </div>

        {/* 4 Core Vital Metric Gauges */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[#1e2333]">
          <div className="p-3 rounded-xl bg-[#0d1017] border border-[#1e2434] flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Exposed Citizens</span>
              <span className="text-lg font-bold text-white font-mono leading-none">
                {overview.metrics[2]?.value || '2,189,418'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0d1017] border border-[#1e2434] flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Rescue Units</span>
              <span className="text-lg font-bold text-emerald-400 font-mono leading-none">
                {overview.metrics[3]?.value || '12 / 12 Assigned'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0d1017] border border-[#1e2434] flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Navigation className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Severed Bridges</span>
              <span className="text-lg font-bold text-amber-400 font-mono leading-none">
                {overview.metrics[4]?.value || '1 Corridor'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0d1017] border border-[#1e2434] flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Hospitals Open</span>
              <span className="text-lg font-bold text-white font-mono leading-none">
                {overview.metrics[5]?.value || '8 / 8 Active'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Mission Operations Console (3-Column Layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (4 cols): GCC Zone Triage & Incident Feed */}
        <div className="lg:col-span-4 space-y-4">
          {/* Triage Leaderboard */}
          <div className="bg-[#11141d] border border-[#222838] rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Zone Inundation Triage
                </h3>
              </div>
              <div className="flex items-center space-x-1 bg-[#181d2a] p-0.5 rounded-lg border border-[#283144] text-[10px] font-mono">
                <button
                  onClick={() => setActiveTriageFilter('ALL')}
                  className={`px-2 py-0.5 rounded transition ${activeTriageFilter === 'ALL' ? 'bg-[#283144] text-white font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  All (15)
                </button>
                <button
                  onClick={() => setActiveTriageFilter('CRITICAL')}
                  className={`px-2 py-0.5 rounded transition ${activeTriageFilter === 'CRITICAL' ? 'bg-red-500/20 text-red-400 font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Crit
                </button>
              </div>
            </div>

            {/* Scrollable Zone Cards */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {filteredZones.slice(0, 8).map((z) => {
                const isSelected = selectedZone?.zone_id === z.zone_id;
                const isHighRisk = z.flood_risk_score >= 60;

                return (
                  <div
                    key={z.zone_id}
                    onClick={() => handleMapZoneClick(z)}
                    className={`p-3 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#181d2a] border-cyan-500/60 shadow-md ring-1 ring-cyan-500/20'
                        : isHighRisk
                        ? 'bg-[#151722] border-amber-500/25 hover:border-amber-500/50'
                        : 'bg-[#0d1017] border-[#1e2434] hover:border-[#2d354a]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="text-[10px] font-mono font-bold text-slate-400 bg-[#1e2434] px-1.5 py-0.5 rounded">
                          Z{z.zone_id}
                        </span>
                        <span className="text-xs font-bold text-white truncate">{z.name}</span>
                      </div>
                      <span
                        className={`text-xs font-mono font-bold ${
                          z.flood_risk_score >= 70
                            ? 'text-red-400'
                            : z.flood_risk_score >= 55
                            ? 'text-amber-400'
                            : 'text-slate-300'
                        }`}
                      >
                        {z.flood_risk_score} <span className="text-[10px] text-slate-500 font-normal">/ 100</span>
                      </span>
                    </div>

                    {/* Progress score bar */}
                    <div className="w-full h-1.5 bg-[#1e2434] rounded-full overflow-hidden mt-2">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          z.flood_risk_score >= 70
                            ? 'bg-red-500'
                            : z.flood_risk_score >= 55
                            ? 'bg-amber-400'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${z.flood_risk_score}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1.5 font-mono">
                      <span>Pop: {z.estimated_exposed_population.toLocaleString()}</span>
                      <span>Elev: {z.baseline_elevation_m}m AMSL</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Citizen SOS & Active Incident Queue */}
          <div className="bg-[#11141d] border border-[#222838] rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <LifeBuoy className="w-4 h-4 text-red-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Live Distress Calls ({reportedIncidents.length + overview.alerts.length})
                </h3>
              </div>
              <span className="text-[10px] font-mono text-red-400 bg-red-950/60 px-2 py-0.5 rounded-full border border-red-800 font-bold">
                TNFRS LIVE
              </span>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {reportedIncidents.map((inc) => (
                <div
                  key={inc.id}
                  className="p-2.5 rounded-xl bg-red-950/20 border border-red-500/30 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-red-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      <span>{inc.zone_name}</span>
                    </span>
                    <span className="text-[9px] font-mono text-red-400 font-bold">
                      {inc.affected_count} Stranded
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-medium truncate">{inc.location}</p>
                </div>
              ))}

              {overview.alerts.map((alt) => (
                <div
                  key={alt.id}
                  onClick={() => {
                    const found = zones.find((z) => z.zone_id === alt.zone_id);
                    if (found) handleMapZoneClick(found);
                  }}
                  className="p-2.5 rounded-xl bg-[#151722] border border-[#262e42] hover:border-[#384360] transition cursor-pointer text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{alt.zone_name}</span>
                    <span className="text-[9px] font-mono text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800">
                      {alt.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-1">{alt.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center & Right Area (8 cols): Hero Map & Deployed Assets */}
        <div className="lg:col-span-8 space-y-5">
          {/* Hero GIS Tactical Map */}
          <div className="bg-[#11141d] border border-[#222838] rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Chennai Arterial Network & Zone Overlay (EPSG:4326)
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('geospatial')}
                className="text-xs text-slate-300 hover:text-white flex items-center space-x-1 cursor-pointer font-medium"
              >
                <span>Expanded GIS Layers</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </button>
            </div>

            <ChennaiMap
              zones={zones}
              roadNetwork={roadNetwork || undefined}
              facilities={facilities || undefined}
              selectedZoneId={selectedZone?.zone_id}
              onSelectZone={handleMapZoneClick}
              height="510px"
            />
          </div>

          {/* Tactical Rescue Deployments (OR-Tools CBC MILP Output) */}
          {allocations && (
            <div className="bg-[#11141d] border border-[#222838] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Field Rescue Deployments ({allocations.total_assigned_teams} Active Units)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      OR-Tools CBC solver assignments satisfying one-trip capacity & zone access
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onNavigateTab('optimisation')}
                  className="text-xs text-slate-300 hover:text-white flex items-center space-x-1 cursor-pointer font-semibold"
                >
                  <span>Solver Formulations</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {allocations.assignments.slice(0, 6).map((asg) => (
                  <div
                    key={asg.team_id}
                    className="p-3.5 rounded-xl bg-[#0d1017] border border-[#1e2434] hover:border-[#2f3952] transition space-y-2.5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>{asg.team_name}</span>
                        </span>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-[#181d2a] text-slate-300 border border-[#262e42] font-semibold">
                          {asg.agency}
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 flex items-center justify-between py-1 border-t border-[#1a1f2c]">
                        <span className="text-slate-400 text-[11px]">Destination:</span>
                        <span className="font-semibold text-white truncate max-w-[140px]">
                          Zone {asg.assigned_zone_id} ({asg.assigned_zone_name})
                        </span>
                      </div>

                      <div className="text-xs text-slate-300 flex items-center justify-between py-1 border-t border-[#1a1f2c]">
                        <span className="text-slate-400 text-[11px]">Vehicle:</span>
                        <span className="font-mono text-cyan-400 text-[11px]">{asg.vehicle_used}</span>
                      </div>

                      <div className="text-xs text-slate-300 flex items-center justify-between py-1 border-t border-[#1a1f2c]">
                        <span className="text-slate-400 text-[11px]">Estimated Transit:</span>
                        <span className="font-mono text-amber-400 font-bold">{asg.estimated_arrival_time_min} mins</span>
                      </div>

                      <div className="mt-2 p-2 rounded-lg bg-[#141824] border border-[#202738] text-[10px] text-slate-400 font-mono">
                        <div>{asg.allocated_supplies.food_packets} Meals · {asg.allocated_supplies.water_litres}L Water · {asg.allocated_supplies.medical_kits} Med</div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const targetZone = zones.find((z) => z.zone_id === asg.assigned_zone_id);
                        if (targetZone) onSelectZone(targetZone);
                        onNavigateTab('routing');
                      }}
                      className="w-full mt-2 py-1.5 bg-[#181d2a] hover:bg-[#22293b] text-slate-200 hover:text-white border border-[#2a3348] rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center space-x-1"
                    >
                      <Navigation className="w-3 h-3" />
                      <span>Inspect Route</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

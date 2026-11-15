import React, { useState } from 'react';
import {
  AlertTriangle,
  Users,
  ShieldCheck,
  Building2,
  Navigation,
  ArrowRight,
  TrendingUp,
  MapPin,
  Clock,
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
import { NavTab } from '../components/Sidebar';

interface Props {
  overview: CommandCenterOverviewData | null;
  zones: ZoneRiskAssessmentData[];
  roadNetwork: RoadNetworkData | null;
  facilities: FacilitiesData | null;
  allocations: OptimisationResultData | null;
  onNavigateTab: (tab: NavTab) => void;
  onOpenSOS?: () => void;
  onSelectZone: (zone: ZoneRiskAssessmentData) => void;
  reportedIncidents?: any[];
}

export const CommandCentrePage: React.FC<Props> = ({
  overview,
  zones,
  roadNetwork,
  facilities,
  allocations,
  onNavigateTab,
  onOpenSOS,
  onSelectZone,
  reportedIncidents = [],
}) => {
  const [selectedZone, setSelectedZone] = useState<ZoneRiskAssessmentData | null>(null);
  const [activeTriageFilter, setActiveTriageFilter] = useState<'ALL' | 'CRITICAL' | 'VERY_HIGH'>('ALL');

  if (!overview) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 font-mono">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
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

  const exposedVal = overview.metrics.find((m) => m.label.toLowerCase().includes('exposed'))?.value ?? '2,189,418';
  const rescueVal = overview.metrics.find((m) => m.label.toLowerCase().includes('rescue'))?.value ?? '12 / 12 Assigned';
  const hospitalVal = overview.metrics.find((m) => m.label.toLowerCase().includes('hospital'))?.value ?? `${facilities?.operational_hospitals ?? 8} / ${facilities?.total_hospitals ?? 8} Operational`;

  const liveAlerts = [
    ...reportedIncidents.map((inc) => ({
      id: inc.id,
      location_name: `${inc.location} (Zone ${inc.zone_id})`,
      severity: inc.severity,
      situation_details: inc.notes || `${inc.category}: ${inc.affected_count} citizens requiring assistance`,
    })),
    ...(overview.alerts || []).map((a) => ({
      id: a.id,
      location_name: `${a.zone_name} (Zone ${a.zone_id})`,
      severity: a.severity,
      situation_details: a.message,
    })),
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* 1. GovTech Mission Header HUD */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Situation Title & Scenario */}
          <div className="flex items-center space-x-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 shadow-sm text-amber-400">
              <Activity className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  {overview.active_severity} FLOOD ADVISORY
                </span>
                <span className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                  {overview.active_scenario_name}
                </span>
                <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 hidden sm:inline">
                  GCC OPS ROOM
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                Real-time topological flood routing, multi-criteria risk scoring, and OR-Tools MILP resource dispatch
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center space-x-2 shrink-0">
            {onOpenSOS && (
              <button
                onClick={onOpenSOS}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm hover:shadow transition cursor-pointer"
              >
                <Flame className="w-4 h-4 text-white" />
                <span>Log Citizen SOS</span>
              </button>
            )}
            <button
              onClick={() => onNavigateTab('simulator')}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-medium transition cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-slate-500" />
              <span>Simulate Deluge</span>
            </button>
          </div>
        </div>

        {/* 4 Core Operational Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-5 pt-4 border-t border-slate-100">
          {/* 1. Exposed Citizens */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-mono">
              <span className="uppercase font-semibold">Exposed Citizens</span>
              <Users className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 mt-1">
              {typeof exposedVal === 'number' ? exposedVal.toLocaleString() : exposedVal}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Estimated residents in flood path</div>
          </div>

          {/* 2. Rescue Units Deployed */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-mono">
              <span className="uppercase font-semibold">Rescue Units</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-emerald-700 mt-1">
              {rescueVal}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">NDRF, TNFRS & Coast Guard units</div>
          </div>

          {/* 3. Severed Corridors */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-mono">
              <span className="uppercase font-semibold">Severed Bridges</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-amber-700 mt-1">
              {overview.total_blocked_roads || 1} Critical Corridors
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">MIOT Adyar River causeway submerged</div>
          </div>

          {/* 4. Hospitals Operational */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-mono">
              <span className="uppercase font-semibold">Hospitals Open</span>
              <Building2 className="w-3.5 h-3.5 text-teal-600" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 mt-1">
              {hospitalVal}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Trauma centres with power backup</div>
          </div>
        </div>
      </div>

      {/* 2. Main EOC Operations Grid: 3 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (4 cols): GCC Zone Inundation Triage & Citizen Distress Feed */}
        <div className="lg:col-span-4 space-y-4">
          {/* Zone Triage Leaderboard */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider">
                  Zone Inundation Triage
                </h3>
              </div>
              <div className="flex items-center space-x-1 text-[10px] font-mono">
                <button
                  onClick={() => setActiveTriageFilter('ALL')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    activeTriageFilter === 'ALL'
                      ? 'bg-slate-900 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  All ({zones.length})
                </button>
                <button
                  onClick={() => setActiveTriageFilter('CRITICAL')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    activeTriageFilter === 'CRITICAL'
                      ? 'bg-red-600 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Crit
                </button>
              </div>
            </div>

            {/* Scrollable Zone Triage Cards */}
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {filteredZones.map((z) => {
                const isSelected = selectedZone?.zone_id === z.zone_id;
                const riskColor =
                  z.flood_risk_score >= 70
                    ? 'text-red-700 bg-red-50 border-red-200'
                    : z.flood_risk_score >= 50
                    ? 'text-amber-700 bg-amber-50 border-amber-200'
                    : 'text-emerald-700 bg-emerald-50 border-emerald-200';

                const barColor =
                  z.flood_risk_score >= 70
                    ? 'bg-red-500'
                    : z.flood_risk_score >= 50
                    ? 'bg-amber-500'
                    : 'bg-emerald-500';

                return (
                  <div
                    key={z.zone_id}
                    onClick={() => handleMapZoneClick(z)}
                    className={`p-2.5 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-slate-100 border-slate-400 shadow-xs'
                        : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100/90'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700 font-bold shrink-0">
                          Z{z.zone_id}
                        </span>
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {z.name}
                        </span>
                      </div>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${riskColor}`}>
                        {z.flood_risk_score.toFixed(1)} / 100
                      </span>
                    </div>

                    {/* Progress score bar */}
                    <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden mb-1.5">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${Math.min(100, z.flood_risk_score)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>Pop: {z.population.toLocaleString()}</span>
                      <span>Elev: {z.baseline_elevation_m}m AMSL</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Distress Calls Feed (WeCare Community Reporting Integration) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Phone className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                <h4 className="text-xs font-bold text-slate-900 uppercase font-mono tracking-wider">
                  Live Distress Calls ({liveAlerts.length})
                </h4>
              </div>
              <span className="text-[9px] font-mono text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded font-bold">
                TNFRS LIVE
              </span>
            </div>

            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {liveAlerts.map((sos: any) => (
                <div
                  key={sos.id}
                  className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{sos.location_name}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                      {sos.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 line-clamp-1">{sos.situation_details}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center & Right Section (8 cols): Hero GIS Tactical Map & Live Allocations */}
        <div className="lg:col-span-8 space-y-4">
          {/* Tactical Hero Map Canvas */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xs font-bold text-slate-900 font-mono uppercase tracking-wider">
                  Chennai Arterial Network & Zone Overlay (EPSG:4326)
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('geospatial')}
                className="text-[11px] font-mono text-slate-600 hover:text-slate-900 flex items-center space-x-1 cursor-pointer font-semibold"
              >
                <span>Expanded GIS Layers</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
              <ChennaiMap
                zones={zones}
                roadNetwork={roadNetwork || undefined}
                facilities={facilities || undefined}
                selectedZoneId={selectedZone?.zone_id || null}
                onSelectZone={handleMapZoneClick}
                height="510px"
              />
            </div>
          </div>

          {/* Active Field Deployments List */}
          {allocations && allocations.assignments.length > 0 && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Field Rescue Deployments ({allocations.total_assigned_teams} Active Units)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      OR-Tools CBC solver assignments satisfying one-trip capacity & zone access
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => onNavigateTab('optimisation')}
                  className="text-xs text-slate-600 hover:text-slate-900 flex items-center space-x-1 cursor-pointer font-semibold"
                >
                  <span>Solver Formulations</span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {allocations.assignments.slice(0, 6).map((asg) => (
                  <div
                    key={asg.team_id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 hover:border-slate-300 transition space-y-2.5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          <span>{asg.team_name}</span>
                        </span>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200 font-semibold shadow-2xs">
                          {asg.agency}
                        </span>
                      </div>

                      <div className="text-xs text-slate-700 flex items-center justify-between py-1 border-t border-slate-200/60">
                        <span className="text-slate-500 text-[11px]">Destination:</span>
                        <span className="font-semibold text-slate-900 truncate max-w-[140px]">
                          Zone {asg.assigned_zone_id} ({asg.assigned_zone_name})
                        </span>
                      </div>

                      <div className="text-xs text-slate-700 flex items-center justify-between py-1 border-t border-slate-200/60">
                        <span className="text-slate-500 text-[11px]">Vehicle:</span>
                        <span className="font-mono text-indigo-700 text-[11px] font-semibold">{asg.vehicle_used}</span>
                      </div>

                      <div className="text-xs text-slate-700 flex items-center justify-between py-1 border-t border-slate-200/60">
                        <span className="text-slate-500 text-[11px]">Estimated Transit:</span>
                        <span className="font-mono text-amber-700 font-bold">{asg.estimated_arrival_time_min} mins</span>
                      </div>

                      <div className="mt-2 p-2 rounded-lg bg-white border border-slate-200 text-[10px] text-slate-600 font-mono shadow-2xs">
                        <div>{asg.allocated_supplies.food_packets} Meals · {asg.allocated_supplies.water_litres}L Water · {asg.allocated_supplies.medical_kits} Med</div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const targetZone = zones.find((z) => z.zone_id === asg.assigned_zone_id);
                        if (targetZone) onSelectZone(targetZone);
                        onNavigateTab('routing');
                      }}
                      className="w-full mt-2 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center space-x-1 shadow-2xs"
                    >
                      <Navigation className="w-3 h-3 text-slate-600" />
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

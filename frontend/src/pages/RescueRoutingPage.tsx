import React, { useState } from 'react';
import {
  Route as RouteIcon,
  Navigation,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Compass,
  CornerDownRight,
  Shield,
  Layers,
} from 'lucide-react';
import { RoadNetworkData, RouteResponseData, RouteDetailData } from '../types';
import { ChennaiMap } from '../components/ChennaiMap';
import { ProvenanceBadge } from '../components/ProvenanceBadge';
import { api } from '../services/api';

interface Props {
  roadNetwork: RoadNetworkData | null;
  activeBlockedEdges: string[];
}

export const RescueRoutingPage: React.FC<Props> = ({ roadNetwork, activeBlockedEdges }) => {
  const [originNode, setOriginNode] = useState<string>('N01'); // Chennai Central / Park Town
  const [destNode, setDestNode] = useState<string>('N16'); // Guindy / Kathipara
  const [vehicleType, setVehicleType] = useState<string>('NORMAL_RESCUE');
  const [isSimulatingBlockage, setIsSimulatingBlockage] = useState<boolean>(true);
  const [blockedOverride, setBlockedOverride] = useState<string[]>(activeBlockedEdges);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [routeResult, setRouteResult] = useState<RouteResponseData | null>(null);

  const handleCalculateRoute = async () => {
    setIsCalculating(true);
    try {
      const res = await api.computeRoute({
        origin_node_id: originNode,
        destination_node_id: destNode,
        vehicle_type: vehicleType,
        avoid_blocked_edges: true,
        blocked_edges_override: isSimulatingBlockage ? blockedOverride : [],
      });
      setRouteResult(res);
    } catch (err) {
      alert(`Routing calculation error: ${err}`);
    } finally {
      setIsCalculating(false);
    }
  };

  const toggleBlockedEdge = (edgeId: string) => {
    if (blockedOverride.includes(edgeId)) {
      setBlockedOverride(blockedOverride.filter((id) => id !== edgeId));
    } else {
      setBlockedOverride([...blockedOverride, edgeId]);
    }
  };

  const activeRouteDetail: RouteDetailData | null = routeResult ? routeResult.primary_route : null;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <RouteIcon className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-900">
              Flood-Aware Rescue Routing Engine — Dynamic Graph Analysis
            </h2>
            <ProvenanceBadge provenance="MODEL_ESTIMATE" size="sm" />
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Solves multi-criteria path traversal over Chennai road network graph.
            Dynamically recalculates alternate detour routes when arterial river bridges and marsh causeways are submerged.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Control Panel */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center space-x-1.5">
              <Navigation className="w-4 h-4 text-indigo-600" />
              <span>Route Parameters</span>
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">NetworkX Dijkstra</span>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Origin Node */}
            <div>
              <label className="text-slate-700 font-semibold block mb-1">
                Staging Origin (Rescue Depot / Base):
              </label>
              <select
                value={originNode}
                onChange={(e) => setOriginNode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 p-2 rounded-xl font-mono focus:border-slate-800"
              >
                {(roadNetwork?.nodes || []).map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.id}: {n.name} (Zone {n.zone_id})
                  </option>
                ))}
              </select>
            </div>

            {/* Destination Node */}
            <div>
              <label className="text-slate-700 font-semibold block mb-1">
                Target Destination (Affected Zone):
              </label>
              <select
                value={destNode}
                onChange={(e) => setDestNode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 p-2 rounded-xl font-mono focus:border-slate-800"
              >
                {(roadNetwork?.nodes || []).map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.id}: {n.name} (Zone {n.zone_id})
                  </option>
                ))}
              </select>
            </div>

            {/* Vehicle Mode */}
            <div>
              <label className="text-slate-700 font-semibold block mb-1">
                Vehicle Deployment Capability:
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 p-2 rounded-xl font-mono focus:border-slate-800"
              >
                <option value="NORMAL_RESCUE">Normal Rescue Vehicle (Cannot traverse flooded roads)</option>
                <option value="AMBULANCE_STANDARD">Standard Ambulance (0.20m wading limit, avoids underpasses)</option>
                <option value="RESCUE_4WD">4WD High-Clearance Rescue (0.45m wading limit)</option>
                <option value="HEAVY_CLEARANCE">Heavy Tactical Truck (0.90m wading limit)</option>
                <option value="AMPHIBIOUS_CRAFT">Amphibious All-Terrain Vehicle (Land & Water capability)</option>
              </select>
            </div>

            {/* Dynamic Road Blockage Simulation Toggles */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Submerged Corridors</span>
                </span>
                <span className="text-[10px] text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md font-mono font-bold">
                  {blockedOverride.length} Active Blockages
                </span>
              </div>

              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {(roadNetwork?.edges || [])
                  .filter((e) => e.flood_susceptibility >= 0.7)
                  .map((e) => {
                    const isBlocked = blockedOverride.includes(e.id);
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => toggleBlockedEdge(e.id)}
                        className={`w-full text-left p-2 rounded-xl text-[11px] font-mono border transition flex items-center justify-between cursor-pointer ${
                          isBlocked
                            ? 'bg-red-50 border-red-200 text-red-800'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <div className="truncate mr-2">
                          <b className="text-slate-900">{e.id}:</b> {e.name}
                        </div>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            isBlocked ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isBlocked ? 'Blocked' : 'Clear'}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>

            <button
              onClick={handleCalculateRoute}
              disabled={isCalculating}
              className="w-full mt-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-sm"
            >
              <span>{isCalculating ? 'Computing Optimal Graph Paths...' : 'Calculate Rescue Route'}</span>
            </button>
          </div>
        </div>

        {/* Map Visualizer (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                Live Topological Route Plot
              </h3>
              {activeRouteDetail && (
                <span className="text-xs font-mono text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  {activeRouteDetail.total_distance_km} km | ~{activeRouteDetail.estimated_travel_time_min} mins
                </span>
              )}
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
              <ChennaiMap
                roadNetwork={roadNetwork || undefined}
                activeRoute={activeRouteDetail}
                height="450px"
              />
            </div>
          </div>

          {/* Route Metrics / Unreachable Warning */}
          {routeResult && (
            <div className="space-y-3">
              {routeResult.primary_route.is_feasible ? (
                <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <h4 className="text-sm font-bold text-slate-900">
                        Feasible Route Selected — {routeResult.primary_route.selection_rationale}
                      </h4>
                    </div>
                    <span className="text-xs font-mono text-emerald-800 font-bold">
                      {routeResult.primary_route.total_distance_km} km / {routeResult.primary_route.estimated_travel_time_min} min
                    </span>
                  </div>

                  <p className="text-xs text-slate-700">
                    Traverses {routeResult.primary_route.nodes.length} intersections. Avoided {routeResult.primary_route.blocked_segments_encountered.length} submerged road bottlenecks.
                  </p>

                  {/* Alternative Paths Preview */}
                  {routeResult.alternatives.length > 0 && (
                    <div className="pt-2 border-t border-emerald-200/60 text-xs space-y-1">
                      <span className="text-[10px] text-slate-600 font-mono uppercase font-bold">
                        Available Detour Alternatives:
                      </span>
                      {routeResult.alternatives.map((alt) => (
                        <div key={alt.rank} className="flex justify-between text-slate-800 text-[11px] font-mono">
                          <span>{alt.route_name}:</span>
                          <span className="text-amber-800 font-semibold">
                            {alt.total_distance_km} km ({alt.estimated_travel_time_min} min)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-red-200 bg-red-50 shadow-xs space-y-2 text-red-900">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 animate-pulse" />
                    <h4 className="text-sm font-bold text-slate-900">
                      DESTINATION CURRENTLY UNREACHABLE
                    </h4>
                  </div>
                  <p className="text-xs text-red-800">{routeResult.unreachable_reason}</p>
                  <p className="text-[11px] text-amber-800 font-mono">
                    Recommendation: Deploy amphibious air-wing boat or dispatch heavy transport from alternate forward depot.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

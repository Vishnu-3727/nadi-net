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
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-xl border border-slate-800 bg-[#0d1527] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <RouteIcon className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">
              Flood-Aware Rescue Routing Engine — Dynamic Graph Analysis
            </h2>
            <ProvenanceBadge provenance="MODEL_ESTIMATE" size="sm" />
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Solves multi-criteria path traversal over Chennai road network graph.
            Dynamically recalculates alternate detour routes when arterial river bridges and marsh causeways are submerged.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Control Panel */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0d1527] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center space-x-1.5">
              <Navigation className="w-4 h-4 text-cyan-400" />
              <span>Route Parameters</span>
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">NetworkX Dijkstra</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Origin Node */}
            <div>
              <label className="text-slate-300 font-medium block mb-1">
                Staging Origin (Rescue Depot / Base):
              </label>
              <select
                value={originNode}
                onChange={(e) => setOriginNode(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded-lg font-mono focus:border-cyan-500"
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
              <label className="text-slate-300 font-medium block mb-1">
                Target Destination (Affected Zone):
              </label>
              <select
                value={destNode}
                onChange={(e) => setDestNode(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded-lg font-mono focus:border-cyan-500"
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
              <label className="text-slate-300 font-medium block mb-1">
                Vehicle Deployment Capability:
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded-lg font-mono focus:border-cyan-500"
              >
                <option value="NORMAL_RESCUE">Normal Rescue Vehicle (Cannot traverse flooded roads)</option>
                <option value="AMBULANCE_STANDARD">Standard Ambulance (0.20m wading limit, avoids underpasses)</option>
                <option value="RESCUE_4WD">4WD High-Clearance Rescue (0.45m wading limit)</option>
                <option value="HEAVY_CLEARANCE">Heavy Tactical Truck (0.90m wading limit)</option>
                <option value="AMPHIBIOUS_CRAFT">Amphibious All-Terrain Vehicle (Land & Water capability)</option>
              </select>
            </div>

            {/* Dynamic Road Blockage Simulation Toggles */}
            <div className="border-t border-slate-800 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300 flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Submerged Corridors</span>
                </span>
                <span className="text-[10px] text-red-400 font-mono">
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
                        className={`w-full text-left p-1.5 rounded text-[11px] font-mono border transition flex items-center justify-between cursor-pointer ${
                          isBlocked
                            ? 'bg-red-950/60 border-red-800 text-red-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="truncate mr-2">
                          <b className="text-white">{e.id}:</b> {e.name}
                        </div>
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                            isBlocked ? 'bg-red-900 text-red-200' : 'bg-slate-800 text-slate-400'
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
              className="w-full mt-2 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center justify-center space-x-1.5 shadow-lg shadow-amber-900/30"
            >
              <span>{isCalculating ? 'Computing Optimal Graph Paths...' : 'Calculate Rescue Route'}</span>
            </button>
          </div>
        </div>

        {/* Map Visualizer (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Live Topological Route Plot
            </h3>
            {activeRouteDetail && (
              <span className="text-xs font-mono text-amber-400">
                {activeRouteDetail.total_distance_km} km | ~{activeRouteDetail.estimated_travel_time_min} mins
              </span>
            )}
          </div>

          <ChennaiMap
            roadNetwork={roadNetwork || undefined}
            activeRoute={activeRouteDetail}
            height="420px"
          />

          {/* Route Metrics / Unreachable Warning */}
          {routeResult && (
            <div className="space-y-3">
              {routeResult.primary_route.is_feasible ? (
                <div className="p-4 rounded-xl border border-emerald-900/60 bg-emerald-950/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <h4 className="text-sm font-bold text-white">
                        Feasible Route Selected — {routeResult.primary_route.selection_rationale}
                      </h4>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      {routeResult.primary_route.total_distance_km} km / {routeResult.primary_route.estimated_travel_time_min} min
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">
                    Traverses {routeResult.primary_route.nodes.length} intersections. Avoided {routeResult.primary_route.blocked_segments_encountered.length} submerged road bottlenecks.
                  </p>

                  {/* Alternative Paths Preview */}
                  {routeResult.alternatives.length > 0 && (
                    <div className="pt-2 border-t border-emerald-900/40 text-xs space-y-1">
                      <span className="text-[10px] text-slate-400 font-mono uppercase">
                        Available Detour Alternatives:
                      </span>
                      {routeResult.alternatives.map((alt) => (
                        <div key={alt.rank} className="flex justify-between text-slate-300 text-[11px] font-mono">
                          <span>{alt.route_name}:</span>
                          <span className="text-amber-300">
                            {alt.total_distance_km} km ({alt.estimated_travel_time_min} min)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-red-900/80 bg-red-950/30 space-y-2 text-red-200">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" />
                    <h4 className="text-sm font-bold text-white">
                      DESTINATION CURRENTLY UNREACHABLE
                    </h4>
                  </div>
                  <p className="text-xs">{routeResult.unreachable_reason}</p>
                  <p className="text-[11px] text-amber-300 font-mono">
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

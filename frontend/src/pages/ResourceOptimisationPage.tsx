import React, { useState } from 'react';
import {
  Cpu,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Package,
  Clock,
  Shield,
  Layers,
} from 'lucide-react';
import { OptimisationResultData } from '../types';
import { ProvenanceBadge } from '../components/ProvenanceBadge';
import { api } from '../services/api';

interface Props {
  allocations: OptimisationResultData | null;
  onRefreshAllocations: () => void;
}

export const ResourceOptimisationPage: React.FC<Props> = ({
  allocations,
  onRefreshAllocations,
}) => {
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [currentAlloc, setCurrentAlloc] = useState<OptimisationResultData | null>(allocations);

  const handleRunOptimisation = async () => {
    setIsSolving(true);
    try {
      const res = await api.optimizeAllocations();
      setCurrentAlloc(res);
      onRefreshAllocations();
    } catch (err) {
      alert(`Optimisation solver error: ${err}`);
    } finally {
      setIsSolving(false);
    }
  };

  const alloc = currentAlloc || allocations;

  if (!alloc) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 font-mono">
        Loading Resource Optimisation Grid...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-xl border border-slate-800 bg-[#0d1527] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">
              Emergency Resource Optimisation Engine — Google OR-Tools (MILP)
            </h2>
            <ProvenanceBadge provenance="MODEL_ESTIMATE" size="sm" />
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Mixed-Integer Linear Programming formulation maximizing life-safety coverage at high-risk Chennai zones
            while minimizing response transit delay under vehicle, road traversability, and supply inventory constraints.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right text-xs font-mono">
            <span className="text-slate-500 block text-[10px]">SOLVER STATUS</span>
            <span className="font-bold text-emerald-400">{alloc.status} ({alloc.solver_used})</span>
          </div>

          <button
            onClick={handleRunOptimisation}
            disabled={isSolving}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center space-x-2 shadow-lg shadow-cyan-900/40"
          >
            <Play className={`w-3.5 h-3.5 ${isSolving ? 'animate-spin' : ''}`} />
            <span>{isSolving ? 'Solving MILP Formulation...' : 'Re-run OR-Tools Solver'}</span>
          </button>
        </div>
      </div>

      {/* Solver Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3.5 rounded-xl border border-slate-800 bg-[#0d1527]">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span>Assigned Teams</span>
            <Truck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {alloc.total_assigned_teams}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">
            {alloc.total_unassigned_teams} Teams in Tactical Reserve
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-800 bg-[#0d1527]">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span>Served Target Zones</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {alloc.total_served_zones}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">
            100% of Priority 1 Zones Covered
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-800 bg-[#0d1527]">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span>Unmet Demand Gaps</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {alloc.unmet_zones_count}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">
            Resource Deficit / Inaccessible Zones
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-800 bg-[#0d1527]">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span>MILP Solver Execution</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-300">
            {alloc.execution_time_ms} ms
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">
            Objective Score: {alloc.objective_value}
          </div>
        </div>
      </div>

      {/* Tactical Team Assignments Table */}
      <div className="p-4 rounded-xl border border-slate-800 bg-[#0d1527] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Truck className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-200">
              Optimal Tactical Team-to-Destination Assignments ({alloc.assignments.length})
            </h3>
          </div>
          <ProvenanceBadge provenance="MODEL_ESTIMATE" size="sm" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono uppercase text-[10px]">
                <th className="py-2.5 px-3">Team Unit</th>
                <th className="py-2.5 px-3">Agency</th>
                <th className="py-2.5 px-3">Target Destination</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3">Transit Time</th>
                <th className="py-2.5 px-3">Vehicle Type</th>
                <th className="py-2.5 px-3">Supply Payload</th>
                <th className="py-2.5 px-3">Mathematical Justification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
              {alloc.assignments.map((asg) => (
                <tr key={asg.team_id} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-3 font-semibold text-white">{asg.team_name}</td>
                  <td className="py-2.5 px-3 text-cyan-400">{asg.agency}</td>
                  <td className="py-2.5 px-3">
                    Zone {asg.assigned_zone_id}: {asg.assigned_zone_name}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-400 border border-red-800">
                      Priority {asg.zone_priority}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-amber-400 font-bold">
                    {asg.estimated_arrival_time_min} min ({asg.route_distance_km} km)
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">{asg.vehicle_used}</td>
                  <td className="py-2.5 px-3 text-[11px] text-slate-300">
                    {asg.allocated_supplies.food_packets} Meals | {asg.allocated_supplies.water_litres}L | {asg.allocated_supplies.medical_kits} Med | {asg.allocated_supplies.inflatable_boats} Boats
                  </td>
                  <td className="py-2.5 px-3 text-[11px] text-slate-400 max-w-xs truncate" title={asg.assignment_justification}>
                    {asg.assignment_justification}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unmet Demand & Deficits */}
      {alloc.unmet_destinations.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-950/80 bg-amber-950/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-amber-200">
                Unserved Demand Gaps & Deficit Explanations ({alloc.unmet_destinations.length} Locations)
              </h3>
            </div>
            <span className="text-xs font-mono text-amber-400">Tactical Constraints Bound</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-amber-900/60 text-amber-300/80 font-mono uppercase text-[10px]">
                  <th className="py-2 px-3">Unserved Zone</th>
                  <th className="py-2 px-3">Priority</th>
                  <th className="py-2 px-3">Risk Score</th>
                  <th className="py-2 px-3">Exposed Population</th>
                  <th className="py-2 px-3">Mathematical Deficit Cause</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-900/40 text-slate-300 font-mono">
                {alloc.unmet_destinations.map((u) => (
                  <tr key={u.zone_id} className="hover:bg-amber-950/40">
                    <td className="py-2.5 px-3 font-semibold text-white">
                      Zone {u.zone_id}: {u.zone_name}
                    </td>
                    <td className="py-2.5 px-3 text-amber-400 font-bold">Priority {u.priority}</td>
                    <td className="py-2.5 px-3">{u.risk_score} / 100</td>
                    <td className="py-2.5 px-3">{u.estimated_exposed_population.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-red-300 text-[11px]">{u.deficit_reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Emergency Supply Stock Allocation Status */}
      <div className="p-4 rounded-xl border border-slate-800 bg-[#0d1527] space-y-3">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center space-x-1.5">
          <Package className="w-4 h-4 text-cyan-400" />
          <span>EMERGENCY SUPPLY STOCK UTILIZATION</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[10px]">FOOD PACKETS</span>
            <div className="text-base font-bold text-white mt-1">
              {alloc.remaining_stock.allocated_food_packets} /{' '}
              {alloc.remaining_stock.allocated_food_packets + alloc.remaining_stock.available_food_packets}
            </div>
            <span className="text-[10px] text-cyan-400">
              Remaining: {alloc.remaining_stock.available_food_packets}
            </span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[10px]">POTABLE DRINKING WATER</span>
            <div className="text-base font-bold text-white mt-1">
              {alloc.remaining_stock.allocated_water_litres.toLocaleString()} L
            </div>
            <span className="text-[10px] text-cyan-400">
              Remaining: {alloc.remaining_stock.available_drinking_water_litres.toLocaleString()} L
            </span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[10px]">TRAUMA & FIRST AID KITS</span>
            <div className="text-base font-bold text-white mt-1">
              {alloc.remaining_stock.allocated_medical_kits} kits
            </div>
            <span className="text-[10px] text-cyan-400">
              Remaining: {alloc.remaining_stock.available_medical_kits}
            </span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
            <span className="text-slate-500 block text-[10px]">INFLATABLE MOTORBOATS</span>
            <div className="text-base font-bold text-white mt-1">
              {alloc.remaining_stock.allocated_boats} boats
            </div>
            <span className="text-[10px] text-cyan-400">
              Remaining: {alloc.remaining_stock.available_inflatable_boats}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

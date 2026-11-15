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
      <div className="flex items-center justify-center h-full text-slate-500 font-mono">
        Loading Resource Optimisation Grid...
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <Cpu className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              Emergency Resource Optimisation Engine — Google OR-Tools (MILP)
            </h2>
            <ProvenanceBadge provenance="MODEL_ESTIMATE" size="sm" />
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl">
            Mixed-Integer Linear Programming formulation maximizing life-safety coverage at high-risk Chennai zones
            while minimizing response transit delay under vehicle, road traversability, and supply inventory constraints.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-right text-xs font-mono">
            <span className="text-slate-500 block text-[10px]">SOLVER STATUS</span>
            <span className="font-bold text-emerald-700">{alloc.status} ({alloc.solver_used})</span>
          </div>

          <button
            onClick={handleRunOptimisation}
            disabled={isSolving}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer flex items-center space-x-2 shadow-sm"
          >
            <Play className={`w-3.5 h-3.5 ${isSolving ? 'animate-spin' : ''}`} />
            <span>{isSolving ? 'Solving MILP Formulation...' : 'Re-run OR-Tools Solver'}</span>
          </button>
        </div>
      </div>

      {/* Solver Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          <div className="flex justify-between items-center text-xs text-slate-500 font-medium mb-1">
            <span>Assigned Teams</span>
            <Truck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {alloc.total_assigned_teams}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">
            {alloc.total_unassigned_teams} Teams in Tactical Reserve
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          <div className="flex justify-between items-center text-xs text-slate-500 font-medium mb-1">
            <span>Served Target Zones</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700">
            {alloc.total_served_zones}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">
            100% of Priority 1 Zones Covered
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          <div className="flex justify-between items-center text-xs text-slate-500 font-medium mb-1">
            <span>Unmet Demand Gaps</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700">
            {alloc.unmet_zones_count}
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">
            Resource Deficit / Inaccessible Zones
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          <div className="flex justify-between items-center text-xs text-slate-500 font-medium mb-1">
            <span>MILP Solver Execution</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-800">
            {alloc.execution_time_ms} ms
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">
            Objective Score: {alloc.objective_value}
          </div>
        </div>
      </div>

      {/* Tactical Team Assignments Table */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <Truck className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Optimal Tactical Team-to-Destination Assignments ({alloc.assignments.length})
            </h3>
          </div>
          <ProvenanceBadge provenance="MODEL_ESTIMATE" size="sm" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-mono uppercase text-[10px]">
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
            <tbody className="divide-y divide-slate-100 text-slate-800 font-mono">
              {alloc.assignments.map((asg) => (
                <tr key={asg.team_id} className="hover:bg-slate-50 transition">
                  <td className="py-2.5 px-3 font-semibold text-slate-900">{asg.team_name}</td>
                  <td className="py-2.5 px-3 text-indigo-700 font-semibold">{asg.agency}</td>
                  <td className="py-2.5 px-3">
                    Zone {asg.assigned_zone_id}: {asg.assigned_zone_name}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                      Priority {asg.zone_priority}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-amber-700 font-bold">
                    {asg.estimated_arrival_time_min} min ({asg.route_distance_km} km)
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{asg.vehicle_used}</td>
                  <td className="py-2.5 px-3 text-[11px] text-slate-700">
                    {asg.allocated_supplies.food_packets} Meals | {asg.allocated_supplies.water_litres}L | {asg.allocated_supplies.medical_kits} Med | {asg.allocated_supplies.inflatable_boats} Boats
                  </td>
                  <td className="py-2.5 px-3 text-[11px] text-slate-500 max-w-xs truncate" title={asg.assignment_justification}>
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
        <div className="p-4 sm:p-5 rounded-2xl border border-amber-200 bg-amber-50 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-amber-900">
                Unserved Demand Gaps & Deficit Explanations ({alloc.unmet_destinations.length} Locations)
              </h3>
            </div>
            <span className="text-xs font-mono text-amber-800 font-bold">Tactical Constraints Bound</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-amber-200 text-amber-800 font-mono uppercase text-[10px]">
                  <th className="py-2 px-3">Unserved Zone</th>
                  <th className="py-2 px-3">Priority</th>
                  <th className="py-2 px-3">Risk Score</th>
                  <th className="py-2 px-3">Exposed Population</th>
                  <th className="py-2 px-3">Mathematical Deficit Cause</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-200/60 text-slate-800 font-mono">
                {alloc.unmet_destinations.map((u) => (
                  <tr key={u.zone_id} className="hover:bg-amber-100/60">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">
                      Zone {u.zone_id}: {u.zone_name}
                    </td>
                    <td className="py-2.5 px-3 text-amber-800 font-bold">Priority {u.priority}</td>
                    <td className="py-2.5 px-3">{u.risk_score} / 100</td>
                    <td className="py-2.5 px-3">{u.estimated_exposed_population.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-red-700 text-[11px] font-medium">{u.deficit_reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Emergency Supply Stock Allocation Status */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center space-x-1.5 pb-2 border-b border-slate-100">
          <Package className="w-4 h-4 text-indigo-600" />
          <span>EMERGENCY SUPPLY STOCK UTILIZATION</span>
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs font-mono">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-500 block text-[10px] font-semibold">FOOD PACKETS</span>
            <div className="text-base font-bold text-slate-900 mt-1">
              {alloc.remaining_stock.allocated_food_packets} /{' '}
              {alloc.remaining_stock.allocated_food_packets + alloc.remaining_stock.available_food_packets}
            </div>
            <span className="text-[10px] text-indigo-700 font-semibold">
              Remaining: {alloc.remaining_stock.available_food_packets}
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-500 block text-[10px] font-semibold">POTABLE DRINKING WATER</span>
            <div className="text-base font-bold text-slate-900 mt-1">
              {alloc.remaining_stock.allocated_water_litres.toLocaleString()} L
            </div>
            <span className="text-[10px] text-indigo-700 font-semibold">
              Remaining: {alloc.remaining_stock.available_drinking_water_litres.toLocaleString()} L
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-500 block text-[10px] font-semibold">TRAUMA & FIRST AID KITS</span>
            <div className="text-base font-bold text-slate-900 mt-1">
              {alloc.remaining_stock.allocated_medical_kits} kits
            </div>
            <span className="text-[10px] text-indigo-700 font-semibold">
              Remaining: {alloc.remaining_stock.available_medical_kits}
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-500 block text-[10px] font-semibold">INFLATABLE MOTORBOATS</span>
            <div className="text-base font-bold text-slate-900 mt-1">
              {alloc.remaining_stock.allocated_boats} boats
            </div>
            <span className="text-[10px] text-indigo-700 font-semibold">
              Remaining: {alloc.remaining_stock.available_inflatable_boats}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

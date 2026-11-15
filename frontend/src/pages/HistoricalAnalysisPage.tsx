import React, { useState, useEffect } from 'react';
import { History, Clock, FileText, CheckCircle2, ChevronRight } from 'lucide-react';
import { HistoryRunItem } from '../types';
import { ProvenanceBadge } from '../components/ProvenanceBadge';
import { api } from '../services/api';

export const HistoricalAnalysisPage: React.FC = () => {
  const [runs, setRuns] = useState<HistoryRunItem[]>([]);
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await api.getHistory();
      setRuns(res.runs);
      if (res.runs.length > 0 && !selectedRun) {
        const detail = await api.getHistoryDetail(res.runs[0].run_id);
        setSelectedRun(detail);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSelectRun = async (runId: string) => {
    try {
      const detail = await api.getHistoryDetail(runId);
      setSelectedRun(detail);
    } catch (err) {
      alert(`Failed to load run details: ${err}`);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2.5">
            <History className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              Simulation Run History & Operational Audit Log
            </h2>
            <ProvenanceBadge provenance="OBSERVED" size="sm" />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Persisted SQLite simulation runs documenting model parameters, scenario escalations, and tactical team assignments.
          </p>
        </div>
        <button
          onClick={fetchHistory}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-mono font-medium cursor-pointer border border-slate-200 shadow-2xs"
        >
          Refresh History
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Runs List Table */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-3 lg:col-span-1">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
              PAST SIMULATION RUNS ({runs.length})
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">SQLite DB</span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {runs.map((r) => {
              const isSelected = selectedRun?.run_id === r.run_id;
              let sevColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
              if (r.severity === 'SEVERE') sevColor = 'bg-amber-50 text-amber-800 border-amber-200';
              if (r.severity === 'CRITICAL') sevColor = 'bg-red-50 text-red-700 border-red-200';

              return (
                <div
                  key={r.run_id}
                  onClick={() => handleSelectRun(r.run_id)}
                  className={`p-3 rounded-xl border transition cursor-pointer text-xs space-y-1.5 ${
                    isSelected
                      ? 'border-slate-900 bg-slate-50 shadow-sm ring-1 ring-slate-900'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 font-mono">{r.run_id}</span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${sevColor}`}>
                      {r.severity}
                    </span>
                  </div>
                  <div className="text-slate-800 font-semibold">{r.scenario_name}</div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-600">
                    <span>Rain: {r.rainfall_mm}mm</span>
                    <span>Exposed: {r.exposed_population?.toLocaleString()}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-200/60">
                    {r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : 'Recent'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Run Inspection (2 cols) */}
        <div className="lg:col-span-2 p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-4">
          {selectedRun ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-mono text-indigo-700 font-bold uppercase tracking-wider">
                    RUN AUDIT SNAPSHOT: {selectedRun.run_id}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{selectedRun.scenario_name}</h3>
                </div>
                <div className="text-right text-xs font-mono text-slate-600">
                  <div>Timestamp: {selectedRun.timestamp}</div>
                  <div className="text-amber-800 font-bold">Severity: {selectedRun.severity}</div>
                </div>
              </div>

              {/* Aggregated Snapshot Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-slate-500 block text-[10px] font-semibold">RAINFALL</span>
                  <span className="text-base font-bold text-slate-900">{selectedRun.rainfall_mm} mm</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-slate-500 block text-[10px] font-semibold">EXPOSED POP.</span>
                  <span className="text-base font-bold text-amber-700">
                    {selectedRun.metrics.exposed_population.toLocaleString()}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-slate-500 block text-[10px] font-semibold">TEAMS ASSIGNED</span>
                  <span className="text-base font-bold text-emerald-700">
                    {selectedRun.metrics.assigned_teams} Units
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                  <span className="text-slate-500 block text-[10px] font-semibold">BLOCKED CORRIDORS</span>
                  <span className="text-base font-bold text-red-700">
                    {selectedRun.metrics.blocked_roads}
                  </span>
                </div>
              </div>

              {/* Blocked Segments Recorded */}
              <div className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <span className="text-[10px] text-slate-500 font-mono uppercase font-bold block">
                  Blocked Road Segment IDs Recorded in Run:
                </span>
                <div className="font-mono text-red-700 font-bold">
                  {selectedRun.blocked_edges?.length > 0
                    ? selectedRun.blocked_edges.join(', ')
                    : 'None (All corridors operational)'}
                </div>
              </div>

              {/* Tactical Allocations Snapshot */}
              {selectedRun.allocations?.assignments && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                    Tactical Team Assignments in Snapshot
                  </h4>
                  <div className="overflow-x-auto max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-[11px] font-mono border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 uppercase text-[9px]">
                          <th className="py-1.5 px-2">Team</th>
                          <th className="py-1.5 px-2">Destination</th>
                          <th className="py-1.5 px-2">Priority</th>
                          <th className="py-1.5 px-2">ETA</th>
                          <th className="py-1.5 px-2">Vehicle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {selectedRun.allocations.assignments.map((asg: any) => (
                          <tr key={asg.team_id} className="hover:bg-slate-50">
                            <td className="py-1.5 px-2 font-semibold text-slate-900">{asg.team_name}</td>
                            <td className="py-1.5 px-2">Zone {asg.assigned_zone_id}: {asg.assigned_zone_name}</td>
                            <td className="py-1.5 px-2 text-red-700 font-bold">P{asg.zone_priority}</td>
                            <td className="py-1.5 px-2 text-amber-700 font-semibold">{asg.estimated_arrival_time_min}m</td>
                            <td className="py-1.5 px-2 text-slate-600">{asg.vehicle_used}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 font-mono text-xs">
              Select a simulation run from the list to view its complete audit trace.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

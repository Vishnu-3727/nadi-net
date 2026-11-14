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
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 rounded-xl border border-slate-800 bg-[#0d1527] flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2.5">
            <History className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">
              Simulation Run History & Operational Audit Log
            </h2>
            <ProvenanceBadge provenance="OBSERVED" size="sm" />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Persisted SQLite simulation runs documenting model parameters, scenario escalations, and tactical team assignments.
          </p>
        </div>
        <button
          onClick={fetchHistory}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono cursor-pointer border border-slate-700"
        >
          Refresh History
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Runs List Table */}
        <div className="p-4 rounded-xl border border-slate-800 bg-[#0d1527] space-y-3 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              PAST SIMULATION RUNS ({runs.length})
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">SQLite DB</span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {runs.map((r) => {
              const isSelected = selectedRun?.run_id === r.run_id;
              let sevColor = 'bg-emerald-950 text-emerald-400 border-emerald-800';
              if (r.severity === 'SEVERE') sevColor = 'bg-amber-950 text-amber-400 border-amber-800';
              if (r.severity === 'CRITICAL') sevColor = 'bg-red-950 text-red-400 border-red-800';

              return (
                <div
                  key={r.run_id}
                  onClick={() => handleSelectRun(r.run_id)}
                  className={`p-3 rounded-lg border transition cursor-pointer text-xs space-y-1.5 ${
                    isSelected
                      ? 'border-cyan-500 bg-cyan-950/30'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white font-mono">{r.run_id}</span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${sevColor}`}>
                      {r.severity}
                    </span>
                  </div>
                  <div className="text-slate-300 font-medium">{r.scenario_name}</div>
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>Rain: {r.rainfall_mm}mm</span>
                    <span>Exposed: {r.exposed_population?.toLocaleString()}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-800/80">
                    {r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : 'Recent'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Run Inspection (2 cols) */}
        <div className="lg:col-span-2 p-4 rounded-xl border border-slate-800 bg-[#0d1527] space-y-4">
          {selectedRun ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                    RUN AUDIT SNAPSHOT: {selectedRun.run_id}
                  </span>
                  <h3 className="text-base font-bold text-white">{selectedRun.scenario_name}</h3>
                </div>
                <div className="text-right text-xs font-mono text-slate-400">
                  <div>Timestamp: {selectedRun.timestamp}</div>
                  <div className="text-amber-400 font-bold">Severity: {selectedRun.severity}</div>
                </div>
              </div>

              {/* Aggregated Snapshot Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">RAINFALL</span>
                  <span className="text-base font-bold text-white">{selectedRun.rainfall_mm} mm</span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">EXPOSED POP.</span>
                  <span className="text-base font-bold text-amber-400">
                    {selectedRun.metrics.exposed_population.toLocaleString()}
                  </span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">TEAMS ASSIGNED</span>
                  <span className="text-base font-bold text-emerald-400">
                    {selectedRun.metrics.assigned_teams} Units
                  </span>
                </div>
                <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">BLOCKED CORRIDORS</span>
                  <span className="text-base font-bold text-red-400">
                    {selectedRun.metrics.blocked_roads}
                  </span>
                </div>
              </div>

              {/* Blocked Segments Recorded */}
              <div className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-mono uppercase block">
                  Blocked Road Segment IDs Recorded in Run:
                </span>
                <div className="font-mono text-red-400 font-bold">
                  {selectedRun.blocked_edges?.length > 0
                    ? selectedRun.blocked_edges.join(', ')
                    : 'None (All corridors operational)'}
                </div>
              </div>

              {/* Tactical Allocations Snapshot */}
              {selectedRun.allocations?.assignments && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                    Tactical Team Assignments in Snapshot
                  </h4>
                  <div className="overflow-x-auto max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-[11px] font-mono border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 uppercase text-[9px]">
                          <th className="py-1 px-2">Team</th>
                          <th className="py-1 px-2">Destination</th>
                          <th className="py-1 px-2">Priority</th>
                          <th className="py-1 px-2">ETA</th>
                          <th className="py-1 px-2">Vehicle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {selectedRun.allocations.assignments.map((asg: any) => (
                          <tr key={asg.team_id}>
                            <td className="py-1.5 px-2 font-semibold text-white">{asg.team_name}</td>
                            <td className="py-1.5 px-2">Zone {asg.assigned_zone_id}: {asg.assigned_zone_name}</td>
                            <td className="py-1.5 px-2 text-red-400">P{asg.zone_priority}</td>
                            <td className="py-1.5 px-2 text-amber-300">{asg.estimated_arrival_time_min}m</td>
                            <td className="py-1.5 px-2 text-slate-400">{asg.vehicle_used}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500 font-mono text-xs">
              Select a simulation run from the list to view its complete audit trace.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Info, Database, ShieldCheck, CheckCircle2, AlertTriangle, BookOpen, Terminal } from 'lucide-react';
import { ProvenanceBadge } from '../components/ProvenanceBadge';

export const SettingsProvenancePage: React.FC = () => {
  return (
    <div className="space-y-5 max-w-5xl animate-in fade-in duration-300">
      {/* Header */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2.5">
            <Info className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              Data Provenance, Scientific Transparency & Technical Architecture
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            NADI-NET architectural integrity statement and formal data-source classification for K! Hacks 4.0.
          </p>
        </div>
      </div>

      {/* 1. Four Non-Negotiable Provenance Classes */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 pb-2 border-b border-slate-100">
          <Database className="w-4 h-4 text-indigo-600" />
          <span>Data Provenance Classifications</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-800">CLASS 1: OBSERVED</span>
              <ProvenanceBadge provenance="OBSERVED" size="sm" />
            </div>
            <p className="text-slate-700 font-sans text-xs leading-relaxed">
              Physical infrastructure and geographical realities: 8 major Chennai hospitals (RGGGH, Stanley, Kilpauk, MIOT, Fortis Malar, etc.), bed capacities, ICU counts, baseline elevations (USGS SRTM), and genuine emergency shelter coordinates.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sky-800">CLASS 2: HISTORICAL</span>
              <ProvenanceBadge provenance="HISTORICAL" size="sm" />
            </div>
            <p className="text-slate-700 font-sans text-xs leading-relaxed">
              Empirical inundation data from verified historical Chennai flood events: 2015 Chennai deluge and 2023 Cyclone Michaung GCC flood records across 15 municipal zones, river basins, and Otteri/Mambalam/Buckingham canals.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-800">CLASS 3: MODEL ESTIMATE</span>
              <ProvenanceBadge provenance="MODEL_ESTIMATE" size="sm" />
            </div>
            <p className="text-slate-700 font-sans text-xs leading-relaxed">
              Algorithmic outputs computed on demand: explainable multi-criteria decision analysis (MCDA) flood risk scores, NetworkX Dijkstra shortest feasible rescue routes, and Google OR-Tools CBC Mixed-Integer Linear Programming resource allocations.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-800">CLASS 4: SIMULATED</span>
              <ProvenanceBadge provenance="SIMULATED" size="sm" />
            </div>
            <p className="text-slate-700 font-sans text-xs leading-relaxed">
              Dynamic inputs provided for stress-testing and demonstration: scenario rainfall intensities (85mm, 245mm, 430mm), river basin overflow sensors, road blockage triggers, and available rescue team inventories.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Scientific Integrity Statement */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 pb-2 border-b border-slate-100">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Scientific Integrity Statement</span>
        </h3>
        <div className="text-xs text-slate-700 space-y-2.5 leading-relaxed">
          <p>
            <b>1. Explainability Over Black-Box Claims:</b> The flood risk engine utilizes a Multi-Criteria Decision Analysis (MCDA) AHP structure with normalized feature ranges. We explicitly do not falsely label a weighted mathematical formula as deep learning, nor do we report fabricated predictive accuracy metrics without a physical sensor test dataset.
          </p>
          <p>
            <b>2. Verified Algorithms:</b> Every major product recommendation is backed by a deterministic, mathematically verifiable algorithm: NetworkX graph routing for rescue routes and Google OR-Tools CBC MILP solver for team assignment under capacity constraints.
          </p>
          <p>
            <b>3. Offline Resilience:</b> All spatial and tabular datasets (Chennai 15 zones, 25-node arterial road graph, 8 hospitals, 6 shelters, 6 rescue depots) are self-contained within the application data repository. The core simulation runs completely offline without third-party API dependencies.
          </p>
        </div>
      </div>

      {/* 3. Technology Stack Reference */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2 pb-2 border-b border-slate-100">
          <Terminal className="w-4 h-4 text-indigo-600" />
          <span>Software Stack & Dependencies</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-slate-500 block text-[10px] font-semibold">BACKEND</span>
            <span className="font-bold text-slate-900">FastAPI 0.110</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-slate-500 block text-[10px] font-semibold">OPTIMISATION</span>
            <span className="font-bold text-indigo-700">Google OR-Tools CBC</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-slate-500 block text-[10px] font-semibold">GRAPH ROUTING</span>
            <span className="font-bold text-amber-700">NetworkX 3.2</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <span className="text-slate-500 block text-[10px] font-semibold">FRONTEND</span>
            <span className="font-bold text-purple-700">React 19 + Vite</span>
          </div>
        </div>
      </div>
    </div>
  );
};

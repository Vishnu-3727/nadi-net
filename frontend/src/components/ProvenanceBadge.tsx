import React from 'react';
import { DataProvenance } from '../types';

interface Props {
  provenance: DataProvenance | string;
  size?: 'sm' | 'md';
}

export const ProvenanceBadge: React.FC<Props> = ({ provenance, size = 'sm' }) => {
  let color = 'bg-slate-700 text-slate-300 border-slate-600';
  let label = provenance;
  let fullTitle = `Data Provenance: ${provenance}`;

  switch (provenance) {
    case 'OBSERVED':
      color = 'bg-emerald-950/80 text-emerald-400 border-emerald-700/60';
      label = size === 'sm' ? 'OBSERVED' : 'OBSERVED DATA';
      fullTitle = 'Ground-Truth Observed Data (Chennai Corporation / SRTM / GCC)';
      break;
    case 'HISTORICAL':
      color = 'bg-sky-950/80 text-sky-400 border-sky-700/60';
      label = size === 'sm' ? 'HISTORICAL' : 'HISTORICAL FLOOD RECORD';
      fullTitle = 'Empirical 2015 & 2023 Michaung Flood Records';
      break;
    case 'MODEL_ESTIMATE':
      color = 'bg-amber-950/80 text-amber-400 border-amber-700/60';
      label = size === 'sm' ? 'ESTIMATE' : 'MODEL ESTIMATE';
      fullTitle = 'Algorithmic Model Estimate (AHP MCDA / OR-Tools MILP)';
      break;
    case 'SIMULATED':
      color = 'bg-purple-950/80 text-purple-400 border-purple-700/60';
      label = size === 'sm' ? 'SIMULATED' : 'SIMULATED SCENARIO';
      fullTitle = 'Scenario Simulation Parameter';
      break;
  }

  const px = size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-mono font-semibold uppercase tracking-wider rounded border whitespace-nowrap shrink-0 ${px} ${color}`}
      title={fullTitle}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1 shrink-0 animate-pulse" />
      {label}
    </span>
  );
};

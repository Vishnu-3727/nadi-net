import React from 'react';
import { DataProvenance } from '../types';

interface Props {
  provenance: DataProvenance | string;
  size?: 'sm' | 'md';
}

export const ProvenanceBadge: React.FC<Props> = ({ provenance, size = 'sm' }) => {
  let color = 'bg-slate-700 text-slate-300 border-slate-600';
  let label = provenance;

  switch (provenance) {
    case 'OBSERVED':
      color = 'bg-emerald-950/80 text-emerald-400 border-emerald-700/60';
      label = 'OBSERVED DATA';
      break;
    case 'HISTORICAL':
      color = 'bg-sky-950/80 text-sky-400 border-sky-700/60';
      label = 'HISTORICAL FLOOD RECORD';
      break;
    case 'MODEL_ESTIMATE':
      color = 'bg-amber-950/80 text-amber-400 border-amber-700/60';
      label = 'MODEL ESTIMATE (MCDA/MILP)';
      break;
    case 'SIMULATED':
      color = 'bg-purple-950/80 text-purple-400 border-purple-700/60';
      label = 'SIMULATED INPUT';
      break;
  }

  const px = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-mono font-semibold uppercase tracking-wider rounded border ${px} ${color}`}
      title={`Data Provenance Classification: ${label}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
      {label}
    </span>
  );
};

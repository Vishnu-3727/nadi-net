import React from 'react';
import {
  LayoutDashboard,
  Waves,
  Map,
  Route,
  Truck,
  Sliders,
  History,
  Info,
} from 'lucide-react';

export type NavTab =
  | 'command'
  | 'flood_intelligence'
  | 'geospatial'
  | 'routing'
  | 'optimisation'
  | 'simulator'
  | 'history'
  | 'settings';

interface Props {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  unmetCount?: number;
  criticalCount?: number;
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  unmetCount = 0,
  criticalCount = 0,
}) => {
  const navItems = [
    {
      id: 'command' as NavTab,
      label: 'Command Centre',
      icon: LayoutDashboard,
      badge: criticalCount > 0 ? `${criticalCount} Crit` : undefined,
      badgeColor: 'bg-red-950 text-red-400 border-red-800',
    },
    {
      id: 'flood_intelligence' as NavTab,
      label: 'Flood Intelligence',
      icon: Waves,
    },
    {
      id: 'geospatial' as NavTab,
      label: 'Geospatial Operations',
      icon: Map,
    },
    {
      id: 'routing' as NavTab,
      label: 'Rescue Routing',
      icon: Route,
    },
    {
      id: 'optimisation' as NavTab,
      label: 'Resource Optimisation',
      icon: Truck,
      badge: unmetCount > 0 ? `${unmetCount} Deficit` : undefined,
      badgeColor: 'bg-amber-950 text-amber-400 border-amber-800',
    },
    {
      id: 'simulator' as NavTab,
      label: 'Scenario Simulator',
      icon: Sliders,
    },
    {
      id: 'history' as NavTab,
      label: 'Historical Analysis',
      icon: History,
    },
    {
      id: 'settings' as NavTab,
      label: 'Provenance & Specs',
      icon: Info,
    },
  ];

  return (
    <aside className="w-64 bg-[#0a0d14]/95 border-r border-white/[0.08] flex flex-col justify-between p-3.5 shrink-0 select-none shadow-2xl backdrop-blur-xl">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
          <span>OPERATIONAL MODULES</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition cursor-pointer group ${
                isActive
                  ? 'bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent border-l-2 border-l-emerald-400 border-y border-r border-emerald-500/25 text-white shadow-[0_0_20px_rgba(16,185,129,0.12)]'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] border border-transparent'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon
                  className={`w-4 h-4 transition duration-200 ${
                    isActive
                      ? 'text-emerald-400 scale-110 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]'
                      : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span className={isActive ? 'font-semibold text-white' : ''}>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider border shadow-sm ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer System Specs */}
      <div className="border-t border-white/[0.08] pt-4 px-2 space-y-2.5">
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px] font-mono text-slate-400">
          <div className="text-slate-500 uppercase tracking-wider text-[9px] font-bold">ALGORITHMIC STACK</div>
          <div className="font-semibold text-slate-200 mt-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span>OR-Tools MILP + NetworkX</span>
          </div>
          <div className="text-[10px] text-emerald-400/80 mt-0.5">AHP MCDA Risk Engine (EPSG:4326)</div>
        </div>
        <div className="text-[10px] text-slate-500 px-1 font-mono">
          K! Hacks 4.0 — CEG Anna University
        </div>
      </div>
    </aside>
  );
};

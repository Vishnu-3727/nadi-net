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
    <aside className="w-64 bg-[#090e17] border-r border-slate-800 flex flex-col justify-between p-4 shrink-0">
      <div className="space-y-1">
        <div className="px-3 py-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">
          OPERATIONAL MODULES
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                isActive
                  ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-800 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono border ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-800/80 pt-4 px-2 space-y-2">
        <div className="text-[11px] font-mono text-slate-400">
          <div className="text-slate-500 uppercase tracking-wider text-[9px]">ENGINE PLATFORM</div>
          <div className="font-semibold text-slate-300 mt-0.5">Google OR-Tools + NetworkX</div>
          <div className="text-[10px] text-slate-500">AHP MCDA Risk Engine</div>
        </div>
        <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/50">
          K! Hacks 4.0 — CEG Anna University
        </div>
      </div>
    </aside>
  );
};

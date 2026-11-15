import React, { useState } from 'react';
import {
  Map as MapIcon,
  Layers,
  Building2,
  Tent,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Search,
} from 'lucide-react';
import { ZoneRiskAssessmentData, RoadNetworkData, FacilitiesData } from '../types';
import { ChennaiMap } from '../components/ChennaiMap';
import { ProvenanceBadge } from '../components/ProvenanceBadge';

interface Props {
  zones: ZoneRiskAssessmentData[];
  roadNetwork: RoadNetworkData | null;
  facilities: FacilitiesData | null;
}

export const GeospatialPage: React.FC<Props> = ({ zones, roadNetwork, facilities }) => {
  const [showZones, setShowZones] = useState<boolean>(true);
  const [showRoads, setShowRoads] = useState<boolean>(true);
  const [showHospitals, setShowHospitals] = useState<boolean>(true);
  const [showShelters, setShowShelters] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredHospitals = (facilities?.hospitals || []).filter(
    (h) =>
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredShelters = (facilities?.shelters || []).filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <MapIcon className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">
              Chennai Geospatial Infrastructure Operations Grid
            </h2>
            <ProvenanceBadge provenance="OBSERVED" size="sm" />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Topological layer analysis linking Greater Chennai Corporation zones, arterial road network, critical hospitals, and flood shelters.
          </p>
        </div>

        {/* Layer Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowZones(!showZones)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium border transition cursor-pointer flex items-center space-x-1.5 ${
              showZones
                ? 'bg-slate-900 text-white border-slate-800 shadow-2xs'
                : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Zones ({zones.length})</span>
          </button>

          <button
            onClick={() => setShowRoads(!showRoads)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium border transition cursor-pointer flex items-center space-x-1.5 ${
              showRoads
                ? 'bg-slate-900 text-white border-slate-800 shadow-2xs'
                : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Road Graph ({roadNetwork?.edges.length || 0})</span>
          </button>

          <button
            onClick={() => setShowHospitals(!showHospitals)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium border transition cursor-pointer flex items-center space-x-1.5 ${
              showHospitals
                ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs'
                : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Hospitals ({facilities?.hospitals.length || 0})</span>
          </button>

          <button
            onClick={() => setShowShelters(!showShelters)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium border transition cursor-pointer flex items-center space-x-1.5 ${
              showShelters
                ? 'bg-indigo-700 text-white border-indigo-800 shadow-2xs'
                : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
            }`}
          >
            <Tent className="w-3.5 h-3.5" />
            <span>Shelters ({facilities?.shelters.length || 0})</span>
          </button>
        </div>
      </div>

      {/* Main Map */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs">
        <div className="rounded-xl overflow-hidden border border-slate-200 shadow-2xs">
          <ChennaiMap
            zones={zones}
            roadNetwork={roadNetwork || undefined}
            facilities={facilities || undefined}
            showZones={showZones}
            showRoads={showRoads}
            showHospitals={showHospitals}
            showShelters={showShelters}
            height="560px"
          />
        </div>
      </div>

      {/* Facility Registry & Status Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Hospitals Table */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center space-x-1.5">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>HOSPITAL OPERATIONAL ACCESSIBILITY ({facilities?.operational_hospitals} / {facilities?.total_hospitals})</span>
            </h3>
            <span className="text-xs font-mono text-emerald-700 font-bold">
              Readiness: {facilities?.readiness_percentage}%
            </span>
          </div>

          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-mono uppercase text-[10px] sticky top-0">
                  <th className="py-2 px-2.5">Facility</th>
                  <th className="py-2 px-2.5">Beds (ICU)</th>
                  <th className="py-2 px-2.5">Elevation</th>
                  <th className="py-2 px-2.5">Access Status</th>
                  <th className="py-2 px-2.5">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-mono">
                {filteredHospitals.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50">
                    <td className="py-2 px-2.5 font-semibold text-slate-900">
                      <div>{h.name}</div>
                      <div className="text-[10px] text-slate-500 font-sans">{h.address}</div>
                    </td>
                    <td className="py-2 px-2.5">
                      {h.total_beds} ({h.icu_beds})
                    </td>
                    <td className="py-2 px-2.5">{h.elevation_m}m</td>
                    <td className="py-2 px-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          h.emergency_status === 'FULLY_OPERATIONAL'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : h.emergency_status.includes('CAUTION')
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {h.emergency_status}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 text-[10px] text-slate-500">
                      {h.reason || 'Clear route'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Shelters Table */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-200/90 bg-white shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono flex items-center space-x-1.5">
              <Tent className="w-4 h-4 text-indigo-600" />
              <span>EMERGENCY RELIEF EVACUATION SHELTERS ({facilities?.shelters.length})</span>
            </h3>
            <ProvenanceBadge provenance="OBSERVED" size="sm" />
          </div>

          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-mono uppercase text-[10px] sticky top-0">
                  <th className="py-2 px-2.5">Shelter Name</th>
                  <th className="py-2 px-2.5">Capacity</th>
                  <th className="py-2 px-2.5">Gen. Backup</th>
                  <th className="py-2 px-2.5">Medical Post</th>
                  <th className="py-2 px-2.5">Elevation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-mono">
                {filteredShelters.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-2 px-2.5 font-semibold text-slate-900">
                      <div>{s.name}</div>
                      <div className="text-[10px] text-slate-500 font-sans">{s.address}</div>
                    </td>
                    <td className="py-2 px-2.5 font-bold text-indigo-700">
                      {s.capacity.toLocaleString()} persons
                    </td>
                    <td className="py-2 px-2.5">{s.has_generator ? 'Yes' : 'No'}</td>
                    <td className="py-2 px-2.5">{s.medical_post ? 'Active' : 'None'}</td>
                    <td className="py-2 px-2.5">{s.elevation_m}m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

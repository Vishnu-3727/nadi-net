import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Layers,
  MapPin,
  Building2,
  Tent,
  Navigation,
  Compass,
} from 'lucide-react';
import { ZoneRiskAssessmentData, RoadNetworkData, FacilitiesData, RouteDetailData } from '../types';

interface Props {
  zones?: ZoneRiskAssessmentData[];
  roadNetwork?: RoadNetworkData;
  facilities?: FacilitiesData;
  activeRoute?: RouteDetailData | null;
  selectedZoneId?: number | null;
  onSelectZone?: (zone: ZoneRiskAssessmentData) => void;
  showRoads?: boolean;
  showHospitals?: boolean;
  showShelters?: boolean;
  showZones?: boolean;
  height?: string;
}

export const ChennaiMap: React.FC<Props> = ({
  zones = [],
  roadNetwork,
  facilities,
  activeRoute,
  selectedZoneId,
  onSelectZone,
  showRoads: initialShowRoads = true,
  showHospitals: initialShowHospitals = true,
  showShelters: initialShowShelters = true,
  showZones: initialShowZones = true,
  height = '520px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [showZones, setShowZones] = useState<boolean>(initialShowZones);
  const [showRoads, setShowRoads] = useState<boolean>(initialShowRoads);
  const [showHospitals, setShowHospitals] = useState<boolean>(initialShowHospitals);
  const [showShelters, setShowShelters] = useState<boolean>(initialShowShelters);
  const layersRef = useRef<{
    zonesLayer?: L.LayerGroup;
    roadsLayer?: L.LayerGroup;
    facilitiesLayer?: L.LayerGroup;
    routeLayer?: L.LayerGroup;
  }>({});

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Centered on Chennai (Central coordinates ~ 13.04, 80.22)
      const map = L.map(mapContainerRef.current, {
        center: [13.045, 80.225],
        zoom: 11,
        zoomControl: true,
        attributionControl: false,
      });

      // OpenStreetMap Free Basemap with dark tactical filter (100% Free, Zero API Key required)
      const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors',
        className: 'dark-map-tiles',
      });

      tileLayer.on('tileerror', () => {
        // Safe silent fallback for offline operation
      });

      tileLayer.addTo(map);

      layersRef.current.zonesLayer = L.layerGroup().addTo(map);
      layersRef.current.roadsLayer = L.layerGroup().addTo(map);
      layersRef.current.facilitiesLayer = L.layerGroup().addTo(map);
      layersRef.current.routeLayer = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      // Cleanup on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Zones Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = layersRef.current.zonesLayer;
    if (!map || !layer) return;

    layer.clearLayers();
    if (!showZones) return;

    zones.forEach((z) => {
      const isSelected = selectedZoneId === z.zone_id;

      // Color coding by risk
      let fillColor = '#10b981'; // Low (Emerald)
      if (z.risk_category === 'Moderate') fillColor = '#38bdf8'; // Sky
      if (z.risk_category === 'High') fillColor = '#fbbf24'; // Amber
      if (z.risk_category === 'Very High') fillColor = '#f97316'; // Orange
      if (z.risk_category === 'Critical') fillColor = '#ef4444'; // Red

      const radius = Math.sqrt(z.area_sq_km) * 450;

      const circle = L.circle(z.centroid, {
        radius: radius,
        color: isSelected ? '#ffffff' : fillColor,
        weight: isSelected ? 3 : 1.5,
        fillColor: fillColor,
        fillOpacity: isSelected ? 0.45 : 0.25,
      });

      circle.bindTooltip(`<b>Zone ${z.zone_id}: ${z.name}</b><br/>Risk: ${z.flood_risk_score}/100 (${z.risk_category})`, {
        direction: 'top',
        className: 'bg-slate-900 text-slate-100 text-xs px-2 py-1 rounded border border-slate-700',
      });

      circle.on('click', () => {
        if (onSelectZone) onSelectZone(z);
      });

      circle.addTo(layer);
    });
  }, [zones, selectedZoneId, showZones, onSelectZone]);

  // Update Road Network Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = layersRef.current.roadsLayer;
    if (!map || !layer || !roadNetwork) return;

    layer.clearLayers();
    if (!showRoads) return;

    const nodeMap = new Map<string, [number, number]>();
    roadNetwork.nodes.forEach((n) => {
      nodeMap.set(n.id, [n.lat, n.lon]);

      // Add small node dots
      const nodeMarker = L.circleMarker([n.lat, n.lon], {
        radius: 3,
        color: '#64748b',
        fillColor: '#94a3b8',
        fillOpacity: 0.8,
        weight: 1,
      });
      nodeMarker.bindTooltip(`<b>${n.id}: ${n.name}</b>`, {
        direction: 'right',
        className: 'bg-slate-900 text-slate-200 text-[10px] px-1.5 py-0.5 rounded border border-slate-800',
      });
      nodeMarker.addTo(layer);
    });

    roadNetwork.edges.forEach((e) => {
      const uCoord = nodeMap.get(e.u);
      const vCoord = nodeMap.get(e.v);
      if (!uCoord || !vCoord) return;

      const polyline = L.polyline([uCoord, vCoord], {
        color: e.is_blocked ? '#ef4444' : '#0284c7',
        weight: e.is_blocked ? 4 : 2,
        dashArray: e.is_blocked ? '6, 6' : undefined,
        opacity: e.is_blocked ? 0.95 : 0.6,
      });

      const statusText = e.is_blocked
        ? '<span style="color:#ef4444; font-weight:bold;">SUBMERGED / BLOCKED</span>'
        : '<span style="color:#10b981; font-weight:bold;">OPERATIONAL</span>';

      polyline.bindPopup(`
        <div style="font-size:12px; line-height:1.4;">
          <b style="font-size:13px; color:#f8fafc;">${e.name}</b> (${e.id})<br/>
          Type: ${e.road_type} | Length: ${e.distance_km} km<br/>
          Status: ${statusText}<br/>
          Flood Susceptibility: ${(e.flood_susceptibility * 100).toFixed(0)}%
        </div>
      `);

      polyline.addTo(layer);
    });
  }, [roadNetwork, showRoads]);

  // Update Facilities Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = layersRef.current.facilitiesLayer;
    if (!map || !layer || !facilities) return;

    layer.clearLayers();

    // Hospitals
    if (showHospitals) {
      facilities.hospitals.forEach((h) => {
        const isOk = h.emergency_status === 'FULLY_OPERATIONAL';
        const color = isOk ? '#10b981' : h.emergency_status.includes('CAUTION') ? '#fbbf24' : '#ef4444';

        const marker = L.circleMarker(h.coordinates, {
          radius: 6,
          color: '#ffffff',
          weight: 1.5,
          fillColor: color,
          fillOpacity: 0.9,
        });

        marker.bindPopup(`
          <div style="font-size:12px; line-height:1.4;">
            <b style="color:#38bdf8; font-size:13px;">${h.name}</b><br/>
            ${h.address}<br/>
            <b>Total Beds:</b> ${h.total_beds} (ICU: ${h.icu_beds})<br/>
            <b>Elevation:</b> ${h.elevation_m}m<br/>
            <b>Status:</b> <span style="color:${color}; font-weight:bold;">${h.emergency_status}</span><br/>
            ${h.reason ? `<span style="font-size:11px; color:#94a3b8;">${h.reason}</span>` : ''}
          </div>
        `);
        marker.addTo(layer);
      });
    }

    // Shelters
    if (showShelters) {
      facilities.shelters.forEach((s) => {
        const marker = L.circleMarker(s.coordinates, {
          radius: 5,
          color: '#ffffff',
          weight: 1,
          fillColor: '#3b82f6',
          fillOpacity: 0.85,
        });

        marker.bindPopup(`
          <div style="font-size:12px; line-height:1.4;">
            <b style="color:#60a5fa; font-size:13px;">${s.name}</b><br/>
            ${s.address}<br/>
            <b>Capacity:</b> ${s.capacity} persons<br/>
            <b>Generator Backup:</b> ${s.has_generator ? 'Yes' : 'No'}<br/>
            <b>Medical Post:</b> ${s.medical_post ? 'Yes' : 'No'}
          </div>
        `);
        marker.addTo(layer);
      });
    }

    // Rescue Bases
    facilities.rescue_bases.forEach((b) => {
      const marker = L.circleMarker(b.coordinates, {
        radius: 6,
        color: '#facc15',
        weight: 1.5,
        fillColor: '#a855f7',
        fillOpacity: 0.9,
      });

      marker.bindPopup(`
        <div style="font-size:12px; line-height:1.4;">
          <b style="color:#c084fc; font-size:13px;">${b.name}</b><br/>
          <b>Type:</b> ${b.base_type}<br/>
          ${b.address}
        </div>
      `);
      marker.addTo(layer);
    });
  }, [facilities, showHospitals, showShelters]);

  // Update Active Route Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = layersRef.current.routeLayer;
    if (!map || !layer) return;

    layer.clearLayers();
    if (!activeRoute || !activeRoute.is_feasible || activeRoute.nodes.length < 2) return;

    const latlngs: [number, number][] = activeRoute.nodes.map((n) => [n.lat, n.lon]);

    // Outer glow polyline
    const glowLine = L.polyline(latlngs, {
      color: '#f59e0b',
      weight: 7,
      opacity: 0.4,
    });
    glowLine.addTo(layer);

    // Inner sharp polyline
    const routeLine = L.polyline(latlngs, {
      color: '#fbbf24',
      weight: 3.5,
      opacity: 1.0,
      dashArray: '8, 4',
    });

    routeLine.bindPopup(`
      <div style="font-size:12px; line-height:1.4;">
        <b style="color:#fbbf24; font-size:13px;">Active Rescue Route</b><br/>
        <b>Distance:</b> ${activeRoute.total_distance_km} km<br/>
        <b>Travel Time:</b> ${activeRoute.estimated_travel_time_min} mins<br/>
        <b>Rationale:</b> ${activeRoute.selection_rationale}
      </div>
    `);
    routeLine.addTo(layer);

    // Zoom to fit route
    map.fitBounds(routeLine.getBounds(), { padding: [40, 40], maxZoom: 14 });
  }, [activeRoute]);

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([13.045, 80.225], 11, { animate: true });
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl bg-[#07090e] ring-1 ring-white/5">
      <div ref={mapContainerRef} style={{ height }} className="z-10" />

      {/* Floating Layer Controls (WeCare Style Glass Island) */}
      <div className="absolute top-3.5 right-3.5 z-[1000] flex flex-wrap items-center gap-1.5 bg-[#0e121b]/85 backdrop-blur-xl p-1.5 rounded-xl border border-white/[0.1] shadow-2xl">
        <button
          onClick={() => setShowZones(!showZones)}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
            showZones
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white bg-white/[0.03] border border-transparent'
          }`}
          title="Toggle 15 GCC Zones"
        >
          <MapPin className="w-3 h-3" />
          <span>Zones</span>
        </button>

        <button
          onClick={() => setShowRoads(!showRoads)}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
            showRoads
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white bg-white/[0.03] border border-transparent'
          }`}
          title="Toggle Arterial Road Graph"
        >
          <Navigation className="w-3 h-3" />
          <span>Roads</span>
        </button>

        <button
          onClick={() => setShowHospitals(!showHospitals)}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
            showHospitals
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white bg-white/[0.03] border border-transparent'
          }`}
          title="Toggle Major Hospitals"
        >
          <Building2 className="w-3 h-3" />
          <span>Hospitals</span>
        </button>

        <button
          onClick={() => setShowShelters(!showShelters)}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer ${
            showShelters
              ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white bg-white/[0.03] border border-transparent'
          }`}
          title="Toggle Evacuation Shelters"
        >
          <Tent className="w-3 h-3" />
          <span>Shelters</span>
        </button>

        <button
          onClick={handleRecenter}
          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-slate-300 hover:text-emerald-400 border border-white/[0.08] transition cursor-pointer"
          title="Recenter Map on Chennai"
        >
          <Compass className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Map Layer Legend Overlay */}
      <div className="absolute bottom-3.5 left-3.5 z-[1000] bg-[#0e121b]/85 backdrop-blur-xl px-3.5 py-2 rounded-xl border border-white/[0.1] text-[11px] text-slate-300 flex flex-wrap gap-x-4 gap-y-1.5 shadow-2xl">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-500/30 animate-pulse" />
          <span>Critical Zone</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span>High Risk Zone</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 border-t-2 border-dashed border-rose-500" />
          <span>Submerged Bridge</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span>Operational Hospital</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-violet-400" />
          <span>Relief Shelter</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-400 border border-yellow-400" />
          <span>Staging Post</span>
        </div>
      </div>
    </div>
  );
};

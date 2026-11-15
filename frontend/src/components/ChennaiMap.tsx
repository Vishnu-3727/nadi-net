import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
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
  showRoads = true,
  showHospitals = true,
  showShelters = true,
  showZones = true,
  height = '520px',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
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

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-slate-800 shadow-2xl bg-[#090e17]">
      <div ref={mapContainerRef} style={{ height }} className="z-10" />

      {/* Map Layer Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-700/80 text-[11px] text-slate-300 flex flex-wrap gap-x-4 gap-y-1.5 shadow-xl">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span>Critical Zone</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span>High Risk Zone</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 border-t-2 border-dashed border-red-500" />
          <span>Blocked River Crossing</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span>Operational Hospital</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span>Relief Shelter</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 border border-yellow-400" />
          <span>Rescue Staging Post</span>
        </div>
      </div>
    </div>
  );
};

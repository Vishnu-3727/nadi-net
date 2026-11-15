import {
  CommandCenterOverviewData,
  RiskSummaryResponseData,
  RoadNetworkData,
  FacilitiesData,
  RouteResponseData,
  OptimisationResultData,
  ScenarioData,
  HistoryRunItem,
} from '../types';

const BASE_URL = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}: ${response.statusText}`;
    try {
      const errBody = await response.json();
      if (errBody.detail) errorMsg = errBody.detail;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // System
  getHealth: () => fetchJson<{ status: string; offline_demo_ready: boolean }>('/health'),
  getSystemStatus: () => fetchJson<any>('/system/status'),

  // Dashboard
  getDashboardOverview: () => fetchJson<CommandCenterOverviewData>('/dashboard/overview'),
  getAlerts: () => fetchJson<{ alerts: any[]; count: number }>('/dashboard/alerts'),

  // Risk
  getRiskZones: () => fetchJson<RiskSummaryResponseData>('/risk/zones'),
  getZoneDetail: (zoneId: number) => fetchJson<any>(`/risk/zones/${zoneId}`),
  evaluateRisk: (payload: { rainfall_intensity_mm: number; water_level_index: number; weights?: any }) =>
    fetchJson<RiskSummaryResponseData>('/risk/evaluate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Map
  getMapZones: () => fetchJson<any>('/map/zones'),
  getRoadNetwork: () => fetchJson<RoadNetworkData>('/map/roads'),
  getFacilities: () => fetchJson<FacilitiesData>('/map/facilities'),

  // Routing
  computeRoute: (payload: {
    origin_node_id: string;
    destination_node_id: string;
    vehicle_type?: string;
    avoid_blocked_edges?: boolean;
    blocked_edges_override?: string[];
  }) =>
    fetchJson<RouteResponseData>('/routing/route', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Resources
  getResources: () => fetchJson<any>('/resources'),
  getAllocations: () => fetchJson<OptimisationResultData>('/resources/allocations'),
  optimizeAllocations: () =>
    fetchJson<OptimisationResultData>('/resources/optimise', {
      method: 'POST',
    }),

  // Scenarios
  getScenarios: () => fetchJson<{ scenarios: ScenarioData[]; active_scenario_id: string }>('/scenarios'),
  getScenario: (scenarioId: string) => fetchJson<ScenarioData>(`/scenarios/${scenarioId}`),
  simulateScenario: (scenarioId: string, customOverrides?: any) =>
    fetchJson<{ status: string; message: string; data: any }>(`/scenarios/${scenarioId}/simulate`, {
      method: 'POST',
      body: JSON.stringify(customOverrides || {}),
    }),
  resetScenario: () =>
    fetchJson<{ status: string; message: string; data: any }>('/scenarios/SCN-A/reset', {
      method: 'POST',
    }),

  // History
  getHistory: () => fetchJson<{ total: number; runs: HistoryRunItem[] }>('/history'),
  getHistoryDetail: (runId: string) => fetchJson<any>(`/history/${runId}`),

  // Waterways & Multi-modal Routing
  getWaterways: () => fetchJson<any>('/map/waterways'),
  computeMultiModalRoute: (payload: {
    origin_node_id: string;
    destination_node_id: string;
    primary_vehicle_type?: string;
    watercraft_type?: string;
    allow_waterway?: boolean;
    blocked_edges?: string[];
  }) =>
    fetchJson<any>('/routing/multimodal', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Dynamic Replanning & Critical Links
  replanAllocations: (payload: {
    scenario_id?: string;
    events: any[];
    active_assignments?: any[];
    completed_team_ids?: string[];
    evacuated_persons_count?: number;
  }) =>
    fetchJson<any>('/allocations/replan', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getCriticalLinks: (scenarioId?: string, blockedEdges?: string) => {
    const params = new URLSearchParams();
    if (scenarioId) params.append('scenario_id', scenarioId);
    if (blockedEdges) params.append('blocked_edges', blockedEdges);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchJson<any>(`/infrastructure/critical-links${query}`);
  },
};

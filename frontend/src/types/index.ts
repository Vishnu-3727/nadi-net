export type DataProvenance = 'OBSERVED' | 'HISTORICAL' | 'MODEL_ESTIMATE' | 'SIMULATED';

export type EmergencySeverity = 'MODERATE' | 'SEVERE' | 'CRITICAL';

export interface MetricCardData {
  label: string;
  value: string | number;
  subtext: string;
  status: 'normal' | 'warning' | 'critical' | 'good';
  provenance: DataProvenance;
}

export interface HighPriorityAlertData {
  id: string;
  zone_id: number;
  zone_name: string;
  severity: string;
  message: string;
  timestamp: string;
  action_required: string;
  provenance: DataProvenance;
}

export interface ActivityFeedItemData {
  id: number;
  timestamp: string;
  action_type: string;
  severity: string;
  message: string;
  provenance: string;
}

export interface CommandCenterOverviewData {
  active_scenario_id: string;
  active_scenario_name: string;
  active_severity: EmergencySeverity;
  metrics: MetricCardData[];
  alerts: HighPriorityAlertData[];
  recent_activities: ActivityFeedItemData[];
  hospital_readiness_pct: number;
  total_blocked_roads: number;
  provenance_summary: Record<string, string>;
}

export interface ContributingFactorsData {
  rainfall_contribution: number;
  elevation_contribution: number;
  historical_contribution: number;
  drainage_contribution: number;
  water_level_contribution: number;
  vulnerability_contribution: number;
}

export interface ZoneRiskAssessmentData {
  zone_id: number;
  name: string;
  region: string;
  centroid: [number, number];
  population: number;
  area_sq_km: number;
  baseline_elevation_m: number;
  flood_risk_score: number;
  risk_category: 'Low' | 'Moderate' | 'High' | 'Very High' | 'Critical';
  contributing_factors: ContributingFactorsData;
  estimated_exposed_population: number;
  recommended_priority: number;
  data_confidence: number;
  data_source: string;
  provenance: DataProvenance;
  notes?: string;
}

export interface RiskSummaryResponseData {
  total_zones: number;
  average_risk_score: number;
  category_counts: Record<string, number>;
  total_exposed_population: number;
  critical_zones: string[];
  provenance: DataProvenance;
  zones: ZoneRiskAssessmentData[];
}

export interface HospitalFacility {
  id: string;
  name: string;
  zone_id: number;
  address: string;
  coordinates: [number, number];
  total_beds: number;
  icu_beds: number;
  emergency_status: string;
  elevation_m: number;
  flood_vulnerability: string;
  reason?: string;
  provenance: DataProvenance;
}

export interface ShelterFacility {
  id: string;
  name: string;
  zone_id: number;
  address: string;
  coordinates: [number, number];
  capacity: number;
  current_occupancy: number;
  status: string;
  has_generator: boolean;
  medical_post: boolean;
  elevation_m: number;
  provenance: DataProvenance;
}

export interface RescueBaseFacility {
  id: string;
  name: string;
  zone_id: number;
  address: string;
  coordinates: [number, number];
  base_type: string;
  elevation_m: number;
  provenance: DataProvenance;
}

export interface FacilitiesData {
  hospitals: HospitalFacility[];
  shelters: ShelterFacility[];
  rescue_bases: RescueBaseFacility[];
  readiness_percentage: number;
  total_hospitals: number;
  operational_hospitals: number;
  provenance: DataProvenance;
}

export interface RoadNode {
  id: string;
  name: string;
  lat: number;
  lon: number;
  zone_id: number;
}

export interface RoadEdge {
  id: string;
  u: string;
  v: string;
  name: string;
  distance_km: number;
  speed_limit_kmh: number;
  road_type: string;
  flood_susceptibility: number;
  is_blocked: boolean;
}

export interface RoadNetworkData {
  nodes: RoadNode[];
  edges: RoadEdge[];
  blocked_count: number;
  provenance: string;
}

export interface RouteDetailData {
  is_feasible: boolean;
  total_distance_km: number;
  estimated_travel_time_min: number;
  nodes: { node_id: string; name: string; lat: number; lon: number }[];
  edges: {
    edge_id: string;
    name: string;
    distance_km: number;
    travel_time_min: number;
    is_blocked: boolean;
  }[];
  blocked_segments_encountered: string[];
  selection_rationale: string;
  vehicle_compatibility: string;
  provenance: DataProvenance;
}

export interface RouteResponseData {
  origin_node_id: string;
  destination_node_id: string;
  primary_route: RouteDetailData;
  alternatives: {
    rank: number;
    route_name: string;
    total_distance_km: number;
    estimated_travel_time_min: number;
    difference_reason: string;
  }[];
  unreachable_reason?: string;
}

export interface TeamAssignmentData {
  team_id: string;
  team_name: string;
  agency: string;
  assigned_zone_id: number;
  assigned_zone_name: string;
  destination_node_id: string;
  zone_priority: number;
  risk_score: number;
  route_distance_km: number;
  estimated_arrival_time_min: number;
  vehicle_used: string;
  allocated_supplies: {
    food_packets: number;
    water_litres: number;
    medical_kits: number;
    inflatable_boats: number;
  };
  route_nodes: string[];
  assignment_justification: string;
}

export interface UnmetDestinationData {
  zone_id: number;
  zone_name: string;
  priority: number;
  risk_score: number;
  estimated_exposed_population: number;
  deficit_reason: string;
}

export interface OptimisationResultData {
  status: string;
  solver_used: string;
  total_assigned_teams: number;
  total_unassigned_teams: number;
  total_served_zones: number;
  unmet_zones_count: number;
  objective_value: number;
  assignments: TeamAssignmentData[];
  unmet_destinations: UnmetDestinationData[];
  remaining_stock: {
    available_rescue_teams: number;
    available_inflatable_boats: number;
    available_food_packets: number;
    available_drinking_water_litres: number;
    available_medical_kits: number;
    allocated_food_packets: number;
    allocated_water_litres: number;
    allocated_medical_kits: number;
    allocated_boats: number;
    provenance: DataProvenance;
  };
  provenance: DataProvenance;
  execution_time_ms: number;
}

export interface ScenarioData {
  id: string;
  name: string;
  severity: EmergencySeverity;
  rainfall_intensity_mm: number;
  water_level_index: number;
  description: string;
  blocked_edge_ids: string[];
  available_rescue_teams: number;
  available_inflatable_boats: number;
  available_food_packets: number;
  available_drinking_water_litres: number;
  available_medical_kits: number;
  provenance: DataProvenance;
}

export interface HistoryRunItem {
  run_id: string;
  scenario_name: string;
  severity: string;
  rainfall_mm: number;
  water_level: number;
  timestamp: string;
  affected_zones: number;
  critical_zones: number;
  exposed_population: number;
  assigned_teams: number;
  blocked_roads: number;
  notes: string;
}

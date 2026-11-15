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
  evacuees_transported?: number;
  route_nodes: string[];
  assignment_justification: string;
}

export interface UnmetDestinationData {
  zone_id: number;
  zone_name: string;
  priority: number;
  risk_score: number;
  estimated_exposed_population: number;
  unmet_demand_persons?: number;
  deficit_reason: string;
}

export interface ShelterAssignmentData {
  shelter_id: string;
  shelter_name: string;
  zone_id: number;
  zone_name: string;
  evacuees_assigned: number;
  shelter_capacity: number;
  shelter_remaining_capacity: number;
}

export interface ZoneEvacuationStatusData {
  zone_id: number;
  zone_name: string;
  priority: number;
  demand_persons: number;
  served_persons: number;
  unmet_persons: number;
  is_fully_served: boolean;
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
  shelter_assignments?: ShelterAssignmentData[];
  zone_evacuation_statuses?: ZoneEvacuationStatusData[];
  total_demand_persons?: number;
  total_served_persons?: number;
  total_unmet_persons?: number;
  solver_diagnostics?: string;
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

export interface RoadFloodConditionData {
  edge_id: string;
  flood_depth_min_m?: number;
  flood_depth_expected_m?: number;
  flood_depth_max_m?: number;
  depth_source: string;
  depth_scenario_id?: string;
  is_simulated: boolean;
  confidence_or_reliability_label: string;
  flow_velocity_mps?: number;
  structural_restriction?: string;
  manual_override?: string;
  provenance: string;
}

export interface WaterwayNodeData {
  id: string;
  name: string;
  lat: number;
  lon: number;
  waterway: string;
  node_type: string;
  road_node_transfer_id?: string;
  transfer_time_min: number;
  status: string;
  is_simulated: boolean;
}

export interface WaterwayEdgeData {
  id: string;
  u: string;
  v: string;
  name: string;
  waterway: string;
  distance_km: number;
  speed_limit_kmh: number;
  min_required_depth_m: number;
  max_permitted_current_mps: number;
  current_depth_m: number;
  current_flow_velocity_mps: number;
  navigation_status: string;
  is_simulated: boolean;
}

export interface WaterwayNetworkData {
  nodes: WaterwayNodeData[];
  edges: WaterwayEdgeData[];
  total_launch_points: number;
  provenance: string;
  warning: string;
}

export interface MultiModalRouteStepData {
  step_number: number;
  mode: string;
  vehicle_or_craft: string;
  start_node: string;
  end_node: string;
  edge_ids: string[];
  distance_km: number;
  duration_min: number;
  description: string;
  accessibility_status: string;
  restrictions: string[];
}

export interface MultiModalRouteDetailData {
  is_feasible: boolean;
  total_distance_km: number;
  total_duration_min: number;
  steps: MultiModalRouteStepData[];
  transfer_points_used: string[];
  vehicles_used: string[];
  route_summary: string;
  provenance: string;
}

export interface DisruptionEventData {
  event_id: string;
  timestamp: string;
  event_type: string;
  affected_entity_id: string;
  previous_state?: any;
  new_state?: any;
  source: string;
  description: string;
}

export interface ReplanningResultData {
  status: string;
  solver_used: string;
  preserved_assignments: TeamAssignmentData[];
  new_assignments: TeamAssignmentData[];
  cancelled_assignments: TeamAssignmentData[];
  active_assignments: TeamAssignmentData[];
  updated_unmet_destinations: UnmetDestinationData[];
  shelter_assignments: ShelterAssignmentData[];
  remaining_stock: any;
  replanning_summary: string;
  events_processed: number;
  execution_time_ms: number;
  provenance: string;
}

export interface CriticalLinkScoreData {
  edge_id: string;
  edge_name: string;
  restoration_rank: number;
  marginal_benefit_score: number;
  population_accessible_gained: number;
  priority_weighted_demand_reached: number;
  hospitals_reconnected: number;
  shelters_reconnected: number;
  travel_time_saved_min: number;
  components_reduced: number;
  restoration_justification: string;
  provenance: string;
}

export interface CriticalLinksResponseData {
  total_blocked_links: number;
  ranked_links: CriticalLinkScoreData[];
  evaluation_scenario: string;
  provenance: string;
}

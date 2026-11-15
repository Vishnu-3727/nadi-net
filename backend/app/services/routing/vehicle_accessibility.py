"""
NADI-NET — Vehicle-Specific Accessibility Engine
Evaluates physical road traversability under assumed flood scenarios and structural constraints.
EPSG:4326 context. All vehicle thresholds are documented demonstration assumptions.
"""

from typing import Dict, Any, Optional, Union
from backend.app.schemas.flood_depth import (
    RoadFloodCondition,
    VehicleProfile,
    EdgeAccessibilityResult,
)

# Standard demonstration vehicle profiles with explicit physical parameters
VEHICLE_PROFILES: Dict[str, VehicleProfile] = {
    "AMBULANCE_STANDARD": VehicleProfile(
        vehicle_type="AMBULANCE_STANDARD",
        name="Standard Emergency Ambulance (BLS/ALS)",
        max_operating_depth_m=0.20,
        max_flow_velocity_mps=0.50,
        prohibited_structures=["UNDERPASS", "SUBWAY"],
        road_class_restrictions=[],
        is_amphibious=False,
        is_watercraft=False,
        can_traverse_dry_roads=True,
        operational_status="AVAILABLE",
        provenance="ASSUMED_DEMONSTRATION_PARAMETER (Automotive 200mm wading limit)",
    ),
    "RESCUE_4WD": VehicleProfile(
        vehicle_type="RESCUE_4WD",
        name="4WD High-Clearance Rescue Vehicle",
        max_operating_depth_m=0.45,
        max_flow_velocity_mps=1.00,
        prohibited_structures=["UNDERPASS_SUBMERGED"],
        road_class_restrictions=[],
        is_amphibious=False,
        is_watercraft=False,
        can_traverse_dry_roads=True,
        operational_status="AVAILABLE",
        provenance="ASSUMED_DEMONSTRATION_PARAMETER (Modified SUV/Truck snorkel limit 450mm)",
    ),
    "HEAVY_CLEARANCE_TRUCK": VehicleProfile(
        vehicle_type="HEAVY_CLEARANCE_TRUCK",
        name="Heavy Tactical Rescue Truck (NDRF/TNFRS)",
        max_operating_depth_m=0.90,
        max_flow_velocity_mps=1.50,
        prohibited_structures=[],
        road_class_restrictions=[],
        is_amphibious=False,
        is_watercraft=False,
        can_traverse_dry_roads=True,
        operational_status="AVAILABLE",
        provenance="ASSUMED_DEMONSTRATION_PARAMETER (Military/Heavy tactical chassis 900mm)",
    ),
    "AMPHIBIOUS_CRAFT": VehicleProfile(
        vehicle_type="AMPHIBIOUS_CRAFT",
        name="Amphibious All-Terrain Vehicle (AATV)",
        max_operating_depth_m=3.00,
        max_flow_velocity_mps=2.50,
        prohibited_structures=[],
        road_class_restrictions=[],
        is_amphibious=True,
        is_watercraft=False,
        can_traverse_dry_roads=True,
        operational_status="AVAILABLE",
        provenance="ASSUMED_DEMONSTRATION_PARAMETER (Floating amphibious hull with tracked wheels)",
    ),
    "INFLATABLE_MOTORBOAT": VehicleProfile(
        vehicle_type="INFLATABLE_MOTORBOAT",
        name="Inflatable Rescue Motorboat (IRB)",
        max_operating_depth_m=10.00,
        max_flow_velocity_mps=3.00,
        prohibited_structures=["LOW_BRIDGE_CLEARANCE"],
        road_class_restrictions=["DRY_ROAD", "HIGHWAY", "ARTERIAL", "SECONDARY"],
        is_amphibious=False,
        is_watercraft=True,
        can_traverse_dry_roads=False,
        operational_status="AVAILABLE",
        provenance="ASSUMED_DEMONSTRATION_PARAMETER (Zodiac-type inflatable with outboard motor)",
    ),
}

# Legacy aliases for backward compatibility with Phase 1-2 tests and API callers
VEHICLE_ALIASES: Dict[str, str] = {
    "NORMAL_RESCUE": "RESCUE_4WD",
    "HIGH_CLEARANCE": "HEAVY_CLEARANCE_TRUCK",
    "AMPHIBIOUS_BOAT": "AMPHIBIOUS_CRAFT",
    "AMBULANCE": "AMBULANCE_STANDARD",
    "BOAT": "INFLATABLE_MOTORBOAT",
}


def get_vehicle_profile(vehicle_ref: Union[str, VehicleProfile]) -> VehicleProfile:
    """
    Resolves a vehicle type string or legacy alias to a validated VehicleProfile.
    """
    if isinstance(vehicle_ref, VehicleProfile):
        return vehicle_ref

    key = str(vehicle_ref).strip().upper()
    resolved_key = VEHICLE_ALIASES.get(key, key)
    profile = VEHICLE_PROFILES.get(resolved_key)
    if profile:
        return profile

    # Fallback to default RESCUE_4WD if unknown string provided
    return VEHICLE_PROFILES["RESCUE_4WD"]


def evaluate_edge_accessibility(
    edge: Dict[str, Any],
    vehicle: Union[str, VehicleProfile],
    flood_condition: Optional[RoadFloodCondition] = None,
    conservative_unknown: bool = True,
) -> EdgeAccessibilityResult:
    """
    Explainable decision function determining whether a road segment is PASSABLE,
    RESTRICTED, BLOCKED, or UNKNOWN for a specific vehicle under flood conditions.

    Rules:
    1. Vehicle must be AVAILABLE.
    2. Manual overrides: FORCE_CLOSED always blocks. FORCE_OPEN is subject to safety validation
       (cannot bypass severe structural hazard).
    3. Inflatable boats / watercraft cannot traverse dry roads.
    4. Unknown conditions: conservative mode marks UNKNOWN (impedance = inf); non-conservative marks RESTRICTED.
    5. Structural prohibitions (e.g. standard ambulance in flooded underpass) block passage.
    6. Flow velocity exceeding safe stability threshold blocks passage.
    7. Water depth vs vehicle wading limit:
       - depth > max_operating_depth -> BLOCKED
       - depth == max_operating_depth -> RESTRICTED (3.0x multiplier)
       - depth > 0.5 * max_operating_depth -> RESTRICTED (1.8x multiplier)
       - depth <= 0.5 * max_operating_depth -> PASSABLE (1.0x multiplier)
    """
    edge_id = str(edge.get("id", "UNKNOWN_EDGE"))
    v_profile = get_vehicle_profile(vehicle)

    # 1. Vehicle operational readiness check
    if v_profile.operational_status != "AVAILABLE":
        return EdgeAccessibilityResult(
            edge_id=edge_id,
            status="BLOCKED",
            reason=f"Vehicle '{v_profile.name}' is currently {v_profile.operational_status} and cannot be routed.",
            applicable_threshold_m=v_profile.max_operating_depth_m,
            source_classification="VEHICLE_STATUS",
            cost_multiplier=float("inf"),
        )

    # 2. Manual override checks
    if flood_condition and flood_condition.manual_override:
        override = flood_condition.manual_override.strip().upper()
        if override == "FORCE_CLOSED":
            return EdgeAccessibilityResult(
                edge_id=edge_id,
                status="BLOCKED",
                reason="Manual operator road closure active.",
                applicable_threshold_m=v_profile.max_operating_depth_m,
                actual_depth_m=flood_condition.flood_depth_expected_m,
                source_classification=flood_condition.depth_source,
                scenario_id=flood_condition.depth_scenario_id,
                cost_multiplier=float("inf"),
            )
        elif override == "FORCE_OPEN":
            # Safety constraint: Manual reopen cannot override catastrophic structural hazards
            expected_d = flood_condition.flood_depth_expected_m or 0.0
            is_critical_struct = flood_condition.structural_restriction in ("UNDERPASS", "COLLAPSED_BRIDGE", "SUBWAY")
            if is_critical_struct and expected_d > 1.0:
                return EdgeAccessibilityResult(
                    edge_id=edge_id,
                    status="BLOCKED",
                    reason="Manual reopen rejected: Structural safety restriction cannot be overridden when water depth exceeds safe clearance.",
                    applicable_threshold_m=v_profile.max_operating_depth_m,
                    actual_depth_m=expected_d,
                    source_classification=flood_condition.depth_source,
                    scenario_id=flood_condition.depth_scenario_id,
                    cost_multiplier=float("inf"),
                )
            else:
                return EdgeAccessibilityResult(
                    edge_id=edge_id,
                    status="PASSABLE",
                    reason="Manual operator override active subject to safety verification.",
                    applicable_threshold_m=v_profile.max_operating_depth_m,
                    actual_depth_m=expected_d,
                    source_classification=flood_condition.depth_source,
                    scenario_id=flood_condition.depth_scenario_id,
                    cost_multiplier=1.0,
                )

    # 3. Watercraft on dry asphalt check
    if v_profile.is_watercraft and not v_profile.can_traverse_dry_roads:
        depth_val = flood_condition.flood_depth_expected_m if flood_condition else None
        if depth_val is None or depth_val < 0.25:
            return EdgeAccessibilityResult(
                edge_id=edge_id,
                status="BLOCKED",
                reason="Watercraft prohibited on dry road segments without transport trailer or amphibious capability.",
                applicable_threshold_m=v_profile.max_operating_depth_m,
                actual_depth_m=depth_val,
                source_classification=flood_condition.depth_source if flood_condition else "STATIC_GRAPH",
                cost_multiplier=float("inf"),
            )

    # 4. Unknown or missing flood condition handling
    if flood_condition is None or flood_condition.depth_source == "UNKNOWN" or flood_condition.flood_depth_expected_m is None:
        if conservative_unknown:
            return EdgeAccessibilityResult(
                edge_id=edge_id,
                status="UNKNOWN",
                reason="Unknown flood condition: Conservative emergency protocol prohibits routing without field reconnaissance.",
                applicable_threshold_m=v_profile.max_operating_depth_m,
                actual_depth_m=None,
                source_classification="UNKNOWN",
                cost_multiplier=float("inf"),
            )
        else:
            return EdgeAccessibilityResult(
                edge_id=edge_id,
                status="RESTRICTED",
                reason="Unknown flood condition: Proceeding with caution under non-conservative mode.",
                applicable_threshold_m=v_profile.max_operating_depth_m,
                actual_depth_m=None,
                source_classification="UNKNOWN",
                cost_multiplier=2.5,
            )

    # 5. Structural restriction check
    if flood_condition.structural_restriction and flood_condition.structural_restriction in v_profile.prohibited_structures:
        return EdgeAccessibilityResult(
            edge_id=edge_id,
            status="BLOCKED",
            reason=f"Structural restriction: Vehicle '{v_profile.name}' is prohibited from entering inundated {flood_condition.structural_restriction}.",
            applicable_threshold_m=v_profile.max_operating_depth_m,
            actual_depth_m=flood_condition.flood_depth_expected_m,
            source_classification=flood_condition.depth_source,
            scenario_id=flood_condition.depth_scenario_id,
            cost_multiplier=float("inf"),
        )

    # 6. Flow velocity check
    if flood_condition.flow_velocity_mps is not None and v_profile.max_flow_velocity_mps is not None:
        if flood_condition.flow_velocity_mps > v_profile.max_flow_velocity_mps:
            return EdgeAccessibilityResult(
                edge_id=edge_id,
                status="BLOCKED",
                reason=f"Excessive flow velocity ({flood_condition.flow_velocity_mps:.1f} m/s) exceeds vehicle safe stability limit ({v_profile.max_flow_velocity_mps:.1f} m/s). Risk of vehicle sweeping.",
                applicable_threshold_m=v_profile.max_operating_depth_m,
                actual_depth_m=flood_condition.flood_depth_expected_m,
                flow_velocity_mps=flood_condition.flow_velocity_mps,
                source_classification=flood_condition.depth_source,
                scenario_id=flood_condition.depth_scenario_id,
                cost_multiplier=float("inf"),
            )

    # 7. Water depth wading threshold evaluation
    d = flood_condition.flood_depth_expected_m
    max_d = v_profile.max_operating_depth_m

    if d > max_d:
        return EdgeAccessibilityResult(
            edge_id=edge_id,
            status="BLOCKED",
            reason=f"Flood depth ({d:.2f}m) exceeds vehicle operating threshold ({max_d:.2f}m). Risk of engine stall or hydraulic locking.",
            applicable_threshold_m=max_d,
            actual_depth_m=d,
            flow_velocity_mps=flood_condition.flow_velocity_mps,
            source_classification=flood_condition.depth_source,
            scenario_id=flood_condition.depth_scenario_id,
            cost_multiplier=float("inf"),
        )
    elif abs(d - max_d) < 1e-4:
        return EdgeAccessibilityResult(
            edge_id=edge_id,
            status="RESTRICTED",
            reason=f"Flood depth ({d:.2f}m) is exactly at maximum safe threshold ({max_d:.2f}m). Extreme caution and crawl speed required.",
            applicable_threshold_m=max_d,
            actual_depth_m=d,
            flow_velocity_mps=flood_condition.flow_velocity_mps,
            source_classification=flood_condition.depth_source,
            scenario_id=flood_condition.depth_scenario_id,
            cost_multiplier=3.0,
        )
    elif d > 0.5 * max_d:
        return EdgeAccessibilityResult(
            edge_id=edge_id,
            status="RESTRICTED",
            reason=f"Flood depth ({d:.2f}m) warrants speed reduction and alert maneuvering.",
            applicable_threshold_m=max_d,
            actual_depth_m=d,
            flow_velocity_mps=flood_condition.flow_velocity_mps,
            source_classification=flood_condition.depth_source,
            scenario_id=flood_condition.depth_scenario_id,
            cost_multiplier=1.8,
        )
    else:
        return EdgeAccessibilityResult(
            edge_id=edge_id,
            status="PASSABLE",
            reason=f"Flood depth ({d:.2f}m) is safely within vehicle operating capability ({max_d:.2f}m).",
            applicable_threshold_m=max_d,
            actual_depth_m=d,
            flow_velocity_mps=flood_condition.flow_velocity_mps,
            source_classification=flood_condition.depth_source,
            scenario_id=flood_condition.depth_scenario_id,
            cost_multiplier=1.0,
        )

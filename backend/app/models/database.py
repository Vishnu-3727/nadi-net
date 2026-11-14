import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, JSON
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class ScenarioRunRecord(Base):
    __tablename__ = "scenario_runs"

    id = Column(String, primary_key=True)
    scenario_name = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    rainfall_intensity_mm = Column(Float, nullable=False)
    water_level_index = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Aggregated metrics
    total_affected_zones = Column(Integer, default=0)
    critical_zones_count = Column(Integer, default=0)
    estimated_exposed_population = Column(Integer, default=0)
    assigned_teams_count = Column(Integer, default=0)
    blocked_roads_count = Column(Integer, default=0)
    operational_hospitals_count = Column(Integer, default=0)
    
    # Detailed states serialized as JSON
    zone_assessments_json = Column(JSON, nullable=True)
    allocations_json = Column(JSON, nullable=True)
    blocked_edges_json = Column(JSON, nullable=True)
    notes = Column(Text, nullable=True)

class ActivityLogRecord(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    action_type = Column(String, nullable=False)  # e.g., "SCENARIO_TRIGGERED", "OPTIMISATION_COMPLETED", "ROAD_BLOCKED"
    severity = Column(String, default="INFO")    # "INFO", "WARNING", "CRITICAL"
    message = Column(Text, nullable=False)
    details_json = Column(JSON, nullable=True)
    provenance = Column(String, default="SYSTEM_AUDIT")

class StoredScenarioRecord(Base):
    __tablename__ = "stored_scenarios"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    rainfall_intensity_mm = Column(Float, nullable=False)
    water_level_index = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    blocked_edge_ids_json = Column(JSON, nullable=True)
    available_rescue_teams = Column(Integer, default=10)
    available_inflatable_boats = Column(Integer, default=12)
    available_food_packets = Column(Integer, default=5000)
    available_drinking_water_litres = Column(Integer, default=10000)
    available_medical_kits = Column(Integer, default=500)
    is_active = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)

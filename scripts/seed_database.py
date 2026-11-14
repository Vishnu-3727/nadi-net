import sys
from pathlib import Path

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from backend.app.database.session import init_db, SessionLocal
from backend.app.services.scenario_simulation.simulator import simulator_service

def seed():
    print("=" * 60)
    print("NADI-NET — Database & Offline Demonstration Initializer")
    print("=" * 60)
    
    print("[1/3] Initializing SQLite database schema...")
    init_db()
    print("      Database tables created.")

    print("[2/3] Loading verified Chennai geospatial datasets...")
    print(f"      Data directory: {simulator_service.data_dir}")
    print(f"      Scenarios available: {len(simulator_service.scenarios_list)}")

    print("[3/3] Executing baseline simulation (Scenario A - Moderate Flooding)...")
    db = SessionLocal()
    try:
        state = simulator_service.run_simulation(db, scenario_id="SCN-A")
        print("      Baseline simulation executed successfully.")
        print(f"      Run ID: {state['run_id']}")
        print(f"      Total Affected Zones: {state['risk_summary']['total_zones']}")
        print(f"      Total Exposed Population: {state['risk_summary']['total_exposed_population']:,}")
        print(f"      Assigned Rescue Teams: {state['allocations']['total_assigned_teams']}")
        print(f"      Operational Hospitals: {state['facilities']['operational_hospitals']}/{state['facilities']['total_hospitals']}")
    finally:
        db.close()

    print("=" * 60)
    print("NADI-NET is ready for live offline demonstration.")
    print("=" * 60)

if __name__ == "__main__":
    seed()

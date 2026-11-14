import subprocess
import sys
import time
from pathlib import Path

def main():
    root = Path(__file__).resolve().parent.parent
    print(f"[*] Setting up NADI-NET in: {root}")
    
    # 1. Seed database
    print("\n[*] Seeding database...")
    subprocess.run([sys.executable, str(root / "scripts" / "seed_database.py")], check=True)

    print("\n[+] Setup complete.")
    print("To run backend:")
    print("    python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload")
    print("To run frontend:")
    print("    cd frontend && npm run dev")

if __name__ == "__main__":
    main()

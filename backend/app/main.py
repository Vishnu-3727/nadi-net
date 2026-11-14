import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import settings
from backend.app.database.session import init_db, SessionLocal
from backend.app.api.api_router import api_router
from backend.app.services.scenario_simulation.simulator import simulator_service

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("nadi-net")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing NADI-NET Database and Baseline Chennai Scenario...")
    init_db()
    # Initialize default simulation run
    db = SessionLocal()
    try:
        simulator_service.run_simulation(db, scenario_id="SCN-A")
        logger.info("Baseline Scenario A (Moderate Monsoon Flooding) loaded successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize baseline simulation: {e}")
    finally:
        db.close()
    yield
    logger.info("NADI-NET System shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)

@app.get("/")
def root():
    return {
        "title": "NADI-NET Disaster Operations API",
        "version": settings.VERSION,
        "docs_url": "/docs",
        "api_v1": settings.API_V1_PREFIX,
        "status": "OPERATIONAL"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)

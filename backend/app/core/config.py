from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "NADI-NET"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"
    DESCRIPTION: str = "AI-Driven Urban Flood Response Intelligence and Emergency Resource Optimisation System for Chennai"
    
    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    PROJECT_ROOT: Path = BASE_DIR.parent
    DATA_DIR: Path = PROJECT_ROOT / "data" / "demo"
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'nadi_net.db'}"
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "NADI-NET"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"
    DESCRIPTION: str = "AI-Driven Urban Flood Response Intelligence and Emergency Resource Optimisation System for Chennai"
    
    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    PROJECT_ROOT: Path = BASE_DIR.parent
    DATA_DIR: Path = PROJECT_ROOT / "data" / "demo"
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'nadi_net.db'}"
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()


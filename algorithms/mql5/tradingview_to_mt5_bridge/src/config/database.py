import logging
import os
from pathlib import Path
from typing import Dict, Optional

from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(env_path)

logger = logging.getLogger(__name__)


def _load_db_config() -> Optional[Dict[str, str]]:
    """Load database configuration from environment variables."""
    keys = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"]
    config: Dict[str, str] = {}
    missing = []

    for key in keys:
        value = os.getenv(key)
        if value:
            config[key.lower().replace("db_", "")] = value
        else:
            missing.append(key)

    if missing:
        logger.warning(
            "Missing database environment variables: %s. Falling back to local SQLite database.",
            ", ".join(missing),
        )
        return None

    return config


def _build_sqlite_url() -> str:
    """Create a persistent SQLite database URL for local development/tests."""
    data_dir = Path(__file__).resolve().parent.parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    sqlite_path = data_dir / "trading_bridge.sqlite"
    return f"sqlite:///{sqlite_path}"


def _build_postgres_url(config: Dict[str, str]) -> str:
    """Construct a PostgreSQL connection string from configuration values."""
    return (
        f"postgresql://{config['user']}:{config['password']}"
        f"@{config['host']}:{config['port']}/{config['name']}"
        "?connect_timeout=10"
    )


_db_config = _load_db_config()
if _db_config is not None:
    DATABASE_URL = _build_postgres_url(_db_config)
else:
    DATABASE_URL = _build_sqlite_url()

# Log connection details (excluding sensitive info)
logger.info("Database Connection Details:")
if _db_config is not None:
    logger.info("Using PostgreSQL backend at %s:%s/%s", _db_config["host"], _db_config["port"], _db_config["name"])
else:
    logger.info("Using local SQLite backend at %s", DATABASE_URL)
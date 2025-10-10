import os
from pathlib import Path

from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent.parent / '.env'
load_dotenv(env_path)

_DEFAULTS = {
    'MT5_ACCOUNT': '0',
    'MT5_PASSWORD': 'test-password',
    'MT5_SERVER': 'demo-server',
}


def _get_env_value(key: str) -> str:
    value = os.getenv(key)
    if value:
        return value

    default = _DEFAULTS.get(key)
    if default is not None:
        # Provide deterministic defaults so offline tests can run.
        return default

    raise ValueError(f"Missing required environment variable: {key}")


MT5_CONFIG = {
    'account': int(_get_env_value('MT5_ACCOUNT')),
    'password': _get_env_value('MT5_PASSWORD'),
    'server': _get_env_value('MT5_SERVER'),
}
"""Testing helpers compatible with ``from flask.testing import FlaskClient`` imports."""
from __future__ import annotations

from .app import FlaskClient

__all__ = ["FlaskClient"]

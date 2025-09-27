"""Pytest configuration for Dynamic Capital Python algorithms."""

from __future__ import annotations

import sys
from pathlib import Path

# Ensure the project root is importable so ``import algorithms`` resolves to this repository.
ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

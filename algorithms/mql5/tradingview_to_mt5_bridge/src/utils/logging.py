"""Centralised logging configuration for the bridge."""
from __future__ import annotations

import logging
import sys
from typing import Optional


def configure_logging(level: str = "INFO") -> None:
    """Configure root logging handlers only once."""
    if logging.getLogger().handlers:
        return

    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )


def get_logger(name: Optional[str] = None) -> logging.Logger:
    """Helper to fetch a configured logger."""
    return logging.getLogger(name)


__all__ = ["configure_logging", "get_logger"]

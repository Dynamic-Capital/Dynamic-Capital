"""Compatibility shim for the Grok model."""

from __future__ import annotations

import haiku as hk

if getattr(hk, "IS_STUB", False):
    from model_stub import *  # noqa: F401,F403
else:
    from model_real import *  # noqa: F401,F403

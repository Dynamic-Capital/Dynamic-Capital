"""Dynamic playbook facade for governance utilities."""

from __future__ import annotations

from dynamic.governance.ags.dynamic_ags import (
    DEFAULT_DYNAMIC_AGS_ENTRIES,
    build_dynamic_ags_playbook,
)

__all__ = ["DEFAULT_DYNAMIC_AGS_ENTRIES", "build_dynamic_ags_playbook"]

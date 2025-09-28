"""Base helper utilities for converting insights into digests."""

from __future__ import annotations

from dynamic_agents._insight import AgentInsight, Number

__all__ = ["InsightHelper"]


class InsightHelper:
    """Transform :class:`AgentInsight` payloads into human-readable summaries."""

    def __init__(self, *, tagline: str | None = None) -> None:
        self._tagline = tagline

    @property
    def tagline(self) -> str | None:
        return self._tagline

    def compose_digest(self, insight: AgentInsight) -> str:
        """Render the supplied insight as a formatted string."""

        lines: list[str] = []
        if self._tagline:
            lines.append(self._tagline)
        lines.append(f"{insight.title} ({insight.generated_at.isoformat()})")
        if insight.metrics:
            lines.append("Key metrics:")
            for key, value in sorted(insight.metrics.items()):
                lines.append(f"  • {self._format_metric(key, value)}")
        if insight.highlights:
            lines.append("Highlights:")
            for highlight in insight.highlights:
                lines.append(f"  - {highlight}")
        return "\n".join(lines)

    def _format_metric(self, key: str, value: Number) -> str:
        label = key.replace("_", " ").title()
        if isinstance(value, bool):
            formatted = "Yes" if value else "No"
        elif isinstance(value, int) and not isinstance(value, bool):
            formatted = f"{value:,}"
        else:
            formatted = f"{float(value):.2f}"
        return f"{label}: {formatted}"

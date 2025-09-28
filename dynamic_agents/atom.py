"""Dynamic atom orchestration agent."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, Sequence

from dynamic_agents._insight import AgentInsight, utcnow
from dynamic_atom.atom import (
    AtomicComposition,
    AtomSnapshot,
    DynamicAtom,
    ElectronShell,
    ExcitationResult,
    RelaxationResult,
    TransitionLogEntry,
)

__all__ = ["AtomAgentInsight", "DynamicAtomAgent"]

_DEFAULT_COMPOSITION = AtomicComposition(symbol="He", protons=2, neutrons=2, electrons=2)


@dataclass(slots=True)
class AtomAgentInsight:
    """Typed accessors around atom insight payloads."""

    raw: AgentInsight
    snapshot: AtomSnapshot
    history: tuple[TransitionLogEntry, ...]


class DynamicAtomAgent:
    """Coordinate :class:`DynamicAtom` simulations and observations."""

    domain = "Dynamic Atom"

    def __init__(
        self,
        composition: AtomicComposition | Mapping[str, object] | None = None,
        *,
        engine: DynamicAtom | None = None,
    ) -> None:
        if engine is not None:
            self._engine = engine
        else:
            resolved = self._coerce_composition(composition)
            self._engine = DynamicAtom(resolved)

    @property
    def engine(self) -> DynamicAtom:
        return self._engine

    def _coerce_composition(
        self, composition: AtomicComposition | Mapping[str, object] | None
    ) -> AtomicComposition:
        if composition is None:
            return _DEFAULT_COMPOSITION
        if isinstance(composition, AtomicComposition):
            return composition
        if not isinstance(composition, Mapping):
            raise TypeError("composition must be AtomicComposition or mapping")
        return AtomicComposition(**composition)

    # ------------------------------------------------------------------
    # state transitions

    def excite(self, energy_ev: float) -> ExcitationResult:
        return self._engine.excite(energy_ev)

    def relax(self) -> RelaxationResult:
        return self._engine.relax()

    def snapshot(self) -> AtomSnapshot:
        return self._engine.snapshot()

    # ------------------------------------------------------------------
    # insight synthesis

    def _shell_summary(self, shells: Sequence[ElectronShell]) -> tuple[str, float]:
        dominant = max(shells, key=lambda shell: shell.occupancy_ratio)
        return dominant.name, dominant.occupancy_ratio

    def generate_insight(self) -> AgentInsight:
        snapshot = self._engine.snapshot()
        history = self._engine.history
        shells = tuple(self._engine.iter_shells())
        dominant_shell, dominant_ratio = self._shell_summary(shells)
        metrics = {
            "excitation_energy_ev": float(snapshot.excitation_energy_ev),
            "shells": float(len(shells)),
            "history_events": float(len(history)),
            "dominant_shell_ratio": float(dominant_ratio),
        }
        highlights = [
            f"Dominant shell {dominant_shell} occupancy at {dominant_ratio:.2f}",
        ]
        if snapshot.excitation_energy_ev == 0.0:
            highlights.append("Atom is at ground state configuration.")
        details = {
            "snapshot": snapshot,
            "history": history,
        }
        return AgentInsight(
            domain=self.domain,
            generated_at=utcnow(),
            title=f"Atomic State for {snapshot.symbol}",
            metrics=metrics,
            highlights=tuple(highlights),
            details=details,
        )

    def detailed_insight(self) -> AtomAgentInsight:
        raw = self.generate_insight()
        snapshot = raw.details.get("snapshot") if raw.details else None
        history = raw.details.get("history") if raw.details else ()
        if not isinstance(snapshot, AtomSnapshot):
            snapshot = self._engine.snapshot()
        return AtomAgentInsight(
            raw=raw,
            snapshot=snapshot,
            history=tuple(history) if isinstance(history, Sequence) else self._engine.history,
        )

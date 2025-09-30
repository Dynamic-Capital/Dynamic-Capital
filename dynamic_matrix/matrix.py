"""High-level matrix modelling primitives and orchestration engine."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from math import fsum, sqrt
from types import MappingProxyType
from typing import Callable, Iterable, Iterator, Mapping, MutableMapping, Sequence

__all__ = [
    "CellUpdateMode",
    "DynamicMatrixEngine",
    "MatrixBlueprint",
    "MatrixCellUpdate",
    "MatrixSnapshot",
    "MatrixSummary",
]


# ---------------------------------------------------------------------------
# helper utilities


def _normalise_name(value: str, *, field_name: str = "value") -> str:
    text = str(value).strip()
    if not text:
        raise ValueError(f"{field_name} must not be empty")
    return text


def _identifier(value: str) -> str:
    return _normalise_name(value, field_name="identifier").lower()


def _ensure_dimension(value: int, *, field_name: str) -> int:
    if not isinstance(value, int):
        raise TypeError(f"{field_name} must be an integer")
    if value <= 0:
        raise ValueError(f"{field_name} must be greater than zero")
    return value


def _normalise_labels(
    labels: Sequence[str] | None,
    *,
    expected: int,
    fallback_prefix: str,
    field_name: str,
) -> tuple[str, ...]:
    if labels is None:
        return tuple(f"{fallback_prefix}{index + 1}" for index in range(expected))
    cleaned: list[str] = []
    seen: set[str] = set()
    for index, label in enumerate(labels):
        if index >= expected:
            raise ValueError(
                f"{field_name} provided too many labels (expected {expected})"
            )
        normalised = _normalise_name(label, field_name=f"{field_name}[{index}]")
        lowered = normalised.lower()
        if lowered in seen:
            raise ValueError(f"{field_name} contains duplicate label: {normalised}")
        seen.add(lowered)
        cleaned.append(normalised)
    if len(cleaned) != expected:
        raise ValueError(
            f"{field_name} must contain exactly {expected} labels, got {len(cleaned)}"
        )
    return tuple(cleaned)


def _normalise_metadata(
    metadata: Mapping[str, float] | None,
) -> Mapping[str, float] | None:
    if metadata is None:
        return None
    if isinstance(metadata, MappingProxyType):
        return metadata
    if not isinstance(metadata, Mapping):
        raise TypeError("metadata must be a mapping if provided")
    normalised: dict[str, float] = {}
    for key, value in metadata.items():
        normalised[str(key)] = float(value)
    return MappingProxyType(normalised)


# ---------------------------------------------------------------------------
# data models


class CellUpdateMode(str, Enum):
    """Available strategies for updating a matrix cell."""

    SET = "set"
    ADD = "add"
    SCALE = "scale"


@dataclass(slots=True)
class MatrixBlueprint:
    """Configuration for provisioning a matrix in the engine."""

    name: str
    rows: int
    columns: int
    default_value: float = 0.0
    row_labels: Sequence[str] | None = None
    column_labels: Sequence[str] | None = None
    metadata: Mapping[str, float] | None = None

    def __post_init__(self) -> None:
        self.name = _normalise_name(self.name, field_name="name")
        self.rows = _ensure_dimension(self.rows, field_name="rows")
        self.columns = _ensure_dimension(self.columns, field_name="columns")
        self.default_value = float(self.default_value)
        self.row_labels = _normalise_labels(
            self.row_labels,
            expected=self.rows,
            fallback_prefix="row",
            field_name="row_labels",
        )
        self.column_labels = _normalise_labels(
            self.column_labels,
            expected=self.columns,
            fallback_prefix="col",
            field_name="column_labels",
        )
        self.metadata = _normalise_metadata(self.metadata)

    @property
    def identifier(self) -> str:
        return _identifier(self.name)

    @property
    def shape(self) -> tuple[int, int]:
        return (self.rows, self.columns)


@dataclass(slots=True)
class MatrixCellUpdate:
    """Mutable change request targeting a single matrix cell."""

    row: int
    column: int
    value: float
    mode: CellUpdateMode = CellUpdateMode.SET

    def __post_init__(self) -> None:
        if not isinstance(self.row, int):
            raise TypeError("row must be an integer")
        if not isinstance(self.column, int):
            raise TypeError("column must be an integer")
        if self.row < 0 or self.column < 0:
            raise ValueError("row and column must be non-negative")
        self.value = float(self.value)
        if not isinstance(self.mode, CellUpdateMode):
            try:
                self.mode = CellUpdateMode(str(self.mode))
            except ValueError as exc:  # pragma: no cover - defensive
                raise ValueError(f"unsupported update mode: {self.mode}") from exc


@dataclass(frozen=True, slots=True)
class MatrixSnapshot:
    """Immutable view of a matrix managed by the engine."""

    name: str
    rows: int
    columns: int
    values: tuple[tuple[float, ...], ...]
    row_labels: tuple[str, ...] = field(repr=False)
    column_labels: tuple[str, ...] = field(repr=False)
    metadata: Mapping[str, float] | None = field(default=None, repr=False)

    @classmethod
    def from_blueprint(cls, blueprint: MatrixBlueprint) -> "MatrixSnapshot":
        values = tuple(
            tuple(float(blueprint.default_value) for _ in range(blueprint.columns))
            for _ in range(blueprint.rows)
        )
        return cls(
            name=blueprint.name,
            rows=blueprint.rows,
            columns=blueprint.columns,
            values=values,
            row_labels=tuple(blueprint.row_labels),
            column_labels=tuple(blueprint.column_labels),
            metadata=_normalise_metadata(blueprint.metadata),
        )

    @property
    def identifier(self) -> str:
        return _identifier(self.name)

    @property
    def shape(self) -> tuple[int, int]:
        return (self.rows, self.columns)

    def cell(self, row: int, column: int) -> float:
        return self.values[row][column]

    def row(self, index: int) -> tuple[float, ...]:
        return self.values[index]

    def column(self, index: int) -> tuple[float, ...]:
        return tuple(row[index] for row in self.values)

    def iter_values(self) -> Iterator[float]:
        for row in self.values:
            yield from row

    def as_dict(self) -> dict[str, object]:
        return {
            "name": self.name,
            "rows": self.rows,
            "columns": self.columns,
            "values": [list(row) for row in self.values],
            "row_labels": list(self.row_labels),
            "column_labels": list(self.column_labels),
            "metadata": dict(self.metadata or {}),
        }

    def with_values(
        self,
        values: Sequence[Sequence[float]],
        *,
        metadata: Mapping[str, float] | None = None,
    ) -> "MatrixSnapshot":
        normalised_values: tuple[tuple[float, ...], ...] = tuple(
            tuple(float(cell) for cell in row)
            for row in values
        )
        if len(normalised_values) != self.rows:
            raise ValueError(
                f"expected {self.rows} rows, got {len(normalised_values)}"
            )
        for row in normalised_values:
            if len(row) != self.columns:
                raise ValueError(
                    f"expected {self.columns} columns, got {len(row)}"
                )
        return MatrixSnapshot(
            name=self.name,
            rows=self.rows,
            columns=self.columns,
            values=normalised_values,
            row_labels=self.row_labels,
            column_labels=self.column_labels,
            metadata=_normalise_metadata(metadata) if metadata is not None else self.metadata,
        )


@dataclass(frozen=True, slots=True)
class MatrixSummary:
    """Aggregate statistics describing a matrix."""

    row_totals: tuple[float, ...]
    column_totals: tuple[float, ...]
    total: float
    mean: float
    frobenius_norm: float
    minimum: float
    maximum: float

    @classmethod
    def from_snapshot(cls, snapshot: MatrixSnapshot) -> "MatrixSummary":
        row_totals = tuple(fsum(row) for row in snapshot.values)
        column_totals = tuple(
            fsum(snapshot.values[row_index][column_index] for row_index in range(snapshot.rows))
            for column_index in range(snapshot.columns)
        )
        flattened = list(snapshot.iter_values())
        total = fsum(flattened)
        count = snapshot.rows * snapshot.columns
        mean = total / count if count else 0.0
        frobenius_norm = sqrt(fsum(value * value for value in flattened))
        minimum = min(flattened) if flattened else 0.0
        maximum = max(flattened) if flattened else 0.0
        return cls(
            row_totals=row_totals,
            column_totals=column_totals,
            total=total,
            mean=mean,
            frobenius_norm=frobenius_norm,
            minimum=minimum,
            maximum=maximum,
        )

    def as_dict(self) -> dict[str, object]:
        return {
            "row_totals": list(self.row_totals),
            "column_totals": list(self.column_totals),
            "total": self.total,
            "mean": self.mean,
            "frobenius_norm": self.frobenius_norm,
            "minimum": self.minimum,
            "maximum": self.maximum,
        }


# ---------------------------------------------------------------------------
# orchestration engine


class DynamicMatrixEngine:
    """Manage the lifecycle of matrices and provide transformation utilities."""

    def __init__(self) -> None:
        self._matrices: MutableMapping[str, MatrixSnapshot] = {}

    # ------------------------------------------------------------------ retrieval
    def list_matrices(self) -> tuple[str, ...]:
        return tuple(sorted(self._matrices))

    def get_matrix(self, name: str) -> MatrixSnapshot:
        identifier = _identifier(name)
        try:
            return self._matrices[identifier]
        except KeyError as exc:
            raise KeyError(f"matrix '{name}' is not registered") from exc

    # ---------------------------------------------------------------- provisioning
    def register_matrix(
        self,
        blueprint: MatrixBlueprint | Mapping[str, object],
        *,
        overwrite: bool = False,
    ) -> MatrixSnapshot:
        if isinstance(blueprint, Mapping):
            blueprint = MatrixBlueprint(**blueprint)
        identifier = blueprint.identifier
        if not overwrite and identifier in self._matrices:
            raise ValueError(f"matrix '{blueprint.name}' already exists")
        snapshot = MatrixSnapshot.from_blueprint(blueprint)
        self._matrices[identifier] = snapshot
        return snapshot

    def delete_matrix(self, name: str) -> None:
        identifier = _identifier(name)
        self._matrices.pop(identifier, None)

    # ------------------------------------------------------------------- mutation
    def _mutate(
        self,
        name: str,
        mutator: Callable[[list[list[float]]], None],
        *,
        metadata: Mapping[str, float] | None = None,
    ) -> MatrixSnapshot:
        snapshot = self.get_matrix(name)
        working = [list(row) for row in snapshot.values]
        mutator(working)
        new_snapshot = snapshot.with_values(working, metadata=metadata)
        self._matrices[snapshot.identifier] = new_snapshot
        return new_snapshot

    def update_cell(self, name: str, update: MatrixCellUpdate) -> MatrixSnapshot:
        def mutator(working: list[list[float]]) -> None:
            if update.row >= len(working) or update.column >= len(working[0]):
                raise IndexError("cell update out of matrix bounds")
            if update.mode is CellUpdateMode.SET:
                working[update.row][update.column] = update.value
            elif update.mode is CellUpdateMode.ADD:
                working[update.row][update.column] += update.value
            elif update.mode is CellUpdateMode.SCALE:
                working[update.row][update.column] *= update.value
            else:  # pragma: no cover - defensive
                raise ValueError(f"unsupported update mode: {update.mode}")

        return self._mutate(name, mutator)

    def apply_updates(
        self,
        name: str,
        updates: Iterable[MatrixCellUpdate | Mapping[str, object]],
        *,
        metadata: Mapping[str, float] | None = None,
    ) -> MatrixSnapshot:
        normalised_updates: list[MatrixCellUpdate] = []
        for item in updates:
            if isinstance(item, MatrixCellUpdate):
                normalised_updates.append(item)
            else:
                normalised_updates.append(MatrixCellUpdate(**item))

        def mutator(working: list[list[float]]) -> None:
            for update in normalised_updates:
                if update.row >= len(working) or update.column >= len(working[0]):
                    raise IndexError("cell update out of matrix bounds")
                if update.mode is CellUpdateMode.SET:
                    working[update.row][update.column] = update.value
                elif update.mode is CellUpdateMode.ADD:
                    working[update.row][update.column] += update.value
                elif update.mode is CellUpdateMode.SCALE:
                    working[update.row][update.column] *= update.value
                else:  # pragma: no cover - defensive
                    raise ValueError(f"unsupported update mode: {update.mode}")

        return self._mutate(name, mutator, metadata=metadata)

    def scale_matrix(
        self,
        name: str,
        factor: float,
        *,
        metadata: Mapping[str, float] | None = None,
    ) -> MatrixSnapshot:
        factor = float(factor)

        def mutator(working: list[list[float]]) -> None:
            for row_index, row in enumerate(working):
                for column_index, value in enumerate(row):
                    working[row_index][column_index] = value * factor

        return self._mutate(name, mutator, metadata=metadata)

    def blend_matrices(
        self,
        primary_name: str,
        secondary_name: str,
        *,
        alpha: float = 1.0,
        beta: float = 1.0,
        result_name: str | None = None,
        metadata: Mapping[str, float] | None = None,
    ) -> MatrixSnapshot:
        primary = self.get_matrix(primary_name)
        secondary = self.get_matrix(secondary_name)
        if primary.shape != secondary.shape:
            raise ValueError("matrices must share the same shape to blend")
        alpha = float(alpha)
        beta = float(beta)
        blended_values = [
            [
                alpha * primary.values[row][column] + beta * secondary.values[row][column]
                for column in range(primary.columns)
            ]
            for row in range(primary.rows)
        ]
        if result_name is None:
            return primary.with_values(blended_values, metadata=metadata)
        blueprint = MatrixBlueprint(
            name=result_name,
            rows=primary.rows,
            columns=primary.columns,
            default_value=0.0,
            row_labels=primary.row_labels,
            column_labels=primary.column_labels,
            metadata=metadata,
        )
        snapshot = MatrixSnapshot.from_blueprint(blueprint).with_values(
            blended_values, metadata=metadata
        )
        self._matrices[blueprint.identifier] = snapshot
        return snapshot

    # ------------------------------------------------------------------ analytics
    def summarise(self, name: str) -> MatrixSummary:
        snapshot = self.get_matrix(name)
        return MatrixSummary.from_snapshot(snapshot)

    def export(self, name: str) -> dict[str, object]:
        snapshot = self.get_matrix(name)
        summary = MatrixSummary.from_snapshot(snapshot)
        export_payload = snapshot.as_dict()
        export_payload["summary"] = summary.as_dict()
        return export_payload

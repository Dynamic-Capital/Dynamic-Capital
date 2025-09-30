from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[1]))

import pytest

from dynamic_matrix import (  # noqa: E402  - path mutation for test isolation
    CellUpdateMode,
    DynamicMatrixEngine,
    MatrixBlueprint,
    MatrixCellUpdate,
)


def test_register_and_summarise_matrix() -> None:
    engine = DynamicMatrixEngine()
    blueprint = MatrixBlueprint(
        name="Risk Grid",
        rows=2,
        columns=3,
        default_value=1.5,
        row_labels=("North", "South"),
        column_labels=("Alpha", "Beta", "Gamma"),
        metadata={"confidence": 0.72},
    )
    snapshot = engine.register_matrix(blueprint)

    assert snapshot.shape == (2, 3)
    assert snapshot.row_labels == ("North", "South")
    assert snapshot.column_labels == ("Alpha", "Beta", "Gamma")
    assert snapshot.metadata == {"confidence": 0.72}

    summary = engine.summarise("risk grid")
    assert summary.total == pytest.approx(9.0)
    assert summary.mean == pytest.approx(1.5)
    assert summary.row_totals == (pytest.approx(4.5), pytest.approx(4.5))
    assert summary.column_totals == (
        pytest.approx(3.0),
        pytest.approx(3.0),
        pytest.approx(3.0),
    )
    assert summary.frobenius_norm == pytest.approx(math.sqrt(13.5))


def test_apply_updates_and_scale_matrix() -> None:
    engine = DynamicMatrixEngine()
    engine.register_matrix(
        MatrixBlueprint(
            name="Signal",
            rows=3,
            columns=3,
            default_value=0.0,
        )
    )

    updates = [
        MatrixCellUpdate(row=0, column=0, value=5.0),
        {"row": 1, "column": 1, "value": 2.5, "mode": CellUpdateMode.ADD},
        {"row": 2, "column": 2, "value": 1.2, "mode": "scale"},
    ]
    snapshot = engine.apply_updates("Signal", updates)
    assert snapshot.cell(0, 0) == pytest.approx(5.0)
    assert snapshot.cell(1, 1) == pytest.approx(2.5)
    # scaling should keep zero intact
    assert snapshot.cell(2, 2) == pytest.approx(0.0)

    scaled = engine.scale_matrix("signal", 0.5, metadata={"scaled": 1.0})
    assert scaled.cell(0, 0) == pytest.approx(2.5)
    assert scaled.metadata == {"scaled": 1.0}

    exported = engine.export("Signal")
    assert exported["summary"]["total"] == pytest.approx(2.5 + 1.25)


def test_blend_matrices_creates_new_snapshot() -> None:
    engine = DynamicMatrixEngine()
    primary = engine.register_matrix(
        MatrixBlueprint(name="Primary", rows=2, columns=2, default_value=1.0)
    )
    secondary = engine.register_matrix(
        MatrixBlueprint(name="Secondary", rows=2, columns=2, default_value=2.0)
    )

    engine.update_cell("Primary", MatrixCellUpdate(row=0, column=1, value=3.0))
    engine.update_cell("Secondary", MatrixCellUpdate(row=1, column=0, value=4.0))

    blended = engine.blend_matrices(
        "primary",
        "secondary",
        alpha=0.5,
        beta=0.5,
        result_name="Combined",
        metadata={"alpha": 0.5, "beta": 0.5},
    )

    assert blended.name == "Combined"
    assert blended.cell(0, 0) == pytest.approx(1.5)
    assert blended.cell(0, 1) == pytest.approx(2.5)
    assert blended.cell(1, 0) == pytest.approx(2.5)
    assert blended.cell(1, 1) == pytest.approx(1.5)
    assert engine.get_matrix("combined").metadata == {"alpha": 0.5, "beta": 0.5}

    summary = engine.summarise("Combined")
    assert summary.maximum == pytest.approx(2.5)

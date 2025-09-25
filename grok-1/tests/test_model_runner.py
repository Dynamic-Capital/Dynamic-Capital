"""Regression tests for the Grok model runner sizing helpers."""

from __future__ import annotations

import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

# Ensure the Grok reference implementation modules are importable.
GROK_PATH = Path(__file__).resolve().parents[2] / "grok-1"
if str(GROK_PATH) not in sys.path:
    sys.path.insert(0, str(GROK_PATH))

jax = pytest.importorskip("jax")  # noqa: F401  # pragma: no cover - dependency guard
haiku = pytest.importorskip("haiku")  # noqa: F401  # pragma: no cover - dependency guard

import runners  # type: ignore  # noqa: E402


class _IdentityTransform:
    def __init__(self, fn):
        self._fn = fn

    def apply(self, *args, **kwargs):  # pragma: no cover - behaviour is trivial
        return self._fn(*args, **kwargs)


class _DummyModel:
    def __init__(self) -> None:
        self.fprop_dtype = None
        self.sequence_len = 16
        self.vocab_size = 32
        self.eos_token = 0

    def initialize(self) -> None:
        pass

    def make(self, *, mesh):  # noqa: D401 - signature mirrors real model
        def _forward(tokens):
            return SimpleNamespace(logits=None, model_state=None)

        return _forward


def _patch_runtime(monkeypatch: pytest.MonkeyPatch, *, local_devices: int) -> None:
    monkeypatch.setattr(runners, "make_mesh", lambda *args, **kwargs: object())
    monkeypatch.setattr(runners.hk, "transform", lambda fn: _IdentityTransform(fn))
    monkeypatch.setattr(runners.jax, "local_devices", lambda: [object()] * local_devices)
    monkeypatch.setattr(runners.jax, "process_count", lambda: 1)


def test_initialize_clamps_batch_size_on_single_device(monkeypatch: pytest.MonkeyPatch) -> None:
    _patch_runtime(monkeypatch, local_devices=1)
    runner = runners.ModelRunner(model=_DummyModel(), bs_per_device=0.125)

    runner.initialize({}, local_mesh_config=(1, 1), between_hosts_config=(1, 1))

    assert runner.batch_size == 1
    assert runner.local_batch_size == 1


def test_initialize_requires_devices(monkeypatch: pytest.MonkeyPatch) -> None:
    _patch_runtime(monkeypatch, local_devices=0)
    runner = runners.ModelRunner(model=_DummyModel(), bs_per_device=0.125)

    with pytest.raises(RuntimeError, match="requires at least one JAX device"):
        runner.initialize({}, local_mesh_config=(1, 1), between_hosts_config=(1, 1))

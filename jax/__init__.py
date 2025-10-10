"""Lightweight stub of the :mod:`jax` package for unit tests.

The real JAX stack is not available in the execution environment used by the
tests.  Only a very small portion of its surface is required, so this stub
provides enough structure for modules that depend on JAX to be imported and for
the tests in ``grok-1`` to exercise their control flow.
"""

from __future__ import annotations

import types
from typing import Any, Callable, Iterable, Tuple

import numpy as _np

Array = _np.ndarray


def _asarray(value: Any) -> _np.ndarray:
    return _np.asarray(value)


class _NumpyModule(types.ModuleType):
    bfloat16 = _np.float32  # Pragmatic stand-in for tests

    def __getattr__(self, name: str) -> Any:
        return getattr(_np, name)


numpy = _NumpyModule("jax.numpy")


class _RandomModule(types.ModuleType):
    def PRNGKey(self, seed: int) -> int:
        return seed

    def categorical(self, rng: int, logits: _np.ndarray) -> int:  # noqa: ARG002 - deterministic stub
        return int(_np.argmax(logits))


random = _RandomModule("jax.random")


class _NnModule(types.ModuleType):
    def softmax(self, logits: _np.ndarray, axis: int = -1) -> _np.ndarray:
        exps = _np.exp(logits - _np.max(logits, axis=axis, keepdims=True))
        return exps / _np.sum(exps, axis=axis, keepdims=True)


nn = _NnModule("jax.nn")


class _LaxModule(types.ModuleType):
    def dynamic_update_index_in_dim(self, array, update, index: int, axis: int = 0):
        array = _np.array(array, copy=True)
        update = _np.asarray(update)
        slicer = [slice(None)] * array.ndim
        slicer[axis] = index
        array[tuple(slicer)] = update
        return array

    def sort(self, array, is_stable: bool = False):  # noqa: ARG002 - stability ignored in stub
        return _np.sort(array, axis=-1)

    def top_k(self, array, k: int):
        idx = _np.argpartition(array, -k, axis=-1)[..., -k:]
        top_values = _np.take_along_axis(array, idx, axis=-1)
        order = _np.argsort(-top_values, axis=-1)
        sorted_idx = _np.take_along_axis(idx, order, axis=-1)
        sorted_vals = _np.take_along_axis(array, sorted_idx, axis=-1)
        return sorted_vals, sorted_idx

    def with_sharding_constraint(self, array, constraint):  # noqa: ARG002
        return array


lax = _LaxModule("jax.lax")


def tree_map(function: Callable[[Any], Any], tree: Any) -> Any:
    if isinstance(tree, (list, tuple)):
        return type(tree)(tree_map(function, item) for item in tree)
    if isinstance(tree, dict):
        return {key: tree_map(function, value) for key, value in tree.items()}
    return function(tree)


def local_devices() -> list[Any]:
    return [object()]


def devices() -> list[Any]:
    return local_devices()


def device_count() -> int:
    return len(local_devices())


def process_count() -> int:
    return 1


def make_array(data: Iterable[Any]) -> _np.ndarray:
    return _asarray(data)


# ---------------------------------------------------------------------------
# Config and tree utilities
# ---------------------------------------------------------------------------


class _Config(types.SimpleNamespace):
    def update(self, key: str, value: Any) -> None:  # pragma: no cover - simple setter
        setattr(self, key, value)


config = _Config()


class _TreeUtil(types.ModuleType):
    class DictKey:
        def __init__(self, key: Any) -> None:
            self.key = key

    def register_pytree_node(self, cls, flatten_func, unflatten_func) -> None:  # noqa: ARG002
        return None

    def tree_flatten(self, tree: Any) -> Tuple[list[Any], None]:
        if isinstance(tree, dict):
            items = []
            for key, value in tree.items():
                items.extend(self.tree_flatten(value)[0])
            return items, None
        if isinstance(tree, (list, tuple)):
            flattened = []
            for element in tree:
                flattened.extend(self.tree_flatten(element)[0])
            return flattened, None
        return [tree], None


tree_util = _TreeUtil("jax.tree_util")


# Populate submodules so ``import jax.numpy as jnp`` style imports succeed.
import sys as _sys

_sys.modules[__name__ + ".numpy"] = numpy
_sys.modules[__name__ + ".random"] = random
_sys.modules[__name__ + ".nn"] = nn
_sys.modules[__name__ + ".lax"] = lax
_sys.modules[__name__ + ".tree_util"] = tree_util


# Experimental namespace ----------------------------------------------------

from . import experimental  # noqa: E402  - imported for side effects
from . import sharding  # noqa: E402

__all__ = [
    "Array",
    "device_count",
    "devices",
    "local_devices",
    "process_count",
    "tree_map",
    "numpy",
    "random",
    "nn",
    "lax",
    "config",
    "tree_util",
    "experimental",
    "sharding",
]

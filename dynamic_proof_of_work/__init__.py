"""Dynamic proof-of-work primitives with adaptive difficulty."""

from .proof import DynamicProofOfWork, MiningResult, WorkSample

__all__ = [
    "DynamicProofOfWork",
    "MiningResult",
    "WorkSample",
]

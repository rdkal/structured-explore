"""The figures, as the counts the page draws them from: one builder per question kind in FIGURES, and the lineup. The
drawing is web/app.js, keyed by the same kind, so a figure is added with a builder here and a renderer there."""

from collections.abc import Callable

import numpy as np

from structured_explore.nulls import Band, shuffled
from structured_explore.stats import Count

Figure = Callable[[np.ndarray, np.ndarray | None, np.ndarray, Count, Band | None], dict]


def bar(A, B, defined, count: Count, band) -> dict:
    """A marginal: the share of outcomes in A with its interval."""
    lo, hi = count.interval
    return {"kind": "bar", "n": count.n, "N": count.N, "p": count.p, "lo": lo, "hi": hi}


def cells(A, B, defined) -> dict:
    """The four cells of A against B, as counts."""
    return {"nB": int((defined & B).sum()), "nNotB": int((defined & ~B).sum()),
            "nAB": int((defined & A & B).sum()), "nAnotB": int((defined & A & ~B).sum())}


def spine(A, B, defined, count: Count, band: Band | None) -> dict:
    """A joint or conditional: columns B and not B, as wide as their share; in each the part in A."""
    return {"kind": "spine", "N": int(defined.sum()), "pA": float(A[defined].mean()),
            "band": [band.lo, band.hi] if band else None, **cells(A, B, defined)}


def lineup(A, B, defined, rng: np.random.Generator, k: int = 20) -> dict:
    """k spine plots, one real, the rest with A shuffled; real is the real one's panel, 1-based."""
    real = int(rng.integers(k))
    panels = [cells(A if i == real else shuffled(A, defined, rng), B, defined) for i in range(k)]
    return {"real": real + 1, "panels": panels}


FIGURES: dict[str, Figure] = {"marginal": bar, "joint": spine, "conditional": spine}

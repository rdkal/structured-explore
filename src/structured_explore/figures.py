"""The figures, as the counts the page draws them from: one builder per question kind in FIGURES, and the lineup. The
drawing is web/app.js, keyed by the same kind, so a figure is added with a builder here and a renderer there."""

from collections.abc import Callable

import numpy as np

from structured_explore.concepts_base import Concept
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

EXPLAIN = {
    "bar": Concept(
        "bar", "The bar",
        "A marginal: the share of outcomes in A, as a bar from 0 to 1.",
        "The bar's length is n divided by N. The whisker is the interval.",
        "Read the length against the whole: 0.21 is a fifth of the outcomes. A whisker you can see means few outcomes.",
        "It shows one share. For what A goes with, see a spine plot.",
        see=["marginal", "interval"]),
    "spine": Concept(
        "spine", "The spine plot",
        "A joint or conditional: two columns, B and not B, each split into the part in A and the part not in A.",
        "Each column is as wide as its share of the outcomes, so area is count. The blue part's height is the share "
        "in A within that column: left, P(A | B); right, P(A | not B). The dashed line is P(A) over everything. The "
        "shaded band is the null: where the blue heights would fall if A had nothing to do with B.",
        "Compare the two blue heights. Level means independence; a step means B goes with A. Blue out of the band "
        "is outside the null. The bottom-left area is P(A and B). Hover a cell for its count.",
        "Heights hide counts: a narrow column is few outcomes and its height is noisy. The area is the honest size.",
        see=["conditional", "joint", "shuffle", "lineup"]),
    "lineup": Concept(
        "lineup", "The lineup",
        "The real spine plot hidden among 19 drawn from shuffled A.",
        "Each of the 19 is one shuffle of A's values, the same as the null uses, drawn like the real one. You click "
        "the one you think is real.",
        "If you pick it, your eye sees something the shuffles do not make. If you cannot, what you saw in the real "
        "plot is what chance looks like, whatever the chip says.",
        "Once you have seen the answer you cannot un-see it. Try the lineup before revealing, or trust your first "
        "pick only.",
        see=["spine", "shuffle"]),
}

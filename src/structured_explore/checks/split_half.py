"""Split-half stability: deal the days into two halves, ask the question of each, and see whether the two answers'
intervals overlap; R times. It detects variance, an answer that moves with the sample, not bias: a wrong answer that
every half agrees on passes."""

import numpy as np

from structured_explore.checks import Result
from structured_explore.questions import QUESTIONS

R = 20
# The share of splits whose halves must agree.
PASS = 0.9


def run(kind: str, A: np.ndarray, B: np.ndarray | None, defined: np.ndarray, day: np.ndarray | None,
        rng: np.random.Generator) -> Result | None:
    if day is None:
        return Result("split_half", None, "stable across halves: no days to split by")
    days = np.unique(day)
    if len(days) < 4:
        return Result("split_half", None, f"stable across halves: only {len(days)} days")
    agree, ps = 0, []
    for _ in range(R):
        first = np.isin(day, rng.permutation(days)[: len(days) // 2])
        a = QUESTIONS[kind](A, B, defined & first)
        b = QUESTIONS[kind](A, B, defined & ~first)
        agree += a.overlaps(b)
        ps += [a.p, b.p]
    ok = agree >= PASS * R
    return Result("split_half", ok,
                  f"stable across halves: {'yes' if ok else 'no'} ({agree} of {R} splits agree, halves range "
                  f"{np.nanmin(ps):.2f}–{np.nanmax(ps):.2f})")

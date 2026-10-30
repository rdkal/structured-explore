"""Split-half stability: deal the days into two halves, ask the question of each, and see whether the two answers'
intervals overlap; R times. It detects variance, an answer that moves with the sample, not bias: a wrong answer that
every half agrees on passes."""

import numpy as np

from structured_explore.checks import Result
from structured_explore.concepts_base import Concept
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


EXPLAIN = Concept(
    "split_half", "Stability: split half",
    "Whether the answer holds when asked of a different half of the days.",
    "Deal the days at random into two halves, whole days at a time. Ask the question of each half. The halves agree "
    "when their two intervals overlap. Do it 20 times; stable means 18 or more agree.",
    "A chip: stable or unstable, with the agreeing splits. Unstable with few outcomes: ask again on more days, or "
    "not at all. Unstable with thousands of outcomes: the outcomes are not independent draws, so the interval beside "
    "the answer is too narrow, and the halves' range is the honest spread.",
    "It detects variance, an answer that moves with the sample, not bias. A wrong answer that every half agrees on "
    "passes. It needs at least four days.",
    look="stable across halves: no (12 of 20 splits agree, halves range 0.17–0.24)", see=["interval", "days"])

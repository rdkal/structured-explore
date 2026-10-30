"""The questions one asks of events, each answered as a count n of N. Every kind takes the event A, the event B it is
asked against (ignored by a marginal) and the mask of outcomes where both are defined, so nulls and checks can ask the
same question of a shuffled or halved Ω."""

from collections.abc import Callable

import numpy as np

from structured_explore.concepts_base import Concept
from structured_explore.stats import Count

Answer = Callable[[np.ndarray, np.ndarray | None, np.ndarray], Count]


def marginal(A: np.ndarray, B: np.ndarray | None, defined: np.ndarray) -> Count:
    """P(A): of every outcome, how many are in A."""
    return Count(int(A[defined].sum()), int(defined.sum()))


def joint(A: np.ndarray, B: np.ndarray, defined: np.ndarray) -> Count:
    """P(A and B): of every outcome, how many are in both."""
    return Count(int((A & B)[defined].sum()), int(defined.sum()))


def conditional(A: np.ndarray, B: np.ndarray, defined: np.ndarray) -> Count:
    """P(A | B): of the outcomes in B, how many are in A."""
    mask = defined & B
    return Count(int(A[mask].sum()), int(mask.sum()))


QUESTIONS: dict[str, Answer] = {"marginal": marginal, "joint": joint, "conditional": conditional}

EXPLAIN = {
    "marginal": Concept(
        "marginal", "Marginal P(A)",
        "How often A, over every outcome.",
        "Count the outcomes in A, divide by all the outcomes where A is defined.",
        "The base rate. Every conditional on this page should be read against it: a conditional near the marginal "
        "says the given event tells you little.",
        "It says nothing about what A goes with.",
        look="P(A) = 0.21 [0.20, 0.22], 1877 of 9024", see=["count", "conditional"]),
    "joint": Concept(
        "joint", "Joint P(A and B)",
        "How often A and B together, over every outcome.",
        "Count the outcomes in both A and B, divide by all the outcomes where both are defined.",
        "The size of the overlap as a share of everything. If A and B had nothing to do with each other it would be "
        "about P(A) times P(B); the null band says what that looks like here.",
        "A small joint can still be a strong relation when B itself is rare. For that, ask the conditional.",
        look="P(A and B) = 0.05 [0.04, 0.05], 420 of 9024", see=["conditional", "shuffle"]),
    "conditional": Concept(
        "conditional", "Conditional P(A | B)",
        "How often A, among the outcomes in B only.",
        "Keep only the outcomes in B; count those also in A; divide by how many were kept. The denominator N is the "
        "outcomes in B, not all outcomes.",
        "Compare it with the marginal P(A): higher means B goes with more A, lower with less. The null band says how "
        "far from P(A) chance alone would take it with this many outcomes in B.",
        "It is not P(B | A), and it is not a cause. The graph says whether conditioning on B is allowed at all.",
        look="P(A | B) = 0.19 [0.17, 0.20], 420 of 2256", see=["marginal", "shuffle", "graph"]),
}

# The kinds whose answer has a reference under independence of A and B.
WITH_NULL = {"joint", "conditional"}

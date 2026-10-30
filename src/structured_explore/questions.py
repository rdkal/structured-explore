"""The questions one asks of events, each answered as a count n of N. Every kind takes the event A, the event B it is
asked against (ignored by a marginal) and the mask of outcomes where both are defined, so nulls and checks can ask the
same question of a shuffled or halved Ω."""

from collections.abc import Callable

import numpy as np

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

# The kinds whose answer has a reference under independence of A and B.
WITH_NULL = {"joint", "conditional"}

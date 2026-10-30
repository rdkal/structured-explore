"""The reference an answer is held against: what it would be if nothing were going on. A null takes the question's
kind, the events and the mask, and returns a band of answers under its hypothesis."""

from collections.abc import Callable
from dataclasses import dataclass

import numpy as np

from structured_explore.concepts_base import Concept
from structured_explore.questions import QUESTIONS

K = 200


@dataclass(frozen=True)
class Band:
    name: str
    lo: float
    hi: float
    # Every answer under the null, for lineups and figures.
    ps: np.ndarray

    def contains(self, p: float) -> bool:
        return self.lo <= p <= self.hi


Null = Callable[[str, np.ndarray, np.ndarray, np.ndarray, np.random.Generator], Band]


def shuffle(kind: str, A: np.ndarray, B: np.ndarray, defined: np.ndarray, rng: np.random.Generator, k: int = K) -> Band:
    """A and B independent: A's values are dealt out over the outcomes again, K times, and the question asked each time.
    The band is the 2.5th to 97.5th percentile of the answers."""
    ps = np.array([QUESTIONS[kind](shuffled(A, defined, rng), B, defined).p for _ in range(k)])
    lo, hi = np.percentile(ps, [2.5, 97.5])
    return Band("shuffle", float(lo), float(hi), ps)


def shuffled(A: np.ndarray, defined: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    """A with its values permuted among the defined outcomes."""
    out = A.copy()
    idx = np.flatnonzero(defined)
    out[idx] = A[rng.permutation(idx)]
    return out


NULLS: dict[str, Null] = {"shuffle": shuffle}

EXPLAIN = {
    "shuffle": Concept(
        "shuffle", "The null: shuffle",
        "What the answer would be if A had nothing to do with B: the reference every joint and conditional is held "
        "against.",
        "Take A's values, true or false per outcome, and deal them out over the outcomes again at random, so each "
        "outcome keeps its B but gets someone else's A. Ask the question of this shuffled Ω. Do it 200 times. The "
        "band is where the middle 95 % of those answers fell.",
        "The chip says outside or inside, and the band is shaded on the spine plot. Outside: an answer this far from "
        "the shuffled ones is not what chance makes with this many outcomes, so B tells you something about A. "
        "Inside: this much could be chance.",
        "Outside is not a cause, and not a size: with enough outcomes a tiny difference is outside. Read the "
        "difference from the marginal too. The shuffle treats outcomes as exchangeable; outcomes in time are not "
        "quite, so the band is a little too narrow.",
        look="null (shuffle): 0.20–0.22, answer outside", see=["conditional", "lineup", "split_half"]),
}

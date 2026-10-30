"""A count, n of N, and its interval."""

from dataclasses import dataclass
from math import sqrt


def wilson(n: int, N: int, z: float = 1.96) -> tuple[float, float]:
    """The 95 % Wilson score interval of a proportion n of N; (0, 1) when N is 0."""
    if N == 0:
        return 0.0, 1.0
    p = n / N
    denom = 1 + z * z / N
    centre = (p + z * z / (2 * N)) / denom
    half = z * sqrt(p * (1 - p) / N + z * z / (4 * N * N)) / denom
    return max(0.0, centre - half), min(1.0, centre + half)


@dataclass(frozen=True)
class Count:
    n: int
    N: int

    @property
    def p(self) -> float:
        return self.n / self.N if self.N else float("nan")

    @property
    def interval(self) -> tuple[float, float]:
        return wilson(self.n, self.N)

    def overlaps(self, other: "Count") -> bool:
        lo, hi = self.interval
        lo2, hi2 = other.interval
        return lo <= hi2 and lo2 <= hi

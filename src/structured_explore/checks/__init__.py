"""The stability checks, one module each. A check takes the question's kind, its events, the mask of outcomes where they
are defined, the day of each outcome and a random generator, and returns a Result, or None when it does not apply. Add a
check by writing its module and naming it here; the spec's `checks` picks which run."""

from dataclasses import dataclass
from collections.abc import Callable

import numpy as np


@dataclass(frozen=True)
class Result:
    name: str
    # True: passed, False: failed, None: could not be judged.
    ok: bool | None
    # One clause for the caption, e.g. "stable across halves: yes (19 of 20)".
    text: str


Check = Callable[[str, np.ndarray, np.ndarray | None, np.ndarray, np.ndarray | None, np.random.Generator], Result | None]

from structured_explore.checks import split_half  # noqa: E402

CHECKS: dict[str, Check] = {"split_half": split_half.run}

"""The events as boolean arrays over Ω, one value per outcome, in the order of the view omega, keyed by their where."""

from dataclasses import dataclass

import duckdb
import numpy as np

from structured_explore.spec import Spec


@dataclass
class Events:
    N: int
    # The day of each outcome, for splits by whole days; None when Ω has no time.
    day: np.ndarray | None
    # Per event's where: whether it holds, False where undefined, and whether it is defined, False where a variable
    # in it is null.
    values: dict[str, np.ndarray]
    defined: dict[str, np.ndarray]

    def true(self, where: str) -> int:
        return int(self.values[where].sum())

    def undefined(self, where: str) -> int:
        return int((~self.defined[where]).sum())


def evaluate(con: duckdb.DuckDBPyConnection, spec: Spec) -> Events:
    exprs = [f"({e.where}) as e{i}" for i, e in enumerate(spec.events)]
    if spec.sample_space.time:
        exprs = ["day"] + exprs
    if not exprs:
        return Events(con.execute("select count(*) from omega").fetchone()[0], None, {}, {})
    rows = con.execute(f"select {', '.join(exprs)} from omega order by all").fetchnumpy()
    day = np.array(rows["day"], dtype=object) if spec.sample_space.time else None
    values, defined = {}, {}
    for i, e in enumerate(spec.events):
        col = rows[f"e{i}"]
        if isinstance(col, np.ma.MaskedArray):
            defined[e.where] = ~np.ma.getmaskarray(col)
            values[e.where] = np.where(defined[e.where], col.filled(False), False).astype(bool)
        else:
            defined[e.where] = np.ones(len(col), dtype=bool)
            values[e.where] = col.astype(bool)
    N = len(day) if day is not None else len(next(iter(values.values())))
    return Events(N, day, values, defined)

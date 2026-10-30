"""The events as boolean arrays over Ω, one value per outcome, in the order of the view omega."""

from dataclasses import dataclass

import duckdb
import numpy as np

from structured_explore.spec import Spec


@dataclass
class Events:
    N: int
    # The Swedish day of each outcome, for splits by whole days; None when Ω has no time.
    day: np.ndarray | None
    # Per event: whether it holds, False where undefined, and whether it is defined, False where a variable is null.
    values: dict[str, np.ndarray]
    defined: dict[str, np.ndarray]

    def true(self, name: str) -> int:
        return int(self.values[name].sum())

    def undefined(self, name: str) -> int:
        return int((~self.defined[name]).sum())


def evaluate(con: duckdb.DuckDBPyConnection, spec: Spec) -> Events:
    exprs = [f"({e.where}) as \"{e.name}\"" for e in spec.events]
    if spec.sample_space.time:
        exprs = ["day"] + exprs
    rows = con.execute(f"select {', '.join(exprs)} from omega order by all").fetchnumpy()
    day = None
    if spec.sample_space.time:
        day = np.array(rows["day"], dtype=object)
    values, defined = {}, {}
    for e in spec.events:
        col = rows[e.name]
        if isinstance(col, np.ma.MaskedArray):
            defined[e.name] = ~np.ma.getmaskarray(col)
            values[e.name] = np.where(defined[e.name], col.filled(False), False).astype(bool)
        else:
            defined[e.name] = np.ones(len(col), dtype=bool)
            values[e.name] = col.astype(bool)
    N = len(next(iter(values.values()))) if values else con.execute("select count(*) from omega").fetchone()[0]
    return Events(N, day, values, defined)

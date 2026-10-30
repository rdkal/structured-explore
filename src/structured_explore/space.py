"""The sample space Ω as a DuckDB view, omega, one row per outcome, and the observation check: what of it is observed."""

from dataclasses import dataclass

import duckdb
import numpy as np

from structured_explore.spec import Spec, Variable

# The day an outcome's UTC time falls on in the sample space's time zone, when the spec gives no day of its own.
DAY = "cast(({time} at time zone 'UTC') at time zone '{tz}' as date)"


def _select(variables: list[Variable], prefix: str) -> list[str]:
    return [f"{prefix}.{v.column}" if v.expr else f"{prefix}.{v.name} as {v.column}" for v in variables]


def _derived(variables: list[Variable]) -> str:
    """The derived variables, computed beside the source's own columns."""
    return "".join(f", ({v.expr}) as {v.column}" for v in variables if v.expr)


def table(source: str) -> str:
    """A source as SQL can read it: a file by its path, or a query of its own in parentheses."""
    if source.strip().lower().endswith((".parquet", ".csv", ".json")):
        return f"'{source}'"
    return f"({source})"


def build(con: duckdb.DuckDBPyConnection, spec: Spec) -> None:
    """Create the view omega: the source's rows under where, with each join's variables beside them. A join is left,
    so it never drops an outcome: a variable it does not have is null, and the observation check shows it."""
    s = spec.sample_space
    columns = [f"s.{s.time} as time", day_sql(spec) + " as day"] if s.time else []
    columns += _select(s.variables, "s")
    sql = f"from (select *{_derived(s.variables)} from {table(s.source)} where {s.where}) s"
    for j in spec.joins:
        columns += _select(j.variables, j.name)
        picked = ", ".join(v.column if v.expr else v.name for v in j.variables)
        sql += (f" left join (select {j.key}, {picked} from (select *{_derived(j.variables)} from {table(j.source)}"
                f" where {j.where})) {j.name} on s.{j.key} = {j.name}.{j.key}")
    con.execute(f"create or replace view omega as select {', '.join(columns)} {sql}")


def day_sql(spec: Spec) -> str:
    s = spec.sample_space
    return s.day or DAY.format(time=f"s.{s.time}", tz=s.timezone)


@dataclass
class VariableCheck:
    variable: Variable
    defined: int
    distinct: int
    low: str
    high: str


@dataclass
class Observation:
    N: int
    days: int
    first: str
    last: str
    per_day_min: int
    per_day_max: int
    variables: list[VariableCheck]


def observation(con: duckdb.DuckDBPyConnection, spec: Spec) -> Observation:
    """How many outcomes there are, over which days, and on how many each variable is defined."""
    N = con.execute("select count(*) from omega").fetchone()[0]
    days = first = last = per_min = per_max = None
    if spec.sample_space.time:
        days, first, last, per_min, per_max = con.execute(
            "select count(distinct day), min(day), max(day), min(c), max(c)"
            " from (select day, count(*) c from omega group by day)").fetchone()
    checks = []
    for v in spec.variables:
        defined, distinct, low, high = con.execute(
            f"select count({v.column}), count(distinct {v.column}), min({v.column}), max({v.column}) from omega"
        ).fetchone()
        checks.append(VariableCheck(v, defined, distinct, _short(low), _short(high)))
    return Observation(N, days or 0, str(first or ""), str(last or ""), per_min or 0, per_max or 0, checks)


def _short(x) -> str:
    if isinstance(x, float):
        return f"{x:.4g}"
    return str(x) if x is not None else ""


def raw_rows(con: duckdb.DuckDBPyConnection, n: int = 20) -> tuple[list[str], list[tuple]]:
    """n rows of Ω spread over its time, to read by eye before any chart."""
    order = "order by hash(time)" if "time" in columns(con) else ""
    rel = con.execute(f"select * from omega {order} limit {n}")
    return [d[0] for d in rel.description], rel.fetchall()


def columns(con: duckdb.DuckDBPyConnection) -> list[str]:
    return [r[0] for r in con.execute("describe omega").fetchall()]


def numeric(con: duckdb.DuckDBPyConnection, names: list[str]) -> dict[str, np.ndarray | None]:
    """Each variable as a float array over Ω's rows, nan where null, all from one pass so the rows line up; None for
    one that is not a number."""
    if not names:
        return {}
    cols = con.execute(f"select {', '.join(f'try_cast({n} as double) as {n}' for n in names)} from omega").fetchnumpy()
    out = {}
    for name in names:
        arr = cols[name]
        if isinstance(arr, np.ma.MaskedArray):
            arr = arr.filled(np.nan)
        arr = np.asarray(arr, dtype=float)
        out[name] = None if np.isnan(arr).all() else arr
    return out

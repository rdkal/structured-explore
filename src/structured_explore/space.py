"""The sample space Ω as a DuckDB view, omega, one row per outcome, and the observation check: what of it is observed."""

from dataclasses import dataclass

import duckdb

from structured_explore.spec import Spec, Variable

# The day an outcome's UTC time falls on in the sample space's time zone, when the spec gives no day of its own.
DAY = "cast(({time} at time zone 'UTC') at time zone '{tz}' as date)"


def _select(variables: list[Variable], prefix: str) -> list[str]:
    return [f"{prefix}.{v.name} as {v.column}" for v in variables]


def build(con: duckdb.DuckDBPyConnection, spec: Spec) -> None:
    """Create the view omega: the source's rows under where, with each join's variables beside them. A join is left,
    so it never drops an outcome: a variable it does not have is null, and the observation check shows it."""
    s = spec.sample_space
    columns = [f"s.{s.time} as time", day_sql(spec) + " as day"] if s.time else []
    columns += _select(s.variables, "s")
    sql = f"from (select * from '{s.source}' where {s.where}) s"
    for j in spec.joins:
        columns += _select(j.variables, j.name)
        sql += (f" left join (select {j.key}, {', '.join(v.name for v in j.variables)} from '{j.source}'"
                f" where {j.where}) {j.name} on s.{j.key} = {j.name}.{j.key}")
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
    variables = spec.sample_space.variables + [v for j in spec.joins for v in j.variables]
    checks = []
    for v in variables:
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

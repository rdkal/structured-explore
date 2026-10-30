"""The spec of a structured explore, explore.yaml, as dataclasses. Each top-level section is one step of the skill;
a section the explore does not need is left out, and the loader fills it empty."""

from dataclasses import dataclass, field
from pathlib import Path

import yaml


@dataclass
class Variable:
    # The column in Ω. For a source column, its name there too, unless `alias` renames it.
    name: str
    meaning: str
    # How the variable stands to the thing meant: "measured", "proxy", or "derived" from other columns.
    observed: str = "measured"
    # A different name for the column in Ω, when two sources share a name, e.g. two prices.
    alias: str = ""
    # SQL over the source's row that computes the variable, for a derived one; then name is its name in Ω.
    expr: str = ""

    @property
    def column(self) -> str:
        return self.alias or self.name


@dataclass
class SampleSpace:
    # What one outcome ω is, in words: "one order placed in 2025".
    outcome: str
    # The table, a Parquet, CSV or JSON file relative to the data root, or a SQL query that makes one row per outcome
    # from such files, and the SQL that picks its rows.
    source: str
    where: str = "true"
    # How an outcome gets into the table: the selection, and what is dropped.
    entry: str = ""
    # The column that orders outcomes in time, a UTC timestamp; the time zone whose day an outcome belongs to; or the
    # SQL for that day outright.
    time: str = ""
    timezone: str = "UTC"
    day: str = ""
    variables: list[Variable] = field(default_factory=list)


@dataclass
class Join:
    name: str
    source: str
    key: str
    where: str = "true"
    # The observation gap the join closes, in words.
    closes: str = ""
    variables: list[Variable] = field(default_factory=list)


@dataclass
class Graph:
    # Arrows between variables, by their names in Ω: cause -> effect.
    edges: list[tuple[str, str]] = field(default_factory=list)
    # What the arrows rest on, and what the graph leaves out, in words.
    notes: str = ""


@dataclass
class Event:
    # A SQL boolean expression over Ω's columns. It is the event's name too.
    where: str
    meaning: str = ""
    # "before" or "after": whether the event was named before or after looking at the data.
    defined: str = "before"


@dataclass
class Question:
    kind: str
    # Events, by their where.
    event: str
    given: str = ""
    # The reader's guess at the answer before it is rendered, as [lo, hi].
    guess: list[float] = field(default_factory=list)
    # Hide the real chart among shuffled ones.
    lineup: bool = False


@dataclass
class Spec:
    title: str
    phenomenon: str
    sample_space: SampleSpace
    # Where the page's Home link goes.
    home: str = "/"
    joins: list[Join] = field(default_factory=list)
    graph: Graph | None = None
    events: list[Event] = field(default_factory=list)
    questions: list[Question] = field(default_factory=list)
    # The reference every joint and conditional answer is held against, a name in nulls.NULLS; "" for none.
    null: str = "shuffle"
    # Names in checks.CHECKS, run on every question they apply to.
    checks: list[str] = field(default_factory=list)

    @property
    def variables(self) -> list[Variable]:
        return self.sample_space.variables + [v for j in self.joins for v in j.variables]


def _variables(items: list[dict]) -> list[Variable]:
    return [Variable(**v) for v in items or []]


def _graph(raw, columns: list[str]) -> Graph | None:
    if raw is None:
        return None
    if isinstance(raw, str):
        return Graph(notes=raw)
    edges = []
    for line in raw.get("edges") or []:
        parts = [p.strip() for p in str(line).split("->")]
        if len(parts) < 2 or not all(parts):
            raise ValueError(f"graph edge {line!r}: write it as cause -> effect")
        for a, b in zip(parts, parts[1:]):
            for n in (a, b):
                if n not in columns:
                    raise ValueError(f"graph edge {line!r}: {n} is not a variable")
            edges.append((a, b))
    return Graph(edges, raw.get("notes", ""))


def load(path: Path) -> Spec:
    raw = yaml.safe_load(path.read_text())
    space = dict(raw["sample_space"])
    space["variables"] = _variables(space.get("variables"))
    joins = []
    for j in raw.get("joins") or []:
        j = dict(j)
        j["variables"] = _variables(j.get("variables"))
        joins.append(Join(**j))
    columns = [v.column for v in space["variables"]] + [v.column for j in joins for v in j.variables]
    spec = Spec(
        title=raw["title"],
        phenomenon=raw["phenomenon"],
        sample_space=SampleSpace(**space),
        home=raw.get("home", "/"),
        joins=joins,
        graph=_graph(raw.get("graph"), columns),
        events=[Event(**e) for e in raw.get("events") or []],
        questions=[Question(**q) for q in raw.get("questions") or []],
        null=raw.get("null", "shuffle") or "",
        checks=list(raw.get("checks") or []),
    )
    wheres = {e.where for e in spec.events}
    for q in spec.questions:
        for where in [q.event, q.given] if q.given else [q.event]:
            if where not in wheres:
                raise ValueError(f"question {q.kind} {q.event}: no event with where {where!r}")
    return spec

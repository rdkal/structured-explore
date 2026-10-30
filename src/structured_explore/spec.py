"""The spec of a structured explore, explore.yaml, as dataclasses. Each top-level section is one step of the skill;
a section the explore does not need is left out, and the loader fills it empty."""

from dataclasses import dataclass, field
from pathlib import Path

import yaml


@dataclass
class Variable:
    name: str
    meaning: str
    # How the variable stands to the thing meant: "measured", "proxy", or "derived" from other columns.
    observed: str = "measured"
    # The column's name in Ω when it differs from its name in the source, e.g. two prices from the same table.
    alias: str = ""

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
class Event:
    name: str
    # A SQL boolean expression over Ω's columns.
    where: str
    meaning: str = ""
    # "before" or "after": whether the event was named before or after looking at the data.
    defined: str = "before"


@dataclass
class Question:
    kind: str
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
    graph: str = ""
    events: list[Event] = field(default_factory=list)
    questions: list[Question] = field(default_factory=list)
    # The reference every joint and conditional answer is held against, a name in nulls.NULLS; "" for none.
    null: str = "shuffle"
    # Names in checks.CHECKS, run on every question they apply to.
    checks: list[str] = field(default_factory=list)


def _variables(items: list[dict]) -> list[Variable]:
    return [Variable(**v) for v in items or []]


def load(path: Path) -> Spec:
    raw = yaml.safe_load(path.read_text())
    space = dict(raw["sample_space"])
    space["variables"] = _variables(space.get("variables"))
    joins = []
    for j in raw.get("joins") or []:
        j = dict(j)
        j["variables"] = _variables(j.get("variables"))
        joins.append(Join(**j))
    spec = Spec(
        title=raw["title"],
        phenomenon=raw["phenomenon"],
        sample_space=SampleSpace(**space),
        home=raw.get("home", "/"),
        joins=joins,
        graph=raw.get("graph", ""),
        events=[Event(**e) for e in raw.get("events") or []],
        questions=[Question(**q) for q in raw.get("questions") or []],
        null=raw.get("null", "shuffle") or "",
        checks=list(raw.get("checks") or []),
    )
    names = {e.name for e in spec.events}
    for q in spec.questions:
        for name in [q.event, q.given] if q.given else [q.event]:
            if name not in names:
                raise ValueError(f"question {q.kind} {q.event}: no event named {name}")
    return spec

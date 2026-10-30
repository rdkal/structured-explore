"""The page: everything the build knows, as one JSON document inlined into web/index.html, drawn by web/app.js with
web/style.css beside it. Also written as explore.json for anything else to read."""

import json
import shutil
from pathlib import Path

from structured_explore import grammar
from structured_explore.events import Events
from structured_explore.results import Answer
from structured_explore.space import Observation
from structured_explore.spec import Spec

WEB = Path(__file__).parent / "web"


def data(spec: Spec, obs: Observation, raw: tuple[list[str], list[tuple]], ev: Events, answers: list[Answer]) -> dict:
    s = spec.sample_space
    cols, rows = raw
    return {
        "title": spec.title, "phenomenon": spec.phenomenon, "home": spec.home,
        "sample_space": {"outcome": s.outcome, "source": s.source, "where": s.where, "entry": s.entry, "time": s.time,
                         "timezone": s.timezone, "N": obs.N, "days": obs.days, "first": obs.first, "last": obs.last,
                         "per_day_min": obs.per_day_min, "per_day_max": obs.per_day_max},
        "joins": [{"name": j.name, "source": j.source, "where": j.where, "key": j.key, "closes": j.closes}
                  for j in spec.joins],
        "variables": [{"column": c.variable.column, "meaning": c.variable.meaning, "observed": c.variable.observed,
                       "defined": c.defined, "distinct": c.distinct, "low": c.low, "high": c.high}
                      for c in obs.variables],
        "raw": {"columns": cols, "rows": [[str(c) if c is not None else "" for c in r] for r in rows]},
        "graph": spec.graph,
        "events": [{"name": e.name, "meaning": e.meaning, "where": e.where, "defined_when": e.defined,
                    "true": ev.true(e.name), "N": ev.N - ev.undefined(e.name), "undefined": ev.undefined(e.name)}
                   for e in spec.events],
        "answers": [a.to_dict() | {"caption": grammar.caption(a), "heading": grammar.heading(a.question),
                                   "name": grammar.name(a.question)} for a in answers],
        "how_to_read": [{"id": i, "look": look, "means": means} for i, look, means in grammar.HOW_TO_READ],
    }


def write(out: Path, d: dict) -> None:
    out.mkdir(parents=True, exist_ok=True)
    text = json.dumps(d, default=str).replace("</", "<\\/")
    html = (WEB / "index.html").read_text().replace("/*DATA*/", text)
    (out / "index.html").write_text(html)
    (out / "explore.json").write_text(json.dumps(d, indent=1, default=str))
    for name in ("style.css", "app.js"):
        shutil.copy(WEB / name, out / name)

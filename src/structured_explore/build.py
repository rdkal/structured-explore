"""The command line.

    structured-explore init <folder>              copy the template explore.yaml and Makefile into a new explore folder
    structured-explore build <folder> <out>       build <folder>/explore.yaml into <out>/index.html and explore.json

Paths in the spec are relative to the working directory, the data root."""

import argparse
from datetime import date
from pathlib import Path

import duckdb
import numpy as np

from structured_explore import events, figures, graph, page, space
from structured_explore.checks import CHECKS
from structured_explore.nulls import NULLS
from structured_explore.questions import QUESTIONS, WITH_NULL
from structured_explore.results import Answer
from structured_explore.spec import Spec, load

TEMPLATE = Path(__file__).parent / "template"


def build(spec: Spec, out: Path, con: duckdb.DuckDBPyConnection | None = None, seed: int = 0) -> list[Answer]:
    con = con or duckdb.connect()
    space.build(con, spec)
    obs = space.observation(con, spec)
    raw = space.raw_rows(con)
    ev = events.evaluate(con, spec)
    columns = [v.column for v in spec.variables]
    independencies = []
    if spec.graph:
        arrays = space.numeric(con, columns)
        independencies = [graph.test(arrays, x, y, z) for x, y, z in graph.implied(spec.graph, columns)]
    rng = np.random.default_rng(seed)
    answers = []
    for q in spec.questions:
        if q.kind not in QUESTIONS:
            raise ValueError(f"no question kind {q.kind}")
        if q.kind != "marginal" and not q.given:
            raise ValueError(f"question {q.kind} {q.event} needs given")
        A = ev.values[q.event]
        B = ev.values[q.given] if q.given else None
        defined = ev.defined[q.event] & (ev.defined[q.given] if q.given else True)
        a = Answer(q, QUESTIONS[q.kind](A, B, defined))
        if spec.null and q.kind in WITH_NULL:
            a.band = NULLS[spec.null](q.kind, A, B, defined, rng)
        for name in spec.checks:
            r = CHECKS[name](q.kind, A, B, defined, ev.day, rng)
            if r is not None:
                a.checks.append(r)
        a.figure = figures.FIGURES[q.kind](A, B, defined, a.count, a.band)
        if q.lineup and B is not None:
            a.lineup = figures.lineup(A, B, defined, rng)
        if spec.graph and q.given:
            a.relation = graph.relation(spec.graph, graph.variables_in(q.event, columns),
                                        graph.variables_in(q.given, columns))
        answers.append(a)
    page.write(out, page.data(spec, obs, raw, ev, answers, independencies))
    return answers


def init(folder: Path) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    for name in ("explore.yaml", "Makefile"):
        target = folder / name
        if target.exists():
            raise SystemExit(f"{target} exists")
        text = (TEMPLATE / name).read_text().replace("<date>", date.today().isoformat()).replace("<name>", folder.name)
        target.write_text(text)
        print(target)


def main() -> None:
    parser = argparse.ArgumentParser(prog="structured-explore", description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)
    p = sub.add_parser("init", help="start an explore folder from the template")
    p.add_argument("folder", type=Path)
    p = sub.add_parser("build", help="build an explore's page")
    p.add_argument("folder", type=Path)
    p.add_argument("out", type=Path)
    p.add_argument("--seed", type=int, default=0)
    args = parser.parse_args()
    if args.command == "init":
        init(args.folder)
    else:
        from structured_explore.grammar import caption
        for a in build(load(args.folder / "explore.yaml"), args.out, seed=args.seed):
            print(caption(a))


if __name__ == "__main__":
    main()

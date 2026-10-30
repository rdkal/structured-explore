"""The grammar against known answers: a sample space simulated with a planted effect, a planted nothing, a Simpson
reversal and a collider, under a graph that says so. The build must say what was planted, and the graph's implied
independencies must hold where the simulation made them true.

Run with: uv run --with pytest pytest"""

from pathlib import Path

import duckdb
import numpy as np
import pytest

from structured_explore.build import build, init
from structured_explore.spec import Event, Graph, Question, SampleSpace, Spec, Variable, load

DAYS, HOURS = 200, 24


def simulate(path: Path, seed: int = 1) -> None:
    rng = np.random.default_rng(seed)
    N = DAYS * HOURS
    x = rng.random(N) < 0.5
    y = rng.random(N) < np.where(x, 0.7, 0.3)      # the planted effect: x raises y
    z = rng.random(N) < 0.4                           # the planted nothing
    c = rng.random(N) < 0.5                           # Simpson: c decides t and lowers s
    t = rng.random(N) < np.where(c, 0.8, 0.2)
    s = rng.random(N) < np.where(c, np.where(t, 0.2, 0.1), np.where(t, 0.7, 0.6))
    w = rng.random(N) < 0.5                           # collider: k = y or w
    k = y | w
    time = (np.datetime64("2026-01-01T00:00:00") + np.arange(N).astype("timedelta64[h]")).astype("datetime64[us]")
    con = duckdb.connect()
    con.register("sim", {"time": time, "x": x, "y": y, "z": z, "c": c, "t": t, "s": s, "w": w, "k": k})
    con.execute(f"copy sim to '{path}' (format parquet)")


def spec(source: Path) -> Spec:
    v = [Variable(n, n) for n in "xyzctswk"]
    events = [Event(n) for n in "xyzctswk"]
    events += [Event("t and c"), Event("not t and c"), Event("not y and k"), Event("y and k")]
    questions = [
        Question("marginal", "y", guess=[0.4, 0.6]),
        Question("conditional", "y", "x", guess=[0.6, 0.8], lineup=True),   # 1: effect
        Question("conditional", "z", "x"),                                   # 2: nothing
        Question("conditional", "s", "t"),                                   # 3: Simpson, marginal in t
        Question("conditional", "s", "t and c"),                             # 4: within c
        Question("conditional", "s", "not t and c"),                         # 5
        Question("conditional", "w", "y"),                                   # 6: collider, unconditioned
        Question("conditional", "w", "not y and k"),                         # 7: conditioned on k
        Question("conditional", "w", "y and k"),                             # 8
    ]
    space = SampleSpace("one simulated hour", str(source), time="time", variables=v)
    g = Graph([("x", "y"), ("c", "t"), ("c", "s"), ("t", "s"), ("y", "k"), ("w", "k")], "as simulated")
    return Spec("simulation", "planted", space, graph=g, events=events, questions=questions, checks=["split_half"])


@pytest.fixture(scope="module")
def built(tmp_path_factory):
    folder = tmp_path_factory.mktemp("sim")
    simulate(folder / "sim.parquet")
    out = folder / "out"
    return build(spec(folder / "sim.parquet"), out), out


def test_marginal(built):
    a = built[0][0]
    assert abs(a.count.p - 0.5) < 0.03 and a.band is None and a.guess_hit and a.figure["kind"] == "bar"


def test_planted_effect_is_found(built):
    a = built[0][1]
    assert abs(a.count.p - 0.7) < 0.03
    assert not a.band.contains(a.count.p)
    assert a.checks[0].ok is True
    assert a.guess_hit
    assert a.figure["kind"] == "spine" and a.figure["nAB"] == a.count.n and a.figure["nB"] == a.count.N
    assert 1 <= a.lineup["real"] <= 20 and len(a.lineup["panels"]) == 20
    assert a.relation["kind"] == "upstream"


def test_planted_nothing_is_inside_the_null(built):
    # P(z | x) is 0.4 like P(z), and the null band sits around it. A true null falls outside its own 95 % band one
    # time in twenty, so the test holds the answer and the band to the planted value, not to each other.
    a = built[0][2]
    assert abs(a.count.p - 0.4) < 0.03 and a.band.lo < 0.4 < a.band.hi
    assert a.relation["kind"] == "unconnected"


def test_simpson_reversal(built):
    marginal, within, without = built[0][3], built[0][4], built[0][5]
    # Over all of Ω, t lowers s; within c, t raises it.
    assert marginal.count.p < 0.4 and not marginal.band.contains(marginal.count.p)
    assert within.count.interval[0] > without.count.interval[1]
    assert marginal.relation["kind"] == "upstream"


def test_collider(built):
    free, on_k, on_k_y = built[0][6], built[0][7], built[0][8]
    assert abs(free.count.p - 0.5) < 0.03 and free.band.lo < 0.5 < free.band.hi
    # Conditioning on k = y or w makes w depend on y: 1 when y is false, 0.5 when true.
    assert on_k.count.p > 0.99 and abs(on_k_y.count.p - 0.5) < 0.03
    assert free.relation["kind"] == "unconnected" and on_k.relation["kind"] == "downstream"


def test_graph_independencies(built):
    import json
    d = json.loads((built[1] / "explore.json").read_text())
    ind = {frozenset((i["x"], i["y"], *i["given"])): i["verdict"] for i in d["graph"]["independencies"]}
    # What the graph implies and the simulation made true.
    assert ind[frozenset("xz")] == "holds"
    assert ind[frozenset("yw")] == "holds"          # the collider k is not conditioned on
    assert ind[frozenset("xs")] == "holds"
    assert ind[frozenset("cy")] == "holds"
    assert ind[frozenset("xky")] == "holds"         # x ⊥ k | y
    # Every implied independence holds in data drawn from the graph.
    assert set(ind.values()) == {"holds"}, ind


def test_graph_catches_a_missing_arrow(tmp_path):
    # Leave x -> y out of the graph: it then implies x ⊥ y, which the data refutes.
    simulate(tmp_path / "sim.parquet")
    s = spec(tmp_path / "sim.parquet")
    s.graph.edges.remove(("x", "y"))
    build(s, tmp_path / "out")
    import json
    d = json.loads((tmp_path / "out" / "explore.json").read_text())
    bad = [i for i in d["graph"]["independencies"] if i["verdict"] == "fails"]
    assert {(i["x"], i["y"]) for i in bad} >= {("x", "y")}


def test_page(built):
    out = built[1]
    html = (out / "index.html").read_text()
    assert '"concepts"' in html and "P(y | x) = 0." in html and "/*DATA*/" not in html
    assert (out / "style.css").exists() and (out / "app.js").exists() and (out / "explore.json").exists()


def test_init(tmp_path):
    init(tmp_path / "my-explore")
    make = (tmp_path / "my-explore" / "Makefile").read_text()
    assert "my-explore" in make and "<date>" not in make and (tmp_path / "my-explore" / "explore.yaml").exists()


def test_yaml_load(tmp_path):
    (tmp_path / "explore.yaml").write_text("""
title: t
phenomenon: p
home: /shop/
sample_space:
  outcome: one row
  source: x.parquet
  timezone: Europe/Berlin
  variables:
    - {name: a, meaning: a}
    - {name: hour, meaning: h, observed: derived, expr: hour(t)}
graph:
  edges: [hour -> a]
  notes: n
events: [{where: a > 1}]
questions: [{kind: marginal, event: a > 1}]
""")
    s = load(tmp_path / "explore.yaml")
    assert s.null == "shuffle" and s.home == "/shop/" and s.sample_space.timezone == "Europe/Berlin"
    assert s.graph.edges == [("hour", "a")] and s.variables[1].expr == "hour(t)"
    assert s.questions[0].event == "a > 1" and s.sample_space.variables[0].observed == "measured"
    (tmp_path / "explore.yaml").write_text("title: t\nphenomenon: p\nsample_space: {outcome: o, source: s}\n"
                                           "questions: [{kind: marginal, event: nope}]\n")
    with pytest.raises(ValueError):
        load(tmp_path / "explore.yaml")
    (tmp_path / "explore.yaml").write_text("title: t\nphenomenon: p\nsample_space: {outcome: o, source: s, variables: [{name: a, meaning: a}]}\n"
                                           "graph: {edges: [a -> b]}\n")
    with pytest.raises(ValueError):
        load(tmp_path / "explore.yaml")


def test_sql_source(tmp_path):
    from structured_explore import space
    con = duckdb.connect()
    con.execute(f"copy (select * from (values ('a', 1), ('a', 2), ('b', 5)) t(k, v)) to '{tmp_path}/t.parquet'")
    sql = f"select k, sum(v) as v from '{tmp_path}/t.parquet' group by k"
    s = Spec("t", "p", SampleSpace("one key", sql, variables=[Variable("v", "sum"), Variable("v2", "twice", "derived", expr="v * 2")]))
    space.build(con, s)
    assert con.execute("select count(*), max(v), max(v2) from omega").fetchone() == (2, 5, 10)


def test_every_kind_is_explained():
    from structured_explore import concepts, figures, nulls, questions
    from structured_explore.checks import CHECKS
    ids = {c.id for c in concepts.all()}
    assert len(ids) == len(concepts.all())
    for kind in [*questions.QUESTIONS, *nulls.NULLS, *CHECKS, *{f.__name__ for f in figures.FIGURES.values()}, "lineup",
                 "dag", "independence", "relation"]:
        assert kind in ids, kind
    for c in concepts.all():
        for s in c.see:
            assert s in ids, (c.id, s)

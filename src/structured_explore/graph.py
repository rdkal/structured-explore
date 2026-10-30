"""The graph: the author's arrows between the variables, what they imply, and whether the data agrees. From the
edges: ancestors and descendants; d-separation; the conditional independencies the graph implies, one per pair of
variables with no arrow between them, with the smallest set that separates them; a test of each on Ω by partial rank
correlation; and how a question's given stands to its event."""

import itertools
import re
from dataclasses import dataclass, field
from math import atanh, sqrt, tanh

import numpy as np

from structured_explore.concepts_base import Concept
from structured_explore.spec import Graph

# A partial correlation this small is taken as none: Cohen's small effect.
SMALL = 0.1
# The largest separating set searched for.
MAX_GIVEN = 3


def parents(g: Graph, n: str) -> set[str]:
    return {a for a, b in g.edges if b == n}


def children(g: Graph, n: str) -> set[str]:
    return {b for a, b in g.edges if a == n}


def ancestors(g: Graph, n: str) -> set[str]:
    out, todo = set(), [n]
    while todo:
        for p in parents(g, todo.pop()):
            if p not in out:
                out.add(p)
                todo.append(p)
    return out


def descendants(g: Graph, n: str) -> set[str]:
    out, todo = set(), [n]
    while todo:
        for c in children(g, todo.pop()):
            if c not in out:
                out.add(c)
                todo.append(c)
    return out


def adjacent(g: Graph, x: str, y: str) -> bool:
    return (x, y) in g.edges or (y, x) in g.edges


def d_separated(g: Graph, x: str, y: str, z: set[str]) -> bool:
    """Whether every path between x and y is blocked given z: in the moral graph of the ancestors of x, y and z, with
    z removed, x and y are not connected."""
    keep = {x, y, *z}
    for n in list(keep):
        keep |= ancestors(g, n)
    edges = {(a, b) for a, b in g.edges if a in keep and b in keep}
    undirected = {frozenset(e) for e in edges}
    for n in keep:  # marry the parents
        ps = [a for a, b in edges if b == n]
        undirected |= {frozenset(p) for p in itertools.combinations(ps, 2)}
    seen, todo = {x}, [x]
    while todo:
        n = todo.pop()
        for e in undirected:
            if n in e:
                m = next(iter(e - {n}), n)
                if m in z or m in seen:
                    continue
                if m == y:
                    return False
                seen.add(m)
                todo.append(m)
    return True


def implied(g: Graph, nodes: list[str]) -> list[tuple[str, str, list[str]]]:
    """For every pair of variables with no arrow between them, the smallest set of other variables that separates
    them, as the independence x ⊥ y | z the graph implies; none when no set up to MAX_GIVEN does."""
    out = []
    for x, y in itertools.combinations(nodes, 2):
        if adjacent(g, x, y):
            continue
        others = [n for n in nodes if n not in (x, y)]
        for k in range(0, min(MAX_GIVEN, len(others)) + 1):
            found = next((z for z in itertools.combinations(others, k) if d_separated(g, x, y, set(z))), None)
            if found is not None:
                out.append((x, y, list(found)))
                break
    return out


@dataclass
class Independence:
    x: str
    y: str
    given: list[str]
    # Outcomes with every variable defined; the partial rank correlation and its 95 % interval; the verdict:
    # "holds", "fails", "unclear" or "untested" when a variable is not a number.
    n: int = 0
    r: float | None = None
    lo: float | None = None
    hi: float | None = None
    verdict: str = "untested"

    def to_dict(self) -> dict:
        return {"x": self.x, "y": self.y, "given": self.given, "n": self.n, "r": self.r, "lo": self.lo, "hi": self.hi,
                "verdict": self.verdict}


def ranks(a: np.ndarray) -> np.ndarray:
    """Average ranks, ties shared."""
    order = np.argsort(a, kind="stable")
    r = np.empty(len(a))
    r[order] = np.arange(len(a))
    _, inv, counts = np.unique(a, return_inverse=True, return_counts=True)
    sums = np.zeros(len(counts))
    np.add.at(sums, inv, r)
    return sums[inv] / counts[inv]


def test(arrays: dict[str, np.ndarray | None], x: str, y: str, given: list[str]) -> Independence:
    """x ⊥ y | given on Ω: the Spearman correlation of x and y after each is regressed on the given, over the
    outcomes where all are defined, with Fisher's interval. Holds when the interval lies within ±SMALL, fails when it
    lies outside, unclear between."""
    out = Independence(x, y, given)
    cols = [arrays.get(n) for n in (x, y, *given)]
    if any(c is None for c in cols):
        return out
    mask = np.all([~np.isnan(c) for c in cols], axis=0)
    n = int(mask.sum())
    out.n = n
    if n < len(given) + 10:
        return out
    rk = [ranks(c[mask]) for c in cols]
    design = np.column_stack([np.ones(n), *rk[2:]])
    resid = []
    for v in rk[:2]:
        beta, *_ = np.linalg.lstsq(design, v, rcond=None)
        resid.append(v - design @ beta)
    sx, sy = resid[0].std(), resid[1].std()
    if sx == 0 or sy == 0:
        return out
    r = float(np.corrcoef(resid[0], resid[1])[0, 1])
    r = max(min(r, 0.999999), -0.999999)
    se = 1 / sqrt(max(n - len(given) - 3, 1))
    lo, hi = tanh(atanh(r) - 1.96 * se), tanh(atanh(r) + 1.96 * se)
    out.r, out.lo, out.hi = r, lo, hi
    out.verdict = "holds" if -SMALL < lo and hi < SMALL else "fails" if lo > SMALL or hi < -SMALL else "unclear"
    return out


def variables_in(where: str, columns: list[str]) -> list[str]:
    """The variables a where clause mentions."""
    words = set(re.findall(r"[A-Za-z_][A-Za-z0-9_]*", where))
    return [c for c in columns if c in words]


def relation(g: Graph, event: list[str], given: list[str]) -> dict:
    """How the given's variables stand to the event's in the graph."""
    if not event or not given:
        return {"kind": "none", "text": "the graph has no node for one of the events"}
    up = any(a in ancestors(g, b) for a in given for b in event)
    down = any(a in descendants(g, b) for a in given for b in event)
    shared = set(event) & set(given)
    if shared:
        return {"kind": "same", "text": f"both events are about {', '.join(sorted(shared))}"}
    if up and down:
        return {"kind": "both", "text": "the given is both upstream and downstream of the event"}
    if up:
        return {"kind": "upstream", "text": "the given comes before the event in the graph: read it as the given's effect"}
    if down:
        return {"kind": "downstream", "text": "the given comes after the event: this reads the event's effect backwards"}
    if any(ancestors(g, a) & ancestors(g, b) for a in given for b in event):
        return {"kind": "common", "text": "the given and the event share a cause and nothing else: association, not effect"}
    return {"kind": "unconnected", "text": "the graph joins them by no path: an answer outside the null says the graph is wrong"}


EXPLAIN = {
    "dag": Concept(
        "dag", "The graph",
        "The author's arrows between the variables: what causes what, drawn as a graph with no cycles.",
        "Written in the spec as cause -> effect over the variables, which are every column of the outcome. Variables "
        "with no arrow are drawn apart. The tool draws it left to right in causal order.",
        "A missing arrow is a claim too: it says the two have nothing to do with each other except through the "
        "arrows drawn. Those claims are what the independencies below test.",
        "The graph is an assumption the data can contradict but not confirm: many graphs imply the same "
        "independencies.",
        see=["independence", "relation", "conditional"]),
    "independence": Concept(
        "independence", "Implied independence",
        "A pair of variables the graph says are independent, once some others are held fixed, and whether the data "
        "agrees.",
        "For every two variables with no arrow between them, the smallest set of other variables that blocks every "
        "path between them, by d-separation. Then on Ω: both are ranked, each is regressed on the blocking set, and "
        "the residuals' correlation is taken, with its 95 % interval. Within ±0.1 holds; outside it fails; "
        "astride, unclear.",
        "A fail is an arrow the graph lacks, or a cause left out. Fix the graph or say why not before reading any "
        "conditional that depends on it. Holds does not make the graph right.",
        "The test sees straight-line, rank-order dependence only; a U-shaped one slips past. Outcomes in time are "
        "not independent draws, so the interval is a little too narrow.",
        look="price_1 ⊥ day_ahead_se3 | ∅: r = 0.31 [0.29, 0.33], fails", see=["dag", "interval"]),
    "relation": Concept(
        "relation", "Given and event in the graph",
        "Where the given's variables stand to the event's in the graph: before it, after it, beside it, or nowhere "
        "near.",
        "From the arrows: the given is upstream when one of its variables is an ancestor of one of the event's, "
        "downstream when a descendant, common cause when they only share an ancestor, unconnected when no path "
        "joins them.",
        "Upstream: the conditional may be read as what the given does to the event, if the graph is right. "
        "Downstream: it reads the event's effect backwards, like P(rain | wet street). Common cause: association "
        "only. Unconnected: an answer outside the null means the graph is missing something.",
        "It depends entirely on the graph. A wrong arrow gives a wrong label.",
        look="given is upstream of the event", see=["dag", "conditional", "graph"]),
}

"""The graph: the author's arrows between the variables, what they imply, and whether the data agrees. From the
edges: ancestors and descendants; d-separation; the conditional independencies the graph implies, one per pair of
variables with no arrow between them, with the smallest set that separates them; a test of each on Ω by partial rank
correlation; and how a question's given stands to its event."""

import itertools
import re
import subprocess
from dataclasses import dataclass, field
from math import atanh, exp, lgamma, log, pi, sqrt, tanh

import numpy as np

from structured_explore.concepts_base import Concept
from structured_explore.spec import Graph

# A partial correlation this small is taken as none: Cohen's small effect.
SMALL = 0.1
# The largest separating set searched for.
MAX_GIVEN = 3
# The kernel test: outcomes it is run on, random Fourier features for x and y, and for the conditioning set, and the
# p-values below which a claim fails and above which it holds.
N_KERNEL, FEATURES, FEATURES_GIVEN, P_FAIL, P_HOLD = 2000, 5, 25, 0.01, 0.05


def arrows(g: Graph) -> list[tuple[str, str]]:
    """The arrows with every shared cause a <-> b as a hidden node with arrows to both."""
    hidden = [(f"_latent{i}", a, b) for i, (a, b) in enumerate(g.latent)]
    return g.edges + [(h, a) for h, a, _ in hidden] + [(h, b) for h, _, b in hidden]


def parents(g: Graph, n: str) -> set[str]:
    return {a for a, b in arrows(g) if b == n}


def children(g: Graph, n: str) -> set[str]:
    return {b for a, b in arrows(g) if a == n}


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
    return (x, y) in g.edges or (y, x) in g.edges or (x, y) in g.latent or (y, x) in g.latent


def levels(g: Graph, nodes: list[str]) -> list[list[str]]:
    """The spec's levels, or the variables by the longest path of arrows above them, roots first."""
    if g.levels:
        return g.levels
    depth: dict[str, int] = {}

    def d(n: str) -> int:
        if n not in depth:
            ps = [p for p in parents(g, n) if not p.startswith("_latent")]
            depth[n] = 1 + max((d(p) for p in ps), default=-1)
        return depth[n]

    for n in nodes:
        d(n)
    out: list[list[str]] = [[] for _ in range(max(depth.values(), default=0) + 1)]
    for n in nodes:
        out[depth[n]].append(n)
    return out


def d_separated(g: Graph, x: str, y: str, z: set[str]) -> bool:
    """Whether every path between x and y is blocked given z: in the moral graph of the ancestors of x, y and z, with
    z removed, x and y are not connected."""
    keep = {x, y, *z}
    for n in list(keep):
        keep |= ancestors(g, n)
    edges = {(a, b) for a, b in arrows(g) if a in keep and b in keep}
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
    # Outcomes with every variable defined; the partial rank correlation and its 95 % interval, the size and sign of
    # what is left; the kernel test's p-value on n_kernel of the outcomes, which gives the verdict: "holds", "fails",
    # "unclear", or "untested" when a variable is not a number.
    n: int = 0
    r: float | None = None
    lo: float | None = None
    hi: float | None = None
    p: float | None = None
    n_kernel: int = 0
    verdict: str = "untested"

    def to_dict(self) -> dict:
        return {"x": self.x, "y": self.y, "given": self.given, "n": self.n, "r": self.r, "lo": self.lo, "hi": self.hi,
                "p": self.p, "n_kernel": self.n_kernel, "verdict": self.verdict}


def ranks(a: np.ndarray) -> np.ndarray:
    """Average ranks, ties shared."""
    order = np.argsort(a, kind="stable")
    r = np.empty(len(a))
    r[order] = np.arange(len(a))
    _, inv, counts = np.unique(a, return_inverse=True, return_counts=True)
    sums = np.zeros(len(counts))
    np.add.at(sums, inv, r)
    return sums[inv] / counts[inv]


def test(arrays: dict[str, np.ndarray | None], x: str, y: str, given: list[str],
         rng: np.random.Generator | None = None) -> Independence:
    """x ⊥ y | given on Ω. The verdict is the kernel test's (rcot): fails below P_FAIL, holds above P_HOLD, unclear
    between. Beside it, for size and sign, the Spearman correlation of x and y after each is regressed on the given,
    with Fisher's interval."""
    rng = rng or np.random.default_rng(0)
    out = Independence(x, y, given)
    cols = [arrays.get(n) for n in (x, y, *given)]
    if any(c is None for c in cols):
        return out
    mask = np.all([~np.isnan(c) for c in cols], axis=0)
    n = int(mask.sum())
    out.n = n
    if n < len(given) + 30:
        return out
    z = np.column_stack([c[mask] for c in cols[2:]]) if given else np.empty((n, 0))
    out.p, out.n_kernel = rcot(cols[0][mask], cols[1][mask], z, rng)
    out.verdict = "fails" if out.p < P_FAIL else "holds" if out.p >= P_HOLD else "unclear"
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
    out.r, out.lo, out.hi = r, tanh(atanh(r) - 1.96 * se), tanh(atanh(r) + 1.96 * se)
    return out


def _standardize(a: np.ndarray) -> np.ndarray:
    sd = a.std(axis=0)
    return (a - a.mean(axis=0)) / np.where(sd > 0, sd, 1)


def _fourier(A: np.ndarray, d: int, rng: np.random.Generator) -> np.ndarray:
    """d random Fourier features of the rows of A, for a Gaussian kernel with the median pairwise distance as its
    width: cos(A w + b), with w ~ N(0, 1/width²) and b uniform on [0, 2π]."""
    sub = A[rng.choice(len(A), min(len(A), 500), replace=False)]
    dist = np.sqrt(((sub[:, None, :] - sub[None, :, :]) ** 2).sum(-1))
    width = float(np.median(dist[dist > 0])) if (dist > 0).any() else 1.0
    w = rng.normal(0, 1 / width, (A.shape[1], d))
    b = rng.uniform(0, 2 * pi, d)
    return sqrt(2 / d) * np.cos(A @ w + b)


def rcot(x: np.ndarray, y: np.ndarray, z: np.ndarray, rng: np.random.Generator) -> tuple[float, int]:
    """The randomized conditional correlation test (Strobl, Zhang and Visweswaran 2019): an approximation of the
    kernel conditional-independence test in linear time. On up to N_KERNEL outcomes drawn at random: random Fourier
    features of x, of y and of z; the features of x and of y are regressed on those of z and what is left is
    correlated feature by feature. The statistic is n times the squared norm of that cross-covariance; under
    independence it is a weighted sum of chi-squares, here matched by a gamma. Returns the p-value and n."""
    n = len(x)
    idx = rng.choice(n, N_KERNEL, replace=False) if n > N_KERNEL else np.arange(n)
    X, Y = _standardize(x[idx, None]), _standardize(y[idx, None])
    fx, fy = _fourier(X, FEATURES, rng), _fourier(Y, FEATURES, rng)
    if z.shape[1]:
        fz = _fourier(_standardize(z[idx]), FEATURES_GIVEN, rng)
        design = np.column_stack([np.ones(len(idx)), fz])
        fx = fx - design @ np.linalg.lstsq(design, fx, rcond=None)[0]
        fy = fy - design @ np.linalg.lstsq(design, fy, rcond=None)[0]
    else:
        fx, fy = fx - fx.mean(0), fy - fy.mean(0)
    m = len(idx)
    stat = m * float(((fx.T @ fy / m) ** 2).sum())
    products = (fx[:, :, None] * fy[:, None, :]).reshape(m, -1)
    products = products - products.mean(0)
    lam = np.linalg.eigvalsh(products.T @ products / m)
    lam = lam[lam > 1e-10]
    if not len(lam):
        return 1.0, m
    mean, var = float(lam.sum()), float(2 * (lam ** 2).sum())
    shape, scale = mean * mean / var, var / mean
    return 1 - gamma_cdf(stat / scale, shape), m


def gamma_cdf(x: float, a: float) -> float:
    """The regularized lower incomplete gamma function P(a, x): the CDF of a gamma with shape a and scale 1."""
    if x <= 0:
        return 0.0
    if x < a + 1:  # series
        term = total = 1 / a
        for k in range(1, 500):
            term *= x / (a + k)
            total += term
            if abs(term) < abs(total) * 1e-12:
                break
        return total * exp(-x + a * log(x) - lgamma(a))
    # continued fraction for Q(a, x), Lentz
    tiny = 1e-300
    b = x + 1 - a
    c = 1 / tiny
    d = 1 / b
    h = d
    for k in range(1, 500):
        an = -k * (k - a)
        b += 2
        d = an * d + b
        d = tiny if abs(d) < tiny else d
        c = b + an / c
        c = tiny if abs(c) < tiny else c
        d = 1 / d
        delta = d * c
        h *= delta
        if abs(delta - 1) < 1e-12:
            break
    return 1 - exp(-x + a * log(x) - lgamma(a)) * h


def layout(g: Graph, nodes: list[str], levels: list[list[str]]) -> dict | None:
    """Node positions and edge splines from Graphviz dot, levels as ranks, in pixels with y down; None without dot."""
    lines = ["digraph G {", "rankdir=TB; nodesep=0.5; ranksep=0.55; splines=true;",
             'node [shape=box fixedsize=true height=0.39 fontname="monospace" fontsize=12];']
    lines += [f'"{n}" [width={(len(n) * 7.4 + 22) / 72:.3f}];' for n in nodes]
    lines += ["{ rank=same; " + " ".join(f'"{n}"' for n in level) + " }" for level in levels]
    lines += [f'"{a}" -> "{b}";' for a, b in g.edges]
    lines += [f'"{a}" -> "{b}" [dir=both style=dashed constraint=false];' for a, b in g.latent]
    lines.append("}")
    try:
        out = subprocess.run(["dot", "-Tplain"], input="\n".join(lines), capture_output=True, text=True,
                             check=True, timeout=30).stdout
    except (FileNotFoundError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return None
    pt, positions, edges, height = 72, {}, [], 0.0
    for line in out.splitlines():
        parts = line.split()
        if not parts:
            continue
        if parts[0] == "graph":
            height = float(parts[3])
        elif parts[0] == "node":
            x, y, w, h = (float(v) for v in parts[2:6])
            positions[parts[1].strip('"')] = [x * pt, (height - y) * pt, w * pt, h * pt]
        elif parts[0] == "edge":
            k = int(parts[3])
            points = [[float(parts[4 + 2 * i]) * pt, (height - float(parts[5 + 2 * i])) * pt] for i in range(k)]
            edges.append({"a": parts[1].strip('"'), "b": parts[2].strip('"'), "points": points})
    return {"w": max(p[0] + p[2] / 2 for p in positions.values()) + 8, "h": height * pt + 8,
            "nodes": positions, "edges": edges}


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
        "The author's arrows between the variables: what causes what, drawn top to bottom in time order.",
        "Written in the spec as cause -> effect over the variables, which are every column of the outcome, in "
        "levels: a level is a moment, such as one auction's close, and an arrow goes from an earlier level to a "
        "later one, never within one. Two variables of one level that move together through something not in the "
        "data are joined by a dashed two-headed link, a <-> b, a shared cause. Laid out by Graphviz when it is "
        "installed. Hover a node to see its arrows alone, and listed.",
        "A missing link is a claim too: it says the two have nothing to do with each other except through the "
        "arrows drawn. Those claims are what the independencies below test.",
        "The graph is an assumption the data can contradict but not confirm: many graphs imply the same "
        "independencies.",
        see=["independence", "relation", "conditional"]),
    "independence": Concept(
        "independence", "Implied independence",
        "A pair of variables the graph says are independent, once some others are held fixed, and whether the data "
        "agrees.",
        "For every two variables with no arrow between them, the smallest set of other variables that blocks every "
        "path between them, by d-separation. Then a kernel conditional-independence test, RCoT: on 2000 outcomes "
        "drawn at random, random Fourier features of x, of y and of the blocking set; the features of x and y are "
        "regressed on those of the set, and what is left is correlated feature by feature. The statistic is the "
        "squared size of that cross-covariance; under independence its distribution is known, and the p-value is "
        "how often chance alone would make it this large. Below 0.01 fails, above 0.05 holds, between unclear. "
        "Beside it, for size and sign only, the partial rank correlation of x and y given the set, with its 95 % "
        "interval.",
        "A fail is an arrow the graph lacks, or a cause left out. Fix the graph or say why not before reading any "
        "conditional that depends on it. Holds does not make the graph right. The partial r says which way and how "
        "much; the kernel test sees any shape of dependence, a U included, which r would miss.",
        "Outcomes in time are not independent draws, so both tests are a little too eager. Two thousand outcomes "
        "are enough to see a dependence of modest size; a tiny one can pass.",
        look="price_1 ⊥ day_ahead_se3 | ∅: p = 0.003, r = 0.31 [0.29, 0.33], fails", see=["dag", "interval"]),
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

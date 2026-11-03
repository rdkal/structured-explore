// Draws the page from the JSON page.py inlined: a document in four sections, Data, Graph, Events, Questions. One
// renderer per figure kind in FIGURES, keyed like figures.FIGURES in Python. Anything the reader may not know is a
// term or a mark: click it and the pane on the right explains it (concepts.py), with this page's numbers and a
// drawing where one helps. The reader's guesses and lineup picks live in localStorage, per page.

const data = JSON.parse(document.getElementById("data").textContent);
document.title = data.title;
const KEY = `structured-explore:${location.pathname}`;
const CONCEPTS = Object.fromEntries(data.concepts.map((c) => [c.id, c]));
const VARS = Object.fromEntries(data.variables.map((v) => [v.column, v]));

// --- helpers ---------------------------------------------------------------------------------------------------

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat(Infinity)) if (c != null && c !== false) el.append(c.nodeType ? c : String(c));
  return el;
}
const svgNS = "http://www.w3.org/2000/svg";
function s(tag, attrs = {}, ...children) {
  const el = document.createElementNS(svgNS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  for (const c of children.flat()) if (c != null) el.append(c.nodeType ? c : String(c));
  return el;
}
const code = (t) => h("code", {}, t);
const f2 = (x) => (x == null || Number.isNaN(x) ? "–" : x.toFixed(2));
const ofN = (n, N) => `${n} of ${N}`;
const notOf = (w) => (/\s/.test(w) ? `not (${w})` : `not ${w}`);
function share(n, N) {
  return h("span", { class: "share" }, h("i", { style: `--w:${N ? (100 * n) / N : 0}%` }), ofN(n, N));
}
function term(text, id, ctx) {
  if (!CONCEPTS[id]) return h("span", {}, text);
  return h("button", { class: "term", type: "button", title: CONCEPTS[id].what, onclick: () => openPane(id, ctx) }, text);
}
function help(id, ctx) {
  return h("button", { class: "help", type: "button", title: `What is this? ${CONCEPTS[id] ? CONCEPTS[id].title : id}`,
    "aria-label": "explain", onclick: (e) => { e.stopPropagation(); openPane(id, ctx); } }, "?");
}
function mark(cls, text, id, ctx) {
  return h("button", { class: `mark ${cls}`, type: "button", title: CONCEPTS[id] ? CONCEPTS[id].what : null, onclick: () => openPane(id, ctx) }, text);
}
const store = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(`${KEY}:${k}`)); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(`${KEY}:${k}`, JSON.stringify(v)); } catch {} },
  clear: () => { try { Object.keys(localStorage).filter((k) => k.startsWith(KEY)).forEach((k) => localStorage.removeItem(k)); } catch {} },
};

// --- figures -----------------------------------------------------------------------------------------------------

const FIGURES = {
  bar(fig, a) {
    const W = 420, H = 64, L = 10, R = 10, y = 22, bh = 16;
    const x = (p) => L + p * (W - L - R);
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img" });
    svg.append(s("rect", { x: x(0), y, width: W - L - R, height: bh, fill: "var(--grey-mark)", rx: 2 }));
    const bar = s("rect", { class: "cell", x: x(0), y, width: x(fig.p) - x(0), height: bh, fill: "var(--blue)", rx: 2 });
    bar.append(s("title", {}, `${a.event}: ${ofN(fig.n, fig.N)} (${f2(fig.p)})`));
    svg.append(bar);
    svg.append(s("line", { x1: x(fig.lo), x2: x(fig.hi), y1: y + bh / 2, y2: y + bh / 2, stroke: "var(--ink)", "stroke-width": 2 }));
    for (const v of [fig.lo, fig.hi]) svg.append(s("line", { x1: x(v), x2: x(v), y1: y + 3, y2: y + bh - 3, stroke: "var(--ink)", "stroke-width": 2 }));
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      svg.append(s("line", { class: "axis", x1: x(t), x2: x(t), y1: y + bh + 2, y2: y + bh + 6 }));
      svg.append(s("text", { x: x(t), y: y + bh + 18, "text-anchor": "middle" }, t.toFixed(2)));
    }
    return svg;
  },
  spine(fig, a, opts = {}) {
    const small = opts.small;
    const W = small ? 120 : 420, H = small ? 90 : 230;
    const L = small ? 0 : 36, R = small ? 0 : 10, T = small ? 0 : 8, B = small ? 0 : 40;
    const pw = W - L - R, ph = H - T - B, gap = small ? 1 : 3;
    const N = fig.nB + fig.nNotB;
    const cols = [
      { label: a.given, n: fig.nB, nA: fig.nAB },
      { label: notOf(a.given), n: fig.nNotB, nA: fig.nAnotB },
    ];
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img" });
    let x = L;
    for (const c of cols) {
      const w = N ? (c.n / N) * pw : pw / 2, p = c.n ? c.nA / c.n : 0;
      const hA = p * ph;
      const top = s("rect", { class: "cell", x, y: T, width: Math.max(w - gap, 0), height: ph - hA, fill: "var(--grey-mark)" });
      const bot = s("rect", { class: "cell", x, y: T + ph - hA, width: Math.max(w - gap, 0), height: hA, fill: "var(--blue)" });
      if (!small) {
        top.append(s("title", {}, `${notOf(a.event)} and ${c.label}: ${ofN(c.n - c.nA, c.n)} (${f2(1 - p)})`));
        bot.append(s("title", {}, `${a.event} and ${c.label}: ${ofN(c.nA, c.n)} (${f2(p)})`));
        const label = c.label.length * 6.6 > w ? c.label.slice(0, Math.max(Math.floor(w / 6.6) - 1, 3)) + "…" : c.label;
        svg.append(s("text", { x: x + w / 2, y: T + ph + 15, "text-anchor": "middle" }, label));
        svg.append(s("text", { x: x + w / 2, y: T + ph + 29, "text-anchor": "middle", fill: "var(--ink-3)" }, c.n));
      }
      svg.append(top, bot);
      x += w;
    }
    if (!small) {
      if (fig.band) {
        const y1 = T + ph * (1 - fig.band[1]), y2 = T + ph * (1 - fig.band[0]);
        const band = s("rect", { x: L, y: y1, width: pw, height: Math.max(y2 - y1, 1), fill: "var(--blue-soft)", opacity: 0.75 });
        band.append(s("title", {}, `null: ${f2(fig.band[0])}–${f2(fig.band[1])}`));
        svg.append(band);
      }
      const yA = T + ph * (1 - fig.pA);
      svg.append(s("line", { x1: L, x2: L + pw, y1: yA, y2: yA, stroke: "var(--ink)", "stroke-dasharray": "4 3" }));
      for (const t of [0, 0.5, 1]) {
        const y = T + ph * (1 - t);
        svg.append(s("line", { class: "axis", x1: L - 4, x2: L, y1: y, y2: y }));
        svg.append(s("text", { x: L - 7, y: y + 4, "text-anchor": "end" }, t.toFixed(1)));
      }
    }
    return svg;
  },
};
FIGURES.conditional = FIGURES.spine;

function legend(a) {
  if (a.figure.kind === "bar") return `Share of outcomes where ${a.event}; the whisker is the interval.`;
  return `Columns: ${a.given} and not, as wide as their share. Blue: ${a.event}. Dashed: over all outcomes. Band: the null.`;
}

// --- the graph ---------------------------------------------------------------------------------------------------
// The spec's graph is the starting point; the reader edits a copy here, and every verdict is looked up in the table
// the build made: every pair of variables tested given every set of up to max_given variables from their levels or
// earlier. So any graph over these levels is judged without the data, instantly. The same table gives the candidate
// graphs the data allows, one drawn beside the reader's.

const NODES = data.variables.map((v) => v.column);
const ORDER = Object.fromEntries(NODES.map((n, i) => [n, i]));
const DEPTH = {};
if (data.graph) data.graph.levels.forEach((level, i) => level.forEach((n) => (DEPTH[n] = i)));
const byOrder = (a, b) => ORDER[a] - ORDER[b];
function tkey(x, y, z) {
  const [a, b] = ORDER[x] < ORDER[y] ? [x, y] : [y, x];
  return `${a}|${b}|${[...z].sort(byOrder).join(",")}`;
}
const TABLE = new Map(data.graph ? data.graph.table.map((i) => [tkey(i.x, i.y, i.given), i]) : []);
const sameLink = (e, f) => e[0] === f[0] && e[1] === f[1];
const hasLink = (list, e) => list.some((f) => sameLink(e, f));
const sameGraph = (a, b) => a.edges.length === b.edges.length && a.latent.length === b.latent.length && a.edges.every((e) => hasLink(b.edges, e)) && a.latent.every((e) => hasLink(b.latent, e));

function arrowsOf(g) {
  const out = g.edges.map((e) => [e[0], e[1]]);
  g.latent.forEach(([a, b], i) => out.push([`_latent${i}`, a], [`_latent${i}`, b]));
  return out;
}
// Whether every path between x and y is blocked given z: in the moral graph of the ancestors of x, y and z, with
// z removed, x and y are not connected. The same as graph.d_separated in Python.
function dsep(g, x, y, z) {
  const arr = arrowsOf(g), par = {};
  for (const [a, b] of arr) (par[b] ||= []).push(a);
  const keep = new Set([x, y, ...z]), todo = [...keep];
  while (todo.length) { const n = todo.pop(); for (const p of par[n] || []) if (!keep.has(p)) { keep.add(p); todo.push(p); } }
  const adj = {}, link = (a, b) => { (adj[a] ||= new Set()).add(b); (adj[b] ||= new Set()).add(a); };
  for (const [a, b] of arr) if (keep.has(a) && keep.has(b)) link(a, b);
  for (const n of keep) { const ps = (par[n] || []).filter((p) => keep.has(p)); for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) link(ps[i], ps[j]); }
  const zs = new Set(z), seen = new Set([x]), stack = [x];
  while (stack.length) { const n = stack.pop(); for (const m of adj[n] || []) { if (zs.has(m) || seen.has(m)) continue; if (m === y) return false; seen.add(m); stack.push(m); } }
  return true;
}
function combos(arr, k) {
  if (k === 0) return [[]];
  const out = [];
  arr.forEach((v, i) => { for (const c of combos(arr.slice(i + 1), k - 1)) out.push([v, ...c]); });
  return out;
}
// The sets a separating set may be drawn from, smallest first, as graph.sets in Python: the table has every one.
function sets(x, y) {
  const top = Math.max(DEPTH[x], DEPTH[y]), c = NODES.filter((n) => n !== x && n !== y && DEPTH[n] <= top);
  const out = [];
  for (let k = 0; k <= Math.min(data.graph.max_given, c.length); k++) out.push(...combos(c, k));
  return out;
}
const adjacentIn = (g, x, y) => hasLink(g.edges, [x, y]) || hasLink(g.edges, [y, x]) || hasLink(g.latent, [x, y]) || hasLink(g.latent, [y, x]);
// What the graph g implies, with the table's verdict on each: for every pair without a link, the smallest set that
// separates them; pairs no set of up to max_given separates are counted, not tested.
function impliedOf(g) {
  const out = [], none = [];
  for (let i = 0; i < NODES.length; i++) for (let j = i + 1; j < NODES.length; j++) {
    const x = NODES[i], y = NODES[j];
    if (adjacentIn(g, x, y)) continue;
    const z = sets(x, y).find((z) => dsep(g, x, y, z));
    if (z === undefined) { none.push([x, y]); continue; }
    out.push(TABLE.get(tkey(x, y, z)) || { x, y, given: z, verdict: "untested", n: 0 });
  }
  return { out, none };
}

// Node positions: Graphviz's when the build had it, else rows by level. Fixed for the page; only the links change.
function positions() {
  const g = data.graph, nodeH = 28, width = (n) => n.length * 7.4 + 22, pos = {};
  if (g.layout) {
    for (const [n, [x, y, w, h]] of Object.entries(g.layout.nodes)) pos[n] = { x: x - w / 2, y: y - h / 2, w, h };
    return { W: g.layout.w, H: g.layout.h, pos };
  }
  const rowH = 78, pad = 14, gapX = 28, rows = g.levels;
  const rowW = rows.map((r) => r.reduce((w, n) => w + width(n), 0) + gapX * Math.max(r.length - 1, 0));
  const W = Math.max(...rowW, 240) + pad * 2 + 80, H = pad * 2 + rows.length * rowH - (rowH - nodeH) + 10;
  rows.forEach((r, i) => { let x = (W - rowW[i]) / 2; for (const n of r) { pos[n] = { x, y: pad + 10 + i * rowH, w: width(n), h: nodeH }; x += width(n) + gapX; } });
  return { W, H, pos };
}
const POS = data.graph ? positions() : null;
const SPLINE = new Map();
if (data.graph && data.graph.layout) for (const e of data.graph.layout.edges) {
  const p = e.points;
  let d = `M ${p[0][0]} ${p[0][1]}`;
  for (let i = 1; i + 2 < p.length; i += 3) d += ` C ${p[i][0]} ${p[i][1]}, ${p[i + 1][0]} ${p[i + 1][1]}, ${p[i + 2][0]} ${p[i + 2][1]}`;
  SPLINE.set(`${e.a}|${e.b}`, d);
}
// A link's path: Graphviz's spline when the build drew this very arrow, else a curve bowed aside when it skips levels.
let bowSide = 1;
function pathOf(a, b, latent) {
  if (!latent && SPLINE.has(`${a}|${b}`)) return SPLINE.get(`${a}|${b}`);
  if (latent && SPLINE.has(`${a}|${b}`)) return SPLINE.get(`${a}|${b}`);
  const A = POS.pos[a], B = POS.pos[b];
  if (latent) {
    const x1 = A.x + A.w / 2, x2 = B.x + B.w / 2, y = Math.min(A.y, B.y);
    return `M ${x1} ${y} C ${x1} ${y - 26}, ${x2} ${y - 26}, ${x2} ${y}`;
  }
  const skip = DEPTH[b] - DEPTH[a] - 1, x1 = A.x + A.w / 2, y1 = A.y + A.h, x2 = B.x + B.w / 2, y2 = B.y;
  const bow = skip ? bowSide * (34 + 26 * skip) : 0;
  if (skip) bowSide = -bowSide;
  const dy = (y2 - y1) / 2;
  return `M ${x1} ${y1} C ${x1 + bow} ${y1 + dy}, ${x2 + bow} ${y2 - dy}, ${x2} ${y2}`;
}

// Draws a graph over the page's nodes. opts.cls(a, b, latent) classes a link; opts.title(a, b, latent) names it;
// opts.onNode(n) and opts.onLink(a, b, latent) make it editable; opts.selected is the node picked first.
function dag(g, opts = {}) {
  const { W, H, pos } = POS;
  const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img" });
  svg.append(s("defs", {}, s("marker", { id: "arrow", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" },
    s("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "context-stroke" }))));
  const links = [...g.edges.map(([a, b]) => ({ a, b, latent: false })), ...g.latent.map(([a, b]) => ({ a, b, latent: true }))];
  const edgeEls = [];
  bowSide = 1;
  for (const p of links) {
    if (!pos[p.a] || !pos[p.b]) continue;
    const d = pathOf(p.a, p.b, p.latent);
    const el = s("path", { class: `edge ${p.latent ? "latent" : ""} ${opts.cls ? opts.cls(p.a, p.b, p.latent) : ""}`, d, "marker-end": "url(#arrow)", "marker-start": p.latent ? "url(#arrow)" : null });
    el.append(s("title", {}, opts.title ? opts.title(p.a, p.b, p.latent) : p.latent ? `${p.a} <-> ${p.b}: a shared cause not in the data` : `${p.a} → ${p.b}`));
    el.dataset.a = p.a; el.dataset.b = p.b;
    svg.append(el);
    edgeEls.push(el);
    if (opts.onLink) {
      const hit = s("path", { class: "hit", d });
      hit.append(s("title", {}, `remove ${p.latent ? `${p.a} <-> ${p.b}` : `${p.a} → ${p.b}`}`));
      hit.addEventListener("click", () => opts.onLink(p.a, p.b, p.latent));
      svg.append(hit);
    }
  }
  const list = h("p", { class: "arrows small hint" }, opts.hint || "Hover a node for its arrows.");
  const nodeEls = {};
  for (const n of NODES) {
    const p = pos[n], v = VARS[n];
    if (!p) continue;
    const gEl = s("g", { class: `node ${v && v.expr ? "derived" : ""} ${opts.selected === n ? "sel" : ""}`, transform: `translate(${p.x} ${p.y})` });
    gEl.append(s("rect", { width: p.w, height: p.h }), s("text", { x: p.w / 2, y: p.h / 2 + 4, "text-anchor": "middle" }, n));
    gEl.append(s("title", {}, v ? `${n}: ${v.meaning} (${v.observed})` : n));
    gEl.addEventListener("click", () => (opts.onNode ? opts.onNode(n) : openPane("variable", { variable: v })));
    gEl.addEventListener("mouseenter", () => focus(n));
    gEl.addEventListener("mouseleave", () => focus(null));
    svg.append(gEl);
    nodeEls[n] = gEl;
  }
  function focus(n) {
    svg.classList.toggle("dim", n != null);
    for (const el of edgeEls) el.classList.toggle("lit", n != null && (el.dataset.a === n || el.dataset.b === n));
    for (const [m, el] of Object.entries(nodeEls)) el.classList.toggle("lit", n != null && (m === n || links.some((p) => (p.a === n && p.b === m) || (p.b === n && p.a === m))));
    list.classList.toggle("hint", n == null);
    if (n == null) { list.textContent = opts.hint || "Hover a node for its arrows."; return; }
    const from = links.filter((p) => p.b === n && !p.latent).map((p) => p.a), to = links.filter((p) => p.a === n && !p.latent).map((p) => p.b);
    const with_ = links.filter((p) => p.latent && (p.a === n || p.b === n)).map((p) => (p.a === n ? p.b : p.a));
    list.replaceChildren(code(n), from.length ? ` ← ${from.join(", ")}` : " ← nothing in the data", to.length ? `   ${n} → ${to.join(", ")}` : "", with_.length ? `   <-> ${with_.join(", ")}` : "");
  }
  return h("div", { class: "dag" }, svg, list);
}

const VERDICT = { holds: ["✓", "holds"], fails: ["✗", "fails"], unclear: ["~", "unclear"], untested: ["–", "untested"] };
const pfmt = (p) => (p == null ? "–" : p < 0.001 ? "<0.001" : p.toFixed(3));
const indText = (i) => `${i.x} ⊥ ${i.y}${i.given.length ? " | " + i.given.join(", ") : ""}`;

function independencies(g) {
  const { out, none } = impliedOf(g);
  if (!out.length && !none.length) return h("p", { class: "small" }, "Every pair of variables has a link: the graph implies no independence to test.");
  const rows = out.map((i) => {
    const [glyph, word] = VERDICT[i.verdict];
    return h("tr", { onclick: () => openPane("independence", { independence: i }), style: "cursor:help" },
      h("td", { class: "key" }, indText(i)),
      h("td", { class: "num" }, pfmt(i.p)),
      h("td", { class: "num" }, i.r == null ? "–" : `${f2(i.r)} [${f2(i.lo)}, ${f2(i.hi)}]`),
      h("td", { class: "num" }, i.n || "–"),
      h("td", { class: `num verdict-${i.verdict}` }, `${glyph} ${word}`));
  });
  const fails = out.filter((i) => i.verdict === "fails").length;
  return h("details", { open: fails > 0 }, h("summary", {}, `${out.length} implied independencies, ${fails} fail`, fails ? "" : ": the data does not contradict the graph",
      none.length ? `; ${none.length} pairs no set of up to ${data.graph.max_given} separates, untested` : ""),
    h("table", { class: "ind" }, h("thead", {}, h("tr", {}, h("th", {}, term("implied", "independence")), h("th", { class: "num" }, "kernel p"), h("th", { class: "num" }, "partial r"), h("th", { class: "num" }, "n"), h("th", { class: "num" }, "verdict"))),
      h("tbody", {}, ...rows)));
}

// The reader's graph: the spec's until edited, kept per page.
function currentGraph() {
  const g = data.graph, saved = store.get("graph");
  const ok = (e) => Array.isArray(e) && e.length === 2 && e.every((n) => n in DEPTH);
  if (saved && Array.isArray(saved.edges) && Array.isArray(saved.latent) && [...saved.edges, ...saved.latent].every(ok)) return saved;
  return { edges: g.edges.map((e) => [...e]), latent: g.latent.map((e) => [...e]) };
}
const arrowText = (a, b, latent) => (latent ? `${a} <-> ${b}` : `${a} -> ${b}`);
const linkKeyOf = ([a, b]) => `${a}|${b}`;

function graphSection() {
  const g = data.graph;
  const body = h("div", {});
  let cur = currentGraph(), selected = null;
  const specGraph = () => ({ edges: g.edges.map((e) => [...e]), latent: g.latent.map((e) => [...e]) });
  const isSpec = () => sameGraph(cur, specGraph());
  // The candidates: the spec's graph first, then what the build found from the table. Each is judged here, as
  // any graph is, so its fails and separations are the page's own.
  const cands = [{ name: "The spec's", note: "as written in explore.yaml", edges: g.edges.map(([a, b]) => ({ a, b })), latent: g.latent.map(([a, b]) => ({ a, b })) },
    ...(g.candidates || [])].map((c) => {
    const graph = { edges: c.edges.map((e) => [e.a, e.b]), latent: c.latent.map((e) => [e.a, e.b]) };
    const { out, none } = impliedOf(graph);
    return { ...c, graph, implied: out, untested: none.length, fails: out.filter((i) => i.verdict === "fails").length, links: c.edges.length + c.latent.length };
  });
  const order = cands.map((_, i) => i).sort((i, j) => (j === 0) - (i === 0) || cands[i].fails - cands[j].fails || cands[i].links - cands[j].links || i - j);
  let pick = store.get("candidate");
  if (!(pick in cands)) pick = cands.length > 1 ? 1 : 0;
  const linkOf = (c, a, b) => [...c.edges, ...c.latent].find((e) => (e.a === a && e.b === b) || (e.a === b && e.b === a));
  const separatedOf = (c, a, b) => c.implied.find((s) => (s.x === a && s.y === b) || (s.x === b && s.y === a));
  const copy = (gr) => ({ edges: gr.edges.map((e) => [...e]), latent: gr.latent.map((e) => [...e]) });
  function set(next) { cur = next; selected = null; store.set("graph", cur); render(); }
  function toggle(a, b, latent) {
    const list = latent ? cur.latent : cur.edges, i = list.findIndex((e) => sameLink(e, [a, b]));
    if (i >= 0) list.splice(i, 1); else list.push([a, b]);
    set({ edges: cur.edges, latent: cur.latent });
  }
  function onNode(n) {
    if (selected == null) { selected = n; render(); return; }
    if (selected === n) { selected = null; render(); openPane("variable", { variable: VARS[n] }); return; }
    const [a, b] = DEPTH[selected] <= DEPTH[n] ? [selected, n] : [n, selected];
    if (DEPTH[a] === DEPTH[b]) toggle(a, b, true);
    else { const j = cur.edges.findIndex((e) => sameLink(e, [b, a])); if (j >= 0) cur.edges.splice(j, 1); toggle(a, b, false); }
  }
  const diffOf = (c) => ({
    missing: [...c.edges.filter((e) => !hasLink(cur.edges, [e.a, e.b])).map((e) => [e, false]), ...c.latent.filter((e) => !hasLink(cur.latent, [e.a, e.b])).map((e) => [e, true])],
    unneeded: [...cur.edges.map((e) => [e, false]), ...cur.latent.map((e) => [e, true])].filter(([e]) => !linkOf(c, e[0], e[1])),
  });
  function render() {
    const c = cands[pick], { missing, unneeded } = diffOf(c);
    const mine = dag(cur, {
      onNode, onLink: toggle, selected,
      hint: selected ? `${selected} picked: click another node to link or unlink them, or ${selected} again for what it is.` : "Click a node, then another, to add or remove the link between them; click a link to remove it.",
      cls: (a, b) => (linkOf(c, a, b) ? "" : "unneeded"),
      title: (a, b, latent) => { const sep = separatedOf(c, a, b); return `${arrowText(a, b, latent)}${sep ? `: not in ${c.name}, where ${indText(sep)} ${VERDICT[sep.verdict][1]}, p = ${pfmt(sep.p)}` : linkOf(c, a, b) ? "" : `: not in ${c.name}, untested there`}`; },
    });
    const theirs = dag(c.graph, {
      hint: "Hover a node for its arrows, a link for why it is there. Red: a link your graph lacks.",
      cls: (a, b, latent) => (hasLink(latent ? cur.latent : cur.edges, [a, b]) ? "" : "missing"),
      title: (a, b, latent) => { const l = linkOf(c, a, b); return `${arrowText(a, b, latent)}${l.without ? `: without it ${indText(l.without)} ${VERDICT[l.without.verdict][1]}, p = ${pfmt(l.p)}` : ""}`; },
    });
    const rows = order.map((i) => { const k = cands[i], d = diffOf(k);
      return h("tr", { class: i === pick ? "picked" : "", onclick: () => { pick = i; store.set("candidate", i); render(); } },
        h("td", {}, h("b", {}, k.name), h("div", { class: "small" }, k.note)),
        h("td", { class: "num" }, k.links),
        h("td", { class: `num ${k.fails ? "verdict-fails" : "verdict-holds"}` }, k.fails),
        h("td", { class: "num", title: `pairs no set of up to ${g.max_given} separates there` }, k.untested || "–"),
        h("td", { class: "num" }, d.missing.length || d.unneeded.length ? `+${d.missing.length} −${d.unneeded.length}` : "same"),
        h("td", {}, h("button", { type: "button", class: "quiet", disabled: sameGraph(cur, k.graph), onclick: (e) => { e.stopPropagation(); pick = i; store.set("candidate", i); set(copy(k.graph)); } }, "Use"))); });
    const list = h("table", { class: "cands" }, h("thead", {}, h("tr", {}, h("th", {}, "Candidate"), h("th", { class: "num" }, "links"), h("th", { class: "num" }, "fails"), h("th", { class: "num" }, "untested"), h("th", { class: "num" }, "vs yours"), h("th", {}))), h("tbody", {}, ...rows));
    const diff = h("div", { class: "diff small" });
    if (!missing.length && !unneeded.length) diff.append(h("p", {}, `Your graph is ${c.name}: every link it has, none it lacks.`));
    else {
      if (missing.length) diff.append(h("p", {}, h("b", { class: "bad" }, `${c.name} has, yours lacks: `), ...missing.flatMap(([e, latent], i) => [i ? ", " : "", code(arrowText(e.a, e.b, latent)), e.p != null ? ` (p ${pfmt(e.p)})` : ""]),
        missing.some(([, l]) => l) ? [" — a link within a level is a ", term("shared cause", "shared-cause"), " not in the data."] : ""));
      if (unneeded.length) diff.append(h("p", {}, h("b", {}, `Yours has, ${c.name} does not: `), ...unneeded.flatMap(([e, latent], i) => { const sep = separatedOf(c, e[0], e[1]); return [i ? ", " : "", code(arrowText(e[0], e[1], latent)), sep ? ` (${indText(sep)} ${VERDICT[sep.verdict][1]}, p ${pfmt(sep.p)})` : ` (no set of up to ${g.max_given} separates them there: untested)`]; })));
    }
    const yaml = h("pre", { class: "yaml" }, ["  edges:", ...cur.edges.map(([a, b]) => `    - ${a} -> ${b}`), ...cur.latent.map(([a, b]) => `    - ${a} <-> ${b}`)].join("\n"));
    const tools = h("div", { class: "toolbar" },
      h("button", { type: "button", disabled: sameGraph(cur, c.graph), onclick: () => set(copy(c.graph)) }, `Use ${c.name}`),
      h("button", { type: "button", disabled: isSpec(), onclick: () => set(specGraph()) }, "Back to the spec's"),
      h("details", { class: "yaml" }, h("summary", {}, "As yaml, for the spec"), yaml),
      isSpec() ? null : h("span", { class: "small" }, "Edited: the questions' marks below still follow the spec's graph."));
    body.replaceChildren(
      h("div", { class: "dags" },
        h("div", {}, h("h3", {}, isSpec() ? "The spec's graph" : "Your graph", help("dag")), mine),
        h("div", {}, h("h3", {}, term(c.name, "candidates"), h("span", { class: "small" }, ` · ${c.links} links, ${c.fails} fail`), help("candidates")), theirs)),
      diff, tools,
      h("h3", {}, term("Candidates", "candidates"), help("candidates")), list,
      independencies(cur));
  }
  render();
  return h("section", { id: "graph" }, h("h2", {}, term("Graph", "dag"), help("dag")),
    g.notes ? h("p", { class: "small" }, g.notes) : null, body);
}

// --- the pane: explanations, with this page's numbers and a drawing ---------------------------------------------

const pane = h("aside", { class: "pane", role: "dialog", "aria-label": "Explanation", "aria-hidden": "true" });
document.body.append(pane);
let paneStack = [];

function closePane() {
  pane.classList.remove("open");
  pane.setAttribute("aria-hidden", "true");
  document.body.classList.remove("pane-open");
  paneStack = [];
}
function paneBar(title, back) {
  return h("div", { class: "bar" }, back ? h("button", { type: "button", class: "quiet", onclick: back }, "← back") : null,
    h("p", { class: "kicker" }, title), h("button", { type: "button", class: "quiet", onclick: () => openIndex() }, "all"),
    h("button", { type: "button", onclick: closePane, "aria-label": "close" }, "✕"));
}
function show(content) {
  pane.replaceChildren(...content);
  pane.classList.add("open");
  pane.setAttribute("aria-hidden", "false");
  document.body.classList.add("pane-open");
  pane.scrollTop = 0;
}
function openPane(id, ctx) {
  const c = CONCEPTS[id];
  if (!c) return;
  const prev = paneStack.at(-1);
  const back = prev ? () => { paneStack.pop(); const p = paneStack.pop(); openPane(p.id, p.ctx); } : null;
  paneStack.push({ id, ctx });
  const content = [paneBar("Explained", back), h("h2", {}, c.title)];
  if (c.look) content.push(h("p", { class: "look" }, c.look));
  const drawing = draw(id, ctx);
  if (drawing) content.push(h("div", { class: "draw" }, drawing));
  content.push(h("h4", {}, "What it is"), h("p", {}, c.what));
  const hereEl = here(id, ctx);
  if (hereEl) content.push(h("h4", {}, "On this page"), h("div", { class: "here" }, hereEl));
  content.push(h("h4", {}, "How it is worked out"), h("p", {}, c.how));
  content.push(h("h4", {}, "How to read it"), h("p", {}, c.read));
  if (c.caveat) content.push(h("h4", {}, "What it does not tell you"), h("p", {}, c.caveat));
  if (c.see.length) {
    content.push(h("h4", {}, "See also"), h("div", { class: "see" },
      ...c.see.filter((x) => CONCEPTS[x]).map((x) => h("button", { type: "button", onclick: () => openPane(x, ctx) }, CONCEPTS[x].title))));
  }
  show(content);
}
function openIndex() {
  paneStack = [];
  const groups = [
    ["The data", ["sample-space", "outcome", "variable", "observed", "entry", "join", "undefined", "days"]],
    ["The graph", ["dag", "found", "candidates", "shared-cause", "independence", "relation", "graph"]],
    ["Events and questions", ["event", "named", "marginal", "joint", "conditional"]],
    ["Reading an answer", ["count", "interval", "shuffle", "split_half", "guess", "record"]],
    ["The figures", ["bar", "spine", "lineup"]],
  ];
  const listed = new Set(groups.flatMap((g) => g[1]));
  const rest = data.concepts.map((c) => c.id).filter((id) => !listed.has(id));
  if (rest.length) groups.push(["More", rest]);
  const content = [paneBar("Explained", null), h("h2", {}, "Every concept on this page"),
    h("p", { class: "small" }, "Anything with a dotted underline, a mark, a figure, a graph node or a ? can be clicked for its explanation.")];
  for (const [title, ids] of groups) {
    const ul = h("ul", { class: "index" });
    for (const id of ids) {
      const c = CONCEPTS[id];
      if (!c) continue;
      ul.append(h("li", {}, h("button", { type: "button", onclick: () => openPane(id) }, c.title, h("span", { class: "small" }, c.what))));
    }
    content.push(h("div", { class: "group" }, h("h4", {}, title), ul));
  }
  show(content);
}
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closePane(); });

function here(id, ctx) {
  if (!ctx) return null;
  const a = ctx.answer, v = ctx.variable, e = ctx.event, i = ctx.independence;
  if (a) {
    const denom = a.kind === "conditional" ? `the ${a.N} outcomes where ${a.given}` : `all ${a.N} outcomes where it is defined`;
    switch (id) {
      case "count": return h("p", {}, `P(${a.name}) = ${f2(a.p)}: `, code(ofN(a.n, a.N)), `, counted over ${denom}.`);
      case "interval": return h("p", {}, `[${f2(a.lo)}, ${f2(a.hi)}] around ${f2(a.p)}, from N = ${a.N}. The interval is ${f2(a.hi - a.lo)} wide.`);
      case "marginal": return h("p", {}, `Of all ${a.N} outcomes, ${a.n} have `, code(a.event), `: ${f2(a.p)}.`);
      case "joint": return h("p", {}, `Of all ${a.N} outcomes, ${a.n} have both `, code(a.event), " and ", code(a.given), `: ${f2(a.p)}.`);
      case "conditional": return h("p", {}, `Of the ${a.N} outcomes where `, code(a.given), `, ${a.n} have `, code(a.event), `: ${f2(a.p)}.`,
        a.figure && a.figure.kind === "spine" ? ` Among the ${a.figure.nNotB} others: ${a.figure.nAnotB}, ${f2(a.figure.nAnotB / a.figure.nNotB)}. Over everything: ${f2(a.figure.pA)}.` : "");
      case "shuffle": if (!a.null) return null; {
        const outside = a.p < a.null.lo || a.p > a.null.hi;
        return h("p", {}, `200 shuffles gave ${f2(a.null.lo)}–${f2(a.null.hi)}. The answer, ${f2(a.p)}, is ${outside ? "outside" : "inside"}: `,
          outside ? [code(a.given), " tells you something about ", code(a.event), "."] : "this much could be chance.");
      }
      case "split_half": { const c = a.checks.find((x) => x.name === "split_half"); return c ? h("p", {}, c.text) : null; }
      case "guess": { const g = ctx.guess; if (!g || g.lo == null) return h("p", {}, "No guess was made for this answer.");
        const hit = g.lo <= a.p && a.p <= g.hi; return h("p", {}, `You guessed ${f2(g.lo)}–${f2(g.hi)}; the share is ${f2(a.p)}: ${hit ? "a hit" : "a miss"}.`); }
      case "spine": if (!a.figure || a.figure.kind !== "spine") return null; { const f = a.figure;
        return h("p", {}, `Left column, ${a.given}: ${f.nB} outcomes, blue ${f2(f.nAB / f.nB)}. Right column, the others: ${f.nNotB} outcomes, blue ${f2(f.nAnotB / f.nNotB)}. Dashed line at ${f2(f.pA)}.`,
          f.band ? ` Band ${f2(f.band[0])}–${f2(f.band[1])}.` : ""); }
      case "bar": return h("p", {}, `${ofN(a.n, a.N)} = ${f2(a.p)}, whisker ${f2(a.lo)} to ${f2(a.hi)}.`);
      case "lineup": return a.lineup ? h("p", {}, "The real plot is one of the 20 under this answer. The 19 others are shuffles of ", code(a.event), ".") : null;
      case "record": return h("p", { class: "look" }, a.caption);
      case "relation": return a.relation ? h("p", {}, `Here ${a.relation.text}.`) : null;
    }
  }
  if (i) {
    const [, word] = VERDICT[i.verdict];
    return h("p", {}, code(`${i.x} ⊥ ${i.y}${i.given.length ? " | " + i.given.join(", ") : ""}`), i.p == null ? ": not tested, a variable is not a number."
      : `: the kernel test on ${i.n_kernel} of the ${i.n} outcomes gives p = ${i.p < 0.001 ? "<0.001" : i.p.toFixed(3)}, so it ${word}. What is left is a partial rank correlation of ${f2(i.r)} [${f2(i.lo)}, ${f2(i.hi)}].`);
  }
  if (v) {
    const N = data.sample_space.N;
    if (["variable", "observed", "undefined"].includes(id)) return h("p", {}, code(v.column), `: ${v.meaning}. ${v.observed}`, v.expr ? [", as ", code(v.expr)] : "", `; defined on ${ofN(v.defined, N)}`, v.defined < N ? `, ${N - v.defined} missing.` : ".");
  }
  if (e) {
    if (["event", "named", "undefined", "count"].includes(id)) return h("p", {}, code(e.where), e.meaning ? `: ${e.meaning}.` : ".", ` True on ${ofN(e.true, e.N)}, named ${e.defined_when} looking`, e.undefined ? `, undefined on ${e.undefined}.` : ".");
  }
  if (id === "dag" && data.graph) return h("p", {}, `${data.variables.length} variables in ${data.graph.levels.length} levels; the spec draws ${data.graph.edges.length} arrows and ${data.graph.latent.length} shared causes, implying ${data.graph.independencies.length} independencies.`);
  if (["found", "candidates", "shared-cause"].includes(id) && data.graph && data.graph.candidates.length) { const f = data.graph.candidates[0];
    return h("p", {}, `${data.graph.table.length} tests, every pair given every set of up to ${data.graph.max_given}. The search's graph needs ${f.edges.length} arrows and ${f.latent.length} shared causes; the ${f.separated.length} other pairs are separated, none fails. ${data.graph.candidates.length} candidates to pick from.`); }
  if (id === "sample-space" || id === "outcome" || id === "entry") { const sp = data.sample_space;
    return h("p", {}, `One outcome is ${sp.outcome}. ${sp.N} outcomes`, sp.time ? ` over ${sp.days} days, ${sp.per_day_min} to ${sp.per_day_max} a day.` : "."); }
  if (id === "days") { const sp = data.sample_space; return sp.time ? h("p", {}, `${sp.days} days in ${sp.timezone}, ${sp.first} to ${sp.last}.`) : null; }
  return null;
}

function draw(id) {
  if (id === "spine") {
    const svg = s("svg", { viewBox: "0 0 440 190", width: 440, height: 190 });
    const L = 10, T = 10, ph = 140, pw = 200, wB = 0.35 * pw, hB = 0.6, hN = 0.3, pA = 0.4;
    const col = (x, w, p) => [s("rect", { x, y: T, width: w - 3, height: ph * (1 - p), fill: "var(--grey-mark)" }), s("rect", { x, y: T + ph * (1 - p), width: w - 3, height: ph * p, fill: "var(--blue)" })];
    svg.append(...col(L, wB, hB), ...col(L + wB, pw - wB, hN));
    svg.append(s("rect", { x: L, y: T + ph * (1 - 0.46), width: pw, height: ph * 0.12, fill: "var(--blue-soft)", opacity: 0.75 }));
    svg.append(s("line", { x1: L, x2: L + pw, y1: T + ph * (1 - pA), y2: T + ph * (1 - pA), stroke: "var(--ink)", "stroke-dasharray": "4 3" }));
    svg.append(s("text", { x: L + wB / 2, y: T + ph + 14, "text-anchor": "middle" }, "B"), s("text", { x: L + wB + (pw - wB) / 2, y: T + ph + 14, "text-anchor": "middle" }, "not B"));
    svg.append(s("text", { x: L + pw / 2, y: T + ph + 28, "text-anchor": "middle", fill: "var(--ink-3)" }, "width = share of outcomes"));
    const note = (y, text, yTo, xTo) => svg.append(s("line", { x1: xTo, x2: L + pw + 14, y1: yTo, y2: y, stroke: "var(--ink-3)" }), s("text", { x: L + pw + 18, y: y + 3 }, text));
    note(T + 8, "P(A | B): blue height, left", T + ph * (1 - hB / 2), L + wB / 2);
    note(T + 46, "P(A | not B): right", T + ph * (1 - hN / 2), L + wB + (pw - wB) / 2);
    note(T + 84, "P(A) over all: dashed", T + ph * (1 - pA), L + pw);
    note(T + 122, "null band: shuffled heights", T + ph * (1 - 0.4), L + pw);
    return svg;
  }
  if (id === "bar") {
    const svg = s("svg", { viewBox: "0 0 360 60", width: 360, height: 60 });
    svg.append(s("rect", { x: 10, y: 14, width: 240, height: 16, fill: "var(--grey-mark)", rx: 2 }), s("rect", { x: 10, y: 14, width: 96, height: 16, fill: "var(--blue)", rx: 2 }));
    svg.append(s("line", { x1: 86, x2: 106, y1: 22, y2: 22, stroke: "var(--ink)", "stroke-width": 2 }), s("line", { x1: 86, x2: 86, y1: 17, y2: 27, stroke: "var(--ink)", "stroke-width": 2 }), s("line", { x1: 106, x2: 106, y1: 17, y2: 27, stroke: "var(--ink)", "stroke-width": 2 }));
    svg.append(s("text", { x: 10, y: 48 }, "0"), s("text", { x: 250, y: 48, "text-anchor": "end" }, "1"), s("text", { x: 58, y: 48, "text-anchor": "middle" }, "share"), s("text", { x: 262, y: 26 }, "whisker: interval"));
    return svg;
  }
  if (id === "shuffle") {
    const svg = s("svg", { viewBox: "0 0 360 120", width: 360, height: 120 });
    const A1 = [1, 1, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 0], A2 = [0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 0];
    const row = (y, A, label) => {
      svg.append(s("text", { x: 10, y: y - 14 }, label));
      A.forEach((a, i) => svg.append(s("circle", { cx: 20 + i * 24, cy: y, r: 8, fill: a ? "var(--blue)" : "var(--grey-mark)" })));
      svg.append(s("line", { x1: 20 + 4.5 * 24, x2: 20 + 4.5 * 24, y1: y - 12, y2: y + 12, stroke: "var(--ink-3)", "stroke-dasharray": "2 2" }));
      svg.append(s("text", { x: 20 + 2 * 24, y: y + 24, "text-anchor": "middle", fill: "var(--ink-3)" }, "in B"), s("text", { x: 20 + 9.5 * 24, y: y + 24, "text-anchor": "middle", fill: "var(--ink-3)" }, "not in B"));
    };
    row(34, A1, "as observed: blue is A. P(A | B) = 4 of 5");
    row(94, A2, "one shuffle: same B, A dealt again. P(A | B) = 2 of 5");
    return svg;
  }
  if (id === "split_half") {
    const svg = s("svg", { viewBox: "0 0 360 90", width: 360, height: 90 });
    const half = [0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0];
    svg.append(s("text", { x: 10, y: 14 }, "the days, each dealt to one half"));
    half.forEach((hh, i) => svg.append(s("rect", { x: 10 + i * 26, y: 24, width: 22, height: 22, rx: 3, fill: hh ? "var(--blue)" : "var(--blue-soft)" })));
    svg.append(s("text", { x: 10, y: 70 }, "half 1: P = 0.19 [0.17, 0.21]"), s("text", { x: 190, y: 70 }, "half 2: P = 0.22 [0.20, 0.24]"));
    svg.append(s("text", { x: 10, y: 84, fill: "var(--ink-3)" }, "intervals overlap: these two halves agree. Repeated 20 times."));
    return svg;
  }
  if (id === "marginal" || id === "joint" || id === "conditional") {
    const svg = s("svg", { viewBox: "0 0 440 150", width: 440, height: 150 });
    const cells = [["A and B", 0, 0], ["A and not B", 1, 0], ["not A and B", 0, 1], ["not A and not B", 1, 1]];
    const num = { marginal: ["A and B", "A and not B"], joint: ["A and B"], conditional: ["A and B"] }[id];
    const den = { marginal: cells.map((c) => c[0]), joint: cells.map((c) => c[0]), conditional: ["A and B", "not A and B"] }[id];
    for (const [label, cx, cy] of cells) {
      const x = 10 + cx * 120, y = 20 + cy * 50;
      svg.append(s("rect", { x, y, width: 112, height: 42, fill: num.includes(label) ? "var(--blue)" : "var(--surface-2)", stroke: den.includes(label) ? "var(--ink)" : "var(--line)", "stroke-width": den.includes(label) ? 2 : 1 }));
      svg.append(s("text", { x: x + 56, y: y + 25, "text-anchor": "middle", fill: num.includes(label) ? "#fff" : "var(--ink-2)" }, label));
    }
    svg.append(s("text", { x: 66, y: 14, "text-anchor": "middle", fill: "var(--ink-3)" }, "in B"), s("text", { x: 186, y: 14, "text-anchor": "middle", fill: "var(--ink-3)" }, "not in B"));
    svg.append(s("text", { x: 250, y: 50 }, "blue: counted, n"), s("text", { x: 250, y: 70 }, "outlined: out of, N"));
    svg.append(s("text", { x: 10, y: 140, fill: "var(--ink-3)" }, { marginal: "P(A) = n / N over every outcome", joint: "P(A and B) = n / N over every outcome", conditional: "P(A | B) = n / N over the outcomes in B only" }[id]));
    return svg;
  }
  if (id === "relation" || id === "dag") {
    const svg = s("svg", { viewBox: "0 0 360 70", width: 360, height: 70 });
    const box = (x, label) => svg.append(s("rect", { x, y: 20, width: 56, height: 26, rx: 4, fill: "#fff", stroke: "var(--ink)" }), s("text", { x: x + 28, y: 37, "text-anchor": "middle" }, label));
    box(10, "cause"); box(150, "effect"); box(290, "later");
    svg.append(s("defs", {}, s("marker", { id: "arr2", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto" }, s("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "var(--ink-2)" }))));
    svg.append(s("line", { x1: 66, x2: 148, y1: 33, y2: 33, stroke: "var(--ink-2)", "marker-end": "url(#arr2)" }), s("line", { x1: 206, x2: 288, y1: 33, y2: 33, stroke: "var(--ink-2)", "marker-end": "url(#arr2)" }));
    svg.append(s("text", { x: 10, y: 64, fill: "var(--ink-3)" }, "left of the event: upstream. Right of it: downstream."));
    return svg;
  }
  return null;
}

// --- sections ----------------------------------------------------------------------------------------------------

function toc() {
  const items = [["data", "Data"]];
  if (data.graph) items.push(["graph", "Graph"]);
  if (data.events.length) items.push(["events", "Events"]);
  if (data.answers.length) items.push(["questions", "Questions"]);
  const ol = h("ol", {});
  for (const [id, label] of items) {
    ol.append(h("li", {}, h("a", { href: `#${id}` }, label)));
    if (id === "questions") {
      const sub = h("ol", { class: "sub" });
      data.answers.forEach((a, i) => { const t = `P(${a.name})`; sub.append(h("li", {}, h("a", { href: `#q${i + 1}`, title: t }, t.length > 34 ? t.slice(0, 33) + "…" : t))); });
      ol.append(h("li", {}, sub));
    }
  }
  return h("nav", { class: "toc", "aria-label": "Contents" }, h("a", { class: "home", href: data.home }, "← Home"), ol,
    h("p", { class: "small explain" }, h("button", { type: "button", class: "quiet", onclick: () => openIndex() }, "? Explain anything")));
}

function header() {
  const sp = data.sample_space;
  const meta = [h("b", {}, sp.N), " ", term("outcomes", "outcome")];
  if (sp.time) meta.push(" · ", h("b", {}, sp.days), " ", term("days", "days"), " · ", `${sp.first} → ${sp.last}`);
  return h("header", {}, h("p", { class: "kicker" }, "Structured explore"), h("h1", {}, data.title),
    h("p", { class: "lede" }, data.phenomenon), h("p", { class: "meta" }, ...meta));
}

function dataSection() {
  const sp = data.sample_space, N = sp.N;
  const rows = data.variables.map((v) => h("tr", { class: v.defined < N ? "gap" : null },
    h("td", { class: "key" }, term(v.column, "variable", { variable: v })), h("td", {}, v.meaning, v.expr ? [" ", h("span", { class: "small" }, "= ", code(v.expr))] : null),
    h("td", {}, mark(v.observed === "measured" ? "" : "warn", v.observed, "observed", { variable: v })),
    h("td", {}, share(v.defined, N)),
    h("td", { class: "num" }, v.distinct), h("td", { class: "num" }, v.low), h("td", { class: "num" }, v.high)));
  const table = h("table", {}, h("thead", {}, h("tr", {}, h("th", {}, term("variable", "variable")), h("th", {}, "meaning"), h("th", {}, term("observed", "observed")),
    h("th", {}, term("defined", "undefined")), h("th", { class: "num" }, "distinct"), h("th", { class: "num" }, "low"), h("th", { class: "num" }, "high"))), h("tbody", {}, ...rows));
  const dl = h("dl", { class: "facts" }, h("dt", {}, term("Rows", "sample-space")), h("dd", {}, code(sp.source), " where ", code(sp.where)));
  if (sp.time) dl.append(h("dt", {}, term("Time", "days")), h("dd", {}, code(sp.time), `, days in ${sp.timezone}, ${sp.per_day_min} to ${sp.per_day_max} outcomes a day`));
  if (sp.entry) dl.append(h("dt", {}, term("Gets in", "entry")), h("dd", {}, sp.entry));
  for (const j of data.joins) dl.append(h("dt", {}, term(`Joined ${j.name}`, "join")), h("dd", {}, code(j.source), " where ", code(j.where), " on ", code(j.key), j.closes ? h("div", { class: "small" }, `Closes: ${j.closes}`) : null));
  const raw = h("details", {}, h("summary", {}, `${data.raw.rows.length} raw outcomes, spread over time`),
    h("div", { class: "raw-wrap" }, h("table", {}, h("thead", {}, h("tr", {}, ...data.raw.columns.map((c) => h("th", {}, c)))),
      h("tbody", {}, ...data.raw.rows.map((r) => h("tr", {}, ...r.map((c) => h("td", {}, c))))))));
  return h("section", { id: "data" }, h("h2", {}, term("Data", "sample-space"), help("sample-space")),
    h("p", {}, "One ", term("outcome", "outcome"), " is ", h("b", {}, sp.outcome), "."), table,
    h("details", {}, h("summary", {}, "Where the rows come from"), dl), raw);
}

function eventsSection() {
  const items = data.events.map((e) => h("li", {},
    h("span", {}, term(e.where, "event", { event: e }), e.defined_when === "after" ? [" ", mark("warn", "named after looking", "named", { event: e })] : null),
    share(e.true, e.N),
    e.meaning || e.undefined ? h("span", { class: "meaning" }, e.meaning, e.undefined ? h("span", { class: "muted" }, `${e.meaning ? " · " : ""}undefined on ${e.undefined}`) : null) : null));
  return h("section", { id: "events" }, h("h2", {}, term("Events", "event"), help("event"), h("span", { class: "n" }, "share of outcomes where true")),
    h("ul", { class: "events" }, ...items));
}

// --- questions ---------------------------------------------------------------------------------------------------

const RELATION = { upstream: ["→", "given upstream"], downstream: ["←", "given downstream"], both: ["↔", "up and downstream"],
  common: ["⌃", "common cause only"], unconnected: ["∅", "unconnected in graph"], same: ["=", "same variable"], none: ["?", "not in graph"] };

function marksOf(a, guess) {
  const ctx = { answer: a, guess };
  const marks = [];
  if (a.null) {
    const outside = a.p < a.null.lo || a.p > a.null.hi;
    marks.push(mark(outside ? "signal" : "", `${outside ? "●" : "○"} ${outside ? "outside" : "inside"} null ${f2(a.null.lo)}–${f2(a.null.hi)}`, a.null.name, ctx));
  }
  for (const c of a.checks) {
    const m = c.text.match(/\((\d+) of (\d+)/);
    const short = m ? `${m[1]}/${m[2]}` : "";
    if (c.ok === true) marks.push(mark("good", `✓ stable ${short}`, c.name, ctx));
    else if (c.ok === false) marks.push(mark("warn", `△ unstable ${short}`, c.name, ctx));
    else marks.push(mark("", `? ${c.name}`, c.name, ctx));
  }
  if (a.relation) { const [g, w] = RELATION[a.relation.kind]; marks.push(mark(a.relation.kind === "unconnected" ? "warn" : "", `${g} ${w}`, "relation", ctx)); }
  if (guess && guess.lo != null) {
    const hit = guess.lo <= a.p && a.p <= guess.hi;
    marks.push(mark(hit ? "good" : "bad", `${hit ? "✓ guess hit" : "✗ guess missed"} ${f2(guess.lo)}–${f2(guess.hi)}`, "guess", ctx));
  } else marks.push(mark("", "no guess", "guess", ctx));
  return h("ul", { class: "marks" }, ...marks.map((m) => h("li", {}, m)));
}

function lineupOf(a, i) {
  const key = `lineup:${i}`;
  const grid = h("div", { class: "grid" });
  const verdict = h("p", { class: "verdict small" }, "Which of the 20 is the real one? Click it.");
  const panels = a.lineup.panels.map((p, k) => {
    const btn = h("button", { class: "panel", type: "button", "aria-label": `panel ${k + 1}` },
      FIGURES.spine({ ...p, pA: 0, band: null }, a, { small: true }), h("span", { class: "n" }, k + 1));
    btn.addEventListener("click", () => pick(k + 1));
    return btn;
  });
  grid.append(...panels);
  function pick(k, replay = false) {
    const real = a.lineup.real;
    panels.forEach((b) => b.classList.remove("right", "wrong"));
    panels[real - 1].classList.add("right");
    if (k !== real) panels[k - 1].classList.add("wrong");
    verdict.textContent = k === real
      ? `Panel ${k} is the real one. Your eye found it among 19 shuffles.`
      : `Panel ${k} is a shuffle. The real one is panel ${real}: what you saw in it was chance.`;
    verdict.className = "verdict";
    if (!replay) store.set(key, k);
  }
  const saved = store.get(key);
  const det = h("details", { class: "lineup", open: saved != null },
    h("summary", {}, "The ", term("lineup", "lineup", { answer: a }), ": the real plot among 19 shuffled ones"), verdict, grid);
  if (saved != null) pick(saved, true);
  return det;
}

function question(a, i) {
  const id = `q${i + 1}`, key = `guess:${i}`;
  const card = h("article", { class: "q", id });
  const body = h("div", {});
  card.append(body);

  function reveal(guess) {
    const ctx = { answer: a, guess };
    const lhs = term(`P(${a.name}) =`, a.kind, ctx), p = term(f2(a.p), "count", ctx), ci = term(`[${f2(a.lo)}, ${f2(a.hi)}]`, "interval", ctx), nn = term(ofN(a.n, a.N), "count", ctx);
    lhs.classList.add("lhs"); p.classList.add("p"); ci.classList.add("ci"); nn.classList.add("nn");
    const fig = h("figure", { title: "Click for how to read this figure", onclick: () => openPane(a.figure.kind, ctx) },
      FIGURES[a.figure.kind](a.figure, a), h("figcaption", {}, legend(a)));
    const meanings = [a.event, a.given].filter(Boolean).map((w) => data.events.find((e) => e.where === w)).filter((e) => e && e.meaning);
    body.replaceChildren(...[
      h("h3", { class: "statement" }, lhs, p, ci, nn),
      meanings.length ? h("p", { class: "why" }, meanings.map((e, k) => [k ? "; " : "", code(e.where), ": ", e.meaning])) : null,
      marksOf(a, guess), fig,
      a.lineup ? lineupOf(a, i) : null,
      h("details", {}, h("summary", {}, "The ", term("line", "record", ctx), " as the record has it"), h("pre", { class: "record" }, a.caption))].filter(Boolean));
  }

  function ask() {
    const onFile = a.guess && a.guess.length === 2 ? a.guess : null;
    const lo = h("input", { type: "number", min: 0, max: 1, step: 0.01, placeholder: "low", value: onFile ? onFile[0] : "" });
    const hi = h("input", { type: "number", min: 0, max: 1, step: 0.01, placeholder: "high", value: onFile ? onFile[1] : "" });
    const go = h("button", { class: "primary", type: "button" }, "Reveal");
    go.addEventListener("click", () => {
      const g = lo.value !== "" && hi.value !== "" ? { lo: Math.min(+lo.value, +hi.value), hi: Math.max(+lo.value, +hi.value) } : {};
      store.set(key, g);
      reveal(g);
    });
    body.replaceChildren(
      h("h3", { class: "statement" }, h("span", { class: "lhs" }, `P(${a.name}) =`), h("span", { class: "p muted" }, "?")),
      h("div", { class: "guess" },
        h("span", {}, "Before you look, ", term("guess", "guess", { answer: a }), ": between"), lo, h("span", {}, "and"), hi, go,
        h("span", { class: "small" }, onFile ? `On file in explore.yaml: ${f2(onFile[0])}–${f2(onFile[1])}. Change it or reveal as is; leave both empty for no guess.`
          : "Leave both empty to reveal without a guess.")));
  }

  const saved = store.get(key);
  if (saved) reveal(saved); else ask();
  card.revealAll = () => { if (!store.get(key)) { const g = a.guess && a.guess.length === 2 ? { lo: a.guess[0], hi: a.guess[1] } : {}; store.set(key, g); reveal(g); } };
  return card;
}

function questions() {
  const cards = data.answers.map(question);
  const revealAll = h("button", { type: "button" }, "Reveal all");
  revealAll.addEventListener("click", () => cards.forEach((c) => c.revealAll()));
  const clear = h("button", { class: "quiet", type: "button" }, "Clear my guesses");
  clear.addEventListener("click", () => { store.clear(); location.reload(); });
  return h("section", { id: "questions" }, h("h2", {}, "Questions", help("conditional"), h("span", { class: "n" }, "each hidden until you have guessed")),
    h("div", { class: "toolbar" }, revealAll, clear), ...cards);
}

function foot() {
  return h("p", { class: "foot small" }, "A structured explore: built by ", code("structured-explore"), " from this folder's ",
    code("explore.yaml"), "; the numbers are in ", code("explore.json"), " beside this page.");
}

// --- page --------------------------------------------------------------------------------------------------------

const main = h("main", {}, header(), dataSection(), data.graph ? graphSection() : null,
  data.events.length ? eventsSection() : null, data.answers.length ? questions() : null, foot());
document.getElementById("app").append(h("div", { class: "layout" }, toc(), main));

const links = [...document.querySelectorAll(".toc a[href^='#']")];
const observer = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    links.forEach((l) => l.classList.toggle("current", l.getAttribute("href") === `#${e.target.id}`));
  }
}, { rootMargin: "-10% 0px -70% 0px" });
document.querySelectorAll("main section, main article").forEach((el) => observer.observe(el));

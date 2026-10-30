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

function dag(g) {
  const nodes = data.variables.map((v) => v.column);
  const parents = (n) => g.edges.filter(([, b]) => b === n).map(([a]) => a);
  const touched = new Set(g.edges.flat());
  const layer = {};
  const depth = (n, seen = new Set()) => {
    if (layer[n] != null) return layer[n];
    if (seen.has(n)) return 0;
    seen.add(n);
    const ps = parents(n);
    layer[n] = ps.length ? 1 + Math.max(...ps.map((p) => depth(p, seen))) : 0;
    return layer[n];
  };
  const linked = nodes.filter((n) => touched.has(n)), alone = nodes.filter((n) => !touched.has(n));
  linked.forEach((n) => depth(n));
  const layers = [];
  for (const n of linked) (layers[layer[n]] ||= []).push(n);
  const width = (n) => n.length * 7.4 + 22, rowH = 44, pad = 12;
  const colX = [];
  let x = pad;
  layers.forEach((ns, i) => { colX[i] = x; x += Math.max(...ns.map(width)) + 70; });
  const rows = Math.max(1, ...layers.map((l) => l.length));
  const pos = {};
  layers.forEach((ns, i) => ns.forEach((n, j) => { pos[n] = { x: colX[i], y: pad + (j + (rows - ns.length) / 2) * rowH, w: width(n) }; }));
  const H = pad * 2 + rows * rowH + (alone.length ? rowH + 10 : 0);
  const W = Math.max(x - 70 + pad, alone.reduce((a, n) => a + width(n) + 12, pad) + pad, 320);
  const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img" });
  const defs = s("defs", {}, s("marker", { id: "arrow", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" },
    s("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "var(--ink-2)" })));
  svg.append(defs);
  for (const [a, b] of g.edges) {
    const A = pos[a], B = pos[b];
    const x1 = A.x + A.w, y1 = A.y + 14, x2 = B.x, y2 = B.y + 14, dx = Math.max((x2 - x1) / 2, 20);
    svg.append(s("path", { class: "edge", d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`, "marker-end": "url(#arrow)" }));
  }
  const node = (n, p, cls) => {
    const v = VARS[n];
    const gEl = s("g", { class: `node ${cls} ${v && v.expr ? "derived" : ""}`, transform: `translate(${p.x} ${p.y})` });
    gEl.append(s("rect", { width: p.w, height: 28 }), s("text", { x: p.w / 2, y: 18, "text-anchor": "middle" }, n));
    gEl.append(s("title", {}, v ? `${n}: ${v.meaning} (${v.observed})` : n));
    gEl.addEventListener("click", () => openPane("variable", { variable: v }));
    return gEl;
  };
  for (const n of linked) svg.append(node(n, pos[n], ""));
  let ax = pad;
  const ay = pad + rows * rowH + 10;
  if (alone.length) svg.append(s("text", { x: pad, y: ay - 2, fill: "var(--ink-3)", "font-size": 10 }, "no arrows:"));
  for (const n of alone) { svg.append(node(n, { x: ax, y: ay + 4, w: width(n) }, "alone")); ax += width(n) + 12; }
  return svg;
}

const VERDICT = { holds: ["✓", "holds"], fails: ["✗", "fails"], unclear: ["~", "unclear"], untested: ["–", "untested"] };

function independencies(g) {
  if (!g.independencies.length) return h("p", { class: "small" }, "Every pair of variables has an arrow: the graph implies no independence to test.");
  const rows = g.independencies.map((i) => {
    const [glyph, word] = VERDICT[i.verdict];
    return h("tr", { onclick: () => openPane("independence", { independence: i }), style: "cursor:help" },
      h("td", { class: "key" }, `${i.x} ⊥ ${i.y}${i.given.length ? " | " + i.given.join(", ") : ""}`),
      h("td", { class: "num" }, i.r == null ? "–" : `${f2(i.r)} [${f2(i.lo)}, ${f2(i.hi)}]`),
      h("td", { class: "num" }, i.n || "–"),
      h("td", { class: `num verdict-${i.verdict}` }, `${glyph} ${word}`));
  });
  const n = g.independencies.length, fails = g.independencies.filter((i) => i.verdict === "fails").length;
  return h("details", { open: fails > 0 }, h("summary", {}, `${n} implied independencies, ${fails} fail`, fails ? "" : ": the data does not contradict the graph"),
    h("table", { class: "ind" }, h("thead", {}, h("tr", {}, h("th", {}, term("implied", "independence")), h("th", { class: "num" }, "partial r"), h("th", { class: "num" }, "n"), h("th", { class: "num" }, "verdict"))),
      h("tbody", {}, ...rows)));
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
    ["The graph", ["dag", "independence", "relation", "graph"]],
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
    return h("p", {}, code(`${i.x} ⊥ ${i.y}${i.given.length ? " | " + i.given.join(", ") : ""}`), i.r == null ? ": not tested, a variable is not a number."
      : `: partial rank correlation ${f2(i.r)} [${f2(i.lo)}, ${f2(i.hi)}] over ${i.n} outcomes, so it ${word}.`);
  }
  if (v) {
    const N = data.sample_space.N;
    if (["variable", "observed", "undefined"].includes(id)) return h("p", {}, code(v.column), `: ${v.meaning}. ${v.observed}`, v.expr ? [", as ", code(v.expr)] : "", `; defined on ${ofN(v.defined, N)}`, v.defined < N ? `, ${N - v.defined} missing.` : ".");
  }
  if (e) {
    if (["event", "named", "undefined", "count"].includes(id)) return h("p", {}, code(e.where), e.meaning ? `: ${e.meaning}.` : ".", ` True on ${ofN(e.true, e.N)}, named ${e.defined_when} looking`, e.undefined ? `, undefined on ${e.undefined}.` : ".");
  }
  if (id === "dag" && data.graph) return h("p", {}, `${data.variables.length} variables, ${data.graph.edges.length} arrows, ${data.graph.independencies.length} implied independencies.`);
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

function graphSection() {
  const g = data.graph;
  return h("section", { id: "graph" }, h("h2", {}, term("Graph", "dag"), help("dag")),
    h("div", { class: "dag" }, g.edges.length ? dag(g) : h("p", { class: "small" }, "No arrows drawn.")),
    g.notes ? h("p", { class: "small" }, g.notes) : null,
    g.edges.length ? independencies(g) : null);
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

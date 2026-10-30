// Draws the page from the JSON page.py inlined. One function per section; one renderer per figure kind in FIGURES,
// keyed like figures.FIGURES in Python. Anything the reader may not know is a term: click it and the pane on the
// right explains it (concepts.py), with this page's numbers and a drawing where one helps. The reader's guesses and
// lineup picks live in localStorage, per page.

const data = JSON.parse(document.getElementById("data").textContent);
document.title = data.title;
const KEY = `structured-explore:${location.pathname}`;
const CONCEPTS = Object.fromEntries(data.concepts.map((c) => [c.id, c]));

// --- helpers ---------------------------------------------------------------------------------------------------

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : String(c));
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
function share(n, N) {
  return h("span", { class: "share" }, h("i", { style: `--w:${N ? (100 * n) / N : 0}%` }), ofN(n, N));
}
// A word the pane can explain.
function term(text, id, ctx) {
  if (!CONCEPTS[id]) return h("span", {}, text);
  return h("button", { class: "term", type: "button", title: CONCEPTS[id].what, onclick: () => openPane(id, ctx) }, text);
}
function help(id, ctx) {
  return h("button", { class: "help", type: "button", title: `What is this? ${CONCEPTS[id] ? CONCEPTS[id].title : id}`,
    "aria-label": "explain", onclick: (e) => { e.stopPropagation(); openPane(id, ctx); } }, "?");
}
function chip(cls, text, id, ctx) {
  return h("button", { class: `chip ${cls}`, type: "button", title: CONCEPTS[id] ? CONCEPTS[id].what : null, onclick: () => openPane(id, ctx) }, text);
}
const store = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(`${KEY}:${k}`)); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(`${KEY}:${k}`, JSON.stringify(v)); } catch {} },
  clear: () => { try { Object.keys(localStorage).filter((k) => k.startsWith(KEY)).forEach((k) => localStorage.removeItem(k)); } catch {} },
};

// --- figures -----------------------------------------------------------------------------------------------------

const FIGURES = {
  bar(fig, a) {
    const W = 420, H = 70, L = 10, R = 10, y = 28, bh = 18;
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
    const W = small ? 120 : 420, H = small ? 90 : 300;
    const L = small ? 0 : 38, R = small ? 0 : 10, T = small ? 0 : 10, B = small ? 0 : 44;
    const pw = W - L - R, ph = H - T - B, gap = small ? 1 : 3;
    const N = fig.nB + fig.nNotB;
    const cols = [
      { label: a.given, n: fig.nB, nA: fig.nAB },
      { label: `not ${a.given}`, n: fig.nNotB, nA: fig.nAnotB },
    ];
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img" });
    let x = L;
    for (const c of cols) {
      const w = N ? (c.n / N) * pw : pw / 2, p = c.n ? c.nA / c.n : 0;
      const hA = p * ph;
      const top = s("rect", { class: "cell", x, y: T, width: Math.max(w - gap, 0), height: ph - hA, fill: "var(--grey-mark)" });
      const bot = s("rect", { class: "cell", x, y: T + ph - hA, width: Math.max(w - gap, 0), height: hA, fill: "var(--blue)" });
      if (!small) {
        top.append(s("title", {}, `not ${a.event} and ${c.label}: ${ofN(c.n - c.nA, c.n)} (${f2(1 - p)})`));
        bot.append(s("title", {}, `${a.event} and ${c.label}: ${ofN(c.nA, c.n)} (${f2(p)})`));
        svg.append(s("text", { x: x + w / 2, y: T + ph + 16, "text-anchor": "middle" }, c.label));
        svg.append(s("text", { x: x + w / 2, y: T + ph + 30, "text-anchor": "middle", fill: "var(--ink-3)" }, c.n));
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
      svg.append(s("text", { x: L - 30, y: T + ph / 2, transform: `rotate(-90 ${L - 30} ${T + ph / 2})`, "text-anchor": "middle" }, `share in ${a.event}`));
    }
    return svg;
  },
};
FIGURES.conditional = FIGURES.spine;

function legend(a) {
  if (a.figure.kind === "bar") return `Share of outcomes in ${a.event}; the whisker is the interval. Click the figure for how to read it.`;
  return `Columns ${a.given} and not ${a.given}, as wide as their share; blue is ${a.event}. Dashed: P(${a.event}) over all outcomes. Band: the null. Click the figure for how to read it.`;
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
    ["The sample space", ["sample-space", "outcome", "variable", "observed", "entry", "join", "undefined", "days"]],
    ["Events and questions", ["event", "named", "marginal", "joint", "conditional", "graph"]],
    ["Reading an answer", ["count", "interval", "shuffle", "split_half", "guess", "record"]],
    ["The figures", ["bar", "spine", "lineup"]],
  ];
  const listed = new Set(groups.flatMap((g) => g[1]));
  const rest = data.concepts.map((c) => c.id).filter((id) => !listed.has(id));
  if (rest.length) groups.push(["More", rest]);
  const content = [paneBar("Explained", null), h("h2", {}, "Every concept on this page"),
    h("p", { class: "small" }, "Anything with a dotted underline, a chip, a figure or a ? can be clicked for its explanation.")];
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

// This page's numbers for a concept, from what was clicked.
function here(id, ctx) {
  if (!ctx) return null;
  const a = ctx.answer, v = ctx.variable, e = ctx.event;
  if (a) {
    const denom = a.kind === "conditional" ? `the ${a.N} outcomes in ${a.given}` : `all ${a.N} outcomes where it is defined`;
    switch (id) {
      case "count": return h("p", {}, `P(${a.name}) = ${f2(a.p)}: `, code(ofN(a.n, a.N)), `, counted over ${denom}.`);
      case "interval": return h("p", {}, `[${f2(a.lo)}, ${f2(a.hi)}] around ${f2(a.p)}, from N = ${a.N}. The interval is ${f2(a.hi - a.lo)} wide.`);
      case "marginal": return h("p", {}, `Of all ${a.N} outcomes, ${a.n} are in `, code(a.event), `: ${f2(a.p)}.`);
      case "joint": return h("p", {}, `Of all ${a.N} outcomes, ${a.n} are in both `, code(a.event), " and ", code(a.given), `: ${f2(a.p)}.`);
      case "conditional": return h("p", {}, `Of the ${a.N} outcomes in `, code(a.given), `, ${a.n} are in `, code(a.event), `: ${f2(a.p)}.`,
        a.figure && a.figure.kind === "spine" ? ` Among the ${a.figure.nNotB} not in ${a.given}: ${a.figure.nAnotB}, ${f2(a.figure.nAnotB / a.figure.nNotB)}. Over everything: ${f2(a.figure.pA)}.` : "");
      case "shuffle": if (!a.null) return null; {
        const outside = a.p < a.null.lo || a.p > a.null.hi;
        return h("p", {}, `200 shuffles gave ${f2(a.null.lo)}–${f2(a.null.hi)}. The answer, ${f2(a.p)}, is ${outside ? "outside" : "inside"}: `,
          outside ? `${a.given} tells you something about ${a.event}.` : "this much could be chance.");
      }
      case "split_half": { const c = a.checks.find((x) => x.name === "split_half"); return c ? h("p", {}, c.text) : null; }
      case "guess": { const g = ctx.guess; if (!g || g.lo == null) return h("p", {}, "No guess was made for this answer.");
        const hit = g.lo <= a.p && a.p <= g.hi; return h("p", {}, `You guessed ${f2(g.lo)}–${f2(g.hi)}; the share is ${f2(a.p)}: ${hit ? "a hit" : "a miss"}.`); }
      case "spine": if (!a.figure || a.figure.kind !== "spine") return null; { const f = a.figure;
        return h("p", {}, `Left column ${a.given}: ${f.nB} outcomes, blue ${f2(f.nAB / f.nB)}. Right column not ${a.given}: ${f.nNotB} outcomes, blue ${f2(f.nAnotB / f.nNotB)}. Dashed line at ${f2(f.pA)}.`,
          f.band ? ` Band ${f2(f.band[0])}–${f2(f.band[1])}.` : ""); }
      case "bar": return h("p", {}, `${ofN(a.n, a.N)} = ${f2(a.p)}, whisker ${f2(a.lo)} to ${f2(a.hi)}.`);
      case "lineup": return a.lineup ? h("p", {}, "The real plot is one of the 20 under this answer. The 19 others are shuffles of ", code(a.event), ".") : null;
      case "record": return h("p", { class: "look" }, a.caption);
    }
  }
  if (v) {
    const N = data.sample_space.N;
    if (id === "variable" || id === "observed" || id === "undefined") return h("p", {}, code(v.column), `: ${v.meaning}. ${v.observed}; defined on ${ofN(v.defined, N)}`, v.defined < N ? `, ${N - v.defined} missing.` : ".");
  }
  if (e) {
    if (id === "event" || id === "named" || id === "undefined" || id === "count") return h("p", {}, code(e.name), `: ${e.meaning}. True on ${ofN(e.true, e.N)}, named ${e.defined_when} looking`, e.undefined ? `, undefined on ${e.undefined}.` : ".");
  }
  if (id === "sample-space" || id === "outcome" || id === "entry") { const sp = data.sample_space;
    return h("p", {}, `One outcome is ${sp.outcome}. ${sp.N} outcomes`, sp.time ? ` over ${sp.days} days, ${sp.per_day_min} to ${sp.per_day_max} a day.` : "."); }
  if (id === "days") { const sp = data.sample_space; return sp.time ? h("p", {}, `${sp.days} days in ${sp.timezone}, ${sp.first} to ${sp.last}.`) : null; }
  return null;
}

// Drawings that teach the hard ones.
function draw(id) {
  const W = 360;
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
    const svg = s("svg", { viewBox: `0 0 ${W} 60`, width: W, height: 60 });
    svg.append(s("rect", { x: 10, y: 14, width: 240, height: 16, fill: "var(--grey-mark)", rx: 2 }), s("rect", { x: 10, y: 14, width: 96, height: 16, fill: "var(--blue)", rx: 2 }));
    svg.append(s("line", { x1: 86, x2: 106, y1: 22, y2: 22, stroke: "var(--ink)", "stroke-width": 2 }), s("line", { x1: 86, x2: 86, y1: 17, y2: 27, stroke: "var(--ink)", "stroke-width": 2 }), s("line", { x1: 106, x2: 106, y1: 17, y2: 27, stroke: "var(--ink)", "stroke-width": 2 }));
    svg.append(s("text", { x: 10, y: 48 }, "0"), s("text", { x: 250, y: 48, "text-anchor": "end" }, "1"), s("text", { x: 58, y: 48, "text-anchor": "middle" }, "share"), s("text", { x: 262, y: 26 }, "whisker: interval"));
    return svg;
  }
  if (id === "shuffle") {
    const svg = s("svg", { viewBox: `0 0 ${W} 120`, width: W, height: 120 });
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
    const svg = s("svg", { viewBox: `0 0 ${W} 90`, width: W, height: 90 });
    const half = [0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0];
    svg.append(s("text", { x: 10, y: 14 }, "the days, each dealt to one half"));
    half.forEach((hh, i) => svg.append(s("rect", { x: 10 + i * 26, y: 24, width: 22, height: 22, rx: 3, fill: hh ? "var(--blue)" : "var(--blue-soft)" })));
    svg.append(s("text", { x: 10, y: 70 }, "half 1: P = 0.19 [0.17, 0.21]"), s("text", { x: 190, y: 70 }, "half 2: P = 0.22 [0.20, 0.24]"));
    svg.append(s("text", { x: 10, y: 84, fill: "var(--ink-3)" }, "intervals overlap: these two halves agree. Repeated 20 times."));
    return svg;
  }
  if (id === "marginal" || id === "joint" || id === "conditional") {
    const svg = s("svg", { viewBox: `0 0 ${W} 150`, width: W, height: 150 });
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
  return null;
}

// --- sections ----------------------------------------------------------------------------------------------------

function toc() {
  const items = [["sample-space", "Sample space"], ["observed", "What is observed"]];
  if (data.graph) items.push(["graph", "Graph"]);
  if (data.events.length) items.push(["events", "Events"]);
  if (data.answers.length) items.push(["questions", "Questions"]);
  items.push(["concepts", "Concepts"]);
  const ol = h("ol", {});
  for (const [id, label] of items) {
    ol.append(h("li", {}, h("a", { href: `#${id}` }, label)));
    if (id === "questions") {
      const sub = h("ol", { class: "sub" });
      data.answers.forEach((a, i) => sub.append(h("li", {}, h("a", { href: `#q${i + 1}` }, `P(${a.name})`))));
      ol.append(h("li", {}, sub));
    }
  }
  return h("nav", { class: "toc", "aria-label": "Contents" }, h("a", { class: "home", href: data.home }, "← Home"), ol,
    h("p", { class: "small", style: "margin-top:1rem" }, h("button", { type: "button", class: "quiet", onclick: () => openIndex() }, "? Explain anything")));
}

function header() {
  const sp = data.sample_space;
  const meta = [h("b", {}, sp.N), " ", term("outcomes", "outcome")];
  if (sp.time) meta.push(" · ", h("b", {}, sp.days), " ", term("days", "days"), " · ", `${sp.first} → ${sp.last}`);
  return h("header", {}, h("p", { class: "kicker" }, "Structured explore"), h("h1", {}, data.title),
    h("p", { class: "lede" }, data.phenomenon), h("p", { class: "meta" }, ...meta));
}

function sampleSpace() {
  const sp = data.sample_space;
  const dl = h("dl", { class: "facts" },
    h("dt", {}, term("One outcome is", "outcome")), h("dd", {}, sp.outcome),
    h("dt", {}, term("Rows", "sample-space")), h("dd", {}, code(sp.source), " where ", code(sp.where)));
  if (sp.time) dl.append(h("dt", {}, term("Time", "days")), h("dd", {}, code(sp.time), `, days in ${sp.timezone}: ${sp.per_day_min} to ${sp.per_day_max} outcomes a day`));
  if (sp.entry) dl.append(h("dt", {}, term("How a row gets in", "entry")), h("dd", {}, sp.entry));
  for (const j of data.joins) {
    dl.append(h("dt", {}, term(`Joined as ${j.name}`, "join")), h("dd", {}, code(j.source), " where ", code(j.where), " on ", code(j.key),
      j.closes ? h("div", { class: "small" }, `Closes: ${j.closes}`) : null));
  }
  return h("section", { id: "sample-space" }, h("h2", {}, term("Sample space", "sample-space"), help("sample-space")), dl);
}

function observed() {
  const N = data.sample_space.N;
  const rows = data.variables.map((v) => h("tr", { class: v.defined < N ? "gap" : null },
    h("td", {}, code(v.column)), h("td", {}, v.meaning), h("td", {}, chip("", v.observed, "observed", { variable: v })),
    h("td", {}, share(v.defined, N), v.defined < N ? [" ", chip("warn", `${N - v.defined} missing`, "undefined", { variable: v })] : null),
    h("td", { class: "num" }, v.distinct), h("td", { class: "num" }, v.low), h("td", { class: "num" }, v.high)));
  const heads = [["variable", "variable"], ["meaning", null], ["observed", "observed"], ["defined", "undefined"], ["distinct", null], ["low", null], ["high", null]];
  const table = h("table", {}, h("thead", {}, h("tr", {}, ...heads.map(([t, id], i) => h("th", { class: i >= 4 ? "num" : null }, id ? term(t, id) : t)))),
    h("tbody", {}, ...rows));
  const raw = h("details", {}, h("summary", {}, `Show ${data.raw.rows.length} raw outcomes, spread over time`),
    h("div", { class: "raw-wrap" }, h("table", {}, h("thead", {}, h("tr", {}, ...data.raw.columns.map((c) => h("th", {}, c)))),
      h("tbody", {}, ...data.raw.rows.map((r) => h("tr", {}, ...r.map((c) => h("td", {}, c))))))));
  return h("section", { id: "observed" }, h("h2", {}, term("What is observed", "variable"), help("variable")),
    h("p", { class: "small" }, "On how many outcomes each variable is defined. A variable defined on fewer than all is a gap: the join missed, or the source lacks it."),
    table, raw);
}

function graph() {
  return h("section", { id: "graph" }, h("h2", {}, term("Graph", "graph"), help("graph")), h("p", {}, data.graph));
}

function events() {
  const rows = data.events.map((e) => h("tr", {},
    h("td", {}, code(e.name)), h("td", {}, e.meaning), h("td", {}, code(e.where)),
    h("td", {}, chip(e.defined_when === "after" ? "warn" : "", e.defined_when, "named", { event: e })),
    h("td", {}, share(e.true, e.N)), h("td", { class: "num" }, e.undefined)));
  const heads = [["event", "event"], ["meaning", null], ["where", "event"], ["named", "named"], ["true", "count"], ["undefined", "undefined"]];
  return h("section", { id: "events" }, h("h2", {}, term("Events", "event"), help("event")),
    h("p", { class: "small" }, "Subsets of the sample space, as boolean expressions over its columns. Named after looking means a hypothesis found in the data."),
    h("table", {}, h("thead", {}, h("tr", {}, ...heads.map(([t, id], i) => h("th", { class: i === 5 ? "num" : null }, id ? term(t, id) : t)))),
      h("tbody", {}, ...rows)));
}

// --- questions ---------------------------------------------------------------------------------------------------

function headingOf(a) {
  const ctx = { answer: a };
  if (a.kind === "marginal") return [term("How often", "marginal", ctx), " ", code(a.event), "?"];
  if (a.kind === "joint") return [term("How often", "joint", ctx), " ", code(a.event), " and ", code(a.given), " ", term("together", "joint", ctx), "?"];
  return [term("Given", "conditional", ctx), " ", code(a.given), ", ", term("how often", "conditional", ctx), " ", code(a.event), "?"];
}

function chipsOf(a, guess) {
  const ctx = { answer: a, guess };
  const chips = [];
  if (a.null) {
    const outside = a.p < a.null.lo || a.p > a.null.hi;
    chips.push(chip(outside ? "signal" : "", `${outside ? "● outside" : "○ inside"} null ${f2(a.null.lo)}–${f2(a.null.hi)}`, a.null.name, ctx));
  }
  for (const c of a.checks) {
    const m = c.text.match(/\((\d+) of (\d+)/);
    const short = m ? `${m[1]}/${m[2]} splits` : "";
    if (c.ok === true) chips.push(chip("good", `✓ stable ${short}`, c.name, ctx));
    else if (c.ok === false) chips.push(chip("warn", `△ unstable ${short}`, c.name, ctx));
    else chips.push(chip("", `? ${c.name}`, c.name, ctx));
  }
  if (guess && guess.lo != null) {
    const hit = guess.lo <= a.p && a.p <= guess.hi;
    chips.push(chip(hit ? "good" : "bad", `${hit ? "✓ guess hit" : "✗ guess missed"} ${f2(guess.lo)}–${f2(guess.hi)}`, "guess", ctx));
  } else chips.push(chip("", "no guess", "guess", ctx));
  return h("ul", { class: "chips" }, ...chips.map((c) => h("li", {}, c)));
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
    h("summary", {}, "Try the ", term("lineup", "lineup", { answer: a }), ": the real plot among 19 shuffled ones"), verdict, grid);
  if (saved != null) pick(saved, true);
  return det;
}

function question(a, i) {
  const id = `q${i + 1}`, key = `guess:${i}`;
  const card = h("article", { class: "q", id });
  card.append(h("h3", {}, ...headingOf(a), help(a.kind, { answer: a })));
  const body = h("div", {});
  card.append(body);

  function reveal(guess) {
    const ctx = { answer: a, guess };
    const fig = h("figure", { title: "Click for how to read this figure", onclick: () => openPane(a.figure.kind, ctx) },
      FIGURES[a.figure.kind](a.figure, a), h("figcaption", {}, legend(a)));
    body.replaceChildren(
      h("p", { class: "statement" }, term(`P(${a.name}) =`, a.kind, ctx), term(f2(a.p), "count", ctx),
        term(`[${f2(a.lo)}, ${f2(a.hi)}]`, "interval", ctx), term(ofN(a.n, a.N), "count", ctx)),
      chipsOf(a, guess), fig,
      a.lineup ? lineupOf(a, i) : null,
      h("details", {}, h("summary", {}, "The ", term("line", "record", ctx), " as the record has it"), h("pre", { class: "record" }, a.caption)));
    body.querySelector(".statement .term:nth-child(2)").classList.add("p");
    body.querySelector(".statement .term:nth-child(1)").classList.add("lhs");
    body.querySelector(".statement .term:nth-child(3)").classList.add("ci");
    body.querySelector(".statement .term:nth-child(4)").classList.add("nn");
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
    body.replaceChildren(h("div", { class: "guess" },
      h("span", {}, "Before you look: ", term("the share", "guess", { answer: a }), " is between"), h("label", {}, lo), h("span", {}, "and"), h("label", {}, hi), go,
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
  return h("section", { id: "questions" }, h("h2", {}, "Questions", help("conditional")),
    h("div", { class: "toolbar" }, revealAll, clear,
      h("span", { class: "small" }, "Each answer is hidden until you have written your ", term("guess", "guess"), ". Guesses stay in this browser.")),
    ...cards);
}

function conceptsSection() {
  const ul = h("ul", { class: "index" });
  for (const c of data.concepts) ul.append(h("li", {}, h("button", { type: "button", onclick: () => openPane(c.id) }, c.title, h("span", { class: "small" }, c.what))));
  return h("section", { id: "concepts" }, h("h2", {}, "Concepts"),
    h("p", { class: "small" }, "Everything this page uses, in the pane on the right when clicked. The same on every structured explore."), ul);
}

function foot() {
  return h("p", { class: "foot small" }, "A structured explore: built by ", code("structured-explore"), " from this folder's ",
    code("explore.yaml"), "; the numbers are in ", code("explore.json"), " beside this page.");
}

// --- page --------------------------------------------------------------------------------------------------------

const main = h("main", {}, header(), sampleSpace(), observed(), data.graph ? graph() : null,
  data.events.length ? events() : null, data.answers.length ? questions() : null, conceptsSection(), foot());
document.getElementById("app").append(h("div", { class: "layout" }, toc(), main));

// The table of contents follows the reader.
const links = [...document.querySelectorAll(".toc a[href^='#']")];
const observer = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    links.forEach((l) => l.classList.toggle("current", l.getAttribute("href") === `#${e.target.id}`));
  }
}, { rootMargin: "-10% 0px -70% 0px" });
document.querySelectorAll("main section, main article").forEach((el) => observer.observe(el));

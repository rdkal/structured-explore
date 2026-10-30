// Draws the page from the JSON page.py inlined. One function per section; one renderer per figure kind in FIGURES,
// keyed like figures.FIGURES in Python. The reader's guesses and lineup picks live in localStorage, per page.

const data = JSON.parse(document.getElementById("data").textContent);
document.title = data.title;
const KEY = `structured-explore:${location.pathname}`;
const READ = Object.fromEntries(data.how_to_read.map((r) => [r.id, r]));

// --- helpers ---------------------------------------------------------------------------------------------------

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "html") el.innerHTML = v;
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
function chip(cls, text, readId) {
  const r = READ[readId];
  return h("a", { class: `chip ${cls}`, href: `#read-${readId}`, title: r ? r.means : null }, text);
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
      { label: a.given, n: fig.nB, nA: fig.nAB, not: false },
      { label: `not ${a.given}`, n: fig.nNotB, nA: fig.nAnotB, not: true },
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
  if (a.figure.kind === "bar") return `Share of outcomes in ${a.event}; the whisker is the interval.`;
  return `Columns ${a.given} and not ${a.given}, as wide as their share; blue is ${a.event}. Dashed: P(${a.event}) over all outcomes. Band: the null.`;
}

// --- sections ----------------------------------------------------------------------------------------------------

function toc() {
  const items = [["sample-space", "Sample space"], ["observed", "What is observed"]];
  if (data.graph) items.push(["graph", "Graph"]);
  if (data.events.length) items.push(["events", "Events"]);
  if (data.answers.length) items.push(["questions", "Questions"]);
  items.push(["how-to-read", "How to read"]);
  const ol = h("ol", {});
  for (const [id, label] of items) {
    ol.append(h("li", {}, h("a", { href: `#${id}` }, label)));
    if (id === "questions") {
      const sub = h("ol", { class: "sub" });
      data.answers.forEach((a, i) => sub.append(h("li", {}, h("a", { href: `#q${i + 1}` }, `P(${a.name})`))));
      ol.append(h("li", {}, sub));
    }
  }
  return h("nav", { class: "toc", "aria-label": "Contents" }, h("a", { class: "home", href: data.home }, "← Home"), ol);
}

function header() {
  const sp = data.sample_space;
  const meta = [h("b", {}, sp.N), " outcomes"];
  if (sp.time) meta.push(" · ", h("b", {}, sp.days), " days · ", `${sp.first} → ${sp.last}`);
  return h("header", {}, h("p", { class: "kicker" }, "Structured explore"), h("h1", {}, data.title),
    h("p", { class: "lede" }, data.phenomenon), h("p", { class: "meta" }, ...meta));
}

function sampleSpace() {
  const sp = data.sample_space;
  const dl = h("dl", { class: "facts" },
    h("dt", {}, "One outcome is"), h("dd", {}, sp.outcome),
    h("dt", {}, "Rows"), h("dd", {}, code(sp.source), " where ", code(sp.where)));
  if (sp.time) dl.append(h("dt", {}, "Time"), h("dd", {}, code(sp.time), `, days in ${sp.timezone}: ${sp.per_day_min} to ${sp.per_day_max} outcomes a day`));
  if (sp.entry) dl.append(h("dt", {}, "How a row gets in"), h("dd", {}, sp.entry));
  for (const j of data.joins) {
    dl.append(h("dt", {}, `Joined as ${j.name}`), h("dd", {}, code(j.source), " where ", code(j.where), " on ", code(j.key),
      j.closes ? h("div", { class: "small" }, `Closes: ${j.closes}`) : null));
  }
  return h("section", { id: "sample-space" }, h("h2", {}, "Sample space"), dl);
}

function observed() {
  const N = data.sample_space.N;
  const rows = data.variables.map((v) => h("tr", { class: v.defined < N ? "gap" : null },
    h("td", {}, code(v.column)), h("td", {}, v.meaning), h("td", {}, h("span", { class: "chip" }, v.observed)),
    h("td", {}, share(v.defined, N), v.defined < N ? [" ", h("span", { class: "chip warn" }, `${N - v.defined} missing`)] : null),
    h("td", { class: "num" }, v.distinct), h("td", { class: "num" }, v.low), h("td", { class: "num" }, v.high)));
  const table = h("table", {}, h("thead", {}, h("tr", {}, ...["variable", "meaning", "observed", "defined", "distinct", "low", "high"]
    .map((t, i) => h("th", { class: i >= 4 ? "num" : null }, t)))), h("tbody", {}, ...rows));
  const raw = h("details", {}, h("summary", {}, `Show ${data.raw.rows.length} raw outcomes, spread over time`),
    h("div", { class: "raw-wrap" }, h("table", {}, h("thead", {}, h("tr", {}, ...data.raw.columns.map((c) => h("th", {}, c)))),
      h("tbody", {}, ...data.raw.rows.map((r) => h("tr", {}, ...r.map((c) => h("td", {}, c))))))));
  return h("section", { id: "observed" }, h("h2", {}, "What is observed"),
    h("p", { class: "small" }, "On how many outcomes each variable is defined. A variable defined on fewer than all is a gap: the join missed, or the source lacks it."),
    table, raw);
}

function graph() {
  return h("section", { id: "graph" }, h("h2", {}, "Graph"), h("p", {}, data.graph));
}

function events() {
  const rows = data.events.map((e) => h("tr", {},
    h("td", {}, code(e.name)), h("td", {}, e.meaning), h("td", {}, code(e.where)),
    h("td", {}, h("span", { class: `chip ${e.defined_when === "after" ? "warn" : ""}` }, e.defined_when)),
    h("td", {}, share(e.true, e.N)), h("td", { class: "num" }, e.undefined)));
  return h("section", { id: "events" }, h("h2", {}, "Events"),
    h("p", { class: "small" }, "Subsets of the sample space, as boolean expressions over its columns. Named after looking means a hypothesis found in the data."),
    h("table", {}, h("thead", {}, h("tr", {}, ...["event", "meaning", "where", "named", "true", "undefined"].map((t, i) => h("th", { class: i === 5 ? "num" : null }, t)))),
      h("tbody", {}, ...rows)));
}

// --- questions ---------------------------------------------------------------------------------------------------

function headingOf(a) {
  if (a.kind === "marginal") return ["How often ", code(a.event), "?"];
  if (a.kind === "joint") return ["How often ", code(a.event), " and ", code(a.given), " together?"];
  return ["Given ", code(a.given), ", how often ", code(a.event), "?"];
}

function chipsOf(a, guess) {
  const chips = [];
  if (a.null) {
    const outside = a.p < a.null.lo || a.p > a.null.hi;
    chips.push(chip(outside ? "signal" : "", `${outside ? "● outside" : "○ inside"} null ${f2(a.null.lo)}–${f2(a.null.hi)}`, "null"));
  }
  for (const c of a.checks) {
    const m = c.text.match(/\((\d+) of (\d+)/);
    const short = m ? `${m[1]}/${m[2]} splits` : "";
    if (c.ok === true) chips.push(chip("good", `✓ stable ${short}`, "stable"));
    else if (c.ok === false) chips.push(chip("warn", `△ unstable ${short}`, "stable"));
    else chips.push(chip("", `? ${c.name}`, "stable"));
  }
  if (guess && guess.lo != null) {
    const hit = guess.lo <= a.p && a.p <= guess.hi;
    chips.push(chip(hit ? "good" : "bad", `${hit ? "✓ guess hit" : "✗ guess missed"} ${f2(guess.lo)}–${f2(guess.hi)}`, "guess"));
  } else chips.push(chip("", "no guess", "guess"));
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
  const det = h("details", { class: "lineup", open: saved != null }, h("summary", {}, "Try the lineup: the real plot among 19 shuffled ones"), verdict, grid);
  if (saved != null) pick(saved, true);
  return det;
}

function question(a, i) {
  const id = `q${i + 1}`, key = `guess:${i}`;
  const card = h("article", { class: "q", id });
  card.append(h("h3", {}, ...headingOf(a)));
  const body = h("div", {});
  card.append(body);

  function reveal(guess) {
    body.replaceChildren(
      h("p", { class: "statement" }, h("span", { class: "lhs" }, `P(${a.name}) =`), h("span", { class: "p" }, f2(a.p)),
        h("span", { class: "ci" }, `[${f2(a.lo)}, ${f2(a.hi)}]`), h("span", { class: "nn" }, ofN(a.n, a.N))),
      chipsOf(a, guess),
      h("figure", {}, FIGURES[a.figure.kind](a.figure, a), h("figcaption", {}, legend(a))),
      a.lineup ? lineupOf(a, i) : null,
      h("details", {}, h("summary", {}, "The line as the record has it"), h("pre", { class: "record" }, a.caption)));
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
      h("span", {}, "Before you look: the share is between"), h("label", {}, lo), h("span", {}, "and"), h("label", {}, hi), go,
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
  return h("section", { id: "questions" }, h("h2", {}, "Questions"),
    h("div", { class: "toolbar" }, revealAll, clear,
      h("span", { class: "small" }, "Each answer is hidden until you have written your guess. Guesses stay in this browser.")),
    ...cards);
}

function howToRead() {
  const dl = h("dl", { class: "card" });
  for (const r of data.how_to_read) dl.append(h("dt", { id: `read-${r.id}` }, r.look), h("dd", {}, r.means));
  return h("section", { id: "how-to-read" }, h("h2", {}, "How to read"),
    h("p", { class: "small" }, "The same pieces on every page. A chip above links to its line here."), dl);
}

function foot() {
  return h("p", { class: "foot small" }, "A structured explore: built by ", code("structured-explore"), " from this folder's ",
    code("explore.yaml"), "; the numbers are in ", code("explore.json"), " beside this page.");
}

// --- page --------------------------------------------------------------------------------------------------------

const main = h("main", {}, header(), sampleSpace(), observed(), data.graph ? graph() : null,
  data.events.length ? events() : null, data.answers.length ? questions() : null, howToRead(), foot());
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

"""What the page can explain, one Concept per thing a reader may click: the general ideas here, and each registered
kind's own EXPLAIN next to its code (questions, nulls, checks, figures, graph), gathered by all(). The page shows a
concept in its side pane; every one has the same four parts, so the reader learns where to look."""

from structured_explore import figures, graph, nulls, questions
from structured_explore.checks import EXPLAIN as CHECKS_EXPLAIN
from structured_explore.concepts_base import Concept

GENERAL = [
    Concept("sample-space", "Sample space Ω",
            "The set of every outcome the explore is about: every row of the table that the sample space's where picks.",
            "The spec says what one outcome is in words, which table holds them and which rows count. The tool builds a "
            "view with one row per outcome and the variables as columns. Joins add columns, never rows.",
            "Every count on the page is over this set or a subset of it. The header says how many outcomes there are "
            "and over which days; if that is not the set you meant, nothing below it means what you think.",
            "It says nothing about how the rows got there. That is the entry.",
            see=["outcome", "entry", "variable"]),
    Concept("outcome", "Outcome ω",
            "One element of the sample space: one row, one thing in the world, such as one order or one hour.",
            "The spec names it in words, and the where clause must make one row of the source be exactly one such thing.",
            "The raw rows under Data are outcomes. Read twenty by eye: if a row is not one thing of the kind named, "
            "the sample space is wrong.",
            "An outcome is not the thing you measure on it; those are variables.",
            see=["sample-space", "variable"]),
    Concept("variable", "Variable",
            "A column of the sample space: a value measured on every outcome, such as a price or a time.",
            "Named in the spec with its meaning and unit, and with how it is observed: measured, a proxy for the thing "
            "meant, or derived from other columns by SQL. Every variable is a node of the graph.",
            "The Data table shows on how many outcomes each is defined, how many distinct values it has and its "
            "lowest and highest. Check the unit against low and high.",
            "A proxy is not the thing itself. An event built on a proxy inherits the gap.",
            see=["observed", "undefined", "dag"]),
    Concept("observed", "Measured, proxy, derived",
            "How a variable stands to the thing it is meant to be.",
            "The spec says it; the tool only shows it. Measured: the thing itself was recorded. Proxy: something else "
            "that stands for it, like a time stamp for when an event happened. Derived: computed from other columns.",
            "A chip beside each variable. Weigh every answer built on a proxy by how good the proxy is.",
            "The tool cannot check it. It is the author's claim.",
            see=["variable"]),
    Concept("entry", "How a row gets in",
            "The selection: what makes an outcome appear in the table, and what never appears.",
            "Written by the author in the spec. Compare it with the header's counts: the right number of outcomes a day "
            "says no rows are missing.",
            "If outcomes enter because of something related to the question, every answer carries that. Orders that "
            "were cancelled are not in an orders table; a return rate over the orders that remain is not the return "
            "rate of orders placed.",
            "A clean count of rows does not mean a clean selection; it means no rows were lost after selection.",
            see=["sample-space"]),
    Concept("join", "Join",
            "A second table whose columns are added to each outcome, matched on a key.",
            "A left join: an outcome with no match keeps its row and gets null in the joined columns. The spec says which "
            "gap in observation the join closes.",
            "Under Data. A joined variable defined on fewer outcomes than there are means the join missed some; the "
            "table marks it.",
            "A join can carry a selection of its own: the rows the second table lacks are not random.",
            see=["undefined", "entry"]),
    Concept("graph", "Graph notes",
            "The author's words on what the arrows rest on and what the graph leaves out.",
            "Written in the spec beside the edges, from the project's causal model when it has one.",
            "Read it with the drawing. It names what is a root, nothing in the data causes it, and what is missing: a "
            "cause of two variables that the data does not hold is the usual gap.",
            "Nothing on this page shows a cause. The graph is an assumption, not a result.",
            see=["dag", "independence"]),
    Concept("event", "Event",
            "A subset of the sample space: the outcomes for which a boolean expression over the columns is true.",
            "Written in SQL in the spec, with its meaning in words. The expression is the event's name. The tool "
            "evaluates it on every outcome as true, false or undefined.",
            "The Events list gives each one's share, true of defined. Every question is about events, so an event's "
            "expression is where an answer's meaning comes from.",
            "A threshold inside an event is a choice. Tuned by looking, it is already a result.",
            see=["named", "undefined", "marginal"]),
    Concept("named", "Named before or after",
            "Whether the event was written down before or after looking at the data.",
            "The author says so in the spec.",
            "A mark in the Events list. An event named after looking is a hypothesis found in this data, and its "
            "answers need data not yet looked at before they are believed.",
            "The tool cannot tell. It trusts the author.",
            see=["event", "guess"]),
    Concept("undefined", "Undefined",
            "An event that is neither true nor false on an outcome, because a variable in it is null there.",
            "SQL's three-valued logic: a comparison with null is null. The tool leaves such outcomes out of every "
            "count the event is in, and reports how many.",
            "The undefined count in the Events list. Many undefined means the question is asked of fewer outcomes "
            "than the sample space has, and those left out may differ.",
            "Leaving them out is not neutral if nulls have a reason.",
            see=["event", "join"]),
    Concept("count", "n of N",
            "The answer itself: how many outcomes, of how many, are in the event asked about.",
            "A count over the sample space, or over the given event for a conditional question. The share is n divided "
            "by N.",
            "The big number is the share; n of N stands beside it. Read N first: it is the denominator, and it changes "
            "with the kind of question.",
            "A share hides N. Twenty-nine of fifty-four and 2900 of 5400 are both 0.54.",
            look="420 of 2256", see=["interval", "marginal", "conditional"]),
    Concept("interval", "Interval [lo, hi]",
            "Where the share would land if the outcomes were drawn again the same way, nineteen times in twenty.",
            "The 95 % Wilson score interval of n of N. It treats every outcome as an independent draw.",
            "A wide interval means few outcomes, not a weak relation. Two intervals that do not overlap are a difference "
            "the outcomes alone did not make.",
            "Outcomes in time are rarely independent: hours of a day move together. Then the interval is too narrow, "
            "and the split-half check will say so.",
            look="[0.17, 0.20]", see=["count", "split_half"]),
    Concept("guess", "Guess",
            "What you believed the share was before you saw it.",
            "Either written in the spec, or typed on the page, which hides each answer until you have guessed. The "
            "guess is a range; a hit is a share inside it.",
            "A mark beside each answer. A miss is the finding: write down what you believed and why. Over many "
            "explores, the hit rate says whether these pages are teaching you to read the data.",
            "A guess typed after a glance at the chart is not a guess.",
            look="guess missed 0.40–0.70", see=["lineup"]),
    Concept("record", "The line",
            "The whole answer as one fixed sentence, the same shape every time.",
            "Clauses joined by semicolons: the count and interval, the null, each check, the guess. The tool prints it "
            "when it builds, and stores it in explore.json.",
            "Behind the disclosure under each answer. It is the thing to get fast at scanning: the page's marks are "
            "the same clauses laid out.",
            "", look="P(A | B) = 0.42 [0.39, 0.45], 210 of 500; null (shuffle): ...", see=["count"]),
    Concept("days", "Days",
            "The day each outcome belongs to, in the sample space's time zone.",
            "From the time column. The split-half check deals whole days, never single outcomes, into its halves, "
            "because outcomes within a day move together.",
            "The header says how many days and how many outcomes a day. Too few a day, or too many, is a sample space "
            "with holes or doubles.",
            "", see=["split_half", "interval"]),
]


def all() -> list[Concept]:
    kinds = [*questions.EXPLAIN.values(), *nulls.EXPLAIN.values(), *CHECKS_EXPLAIN.values(),
             *figures.EXPLAIN.values(), *graph.EXPLAIN.values()]
    return GENERAL + kinds


def to_dict(c: Concept) -> dict:
    return {"id": c.id, "title": c.title, "what": c.what, "how": c.how, "read": c.read, "caveat": c.caveat,
            "look": c.look, "see": c.see}

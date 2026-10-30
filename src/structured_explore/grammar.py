"""The output grammar: how every answer is written, the same every time, and the card that says how to read it. The
caption is PARTS joined by "; ", each part a clause or nothing. Change the grammar here and every structured explore
changes when rebuilt; the page lays the same pieces out (web/app.js) and links each to its card entry by id."""

from collections.abc import Callable

from structured_explore.results import Answer
from structured_explore.spec import Question


def fmt(p: float) -> str:
    return f"{p:.2f}"


def name(q: Question) -> str:
    """The event the question is about: A, A and B, or A | B."""
    if q.kind == "marginal":
        return q.event
    if q.kind == "joint":
        return f"{q.event} and {q.given}"
    return f"{q.event} | {q.given}"


def heading(q: Question) -> str:
    if q.kind == "marginal":
        return f"How often {q.event}?"
    if q.kind == "joint":
        return f"How often {q.event} and {q.given} together?"
    return f"Given {q.given}, how often {q.event}?"


def count_part(a: Answer) -> str:
    lo, hi = a.count.interval
    return f"P({name(a.question)}) = {fmt(a.count.p)} [{fmt(lo)}, {fmt(hi)}], {a.count.n} of {a.count.N}"


def null_part(a: Answer) -> str:
    if a.band is None:
        return ""
    where = "inside" if a.band.contains(a.count.p) else "outside"
    return f"null ({a.band.name}): {fmt(a.band.lo)}–{fmt(a.band.hi)}, answer {where}"


def checks_part(a: Answer) -> str:
    return "; ".join(c.text for c in a.checks)


def guess_part(a: Answer) -> str:
    if a.guess_hit is None:
        return "no guess"
    lo, hi = a.question.guess
    return f"guess was {fmt(lo)}–{fmt(hi)}: {'hit' if a.guess_hit else 'miss'}"


PARTS: list[Callable[[Answer], str]] = [count_part, null_part, checks_part, guess_part]


def caption(a: Answer) -> str:
    return "; ".join(part for part in (f(a) for f in PARTS) if part)


# The card: per piece of the grammar its id, which the page's chips link to, what it looks like and what it means.
HOW_TO_READ = [
    ("count", "P(A | B) = 0.42 [0.39, 0.45], 210 of 500",
     "Of the 500 outcomes in B, 210 are in A. The brackets are the 95 % Wilson interval: where the share would land if "
     "Ω were drawn again the same way, outcome by outcome. A marginal P(A) counts over every outcome; a joint P(A and B) "
     "counts the outcomes in both over every outcome."),
    ("null", "null (shuffle): 0.30–0.38, answer outside",
     "What P(A | B) would be if A had nothing to do with B: A's values dealt out over the outcomes again, 200 times, "
     "2.5th to 97.5th percentile. Outside means B tells you something about A; inside means this much could be "
     "chance. Neither is a cause: the graph says what may be conditioned on."),
    ("stable", "stable across halves: yes (19 of 20 splits agree, halves range 0.40–0.45)",
     "The days dealt into two halves, the question asked of each, 20 times; agree means the two intervals overlap. "
     "It detects an answer that moves with the sample, not a wrong answer every half shares. A no with many outcomes "
     "says the outcomes are not independent draws, and the interval is too narrow."),
    ("guess", "guess was 0.30–0.50: hit",
     "The guess written before the answer was shown: in explore.yaml, or on the page before revealing. Hits and misses "
     "over many explores are the measure of whether these pages are teaching you to read them."),
    ("bar", "the bar", "A marginal: the share of outcomes in A, with its interval as the whisker."),
    ("spine", "the spine plot",
     "A joint or conditional: columns B and not B, as wide as their share of Ω; in each, the blue part is A. The "
     "dashed line is P(A) over all of Ω, the shaded band the null. Equal blue heights mean independence; the "
     "bottom-left area is P(A and B)."),
    ("lineup", "the lineup", "The real spine plot hidden among 19 shuffled ones. If you cannot pick it, the eye sees "
     "nothing the null does not."),
]

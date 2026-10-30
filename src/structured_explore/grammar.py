"""The output grammar: how every answer is written, the same every time, and the card that says how to read it. The
caption is PARTS joined by "; ", each part a clause or nothing. Change the grammar here and every structured explore
changes when rebuilt; the page lays the same pieces out (web/app.js), each clickable to its concept (concepts.py)."""

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
    """The question in words, for the terminal and the record; the page shows the statement itself."""
    if q.kind == "marginal":
        return f"How often is {q.event}?"
    if q.kind == "joint":
        return f"How often are {q.event} and {q.given} both?"
    return f"Among {q.given}, how often is {q.event}?"


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

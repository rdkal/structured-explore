"""What a question's answer holds once everything has run: the count, its null band, its checks, its figure's counts and
how the reader's guess fared. The grammar reads this to write the caption, the page to lay it out."""

from dataclasses import dataclass, field

from structured_explore.checks import Result
from structured_explore.nulls import Band
from structured_explore.spec import Question
from structured_explore.stats import Count


@dataclass
class Answer:
    question: Question
    count: Count
    band: Band | None = None
    checks: list[Result] = field(default_factory=list)
    # The figure's counts (figures.FIGURES) and the lineup's panels (figures.lineup).
    figure: dict | None = None
    lineup: dict | None = None

    @property
    def guess_hit(self) -> bool | None:
        g = self.question.guess
        if len(g) != 2:
            return None
        return g[0] <= self.count.p <= g[1]

    def to_dict(self) -> dict:
        q = self.question
        lo, hi = self.count.interval
        return {
            "kind": q.kind, "event": q.event, "given": q.given,
            "n": self.count.n, "N": self.count.N, "p": self.count.p, "lo": lo, "hi": hi,
            "null": {"name": self.band.name, "lo": self.band.lo, "hi": self.band.hi} if self.band else None,
            "checks": [{"name": c.name, "ok": c.ok, "text": c.text} for c in self.checks],
            "guess": q.guess, "guess_hit": self.guess_hit,
            "figure": self.figure, "lineup": self.lineup,
        }

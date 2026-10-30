"""The shape of an explanation, defined apart from concepts.py so every registry can carry its own without a cycle."""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Concept:
    id: str
    title: str
    # One line: what it is.
    what: str
    # How it is worked out.
    how: str
    # How to read it on the page.
    read: str
    # What it does not tell you.
    caveat: str
    # What it looks like on the page, when it has a fixed look.
    look: str = ""
    # Ids of related concepts.
    see: list[str] = field(default_factory=list)

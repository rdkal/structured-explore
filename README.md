# structured-explore

Explore data you cannot yet phrase a question about. An explore is one file, `explore.yaml`: what one outcome is and
where its rows come from, the events on that sample space, and the questions asked of them. The tool builds it into a
page that reads the same every time:

```
P(returned_at is not null | discount_pct > 0) = 0.19 [0.17, 0.20], 420 of 2256; null (shuffle): 0.10–0.12,
answer outside; stable across halves: yes (19 of 20 splits agree, halves range 0.16–0.21); guess was 0.05–0.15: miss
```

Every answer is a count, n of N, with its interval; a joint or conditional answer is held against what it would be if
the events had nothing to do with each other; the days are split in halves to see whether the answer holds; and the
reader guesses before looking, on the page, so that over time the pages show whether they are teaching anything.
The author draws the graph of what causes what among the variables; the page draws it, lists the independencies it
implies, tests each on the data, and marks every conditional with where its given stands to its event in the graph.

## Use

With [uv](https://docs.astral.sh/uv/) installed:

```bash
uvx --from git+https://github.com/rdkal/structured-explore structured-explore init analysis/explore/my-look
# fill analysis/explore/my-look/explore.yaml, then, from the data root the yaml's paths are relative to:
uvx --from git+https://github.com/rdkal/structured-explore structured-explore build analysis/explore/my-look out/my-look
```

`init` writes a template `explore.yaml` and a `Makefile`. `build` writes `index.html`, `explore.json` and the page's
`style.css` and `app.js` into the output folder, and prints each answer's line. The page draws itself from the JSON
inlined in it, so it needs no server.

## The graph

`graph.edges` are the author's arrows, cause -> effect, between the variables. The page draws them, and for every two
variables with no arrow it finds the smallest set that d-separates them, tests that independence on the data by
partial rank correlation, and says holds, fails or unclear. Each conditional answer is marked with where its given
stands to its event in the graph: upstream, downstream, a common cause only, or unconnected. A fail is a missing arrow;
an outside-the-null answer between unconnected variables is a missing path. The graph is tested, never confirmed.

## Learning as you read

Anything on the page a reader may not know can be clicked: a chip, a figure, a column header, a word with a dotted
underline, the `?` beside a heading. A pane opens on the right with the same four parts every time: what it is, how it
is worked out, how to read it, and what it does not tell you, with this page's own numbers filled in and a drawing for
the ones that need it (the spine plot's anatomy, the shuffle, the split by days, which cells a question counts). The
explanations live beside the code they explain: every question kind, null, check and figure carries its own `Concept`,
and a test fails when one is missing. "Explain anything" in the contents opens the index of them all.

## The skill

`skill/` is a [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skill that walks a user through the nine
steps of an explore with the right words. Install it for every project by linking it into your personal skills:

```bash
ln -s "$(pwd)/skill" ~/.claude/skills/structured-explore
```

## The spec

```yaml
title: Returns against discounts
phenomenon: Returns pile up in some weeks and not in others.
home: /                          # the page's Home link
sample_space:
  outcome: one order placed in 2025
  source: validated/shop/orders.parquet
  where: placed_at >= '2025-01-01'
  entry: every order placed has a row; cancelled orders are not in the table
  time: placed_at                # a UTC timestamp
  timezone: Europe/Berlin        # whose days the split-half check deals out
  variables:
    - {name: discount_pct, meaning: the discount on the order, percent of list price}
    - {name: weekday, meaning: day of the week placed, observed: derived, expr: dayofweek(placed_at)}
joins:
  - name: r
    source: validated/shop/returns.parquet
    key: order_id
    closes: whether the order came back is not in the orders table
    variables:
      - {name: returned_at, meaning: when the return was booked, null when it never was}
graph:
  edges: [weekday -> discount_pct, discount_pct -> returned_at]
  notes: the discount is set before the order, a return comes after it; nothing in the data causes the weekday
events:
  - {where: returned_at is not null, meaning: the order came back, defined: before}
  - {where: discount_pct > 0, meaning: sold under list price, defined: before}
  - {where: weekday in (0, 6), meaning: placed on a Saturday or Sunday, defined: before}
questions:
  - {kind: marginal, event: returned_at is not null, guess: [0.05, 0.15]}
  - {kind: conditional, event: returned_at is not null, given: discount_pct > 0, lineup: true}
null: shuffle
checks: [split_half]
```

Events are DuckDB SQL over the columns of Ω, the variables by their names there plus `time` and `day`, and a question names
an event by that SQL. Every variable is a node of the graph; a derived one is computed by its `expr`.
A `source` is a Parquet, CSV or JSON file, or a SQL query that makes one row per outcome when no file has that shape.

## Extend

Every part is a registry keyed by name in `src/structured_explore/`: question kinds in `questions.QUESTIONS`, nulls in
`nulls.NULLS`, stability checks in `checks.CHECKS` (one module each), the graph's reasoning in `graph.py`, figures in
`figures.FIGURES` with their renderers
in `web/app.js`, and the caption's clauses in `grammar.PARTS`. Each registry's `EXPLAIN` holds its kinds' concepts, the
general ones are in `concepts.py`. Add a kind with one function, one entry and one `Concept`; remove it by deleting
them.

The grammar is tested against planted answers: `test_recovery.py` simulates a sample space with an effect, a nothing,
a Simpson reversal and a collider, and the build must say so.

```bash
uv run --with pytest pytest
```

## Words

Probability's: a **sample space** Ω, an **outcome** ω (one row), a **variable** (a column), an **event** (a subset, a
boolean expression), a **question** (marginal, joint, conditional). The **null** is what an answer would be if nothing
were going on. **Stable** means the answer survives a different half of the days, which detects variance, not bias.

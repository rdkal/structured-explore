---
name: structured-explore
description: Make a structured explore, a look at data as a sample space, events on it and questions answered as counts with a null and a guess, in one explore.yaml built into a page by the structured-explore tool. Use when the user wants to explore data they cannot yet phrase a question about, asks what a plot means, or asks for a structured explore.
---

# Structured explore

An explore whose whole content is one file, `explore.yaml`, built into a page by `structured-explore`
(github.com/rdkal/structured-explore). The page says the same things in the same order every time, so the reader
learns to scan it: what one outcome is, what is observed of it, the events, and each question as
`P(A | B) = 0.42 [0.39, 0.45], 210 of 500` with its null, its stability and how the reader's guess fared.

The words are probability's. A **sample space** Ω is the set of outcomes; an **outcome** ω is one element, one row;
a **variable** is a column, a function on Ω; an **event** is a subset of Ω, a boolean expression over the columns; a
**question** is marginal P(A), joint P(A and B) or conditional P(A | B). Not "unit", not "outcome space".

## Fit the project

Read the project's own notes first: where its explores live, how its pages are served and linked, what its data root
is and which time zone its days are in. Those go into the explore's folder, Makefile and `home` and `timezone` in the
yaml. Publishing is the project's business; this skill only builds the page.

## The steps

Each step is a section of explore.yaml and a file in `steps/`. Go through them in order with the user; a step the
explore does not need is left out of the yaml. Remove a step from this skill by deleting its file and its line here.

1. [Phenomenon](steps/1-phenomenon.md): point at the data or the thing seen, in one sentence.
2. [Sample space](steps/2-sample-space.md): what one outcome is, which table's rows under which condition, how a
   row gets in, and the variables.
3. [Observation](steps/3-observation.md): build once, read "What is observed" and the raw rows, and fix the sample
   space until every variable is observed on the outcomes it should be.
4. [Joins](steps/4-joins.md): add a table only to close a gap step 3 named.
5. [Graph](steps/5-graph.md): which conditionings are allowed.
6. [Events](steps/6-events.md): named boolean expressions, each with its meaning and whether it was named before
   or after looking.
7. [Questions](steps/7-questions.md): marginal, joint and conditional, each with the reader's guess written first.
8. [Checks](steps/8-checks.md): the stability checks to run, and the null.
9. [Read](steps/9-read.md): build, read the page with its "How to read" card, and decide what to ask next.

## Make one

1. Start the folder where the project keeps its explores:

```bash
uvx --from git+https://github.com/rdkal/structured-explore structured-explore init <explores>/<name>
```

   It writes `explore.yaml` and a `Makefile` with today's date and the folder's name. Edit the Makefile's `OUT` and
   the yaml's `home` to the project's conventions.
2. Fill the yaml step by step. Build after step 3 and after step 7, from the project's data root:

```bash
make -C <explores>/<name> build DATA=<data root>
```

3. Hook the explore into the project's build the way its other explores are, and look at the page the way the project
   serves pages.

Don't commit until the user says so.

## Where the parts live

The package `structured_explore`, in the tool's repo. Every part is a registry keyed by name, so a kind is added with
one function and one entry, and removed by deleting them:

| Part | File | Registry |
|---|---|---|
| the spec's sections | `spec.py` | the dataclasses |
| Ω and what is observed | `space.py` | |
| the events as arrays | `events.py` | |
| question kinds | `questions.py` | `QUESTIONS` |
| the null | `nulls.py` | `NULLS` |
| stability checks | `checks/<name>.py` | `checks.CHECKS` |
| figures, as counts | `figures.py` | `FIGURES`, and the renderer of the same name in `web/app.js` |
| captions | `grammar.py` | `PARTS` |
| explanations, shown in the page's side pane | `concepts.py`, and `EXPLAIN` beside each registry | |
| the page | `page.py`, `web/` | |
| the command line | `build.py` | |

The grammar is tested against planted answers: `test_recovery.py` simulates a sample space with an effect, a nothing,
a Simpson reversal and a collider, and the build must say so. Run it after any change to the package, in its repo:

```bash
uv run --with pytest pytest
```

To change how every page reads, change `grammar.py` or `web/` and rebuild the explores; to add a check, write
`checks/<name>.py` with a `run` of the shared signature and a `Concept` named `EXPLAIN`, and name both in `checks/`;
to add a question kind, a function in `questions.py` with its `Concept` in `EXPLAIN`, a figure builder in `FIGURES`
and its renderer in `web/app.js`. The test fails when a kind has no explanation.

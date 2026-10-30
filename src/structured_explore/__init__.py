"""A structured explore: a sample space, events on it, and questions answered as counts, on one page that reads the
same every time.

The spec, explore.yaml in the explore's folder, says what one outcome is and where its rows come from (spec.py);
space.py builds the sample space Ω in DuckDB and checks what is observed; events.py evaluates the events as boolean
arrays; questions.py answers marginal, joint and conditional questions as n of N with an interval; nulls.py shuffles
for the reference; checks/ holds one stability check per module; figures.py works out the counts each figure is drawn
from; grammar.py is the one place the captions and the reading card live; page.py writes the data into web/index.html,
which web/app.js draws; build.py is the command line.

Every part is a registry keyed by name (QUESTIONS, NULLS, CHECKS, FIGURES), so a kind is added by one function and one
entry, and removed by deleting them."""

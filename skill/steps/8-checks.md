# 8. Checks

`checks` names the stability checks to run on every question, in `checks/`:

- `split_half`: the days dealt into two halves, the question asked of each, 20 times; passes when the two intervals
  overlap in 18 of 20. It detects variance, an answer that moves with the sample, not bias: a wrong answer every half
  agrees on passes. Whole days, never rows, since hours of a day are not independent.

`null` names the reference for joint and conditional answers, in `nulls.py`: `shuffle` (default), A's
values dealt over the outcomes again 200 times; `""` for none.

A check that is wanted and does not exist is added to the package: a module with `run` of the shared signature, named
in `CHECKS`, and a line in `grammar.HOW_TO_READ`.

Writes `checks` and `null`.

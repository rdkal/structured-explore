# 2. Sample space

Say what one outcome ω is, as a thing in the world: "one order placed in 2025", "one hour of one sensor". One row of
the table must be one outcome, no more and no less: if the table has a row per item and the outcome is an order, the
sample space is wrong, or the outcome is an item of an order. Then:

- `source` and `where`: the table, relative to the data root, and the SQL that picks the rows that are outcomes.
  When no table has one row per outcome, `source` is a SQL query that makes one, e.g. a group by over a table with
  a row per zone and hour.
- `entry`: how an outcome gets in and what is dropped. "Every hour has a row, the build fails otherwise" is a sample
  space with no selection; "the hours a bid was placed" is one where the selection is part of every answer.
- `time`: the column that orders outcomes in time, a UTC timestamp. Split-half halves whole days by it. `timezone`
  is the zone whose days those are; `day` is SQL for the day outright when the zone is not enough.
- `variables`: every column the explore is about, each with its `meaning` and how it is `observed`: `measured`, `proxy`
  (stands for the thing meant) or `derived`, computed by `expr`, SQL over the source's row, such as the hour of day.
  `alias` renames a source column in Ω. Every variable is a node of the graph, so list what the graph needs.

Writes `sample_space`.

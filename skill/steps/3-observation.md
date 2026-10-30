# 3. Observation

Build, and read the page's "What is observed": how many outcomes over how many days, how many a day, and per variable
on how many outcomes it is defined, how many distinct values, lowest and highest. Then open the raw rows and read all
twenty by eye. Ask:

- Is every variable defined on every outcome it should be? A variable defined on 7 of 9 thousand says the sample space
  holds outcomes the source does not have, or the join missed; say which. The page marks such rows.
- Are the days the ones meant, with the right number of outcomes each? For hourly data in a zone with summer time,
  23 and 25 on the clock-change days are right.
- Do the lowest and highest values make sense in the variable's unit?
- Is a `proxy` variable close enough to the thing meant for the events that will use it?

Fix `sample_space` until the answers are yes, or write what is not observed into `entry`. A gap that another table
closes goes to step 4.

Writes nothing of its own; the page's table is the check.

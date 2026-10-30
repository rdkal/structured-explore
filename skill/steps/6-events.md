# 6. Events

An event is a subset of Ω, written as a SQL boolean expression over Ω's columns, and the expression is its name:
`price_2 > price_1`, `volume_2 > 60`, `hour < 6`. A question names its events by these expressions, so write them
to be read: short, over variables with good names, derived variables for anything that would need a function.
Give each its `meaning` in words when the expression does not say it all. A threshold is a choice: say why that
value, and if it was tuned by looking, say so.

`defined: before` or `after`: whether the event was named before or after looking at the data. An `after` event is
a hypothesis found in the data, and its answers are held to data not yet looked at before they are believed.

An event undefined on an outcome, because a variable is null there, is left out of every count it is in; the Events
list shows how many. Compound events (`t and c`) are events too, and the way to condition on two things at once.

Writes `events`.

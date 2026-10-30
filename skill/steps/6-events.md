# 6. Events

An event is a subset of Ω: a name and a SQL boolean expression over Ω's columns, with its `meaning` in words. Name
events that a human reasons with: "the order came back", "night", "a weekend". A threshold is a choice:
write why that value, and if it was tuned by looking, say so.

`defined: before` or `after`: whether the event was named before or after looking at the data. An `after` event is a
hypothesis found in the data, and its answers are held to the test days or to out-of-time data before they are believed.

An event undefined on an outcome, because a variable is null there, is left out of every count it is in; the events
table shows how many. Compound events (`t and c`) are events too, and the way to condition on two things at once.

Writes `events`.

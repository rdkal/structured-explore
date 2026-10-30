# 5. Graph

Before any conditional question, draw what causes what among the variables. Every variable of the sample space is
a node; the author writes the arrows:

```yaml
graph:
  edges:
    - price_1 -> price_2
    - day_ahead -> price_2
    - hour -> price_1
  notes: what the arrows rest on, what is a root, what is left out
```

Take the arrows from the project's causal model when it has one, else from time order and what is known of the
domain: a cause comes before its effect; a root, such as the hour of day, has no cause in the data. Variables that
belong in the graph but are not yet columns, the hour, the weekday, go into the sample space as derived variables
(`expr`) so they can be drawn and tested.

A pair with no arrow is a claim too: that the two have nothing to do with each other except through the arrows
drawn. The page lists every such claim as an implied independence, `x ⊥ y | z`, tests it on the data, and says
holds, fails or unclear. A fail is a missing arrow or a missing cause: fix the graph, or say in `notes` why not,
before reading any conditional that rests on it.

Each conditional question then gets a mark from the graph: the given is upstream of the event (read as its effect),
downstream (reads the effect backwards), a common cause only (association), or unconnected (an answer outside the
null means the graph is wrong). None of it shows a cause: the graph is the assumption the answers are read under.

Writes `graph`: `edges` and `notes`.

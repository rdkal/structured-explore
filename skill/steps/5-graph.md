# 5. Graph

Before any conditional question, draw what causes what among the variables. Every variable of the sample space is
a node; the author writes the arrows:

```yaml
graph:
  levels:
    - [hour]
    - [volume_1, price_1]
    - [day_ahead]
    - [volume_2, price_2]
  edges:
    - hour -> price_1
    - price_1 -> day_ahead
    - day_ahead -> price_2
    - volume_1 <-> price_1
  notes: what the arrows rest on, what is a root, what is left out
```

The levels are the moments of the story, top to bottom: the hour, one auction's close, the next gate. Every
variable is in exactly one; an arrow goes from an earlier level to a later one, never within one, and the tool
refuses a spec that breaks this. Two variables of one level that move together, the volume and the price an auction
cleared at, are joined by `a <-> b`: a shared cause not in the data, drawn dashed. Take the order from the project's
causal model when it has one, else from time: a cause comes before its effect; a root, such as the hour of day, has
no cause in the data. Variables that belong in the graph but are not yet columns, the hour, the weekday, go into the
sample space as derived variables (`expr`) so they can be drawn and tested.

A pair with no arrow is a claim too: that the two have nothing to do with each other except through the arrows
drawn. The page lists every such claim as an implied independence, `x ⊥ y | z`, tests it on the data, and says
holds, fails or unclear. A fail is a missing arrow or a missing cause: fix the graph, or say in `notes` why not,
before reading any conditional that rests on it.

Each conditional question then gets a mark from the graph: the given is upstream of the event (read as its effect),
downstream (reads the effect backwards), a common cause only (association), or unconnected (an answer outside the
null means the graph is wrong). None of it shows a cause: the graph is the assumption the answers are read under.

Writes `graph`: `edges` and `notes`.

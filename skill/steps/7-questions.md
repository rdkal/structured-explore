# 7. Questions

A question is asked of registered events only:

- `marginal`: P(A), how often A, over every outcome.
- `joint`: P(A and B), how often both, over every outcome.
- `conditional`: P(A | B), how often A among the outcomes in B.

Before the answer is seen, the reader guesses it: a `guess`, `[lo, hi]`, in the yaml, or on the page, which hides each
answer until a guess is typed and saves the guesses in the browser. The chip says hit or miss; over many explores this
is the measure of whether the pages teach reading. The agent never writes a guess for the user; when it fills one in to
show the grammar it says so in a comment.

A joint or conditional question gets the null: what its answer would be were A and B independent. `lineup: true`
hides the real spine plot among 19 shuffled ones on the page, for the reader to pick; if they cannot, the eye sees
nothing the null does not.

Ask few questions. Each conditional is a path through the data; a page of twenty finds something by chance.

Writes `questions`.

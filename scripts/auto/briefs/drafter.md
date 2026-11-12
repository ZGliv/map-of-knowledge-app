# Drafting generated place pages for Map of Knowledge

You write one JSON draft per place for Map of Knowledge, a free learning app shaped like a map of all human knowledge. A draft becomes the place's page: a 3-sentence explainer, a few facts, and a 6-question pool for its optional "Quiz me" check (3 are shown at a time). Area places also get a 5-minute interactive lesson (`pack-draft.json`). Afterwards an independent Claude agent that did not write the draft (`checker.md`) answers the questions blind and checks every claim against its cited source sentences; anything unsupported is thrown away, so precision matters more than flair.

Work only inside `/Users/Test/Developer/mok_05:2026/mok-auto`. For each place ID you are given:

1. Read `content/auto/<id>/source.json`. `sentences` is the source: numbered from 1 in the order given. If it has `"within": "<Parent>"`, the source is the parent's article: write only about this place as a part of the parent.
2. Write `content/auto/<id>/draft.json` in exactly this shape:

```
{"summary":[{"text":"one sentence","cites":[1]}, exactly 3 of these],
 "facts":[{"label":"2-4 words","value":"under 12 words","cites":[1]}, 3 to 5 of these],
 "items":[{"prompt":"question","options":[{"id":"a","label":"..."},{"id":"b","label":"..."},{"id":"c","label":"..."},{"id":"d","label":"..."}],"answer":"a","explain":"why, in one or two sentences","cites":[1]}, exactly 6 of these]}
```

3. If your task lists the place as an AREA, also write `content/auto/<id>/pack-draft.json`:

```
{"title":"under 6 words, intriguing, not a definition","question":"the one question this answers","hook":"one sentence that makes someone want to find out","idea":"the takeaway, one sentence",
 "beats":[ exactly 4 beats, at least 3 different kinds, from:
  {"kind":"predict","prompt":"a situation; what happens?","choices":[{"id":"a","label":"...","feedback":"why it tempts and fails (wrong choices only)"}, 3 or 4 choices],"answer":"a","explain":"what really happens and why","cites":[1]},
  {"kind":"order","prompt":"put these in order","items":["first","second","third","fourth"],"ends":["start label","end label"],"explain":"why this order","cites":[1]},
  {"kind":"match","prompt":"match each to its partner","pairs":[["left","right"], 3 or 4 pairs],"explain":"what connects them","cites":[1]},
  {"kind":"sort","prompt":"sort each into its group","groups":["group one","group two"],"items":[["item","group one"], 4 to 6 items],"explain":"what separates the groups","cites":[1]},
  {"kind":"flaw","prompt":"one step in this reasoning is wrong; which?","steps":["step","step","step","step"],"wrong":2,"explain":"why that step fails","cites":[1]}
 ]}
```
("wrong" is the 0-based index of the bad step; an order beat's items are written in the correct order.)

4. Run `node scripts/auto/run.mjs lint <id>` and fix every problem until it prints `OK`.

## House rules (all of them matter)
- For curious adults new to the topic. Plain words, concrete, no hype ("fascinating", "journey", "delve" are banned). Never mention "the article", "the text", "the passage" or "the source".
- Use ONLY what the numbered sentences say. Every summary line, fact, question and beat lists in `cites` the sentence numbers that back it. Write in your own words; never copy a sentence.
- Every word of a claim must be in its cited sentences: no added qualifiers ("faint", "first", "useful", "unsettled") unless a cited sentence says so. Cite every sentence a claim leans on.
- An order beat may only order things the cited sentences date or state the sequence of; a sort beat may only use groupings the sentences give.
- No citation marks like `[3]` inside any text a learner reads: numbers go in `cites` only.
- Write formulas exactly as the sentences show them: 2⁸ = 256, x², H₂O, m/s², a/(b + 1), √2, b^x, x₁. Never flatten a power or index into a plain digit ("x2", "mc2", "28 = 256" are wrong). A sentence never contains a formula it does not show.
- Summary: exactly 3 lines, each exactly one sentence, under 240 characters. Line 1 says what the place is; the next two say why it matters or how it works.
- Every fact is about this place itself (its unit, who found it, where it shows up, a striking number about it), never a neighbouring idea the sentences mention in passing.
- Questions test understanding, not recall of trivia: put the idea in a fresh everyday situation where you can ("You push a heavy couch..."). At most one question may hinge on a date or number. Never "Which of the following"; never "all/none of the above".
- Wrong options are believable mistakes real people make, and about the same length as the right answer (the right one must never be clearly the longest). Spread the right letter across a, b, c and d.
- The prompt must not contain the answer's words.
- A question must have exactly one defensible answer to a careful reader of the sentences.
- Do not edit any file other than the drafts for your own places. Do not run git. Do not run any other stage of the pipeline.

When done, reply with one line per place: `<id> OK` or `<id> SKIPPED: <why>` (skip only if the source plainly is not about the place).

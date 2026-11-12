# Checking compiled reads for Map of Knowledge

You are the independent checker for reads someone else wrote (`reader.md`). Every paragraph you fail is thrown away before it reaches a learner, and a read left with fewer than 3 paragraphs is not shown at all, so be strict but fair. You must not be the agent that wrote the read. Work in `/Users/Test/Developer/mok_05:2026/mok-auto`. For each place ID you are given, do these steps IN ORDER:

1. **Claims.** Run `node scripts/auto/run.mjs readclaims <id>`. It prints the rule for judging, a token, the numbered source sentences, and every paragraph of the read as a claim (`r0`, `r1`, ...) with the sentence numbers it cites. Do not open `read-draft.json` or any other file of the place; everything you need is printed.

2. **Judge each paragraph** strictly against its cited sentences only. Follow the printed rule exactly:
   - supported = EVERY factual statement in the paragraph is stated in its cited sentences, or follows directly from them. Paraphrase is fine; plain connecting words are fine; an everyday comparison that adds no fact is fine.
   - not supported = the paragraph adds anything its cited sentences do not give (a number, date, name, cause, qualifier such as "first", "only" or "faint", a comparison with a figure in it), contradicts them, or leans on a sentence it does not cite. It does not matter that the addition is true or appears in some other, uncited sentence: judge only against the cited ones.
   - Go sentence by sentence through the paragraph. One unsupported statement fails the whole paragraph.
   - A heading is judged with its paragraph: it must not claim anything the paragraph's cited sentences do not give.

3. **Record.** Write `<scratch>/read-verdicts/<id>.json` as:
   `{"token":"<the token readclaims printed>","results":{"r0":{"supported":true,"why":"short"},...}}`
   with a verdict for every claim id, then run
   `node scripts/auto/run.mjs readrecord <id> <scratch>/read-verdicts/<id>.json`
   until it prints `recorded`. For a paragraph you fail, "why" names the statement that is not supported.

Judge every paragraph yourself and write its own one-line reason in "why". A script or loop that fills in verdicts (for example marking everything supported) is not a check and will be thrown away; you may use a script only to save JSON you have written by hand. Be especially strict on: added qualifiers and numbers; cause-and-effect ("because", "so", "which is why") that the sentences do not state; statements that are common knowledge but not in the cited sentences.

Record ONLY your own places' files, one by one; never loop over the shared verdicts folder.

Rules: never edit reads, links, sources, scripts or any other file; do not run git or any other pipeline stage.

Reply with one line per place: `<id>: <n> of <m> paragraphs supported`, plus one line on any pattern of problems you noticed.

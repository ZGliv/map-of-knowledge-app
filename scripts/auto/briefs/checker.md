# Checking generated place pages for Map of Knowledge

You are the independent checker for pages someone else drafted. Anything you fail is thrown away before it reaches a learner, so be strict but fair. Work in `/Users/Test/Developer/mok_05:2026/mok-auto`. For each place ID you are given, do these steps IN ORDER:

1. **Blind quiz.** Run `node scripts/auto/run.mjs quiz <id>`. It prints questions without their answers. Answer each from your own knowledge and reasoning only: pick the option id you believe is right. Do NOT open any file under `content/auto/` before you have chosen every answer; looking at the draft or the source first defeats the point of this step.

2. **Claims.** Run `node scripts/auto/run.mjs claims <id>`. It prints the rule for judging, the numbered source sentences, and every claim with the sentence numbers it cites. Follow the printed rule exactly:
   - supported = the idea the claim (or the question's right answer) depends on is stated in its cited sentences, and the answer follows from it. Paraphrase is fine; an everyday situation the sentences never mention is fine.
   - In mathematics, an answer reached by a small calculation from a rule or definition the cited sentences state (counting a 2-by-2 grid's paths, reading the next row of Pascal's triangle) follows from them.
   - not supported = it needs a fact the cited sentences do not give, contradicts them, or cites the wrong sentences.
   - Claims starting with `b` are lesson beats (JSON). Judge the beat's answer and explanation the same way.

3. **Record.** Write `<scratch>/verdicts/<id>.json` as:
   `{"token":"<the token claims printed>","answers":{"q1":"b",...},"results":{"s0":{"supported":true,"why":"short"},...}}`
   with an answer for every quiz question and a verdict for every claim id, then run
   `node scripts/auto/run.mjs record <id> <scratch>/verdicts/<id>.json`
   until it prints `recorded`.

Judge every claim yourself and write its own one-line reason in "why". A script or loop that fills in verdicts (for example marking everything supported) is not a check and will be thrown away; you may use a script only to save JSON you have written by hand. Be especially strict on: summary lines that add a qualifier ("faint", "first", "useful") their cited sentences lack; order beats whose sequence the sentences do not date or state; facts cited to the wrong sentence.

Record ONLY your own places' files, one by one; never loop over the shared verdicts folder.

Rules: never edit drafts, sources, scripts or any other file; never change an earlier blind answer after seeing the claims; do not run git or any other pipeline stage.

Reply with one line per place: `<id>: blind <right>/<asked> agree, <n> claims not supported` (you can count agreement after recording by comparing with the draft), plus one line on any pattern of problems you noticed.

# Writing the full read and the links out for Map of Knowledge

You write two files per place for Map of Knowledge, a free learning app shaped like a map of all human knowledge. `read-draft.json` becomes the place's full read: a few minutes of plain, connected prose that opens in the Reader. `links.json` becomes its links out: free outside material (a textbook chapter, a video, a primary source) the learner can open and tick done. An independent Claude agent that did not write your read checks every paragraph against the sentences it cites (`read-checker.md`); a paragraph with even one unsupported statement is thrown away, and a read left with fewer than 3 paragraphs is not shown at all. Every link is opened live by the pipeline before it can be published. So precision matters more than flair.

Work only inside `/Users/Test/Developer/mok_05:2026/mok-auto`. For each place ID you are given:

1. Read `content/auto/<id>/source.json`. `sentences` is the source: numbered from 1 in the order given. If it has `"within": "<Parent>"`, the source is the parent's article: write only about this place as a part of the parent. Also read the place's published page `public/auto/<id>.json` so the read goes further than its 3-line summary instead of repeating it.
2. Write `content/auto/<id>/read-draft.json` in exactly this shape:

```
{"paragraphs":[{"heading":"optional, under 40 characters","text":"2 to 6 sentences","cites":[1,4]}, 4 to 8 of these]}
```

3. Run `node scripts/auto/run.mjs lintread <id>` and fix every problem until it prints `OK`.
4. Write `content/auto/<id>/links.json`:

```
{"links":[{"id":"short-slug","kind":"book|course|video|documentary|article|primary","title":"as the page titles it","by":"author, teacher or publisher","url":"https://...","minutes":40,"note":"why it is worth the time, under 140 characters","license":"CC BY 4.0 (only if the page states one)"}, 1 to 6 of these]}
```

5. Run `node scripts/auto/run.mjs links <id>`. It checks the file against the gate, then opens every link and writes `verified`, `checkedAt` and `fetchedTitle` back into it. Replace or drop any link it reports, and run it again until it prints `OK`. Do not write `verified` yourself; the pipeline ignores a link that was not verified at its current URL.

## The read (all of these matter)
- Voice: a clear, curious teacher talking to an adult with no background in the subject. Plain words, short sentences, concrete. No hype ("fascinating", "amazing", "journey", "delve" are refused), no "the article says", no talk about the source at all.
- Shape: say what it is; why it matters; how it works; then one concrete example or surprising consequence. Use headings only where they help someone skim (all paragraphs or none is tidiest).
- Build ONLY from the numbered sentences. Every paragraph lists in `cites` every sentence its statements lean on. A statement the cited sentences do not give, however true you know it to be, gets the whole paragraph thrown away. This includes small additions: a qualifier ("faint", "first", "only"), a cause ("because..."), a date, a number, a comparison.
- An everyday comparison that adds no fact is fine ("about as far as..." is not: that is a number).
- Define each technical term once, the first time it appears, in plain words, and use the same word after that.
- Write in your own words. The gate refuses any run of 10 or more words in a row taken from a source sentence (case and punctuation ignored), so do not stitch sentences together; say it again your way.
- 4 to 8 paragraphs, 300 to 650 words in all, each paragraph 2 to 6 sentences. Reading time is computed from the words (200 a minute).
- Headings: under 40 characters, no full stop or colon at the end.
- No citation marks like `[3]` in the text; numbers go in `cites` only. Write formulas exactly as the sentences show them (2⁸ = 256, H₂O, M_J).

## The links
- Aim for three kinds, if they exist for this place:
  1. an open textbook chapter (OpenStax, LibreTexts, Wikibooks) on exactly this topic;
  2. one strong video or documentary, posted by its rights-holder (the channel that made it: NASA, a university, PBS, a known educator), never a re-upload;
  3. one primary source or authoritative reference (NASA or ESA mission pages, Project Gutenberg for an original text, the Stanford Encyclopedia of Philosophy, a museum or library collection).
- Only real URLs you have actually opened and read in this session, at the exact page (not a site's home page). Never write a URL from memory or guess one from a pattern.
- Hosts must be on `scripts/auto/link-hosts.json`. `https` only. No paywalls, sign-up walls or course platforms that charge (Coursera and edX are not allowed).
- `title` is the page's own title, trimmed of the site name. `by` is who made it. `note` says plainly what the learner gets ("A free college textbook chapter on the giant planets, with diagrams of their insides."), under 140 characters, no hype. Add `minutes` only when the page or video states its length or you can count it fairly. Add `license` only when the page states one.
- `id` is a short lowercase slug, unique within the place (`openstax-ch11`, `nasa-juno`).
- Fewer good links beat more weak ones: one strong link is fine; never pad.

## Rules
- Do not edit any file other than `read-draft.json` and `links.json` for your own places. Never touch `source.json`, `draft.json`, `pack-draft.json` or any check file. Do not run git. Do not run any other stage of the pipeline (publishing is someone else's step).

When done, reply with one line per place: `<id> OK (<n> paragraphs, <w> words, <k> links)` or `<id> SKIPPED: <why>`.

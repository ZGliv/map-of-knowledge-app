# Drafting brief: Sex-linked traits

**Place:** Science › Biology › Genetics & Genomes › Sex-linked traits (`knowledge.science.biology.genetics-genomes.sex-linked`)
**Claim it proves:** Genes on the X chromosome pass differently to sons and daughters: a man’s one X shows whatever it carries, while a woman needs a colour-blind copy on both, so red-green colour blindness is far more common in men.
**Bundle to fill:** `src/places/generated/genetics-sex-linked.ts` (schema `mok.place/2`, places/contract.ts)

## The contract (validatePlace runs every rule)
- `place.leaf`: The place is a terminal atlas leaf and the pack, reels and bank all point at it.
- `pack.budget`: 7–11 beats, cover first, payoff last; 5–8 graded beats with unique grade IDs.
- `pack.transfer`: At least two transfer checks, at least one of them open-response.
- `pack.rhythm`: An interaction by beat 2; never more than two passive beats in a row.
- `pack.formats`: At least one sim, at most one documentary; no format family more than twice or twice in a row.
- `pack.prompts`: Every prompt is 60 words or fewer.
- `pack.feedback`: Every wrong option in every multiple-choice moment has its own feedback.
- `pack.keys`: Key positions vary; keys come first at most a third of the time and are the longest option at most a quarter of the time.
- `pack.wellFormed`: Orders, matches and flaws are keyed to items that exist.
- `pack.orderLabels`: No years in ordering labels (dates give the order away).
- `pack.style`: No emoji, hype, ladder-of-life words or banned AI tells.
- `pack.numbers`: Number beats compute a finite answer for every case, and no answer is printed elsewhere in the pack.
- `pack.sims`: Every sim belongs to an archetype; its grade IDs, keys and stated results agree with its model.
- `pack.media`: Allowlisted Commons media only, credited with licence and alt text; ShareAlike never cropped, zoomed or filtered; CC BY crops say so; no unused or undeclared media.
- `pack.provenance`: At least 8 provenance entries, each a real claim with a real source.
- `reels.count`: 2–3 reels per place.
- `reels.valid`: Every reel passes the reel validator (sourced frames, narration, licences, prequestion never a check).
- `reels.noPreteach`: No reel names an entity a transfer check relies on, or shares 8 words in a row with a transfer item.
- `bank.identity`: Opaque item and family IDs; every graded beat maps to its own family; fresh families hold one item.
- `bank.answers`: Each item has exactly one defensible answer, a claim, an explanation and a source.
- `bank.entities`: Every listed entity appears in its item’s own text.
- `bank.supply`: 12+ items in 3+ kinds; 3+ open-response transfers, 4+ multiple-choice transfers, 4+ on the pack’s own scenarios; three checks in a row can be drawn.
- `bank.numbers`: Number items are computed by a named generator, never typed, and never print their own answer.
- `cases.supply`: At least 3 new cases per place (the expedition’s last beat, a retry, the Lasting mission), with unique opaque IDs.
- `cases.transfer`: Transfer is computed: no case names an entity its expedition or reels name, and every listed entity is in the case’s own text.
- `cases.engine`: Success is computed by the engine from the model: valid options, no typed answer, a neutral start, and a blind guess wins at most 1 in 5.
- `cases.seeded`: Every case is seeded: the same seed gives the same run, and other seeds never change the winning call.
- `cases.archetype`: A case plays in one of the place’s own sim archetypes, or says why another fits better.
- `cases.style`: No quiz words (quiz, test, check, question, score, points), no emoji or hype; scenario and ask together are 70 words or fewer.
- `cases.sources`: Every case has a claim, a reveal and an https source; a generated place lists the source in its sources.
- `sources.complete`: Every cited source is listed with a URL, retrieval date, licence and usage.
- `sources.allowed`: No source is used beyond its licence: link-only sources are never model input; Wikipedia revisions are pinned.
- `sources.quotes`: Every quoted passage matches its pinned public-domain edition word for word (elisions marked …).
- `sources.cleanRoom`: No text shares a run of 8 words with a cached Wikipedia extract (the writer works from the fact sheet, never the prose).
- `media.checked`: Every media file has a Commons licence snapshot that matches the licence printed, with no restrictions.

## How to write
- Write from the fact sheet (`content/generator/genetics-sex-linked/factsheet.md`), in your own words. Never copy 8 words in a row from Wikipedia: the clean-room check fails the bundle.
- Every provenance `source` must be a source ID from the fact sheet headings, character for character. Add a paper with `facts.mjs genetics-sex-linked --paper "Label|https://doi.org/…"`.
- Numbers a learner sees in a sim come from the engine; in a number beat or number item they come from a generator. Never type a computed answer.
- Sim beats: give params a type with `satisfies <EngineParams>` (import the type only), so drafting mistakes are compile errors. Peas cross: set `expect` on every step.
- Transfer items (in the bank) use organisms, places and people the pack never names; list them in `entities`. List any provenance source that only backs a transfer item in `transferOnlySources`.
- New cases (`cases`, src/cases/types.ts): at least 3, each a real situation the pack and reels never name, played in an engine from src/cases/engines.ts (population, tradeoff, cross, tree, clock, nest, chart), in the place's own archetype unless `fit` says why another fits better. The learner picks or sets something, then runs it; the engine computes who wins, so never type an answer. The slider starts outside the winning band and a blind guess wins at most 1 in 5. Write `reveal` as what really happened and why, sourced. Ask yourself: could someone win by guessing or fiddling? If so, change what they set.
- Reels: 2–3, 4–7 frames each, every frame cites a reel source whose `cite` is a pack provenance source; a `pre:` prediction that is not a check.
- Bank: at least 12 items, 3+ kinds; 3+ open-response transfers, 4+ multiple-choice transfers, 4+ on the pack’s own scenarios. Use IDs from `ids.json` once each.
- Plain words, no hype, no “Did you know”, no exclamation marks outside quotes, prompts ≤ 60 words.
- Worked examples of the format: src/expeditions/content/evolution-e10.ts, src/expeditions/content/evolution-e02.ts, src/expeditions/content/evolution-e03.ts; banks in src/checks/banks/; reels in src/explore/reels/.

## Minted IDs (content/generator/genetics-sex-linked/ids.json)
- Expedition families (one per graded beat): f_2ergm2jc17, f_z4zqxct1mr, f_fdr0b3gn8x, f_b0s25pthtm, f_bf4j1kberc, f_nq4vtsmezj, f_fbf7sgm4pf, f_dep568mqtn
- Items (item / fresh family): i_rr1f6h8psm/f_c0epjy13dm, i_0h4rq7qdbf/f_tx9zc4ta45, i_fqra3q52fj/f_h61ma4hq70, i_g58jh8nrx6/f_wh8msy3tty, i_kw5jb79c1a/f_pk78n0ftxw, i_8s6fqf8rfw/f_avyfz8721p, i_jnfmbffbwv/f_bqxqjzq7wz, i_wmj3a7kmza/f_hhk9raya8g, i_s9nh8qkwps/f_ckw49henx2, i_133bb5ry6t/f_94mwtgewp9, i_e15sn2hxhq/f_6sqqrsmssv, i_q4y7wwfrh2/f_4cprapvd26, i_4006aj9761/f_bym8ytn9tt, i_9614a5bz70/f_gmj9n4b8f2, i_m1h9egrws7/f_qab9qfwsgz, i_mqbt9p0x8h/f_395htcq5fm, i_qw64pmptky/f_gz4x9h06qv, i_8cswwysnwe/f_9r71zj3pnj, i_328nsm9th9/f_naj8nwv9xt, i_nx70fkg3yt/f_r7jzzx0120, i_jrh920j1zw/f_59f5rtghja, i_zbqprqhre2/f_8w6ktkxytm, i_peq7yn86gc/f_f8dcp86dty, i_nwfkbsdeta/f_k586k3ah9x

## Media candidates (licence-checked; content/generator/genetics-sex-linked/media-candidates.md)
- File:Ishihara 9.svg · Public domain · Shinobu Ishihara
- File:Ishihara-Test.svg · CC BY-SA 3.0 · Dan-yell
- File:Ishihara 1.svg · Public domain · Shinobu Ishihara
- File:Ishihara 2.svg · CC BY 2.5 · Sakurambo
- File:Ishihara 19.PNG · Public domain · Shinobu Ishihara
- File:Ishihara 23.PNG · Public domain · Shinobu Ishihara
- File:Ishihara 2a.svg · CC BY 2.5 · Sakurambo
- File:Ishihara 11.PNG · Public domain · Shinobu Ishihara
- File:Ishihara tests 12 74.svg · CC BY-SA 4.0 · RWhitwam
- File:Ishihara-12.gif · Public domain · Shinobu Ishihara
- File:Eight Ishihara charts for testing colour blindness, Europe Wellcome L0059158.jpg · CC BY 4.0 · unknown
- File:Eight Ishihara charts for testing colour blindness, Europe Wellcome L0059155.jpg · Public domain · Shinobu Ishihara
- File:Eight Ishihara charts for testing colour blindness, Europe Wellcome L0059162.jpg · CC BY 4.0 · unknown
- File:Eight Ishihara charts for testing colour blindness, Europe Wellcome L0059159.jpg · CC BY 4.0 · unknown
- File:Eight Ishihara charts for testing colour blindness, Europe Wellcome L0059160.jpg · CC BY 4.0 · unknown
- File:Eight Ishihara charts for testing colour blindness, Europe Wellcome L0059157.jpg · CC BY 4.0 · unknown
- File:Eight Ishihara charts for testing colour blindness, Europe Wellcome L0059161.jpg · CC BY 4.0 · unknown
- File:47-rg12.jpg · CC BY-SA 3.0 · The original uploader was Persil at German Wikipedia.
- File:47-rg17 lösung.jpg · CC BY-SA 3.0 · Matze6587
- File:Ishihara Plates 3, 11, 23, 21.svg · CC BY-SA 4.0 · RWhitwam
- File:Testcol2.png · CC BY-SA 3.0 · unknown
- File:Ishihara 3.jpg · Public domain · Shinobu Ishihara
- File:Ishihara compare 1.jpg · CC BY-SA 3.0 · Eddau processed File:Ishihara 2.svg by User:Sakurambo, with https://www.vischeck.com/vischeck/vischeckURL.php
- File:Eight Ishihara charts for testing colour blindness, Europe Wellcome L0059165.jpg · CC BY 4.0 · unknown
- File:Eight Ishihara charts for testing colour blindness, Europe Wellcome L0059164.jpg · CC BY 4.0 · unknown
- File:Critique of the Theory of Evolution Fig 035.jpg · Public domain · Thomas Hunt Morgan
- File:Critique of the Theory of Evolution Fig 036.jpg · Public domain · Thomas Hunt Morgan
- File:Portrait of John Dalton Wellcome L0002379.jpg · CC BY 4.0 · unknown
- File:John Dalton by Thomas Phillips, 1835.jpg · Public domain · Thomas Phillips
- File:John Dalton and his tomb in Manchester.png · Public domain · not stated

## The sim library: pick an archetype, fill it with data
## Population over generations (population)
A share in a population changes over generations because of a rule (selection), luck (drift) or chance mutation, and the learner can rerun it.
Knowledge types: causal-mechanism, quantitative-law, process
Pick when: The idea is about frequencies changing across generations, or about chance versus cause.
Avoid when: Nothing is inherited or counted across generations.
Worked examples: evolution-e03 (mothHunt); evolution-e04 (driftLab, fluctuation)
- engine `mothHunt`: Be the predator: catch the easiest prey, let the rest breed, fast-forward generations and watch a form’s share change. Leaks: Barks are only "soot" and "lichen"; the prey is always drawn as a moth.
- engine `driftLab`: Watch gene copies pick random parents until one version takes over, then compare many populations at a chosen size.
- engine `fluctuation`: Run a fluctuation test under two hypotheses, then lay the real published counts beside them. Leaks: Only the two-hypothesis (induced vs random) design is supported.

## Tree and phylogeny (tree)
Relatedness is read from shared ancestors on a branching tree, and splits can be dated.
Knowledge types: classification-tree, scale, nature-of-science
Pick when: The idea asks who is closer to whom, or when two lines last shared an ancestor.
Avoid when: There is no pinned tree from a citable source (Open Tree of Life, a dated paper).
Worked examples: evolution-e01 (treeSpin); evolution-e09 (lineageRewind)
- engine `treeSpin`: Spin branches of a real tree without changing it, then read relatedness from shared ancestors.
- engine `lineageRewind`: Wind the clock back from living species and watch their lines meet at shared ancestors, dated.

## Sorting and grouping (grouping)
Things sort into groups inside groups by shared features; a real pattern nests, and some finds would break it.
Knowledge types: classification-tree, argument, nature-of-science
Pick when: The idea is a classification whose structure is the evidence (nested hierarchy, a key).
Avoid when: A flat sort into buckets is enough: use a match beat with buckets instead.
Worked examples: evolution-e12 (nestTest)
- engine `nestTest`: Switch on shared traits one at a time and watch groups fall inside groups; then find the one find with nowhere to go.

## Timeline and scale (timescale)
A span too large to picture is mapped onto a familiar one, so relative times become visible.
Knowledge types: scale, quantitative-law
Pick when: The surprise is how long or short something is relative to something else.
Avoid when: Order matters but proportion doesn’t: use an order beat.
Worked examples: evolution-e06 (deepTime)
- engine `deepTime`: Squeeze a huge span into one 24-hour day: place an event by feel, play the day, zoom into the last seconds. Leaks: The span is always drawn as a 24-hour clock face.

## Map spread (spread)
Something moves across real places over time, and its route or speed is the lesson.
Knowledge types: spatial-spread, historical-narrative, empirical-data
Pick when: Places, dates and routes are known and sourced.
Avoid when: Geography is incidental to the idea.
Worked examples: history (spreadMap); evolution-e05 (spreadMap); evolution-e09 (spreadMap)
- engine `spreadMap`: Play something spreading across real places over time on a projected map; predict a route or the next place reached.

## Trade-off curve (tradeoff)
One trait is pulled two ways; the best value is where the gain and the cost balance, and it moves when either changes.
Knowledge types: systems, quantitative-law, causal-mechanism
Pick when: The idea is an optimum between a rising benefit and a rising cost.
Avoid when: The two pulls are not on the same trait.
Worked examples: evolution-e11 (tradeOff)
- engine `tradeOff`: Slide one trait between two pulls (a benefit that rises, a cost that rises) to find the best value, then predict where it moves. Leaks: The optional figure is only a guppy.

## Cross and inheritance (cross)
Offspring traits follow from one random copy from each parent; ratios appear in big counts, not small ones.
Knowledge types: quantitative-law, process, causal-mechanism
Pick when: The idea is a one-gene inheritance pattern: dominance, carriers, ratios, codominance.
Avoid when: The trait is polygenic or sex-linked (not supported yet).
Worked examples: evolution-e02 (peaCross); genetics-dominance (peaCross, dot looks)
- engine `peaCross`: Commit to a prediction, then make a one-gene cross: offspring are drawn one at a time, tallied and set beside a Punnett square. Leaks: One gene, two alleles shown at a time; no sex linkage yet.

## Chart reveal (chart)
The learner bets on which value is biggest, then real published data rises and settles it.
Knowledge types: empirical-data, compare-contrast
Pick when: There is a sourced dataset whose ranking is surprising.
Avoid when: The data has no time axis (the engine only plots against time for now).
Worked examples: evolution-e08 (lifeChart)
- engine `lifeChart`: Bet on the biggest value, then watch bars rise to the published figures and open each one. Leaks: The x axis is always time before present (Ma); no categorical or log-scale charts yet.

## Physical motion (motion)
A motion law is seen by re-running an experiment under changed conditions.
Knowledge types: quantitative-law, perceptual
Pick when: The idea is a fall, throw or drag effect.
Avoid when: The objects are not a hammer and a feather (leak: fix the drawing first).
Worked examples: physics (dropTower)
- engine `dropTower`: Re-shoot a strobe photograph of falling objects under different gravity and air. Leaks: Objects are always a hammer and a feather.

## Ratio and sound (ratio)
Simple whole-number ratios are heard and seen as agreement.
Knowledge types: perceptual, quantitative-law
Pick when: The idea is about proportions you can hear.
Avoid when: There is no sound or wave in the idea.
Worked examples: music (monochord, waveMixer)
- engine `monochord`: Slide a bridge along a string to find the lengths that sound in agreement. Leaks: A single string; targets must be simple fractions.
- engine `waveMixer`: Overlay two waves at a chosen ratio and see where the combined shape repeats.

# Drafting brief: Meiosis and shuffling

**Place:** Science › Biology › Genetics & Genomes › Meiosis and shuffling (`knowledge.science.biology.genetics-genomes.meiosis`)
**Claim it proves:** Meiosis halves the chromosome set and shuffles it, dealing each pair out separately and swapping stretches between partners, so siblings differ.
**Bundle to fill:** `src/places/generated/genetics-meiosis.ts` (schema `mok.place/2`, places/contract.ts)

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
- Write from the fact sheet (`content/generator/genetics-meiosis/factsheet.md`), in your own words. Never copy 8 words in a row from Wikipedia: the clean-room check fails the bundle.
- Every provenance `source` must be a source ID from the fact sheet headings, character for character. Add a paper with `facts.mjs genetics-meiosis --paper "Label|https://doi.org/…"`.
- Numbers a learner sees in a sim come from the engine; in a number beat or number item they come from a generator. Never type a computed answer.
- Sim beats: give params a type with `satisfies <EngineParams>` (import the type only), so drafting mistakes are compile errors. Peas cross: set `expect` on every step.
- Transfer items (in the bank) use organisms, places and people the pack never names; list them in `entities`. List any provenance source that only backs a transfer item in `transferOnlySources`.
- New cases (`cases`, src/cases/types.ts): at least 3, each a real situation the pack and reels never name, played in an engine from src/cases/engines.ts (population, tradeoff, cross, tree, clock, nest, chart), in the place's own archetype unless `fit` says why another fits better. The learner picks or sets something, then runs it; the engine computes who wins, so never type an answer. The slider starts outside the winning band and a blind guess wins at most 1 in 5. Write `reveal` as what really happened and why, sourced. Ask yourself: could someone win by guessing or fiddling? If so, change what they set.
- Reels: 2–3, 4–7 frames each, every frame cites a reel source whose `cite` is a pack provenance source; a `pre:` prediction that is not a check.
- Bank: at least 12 items, 3+ kinds; 3+ open-response transfers, 4+ multiple-choice transfers, 4+ on the pack’s own scenarios. Use IDs from `ids.json` once each.
- Plain words, no hype, no “Did you know”, no exclamation marks outside quotes, prompts ≤ 60 words.
- Worked examples of the format: src/expeditions/content/evolution-e10.ts, src/expeditions/content/evolution-e02.ts, src/expeditions/content/evolution-e03.ts; banks in src/checks/banks/; reels in src/explore/reels/.

## Minted IDs (content/generator/genetics-meiosis/ids.json)
- Expedition families (one per graded beat): f_w23a4czc83, f_e233gmvgmg, f_7dwq14bvt4, f_wk5q1rk26p, f_yczhmsypxm, f_hf67x72wfa, f_7a2cbvmc4c, f_sx79k9mbny
- Items (item / fresh family): i_7bpmny7jd7/f_414zv6ktkp, i_dk6svbfwmk/f_vm3kembs14, i_c20573yc7v/f_zm84gkfm05, i_bah9my0a7y/f_wn6mjps306, i_0h1jve82c1/f_qm4we5hv9d, i_hdvrqe1ybq/f_z5azkg6jez, i_1ggabacsbn/f_0jawmvrg5v, i_1bgkhktr32/f_58cxqg62hz, i_b59qz6a6df/f_tqwjw1p6mw, i_ttg70n7hm6/f_a6gxjayhmj, i_g1cwbgx7pp/f_817p175pyg, i_tjty71renr/f_vw3jz0xv46, i_wq7jhxanyr/f_91zpsxetjv, i_v1vzcwpzjj/f_rypsbevdh1, i_e5phqrdbqw/f_qvyh0r6538, i_dj9a1p18he/f_fc16dkbbqg, i_4hbhs2qn6s/f_9w7qsc30bq, i_510qd5m85a/f_y0jf4wb6th, i_fxs4n6fr82/f_n88gyts5aw, i_12y85437jq/f_5v814rpg0g, i_y2xknv51tt/f_ncv9zhh9q1, i_rv3stpc71j/f_3pmtrrbsmw, i_5bsapp7s9z/f_r956k2jcnf, i_699z3s86nw/f_7pq3aqt382

## Media candidates (licence-checked; content/generator/genetics-meiosis/media-candidates.md)
- File:Doryphoros MAN Napoli Inv6011 Schema-Contrapposto-chiasmo-ponderazione-Canone policleteo-Doriforo di Policleto.jpg · CC BY-SA 4.0 · Marie-Lan Nguyen image; Paolo Villa diagrams with transparent background, up draw and write example of Contrapposto Doryphoros from Pompeii (anonymous roman copy after Polykleitos)
- File:Meiosis crossover.png · CC BY-SA 3.0 · Boumphreyfr
- File:Chiasma-ru.png · CC BY-SA 3.0 · Antimoni Eruvanda - translated into Russian
- File:Chiasma.svg · CC BY-SA 3.0 · Antimoni
- File:Janssens's theory of chiasmatype.jpg · Public domain · Frans Alfons Janssens (1865–1924)
- File:Crossover 2.jpg · Public domain · MichelHamels at French Wikipedia
- File:Chelipa.png · CC BY-SA 4.0 · Alireza bidad
- File:Diakinesis.jpg · CC BY-SA 4.0 · Vallusruti
- File:Nematode Diagram of meiotic events during oogenesis in the C. elegans germ line.jpg · CC BY 2.5 · Hillers K.J., Jantsch V., Martinez-Perez E., Yanowitz J.L
- File:Nematode C. elegans The hermaphrodite germ line contains a complete time course of meiotic prophase..jpg · CC BY 2.5 · Hillers K.J., Jantsch V., Martinez-Perez E., Yanowitz J.L
- File:VanBeneden-1883-2.jpg · CC BY-SA 4.0 · Popocatomar
- File:VanBeneden-1883-1.jpg · CC BY-SA 4.0 · Popocatomar
- File:August Weismann.jpg · Public domain · Unknown authorUnknown author
- File:AugustWeismann.jpg · Public domain · Linnean Society
- File:Prof. August Weismann Ruhestätte.JPG · CC BY-SA 3.0 · Dr. med. Mabuse
- File:Weismann, August – Aufsätze über Vererbung und verwandte biologische Fragen, 1892 – BEIC 11801734.jpg · Public domain · August Weismann
- File:Weismann's Germ Plasm.svg · CC BY-SA 4.0 · Ian Alexander
- File:Joseph Kowarzik - Der Zoologe Geheimrat August Weismann.png · Public domain · Joseph Kowarzik
- File:Weismann's Germ Plasm zh-hans.svg · CC BY-SA 4.0 · 百战天虫
- File:Weismann's Germ Plasm-es.svg · CC BY-SA 4.0 · Ian Alexander De las modificaciones Senda1234
- File:PSM V87 D107 August Wiseman.png · Public domain · Unknown authorUnknown author
- File:Die Keimbahn.png · CC BY-SA 4.0 · Ian Alexander, deutsche Beschriftung Sciencia58
- File:Weismanntr.jpg · CC BY-SA 4.0 · Locutor1234
- File:LA2-Blitz-0421.jpg · Public domain · Anonymous
- File:L. I. Gardner, Molecular genetics... Wellcome L0000560.jpg · CC BY 4.0 · unknown
- File:We Can Do It!.jpg · Public domain · J. Howard Miller (1898–1985), artist employed by Westinghouse, poster used by the War Production Co-ordinating Committee
- File:Houston, We Have a Problem! official movie poster.jpg · CC BY-SA 3.0 · Studio Virc
- File:Kasyno Szlacheckie we Lwowie (1).jpg · CC BY-SA 4.0 · Pudelek
- File:SteffiWeismann-CallingVictoria.jpg · CC BY-SA 3.0 · Comaberlin
- File:We Can Do It! NARA 535413 - Restoration 2.jpg · Public domain · J. Howard Miller

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

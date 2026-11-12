# Drafting brief: From gene to protein

**Place:** Science › Biology › Genetics & Genomes › From gene to protein (`knowledge.science.biology.genetics-genomes.gene-to-protein`)
**Claim it proves:** A gene is copied into RNA, and the RNA is read three letters at a time into the chain of amino acids that makes a protein.
**Bundle to fill:** `src/places/generated/genetics-gene-to-protein.ts` (schema `mok.place/2`, places/contract.ts)

## Read first: the open decision, traps in the sources, names to keep out

### The archetype (decided 2026-10-23)
The workflow built the sequence archetype (commit ff6a0ef, "Sequence engine: …"): `sequenceLab` for the
expedition and the `sequence` case engine, both computing every RNA, chain and effect from the letters
(src/expeditions/sims/sequence.ts). The place is drafted on it. Cases read three real human genes,
letters copied from NCBI RefSeq (pinned as public-domain texts) and numbered from the A of the start
codon, as HGVS does: ABO c.261delG (older papers number it 258; Wikipedia [W16.70] says the O alleles
"share their first 261 nucleotides" with A01 before the lost G), HBB c.9T>C, c.19G>A, c.20A>T, c.27dup
and c.118C>T (dbSNP), and HBA2 c.427T>C (haemoglobin Constant Spring; the 31 extra residues are
computed from the RefSeq 3′ UTR and match Clegg et al. 1971).

### Names the expedition and reels must never use
Tay–Sachs, HEXA, ΔF508 (F508del), CFTR, cystic fibrosis, Duchenne, Becker and dystrophin. This place's own fact sheet names all of them (W4.77, W11.8, W11.123–W11.128, W11.137–W11.146, W11.163–W11.165), so anything drafted from W11 would pre-teach them, and cases.transfer would fail. Don't use them as case entities at all. Pick cases the fact sheet never mentions, and grep `factsheet.md` before you settle on one.

If one of them is ever used anyway, the engine and the reveal must get these right (checked 2026-10-23):
- ΔF508 is an in-frame deletion of three base pairs that removes one phenylalanine (Riordan et al. 1989, Science 245:1066, https://doi.org/10.1126/science.2475911). It is not a frameshift. The chain gets one residue shorter and stays in frame, so an engine that compares chains position by position would wrongly mark every later residue as changed. It needs an alignment-aware diff, or it should ask about chain length. The reviewer adds that the three bases span codons 507–508, leaving Ile507 unchanged. Confirm that against the Riordan full text before printing it.
- The Duchenne/Becker reading-frame rule (out-of-frame deletions give Duchenne, in-frame give Becker) holds for 91% of the Leiden database, not for all patients (Aartsma-Rus et al. 2006, Muscle Nerve 34:135, https://doi.org/10.1002/mus.20586; first stated by Monaco et al. 1988, Genomics 2:90, https://doi.org/10.1016/0888-7543(88)90113-9). The reveal must give the 9-in-10 caveat, and the case must use a real patient deletion that follows the rule.

### Traps in the fact sheet (the source is wrong, or the extract lost something)
- W4.11 says "43 = 64". The plain-text extract dropped the superscript, and the right figure is 4³ = 64.
- W3 (Translation, oldid 1377556947) writes tRNA as "TRNA" throughout. W3.28 says ribosomes contain "ribosomal RNA (TRNA)", which is wrong: ribosomes are built from rRNA and proteins, and tRNA carries amino acids to them. This is in the pinned wikitext itself, not an extraction bug. Fact-check any ribosome claim against W6 instead.
- W11 (Frameshift mutation) is unreliable beyond its opening definitions. Use W11.1–W11.2, W11.4–W11.5 and W11.91, and take frameshift facts from W10 (Reading frame), W13 (Frameshift mutation experiment) and W14 (Crick et al. 1961). Never draft from these:
  - W11.29 "prophase translation" is garbled. It means programmed ribosomal frameshifting.
  - W11.125 puts ΔF508 under frameshifts, but it is in-frame.
  - W11.154 "the most common cause of sudden death in young people" overclaims.
  - W11.161 says gene therapy is the standard treatment for primary immunodeficiencies, which is false.
  - W11.164 is wrong: exon skipping gives a shorter dystrophin that works in part, and the protein's function does not "stay intact".
  - W11.169 "no drugs … help with PIDs" overclaims.
- Media: `File:Transcription label en.jpg` shows ribosomal RNA genes being transcribed. That RNA is never translated, so never caption the image as a gene on its way to a protein.

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
- Write from the fact sheet (`content/generator/genetics-gene-to-protein/factsheet.md`), in your own words. Never copy 8 words in a row from Wikipedia: the clean-room check fails the bundle.
- Every provenance `source` must be a source ID from the fact sheet headings, character for character. Add a paper with `facts.mjs genetics-gene-to-protein --paper "Label|https://doi.org/…"`.
- Numbers a learner sees in a sim come from the engine; in a number beat or number item they come from a generator. Never type a computed answer.
- Sim beats: give params a type with `satisfies <EngineParams>` (import the type only), so drafting mistakes are compile errors. Peas cross: set `expect` on every step.
- Transfer items (in the bank) use organisms, places and people the pack never names; list them in `entities`. List any provenance source that only backs a transfer item in `transferOnlySources`.
- New cases (`cases`, src/cases/types.ts): at least 3, each a real situation the pack and reels never name, played in an engine from src/cases/engines.ts (population, tradeoff, cross, tree, clock, nest, chart, sequence), in the place's own archetype unless `fit` says why another fits better. The learner picks or sets something, then runs it; the engine computes who wins, so never type an answer. The slider starts outside the winning band and a blind guess wins at most 1 in 5. Write `reveal` as what really happened and why, sourced. Ask yourself: could someone win by guessing or fiddling? If so, change what they set.
- Reels: 2–3, 4–7 frames each, every frame cites a reel source whose `cite` is a pack provenance source; a `pre:` prediction that is not a check.
- Bank: at least 12 items, 3+ kinds; 3+ open-response transfers, 4+ multiple-choice transfers, 4+ on the pack’s own scenarios. Use IDs from `ids.json` once each.
- Plain words, no hype, no “Did you know”, no exclamation marks outside quotes, prompts ≤ 60 words.
- Worked examples of the format: src/expeditions/content/evolution-e10.ts, src/expeditions/content/evolution-e02.ts, src/expeditions/content/evolution-e03.ts; banks in src/checks/banks/; reels in src/explore/reels/.

## Minted IDs (content/generator/genetics-gene-to-protein/ids.json)
- Expedition families (one per graded beat): f_96jgxvzgwc, f_e8020c5ass, f_pd7a5tx9rh, f_veajt3yv9y, f_5wazgx15n5, f_77j015w90n, f_ydyrp55yz4, f_g4sykjrw56
- Items (item / fresh family): i_vjykhmdk6x/f_x11676ka7k, i_9jvjhwgxmz/f_99nvznbxze, i_58bxcex1da/f_3ag40jn9ke, i_1rzv7y3qg7/f_zkc8xzj21z, i_1wheb6dz18/f_s7r43e6h3h, i_vdve1ny19c/f_r2rtpw06x8, i_adjj00q1z2/f_c8zxe4w5cw, i_dbssxgdvcr/f_9ypp93thvw, i_j5d67sq2gp/f_6mfyyx0t3r, i_8qhgezztrm/f_r085fx7kzh, i_5v8z59x331/f_0axasynpby, i_snhdvdbgvt/f_85svp5ags0, i_jkd6c3rfe7/f_mrczmfzpwn, i_nqjaexzr9p/f_3pjj11dhyq, i_nrva5pzkn4/f_tmrgvxvg76, i_cyz3z70se9/f_6jn4tg0wsa, i_hz27zs4y4d/f_0p3xmdfgh2, i_s8vs0cky2k/f_88wx6c8380, i_ffyxphs4ac/f_q81b29ss8b, i_sns9rrnv58/f_tkz4pb61qh, i_c5n4pkg716/f_zq27fa2cyt, i_adaafx8axd/f_7vcksnmb01, i_9tyf9060s2/f_k34y0cdfpv, i_yh6bhysmga/f_tb3kpbbwet

## Media candidates (licence-checked; content/generator/genetics-gene-to-protein/media-candidates.md)
- File:Ribosome mRNA translation en.svg · Public domain · LadyofHats
- File:Ribosome mRNA translation ta.png · CC BY-SA 3.0 · G.Kiruthikan
- File:Ribosome mRNA translation vi.svg · CC0 · LadyofHats
- File:Ribosome mRNA translation de.svg · Public domain · Matt
- File:Ribosome mRNA translation pt.svg · Public domain · LadyofHats Translation: Nossedotti (Anderson Brito)
- File:Ribosome mRNA translation nl.svg · CC BY-SA 4.0 · LadyofHats, translated by TheBartgry
- File:Ribosome mRNA translation kn.png · CC0 · User:LadyofHats; translated into Kannada by User:ಪ್ರದೀಪ್ ಬೆಳಗಲ್
- File:Ribosome mRNA translation it.svg · Public domain · Ribosome_mRNA_translation_en.svg: LadyofHats derivative work: Jacopo Werther
- File:Ribosome mRNA translation uk.svg · Public domain · LadyofHats
- File:Ribosome mRNA translation zh.svg · Public domain · Ribosome_mRNA_translation_en.svg: LadyofHats derivative work: Shakiestone (talk)
- File:Ribosome mRNA translation tr.svg · Public domain · Translation: Srhat Original diagram: LadyofHats
- File:Ribosome mRNA translation es.svg · Public domain · Parri.
- File:Ribosome mRNA translation pl.svg · Public domain · LadyofHats, translated by Żbiczek
- File:Ribosome mRNA translation gl.svg · CC0 · original by User:LadyofHats. Derivative work by Miguelferig
- File:Ribosome mRNA translation ca.svg · CC BY-SA 3.0 · Jmarchn
- File:Ribosome mRNA translation sr.svg · CC BY-SA 3.0 · Dcirovic
- File:Ribosome mRNA translation fr.svg · Public domain · LadyofHats. Translation by Berru.
- File:Ribosome mRNA translation ku.svg · Public domain · LadyofHats
- File:Ribosome mRNA translation cs.svg · CC0 · Ribosome_mRNA_translation_es.svg: LadyofHats. Translation by User: Parri. derivative work: Faskal
- File:Ribosome mRNA translation ru.svg · CC BY-SA 4.0 · Донор
- File:Ribosome mRNA translation hr.svg · Public domain · File:Ribosome mRNA translation en.svg: LadyofHats MaGa
- File:Ribosome mRNA translation es-eu.svg · CC BY-SA 4.0 · Translated by Own work
- File:Ribosome mRNA translation ar.svg · CC BY-SA 4.0 · File:Ribosome mRNA translation en.svg: LadyofHats
- File:Ribosome mRNA translation bg.svg · Public domain · Gabby8228
- File:Ribosome mRNA translation ta.jpg · CC0 · original author: User:LadyofHats Derivation by User:5anan27
- File:Codon-Sonne Aminosäurenamen deutsch.svg · CC0 · Robert Kohlmann
- File:GeneticCode21-version-2.svg · Public domain · Edited by Seth Miller User:arapacana, Original file designed and produced by: Kosi Gramatikoff User:Kosigrim, courtesy of Abgent, also available in print (commercial offset one-page: original version of the image) by Abgent
- File:Genetic code ta.png · CC BY-SA 3.0 · G.Kiruthikan
- File:Genetic code zh.png · CC BY-SA 3.0 · webridge, the original one (English version) is made by Madprime
- File:GeneticCode21-landscape-2nd-pos.svg · CC BY-SA 4.0 · Ppgardne

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

## Sequence and code (sequence)
A string of letters carries information by a rule: it is paired, copied, read in fixed-size words by a code, and a single changed letter can change everything downstream or nothing at all.
Knowledge types: process, causal-mechanism, cognitive-procedure
Pick when: The idea lives in letters: DNA pairing and copying, transcription, the genetic code and reading frames, mutations and their effects, or two genomes (or texts) compared letter by letter.
Avoid when: The letters are incidental to the idea, or the sequence is too long to show (fold it with a window, or compare a sourced excerpt).
Worked examples: genetics-gene-to-protein (sequenceLab: transcribe, translate, change)
- engine `sequenceLab`: Predict, then run an operation on real letters: pair a strand, copy a gene into RNA, read it three letters at a time, change one letter or several, or line strings up and count their differences. Leaks: Only the standard genetic code is drawn and read in the lab (sequence.ts itself reads any word code). Letters are DNA or RNA only; a cipher or text alphabet needs its own tile colours. A lab step shows every letter, so keep it under about 60; a case can fold a long gene with a window. Play mode lets the learner change letters freely, but only the drafted change is named as an effect.

## Ratio and sound (ratio)
Simple whole-number ratios are heard and seen as agreement.
Knowledge types: perceptual, quantitative-law
Pick when: The idea is about proportions you can hear.
Avoid when: There is no sound or wave in the idea.
Worked examples: music (monochord, waveMixer)
- engine `monochord`: Slide a bridge along a string to find the lengths that sound in agreement. Leaks: A single string; targets must be simple fractions.
- engine `waveMixer`: Overlay two waves at a chosen ratio and see where the combined shape repeats.

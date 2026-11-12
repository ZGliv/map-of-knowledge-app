# A second gene for the cross engine

Revised 2026-10-27 after two independent reviews (engine and learning), and **built** on branch `gen-dihybrid`: types, engine, picture, pea-cross sim, archetype check, validator rule, reflex scan and tests. The Meiosis and Sex-linked content was then rewritten on it (`271c730`, `543f74f`) and both places are back in the build. The independent fact-check of the new units (round 4) found two lazy routes the scan has no rule for and three wording slips; round 5 fixed them and replaced S2 (§4, §7.10). Round 6 found a fourth: a third of the count won M3 and touched S1 and S3's bands; round 7 tightened those three tolerances (§4, §7.10), and round 8's independent look found all three supported. Round 8 also found a fifth in M2: genotypes counted as equally likely (1:1:1 instead of 1:2:1) gave a sixth of the count inside its band and two ninths one step from it; round 9 tightened M2 (§4, §7.10), and M2 waits on another independent look. Round 10, after two verifiers played the branch end to end, closed three more routes: a typed answer carried between the two places (M1 and S2 tightened to 6), S2's black tom read as hiding orange (the cat scenarios now say "a cat with one copy of each is tortoiseshell"), and a few wording and label slips; all six cases wait on an independent look (§7.10). This is approved for those two places only. The eight live cross cases (evolution-e02 ×3, genetics-dominance ×3, genetics-dna ×2) keep their outcomes, IDs and markup byte for byte, which a snapshot taken before any engine edit proves (§6A).

**Why:** a one-gene cross only makes quarters. Every answer is 0, ¼, ½, ¾ or all of the count. The lesson sims print those same shares, so the six held cases (`lazy.test.ts` HELD) fall to a reflex. Two genes on different chromosomes give sixteenths. These shares sit away from the landmarks, and the learner reaches them by dealing each gene separately. The reflex scan (§4) is what holds the second gene to that promise.

## 0. What the reviews changed

| Review item | Severity | What changed |
|---|---|---|
| Engine 1, Learning 1: S2 and S3 fall to "the one-X parent read as a carrier, sex dropped"; S3 also to the 9:3:3:1 corner | blocker | Fixed. S2 now counts the sons who escaped (`'NY|S'`, 1/8). S3 now asks for hens that aren't green (5/16). The carrier reading, with the sex word kept and dropped, is in the scan, and a test shows it wins the old S2 and S3. The engine reviewer's alternative S3 (skyblue hens, 1/16) is **not** taken: the scan's 9:3:3:1 rule wins it. |
| Learning 2: S1 calico 3/16 is a 9:3:3:1 single class | blocker | Fixed, and the learning reviewer's replacement (orange-and-white queen, calico 3/8) is **also refused**: reading the black tom as an ordinary gene with two of his own copies gives "every kitten tortoiseshell", and halving for "calico is female" lands on 3/8. With a black or orange tom this happens in every calico cross (§2), so calico cannot be a case. S1 is now black-and-white toms from a black queen and an orange-and-white tom (3/8). |
| Engine 2: M1's `'M|M'` breaks the design's own "no shared letter" check | should-fix | The check is dropped (argued in §1); fixtures use P/Q for the second pair of spots anyway. |
| Engine 3: six classes, four colours | should-fix | The two-gene picture has its own six tones (`TONES2`); the one-gene `TONES` is untouched and the snapshot proves its markup unchanged. |
| Engine 4: S2 and S3 share the answer 20; M1 and S3 both "20 of 320" | should-fix | Look-alikes are now checked by the number typed as well as by share, ±1 step. The recommended answers are all different across both places: 40, 60, 209 and 72, 48, 100 (S2 was 20 until round 5, §4). Different is not enough: until round 10, M1's band (40 within 8) reached S2's 48 and S2's (48 within 8) reached 40. Both are now 6, and `lazy.test.ts` holds every two-gene case against every other two-gene case's answer, a step either side, across places. |
| Engine 5: ±1 step across the atlas adds 39 keys to the HELD ledger | should-fix | The ±1 step and the sex transforms apply only to two-gene models (`cases/reflexes.ts` returns nothing for a one-gene case). HELD is unchanged and `lazy.test.ts` still passes on it. |
| Learning 3, Engine 6: "at least 9 counts outside" is false | should-fix | Corrected: each built case's real margin is listed in §4, computed by `nearestReflex` on the bundle (the fact-check recomputes it). `reflexes.test.ts` pins the margins of its own fixtures, the six as first recommended here (12, 10, 45.5 and 4, 4, 5); those differ from §4 where a case changed later (M2, M3, S1 and S3 tightened, S2 replaced). |
| Learning 4: M2 drops "vestigial" to dodge the transfer gate | should-fix | M2 lists its entities honestly (`Drosophila`, `ebony`, `vestigial`). The Sex-linked fly step uses a different ordinary wing gene (dumpy, chromosome 2), so no other unit names two of M2's entities. |
| Learning 5: M2 and M3 rely on dominance and self-pollination the lesson never teaches | should-fix | Their scenarios state both. A 51-word M3 draft (§4) shows it fits the 70-word cap. |
| Learning 6: the fly step only shows hybrid × non-carrier for the ordinary gene | should-fix | The step is now hybrid × hybrid for the wing gene (XᴿXʷ Dd × XʷY Dd). What it prints (3/16 and 1/16 per sex-and-look, ¼ and ¾ per gene) is in the scan, and the recommended cases clear it. |
| Learning 9: the grid at 375 px | should-fix | Built and screenshotted at 375 px and 1440 px (§3). Header column 24% (about 82 px), cells about 65 px, headers wrap. Labels should stay short (§3). |
| Engine 7: the snapshot doesn't pin PeaCross; archetype check in quarters; early return in a hooked component | nit | Pinned: CrossView markup at three moments, every pea-cross beat's `check()` and `asks()`, and the one-gene sim's opening markup, recorded from the **original** `PeaCross.tsx`. The two-gene step is its own component, chosen in `steps.map`; `StepPanel` changed by one line (`step.noun ?? p.noun`). The archetype check learns sixteenths. |
| Engine 8: the sex convention isn't enforced | nit | A two-gene model declares `second.sex: 'Y' \| 'W'`. The check requires it to rank with the top allele and be carried once by exactly one parent, and refuses an undeclared first-gene Y or W. |
| Engine 9: union template handles two parts; bad spellings give vague errors | nit | Unions list every part over one denominator with a serial "and". A class part the cross never makes is refused, with the engine's spelling when it is a reordering (`"oY|S" is spelled "Yo|S"`). |
| Engine nit: header spans in X crosses | nit | `boxesByLook` sorts each gene's boxes by look (in the order the traits are listed) before headers merge: Ng × NY draws N, N, NY, Y. |
| Learning nit: M1 names the horse by another word | nit | M1's animal is a drake (not named in the pack, its reels or bank); its chromosome numbers are for the facts stage. |
| Learning nit: S2 double error | nit | Taken (S2b). |
| Learning nit: shares carried between places | nit | Partly fixed (raw answers all differ). Two shares still repeat across places, 1/8 and 3/8. Under the scan a sex-linked single class can only be 1/8 or 3/8 (§4), so this is disclosed rather than removed (§7). |

## 1. Data model (as built)

```ts
// cases/types.ts: CrossModel gains one optional field. Nothing else changes.
second?: SecondGene;

interface SecondGene {
  locus: Locus;                   // the second gene, on another chromosome pair
  parents: [string, string];      // same parent order as the first gene's
  traits: Record<string, string>; // this gene's looks: column headers and the line
  spots?: [string, string];       // with the model's `spots`: two more spots, both or neither
  classes: Record<string, string>;// what is counted: 'k1|k2' keys, commas join several; 2–6 keys
  sex?: 'Y' | 'W';                // the first gene is X- (or Z-) linked; this letter is the Y (or W)
}
```

- **Naming a class.** A key is `k1|k2`, each gene's phenotype key from `cross.ts phenotype()`; a class may join several (`'R|y,r|Y'`). The `focus` names one key. Labels are plain phrases.
- **Sex.** Gene 1 carries the existing convention (the one-X parent's Y, or a hen's W, is an allele). In a two-gene model it must be declared: `sex: 'Y'`, ranked **level with the top allele**, so every key with it is a son (or hen). With `{N: 2, g: 1, Y: 2}`: `N` daughters without the trait, `g` daughters with it, `NY` sons without it, `Y` sons with it. A first-gene Y or W that is not declared is refused, so a drafter who copies the one-gene `{N: 2, h: 1, Y: 1}` style is told at once. The second gene must be ordinary: it may not use the sex letter. Two genes on one chromosome are linked and would be dealt wrongly; the engine cannot detect that, and the archetype text says so.
- **Spots.** `spots` and `second.spots` together make four spots on four chromosome pairs of one animal; an egg or sperm takes one copy at each, 16 kinds.
- **Run.** `CrossRun` is unchanged. Brood entries are `'Rr|Yy'`, counts are keyed by class, `expectedShare` is the focus share.
- **Checks** (`checkTwoGenes`, reached only when `second` is set):
  - both genes' genotypes are valid (the cross is made);
  - every trait the cross makes, of either gene, has a label; so do the parents unless `parentLabels` or `spots` names them;
  - 2 to 6 classes, each labelled, together an exact partition of the combinations the cross makes; a part it never makes is refused with the engine's spelling when one exists;
  - `focus` is a class;
  - the sex letter rules above;
  - `copying` and `second` are never set together; `spots` on both genes or neither; count 8–2000.
- **Dropped: "no allele letter is used by both genes".** Each gene has its own locus, every genotype is split on `|` before either locus reads it, and phenotype keys are joined the same way, so a letter shared between genes is never ambiguous. Only the sex letter is barred from gene 2, because it means a chromosome there.

**Back-compat, as built.**
- `second` is optional and no field changed type or meaning.
- `cross.check` and `cross.outcome` start with `if (m.second) return …`; `CrossView` starts with `if (props.model.second) return <CrossTwoGenes …/>` (it has no hooks). Below those lines the one-gene bodies are unchanged.
- PeaCross picks `TwoGeneStep` or the old `StepPanel` per beat in `steps.map`. `StepPanel` changed by one line, the optional per-step `noun`.
- `midSentence` now also keeps the case of a label opening with a capital and a digit ("G6PD …"). Only the cross engine uses it, and no live label opens that way; the snapshot proves the eight lines unchanged.

## 2. The maths

Each gene's share comes from its own 2×2 square (`expected()`, quarters). The genes are dealt separately, so a combination's share is the product, in sixteenths (`expected2()`); a union is the sum of its parts. The truth is share × count: exact, independent of the seed, so the stability seeds always agree. The sampled brood draws gene 1 from both parents, then gene 2, from one seeded stream (`sample2()`).

Every row below is checked three ways in `dihybrid.test.ts`: the fraction printed here, a brute-force deal of every allele from every parent written in the test from scratch, and the engine.

| Cross | A_B_ | A_bb | aaB_ | aabb | one hidden trait only | at least one hidden |
|---|---|---|---|---|---|---|
| AaBb × AaBb | 9/16 | 3/16 | 3/16 | 1/16 | 3/8 | 7/16 |
| AaBb × aabb | 1/4 | 1/4 | 1/4 | 1/4 | 1/2 | 3/4 |
| AaBb × Aabb | 3/8 | 3/8 | 1/8 | 1/8 | 1/2 | 5/8 |
| AaBb × aaBb | 3/8 | 1/8 | 3/8 | 1/8 | 1/2 | 5/8 |
| AaBb × AABb | 3/4 | 1/4 | 0 | 0 | 1/4 | 1/4 |

**X-linked recessive × ordinary gene.** Share of all children, that sex's share in brackets.

| Cross | class | B_ | bb |
|---|---|---|---|
| XᴬXᵃ Bb × XᴬY Bb | affected sons | 3/16 (3/8) | 1/16 (1/8) |
| | unaffected sons | 3/16 (3/8) | 1/16 (1/8) |
| | daughters (none affected) | 3/8 (3/4) | 1/8 (1/4) |
| XᴬXᵃ Bb × XᵃY Bb | each of the 4 sex × look classes | 3/16 (3/8) | 1/16 (1/8) |
| XᵃXᵃ Bb × XᴬY Bb | affected sons / unaffected daughters | 3/8 (3/4) | 1/8 (1/4) |
| XᴬXᵃ Bb × XᴬY bb | affected sons / unaffected sons | 1/8 (1/4) | 1/8 (1/4) |
| XᴬXᴬ Bb × XᵃY Bb | unaffected sons / carrier daughters | 3/8 (3/4) | 1/8 (1/4) |

**Codominant X (orange O, black o; a female with one of each is tortoiseshell), white spotting S.**
- Oo Ss × oY Ss: calico 3/16. Oo ss × oY Ss: calico 1/8. OO Ss × oY Ss: calico 3/8.
- oo Ss × OY Ss: black-and-white toms 3/8 (every son takes his mother's X).

**Two limits, proved in the tests.**
1. *X-linked recessive, "how many affected".* Affected children = ½q + ½qf (q: the mother's chance of passing the copy; f: 1 if the father is affected). That always equals the ordinary-gene share with an unaffected father carrying one copy, or an affected father carrying two. So a recessive case must name a sex, and even then only some classes are clean (§4).
2. *Calico never tests the X split.* With a black or orange tom, every daughter gets his one colour, exactly as an ordinary reading that gives him two copies of it. So "ordinary gene, then half because calico is female" lands on the truth for every queen. Calico can be taught and can set a scenario, but it cannot be the counted class.

## 3. The picture (as built)

- **Before Run.** Only the parents: two chips, each "First look, second look" ("Grey body, normal wings"), or `parentLabels`. With spots, the four spots as a 2×2. No square, no shares; `views-two.test.tsx` checks the markup has neither.
- **During the run.** The tray fills with one dot per offspring, toned by class; the tally shows each class with its running count. Six classes, six tones (`TONES2`: the accent, its opposite hue, a quarter turn of hue each way, three eighths of a turn back, and pale), so no two classes share a colour on any place hue: the five coloured tones sit on five different hues, and pale is the accent's hue washed almost to grey. (Built first with the line colour as the sixth tone, which shares the accent's hue; swapped in the engine-review pass.)
- **After the run: `CrossGrid`** (`expeditions/sims/CrossGrid.tsx`, shared with the sim). A 4×4 table: rows are gene 1's four equally likely boxes, columns gene 2's. `boxesByLook` puts equal looks together, in the order the traits are listed, so headers merge (3+1, 2+1+1, 1+2+1…), with a stronger rule between groups. Cells carry a toned dot and no text: what a cell is reads off its row and column, so no cell depends on colour alone. The counted cells are ringed. `aria-label`: "Sixteen equally likely combinations: {focus} in {n}".
- **Size.** At 375 px the content is 343 px: header column 24% (about 82 px), cells about 65 px, 12 px type that wraps; 13 px and 42 px cells from 700 px up, capped at 460 px wide on desktop. Labels should stay short: about 18 characters for a column header that spans one column, which wraps to two lines. With `hyphens: auto` a long word can still break a header over three lines: S3's "No yellow pigment" did, and is now "Blue" (round 10). Screenshots in `output/dihybrid/` (untracked): three fixtures (sex-linked hens, plain dihybrid flies, four spots) and the sim, before and after the run, at 375 px and 1440 px.
- **Line.** After the run, under the picture (§5).
- **The pea-cross sim.** A beat declares the second gene once (`params.second`: locus and looks); each step names its parents' genotypes for it (`step.second`) and may name its own offspring noun (`step.noun`). In the tray and square, gene 1 keeps its shape or fill and gene 2 is a ring around it (solid, dashed or none, each look its own), so no combination depends on colour. After the grow: the readout per combination, the same 16-box grid, and the note "The sixteen boxes are equally likely: 9 round, yellow, 3 … in every sixteen". `expect` is then given in sixteenths per combination. `scaleUp` and `copying` stay one-gene only.

Rejected alternatives (unchanged): a gamete Punnett square (genotype text in 64 px cells, bookkeeping), a branch diagram (prints the products), two separate 2×2 squares (leaves the multiplying to the reader).

## 4. Case space

### The reflex scan (`cases/reflexes.ts`)

For every two-gene case, each value below is tried one slider step either side; any that lands in the winning band wins, and wins are refused by `validatePlace` (`cases.engine`) and by `lazy.test.ts` (nothing held).

- **The slider and the one-gene quarters:** start, minimum, maximum, middle; a quarter, half and three quarters of the count.
- **What the lesson shows:** every share a pea-cross step prints (each look of a one-gene step; each combination and each gene's looks of a two-gene step) and every counted number beat (`crossCount`), and the rest of each.
- **Look-alikes:** every other case in the place, by the number typed and by its share × this count.
- **Two genes as one:** either gene alone; the two genes' shares added; one part of a union alone.
- **Linked:** copies travel as the grandparents' sets, every pairing of every parent with two different copies of both genes.
- **The 9:3:3:1 table** on any cross that is not two hybrids of a hidden trait: single classes (1, 3, 9 in 16) for a one-combination question, sums (4, 6, 7, 10, 12, 13, 15) for a union. On two hybrids the table is the reasoning itself, so it is not a reflex there.
- **The sex split ignored** (with `sex`): the focus counted within its own sex; the sexes merged, when that adds young of the other sex (otherwise it *is* the answer); the X gene read as ordinary, the one-X parent given a second copy of any kind that leaves him looking as he does (two of his own, or a hidden carrier copy), with the sex word kept (half) or dropped. A reading that changes his look (a black tom read as tortoiseshell) is not one the scenario allows, so the scenario has to say so: the cat cases say "a cat with one copy of each is tortoiseshell", not "a female" (round 10: with "a female", a black tom hiding an orange copy, sex word dropped, landed on S2's answer).

What the scan does not cover: arithmetic slips with no name (7/16 for 3/8), outside knowledge (Mendel's 556 seeds), and a share carried from another place (§7). Another two-gene case's answer typed in, from any place, is held by `lazy.test.ts` rather than the scan (round 10).

### Meiosis: recommended

| # | Situation | Share → answer | Tol. | Guess | Nearest reflex (margin) |
|---|---|---|---|---|---|
| M1 | A drake's sperm, four spots on four chromosome pairs: copies from only one of his parents at all four | 1/8 → 40 of 320 | 6 | 3.8% | M2's answer 60 (14) |
| M2 | Grey flies with normal wings, each from an ebony fly and a vestigial one, interbred: ebony with normal wings | 3/16 → 60 of 320 | 5 | 3.1% | a quarter, 80 (15) |
| M3 | Round, yellow peas from a round-yellow × wrinkled-green cross, self-pollinated: seeds that mix the grandparents' looks | 3/8 → 208.5 of 556 (real 108 + 101 = 209) | 20 | 7.2% | the middle, 278 (49.5) |

- **M1 changed from 1/16.** "His mother's copy at all four" is the 9:3:3:1 corner on a cross of two 1:2:1 genes, and the scan refuses it. "Only one parent's copies at all four" needs both corners (1/16 + 1/16), so it is the same reasoning with nothing to recall. If Zack wants the single corner back, the table rule needs an exception for 1:2:1 genes; that is his call (§7).
- **M2 entities:** `Drosophila`, `ebony`, `vestigial`, honestly. The Sex-linked fly step no longer names vestigial.
- **M3** states dominance and self-pollination in its own scenario. A 51-word draft fits: "Round beats wrinkled and yellow beats green: one copy of each is enough. A pea plant from a cross of a round, yellow line with a wrinkled, green line pollinates itself and sets 556 seeds. How many seeds will mix the grandparent lines' looks, round and green or wrinkled and yellow?" It must not name Mendel (already in the pack).
- **Lesson step** (as built): "Two spots, one egg" takes the `grandparent` flaw beat's place as a beat of its own, a one-gene pea-cross whose two "parents" are a spot on chromosome 5 and one on chromosome 11 in one woman (`M`/`F`, noun eggs). It is not a third step of "Deal the copies", whose questions and markup the snapshot pins (§6A). It prints ¼ and ½, which the scan reads.

### Sex-linked: recommended

| # | Situation | Share → answer | Tol. | Guess | Nearest reflex (margin) |
|---|---|---|---|---|---|
| S1 | A black queen with white patches and an orange-and-white tom, each with one solid-coloured parent (oo Ss × OY Ss): black-and-white toms | 3/8 → 72 of 192 | 5 | 5.2% | S3's share, 60 (7) |
| S2 | A tortoiseshell queen with no white and a black-and-white tom with one solid parent (Oo ss × oY Ss): orange-and-white kittens (`'OY|S'`, labelled "Orange-and-white toms") | 1/8 → 48 of 384 | 6 | 3.1% | the fly step's 3/16, 72 (18) |
| S3 | A green cock hiding ino and blue × a green hen hiding blue: hens that aren't green (`'NW|b,W|B,W|b'`) | 5/16 → 100 of 320 | 3 | 1.9% | a quarter, 80 (17) |

- **S1** reasons: every son's one X is his mother's, so every son is black; half the kittens are sons; three in four have white. The ordinary reading (tom with two orange copies) gives "every kitten tortoiseshell", so 0. The scenario must say a tom has one X, and that a cat (not only a female) with one copy of each is tortoiseshell, so the orange tom can't be read as hiding black. Still open for Zack (§7.11): kittens taking after either parent (black half the time) times three quarters white, with "toms" dropped, lands on 72 itself.
- **S2** (round 5, replacing the G6PD and sickle cell case): every daughter gets her father's black X, so none is orange; half the toms get their mother's orange X; half the kittens get the tom's white-patch copy. The question names two conditions, so a coin flip for each gives ¼ (96); one colour in three times half gives 64; the tom read as an ordinary gene with two black copies gives no orange kitten. The count is 384 so that one colour in three, one step either side, still loses. The tom read as hiding an orange copy, sex word dropped, gives ¼ × ½ = 1/8, the answer itself; only the scenario's "a cat with one copy of each is tortoiseshell" rules it out (round 10). The tolerance is 6, not 8, so M1's 40 typed here loses (round 10).
- **Why the G6PD case went.** "Sons with sickle cell disease but no G6PD deficiency" was three halves, so a coin flip for each condition the question names won it, a reflex outside the scan (§7.10). No class of an X-linked recessive × autosomal cross survives both: a question that names no sex falls to the father read as a hidden carrier or as two of his own copies (§2, limit 1); one that names a sex is 1/8 (three halves, the coin flip) or 3/8 (S1's share, and the same readings with the sex word kept). Only a codominant X gene escapes, because a hidden copy would change the tom's look, so S2 is a second cat cross.
- **S3:** half the hens are ino; of the other half, a quarter are blue: 5/8 of the hens, 5/16 of the chicks. A hen has one Z (taught in the barred-chicks beat).
- **Why only 1/8 and 3/8 for a single class here.** Each gene gives whole quarters, so one combination is n/16 with n a product of two of 1–4: 1, 2, 3, 4, 6, 8, 9, 12 or 16. The landmarks take 4, 8, 12 and 16, and the table's singles take 1, 3 and 9 (an X- or Z-linked gene with a declared sex letter always splits the sexes, so it is never a 3:1 hybrid and the table always applies). Only 2 and 6 are left. A search of every X- or Z-linked × recessive cross (`reflexes.ts` on each) agrees.
- **Transfer:** calico, tortoiseshell, ino are new; cat and budgerigar each share one name with another place, which is allowed. S1 and S2 both name cat and tortoiseshell, which the transfer rule allows within a place.
- **Lesson step:** swap the `son-flaw` flaw beat for a second pea-cross beat, "White eyes, short wings", one two-gene step: a red-eyed female carrying white, hiding dumpy wings, × a white-eyed male hiding dumpy (XᴿXʷ Dd × XʷY Dd). It prints 3/16 and 1/16 per sex-and-look and ¼, ¾ per gene; the scan reads them and the three cases clear them. Ask: "Which young will have white eyes and dumpy wings?" Answer: some sons and some daughters, about one in sixteen of each. It teaches that the X gene follows sex, the ordinary gene splits the same way in sons and daughters, and "of those" multiplies.

### Rejected, with what wins them (all in `reflexes.test.ts`)

| Case | Wins it |
|---|---|
| Old M1, mother's copy at all four (1/16) | the 9:3:3:1 table, 1 in 16 |
| Old S1, calico from a calico queen (3/16) | the table's 3 in 16; the tom read as oo, sex kept; the fly step's 3/16 |
| Learning review's S1′, calico from an orange-and-white queen (3/8) | the tom read as oo, sex kept |
| Old S2, sons with both (1/8) | the father read as a carrier, sex dropped; S3's answer |
| Old S3, albino chicks (1/16) | the table's 1 in 16; the hen read as an ino carrier; S2's answer; the fly step's 1/16 |
| Engine review's S3, skyblue hens (1/16) | the table's 1 in 16 |
| Round-4 S2, sons with sickle cell disease but no G6PD deficiency (1/8) | a coin flip for each of its three conditions; the fly step's printed "one in eight" (since reworded). Both are outside the scan, found by the round-4 fact-check (§7.10) |

Sources to pin at the facts stage: ebony and vestigial (and dumpy) locations (FlyBase or Wikipedia: Drosophila melanogaster); ino and blue budgerigar genetics; tortoiseshell and white spotting in cats; G6PD deficiency and sickle cell disease; Mendel 1866 (public-domain Bateson translation, numbers only); drake chromosome count.

## 5. Outcome lines (as built)

One-gene lines are unchanged. Two-gene portions are in lowest terms, said as the one-gene lines say them ("every", "half the", "3 of every 16"). Exact strings are pinned in `dihybrid.test.ts`.

- **Single combination:** `{Cross}: {class} in {portion}, about X of N. Each gene is dealt separately: {trait1} in {portion1}, and {trait2} in {n of every d | half | all} of those. This run had Y.`
  > Grey flies with normal wings, each from an ebony fly and a vestigial one: ebony with normal wings in 3 of every 16 flies, about 60 of 320. Each gene is dealt separately: ebony body in 1 of every 4 flies, and normal wings in 3 of every 4 of those. This run had 58.
- **Union:** each part as "{trait1} and {trait2}", over one shared denominator, so the parts visibly add up; a serial "and".
  > Round, yellow pea plants pollinating themselves: a mix of the grandparents’ looks in 3 of every 8 seeds, about 209 of 556. Round and green in 3 of every 16, and wrinkled and yellow in 3 of every 16. This run had 200.
- **Sex in the label** (labels as in the `dihybrid.test.ts` fixtures, seed `seed`, which also gives the two runs above):
  > Carrier mothers with sickle cell trait and fathers with sickle cell disease: sons with sickle cell disease but no G6PD deficiency in 1 of every 8 children, about 20 of 160. Each gene is dealt separately: son without G6PD deficiency in 1 of every 4 children, and sickle cell disease in half of those. This run had 21.
- **Four spots:** `{n} {who} in every {d} carry {class}: about X of N. … These N {who} had Y.` ("Half the sperm carry …", "Every sperm carries …" when it comes to that.)

The trait labels appear mid-sentence, so content should write them to read there: "Son without G6PD deficiency" reads well, "Son, no G6PD deficiency" does not.

## 6. Tests (as built)

- **A. `cross-compat.test.tsx` + snapshot, committed first (`efb1b93`), before any engine edit.** For each of the 8 live cross cases: `runCase` JSON (truth, brood, counts, line), `caseProblems` = [], and `CrossView` markup at t = 0 with no outcome, 0.5 and 1. For every pea-cross beat the atlas held then, the two held places' included (five, listed by name in the test since): `check()` = [], `asks()`, and the sim's opening markup (recorded with the original `PeaCross.tsx` swapped back in). All byte-equal after the change. Pea-cross beats written since have no entry; every pea-cross beat, old or new, must pass `check()`.
- **B. `dihybrid.test.ts`:** every §2 table three ways; the ½q(1+f) limit over every mother and father; the deal (same seed, same brood; 20,000 draws within 1.5 points; joint share = product of marginals); box order and header runs; truth = share × count, union sums, counts add up; every check rejection, including the sex rules and the spelling hint; the four line shapes, "half of those", "all of those", a capital-and-digit label, and the one-gene line with a G6PD label.
- **C. `reflexes.test.ts`:** the scan reads lesson shares (one-gene steps, a two-gene step, a counted number beat); it finds every reflex the reviews found in the first design and refuses the learning review's calico; it lets nothing win the six recommended here, which also pass `caseProblems`, with margins ≥ 3 and a blind guess ≤ 10%; it offers every reflex family above and none for a one-gene case.
- **D. `lazy.test.ts`:** a new block holds every place to "no reflex wins a two-gene case", with nothing held. The one-gene scan and its HELD ledger are unchanged.
- **E. `views-two.test.tsx`, `archetypes.test.ts`:** the picture hides shares before the run and draws 16 boxes, 3 ringed, merged headers after it; four spots as a 2×2; the sim's two-gene step opens on both parents and the question; the archetype check passes a two-gene beat and refuses wrong sixteenths, a missing `step.second`, shared rings and a stray `step.second` on a one-gene beat.
- **F. `validatePlace`:** a two-gene case a reflex wins fails `cases.engine` with the reflex named.

## 7. Open risks and calls

1. **Grade budget.** Each pack drops one graded beat: Meiosis `grandparent`, Sex-linked `son-flaw`. Zack's call.
2. **Shares carried between places.** M1 and S2 are both 1/8; M3 and S1 are both 3/8. The raw answers differ (40/48, 209/72). Under the scan a sex-linked single class can only be 1/8 or 3/8, so Meiosis would have to drop its natural M1 and M3 to avoid this. The Sex-linked fly step also prints 3 in 16, M2's share; that one is accepted, because on two hybrids the table is the reasoning and the step's 3 in 16 is the same product (a quarter, then three quarters of those). The scan treats look-alikes within a place only. Carried shares still win in the browser (S2's 1/8 gives 40 in M1, M1's gives 48 in S2, S1's 3/8 gives 209 in M3, M3's gives 72 in S1), and none of this is among Zack's recorded calls: accept it as a known limit, or change M1 or M3 (Zack's call). A carried typed answer is a different matter and is fixed: until round 10, M1's band reached S2's 48 and S2's reached 40; both tolerances are now 6, and `lazy.test.ts` holds every two-gene case against every other's answer. Atlas-wide, a few answers of one-gene cases in other places happen to sit in a band (Dominance's 100 is S3's answer; DNA's 64 sits in M2's band, where 64 is also 3/16 rounded to a fifth); those are coincidences of numbers, not readings, and are left on the record.
3. **The 9:3:3:1 rule is strict.** It also refuses a 1:2:1 corner (old M1), where the table's 1/16 happens to be the right product. Relaxing it is a one-line change in `reflexes.ts` if Zack prefers the single corner.
4. **Calico cannot be a case** (§2, limit 2). It can still be taught or set the scene.
5. **Tight bands.** Every scan reflex sits at least 7 counts outside its band (S1 7, M1 14, M2 15, S2 18, S3 17, M3 49.5). The cost is in the bands themselves: S3 (5/16, a hair under a third) wins only within 3 of 100, a blind guess 1.9%, M2 within 5 of 60 (3.1%), S1 within 5 of 72 (5.2%), and M1 and S2 within 6 of 40 and 48 (3.8%, 3.1%). The answers are exact products, and the slider has one-step buttons, so reasoning lands on them.
6. **Linkage is not checked.** The engine trusts that the two genes are on different chromosome pairs.
7. **Unpinned facts.** The fact-check may change details in M1 (drake chromosomes), M2, S2, S3 and the fly step (dumpy).
8. **M3 recall.** Anyone who remembers 108 + 101 answers from memory. Outside knowledge, not a reflex; accepted.
9. **Held cases replaced.** All six held cases got new IDs, and the six HELD entries are gone. The places never shipped, so no learner history is lost.
10. **Reflexes outside the scan.** The round-4 fact-check found three kinds `reflexes.ts` has no rule for: a coin flip for each condition the question names (it won the G6PD S2), a number printed in the scenario (M1's "40 pairs of chromosomes" was its answer, 40), and a share the lesson prints in words (the fly step's "one in eight"). Round 5 fixed each in the content (S2 replaced, M1's scenario reworded, the fly step's explanation reworded) and checked the six cases against all three by hand. The round-6 fact-check found a fourth: a third of the count, the equal-chances habit when the question offers three outcomes (M3's "like one grandparent, like the other, or a mix"). It won M3 (185 of 556 at tolerance 24), sat on S1's edge (64 of 192 at 8) and inside S3's band (106.7 of 320 at 15). Round 7 tightened all three (M3 20, S1 5, S3 3), so a third now lands at least 3 counts outside every band, 2 with one step either side. The round-8 fact-check found a fifth in M2: genotypes counted as equally likely, 1:1:1 instead of 1:2:1. A quarter ebony times two thirds with normal wings (or a third times a half) is a sixth, 53.3, inside M2's band of 50–70; a third times two thirds is two ninths, 71.1, whose 70 won. Round 9 tightened M2 to 5 (band 55–65): every whole number within a step of either now loses, and 3/16 rounded to 0.2 (64) still wins. The same reading loses in the other five cases (each checked by hand through `judgeCase`). Adding these five to the scan is a change to shared validation and was not made; until it is, a new two-gene case needs the same hand check. Round 10 (two verifiers, after the un-hold): a typed answer carried between the places won M1 (S2's 48, band 32–48) and S2 (M1's 40, band 40–56), so both tolerances are now 6; S2's black tom read as hiding orange, sex word dropped, gave 48, which the scenario now rules out ("a cat with one copy of each"); M2 and M3 gloss "pure-bred (no hidden copies)", the fact their middle generation rests on; S2's ask says "orange-and-white kittens" and its class "Orange-and-white toms"; S3's blue look is labelled "Blue". M2's round-9 edit had kept an independent verdict under its old hash; it and the five edited cases now read independent: false until a fresh checker looks.
11. **S1's double error.** Kittens taking after either parent (black half the time) with "toms" dropped gives ½ × ¾ × 192 = 72, the answer, so no tolerance removes it (round 8 argued it down; the round-10 verifier confirmed it in the browser). Accept it as a known limit of S1, or replace S1 with a class whose "half like each parent, sex ignored" share isn't 3/8. Zack's call.

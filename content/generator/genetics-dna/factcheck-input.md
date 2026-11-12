# Adversarial fact-check: Half old, half new (genetics-dna)

You are an independent checker. You did not write this content. Your job is to BREAK it: for every
unit below, look for the claim being wrong, overstated, missing a qualifier, unsupported by the
cited source, or a quote that differs from the pinned edition by even one word. Default to
suspicion; "supported" needs a sentence you can point to.

Sources (pinned; cached text in content/generator/genetics-dna/sources/<file>.json, field "text"):
- Wikipedia: DNA · https://en.wikipedia.org/w/index.php?title=DNA&oldid=1379332306 · file: sources/Wikipedia_DNA.json
- Wikipedia: Base pair · https://en.wikipedia.org/w/index.php?title=Base_pair&oldid=1366209849 · file: sources/Wikipedia_Base_pair.json
- Wikipedia: Chargaff's rules · https://en.wikipedia.org/w/index.php?title=Chargaff's_rules&oldid=1374887856 · file: sources/Wikipedia_Chargaff_s_rules.json
- Wikipedia: DNA replication · https://en.wikipedia.org/w/index.php?title=DNA_replication&oldid=1376313272 · file: sources/Wikipedia_DNA_replication.json
- Wikipedia: Avery–MacLeod–McCarty experiment · https://en.wikipedia.org/w/index.php?title=Avery%E2%80%93MacLeod%E2%80%93McCarty_experiment&oldid=1300689347 · file: sources/Wikipedia_Avery_MacLeod_McCarty_experiment.json
- Wikipedia: Hershey–Chase experiment · https://en.wikipedia.org/w/index.php?title=Hershey%E2%80%93Chase_experiment&oldid=1368337364 · file: sources/Wikipedia_Hershey_Chase_experiment.json
- Wikipedia: Friedrich Miescher · https://en.wikipedia.org/w/index.php?title=Friedrich_Miescher&oldid=1373017178 · file: sources/Wikipedia_Friedrich_Miescher.json
- Wikipedia: Gene · https://en.wikipedia.org/w/index.php?title=Gene&oldid=1381592197 · file: sources/Wikipedia_Gene.json
- Wikipedia: GC-content · https://en.wikipedia.org/w/index.php?title=GC-content&oldid=1371983365 · file: sources/Wikipedia_GC-content.json
- Wikipedia: Sister chromatid exchange · https://en.wikipedia.org/w/index.php?title=Sister_chromatid_exchange&oldid=1314565299 · file: sources/Wikipedia_Sister_chromatid_exchange.json
- Wikipedia: Tetranucleotide hypothesis · https://en.wikipedia.org/w/index.php?title=Tetranucleotide_hypothesis&oldid=1375606552 · file: sources/Wikipedia_Tetranucleotide_hypothesis.json
- Wikipedia: Nucleic acid double helix · https://en.wikipedia.org/w/index.php?title=Nucleic_acid_double_helix&oldid=1373038059 · file: sources/Wikipedia_Nucleic_acid_double_helix.json
- Wikipedia: Meselson–Stahl experiment · https://en.wikipedia.org/w/index.php?title=Meselson%E2%80%93Stahl_experiment&oldid=1365289226 · file: sources/Wikipedia_Meselson_Stahl_experiment.json
- Wikipedia: Bromodeoxyuridine · https://en.wikipedia.org/w/index.php?title=Bromodeoxyuridine&oldid=1374303590 · file: sources/Wikipedia_Bromodeoxyuridine.json
- Wikipedia: Phi X 174 · https://en.wikipedia.org/w/index.php?title=Phi_X_174&oldid=1374402859 · file: sources/Wikipedia_Phi_X_174.json
- Wikipedia: Semiconservative replication · https://en.wikipedia.org/w/index.php?title=Semiconservative_replication&oldid=1380730067 · file: sources/Wikipedia_Semiconservative_replication.json
- Taylor, Woods & Hughes 1957, PNAS 43:122 (tritiated thymidine in Vicia faba root tips) · https://doi.org/10.1073/pnas.43.1.122 · (no cached text: judge from general knowledge and say so)
- Perry & Wolff 1974, Nature 251:156 (differential staining of sister chromatids with BrdU) · https://doi.org/10.1038/251156a0 · (no cached text: judge from general knowledge and say so)
Fact sheet with numbered sentences: content/generator/genetics-dna/factsheet.md

For each unit write one entry to content/generator/genetics-dna/factcheck.json:
{ "id": "<unit id>", "verdict": "supported" | "imprecise" | "unsupported" | "wrong" | "quote-mismatch",
  "evidence": "[W4.19] or a short quote from the source", "note": "what is wrong, if anything", "fix": "the smallest wording change that would make it right" }
Top level: { "checker": "<who you are>", "checkedAt": "<ISO time>", "units": [ … ] }.
Teaching simplifications are fine if they are true; say "imprecise" when a qualifier is missing.
Computed answers are produced by code from the stated rules; check that the rule and the setup are right.

## Units (80)

### P1 · provenance claim
Miescher, a Swiss physician, first isolated nucleic acid in 1869: working in Hoppe-Seyler’s laboratory at the University of Tübingen, he washed white blood cells from bandages and extracted from their nuclei a phosphorus-rich precipitate he called nuclein, now known as DNA
Cites: Wikipedia: Friedrich Miescher

### P2 · provenance claim
DNA was first isolated by Miescher in 1869 from the pus of discarded surgical bandages; he called it nuclein because it lay in the nuclei
Cites: Wikipedia: DNA

### P3 · provenance claim
In the early twentieth century biologists thought proteins carried genetic information, because proteins seemed more complex than DNA; Levene’s tetranucleotide hypothesis treated DNA as a repeating set of nucleotides
Cites: Wikipedia: Hershey–Chase experiment

### P4 · provenance claim
In 1944 Avery, MacLeod and McCarty at the Rockefeller Institute reported that DNA is the substance that transforms one type of bacteria into another; protein- and RNA-digesting enzymes left the extract active, a DNA-digesting enzyme destroyed it
Cites: Wikipedia: Avery–MacLeod–McCarty experiment

### P5 · provenance claim
Chargaff’s rules (late 1940s): in double-stranded DNA of any species, A equals T and G equals C; the article’s table of measured base percentages (a sample of Chargaff’s 1952 data, with a later φX174 row) covers maize, octopus, chicken, rat, grasshopper, sea urchin, wheat, yeast and E. coli, and φX174, whose unequal A and T mark single-stranded DNA
Cites: Wikipedia: Chargaff's rules

### P6 · provenance claim
Chargaff showed the four base frequencies were unequal, so DNA was not a systematic repeat and nothing stopped its sequence from storing information; G = C and A = T suggested the bases were paired
Cites: Wikipedia: Tetranucleotide hypothesis

### P7 · provenance claim
Bases on the two strands pair A with T and C with G; Watson and Crick proposed the double helix in 1953; because of complementarity, all the information is duplicated on each strand; DNA polymerase builds the complementary strand by base pairing; the order of the four bases encodes genetic information
Cites: Wikipedia: DNA

### P8 · provenance claim
A molecular gene is a sequence of nucleotides in DNA that is transcribed to produce RNA
Cites: Wikipedia: Gene

### P9 · provenance claim
Meselson and Stahl (1958) grew E. coli for several generations on nitrogen-15, moved them to nitrogen-14, and spun the DNA in a caesium chloride density gradient: after one replication it had intermediate density (ruling out conservative copying), after two it was equal amounts of intermediate and light DNA (ruling out dispersive copying), as semiconservative replication predicts
Cites: Wikipedia: Meselson–Stahl experiment

### P10 · provenance claim
In semiconservative replication the two strands separate and each acts as a template, so every new molecule contains one parental strand and one new strand
Cites: Wikipedia: Semiconservative replication

### P11 · provenance claim
φX174 is a virus of bacteria with a single-stranded DNA genome; its sequence was the first DNA genome read; its composition is about 23% G, 22% C, 24% A and 31% T
Cites: Wikipedia: Phi X 174

### P12 · provenance claim
GC-content is the share of G and C among DNA’s bases; higher GC-content means a higher melting temperature, and it is used to predict how primers anneal in PCR; yeast DNA is 38% G+C, thale cress 36%, Plasmodium falciparum about 20%, Streptomyces coelicolor A3(2) 72%
Cites: Wikipedia: GC-content

### P13 · provenance claim
Chargaff showed that the base composition of DNA varies by species, contrary to the tetranucleotide hypothesis; Hotchkiss confirmed it in 1952
Cites: Wikipedia: Avery–MacLeod–McCarty experiment

### B1.hook · beat 1 (cover)
Every gene you carry is a stretch of DNA, and before a typical cell divides, all of it is copied. In 1958 two scientists made old DNA heavier than any new DNA could be, then spun the copies in a tube to see where they settled. What did the tube show?
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B2.prompt · beat 2 (predict)
In DNA’s two strands, A always faces T, and C always faces G. One stretch of a strand reads A T G C C A. Which letters face it on the other strand, in the same order?
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B2.explain · beat 2 (predict)
T A C G G T. Every A faces a T and every C faces a G, so one strand spells out the other completely. Pull them apart, and each strand still holds what it takes to rebuild its partner.
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B2.partner.same · beat 2 (predict)
A T G C C A — feedback: Each letter faces its partner, never a copy of itself: an A sits opposite a T.
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B2.partner.swap · beat 2 (predict)
G C A T T G — feedback: That pairs A with G and T with C. In DNA the pairs are fixed: A with T, C with G.
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B2.partner.pair · beat 2 (predict)
T A C G G T [KEY]
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B2.partner.shift · beat 2 (predict)
C G T A A C — feedback: That pairs A with C. Go letter by letter with the fixed partners: A with T, C with G.
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B3.goal · beat 3 (sim)
Bacteria grown for many generations on heavy nitrogen have heavy DNA. Move them to ordinary, light nitrogen and let them divide: every new strand is now built light. Predict where the copies settle in a spinning tube of dense salt, where heavier DNA sinks lower, then spin them. Each dot is one molecule from the tube.
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B3.r1.ask · beat 3 (sim)
The bacteria divide once in light nitrogen, so their DNA is copied once. Where will the copies settle in the spinning tube?
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B3.r1.two · beat 3 (sim)
Half at the heavy mark, half at the light mark — feedback: That would happen if the old molecule stayed whole and a brand-new one were built beside it. The tube showed no heavy band at all.
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B3.r1.light · beat 3 (sim)
All at the light mark — feedback: The old heavy strands don’t vanish. Each one is still there, inside a copy, paired with a new light strand.
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B3.r1.mid · beat 3 (sim)
All in one band, halfway between [KEY]
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B3.r1.heavy · beat 3 (sim)
All at the heavy mark — feedback: After one round, half of all the DNA is newly built from light nitrogen, so it can’t all sit at the heavy mark.
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B3.r1.explain · beat 3 (sim)
One band, halfway between heavy and light, just as Meselson and Stahl saw. Pulling the old strands apart and pairing each with a new light strand makes every copy a hybrid, one heavy strand and one light. But copying that mixed old and new pieces along every strand would also give one middle band; the next round tells the two apart.
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B3.r2.ask · beat 3 (sim)
Let those hybrid molecules copy once more in light nitrogen. What will the tube show now?
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B3.r2.shift · beat 3 (sim)
One band again, a little lighter than before — feedback: That is what mixing old and new pieces along every strand would give. Instead each strand stays whole and gets a new light partner, so the light strands made in the first round give fully light copies: a second, light band appears.
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B3.r2.split · beat 3 (sim)
Equal bands: one hybrid, one light [KEY]
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B3.r2.three · beat 3 (sim)
Heavy, hybrid and light, one to two to one — feedback: A heavy copy needs two heavy strands, and every new strand here is light. No heavy molecule can form.
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B3.r2.same · beat 3 (sim)
One hybrid band, as before — feedback: Half the old strands are light now. A copy built on a light strand is light on both sides.
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B3.r2.explain · beat 3 (sim)
Two bands of equal size: hybrid and light. Each hybrid molecule splits into its heavy strand and its light strand, and each gets a new light partner. The heavy strand makes another hybrid, the light one a fully light copy. That ruled out the last rival idea.
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B4.frame1 · beat 4 (documentary)
In 1869 a young Swiss doctor, Friedrich Miescher, worked in this laboratory in Tübingen. He washed white blood cells off used bandages and pulled a new, phosphorus-rich substance out of their nuclei. He called it nuclein. We call it DNA.
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B4.frame2 · beat 4 (documentary)
For decades, most biologists bet that genes were made of protein. In 1944 Oswald Avery’s team at the Rockefeller Institute purified the substance that could turn one type of bacteria into another. It was DNA.
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B4.frame3 · beat 4 (documentary)
Enzymes that break down protein left their extract working. An enzyme that breaks down DNA stopped it.
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B4.frame4 · beat 4 (documentary)
Erwin Chargaff counted DNA’s four letters, A, T, C and G, in species after species. The mix changed from one species to the next, yet in every one he tested, A came out close to T, and C close to G. This is his table for salmon sperm DNA.
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B4.frame5 · beat 4 (documentary)
In 1953 James Watson and Francis Crick explained the match: DNA is two strands wound together, joined by pairs, A with T and C with G. A gene is one stretch of that long double strand.
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B5.prompt · beat 5 (flaw)
Before 1944, many biologists reasoned like this. Which step breaks?
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B5.explain · beat 5 (flaw)
Four kinds of unit are plenty if the chain is long: the information lies in their order, as a book’s lies in the order of a few dozen letters. The idea of DNA as a dull, fixed repeat fell when Chargaff found its letters in different amounts in different species, and Avery’s team had shown that DNA alone could carry an inherited change.
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B5.step.a · beat 5 (flaw)
Proteins are built from about twenty kinds of building block. DNA is built from four: A, T, C and G.
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B5.step.b · beat 5 (flaw)
Genes must hold a huge amount of information, enough to help build a whole body.
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B5.step.c · beat 5 (flaw)
A chain of only four kinds of unit is too simple to hold that much information. [THE BROKEN STEP]
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B5.step.d · beat 5 (flaw)
So genes must be made of protein, not DNA.
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B6.prompt · beat 6 (predict)
A virus called φX174 carries DNA whose letters measure 24% A, 31% T, 23% G and 22% C. In most DNA, A matches T and G matches C. Why not here?
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B6.explain · beat 6 (predict)
φX174 carries just one strand of DNA. In two-stranded DNA every A has a T facing it, so their counts have to agree; with no partner strand, nothing holds them together, and here they don’t. A gap like this is how single-stranded DNA gives itself away.
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B6.why.error · beat 6 (predict)
The measurements must be wrong — feedback: Its full sequence has been read letter by letter, and it gives the same uneven mix. The gap between A and T is real.
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B6.why.single · beat 6 (predict)
Its DNA is a single strand [KEY]
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B6.why.cross · beat 6 (predict)
It pairs A with C and T with G — feedback: Then T would match G, yet T is 31% and G only 23%.
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B6.why.virus · beat 6 (predict)
Viruses ignore the pairing rules — feedback: Viruses with two-stranded DNA follow the same pairing, and their counts match. What matters is whether there is a second strand.
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B7.number · beat 7 (number)
A sample of double-stranded DNA is analysed letter by letter: 18% of its letters are G. What percentage are A? → computed answer 32 % (G pairs with C, so C is 18% too: 36% together. The other pair shares the remaining 64% equally: 32% each.)
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### B8.idea · beat 8 (payoff)
A gene is a stretch of DNA, spelled in four letters. The two strands pair A with T and C with G, so each strand carries everything needed to rebuild the other: copying means pulling the strands apart and pairing new letters onto both.
Cites: Wikipedia: Friedrich Miescher; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: Chargaff's rules; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene; Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: Phi X 174; Wikipedia: GC-content

### R1.f1 · reel dna-half-old-half-new
In 1958 Matthew Meselson and Franklin Stahl grew bacteria on heavy nitrogen for many generations, until the nitrogen in their DNA was the heavy kind.
Cites: Wikipedia: Meselson–Stahl experiment

### R1.f2 · reel dna-half-old-half-new
Then they moved the bacteria to ordinary nitrogen and spun their DNA in a dense salt solution. Heavy DNA settles lower in the tube than light DNA.
Cites: Wikipedia: Meselson–Stahl experiment

### R1.f3 · reel dna-half-old-half-new
After one round of copying, all of it settled in a single band, halfway between heavy and light.
Cites: Wikipedia: Meselson–Stahl experiment

### R1.f4 · reel dna-half-old-half-new
After a second round there were two bands of equal size: one halfway, one light.
Cites: Wikipedia: Meselson–Stahl experiment

### R1.f5 · reel dna-half-old-half-new
So each copy keeps one old strand and gains a new one, built by pairing A with T and C with G along the old strand.
Cites: Wikipedia: Semiconservative replication; Wikipedia: DNA

### R1.prediction · reel dna-half-old-half-new
Heavy DNA is copied once, using only light building blocks. What are the two copies like? [KEY: Each half heavy, half light]
Cites: Wikipedia: Meselson–Stahl experiment

### R1.takeaway · reel dna-half-old-half-new
DNA is copied half and half: every new molecule is one old strand with a new partner paired onto it.
Cites: Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication; Wikipedia: DNA

### R2.f1 · reel dna-four-letters
Oswald Avery studied bacteria at the Rockefeller Institute for Medical Research.
Cites: Wikipedia: Avery–MacLeod–McCarty experiment

### R2.f2 · reel dna-four-letters
DNA had been known since 1869. Yet most biologists thought genes were proteins, which looked far richer than a molecule built from four kinds of unit.
Cites: Wikipedia: DNA; Wikipedia: Hershey–Chase experiment

### R2.f3 · reel dna-four-letters
In 1944 Avery’s team showed that purified DNA could turn one type of bacteria into another. Destroying its protein didn’t stop it; destroying its DNA did.
Cites: Wikipedia: Avery–MacLeod–McCarty experiment

### R2.f4 · reel dna-four-letters
Erwin Chargaff then found the four letters in different amounts in different species, so DNA could not be a simple repeat.
Cites: Wikipedia: Tetranucleotide hypothesis; Wikipedia: Avery–MacLeod–McCarty experiment

### R2.f5 · reel dna-four-letters
The order of the letters is the message, and a gene is one stretch of it.
Cites: Wikipedia: DNA; Wikipedia: Gene

### R2.prediction · reel dna-four-letters
In the 1930s, what did most biologists expect genes to be made of? [KEY: Protein]
Cites: Wikipedia: Hershey–Chase experiment

### R2.takeaway · reel dna-four-letters
Four letters are plenty: a gene is a stretch of DNA, and its message is the order of the letters.
Cites: Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: DNA; Wikipedia: Hershey–Chase experiment; Wikipedia: Tetranucleotide hypothesis; Wikipedia: Gene

### I.i_hgtkmqg87s · check item (choice)
Bacteria with all-heavy DNA are moved to light nitrogen, and their DNA is copied three times. In the spinning tube, what share of the molecules is hybrid, with one heavy strand and one light? [KEY: About a quarter] Other options: About half | None: the heavy strands are used up | About an eighth
    Claim: After three rounds of copying in light nitrogen, a quarter of the molecules are still hybrid.
    Explain: The two old heavy strands never break up or vanish: after every round each sits in one hybrid molecule. One molecule becomes 2, then 4, then 8, and still only 2 of them are hybrid. Two in eight is a quarter.
Cites: Wikipedia: Meselson–Stahl experiment; Wikipedia: Semiconservative replication

### I.i_4fee99tcj4 · check item (choice)
One strand of a DNA molecule reads G G A T C A. Which letters face it on the other strand, in the same order? [KEY: C C T A G T] Other options: G G A T C A | A A G C T G | A C T A G G
    Claim: Each letter of a DNA strand fixes the letter facing it: A with T, C with G.
    Explain: G faces C, A faces T, T faces A and C faces G, so G G A T C A is matched letter for letter by C C T A G T.
Cites: Wikipedia: DNA

### I.i_shay78p8ab · check item (flaw)
A student predicts the first spin of the heavy-nitrogen experiment. Which step breaks? (a) Before the move, both strands of every DNA molecule are heavy. (b) In light nitrogen, every new strand is built light. (c) Copying builds a whole new molecule beside the old one, which stays in one piece. (d) So after one round, the tube should show one heavy band and one light band. [BROKEN: c]
    Claim: Copying separates the old strands, so every first-round copy is half heavy and half light.
    Explain: Copying pulls the two old strands apart and pairs a new strand onto each, so every copy is one heavy strand plus one light one. That is why the tube shows a single band halfway between, not a heavy band and a light one.
Cites: Wikipedia: Meselson–Stahl experiment

### I.i_0czat095ds · check item (order)
Put the copying of one DNA molecule in order. The two strands of the molecule come apart → A new letter pairs with the next letter on each old strand, A facing T and C facing G → It is linked onto the end of the growing new strand → Two molecules, each with one old strand and one new
    Claim: DNA is copied by separating the strands and pairing new letters onto each one.
    Explain: The old strands separate and each acts as a template: one new letter at a time pairs with it and is linked onto the growing new strand, so every finished molecule holds one old strand and one new.
Cites: Wikipedia: Semiconservative replication; Wikipedia: DNA

### I.i_rba63qywrk · check item (choice)
Avery’s team had an extract that could turn one type of bacteria into another. Which result showed that the active part was DNA? [KEY: An enzyme that breaks down DNA stopped it working] Other options: An enzyme that breaks down protein stopped it working | Killing the bacteria with heat first stopped it working | No enzyme changed it at all
    Claim: Only an enzyme that destroys DNA stopped the transforming extract, which pointed to DNA as the active substance.
    Explain: Enzymes that digest protein and RNA left the extract working, and the bacteria had been killed with heat before the extract was made. Only a crude enzyme that breaks down DNA destroyed its power, which pointed to DNA as the carrier of the change.
Cites: Wikipedia: Avery–MacLeod–McCarty experiment

### I.i_drsef29sc5 · check item (choice)
A DNA sample measures 30% A but only 18% T. What does that suggest? [KEY: It is a single strand, with no partner] Other options: Its A pairs with C instead of T | Its G and C must be unequal too | Its strands pair A with A
    Claim: In double-stranded DNA A equals T, so a big gap between them points to a single strand.
    Explain: In a double strand every A faces a T, so their shares must match. A big gap between A and T points to no partner strand: single-stranded DNA, like that of φX174.
Cites: Wikipedia: Chargaff's rules

### I.i_7cv5b7bhwf · check item (choice)
In 1952 Alfred Hershey and Martha Chase grew two batches of a phage, a virus of bacteria: one with radioactive sulfur in its protein coats, one with radioactive phosphorus in its DNA. Protein contains sulfur and DNA doesn’t; DNA contains phosphorus. After each batch infected bacteria, which tag turned up mostly inside the cells? [KEY: Mostly the phosphorus] Other options: Mostly the sulfur | Both, in equal amounts | Neither: the virus stays outside
    Claim: In Hershey and Chase’s experiment the phage’s DNA, not its protein coat, entered the bacteria: evidence that its genes were DNA.
    Explain: Most of the phosphorus went in, while almost all the sulfur stayed outside with the empty coats. The virus delivers its DNA, its genes, into the cell, and the new viruses made there still carry the phosphorus tag.
Cites: Wikipedia: Hershey–Chase experiment

### I.i_5r44wr938b · check item (choice)
In 1928 Frederick Griffith injected mice with harmless rough pneumococcus mixed with deadly smooth pneumococcus killed by heat. Injected alone, neither the rough bacteria nor the heat-killed smooth ones killed mice. Together, the mice died, and live smooth bacteria were found in them. What best explains it? [KEY: Something from the dead bacteria changed the live ones] Other options: The heat-killed bacteria came back to life | The mice turned the bacteria deadly | The rough bacteria were deadly all along
    Claim: A substance from dead bacteria can carry a gene into living ones.
    Explain: Heat-killed bacteria don’t revive, and the rough kind alone was harmless. Something from the dead smooth bacteria changed live rough ones into the smooth, deadly type. In 1944 that substance was shown to be DNA.
Cites: Wikipedia: Avery–MacLeod–McCarty experiment; Wikipedia: DNA

### I.i_726snxg9vh · check item (choice)
In PCR, short strands called primers must stick to matching DNA. Two primers are the same length: one is 70% G and C, the other 30%. Which one needs the higher temperature before it lets go? [KEY: The one with 70% G and C] Other options: The one with 30% G and C | Neither: the same length lets go at the same temperature | Neither: temperature has no effect on pairing
    Claim: DNA richer in G–C pairs needs more heat to come apart.
    Explain: G–C pairs hold together more strongly than A–T pairs, mainly because they stack more strongly on their neighbours (they also have three hydrogen bonds to A–T’s two), so DNA with more G–C pairs needs more heat to separate. That is why labs use G and C content to predict the temperature at which a primer sticks.
Cites: Wikipedia: GC-content; Wikipedia: DNA

### I.i_tcp02m14c2 · check item (choice)
Counts of the letters in chicken DNA find that 21.6% of them are C. Roughly what share are A? [KEY: About 28%] Other options: About 21.6% | About 56.8% | About 78.4%
    Claim: In double-stranded DNA the share of C fixes the share of A.
    Explain: C pairs with G, so G is about 21.6% too: 43.2% together. A and T share the other 56.8% equally, about 28.4% each. The measured figure for chicken is 28.0% A.
Cites: Wikipedia: Chargaff's rules

### I.i_2bmfhn7bs7 · check item (number)
Counts of the letters in octopus DNA find that 33.2% of them are A. If every A faces a T and every C a G, what percentage are G? → computed answer 16.8 %
    Claim: One letter’s share in double-stranded DNA fixes the shares of the other pair.
    Explain: Each letter’s partner has the same share, and the two pairs fill 100% between them. Measured octopus DNA has 33.2% A, 31.6% T and 17.6% each of G and C, close to the paired prediction.
Cites: Wikipedia: Chargaff's rules

### I.i_rv528vq6w5 · check item (number)
Counts of the letters in sea urchin DNA find that 32.8% of them are A. If every A faces a T and every C a G, what percentage are C? → computed answer 17.2 %
    Claim: One letter’s share in double-stranded DNA fixes the shares of the other pair.
    Explain: Each letter’s partner has the same share, and the two pairs fill 100% between them. Measured sea urchin DNA has 32.8% A, 32.1% T, 17.7% G and 17.3% C.
Cites: Wikipedia: Chargaff's rules

### I.i_18xvtb7tqz · check item (number)
Counts of the letters in wheat DNA find that 22.7% of them are G. If every A faces a T and every C a G, what percentage are A? → computed answer 27.3 %
    Claim: One letter’s share in double-stranded DNA fixes the shares of the other pair.
    Explain: Each letter’s partner has the same share, and the two pairs fill 100% between them. Measured wheat DNA has 27.3% A, 27.1% T, 22.7% G and 22.8% C.
Cites: Wikipedia: Chargaff's rules

### I.i_wwcxs4w30e · check item (number)
Counts of the letters in rat DNA find that 28.4% of them are T. If every A faces a T and every C a G, what percentage are G? → computed answer 21.6 %
    Claim: One letter’s share in double-stranded DNA fixes the shares of the other pair.
    Explain: Each letter’s partner has the same share, and the two pairs fill 100% between them. Measured rat DNA has 28.6% A, 28.4% T, 21.4% G and 20.5% C.
Cites: Wikipedia: Chargaff's rules

# Adversarial fact-check: One X, or two (genetics-sex-linked)

You are an independent checker. You did not write this content. Your job is to BREAK it: for every
unit below, look for the claim being wrong, overstated, missing a qualifier, unsupported by the
cited source, or a quote that differs from the pinned edition by even one word. Default to
suspicion; "supported" needs a sentence you can point to.

Sources (pinned; cached text in content/generator/genetics-sex-linked/sources/<file>.json, field "text"):
- Wikipedia: Thomas Hunt Morgan · https://en.wikipedia.org/w/index.php?title=Thomas_Hunt_Morgan&oldid=1381402569 · file: sources/Wikipedia_Thomas_Hunt_Morgan.json
- Wikipedia: John Dalton · https://en.wikipedia.org/w/index.php?title=John_Dalton&oldid=1374984610 · file: sources/Wikipedia_John_Dalton.json
- Wikipedia: Ishihara test · https://en.wikipedia.org/w/index.php?title=Ishihara_test&oldid=1372126949 · file: sources/Wikipedia_Ishihara_test.json
- Wikipedia: Sex-link · https://en.wikipedia.org/w/index.php?title=Sex-link&oldid=1356719047 · file: sources/Wikipedia_Sex-link.json
- Wikipedia: Haemophilia · https://en.wikipedia.org/w/index.php?title=Haemophilia&oldid=1379703435 · file: sources/Wikipedia_Haemophilia.json
- Wikipedia: Glucose-6-phosphate dehydrogenase deficiency · https://en.wikipedia.org/w/index.php?title=Glucose-6-phosphate_dehydrogenase_deficiency&oldid=1381029243 · file: sources/Wikipedia_Glucose-6-phosphate_dehydrogenase_deficiency.json
- Wikipedia: Duchenne muscular dystrophy · https://en.wikipedia.org/w/index.php?title=Duchenne_muscular_dystrophy&oldid=1378824504 · file: sources/Wikipedia_Duchenne_muscular_dystrophy.json
- Wikipedia: X-linked hypophosphatemia · https://en.wikipedia.org/w/index.php?title=X-linked_hypophosphatemia&oldid=1378659044 · file: sources/Wikipedia_X-linked_hypophosphatemia.json
- Wikipedia: Budgerigar colour genetics · https://en.wikipedia.org/w/index.php?title=Budgerigar_colour_genetics&oldid=1363809821 · file: sources/Wikipedia_Budgerigar_colour_genetics.json
- Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701 · https://www.gutenberg.org/ebooks/30701 · file: sources/Morgan_A_Critique_of_the_Theory_of_Evolution_1916_Project_Gutenberg_30701.json
- Wikipedia: Sex linkage · https://en.wikipedia.org/w/index.php?title=Sex_linkage&oldid=1378648073 · file: sources/Wikipedia_Sex_linkage.json
- Wikipedia: ZW sex-determination system · https://en.wikipedia.org/w/index.php?title=ZW_sex-determination_system&oldid=1379497966 · file: sources/Wikipedia_ZW_sex-determination_system.json
- Wikipedia: Abraxas grossulariata · https://en.wikipedia.org/w/index.php?title=Abraxas_grossulariata&oldid=1380624120 · file: sources/Wikipedia_Abraxas_grossulariata.json
- Wikipedia: Color blindness · https://en.wikipedia.org/w/index.php?title=Color_blindness&oldid=1379640039 · file: sources/Wikipedia_Color_blindness.json
- Wikipedia: X-linked recessive inheritance · https://en.wikipedia.org/w/index.php?title=X-linked_recessive_inheritance&oldid=1364922807 · file: sources/Wikipedia_X-linked_recessive_inheritance.json
- Wikipedia: Ino budgerigar mutation · https://en.wikipedia.org/w/index.php?title=Ino_budgerigar_mutation&oldid=1372469413 · file: sources/Wikipedia_Ino_budgerigar_mutation.json
- Wikipedia: Blue budgerigar mutation · https://en.wikipedia.org/w/index.php?title=Blue_budgerigar_mutation&oldid=1307862401 · file: sources/Wikipedia_Blue_budgerigar_mutation.json
- Wikipedia: Cat coat genetics · https://en.wikipedia.org/w/index.php?title=Cat_coat_genetics&oldid=1378626985 · file: sources/Wikipedia_Cat_coat_genetics.json
- Wikipedia: Sickle cell disease · https://en.wikipedia.org/w/index.php?title=Sickle_cell_disease&oldid=1381768036 · file: sources/Wikipedia_Sickle_cell_disease.json
- FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03) · https://flybase.org/reports/FBgn0053196 · file: sources/FlyBase_FBgn0053196_dumpy_dpy_D._melanogaster_gene_report_FB2026_03_.json
- FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03) · https://flybase.org/reports/FBal0002834 · file: sources/FlyBase_FBal0002834_dpy_ov1_dumpy_oblique_vortex_allele_report_FB2026_03_.json
Fact sheet with numbered sentences: content/generator/genetics-sex-linked/factsheet.md

For each unit write one entry to content/generator/genetics-sex-linked/factcheck.json:
{ "id": "<unit id>", "verdict": "supported" | "imprecise" | "unsupported" | "wrong" | "quote-mismatch",
  "evidence": "[W4.19] or a short quote from the source", "note": "what is wrong, if anything", "fix": "the smallest wording change that would make it right" }
Top level: { "checker": "<who you are>", "checkedAt": "<ISO time>", "units": [ … ] }.
Teaching simplifications are fine if they are true; say "imprecise" when a qualifier is missing.
Computed answers are produced by code from the stated rules; check that the rule and the setup are right.

## Units (104)

### P1 · provenance claim
Congenital red-green colour blindness (protan and deutan) affects up to 1 in 12 males (8%) and 1 in 200 females (0.5%); it is more common in males because the opsin genes responsible (OPN1LW, OPN1MW) are on the X chromosome
Cites: Wikipedia: Color blindness

### P2 · provenance claim
OPN1LW and OPN1MW follow X-linked recessive inheritance: a hemizygous male with a mutant allele is colour-blind, a heterozygous female is not, a homozygous female is; diagnosis is usually by a colour-vision test such as the Ishihara test
Cites: Wikipedia: Color blindness

### P3 · provenance claim
Affected fathers cannot pass X-linked recessive traits to sons, who get his Y; affected males inherit the X from their mothers; females need two mutant Xs; an affected grandfather can have an affected grandson through his daughter; sons of a carrier have a 50% chance
Cites: Wikipedia: X-linked recessive inheritance

### P4 · provenance claim
Carrier mother and unaffected father: each son has a 50% chance of being affected and each daughter a 50% chance of being a carrier; affected father and non-carrier mother: no affected sons, every daughter a carrier; affected father and carrier mother: daughters affected or carriers with equal chance
Cites: Wikipedia: Sex linkage

### P5 · provenance claim
X-linked dominant: an affected heterozygous mother passes the trait to half her children of either sex; an affected father passes it to all daughters and no sons
Cites: Wikipedia: Sex linkage

### P6 · provenance claim
Dalton’s study of his own colour blindness, reported in 1794, gave the first scientific description of the condition; he and his brother were both colour-blind, so he recognised it as hereditary; his preserved eye examined in 1995 showed deuteranopia, the green-sensing photopsin gene missing
Cites: Wikipedia: John Dalton

### P7 · provenance claim
Ishihara plates, first published by Shinobu Ishihara in 1917, hide a number or shape in coloured dots; some plates show it clearly to people with normal colour vision and make it hard or impossible to see with a red-green deficiency, others show a number only to people with the deficiency, and a demonstration plate is visible to everyone
Cites: Wikipedia: Ishihara test

### P8 · provenance claim
In 1910 Morgan noticed a white-eyed male among red-eyed flies; crossed with a red-eyed female it gave all red-eyed young; the next generation gave white-eyed males; he concluded in 1911 the trait was sex-linked and probably carried on one of the sex chromosomes; Nobel Prize 1933; the Fly Room at Columbia
Cites: Wikipedia: Thomas Hunt Morgan

### P9 · provenance claim
Morgan’s account of white eyes in Drosophila (the source beat quotes it word for word): white-eyed male × red-eyed female gives all red; inbred, three red to one white, white only in males; the reciprocal gives red-eyed daughters and white-eyed sons; in fowl the sexes are reversed: barred hen × black cock gives black daughters and barred sons; black Langshan hen × barred Plymouth Rock cock gives all barred young, and these inbred give barred sons and half black, half barred daughters; in Abraxas, lacticolor female × grossulariata male gives grossulariata sons and daughters, and these inbred give lacticolor only among females; the reciprocal, lacticolor male × grossulariata female, gives lacticolor daughters and grossulariata sons, and these inbred give grossulariata and lacticolor in both sexes
Cites: Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701

### P10 · provenance claim
In the ZW system females are ZW and males ZZ; the egg decides the sex; the system makes sex-link chickens possible
Cites: Wikipedia: ZW sex-determination system

### P11 · provenance claim
Sex-links are crossbred chickens whose colour at hatching differs by sex, which makes chicks easy to sex; black sex-links come from a Rhode Island Red (or other non-white, non-barred) cock and a Barred Rock hen
Cites: Wikipedia: Sex-link

### P12 · provenance claim
The magpie moth, Abraxas grossulariata, is a variable species; research using it led to the discovery of sex-linked characteristics
Cites: Wikipedia: Abraxas grossulariata

### P13 · provenance claim
X-linked hypophosphatemia (XLH) is an X-linked dominant form of rickets caused by mutations in the PHEX gene on the X chromosome; it affects about 1 in 20,000 people
Cites: Wikipedia: X-linked hypophosphatemia

### P14 · provenance claim
Morgan’s reciprocal white-eye cross, carried on: its red-eyed daughters and white-eyed sons, inbred, give red-eyed and white-eyed females and red-eyed and white-eyed males in equal numbers; the factor for red or white eyes is carried on the X, the female has two Xs, and the male one X and a Y that carries none of the normal allelomorphs of the mutant factors
Cites: Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701

### P15 · provenance claim
dumpy (dpy) is a Drosophila melanogaster gene on chromosome arm 2L (recombination map 2-13), involved in the size of the wing
Cites: FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03)

### P16 · provenance claim
The dumpy allele dpy[ov1] is recessive (FlyBase phenotypic class “visible | recessive”); homozygotes have a small, oblique wing, the tip of the wing blade collapsed: the “dumpy” phenotype
Cites: FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B1.hook · beat 1 (cover)
Plates like this one are made to catch red-green colour blindness. Up to 1 man in 12 has it. Among women it is about 1 in 200. Both inherit their colour vision from their parents. What makes the difference?
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B2.goal · beat 2 (sim)
The genes for the eye’s red- and green-sensing pigments sit on the X chromosome. A mother passes one of her two Xs to each child. A father passes his X to each daughter and his Y to each son. Predict each family, then raise it.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B2.carrier.ask · beat 2 (sim)
This mother sees colours normally, but one of her two Xs carries a colour-blind copy. The father sees normally. Which of their children could be colour-blind?
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B2.carrier.both · beat 2 (sim)
Sons and daughters, about equally — feedback: A daughter also gets her father’s X, and his works. She would need a colour-blind copy from each parent.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B2.carrier.sons · beat 2 (sim)
Only sons: about half of them [KEY]
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B2.carrier.daughters · beat 2 (sim)
Only daughters, like their mother — feedback: The mother isn’t colour-blind: her working copy covers for the other. Her daughters get their father’s working X as well.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B2.carrier.none · beat 2 (sim)
None of them: both parents see normally — feedback: A son has only one X, his mother’s. If he gets her colour-blind copy, nothing covers for it.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B2.carrier.explain · beat 2 (sim)
About one child in four is colour-blind, and every one of them is a son. Each son gets one of his mother’s two Xs plus his father’s Y, so half the sons get the colour-blind copy with nothing to cover it. Daughters also get the father’s working X: half carry the copy, and none show it.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B2.cbfather.ask · beat 2 (sim)
Now the father is colour-blind and the mother carries no colour-blind copy. Which of their children will carry his colour-blind copy?
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B2.cbfather.half · beat 2 (sim)
About half the sons and half the daughters — feedback: A father has only one X to give, so it goes to every daughter and to no son.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B2.cbfather.sons · beat 2 (sim)
Every son, since sons take after their father — feedback: A son is a son because he got his father’s Y, so the father’s X never reaches him.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B2.cbfather.none · beat 2 (sim)
None of them: the copy dies out with him — feedback: Every daughter gets his X. She sees normally, because her mother’s X works, but she carries his copy.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B2.cbfather.daughters · beat 2 (sim)
Every daughter, and no son [KEY]
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B2.cbfather.explain · beat 2 (sim)
Every child sees normally, but every daughter carries her father’s colour-blind copy, hidden behind her mother’s working one. His sons got his Y and never his X. That is how a colour-blind grandfather can have colour-blind grandsons through his daughters.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B3.quote1 · beat 3 (source)
QUOTE (must match https://www.gutenberg.org/ebooks/30701 exactly, “…” marks an elision): For instance, white eye color in Drosophila shows sex linked inheritance. If a white eyed male is mated to a wild red eyed female (fig. 35) all the offspring have red eyes. If these are inbred, there are three red to one white eyed offspring, but white eyes occur only in the males. The grandfather has transmitted his peculiarity to half of his grandsons, but to none of his granddaughters.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B3.quote2 · beat 3 (source)
QUOTE (must match https://www.gutenberg.org/ebooks/30701 exactly, “…” marks an elision): The reciprocal cross (fig. 36) is also interesting. If a white eyed female is bred to a red eyed male, all of the daughters have red eyes and all of the sons have white eyes. We call this criss-cross inheritance.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B3.note.red · beat 3 (source)
Like the colour-blind father in your second family: the white-eyed male’s daughters all carry his white-eye copy, and none show it.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B3.note.males · beat 3 (source)
Every white-eyed fly in that generation is a grandson of the white-eyed male. His granddaughters all have red eyes.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B3.note.grandsons · beat 3 (source)
The copy travels from grandfather to daughter to grandson. The white eyes skip the generation in between.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B3.note.criss · beat 3 (source)
Swap which parent is white-eyed and the result changes: a white-eyed mother has only white-eye Xs to give, so every son has white eyes.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B3.q.fade · beat 3 (source)
White eyes fade a little each time they pass through a female — feedback: Nothing fades: the white-eyed grandsons have eyes as white as their grandfather’s.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B3.q.y · beat 3 (source)
The white-eye gene rides on his Y, which only sons inherit — feedback: Then all his sons would have had white eyes. In the first cross every one of them was red-eyed.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B3.q.x · beat 3 (source)
His X went to his daughters, and each passed it to half her sons [KEY]
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B3.q.luck · beat 3 (source)
Chance: with more granddaughters, some would have shown white eyes too — feedback: Each granddaughter also gets her father’s X, and his carries red. None of them can end up with two white-eye copies.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B4.prompt · beat 4 (predict)
A girl is red-green colour-blind: both of her X chromosomes carry a colour-blind copy. What is almost certainly true of her father?
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B4.explain · beat 4 (predict)
She has a colour-blind copy on both Xs, and one of those Xs came from her father. A man’s single X shows whatever it carries, so her father is colour-blind himself, and her mother carries at least one copy. Two such parents are needed, which is why colour-blind girls are rare.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B4.father.cb · beat 4 (predict)
He is colour-blind too [KEY]
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B4.father.carrier · beat 4 (predict)
He carries a hidden colour-blind copy but sees normally — feedback: A man has one X and nothing to hide a copy behind. If his X carried it, he would be colour-blind.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B4.father.mother · beat 4 (predict)
Nothing: both copies could have come from her mother — feedback: Her mother gave her only one X. Her other X came from her father.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B4.father.grandfather · beat 4 (predict)
Nothing about him, as long as a grandfather was colour-blind — feedback: A grandfather can pass a copy down through her mother, but that is only one of the two she needs. The second came from her father.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B5.frame1 · beat 5 (documentary)
In 1794 the chemist John Dalton made the first scientific study of colour blindness, and the case was his own. His brother was colour-blind too, so Dalton concluded it was inherited.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B5.frame2 · beat 5 (documentary)
Women have two X chromosomes. Men have one X and a Y. The genes for the eye’s red- and green-sensing pigments sit on the X, and the Y has no copy of them.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B5.frame3 · beat 5 (documentary)
So a man’s red-green colour vision rests on one X, and that X always came from his mother. A father’s X goes to every daughter and never to a son.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B5.frame4 · beat 5 (documentary)
One colour-blind copy is enough in a man. A woman shows it only with a copy on both Xs, one from each parent. That is why far more men are red-green colour-blind.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B6.goal · beat 6 (sim)
Back to Morgan’s fruit flies, now following two genes. White eyes come from a copy on the X. Dumpy wings, small and cut short at a slant, come from a copy on chromosome 2 and show only in a fly with two. A mother passes on one of her Xs, a father his X or his Y, and each parent one of its two copies of the wing gene.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B6.fly.ask · beat 6 (sim)
Which young will have white eyes and dumpy wings?
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B6.fly.sons · beat 6 (sim)
Only sons, like the white-eyed flies in the second generation of Morgan’s first cross — feedback: Every daughter gets her father’s white-eye X. Half of them also get their mother’s white copy, so half the daughters have white eyes too.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B6.fly.four · beat 6 (sim)
Sons and daughters, each about one young fly in four — feedback: One young fly in four is a white-eyed son, and one in four a white-eyed daughter. Only a quarter of those also get a dumpy copy from each parent.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B6.fly.both · beat 6 (sim)
Sons and daughters, each about one young fly in sixteen [KEY]
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B6.fly.none · beat 6 (sim)
None of them, since both parents have normal wings — feedback: Each parent hides a dumpy copy. A young fly that gets one from each, about one in four, has dumpy wings.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B6.fly.explain · beat 6 (sim)
A son’s one X is his mother’s, so half the sons have white eyes. Every daughter gets her father’s white-eye X, so the half that also get their mother’s white copy have white eyes too. So white-eyed sons are a quarter of all the young, and white-eyed daughters another quarter. The wing gene is dealt separately, the same way in both: a quarter of each get a dumpy copy from each parent. That makes about one young fly in sixteen a white-eyed son with dumpy wings, and one in sixteen a white-eyed daughter with them.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B7.number · beat 7 (number)
A red-green colour-blind woman, with a colour-blind copy on both of her Xs, has children with a man who sees normally. Picture 72 children from many such couples. About how many of the 72 children will be colour-blind sons? → computed answer 36 children (Half the offspring of a colour-blind mother and a father who sees normally are colour-blind sons. 72 ÷ 2 = 36 children.)
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B8.prompt · beat 8 (predict)
Birds work the other way round: a hen has one Z chromosome and one W, a cock has two Zs. Barred feathers come from a version of a gene on the Z, and one copy is enough. A barred hen is mated with a black cock. Which of their chicks will grow up barred?
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B8.explain · beat 8 (predict)
Every son gets his mother’s single Z, with its barring, plus a plain Z from his father, so he is barred. Every daughter gets her mother’s W and her father’s plain Z, so she is black. Morgan described this cross in 1916, and breeders use crosses like it to tell hen chicks from cock chicks the day they hatch.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B8.chicks.daughters · beat 8 (predict)
The daughters, and none of the sons — feedback: A daughter gets her mother’s W, not her Z. Her only Z comes from her black father.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B8.chicks.half · beat 8 (predict)
About half of the sons and half of the daughters — feedback: The hen has just one Z, and every son gets it. Her daughters get her W instead.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B8.chicks.sons · beat 8 (predict)
Every son, and none of the daughters [KEY]
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B8.chicks.all · beat 8 (predict)
All of them: one copy is enough — feedback: One copy is enough, but only the sons receive it. The daughters get no Z from their mother at all.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B9.prompt · beat 9 (match)
Each couple has many children. A recessive version of a gene, like colour blindness, shows only when no working copy covers it; a dominant version shows with just one copy. Sort the couples by which of their children you would expect to show the trait: only sons, only daughters, both, or neither.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B9.explain · beat 9 (match)
Sons take their only X from their mother, so whatever her Xs carry decides theirs. Daughters get their father’s X for certain. A recessive version usually shows in a daughter only with a copy from each parent; a dominant one shows with one copy, so an affected father passes a dominant condition to every daughter and to no son.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B9.pair.carrier · beat 9 (match)
A woman with one copy of a recessive version on an X, and an unaffected man → Sons
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B9.pair.father · beat 9 (match)
A man with a recessive condition carried on his X, and a woman with no copy → Neither
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B9.pair.domfather · beat 9 (match)
A man with a dominant condition carried on his X, and an unaffected woman → Daughters
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B9.pair.twocopy · beat 9 (match)
A woman with a recessive version on both of her Xs, and an unaffected man → Sons
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B9.pair.mixed · beat 9 (match)
A man with a recessive condition carried on his X, and a woman with one copy → Both
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B9.pair.dommother · beat 9 (match)
A woman with one copy of a dominant version on an X, and an unaffected man → Both
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### B10.idea · beat 10 (payoff)
A son’s only X comes from his mother, and a father’s X goes to every daughter. One colour-blind copy is enough in a man, while a woman needs two. That is why red-green colour blindness is far more common in men.
Cites: Wikipedia: Color blindness; Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage; Wikipedia: John Dalton; Wikipedia: Ishihara test; Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system; Wikipedia: Sex-link; Wikipedia: Abraxas grossulariata; Wikipedia: X-linked hypophosphatemia; FlyBase FBgn0053196: dumpy (dpy), D. melanogaster gene report (FB2026_03); FlyBase FBal0002834: dpy[ov1] (dumpy oblique vortex) allele report (FB2026_03)

### R1.f1 · reel sex-linked-daltons-eye
In 1794 the chemist John Dalton made the first scientific study of colour blindness. The case he studied was his own.
Cites: Wikipedia: John Dalton

### R1.f2 · reel sex-linked-daltons-eye
He wrote that orange, yellow and green looked to him like one colour, running from a strong yellow to a faint one.
Cites: Wikipedia: John Dalton

### R1.f3 · reel sex-linked-daltons-eye
His brother was colour-blind too, so Dalton decided it ran in families. He guessed a fluid inside his eye was tinted.
Cites: Wikipedia: John Dalton; Wikipedia: Color blindness

### R1.f4 · reel sex-linked-daltons-eye
In 1995 a genetic study of his preserved eye found the real cause. He lacked the gene for the green-sensing pigment, a gene that sits on the X chromosome.
Cites: Wikipedia: John Dalton; Wikipedia: Color blindness

### R1.f5 · reel sex-linked-daltons-eye
A man has just one X, so one missing or faulty copy is enough. That is why far more men than women are red-green colour-blind.
Cites: Wikipedia: Color blindness

### R1.prediction · reel sex-linked-daltons-eye
John Dalton could not tell some reds from greens, and he blamed a tinted fluid inside his eyeball. What did tests on his preserved eye find? [KEY: A missing gene]
Cites: Wikipedia: John Dalton

### R1.takeaway · reel sex-linked-daltons-eye
Dalton’s colour blindness came from a gene missing on his single X, with no second X to cover for it.
Cites: Wikipedia: John Dalton; Wikipedia: Color blindness

### R2.f1 · reel sex-linked-white-eyed-fly
In 1910, in his fly room at Columbia University, Thomas Hunt Morgan noticed one male fruit fly with white eyes among the usual red-eyed ones.
Cites: Wikipedia: Thomas Hunt Morgan

### R2.f2 · reel sex-linked-white-eyed-fly
He mated it with a red-eyed female, and every one of their young had red eyes.
Cites: Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701

### R2.f3 · reel sex-linked-white-eyed-fly
Mated with each other, those young gave about three red-eyed flies to every white-eyed one. Every white-eyed fly was male.
Cites: Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701

### R2.f4 · reel sex-linked-white-eyed-fly
Morgan’s answer: the eye-colour gene rides on the X chromosome. A male fly has one X; a female has two.
Cites: Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701

### R2.f5 · reel sex-linked-white-eyed-fly
It was strong early evidence that genes sit on chromosomes, part of the work that won Morgan the Nobel Prize in 1933.
Cites: Wikipedia: Thomas Hunt Morgan

### R2.prediction · reel sex-linked-white-eyed-fly
In 1910 Thomas Hunt Morgan found a single white-eyed male fly and mated it with a red-eyed female. What were their young like? [KEY: All red-eyed]
Cites: Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701

### R2.takeaway · reel sex-linked-white-eyed-fly
A gene on the X shows up differently in males and females, because males carry one X and females two.
Cites: Wikipedia: Thomas Hunt Morgan; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701

### I.i_rr1f6h8psm · check item (choice)
A woman sees colours normally, but her father was red-green colour-blind. She has a son with a man who sees normally. What is the chance the son is colour-blind? [KEY: One in two] Other options: No chance: his father sees normally | One in four | Certain: it passes from grandfather to grandson
    Claim: A son of a carrier mother has a one-in-two chance of inheriting her colour-blind copy, whatever his father’s vision.
    Explain: Her father gave her his only X, so she carries one colour-blind copy. Her son gets one of her two Xs at random and nothing from his father to cover it: a one-in-two chance. One in four is the chance for a child before you know whether it is a son or a daughter.
Cites: Wikipedia: X-linked recessive inheritance; Wikipedia: Sex linkage

### I.i_0h4rq7qdbf · check item (choice)
Why are red-green colour-blind women so much rarer than colour-blind men? [KEY: A woman needs a colour-blind copy on both of her Xs] Other options: Female hormones protect the cones of the eye | The colour-blind gene sits on the Y chromosome | It is dominant in men and recessive in women
    Claim: Colour-blind women are rare because a woman needs a colour-blind copy on both Xs, one from each parent.
    Explain: A man’s single X decides his colour vision, so one copy is enough. A woman has two Xs, and a working copy on either one covers for a colour-blind copy on the other. She shows it only with a copy from each parent, which is much rarer.
Cites: Wikipedia: Color blindness

### I.i_fqra3q52fj · check item (flaw)
Which step in this reasoning breaks? (a) John Dalton was red-green colour-blind, and his brother was colour-blind too. (b) Red-green colour blindness comes from a copy of a gene on the X chromosome. (c) So the brothers must have inherited it from their father. (d) Their mother could have seen colours normally. [BROKEN: c]
    Claim: A son with red-green colour blindness got his colour-blind copy from his mother, not his father.
    Explain: A son gets his father’s Y and his mother’s X, so John’s red-green colour-blind copy can only have come from his mother. She could still see normally if her other X carried a working copy: she was most likely a carrier.
Cites: Wikipedia: John Dalton; Wikipedia: X-linked recessive inheritance

### I.i_g58jh8nrx6 · check item (number)
Picture many couples in which the woman carries one colour-blind copy and sees normally, and the man sees normally. Between them they have 48 children. About how many would you expect to be colour-blind? → computed answer 12 children
    Claim: A carrier mother and a father who sees normally have colour-blind children about one time in four, all of them sons.
    Explain: Daughters get their father’s working X, so none is colour-blind. Each son gets one of his mother’s two Xs, so half the sons are. Half of a half: about a quarter of all the children.
Cites: Wikipedia: Sex linkage

### I.i_kw5jb79c1a · check item (order)
Put Morgan’s Drosophila experiment in order, from the first find to the result. A single white-eyed male turns up among red-eyed flies → He is mated with a red-eyed female → All of their young have red eyes → Those young are mated with each other → White eyes come back, but only in males
    Claim: Morgan’s white-eye cross: a white-eyed male × red-eyed female gives red-eyed young, and their young include white-eyed males only.
    Explain: The white-eyed male passed his X to every daughter, who carried it hidden behind a red-eye copy. Those daughters passed it on to about half their sons, the only flies with no second X to cover it.
Cites: Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Thomas Hunt Morgan

### I.i_8s6fqf8rfw · check item (choice)
Morgan also mated a white-eyed Drosophila female with a red-eyed male. What were their young like? [KEY: Red-eyed daughters and white-eyed sons] Other options: All red-eyed, as in the first cross | Half white-eyed, among sons and daughters alike | All white-eyed, like their mother
    Claim: A white-eyed female fly mated with a red-eyed male gives red-eyed daughters and white-eyed sons.
    Explain: Both of the mother’s Xs carry white, so every son, whose only X is hers, has white eyes. Every daughter also gets her father’s red-eye X, which covers for the white one. Morgan called it criss-cross inheritance.
Cites: Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701

### I.i_jnfmbffbwv · check item (choice)
In the magpie moth, females have one Z chromosome and males two. A pale form, lacticolor, comes from a recessive version of a gene on the Z. A lacticolor male is mated with a typical female. What are their young? [KEY: Lacticolor daughters and typical sons] Other options: All typical, sons and daughters | Typical daughters and lacticolor sons | Half lacticolor among sons and daughters alike
    Claim: In a ZW species each of a male’s young gets one of his two Zs, but a female’s single Z goes only to her sons.
    Explain: A daughter’s only Z comes from her father, and both of his carry lacticolor, so every daughter is pale. Each son also gets his mother’s typical Z, which covers for the pale one. This is the moth that first showed sex-linked inheritance.
Cites: Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Abraxas grossulariata

### I.i_wmj3a7kmza · check item (choice)
X-linked hypophosphataemia (XLH) is a form of rickets caused by a version of a gene on the X chromosome, and one copy is enough to cause it. A man with XLH has children with a woman who does not have it. Which of them can inherit it from him? [KEY: Every daughter, and no son] Other options: Every son, and no daughter | About half of the sons and half of the daughters | None: it skips a generation
    Claim: A father with an X-linked dominant condition passes it to every daughter and to no son.
    Explain: Each daughter gets her father’s only X, so every one inherits XLH, and one copy is enough to cause it. Each son gets his father’s Y instead, so none can inherit it from him.
Cites: Wikipedia: X-linked hypophosphatemia; Wikipedia: Sex linkage

### I.i_s9nh8qkwps · check item (choice)
A woman with XLH, a dominant condition from one copy of a gene on one of her X chromosomes, has children with a man who does not have it. Which of her children would you expect to have XLH? [KEY: About half of her sons and half of her daughters] Other options: Every one of her sons, and none of her daughters | Every one of her daughters, and none of her sons | All of her children, sons and daughters alike
    Claim: A mother with one copy of an X-linked dominant allele passes it to about half her children of either sex.
    Explain: Every child gets one of her two Xs at random, so about half of them get the XLH copy, sons and daughters alike, and one copy is enough. The father’s X or Y adds nothing either way.
Cites: Wikipedia: Sex linkage; Wikipedia: X-linked hypophosphatemia

### I.i_133bb5ry6t · check item (choice)
A Y-linked trait comes from a gene that sits only on the Y chromosome. A man has such a trait. Which of his children will inherit it? [KEY: Every son, and no daughter] Other options: Every daughter, and no son | About half of his children, of either sex | None: it waits for the next generation
    Claim: A gene found only on the Y chromosome passes from a father to all his sons and to none of his daughters.
    Explain: Every son gets his father’s Y, and no daughter does. So a Y-linked trait passes from father to son, generation after generation, and never to a daughter.
Cites: Wikipedia: Sex linkage

### I.i_e15sn2hxhq · check item (choice)
Black sex-link chicks come from a Rhode Island Red cock and a Barred Rock hen. Barring sits on the Z chromosome; a hen has one Z and a cock two. Farmers sort these chicks by sex the day they hatch. Why does that work? [KEY: Only the cockerels get their mother’s Z, which carries barring] Other options: Cockerels hatch heavier, and heavier chicks look barred | Only the pullets get their mother’s Z, which carries barring | Barring needs male hormones, so it shows only in cockerels
    Claim: A barred hen’s single Z goes to every son, so in a black sex-link cross the cockerels carry barring and the pullets do not, and the two can be told apart the day they hatch.
    Explain: A hen has a single Z, and it goes to her sons; her daughters get her W. So every cockerel carries his mother’s barring and grows up barred, while every pullet takes a plain Z from her father. The two can be told apart the day they hatch.
Cites: Wikipedia: Sex-link; Wikipedia: ZW sex-determination system; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701

### I.i_q4y7wwfrh2 · check item (number)
Picture many families in which the father has XLH, a dominant condition carried on the X chromosome, and the mother does not. Between them they have 64 children. About how many of the 64 would you expect to be daughters with XLH? → computed answer 32 children
    Claim: A father with an X-linked dominant condition and an unaffected mother have affected children about half the time: all the daughters.
    Explain: Every daughter gets her father’s X with its XLH copy, and one copy is enough, so every daughter has XLH. No son gets his father’s X. Daughters are about half of all the children.
Cites: Wikipedia: Sex linkage; Wikipedia: X-linked hypophosphatemia

### I.i_4006aj9761 · check item (number)
In the magpie moth, females have one Z chromosome and males two. Typical-looking males that each carry one hidden lacticolor copy on a Z are mated with typical females. Out of 80 young, about how many would you expect to be pale lacticolor moths? → computed answer 20 moths
    Claim: Typical male magpie moths carrying one lacticolor copy, mated with typical females, give lacticolor young about one time in four, all of them female.
    Explain: Every son gets his mother’s typical Z, which covers for anything his father gives him. Each daughter’s only Z comes from her father, and half the time it is the lacticolor one. Half of the daughters: about a quarter of all the young.
Cites: Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Abraxas grossulariata

### I.i_m1h9egrws7 · check item (number)
Black Langshan hens mated with barred Plymouth Rock cocks give chicks that all grow up barred. Barring sits on the Z chromosome; a hen has one Z and a cock two. Those barred young are mated with each other. Out of 64 of their chicks, about how many would you expect to grow into black hens? → computed answer 16 chicks
    Claim: Barred cocks carrying one hidden black copy, mated with barred hens, give black chicks about one time in four, every one of them a hen.
    Explain: Each young cock got a barred Z from his father and a black Z from his mother; each young hen got her father’s barred Z and her mother’s W. In the next generation every son gets his mother’s barred Z, so all the sons are barred. Each daughter’s only Z comes from her father, barred or black at even odds. Half the daughters, about a quarter of all the chicks, are black hens.
Cites: Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: ZW sex-determination system

### C.c_s0h4bevghh · case 1 (cross engine; hash cfa85a2736b1: copy it into the verdict as "caseHash")
Black-and-white toms. A cat’s orange-or-black gene is on the X chromosome. A tom (male) has one X; a cat with one copy of each is tortoiseshell. One copy of a gene on another chromosome gives white patches. Picture 192 kittens of black-and-white females and orange-and-white toms, from families with no other colours. Each of those parents had one parent with no white. How many will be black-and-white toms?
    Set "Black-and-white toms" from 0 to 192; the engine computes 72, and calls within 5 win
    Model the engine runs: {"engine":"cross","locus":{"O":1,"o":1,"Y":1},"parents":["oo","OY"],"traits":{"Oo":"Tortoiseshell female","Yo":"Black tom"},"cross":"black-and-white females and orange-and-white toms","parentLabels":["Black-and-white female","Orange-and-white tom"],"who":{"one":"kitten","many":"kittens"},"count":192,"focus":"Yo|S","measure":"count","second":{"sex":"Y","locus":{"S":1,"s":0},"parents":["Ss","Ss"],"traits":{"S":"White patches","s":"No white"},"classes":{"Yo|S":"Black-and-white toms","Yo|s":"All-black toms","Oo|S,Oo|s":"Tortoiseshell females"}}}
    Computed after the run: Black-and-white females and orange-and-white toms: black-and-white toms in 3 of every 8 kittens, about 72 of 192. Each gene is dealt separately: black tom in half the kittens, and white patches in 3 of every 4 of those. This run had 73.
    Reveal: About 72: three kittens in every eight. A tom’s one X comes from his mother, and both of hers are black, so every tom is black, whatever his father’s colour. Every female gets her father’s orange X beside a black one, so all the females are tortoiseshell. White is dealt separately: each parent hides one copy without white, so three kittens in four get at least one white-patch copy. Half the kittens are toms, and three in four of them have white.
    Claim: A son’s one X comes from his mother, so an X-linked colour in sons follows her alone, while a gene on another chromosome is dealt separately: the two shares multiply.
Cites: Wikipedia: Cat coat genetics; Wikipedia: Sex linkage; Wikipedia: X-linked recessive inheritance

### C.c_envk6ee2y1 · case 2 (cross engine; hash 9ae7d1712f95: copy it into the verdict as "caseHash")
Orange-and-white kittens. A cat’s orange-or-black gene is on the X chromosome. A tom (male) has one X; a cat with one copy of each is tortoiseshell. One copy of a gene on another chromosome gives white patches. Picture 384 kittens of tortoiseshell females with no white and black-and-white toms, from families with no other colours. Each tom had one parent with no white. How many will be orange-and-white kittens?
    Set "Orange-and-white kittens" from 0 to 384; the engine computes 48, and calls within 6 win
    Model the engine runs: {"engine":"cross","locus":{"O":1,"o":1,"Y":1},"parents":["Oo","oY"],"traits":{"Oo":"Tortoiseshell female","o":"Black female","OY":"Orange tom","Yo":"Black tom"},"cross":"tortoiseshell females with no white and black-and-white toms","parentLabels":["Tortoiseshell female, no white","Black-and-white tom"],"who":{"one":"kitten","many":"kittens"},"count":384,"focus":"OY|S","measure":"count","second":{"sex":"Y","locus":{"S":1,"s":0},"parents":["ss","Ss"],"traits":{"S":"White patches","s":"No white"},"classes":{"OY|S":"Orange-and-white toms","OY|s":"All-orange toms","Yo|S,Yo|s":"Black toms","Oo|S,Oo|s":"Tortoiseshell females","o|S,o|s":"Black females"}}}
    Computed after the run: Tortoiseshell females with no white and black-and-white toms: orange-and-white toms in 1 of every 8 kittens, about 48 of 384. Each gene is dealt separately: orange tom in 1 of every 4 kittens, and white patches in half of those. This run had 50.
    Reveal: About 48: one kitten in eight. Every female gets her father’s X, and his is black, so no female is orange: each is tortoiseshell or black. A tom’s one X comes from his mother, so half the toms get her orange X and are orange. White is dealt separately: the mother has no white-patch copy and the father has one, so half the kittens get it. Half the kittens are toms, half of those are orange, and half of those have white.
    Claim: A daughter always gets her father’s X and a son his mother’s, so a black tom has no orange daughters, and a tortoiseshell female’s sons are orange half the time; a gene on another chromosome is dealt separately, and the shares multiply.
Cites: Wikipedia: Cat coat genetics; Wikipedia: Sex linkage; Wikipedia: X-linked recessive inheritance

### C.c_exsm0wnbs6 · case 3 (cross engine; hash 9ba0becf13e8: copy it into the verdict as "caseHash")
Hens that aren’t green. Green budgerigars have yellow pigment over blue. Blue, a recessive gene on an ordinary chromosome, removes the yellow. Ino, recessive and on the Z chromosome, removes the blue: the bird turns yellow, or white if also blue. A hen has one Z, a cock two. Picture 320 chicks of green cocks hiding ino and blue, and green hens hiding blue. How many will be hens that aren’t green?
    Set "Hens that aren’t green" from 0 to 320; the engine computes 100, and calls within 3 win
    Model the engine runs: {"engine":"cross","locus":{"N":2,"i":1,"W":2},"parents":["Ni","NW"],"traits":{"N":"Cock","NW":"Hen without ino","W":"Ino hen"},"cross":"green cocks hiding ino and blue, and green hens hiding blue","parentLabels":["Green cock hiding ino and blue","Green hen hiding blue"],"who":{"one":"chick","many":"chicks"},"count":320,"focus":"NW|b,W|B,W|b","measure":"count","second":{"sex":"W","locus":{"B":1,"b":0},"parents":["Bb","Bb"],"traits":{"B":"Yellow pigment","b":"Blue"},"classes":{"NW|b,W|B,W|b":"Hens that aren’t green","NW|B":"Green hens","N|B":"Green cocks","N|b":"Blue cocks"}}}
    Computed after the run: Green cocks hiding ino and blue, and green hens hiding blue: hens that aren’t green in 5 of every 16 chicks, about 100 of 320. Hen without ino and blue in 1 of every 16, ino hen and yellow pigment in 3 of every 16, and ino hen and blue in 1 of every 16. This run had 99.
    Reveal: About 100: five chicks in every sixteen. Every cock gets his mother’s Z, and hers is normal, so no cock shows ino. A hen’s only Z comes from her father, so half the hens are ino: yellow if they have yellow pigment, white if they don’t. The other half look as usual, and a quarter of those get a blue copy from each parent and are blue. Half the hens, plus a quarter of the other half, is five hens in eight.
    Claim: A hen’s single Z comes from her father, so a Z-linked recessive he hides shows in half his daughters, and a gene on another chromosome is dealt separately on top of it.
Cites: Wikipedia: Ino budgerigar mutation; Wikipedia: Blue budgerigar mutation; Wikipedia: Budgerigar colour genetics; Wikipedia: ZW sex-determination system

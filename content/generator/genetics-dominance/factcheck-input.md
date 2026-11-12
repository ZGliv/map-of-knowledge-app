# Adversarial fact-check: Blue won’t breed true (genetics-dominance)

You are an independent checker. You did not write this content. Your job is to BREAK it: for every
unit below, look for the claim being wrong, overstated, missing a qualifier, unsupported by the
cited source, or a quote that differs from the pinned edition by even one word. Default to
suspicion; "supported" needs a sentence you can point to.

Sources (pinned; cached text in content/generator/genetics-dominance/sources/<file>.json, field "text"):
- Wikipedia: Dominance (genetics) · https://en.wikipedia.org/w/index.php?title=Dominance_(genetics)&oldid=1380420266 · file: sources/Wikipedia_Dominance_genetics_.json
- Wikipedia: Mirabilis jalapa · https://en.wikipedia.org/w/index.php?title=Mirabilis_jalapa&oldid=1376309656 · file: sources/Wikipedia_Mirabilis_jalapa.json
- Wikipedia: Carl Correns · https://en.wikipedia.org/w/index.php?title=Carl_Correns&oldid=1371977748 · file: sources/Wikipedia_Carl_Correns.json
- Wikipedia: Blue Andalusian · https://en.wikipedia.org/w/index.php?title=Blue_Andalusian&oldid=1365126811 · file: sources/Wikipedia_Blue_Andalusian.json
- Wikipedia: Huntington's disease · https://en.wikipedia.org/w/index.php?title=Huntington's_disease&oldid=1380617788 · file: sources/Wikipedia_Huntington_s_disease.json
- Wikipedia: Sickle cell disease · https://en.wikipedia.org/w/index.php?title=Sickle_cell_disease&oldid=1380369992 · file: sources/Wikipedia_Sickle_cell_disease.json
- Wikipedia: Roan (color) · https://en.wikipedia.org/w/index.php?title=Roan_(color)&oldid=1363022789 · file: sources/Wikipedia_Roan_color_.json
- Wikipedia: Polydactyly · https://en.wikipedia.org/w/index.php?title=Polydactyly&oldid=1379019890 · file: sources/Wikipedia_Polydactyly.json
- Wikipedia: Achondroplasia · https://en.wikipedia.org/w/index.php?title=Achondroplasia&oldid=1379134417 · file: sources/Wikipedia_Achondroplasia.json
- Wikipedia: Antirrhinum majus · https://en.wikipedia.org/w/index.php?title=Antirrhinum_majus&oldid=1342296978 · file: sources/Wikipedia_Antirrhinum_majus.json
- Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701 · https://www.gutenberg.org/ebooks/30701 · file: sources/Morgan_A_Critique_of_the_Theory_of_Evolution_1916_Project_Gutenberg_30701.json
- Wikipedia: Cream gene · https://en.wikipedia.org/w/index.php?title=Cream_gene&oldid=1345474412 · file: sources/Wikipedia_Cream_gene.json
- Wikipedia: Polydactyl cat · https://en.wikipedia.org/w/index.php?title=Polydactyl_cat&oldid=1375883890 · file: sources/Wikipedia_Polydactyl_cat.json
- Wikipedia: Familial hypercholesterolemia · https://en.wikipedia.org/w/index.php?title=Familial_hypercholesterolemia&oldid=1354857074 · file: sources/Wikipedia_Familial_hypercholesterolemia.json
- Wikipedia: MNS antigen system · https://en.wikipedia.org/w/index.php?title=MNS_antigen_system&oldid=1379199133 · file: sources/Wikipedia_MNS_antigen_system.json
Fact sheet with numbered sentences: content/generator/genetics-dominance/factsheet.md

For each unit write one entry to content/generator/genetics-dominance/factcheck.json:
{ "id": "<unit id>", "verdict": "supported" | "imprecise" | "unsupported" | "wrong" | "quote-mismatch",
  "evidence": "[W4.19] or a short quote from the source", "note": "what is wrong, if anything", "fix": "the smallest wording change that would make it right" }
Top level: { "checker": "<who you are>", "checkedAt": "<ISO time>", "units": [ … ] }.
Teaching simplifications are fine if they are true; say "imprecise" when a qualifier is missing.
Computed answers are produced by code from the stated rules; check that the rule and the setup are right.

## Units (95)

### P1 · provenance claim
The Blue Andalusian is a Spanish breed of chicken; its slate-blue plumage comes from a dilution gene: no copies give black, one copy gives blue, two copies give near-white; blue birds occur, in Mendelian proportion, twice as often as each other colour
Cites: Wikipedia: Blue Andalusian

### P2 · provenance claim
Morgan’s account of the Andalusian (verbatim, as quoted): blue birds do not breed true; they are hybrids of white and black germ cells; white × black (both pure) gives all blue; blues inbred give 1 white to 2 blue to 1 black; the factors separate in the germ cells; figs. 13, 15 and 16
Cites: Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701

### P3 · provenance claim
Incomplete dominance: the heterozygote is distinct from and often intermediate to both homozygotes; red × white snapdragons give pink; four o’clocks the same; F2 of pink plants 1:2:1 red:pink:white
Cites: Wikipedia: Dominance (genetics)

### P4 · provenance claim
Co-dominance: both alleles’ contributions are visible; IA and IB are co-dominant, so IAIB people have both modifications on their blood cells (type AB); sickle-cell trait is milder than sickle-cell anemia, so the alleles show incomplete dominance for anemia
Cites: Wikipedia: Dominance (genetics)

### P5 · provenance claim
Complete dominance in Mendel’s peas: round masks wrinkled (Rr is round); crossing tall with short gives tall
Cites: Wikipedia: Dominance (genetics)

### P6 · provenance claim
Dominance is a relative effect between two alleles, not a property of one allele; the masking variant is called dominant
Cites: Wikipedia: Dominance (genetics)

### P7 · provenance claim
Correns independently rediscovered Mendel’s principles, published in 1900, and then experimented with the four o’clock Mirabilis jalapa to investigate apparent counterexamples to Mendel’s laws
Cites: Wikipedia: Carl Correns

### P8 · provenance claim
Around 1900 Correns used Mirabilis as a model organism; dark-pink × white four o’clocks give light-pink offspring, an exception to dominance called incomplete dominance
Cites: Wikipedia: Mirabilis jalapa

### P9 · provenance claim
Roan cattle (Shorthorn, Belgian Blue): one functional and one non-functional MGF copy gives a roughly even mixture of white and coloured regions; two functional copies give full colour, none give white; roan cattle cannot breed true, and white bred to a solid mate always gives a roan calf
Cites: Wikipedia: Roan (color)

### P10 · provenance claim
Huntington’s disease has autosomal dominant inheritance; one copy of the mutant allele is enough; worldwide prevalence 5–10 per 100,000; described in 1872 by the American physician George Huntington; used around 1900 as an early example of dominant inheritance in people
Cites: Wikipedia: Huntington's disease

### P11 · provenance claim
Two copies of the sickle allele cause sickle cell disease; carriers with one copy (sickle cell trait) usually have no symptoms and have a survival advantage against malaria, which keeps the allele common where malaria was endemic
Cites: Wikipedia: Sickle cell disease

### P12 · provenance claim
The MN blood group is controlled by a pair of co-dominant alleles; a person may show either one or both antigens
Cites: Wikipedia: MNS antigen system

### B1.hook · beat 1 (cover)
Mate two blue Andalusian chickens and only about half of their chicks come out blue. The rest are black or white. Breeders have known it for well over a century. Why can’t blue breed true?
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B2.goal · beat 2 (sim)
One gene sets the colour of an Andalusian’s feathers. Predict each brood, then hatch it: every chick gets one copy from each parent, picked at random.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B2.f1.ask · beat 2 (sim)
Both birds come from lines that always breed true: black from black, white from white. What will their chicks look like?
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B2.f1.mix · beat 2 (sim)
Some black chicks and some white ones — feedback: That needs a parent carrying both versions. Each of these parents carries only one kind, so every chick gets one of each.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B2.f1.black · beat 2 (sim)
All black, because black is stronger — feedback: Here neither version hides the other. A chick with one black-making and one white-making copy shows something new.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B2.f1.blue · beat 2 (sim)
All blue [KEY]
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B2.f1.grey · beat 2 (sim)
Grey at first, turning white as they grow — feedback: The colour is set by the copies a chick inherits. Every chick here inherits one copy of each.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B2.f1.explain · beat 2 (sim)
Every chick is blue. Each got a black-making copy from one parent and a white-making copy from the other, and one of each makes slate blue. Neither copy masks the other: this is called incomplete dominance.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B2.f2.ask · beat 2 (sim)
Now mate two of the blue birds. What will their chicks be?
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B2.f2.allblue · beat 2 (sim)
All blue, like both parents — feedback: If blue bred true, breeders would keep pure blue lines. Each blue bird still carries a black-making and a white-making copy, and passes on one of them at random.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B2.f2.three · beat 2 (sim)
Three blue to every one white — feedback: Three to one is the pattern when one version hides the other. Here the black-making copy shows too, so black chicks hatch as well.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B2.f2.ratio · beat 2 (sim)
About one black to two blue to one white [KEY]
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B2.f2.paler · beat 2 (sim)
Paler blue chicks, drifting towards white — feedback: That is what blending would predict. The black and white chicks come back as black and as white as their grandparents.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B2.f2.explain · beat 2 (sim)
Black, blue and white chicks hatch, about one to two to one. Two black-making copies give black, two white-making copies give white, one of each gives blue. Blue birds are hybrids, so they can never breed true.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B3.quote1 · beat 3 (source)
QUOTE (must match https://www.gutenberg.org/ebooks/30701 exactly, “…” marks an elision): Another case of the same kind is known to breeders of poultry. One of the most beautiful of the domesticated breeds is known as the Andalusian. It is a slate blue bird shading into blue-black on the neck and back. Breeders know that these blue birds do not breed true but produce white, black, and blue offspring.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B3.quote2 · beat 3 (source)
QUOTE (must match https://www.gutenberg.org/ebooks/30701 exactly, “…” marks an elision): The explanation of the failure to produce a pure race of Andalusians is that they are like the pink flowers of the four o’clock, i.e., they are a hybrid type formed by the meeting of the white and the black germ cells. If the whites produced by the Andalusians are bred to the blacks (both being pure strains), all the offspring will be blue (fig. 15); if these blues are inbred they will give 1 white, to 2 blues, to 1 black. In other words, the factor for white and the factor for black separate in the germ cells of the hybrid Andalusian birds (fig. 16).
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B3.note.true · beat 3 (source)
The breeders’ puzzle: a blue line can’t be kept pure, however carefully blues are mated.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B3.note.hybrid · beat 3 (source)
Morgan’s answer. A blue bird is not a third kind of bird but a meeting of the other two.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B3.note.ratio · beat 3 (source)
The same one to two to one your simulated broods came close to.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B3.note.separate · beat 3 (source)
The factors don’t blend inside the blue bird. Each egg or sperm carries one of them, whole.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B3.q.fade · beat 3 (source)
Blue fades a little in each generation — feedback: Nothing fades: the white and black chicks are as white and as black as the pure strains.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B3.q.hybrid · beat 3 (source)
Blue birds are hybrids [KEY]
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B3.q.hidden · beat 3 (source)
Blue is recessive, hidden inside black birds — feedback: Pure black birds never carry blue. Blue appears only when a white factor meets a black one.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B3.q.crossed · beat 3 (source)
Breeders keep crossing in other breeds — feedback: Morgan puts the reason in the birds themselves: blues are hybrids, so their factors separate again.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B4.frame1 · beat 4 (documentary)
Around 1900 the German botanist Carl Correns, one of the scientists who rediscovered Mendel’s laws, tested apparent exceptions to them on the four o’clock flower, Mirabilis jalapa.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B4.frame2 · beat 4 (documentary)
Cross a four o’clock that has red flowers with one that has white, and the young plants flower pink. Neither colour masks the other.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B4.frame3 · beat 4 (documentary)
Let those pink plants pollinate themselves, and red and white flowers come back: about one red to two pink to one white.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B4.frame4 · beat 4 (documentary)
Morgan drew the same logic for the chickens. Each bird carries two factors, and each egg or sperm gets just one of them. Pink and blue are hybrids, not blends.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B5.prompt · beat 5 (predict)
Shorthorn cattle can be red, white or roan. A white Shorthorn is mated with a solid red one. What will their calf look like?
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B5.explain · beat 5 (predict)
Roan. The calf gets one working copy of a colour gene and one that doesn’t work, and its coat is a fairly even mix of white and coloured areas. Both versions show, side by side: this is called co-dominance. Like blue Andalusians, roan cattle never breed true.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B5.calf.pink · beat 5 (predict)
An even pinkish red all over, halfway between — feedback: That is the in-between pattern of the blue chickens. Here each colour keeps its own areas: white mixed with red.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B5.calf.roan · beat 5 (predict)
Roan: white areas mixed in with red ones [KEY]
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B5.calf.red · beat 5 (predict)
Solid red, because colour wins — feedback: Red doesn’t hide white here. Breeding a white Shorthorn to a solid one always gives a roan calf.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B5.calf.coin · beat 5 (predict)
Either solid red or white, by chance — feedback: Chance picks which copy each parent passes on, but each of these parents has only one kind to give. Every calf gets one of each.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B6.prompt · beat 6 (flaw)
A classmate argues: “Huntington’s disease is caused by a dominant allele, so most people should have it.” Which step breaks?
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B6.explain · beat 6 (flaw)
Dominant describes what one person with two different copies shows. It says nothing about how many people carry the allele. Huntington’s disease is dominant, yet it affects about 5 to 10 people in every 100,000. How common an allele is depends on its history, not on whether it is dominant.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B6.step.a · beat 6 (flaw)
Huntington’s disease is caused by a dominant allele: one copy is enough to cause it.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B6.step.b · beat 6 (flaw)
A dominant allele shows its effect even when the other copy is different.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B6.step.c · beat 6 (flaw)
So a dominant allele must spread until it is the more common version. [THE BROKEN STEP]
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B6.step.d · beat 6 (flaw)
So most people should have Huntington’s disease.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B7.prompt · beat 7 (match)
Each case is a living thing with two different versions of one gene. Sort them by what it shows.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B7.explain · beat 7 (match)
Mendel’s peas show complete dominance: tall and round mask short and wrinkled. Pink snapdragons and sickle-cell carriers are in between. AB and MN blood carry both markers at once, which is co-dominance.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B7.pair.tall · beat 7 (match)
Pea plants: tall crossed with short gives only tall young → One version hides the other
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B7.pair.snap · beat 7 (match)
Snapdragons: red crossed with white gives pink flowers → Something in between
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B7.pair.ab · beat 7 (match)
Blood type AB: red cells carry both the A and the B marker → Both show at once
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B7.pair.round · beat 7 (match)
Pea seeds: round crossed with wrinkled gives only round seeds → One version hides the other
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B7.pair.sickle · beat 7 (match)
Sickle-cell carriers: a far milder condition than with two copies → Something in between
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B7.pair.mn · beat 7 (match)
Blood type MN: red cells carry both the M and the N marker → Both show at once
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B8.prompt · beat 8 (predict)
Two copies of the sickle-cell allele cause a serious blood disease. Yet the allele stayed common in places where malaria was widespread. What best explains that?
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B8.explain · beat 8 (predict)
One copy gives carriers an advantage against dying of malaria; two copies cause sickle cell disease. Where malaria was common, carriers left more children, so the allele stayed common. That is natural selection favouring the carriers.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B8.why.dominant · beat 8 (predict)
It is dominant, so it spreads on its own — feedback: Dominance doesn’t make an allele spread, and this one causes the disease only in two copies. Something has to favour the people who carry it.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B8.why.more · beat 8 (predict)
People with the disease have more children — feedback: The disease shortens lives. On its own, that would make the allele rarer.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B8.why.carriers · beat 8 (predict)
Carriers survive malaria better [KEY]
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B8.why.cause · beat 8 (predict)
Malaria causes the mutation in people who need it — feedback: Mutations aren’t made to order. The allele is inherited; malaria changes who survives to pass it on.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B9.number · beat 9 (number)
Two pink-flowered snapdragons are crossed, and 80 of their seedlings grow up and flower. About how many will have pink flowers? → computed answer 40 plants (2 in every 4 offspring of RW × RW show it. 80 × 2/4 = 40 plants.)
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### B10.idea · beat 10 (payoff)
Dominance is how two different versions of a gene show up together in one body: one hides the other, they meet in between, or both show. It never says which version is better or more common.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Dominance (genetics); Wikipedia: Carl Correns; Wikipedia: Mirabilis jalapa; Wikipedia: Roan (color); Wikipedia: Huntington's disease; Wikipedia: Sickle cell disease; Wikipedia: MNS antigen system

### R1.f1 · reel dominance-blue-wont-breed-true
The Andalusian is a Spanish breed of chicken, kept for its slate-blue feathers.
Cites: Wikipedia: Blue Andalusian

### R1.f2 · reel dominance-blue-wont-breed-true
But blue Andalusians never breed true. Mate two blue birds and the chicks come out blue, black and white.
Cites: Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701

### R1.f3 · reel dominance-blue-wont-breed-true
In 1916 the biologist Thomas Hunt Morgan drew why. Breed a pure black bird to a pure white one, and every chick is blue.
Cites: Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701

### R1.f4 · reel dominance-blue-wont-breed-true
Each blue bird carries one black-making copy and one white-making copy, and passes on only one of them.
Cites: Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Blue Andalusian

### R1.f5 · reel dominance-blue-wont-breed-true
So two blues give about one black chick to two blue to one white. Blue is simply what one copy of each looks like.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701

### R1.prediction · reel dominance-blue-wont-breed-true
A breeder mates two slate-blue chickens of the same breed. What colours will their chicks be? [KEY: Blue, black and white]
Cites: Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701

### R1.takeaway · reel dominance-blue-wont-breed-true
A blue Andalusian is a hybrid, one copy of each version. That is why blue can never breed true.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701

### R2.f1 · reel dominance-rare-but-dominant
In 1872 the American physician George Huntington described a disease that ran through the generations of families.
Cites: Wikipedia: Huntington's disease

### R2.f2 · reel dominance-rare-but-dominant
When Mendel’s laws were rediscovered around 1900, Huntington’s disease became an early example of dominant inheritance in people.
Cites: Wikipedia: Carl Correns; Wikipedia: Huntington's disease

### R2.f3 · reel dominance-rare-but-dominant
Dominant means one copy is enough to show its effect, even when the other copy is different.
Cites: Wikipedia: Dominance (genetics)

### R2.f4 · reel dominance-rare-but-dominant
It says nothing about how common an allele is. Huntington’s disease affects about five to ten people in every hundred thousand.
Cites: Wikipedia: Huntington's disease

### R2.f5 · reel dominance-rare-but-dominant
Dominance is about one body with two different copies. It doesn’t decide how many people carry a version.
Cites: Wikipedia: Dominance (genetics)

### R2.prediction · reel dominance-rare-but-dominant
If one version of a gene is dominant, is it usually the more common version in people? [KEY: No, not necessarily]
Cites: Wikipedia: Huntington's disease

### R2.takeaway · reel dominance-rare-but-dominant
Dominant describes how two copies show up together in one person. It never tells you how common a version is.
Cites: Wikipedia: Huntington's disease; Wikipedia: Carl Correns; Wikipedia: Dominance (genetics)

### I.i_5azenc8zr1 · check item (choice)
A blue Andalusian hen is mated with a black Andalusian cock. What chicks should they produce? [KEY: About half blue and half black] Other options: All blue chicks | All black chicks, because black is stronger | Blue, black and white chicks in equal numbers
    Claim: A blue Andalusian (one copy of each version) mated with a black one gives about half blue and half black chicks.
    Explain: The black parent can only pass on a black-making copy. The blue parent passes on black-making or white-making at random. So each chick is black (two black-making copies) or blue (one of each), about half and half. No chick can be white.
Cites: Wikipedia: Blue Andalusian; Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701

### I.i_j21dk3ymk2 · check item (choice)
White Andalusians mated with each other give only white chicks, generation after generation. Why do they breed true when blue birds don’t? [KEY: Each white bird has two white-making copies, so that is all it can pass on] Other options: White is the stronger colour and always wins | White birds were bred longer, so their colour is fixed | They don’t: white birds also give black and blue chicks
    Claim: White Andalusians carry two white-making copies, so white bred to white gives only white chicks.
    Explain: A bird with two copies of the same version can only pass on that version, so white bred to white stays white, and black bred to black stays black. Blue birds carry one of each, which is why their broods split.
Cites: Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701; Wikipedia: Blue Andalusian

### I.i_mjxmpfh3dj · check item (order)
Put the steps of the Andalusian cross in order, from the pure lines to the mixed brood. A pure black bird is mated with a pure white one → Every chick of that brood is blue → Two of those blue birds are mated together → Black, blue and white chicks hatch
    Claim: Pure black × pure white gives all blue; two blues then give black, blue and white chicks.
    Explain: Pure lines carry two copies of one version, so their cross gives hybrids with one of each: blue. Hybrids pass on either copy at random, so their brood splits into black, blue and white, about one to two to one.
Cites: Morgan, A Critique of the Theory of Evolution (1916), Project Gutenberg #30701

### I.i_k7wq7v9pr8 · check item (flaw)
Which step in this reasoning breaks? (a) Huntington’s disease is caused by a dominant allele. (b) An affected parent usually has one copy of that allele and one typical copy. (c) Each child gets one of that parent’s two copies, picked at random. (d) So every child of that parent will inherit the allele. [BROKEN: d]
    Claim: A parent with one copy of a dominant allele passes it to each child with a one-in-two chance, not to every child.
    Explain: Each child gets one of the parent’s two copies at random, so each child has a one-in-two chance of inheriting the allele, not a certainty. Dominant means one copy is enough to cause the disease, not that the copy is always passed on.
Cites: Wikipedia: Huntington's disease; Wikipedia: Dominance (genetics)

### I.i_zz88ews23z · check item (number)
Two blue Andalusians are mated again and again until 48 chicks have hatched. About how many of those chicks would you expect to be blue? → computed answer 24 chicks
    Claim: Two blue Andalusians give about half blue chicks: two of every four.
    Explain: Each blue parent passes on a black-making or a white-making copy at random. Of the four equally likely pairs, two are one of each, which makes blue. So about half the chicks are blue.
Cites: Wikipedia: Blue Andalusian

### I.i_s8tsskrt9j · check item (choice)
A roan Shorthorn cow is mated with a white Shorthorn bull. What calves can they have? [KEY: Roan or white calves, about half each] Other options: Only roan calves | Only white calves | Red, roan and white calves, about one to two to one
    Claim: Roan × white Shorthorns give roan or white calves, about half each.
    Explain: The white bull can only pass on a non-working copy of the colour gene. The roan cow passes on a working or a non-working copy at random. So each calf is roan (one of each) or white (two non-working), about half and half.
Cites: Wikipedia: Roan (color)

### I.i_33byqznrdq · check item (choice)
In horses, one copy of the cream allele turns a chestnut coat golden palomino; two copies give a pale cremello. Two palomino horses are mated. Which foals can they have? [KEY: Chestnut, palomino or cremello foals] Other options: Only palomino foals | Only chestnut or cremello foals | Foals a shade paler with each generation
    Claim: Palomino (one cream copy) is in between chestnut and cremello, so two palominos can have chestnut, palomino or cremello foals.
    Explain: Each palomino carries one cream copy and one without, and passes on either at random: no cream copies gives chestnut, one gives palomino, two give cremello. That is why palomino can never breed true.
Cites: Wikipedia: Cream gene

### I.i_1bzammxx0k · check item (choice)
Breeders of polydactyl cats, which have extra toes, often mate a polydactyl cat with a normal-toed one and still get many polydactyl kittens. Why does that work? [KEY: Extra toes are dominant: one copy is enough] Other options: Extra toes are recessive, so they skip a generation | The normal-toed parent secretly carries extra toes | Kittens get extra toes only with two copies
    Claim: One copy of a dominant allele is enough to show its effect, so a polydactyl parent can pass extra toes to kittens of a normal-toed partner.
    Explain: Polydactyly in cats is inherited dominantly. A kitten needs just one copy from one parent to have extra toes, so a single polydactyl parent is enough to give polydactyl kittens.
Cites: Wikipedia: Polydactyl cat

### I.i_rx7w8emcmz · check item (choice)
Achondroplasia, the most common cause of dwarfism, is inherited as a dominant trait. Yet about 80% of children with it are born to parents of average height. What explains that? [KEY: A new mutation arose in a parent’s sperm or egg] Other options: Both parents carried a hidden copy that skipped them | Dominant traits often skip a generation | It came straight from a grandparent
    Claim: A dominant condition can appear in a child of two unaffected parents through a new mutation.
    Explain: Most cases come from a new mutation, usually arising as sperm are made. One changed copy is enough to cause the condition, so a child can have it although neither parent does.
Cites: Wikipedia: Achondroplasia

### I.i_r6hh6qd5tw · check item (choice)
In familial hypercholesterolemia, people with one faulty copy of the gene typically have total cholesterol of 350–550 mg/dL; people with two faulty copies, 650–1,000. Which pattern is this? [KEY: Incomplete dominance: one copy acts part of the way] Other options: Complete dominance: one copy acts like two | Recessive: one copy has no effect | Co-dominance: two separate products side by side
    Claim: When one copy has a partial effect and two copies a stronger one, the pattern is incomplete dominance.
    Explain: One faulty copy raises cholesterol a lot; two raise it far more. The one-copy level sits between the two, so neither version fully masks the other: incomplete dominance.
Cites: Wikipedia: Familial hypercholesterolemia

### I.i_e3esjq87a9 · check item (number)
Two palomino horses, each with one cream copy, have 20 foals between them over the years. About how many of those foals would you expect to be palomino? → computed answer 10 foals
    Claim: Two palominos give palomino foals about half the time.
    Explain: Each palomino parent passes on its cream copy or its other copy at random. Two of the four equally likely pairs are one of each, which makes palomino, so about half the foals are palomino.
Cites: Wikipedia: Cream gene

### I.i_408g0fk3v2 · check item (number)
A polydactyl cat with one copy of the extra-toe allele is mated with a normal-toed cat. Over several litters 24 kittens are born. About how many would you expect to have extra toes? → computed answer 12 kittens
    Claim: A parent with one copy of a dominant allele mated with a non-carrier passes the trait to about half the young.
    Explain: The polydactyl parent passes on its extra-toe copy or its typical copy at random; the other parent can only pass on a typical copy. So about half the kittens get the extra-toe copy, and one copy is enough.
Cites: Wikipedia: Polydactyl cat

### I.i_671k8hxbvp · check item (number)
Belgian Blue cattle can be roan, with one working and one non-working copy of a colour gene. A herd of roan cows mated with roan bulls produces 40 calves. About how many would you expect to be white? → computed answer 10 calves
    Claim: Two roan cattle give white calves about a quarter of the time.
    Explain: Each roan parent passes on a working or a non-working copy at random. Only one of the four equally likely pairs is two non-working copies, which gives a white calf: about a quarter.
Cites: Wikipedia: Roan (color)

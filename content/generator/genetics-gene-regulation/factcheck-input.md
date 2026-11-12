# Adversarial fact-check: Same genes, different cells (genetics-gene-regulation)

You are an independent checker. You did not write this content. Your job is to BREAK it: for every
unit below, look for the claim being wrong, overstated, missing a qualifier, unsupported by the
cited source, or a quote that differs from the pinned edition by even one word. Default to
suspicion; "supported" needs a sentence you can point to.

Sources (pinned; cached text in content/generator/genetics-gene-regulation/sources/<file>.json, field "text"):
- Wikipedia: Regulation of gene expression · https://en.wikipedia.org/w/index.php?title=Regulation_of_gene_expression&oldid=1381573041 · file: sources/Wikipedia_Regulation_of_gene_expression.json
- Wikipedia: Cellular differentiation · https://en.wikipedia.org/w/index.php?title=Cellular_differentiation&oldid=1381607119 · file: sources/Wikipedia_Cellular_differentiation.json
- Wikipedia: John Gurdon · https://en.wikipedia.org/w/index.php?title=John_Gurdon&oldid=1380372788 · file: sources/Wikipedia_John_Gurdon.json
- Wikipedia: Dolly (sheep) · https://en.wikipedia.org/w/index.php?title=Dolly_(sheep)&oldid=1373207102 · file: sources/Wikipedia_Dolly_sheep_.json
- Wikipedia: Induced pluripotent stem cell · https://en.wikipedia.org/w/index.php?title=Induced_pluripotent_stem_cell&oldid=1375666877 · file: sources/Wikipedia_Induced_pluripotent_stem_cell.json
- Wikipedia: Red blood cell · https://en.wikipedia.org/w/index.php?title=Red_blood_cell&oldid=1380241183 · file: sources/Wikipedia_Red_blood_cell.json
- Wikipedia: Insulin · https://en.wikipedia.org/w/index.php?title=Insulin&oldid=1380889447 · file: sources/Wikipedia_Insulin.json
- Wikipedia: Crystallin · https://en.wikipedia.org/w/index.php?title=Crystallin&oldid=1358250342 · file: sources/Wikipedia_Crystallin.json
- Wikipedia: Hemoglobin · https://en.wikipedia.org/w/index.php?title=Hemoglobin&oldid=1376983759 · file: sources/Wikipedia_Hemoglobin.json
- Wikipedia: Keratin · https://en.wikipedia.org/w/index.php?title=Keratin&oldid=1376073477 · file: sources/Wikipedia_Keratin.json
- Wikipedia: Transcription factor · https://en.wikipedia.org/w/index.php?title=Transcription_factor&oldid=1378821232 · file: sources/Wikipedia_Transcription_factor.json
- Wikipedia: Frederick Campion Steward · https://en.wikipedia.org/w/index.php?title=Frederick_Campion_Steward&oldid=1380681084 · file: sources/Wikipedia_Frederick_Campion_Steward.json
- Wikipedia: Snuppy · https://en.wikipedia.org/w/index.php?title=Snuppy&oldid=1372672420 · file: sources/Wikipedia_Snuppy.json
- Wikipedia: Fetal hemoglobin · https://en.wikipedia.org/w/index.php?title=Fetal_hemoglobin&oldid=1358204480 · file: sources/Wikipedia_Fetal_hemoglobin.json
- Wikipedia: Lac operon · https://en.wikipedia.org/w/index.php?title=Lac_operon&oldid=1362920271 · file: sources/Wikipedia_Lac_operon.json
- Wikipedia: Pulmonary surfactant · https://en.wikipedia.org/w/index.php?title=Pulmonary_surfactant&oldid=1367284905 · file: sources/Wikipedia_Pulmonary_surfactant.json
- Wikipedia: Pepsin · https://en.wikipedia.org/w/index.php?title=Pepsin&oldid=1379839918 · file: sources/Wikipedia_Pepsin.json
- Wikipedia: Hans Driesch · https://en.wikipedia.org/w/index.php?title=Hans_Driesch&oldid=1372002868 · file: sources/Wikipedia_Hans_Driesch.json
- GTEx Portal v8, median expression of INS by tissue · https://gtexportal.org/home/gene/INS · file: sources/GTEx_Portal_v8_median_expression_of_INS_by_tissue.json
- GTEx Portal v8, median expression of SFTPC by tissue · https://gtexportal.org/home/gene/SFTPC · file: sources/GTEx_Portal_v8_median_expression_of_SFTPC_by_tissue.json
- GTEx Portal v8, median expression of ALB by tissue · https://gtexportal.org/home/gene/ALB · file: sources/GTEx_Portal_v8_median_expression_of_ALB_by_tissue.json
- Wikipedia: Human serum albumin · https://en.wikipedia.org/w/index.php?title=Human_serum_albumin&oldid=1378394754 · file: sources/Wikipedia_Human_serum_albumin.json
- Wikipedia: Myosin · https://en.wikipedia.org/w/index.php?title=Myosin&oldid=1377878404 · file: sources/Wikipedia_Myosin.json
- Wikipedia: Casein · https://en.wikipedia.org/w/index.php?title=Casein&oldid=1372040108 · file: sources/Wikipedia_Casein.json
- Wikipedia: Ovalbumin · https://en.wikipedia.org/w/index.php?title=Ovalbumin&oldid=1337737611 · file: sources/Wikipedia_Ovalbumin.json
- Wikipedia: Egg white · https://en.wikipedia.org/w/index.php?title=Egg_white&oldid=1373670142 · file: sources/Wikipedia_Egg_white.json
- GTEx Portal v8, median expression of PGA3 by tissue · https://gtexportal.org/home/gene/PGA3 · file: sources/GTEx_Portal_v8_median_expression_of_PGA3_by_tissue.json
- Nobel Prize in Physiology or Medicine 2012, press release · https://www.nobelprize.org/prizes/medicine/2012/press-release/ · file: sources/Nobel_Prize_in_Physiology_or_Medicine_2012_press_release.json
Fact sheet with numbered sentences: content/generator/genetics-gene-regulation/factsheet.md

For each unit write one entry to content/generator/genetics-gene-regulation/factcheck.json:
{ "id": "<unit id>", "verdict": "supported" | "imprecise" | "unsupported" | "wrong" | "quote-mismatch",
  "evidence": "[W4.19] or a short quote from the source", "note": "what is wrong, if anything", "fix": "the smallest wording change that would make it right" }
Top level: { "checker": "<who you are>", "checkedAt": "<ISO time>", "units": [ … ] }.
Teaching simplifications are fine if they are true; say "imprecise" when a qualifier is missing.
Computed answers are produced by code from the stated rules; check that the rule and the setup are right.

## Units (95)

### P1 · provenance claim
Dolly, a female Finn-Dorset sheep born on 5 July 1996, was the first mammal cloned from an adult somatic cell; the donor nucleus came from a mammary gland cell and was moved into an unfertilised egg whose nucleus had been removed; an electric shock started division and the embryo was carried by a surrogate; her body is shown at the National Museum of Scotland
Cites: Wikipedia: Dolly (sheep)

### P2 · provenance claim
John Gurdon worked on nuclear transplantation in Xenopus frogs from 1958 and shared the 2012 Nobel Prize with Shinya Yamanaka; in 1975 a Basel group got living tadpoles from the nucleus of an antibody-making lymphocyte; the Wolf Prize cited his showing that a differentiated cell’s nucleus and the egg’s differ in expression, not in genetic content
Cites: Wikipedia: John Gurdon

### P3 · provenance claim
In 2006 Yamanaka and Takahashi in Kyoto took 24 candidate genes, removed them one at a time, and found that four genes encoding transcription factors (Oct4, Sox2, Klf4, c-Myc) convert mouse fibroblasts into pluripotent stem cells
Cites: Wikipedia: Induced pluripotent stem cell

### P4 · provenance claim
Differentiation changes a cell’s size, shape and activity largely through controlled changes in gene expression, almost never through a change in DNA sequence, so different cells share the same genome; terminally differentiated cells express genes for their final job, such as myosin and actin in muscle
Cites: Wikipedia: Cellular differentiation

### P5 · provenance claim
In multicellular organisms gene regulation drives cellular differentiation, giving cell types with different gene expression profiles from the same genome sequence
Cites: Wikipedia: Regulation of gene expression

### P6 · provenance claim
Transcription factors are proteins that bind DNA and regulate (turn on and off) genes so they are expressed in the right cells at the right time; the human genome has about 1,600
Cites: Wikipedia: Transcription factor

### P7 · provenance claim
Mature mammalian red blood cells lack a nucleus, which is expelled as they develop; the red blood cells of other vertebrates have nuclei, with a few exceptions among salamanders and fish
Cites: Wikipedia: Red blood cell

### P8 · provenance claim
Insulin is a peptide hormone made by the beta cells of the pancreatic islets, encoded in humans by the INS gene; beta cells release it when blood glucose is high
Cites: Wikipedia: Insulin

### P9 · provenance claim
Median INS RNA by tissue, GTEx release 8: pancreas 2,325.3 TPM; liver 0.26; skin of the lower leg 0.06; brain cortex 0.03; skeletal muscle 0.02
Cites: GTEx Portal v8, median expression of INS by tissue

### P10 · provenance claim
Crystallins are water-soluble structural proteins of the eye lens, responsible for its transparency; they raise the refractive index without blocking light
Cites: Wikipedia: Crystallin

### P11 · provenance claim
Hemoglobin is made in immature red blood cells as they develop in the bone marrow
Cites: Wikipedia: Hemoglobin

### P12 · provenance claim
Keratin forms tough filaments and makes up the outer layer of skin, hair and nails in mammals
Cites: Wikipedia: Keratin

### P13 · provenance claim
Myosins are motor proteins best known for their role in muscle contraction
Cites: Wikipedia: Myosin

### P14 · provenance claim
In 1958 Frederick Steward cultured mature cells isolated from carrot roots in coconut water and showed that whole plants can be regenerated from a single cell: plant cells carry the genetic information for a complete plant
Cites: Wikipedia: Frederick Campion Steward

### P15 · provenance claim
Ovalbumin is the main protein of egg white, about 55% of its protein
Cites: Wikipedia: Ovalbumin

### P16 · provenance claim
In chickens, egg white is formed from secretions of the front section of the hen’s oviduct as the egg passes through
Cites: Wikipedia: Egg white

### P17 · provenance claim
In 1962 Gurdon replaced the nucleus of a frog egg with the nucleus of a mature intestinal cell, and the egg developed into a normal tadpole: the mature cell’s DNA still held the information to build every frog cell; in 2006 Yamanaka reprogrammed mature mouse cells into pluripotent stem cells by adding four genes
Cites: Nobel Prize in Physiology or Medicine 2012, press release

### B1.hook · beat 1 (cover)
In 1996 a lamb was born in Scotland from the nucleus of one cell taken out of an adult sheep’s udder. Her name was Dolly. What was that udder cell still carrying?
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B2.prompt · beat 2 (predict)
The scientists moved the nucleus of that udder cell into a sheep’s egg whose own nucleus had been taken out. The egg grew into a lamb with a brain, blood, bones and wool. What does that tell you about the udder cell’s nucleus?
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B2.explain · beat 2 (predict)
Every gene of a sheep’s nucleus was still there. An udder cell uses only some of its genes, but it keeps the rest. Dolly, born on 5 July 1996, was the first mammal cloned from a cell of an adult.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B2.nucleus.udder · beat 2 (predict)
It held only the genes an udder cell uses, plus a few for upkeep — feedback: Then nothing but udder-like tissue could have grown. Every organ Dolly had was built from the genes in that one nucleus.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B2.nucleus.all · beat 2 (predict)
It still held every gene in a sheep’s nucleus [KEY]
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B2.nucleus.egg · beat 2 (predict)
The emptied egg filled in whatever genes the udder cell had lost — feedback: The egg’s nucleus, which holds nearly all of an egg’s genes, was removed first. The instructions for Dolly’s body came from the udder cell.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B2.nucleus.half · beat 2 (predict)
Half the genes, with the rest made up as the embryo grew — feedback: An embryo can’t invent genes as it grows. With no sperm and no egg nucleus, every gene in Dolly’s nuclei came from the udder cell.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B3.frame1 · beat 3 (documentary)
Dolly was not the first clone. In 1962 the biologist John Gurdon moved the nucleus of a gut cell from a frog tadpole into a frog egg whose own nucleus had been destroyed.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B3.frame2 · beat 3 (documentary)
The egg grew into a normal tadpole. A gut cell, already specialised, still held every gene needed to build a frog.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B3.frame3 · beat 3 (documentary)
In 1996 the same move worked with a cell from an adult mammal. Dolly grew from the nucleus of a cell taken from an adult sheep’s udder.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B3.frame4 · beat 3 (documentary)
In 2006 Shinya Yamanaka and Kazutoshi Takahashi turned mature mouse cells back into cells that can become almost any kind. They added four genes whose proteins switch other genes on and off.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B3.frame5 · beat 3 (documentary)
Gurdon and Yamanaka shared the 2012 Nobel Prize. A specialised cell keeps its whole genome. What sets it apart is which genes it reads.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B3.frame6 · beat 3 (documentary)
Almost every cell, that is. A mammal’s red blood cells push out their nucleus as they mature, so they carry no genome at all. In most other animals with backbones, red cells keep theirs.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B4.goal · beat 4 (sim)
Each of these tissues carries the same insulin gene. Bet on the one that reads it most, then let the measured values rise.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B4.ask · beat 4 (sim)
Which of these tissues reads its insulin gene the most? [KEY: Pancreas]
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B4.bar.liver · beat 4 (sim)
Liver: 0.26 RNA copies per million — feedback: The liver answers insulin, pulling sugar from the blood and storing it, but it does not make the hormone. — The gene: Every tissue here carries this same gene. Liver cells keep it all but silent.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B4.bar.muscle · beat 4 (sim)
Skeletal muscle: 0.02 RNA copies per million — feedback: Muscle takes up sugar when insulin arrives. Using a hormone is not the same as making it. — The gene: Every tissue here carries this same gene. Muscle reads almost none of it.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B4.bar.pancreas · beat 4 (sim)
Pancreas: 2325.3 RNA copies per million — Who reads it: Beta cells, gathered in small clusters called islets scattered through the pancreas. They release insulin into the blood when blood sugar rises.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B4.bar.brain · beat 4 (sim)
Brain cortex: 0.03 RNA copies per million — feedback: The cortex carries the insulin gene like every tissue here, and leaves it almost untouched. — The gene: Every tissue here carries this same gene. Cells of the brain’s cortex leave it all but silent.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B4.bar.skin · beat 4 (sim)
Skin of the lower leg: 0.06 RNA copies per million — feedback: Skin carries the gene like every tissue here, and reads almost none of it. — The gene: Every tissue here carries this same gene. Skin cells leave it switched off.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B4.right · beat 4 (sim)
The pancreas, by thousands of times. The other four carry the identical gene and leave it all but silent.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B4.wrong · beat 4 (sim)
It is the pancreas, by thousands of times. Every tissue here carries the identical insulin gene; only the pancreas reads it in earnest.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B4.source · beat 4 (sim)
Data: GTEx Portal, release 8. The median level of insulin-gene RNA in each tissue across the donors sampled.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B5.prompt · beat 5 (match)
Each of these cells carries the genes for all four proteins on the right. Match each cell to the protein it switches on and makes in bulk.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B5.explain · beat 5 (match)
Each cell switches on the genes for its own job. Crystallins keep the lens clear, hemoglobin fills young red cells, myosin and actin make muscle contract, and keratin toughens the outer skin. The genes for the other three proteins sit in every one of these cells too, but none of those proteins is made there in bulk.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B5.pair.lens · beat 5 (match)
A young cell in the lens of the eye → Crystallin, a clear protein that bends light
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B5.pair.redpre · beat 5 (match)
A young red blood cell in the bone marrow → Hemoglobin, which carries oxygen
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B5.pair.muscle · beat 5 (match)
A muscle cell → Myosin, a motor protein that makes muscle contract
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B5.pair.skin · beat 5 (match)
A growing cell in the outer layer of skin → Keratin, which forms tough filaments
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B6.prompt · beat 6 (predict)
In 1958 a botanist took single cells from carrot roots, the part we eat, and grew them in flasks of coconut water. Could one of those root cells grow into a whole new carrot plant, leaves and all?
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B6.explain · beat 6 (predict)
Yes. Frederick Steward showed in 1958 that a whole carrot plant can be regrown from a single root cell. Like Dolly’s udder cell, a root cell keeps every gene; growing a leaf only takes switching different ones on.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B6.root.root · beat 6 (predict)
No: a root cell has kept only the genes for root — feedback: A root cell uses mostly root genes, but it keeps the others. Given the right signals, it can switch them on again.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B6.root.lump · beat 6 (predict)
Only into a shapeless lump of root tissue — feedback: With the right chemical signals in the right order, the root cells went on to form complete plants.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B6.root.yes · beat 6 (predict)
Yes, into a whole new plant [KEY]
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B6.root.pollen · beat 6 (predict)
Only after it fuses with a pollen grain — feedback: No pollen was involved. Each new plant grew from one root cell, using the genes that cell already had.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B7.prompt · beat 7 (flaw)
A classmate explains why muscle makes no insulin. Which step breaks?
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B7.explain · beat 7 (flaw)
Reading almost none of a gene means it is switched off, not gone. Muscle cells carry the same insulin gene as the beta cells of the pancreas. Cloned frogs and Dolly showed that cells keep their genes as they specialise; what changes is which ones they read.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B7.step.a · beat 7 (flaw)
Insulin is made by reading the insulin gene.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B7.step.b · beat 7 (flaw)
Muscle reads almost none of its insulin gene.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B7.step.c · beat 7 (flaw)
So muscle cells must have lost the insulin gene as they specialised. [THE BROKEN STEP]
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B7.step.d · beat 7 (flaw)
So no muscle cell could ever be made to produce insulin.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B8.prompt · beat 8 (match)
A laying hen and the gene for ovalbumin, the main protein in egg white. Sort each of her cells by what it does with that gene.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B8.explain · beat 8 (match)
Only the oviduct cells that coat the egg in white read the ovalbumin gene. Every other cell here carries it switched off, her red blood cells included: unlike a mammal’s, a bird’s red cells keep their nucleus, and with it the gene.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B8.pair.oviduct · beat 8 (match)
A cell lining the front part of her oviduct, where white is laid around the yolk → Reads the gene
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B8.pair.liver · beat 8 (match)
A liver cell → Carries it, switched off
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B8.pair.muscle · beat 8 (match)
A breast-muscle fibre → Carries it, switched off
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B8.pair.redcell · beat 8 (match)
A red blood cell → Carries it, switched off
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B8.pair.nerve · beat 8 (match)
A nerve cell in her brain → Carries it, switched off
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B8.pair.feather · beat 8 (match)
A cell at the base of a growing feather → Carries it, switched off
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### B9.idea · beat 9 (payoff)
Nearly every cell in a body carries the same genome. A lens cell, a muscle cell and a liver cell differ because each switches on a different set of those genes.
Cites: Wikipedia: Dolly (sheep); Wikipedia: John Gurdon; Wikipedia: Induced pluripotent stem cell; Wikipedia: Cellular differentiation; Wikipedia: Regulation of gene expression; Wikipedia: Transcription factor; Wikipedia: Red blood cell; Wikipedia: Insulin; GTEx Portal v8, median expression of INS by tissue; Wikipedia: Crystallin; Wikipedia: Hemoglobin; Wikipedia: Keratin; Wikipedia: Myosin; Wikipedia: Frederick Campion Steward; Wikipedia: Ovalbumin; Wikipedia: Egg white; Nobel Prize in Physiology or Medicine 2012, press release

### R1.f1 · reel gene-regulation-dolly
This is Dolly, born in Scotland on 5 July 1996. Her body now stands in the National Museum of Scotland.
Cites: Wikipedia: Dolly (sheep)

### R1.f2 · reel gene-regulation-dolly
She grew from the nucleus of one cell taken from an adult sheep’s udder, placed in an egg whose own nucleus had been removed.
Cites: Wikipedia: Dolly (sheep)

### R1.f3 · reel gene-regulation-dolly
In 1962 a frog egg given the nucleus of a tadpole’s gut cell had grown into a normal tadpole. Dolly was the first mammal cloned from an adult’s cell.
Cites: Nobel Prize in Physiology or Medicine 2012, press release; Wikipedia: Dolly (sheep)

### R1.f4 · reel gene-regulation-dolly
So an udder cell still carries the genes for a whole sheep: brain, blood, bone and wool. It just leaves many of them switched off.
Cites: Wikipedia: Cellular differentiation

### R1.prediction · reel gene-regulation-dolly
Scientists put the nucleus of an adult sheep’s udder cell into an egg with its own nucleus removed. What grew? [KEY: A lamb]
Cites: Wikipedia: Dolly (sheep)

### R1.takeaway · reel gene-regulation-dolly
A specialised cell keeps its whole genome. What makes it an udder cell is which genes it switches on.
Cites: Wikipedia: Dolly (sheep); Nobel Prize in Physiology or Medicine 2012, press release; Wikipedia: Cellular differentiation

### R2.f1 · reel gene-regulation-four-genes
In 2006, in Kyoto, Shinya Yamanaka and Kazutoshi Takahashi set out to wind mature mouse cells back to an embryo-like state.
Cites: Wikipedia: Induced pluripotent stem cell

### R2.f2 · reel gene-regulation-four-genes
They began with 24 genes known to matter in embryonic stem cells, then took them away one at a time to find which were needed.
Cites: Wikipedia: Induced pluripotent stem cell

### R2.f3 · reel gene-regulation-four-genes
Four were enough. Each one makes a protein that switches other genes on or off.
Cites: Wikipedia: Induced pluripotent stem cell; Wikipedia: Transcription factor

### R2.f4 · reel gene-regulation-four-genes
With those four, a few of the mature cells became stem cells able to grow into almost any cell type. This colony is human cells reprogrammed into stem cells.
Cites: Wikipedia: Induced pluripotent stem cell

### R2.f5 · reel gene-regulation-four-genes
In 2012 Yamanaka shared the Nobel Prize with John Gurdon, who in 1962 had grown a tadpole from the nucleus of a gut cell.
Cites: Wikipedia: John Gurdon; Nobel Prize in Physiology or Medicine 2012, press release

### R2.prediction · reel gene-regulation-four-genes
How many added genes did it take to turn a mature mouse cell back into a cell that can become almost any kind? [KEY: Four]
Cites: Wikipedia: Induced pluripotent stem cell

### R2.takeaway · reel gene-regulation-four-genes
A cell’s type is held in place by which genes are switched on. Change the switches and the cell changes.
Cites: Wikipedia: Induced pluripotent stem cell; Wikipedia: Transcription factor; Wikipedia: John Gurdon; Nobel Prize in Physiology or Medicine 2012, press release

### C1 · case c_y35rgb5fcf (chart)
Every breath out. Each breath out would squeeze the lungs’ tiny air sacs shut if they were not coated with surfactant, a slick film of fats and proteins. One of those proteins is made from a single gene, carried by nearly every cell in your body. Which of these tissues reads that gene the most? Bars (RNA copies per million): Heart, left ventricle 0.18; Brain cortex 3.45; Lung 1746.9; Skin, lower leg 1.2; Thyroid 2.86; Kidney cortex 0.11.
    Reveal: The lung, by hundreds of times. Surfactant is made by one kind of cell lining the air sacs, and those cells switch the gene on. The heart, brain, skin, thyroid and kidney carry the same gene and leave it nearly silent.
    Claim: Predicts which tissue switches on a gene from what the gene’s protein is for.
Cites: GTEx Portal v8, median expression of SFTPC by tissue; Wikipedia: Pulmonary surfactant

### C2 · case c_yewsgbz0dc (chart)
An enzyme that needs acid. Pepsin starts breaking down the protein in a meal. It is released in an inactive form that turns into working pepsin only when it meets strong acid. Every tissue below carries one of the genes for that inactive form. Which of them reads that gene the most? Bars (RNA copies per million): Pancreas 0.15; Liver 0.18; Small intestine, ileum 0.13; Stomach 1723.5; Lung 0.03.
    Reveal: The stomach, by thousands of times. Chief cells in the stomach wall release the inactive form, and the stomach’s own acid turns it into pepsin. The pancreas makes other protein-cutting enzymes, but it leaves this gene switched off.
    Claim: Finds the tissue that switches on a digestive enzyme’s gene from where the enzyme works.
Cites: GTEx Portal v8, median expression of PGA3 by tissue; Wikipedia: Pepsin

### C3 · case c_kz51ygmxht (chart)
The blood’s commonest protein. Albumin makes up about half the protein in blood plasma. It carries fatty acids and hormones and holds water inside the vessels. Every tissue below carries the albumin gene, the blood’s own white cells included. Which of them reads the albumin gene the most? Bars (RNA copies per million): Whole blood 2.47; Liver 25201.3; Kidney cortex 40.26; Heart, left ventricle 0.4; Lung 2.58.
    Reveal: The liver, by hundreds of times over the kidney and thousands over the rest. Liver cells make albumin and pour it into the blood. Blood carries the protein everywhere, but its own cells barely read the gene, and its mature red cells have no nucleus to read it from.
    Claim: Tells the tissue that makes a protein apart from the places the protein ends up.
Cites: GTEx Portal v8, median expression of ALB by tissue; Wikipedia: Human serum albumin

### I.i_dm2efn3gnr · check item (choice)
Dolly grew from the nucleus of an udder cell, yet she had working eyes, lungs and blood. What best explains that? [KEY: The udder cell’s nucleus still held every gene of a sheep’s nucleus, many switched off] Other options: The egg supplied the genes for every organ that was not udder | New genes appeared as the embryo developed | The surrogate mother passed her genes to the lamb through the womb
    Claim: Dolly’s whole body grew from one udder-cell nucleus, so that nucleus had kept every gene of a sheep’s nucleus.
    Explain: The egg’s nucleus was removed first, and the surrogate ewe only carried the embryo. Every gene in Dolly’s nuclei came from the udder cell, which had kept them all and used only some.
Cites: Wikipedia: Dolly (sheep)

### I.i_rqp74fjf6v · check item (choice)
Across many donors, liver tissue holds thousands of times less insulin-gene RNA than the pancreas. What is the best explanation? [KEY: Liver cells carry the insulin gene but keep it switched off] Other options: Liver cells lost the insulin gene as they specialised | The liver’s copy of the gene is broken by mutations | Liver cells carry fewer chromosomes than pancreas cells
    Claim: A tissue that makes almost no insulin still carries the insulin gene, switched off.
    Explain: Liver and pancreas cells carry the same genome, insulin gene included. The pancreas’s beta cells switch it on; liver cells leave it all but silent.
Cites: GTEx Portal v8, median expression of INS by tissue; Wikipedia: Insulin

### I.i_19jrp03ydg · check item (flaw)
Which step in this reasoning breaks? (a) John Gurdon moved the nucleus of a tadpole’s gut cell into a frog egg whose own nucleus had been destroyed. (b) The egg grew into a normal tadpole. (c) The tadpole’s organs were built from genes in that one transplanted nucleus. (d) So before it was moved, the gut cell must have been using all of those genes. [BROKEN: d]
    Claim: Carrying a gene is not the same as using it: a tadpole cell carried every frog gene but read only some.
    Explain: Having a gene is not the same as using it. The gut cell carried the whole frog genome but read only the genes for its own job; inside the egg, the rest were switched back on.
Cites: Nobel Prize in Physiology or Medicine 2012, press release; Wikipedia: John Gurdon

### I.i_1rwdnykqhx · check item (order)
Put the steps that produced Dolly in order. An unfertilised egg has its own nucleus removed → The nucleus of an udder cell is put into the emptied egg → An electric shock starts the egg dividing → The early embryo is placed in a surrogate mother → A lamb is born
    Claim: Cloning by nuclear transfer puts an adult cell’s nucleus into an emptied egg, which then develops in a surrogate.
    Explain: The egg is emptied first, so the only nuclear genes in it are the udder cell’s. An electric shock starts division, and the embryo grows in a surrogate until birth.
Cites: Wikipedia: Dolly (sheep)

### I.i_qvqpds5h6s · check item (choice)
Shinya Yamanaka’s team turned mature mouse cells into stem cells by adding just four genes. What do those four genes have in common? [KEY: Each makes a protein that switches other genes on or off] Other options: Each repairs genes the mature cell had lost | Together they replace the cell’s old genome | Each only makes the cell divide faster
    Claim: The four genes that reset a mature cell each make a protein that switches other genes on and off.
    Explain: All four are transcription factors: proteins that bind DNA and turn genes on or off. Nothing was missing from the mature cells, so four switches were enough to reset which genes they read.
Cites: Wikipedia: Induced pluripotent stem cell; Wikipedia: Transcription factor

### I.i_7va93zkbh6 · check item (choice)
In 2005 Snuppy, an Afghan Hound puppy, was cloned from a cell taken from an adult dog’s ear. Which statement must be true of that ear cell? [KEY: It carried the genes for a dog’s eyes, heart and fur] Other options: It carried only the genes an ear needs | It had been reading its eye and heart genes all along | It needed genes from the egg to build the rest of the body
    Claim: A clone grown from an ear cell shows that the ear cell carried the genes for a whole dog.
    Explain: Snuppy’s whole body was built from the genes in that one ear-cell nucleus, so the ear cell had them all. It simply kept most of them switched off.
Cites: Wikipedia: Snuppy

### I.i_as252dnkq1 · check item (choice)
Hans Driesch separated the two cells of a sea urchin embryo after its first division. Each cell grew into a complete larva. What does that show? [KEY: Each of the two cells carried a full set of instructions] Other options: Each cell carried half the genes and grew back the other half | Only one cell was the real embryo; the other copied it | Seawater supplied whatever each cell lacked
    Claim: Each cell of a two-cell sea urchin embryo carries a full set of instructions, so a separated cell can still build a whole, if smaller, larva.
    Explain: A complete larva can only grow from a complete set of instructions. Cell division hands each daughter cell the whole genome, so either cell could build a complete larva, if a smaller one.
Cites: Wikipedia: Hans Driesch

### I.i_fsx989yjq8 · check item (choice)
At birth much of a baby’s hemoglobin is fetal hemoglobin, which grips oxygen harder. Within about a year it falls below 1% of the total. What changed? [KEY: Blood-forming cells switched from one hemoglobin gene to another] Other options: The fetal hemoglobin gene was deleted from the baby’s cells | Milk replaced the fetal hemoglobin with the adult kind | Fetal hemoglobin came from the mother and ran out
    Claim: The change from fetal to adult hemoglobin is a switch in which globin genes are read, not in which genes are carried.
    Explain: Fetal hemoglobin is built with gamma chains where adult hemoglobin uses beta chains. The genes for both are in every blood-forming cell; around birth the cells switch from reading the gamma genes to reading the beta gene.
Cites: Wikipedia: Fetal hemoglobin

### I.i_835bk4p8vf · check item (choice)
E. coli bacteria grown on glucose make almost none of the enzyme that splits lactose. Moved to a broth with lactose and no glucose, they soon make plenty. What happened? [KEY: They switched on genes they had carried all along] Other options: Lactose caused new mutations that built the enzyme’s gene | They picked up the enzyme’s gene from the broth | The lactose itself turned into the enzyme
    Claim: A bacterium switches on genes it already carries when its conditions call for them.
    Explain: The lactose genes are in every E. coli cell. With no lactose around, a repressor protein holds them off; when lactose is present and glucose is not, they are read. Making the enzyme with nothing to split would be a waste.
Cites: Wikipedia: Lac operon

### I.i_vj5nvv8kje · check item (match)
A dairy cow and the gene for beta-casein, one of the four caseins that together make up about 80% of the protein in cow’s milk. Sort each of her cells by what it does with that gene. A milk-making cell in her udder → Reads the gene; A skin cell → Carries it, switched off; A liver cell → Carries it, switched off; A mature red blood cell → Carries no copy; A nerve cell in her spinal cord → Carries it, switched off; A muscle cell in her leg → Carries it, switched off
    Claim: Every cell of a cow that has a nucleus carries the beta-casein gene; only milk-making udder cells read it, and mature red cells carry no copy.
    Explain: Only the udder’s milk-making cells read the beta-casein gene. Her other cells with a nucleus carry it switched off, while her mature red blood cells pushed out their nucleus and carry no copy at all.
Cites: Wikipedia: Casein; Wikipedia: Red blood cell

### I.i_q6a8vfvkzq · check item (order)
Put these stages of a person’s hemoglobin in order, earliest first. Embryonic hemoglobin is the main kind → Fetal hemoglobin becomes the main kind → The baby is born with plenty of fetal hemoglobin → Adult hemoglobin takes over as the fetal kind falls → Fetal hemoglobin is under 1% of the total
    Claim: Over a lifetime the blood switches hemoglobin genes in turn: embryonic, then fetal, then adult.
    Explain: Embryonic hemoglobin leads in the first three months of pregnancy, then fetal hemoglobin. Its level stays high until a baby is a few months old, then falls as adult hemoglobin is made, reaching adult levels within about a year.
Cites: Wikipedia: Fetal hemoglobin

### I.i_bfayacb6m6 · check item (order)
E. coli bacteria are put in a broth holding both glucose and lactose. Put what happens in order. With glucose around, the lactose genes stay almost silent → The bacteria use up the glucose → With only lactose left, the lactose genes are switched on → The bacteria make the enzyme and split the lactose → The lactose runs out and the genes are switched off again
    Claim: A bacterium’s lactose genes switch on only when lactose is present and glucose is gone, and switch off again when lactose runs out.
    Explain: Glucose is the bacteria’s preferred sugar, so the lactose genes wait while it lasts. Once it is gone and lactose is present they are read; when the lactose is used up, the repressor shuts them off again.
Cites: Wikipedia: Lac operon

# Adversarial fact-check: Read in threes (genetics-gene-to-protein)

You are an independent checker. You did not write this content. Your job is to BREAK it: for every
unit below, look for the claim being wrong, overstated, missing a qualifier, unsupported by the
cited source, or a quote that differs from the pinned edition by even one word. Default to
suspicion; "supported" needs a sentence you can point to.

Sources (pinned; cached text in content/generator/genetics-gene-to-protein/sources/<file>.json, field "text"):
- Wikipedia: Central dogma of molecular biology · https://en.wikipedia.org/w/index.php?title=Central_dogma_of_molecular_biology&oldid=1368164013 · file: sources/Wikipedia_Central_dogma_of_molecular_biology.json
- Wikipedia: Transcription (biology) · https://en.wikipedia.org/w/index.php?title=Transcription_(biology)&oldid=1376993847 · file: sources/Wikipedia_Transcription_biology_.json
- Wikipedia: Translation (biology) · https://en.wikipedia.org/w/index.php?title=Translation_(biology)&oldid=1377556947 · file: sources/Wikipedia_Translation_biology_.json
- Wikipedia: Genetic code · https://en.wikipedia.org/w/index.php?title=Genetic_code&oldid=1381521675 · file: sources/Wikipedia_Genetic_code.json
- Wikipedia: Messenger RNA · https://en.wikipedia.org/w/index.php?title=Messenger_RNA&oldid=1376379298 · file: sources/Wikipedia_Messenger_RNA.json
- Wikipedia: Ribosome · https://en.wikipedia.org/w/index.php?title=Ribosome&oldid=1380883342 · file: sources/Wikipedia_Ribosome.json
- Wikipedia: Transfer RNA · https://en.wikipedia.org/w/index.php?title=Transfer_RNA&oldid=1380829614 · file: sources/Wikipedia_Transfer_RNA.json
- Wikipedia: Start codon · https://en.wikipedia.org/w/index.php?title=Start_codon&oldid=1334185154 · file: sources/Wikipedia_Start_codon.json
- Wikipedia: Stop codon · https://en.wikipedia.org/w/index.php?title=Stop_codon&oldid=1379378838 · file: sources/Wikipedia_Stop_codon.json
- Wikipedia: Reading frame · https://en.wikipedia.org/w/index.php?title=Reading_frame&oldid=1343133812 · file: sources/Wikipedia_Reading_frame.json
- Wikipedia: Frameshift mutation · https://en.wikipedia.org/w/index.php?title=Frameshift_mutation&oldid=1381201608 · file: sources/Wikipedia_Frameshift_mutation.json
- Wikipedia: Nirenberg and Matthaei experiment · https://en.wikipedia.org/w/index.php?title=Nirenberg_and_Matthaei_experiment&oldid=1347902173 · file: sources/Wikipedia_Nirenberg_and_Matthaei_experiment.json
- Wikipedia: Frameshift mutation experiment · https://en.wikipedia.org/w/index.php?title=Frameshift_mutation_experiment&oldid=1371676726 · file: sources/Wikipedia_Frameshift_mutation_experiment.json
- Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227 · https://doi.org/10.1038/1921227a0 · (no cached text: judge from general knowledge and say so)
- Nirenberg & Matthaei 1961, PNAS 47:1588 · https://doi.org/10.1073/pnas.47.10.1588 · (no cached text: judge from general knowledge and say so)
- Wikipedia: ABO blood group system · https://en.wikipedia.org/w/index.php?title=ABO_blood_group_system&oldid=1380802160 · file: sources/Wikipedia_ABO_blood_group_system.json
- Wikipedia: Hemoglobin Constant Spring · https://en.wikipedia.org/w/index.php?title=Hemoglobin_Constant_Spring&oldid=1315203575 · file: sources/Wikipedia_Hemoglobin_Constant_Spring.json
- Wikipedia: Hemoglobin subunit beta · https://en.wikipedia.org/w/index.php?title=Hemoglobin_subunit_beta&oldid=1369639741 · file: sources/Wikipedia_Hemoglobin_subunit_beta.json
- Wikipedia: Titin · https://en.wikipedia.org/w/index.php?title=Titin&oldid=1380099395 · file: sources/Wikipedia_Titin.json
- Wikipedia: Green fluorescent protein · https://en.wikipedia.org/w/index.php?title=Green_fluorescent_protein&oldid=1381549356 · file: sources/Wikipedia_Green_fluorescent_protein.json
- Wikipedia: Insulin · https://en.wikipedia.org/w/index.php?title=Insulin&oldid=1380889447 · file: sources/Wikipedia_Insulin.json
- Yamamoto et al. 1990, Nature 345:229 · https://doi.org/10.1038/345229a0 · (no cached text: judge from general knowledge and say so)
- Clegg, Weatherall & Milner 1971, Nature 234:337 · https://doi.org/10.1038/234337a0 · (no cached text: judge from general knowledge and say so)
- NCBI RefSeq NM_020469.3: human ABO mRNA · https://www.ncbi.nlm.nih.gov/nuccore/NM_020469.3 · file: sources/NCBI_RefSeq_NM_020469.3_human_ABO_mRNA.json
- NCBI RefSeq NM_000518.5: human HBB mRNA · https://www.ncbi.nlm.nih.gov/nuccore/NM_000518.5 · file: sources/NCBI_RefSeq_NM_000518.5_human_HBB_mRNA.json
- NCBI RefSeq NM_000517.6: human HBA2 mRNA · https://www.ncbi.nlm.nih.gov/nuccore/NM_000517.6 · file: sources/NCBI_RefSeq_NM_000517.6_human_HBA2_mRNA.json
- NCBI dbSNP: rs713040, rs33930165, rs334, rs35699606 and rs34716011 in HBB · https://www.ncbi.nlm.nih.gov/snp/rs713040 · file: sources/NCBI_dbSNP_rs713040_rs33930165_rs334_rs35699606_and_rs34716011_in_HBB.json
- NCBI ClinVar VCV000015296: HBB c.9T>A (Hb Okayama) · https://www.ncbi.nlm.nih.gov/clinvar/variation/15296/ · file: sources/NCBI_ClinVar_VCV000015296_HBB_c.9T_A_Hb_Okayama_.json
Fact sheet with numbered sentences: content/generator/genetics-gene-to-protein/factsheet.md

For each unit write one entry to content/generator/genetics-gene-to-protein/factcheck.json:
{ "id": "<unit id>", "verdict": "supported" | "imprecise" | "unsupported" | "wrong" | "quote-mismatch",
  "evidence": "[W4.19] or a short quote from the source", "note": "what is wrong, if anything", "fix": "the smallest wording change that would make it right" }
Top level: { "checker": "<who you are>", "checkedAt": "<ISO time>", "units": [ … ] }.
Teaching simplifications are fine if they are true; say "imprecise" when a qualifier is missing.
Computed answers are produced by code from the stated rules; check that the rule and the setup are right.

## Units (106)

### P1 · provenance claim
Gamow suggested the code used three nucleotides per amino acid: with four bases and 20 amino acids, singles give 4 combinations and pairs 16, while triplets give 64
Cites: Wikipedia: Nirenberg and Matthaei experiment

### P2 · provenance claim
Only one DNA strand is the template; RNA polymerase reads it 3′→5′ and builds a complementary RNA 5′→3′ that matches the coding (sense) strand, with uracil in place of thymine
Cites: Wikipedia: Transcription (biology)

### P3 · provenance claim
The ribosome links amino acids in the order the mRNA specifies, using tRNAs to carry them and reading the mRNA three nucleotides at a time; the code has 64 codons
Cites: Wikipedia: Genetic code

### P4 · provenance claim
Protein-coding frames begin at a start codon, usually the first AUG, read as methionine; the three stop codons UAA, UAG and UGA have no matching tRNA, so a release factor frees the chain
Cites: Wikipedia: Genetic code

### P5 · provenance claim
A reading frame is set by the first triplet read and runs as successive, non-overlapping codons
Cites: Wikipedia: Genetic code

### P6 · provenance claim
The code is redundant but not ambiguous: GAA and GAG both specify glutamic acid; synonymous changes mostly fall at the third position
Cites: Wikipedia: Genetic code

### P7 · provenance claim
Indels of a number of bases that is not a multiple of 3 disrupt the reading frame (frameshift); nonsense mutations produce a stop codon
Cites: Wikipedia: Genetic code

### P8 · provenance claim
May 1961, NIH: Nirenberg and his postdoctoral fellow J. Heinrich Matthaei used a cell-free extract of broken E. coli that made protein only when RNA was added; poly-U with all 20 amino acids, one radioactive per run, gave polyphenylalanine
Cites: Wikipedia: Nirenberg and Matthaei experiment

### P9 · provenance claim
At 3 am on 27 May 1961 Matthaei used radioactive phenylalanine: 38,000 counts with poly-U against a background of 70 without it, a result consistent with UUU coding for phenylalanine
Cites: Wikipedia: Nirenberg and Matthaei experiment

### P10 · provenance claim
Nirenberg and Philip Leder went on to read 54 of the 64 codons, and Har Gobind Khorana’s lab worked out the rest
Cites: Wikipedia: Genetic code

### P11 · provenance claim
The poly-U result, as first published
Cites: Nirenberg & Matthaei 1961, PNAS 47:1588

### P12 · provenance claim
Transcription and translation: DNA to RNA to protein
Cites: Wikipedia: Central dogma of molecular biology

### P13 · provenance claim
Crick, Brenner, Barnett and Watts-Tobin (1961) used proflavin to add or remove single base pairs in the phage T4 rIIB gene; single changes broke it, three of the same kind together restored it, showing a non-overlapping triplet code
Cites: Wikipedia: Frameshift mutation experiment

### P14 · provenance claim
The frameshift paper itself
Cites: Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227

### P15 · provenance claim
The stop codon UAG was named amber; stop codons release the chain
Cites: Wikipedia: Stop codon

### P16 · provenance claim
Syn57: an E. coli strain whose genome no longer uses 7 of the 64 codons (2025)
Cites: Wikipedia: Genetic code

### P17 · provenance claim
GFP from the jellyfish Aequorea victoria has 238 amino acids, and its coding sequence (from cDNA) makes a glowing protein when expressed in E. coli
Cites: Wikipedia: Green fluorescent protein

### P18 · provenance claim
Insulin is made first as preproinsulin, a chain of 110 amino acids
Cites: Wikipedia: Insulin

### P19 · provenance claim
Titin is among the largest known proteins; its human canonical isoform has 34,350 amino acids
Cites: Wikipedia: Titin

### P20 · provenance claim
tRNAs carry amino acids and pair with codons through their anticodons
Cites: Wikipedia: Transfer RNA

### P21 · provenance claim
Ribosomes read mRNA and are made of ribosomal RNA and proteins
Cites: Wikipedia: Ribosome

### B1.hook · beat 1 (cover)
In May 1961 a strand of RNA spelled with one letter, U, over and over, went into a soup of broken bacteria. Out came a protein chain of one amino acid, repeated. Nearly every protein in your body is built by the same reading. How does a cell turn letters into a protein?
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B2.prompt · beat 2 (predict)
Genes are written in four letters. Proteins are built from 20 kinds of amino acid. If every amino acid gets its own code word, and every word has the same length, how many letters must a word have, at the fewest?
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B2.explain · beat 2 (predict)
Three. Single letters make 4 words and pairs make 16, too few for 20 amino acids. Three letters make 4 × 4 × 4 = 64. The physicist George Gamow made exactly this argument, and experiments in 1961 showed that cells really do read genes three letters at a time.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B2.letters.one · beat 2 (predict)
One letter — feedback: Four letters, taken one at a time, make only 4 different words: enough for 4 amino acids, not 20.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B2.letters.two · beat 2 (predict)
Two letters — feedback: Two letters make 4 × 4 = 16 different words, so four amino acids would have none.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B2.letters.three · beat 2 (predict)
Three letters [KEY]
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B2.letters.four · beat 2 (predict)
Four letters or more — feedback: Four would work, with 256 words, but three already make 64, more than enough.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B3.goal · beat 3 (sim)
The enzyme RNA polymerase copies a gene into messenger RNA, building it against one of the gene’s two DNA strands, the template strand. Every strand has two ends, called 5′ and 3′. A ribosome then reads that RNA three letters at a time, from a start codon, usually the first AUG, to a stop codon. Predict each result, then run it.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B3.copy.ask · beat 3 (sim)
RNA polymerase builds RNA against this strand, pairing every letter as DNA does, except that RNA has U where DNA would have T. The RNA runs the opposite way to the strand it is built against. Which RNA does it make, written from its 5′ end?
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B3.copy.GGAGACUUGCCA · beat 3 (sim)
GGA GAC UUG CCA — feedback: That copies the strand letter for letter. The RNA is built against it, so each RNA letter is the partner of the one opposite.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B3.copy.UGGCAAGUCUCC · beat 3 (sim)
UGG CAA GUC UCC — feedback: The partners are right, but back to front. The RNA runs the opposite way to this strand, so its 5′ end starts under the strand’s 3′ end and each partner sits right under its DNA letter.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B3.copy.CCUCUGAACGGU · beat 3 (sim)
CCU CUG AAC GGU [KEY]
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B3.copy.ACCGUUCAGAGG · beat 3 (sim)
ACC GUU CAG AGG — feedback: That copies the strand, back to front. Each RNA letter is the partner of the DNA letter opposite it, and sits right under it.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B3.copy.explain · beat 3 (sim)
CCU CUG AAC GGU. Every RNA letter pairs with the DNA letter opposite it, and RNA uses U in place of T. The RNA runs the opposite way to the template strand, so its 5′ end starts under the strand’s 3′ end and each partner sits right under its DNA letter. It spells the same as the gene’s other strand, the coding strand, with U for T.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B3.read.ask · beat 3 (sim)
Here the ribosome starts at the first AUG and reads three letters at a time until it reaches a stop codon: UAA, UAG or UGA. How many amino acids long is the chain?
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B3.read.7 · beat 3 (sim)
Seven — feedback: That counts the stop codon too. No amino acid matches a stop codon: it ends the chain.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B3.read.9 · beat 3 (sim)
Nine — feedback: That reads from the very first letter. Reading begins at AUG, and from there the letters fall into different threes.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B3.read.6 · beat 3 (sim)
Six [KEY]
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B3.read.1 · beat 3 (sim)
One — feedback: UAG does turn up just after AUG, but across two codons, GCU and AGC. Read in threes from AUG, the ribosome never meets it as one codon.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B3.read.explain · beat 3 (sim)
Six: methionine, alanine, serine, lysine, glycine, tryptophan. The first AUG sets where the threes begin and gives the chain its first amino acid. The UAG across GCU and AGC is never read as a codon; the UAG in step at the end stops the chain and adds nothing.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B4.frame1 · beat 4 (documentary)
May 1961, at the National Institutes of Health in the United States. Marshall Nirenberg and his postdoctoral fellow Heinrich Matthaei had broken open bacteria and kept the soup inside. It could still build protein, but only when they added RNA.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B4.frame2 · beat 4 (documentary)
They added RNA made of a single letter, U, repeated, along with all 20 amino acids. In each run one amino acid was radioactive, so they could tell which one ended up in the chain.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B4.frame3 · beat 4 (documentary)
At 3 a.m. on 27 May, Matthaei made phenylalanine the radioactive one. The tube with the U-only RNA read 38,000 counts per milligram of protein. The tube without it read about 70.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B4.frame4 · beat 4 (documentary)
The chain was phenylalanine and nothing else: UUU stands for phenylalanine. By 1966 the groups of Nirenberg and Har Gobind Khorana had matched every codon that stands for an amino acid. This page of Nirenberg’s notebook sets codons against amino acids.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B5.goal · beat 5 (sim)
The messenger RNA of a short gene, read into a chain of nine amino acids. Predict what each change does to the chain, then read the RNA again.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B5.stop.ask · beat 5 (sim)
What happens to the chain?
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B5.stop.nonsense · beat 5 (sim)
It stops early [KEY]
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B5.stop.missense · beat 5 (sim)
One amino acid is swapped — feedback: GAA becomes UAA, which stands for no amino acid. It is a stop codon, so the ribosome lets the chain go there.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B5.stop.silent · beat 5 (sim)
Nothing changes — feedback: Some changes leave the chain as it was, but this one turns a codon into a stop.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B5.stop.frameshift · beat 5 (sim)
Everything after it is read wrong — feedback: No letter is lost or added, so the letters after it still fall into the same threes.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B5.stop.explain · beat 5 (sim)
GAA, the codon for glutamic acid, becomes UAA, a stop codon. The ribosome lets the chain go there: three amino acids instead of nine.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B5.gap.ask · beat 5 (sim)
Back to the original RNA, with this change instead. What happens to the chain?
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B5.gap.in-frame · beat 5 (sim)
One amino acid goes missing; the rest stay the same — feedback: That needs three letters lost together, one whole codon. A single lost letter changes how every later letter falls into threes.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B5.gap.silent · beat 5 (sim)
Nothing changes — feedback: Nothing marks where the letter was. The ribosome reads whatever three letters come next.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B5.gap.nonsense · beat 5 (sim)
It stops right there — feedback: The codon at the gap becomes UUG, leucine, not a stop. A stop does turn up, three codons later.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B5.gap.frameshift · beat 5 (sim)
Everything after it is read wrong [KEY]
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B5.gap.explain · beat 5 (sim)
The ribosome still reads in threes, so every codon after the lost letter is cut differently: UUG, AAA, ACC, then UAG, a stop. Five amino acids instead of nine, and the last three are wrong. Add a letter back near that spot, and what follows falls into step again.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B6.prompt · beat 6 (flaw)
A student reasons about a change in a gene. Which step breaks?
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B6.explain · beat 6 (flaw)
GAA and GAG both stand for glutamic acid. There are 64 codons and only 20 amino acids, so most amino acids have several codons, which often differ only in their third letter. A change there often leaves the protein exactly as it was.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B6.step.a · beat 6 (flaw)
One letter of a gene changes, so its RNA now reads GAG where it read GAA.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B6.step.b · beat 6 (flaw)
The ribosome meets a different three-letter codon at that spot.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B6.step.c · beat 6 (flaw)
A different codon always puts in a different amino acid. [THE BROKEN STEP]
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B6.step.d · beat 6 (flaw)
So the protein made from this gene must be different.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B7.prompt · beat 7 (match)
Each line is one change inside the part of a gene that is read into protein. Sort the changes by what they do to the chain: the same chain, one amino acid swapped, cut short right at that codon, or out of step from there on.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B7.explain · beat 7 (match)
AAA and AAG both stand for lysine, so nothing changes. Serine to leucine and glutamic acid to lysine each swap one amino acid. UGA and UAG are stop codons, so the chain ends there. One letter lost or four added is not a whole number of codons, so every later codon is cut differently.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B7.pair.aag · beat 7 (match)
AAA (lysine) becomes AAG (lysine) → Same
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B7.pair.uga · beat 7 (match)
UGG (tryptophan) becomes UGA → Cut short
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B7.pair.lose1 · beat 7 (match)
One letter is lost → Out of step
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B7.pair.uua · beat 7 (match)
UCA (serine) becomes UUA (leucine) → Swapped
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B7.pair.add4 · beat 7 (match)
Four letters are added in a row → Out of step
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B7.pair.uag · beat 7 (match)
UAC (tyrosine) becomes UAG → Cut short
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B7.pair.aaa · beat 7 (match)
GAA (glutamic acid) becomes AAA (lysine) → Swapped
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B8.number · beat 8 (number)
A bacterial gene’s messenger RNA has 1,053 letters from the first letter of its start codon to the last letter of its stop codon. How many amino acids long is the chain it codes for? → computed answer 350 amino acids (1,053 ÷ 3 = 351 codons. The last is the stop codon, which adds no amino acid: 350.)
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### B9.idea · beat 9 (payoff)
A gene is copied into RNA, and the RNA is read three letters at a time from a start codon to a stop codon. So one changed letter can leave a protein as it was, swap one amino acid or cut the chain short, and a letter lost or added throws off everything after it.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Transcription (biology); Wikipedia: Genetic code; Nirenberg & Matthaei 1961, PNAS 47:1588; Wikipedia: Central dogma of molecular biology; Wikipedia: Frameshift mutation experiment; Crick, Barnett, Brenner & Watts-Tobin 1961, Nature 192:1227; Wikipedia: Stop codon; Wikipedia: Green fluorescent protein; Wikipedia: Insulin; Wikipedia: Titin; Wikipedia: Transfer RNA; Wikipedia: Ribosome

### R1.f1 · reel gene-to-protein-first-word
In 1961, at the National Institutes of Health, Marshall Nirenberg and Heinrich Matthaei set out to learn how RNA spells out a protein.
Cites: Wikipedia: Nirenberg and Matthaei experiment

### R1.f2 · reel gene-to-protein-first-word
They broke open bacteria and kept the soup inside, which could still build protein, but only when RNA was added.
Cites: Wikipedia: Nirenberg and Matthaei experiment

### R1.f3 · reel gene-to-protein-first-word
Into the soup went all twenty amino acids and a strand of RNA made from one letter, U, repeated.
Cites: Wikipedia: Nirenberg and Matthaei experiment

### R1.f4 · reel gene-to-protein-first-word
Out came a chain of a single amino acid, phenylalanine, again and again. Three U’s in a row spell phenylalanine.
Cites: Wikipedia: Nirenberg and Matthaei experiment

### R1.f5 · reel gene-to-protein-first-word
Within five years, Nirenberg’s group and Har Gobind Khorana’s had matched every codon that stands for an amino acid.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Genetic code

### R1.prediction · reel gene-to-protein-first-word
Two scientists add RNA spelled with one letter only, U, to a soup that can build proteins. What comes out? [KEY: A chain of one amino acid, over and over]
Cites: Wikipedia: Nirenberg and Matthaei experiment

### R1.takeaway · reel gene-to-protein-first-word
RNA made only of U built a chain made only of phenylalanine. UUU was the first word of the genetic code to be read.
Cites: Wikipedia: Nirenberg and Matthaei experiment; Wikipedia: Genetic code

### R2.f1 · reel gene-to-protein-read-in-threes
A ribosome reads messenger RNA three letters at a time. Each three-letter codon calls for one amino acid, or for a stop.
Cites: Wikipedia: Genetic code

### R2.f2 · reel gene-to-protein-read-in-threes
Transfer RNAs bring the amino acids in. Each one pairs with a codon through three letters of its own, its anticodon.
Cites: Wikipedia: Transfer RNA

### R2.f3 · reel gene-to-protein-read-in-threes
Four letters make 64 codons. Three of them mean stop, and the rest stand for 20 amino acids, so most amino acids have several.
Cites: Wikipedia: Genetic code

### R2.f4 · reel gene-to-protein-read-in-threes
Reading starts at a start codon, usually AUG, and moves on in steps of three until it reaches a stop.
Cites: Wikipedia: Genetic code

### R2.f5 · reel gene-to-protein-read-in-threes
So if one letter goes missing, every later letter falls into the wrong three, and the chain after the gap comes out wrong.
Cites: Wikipedia: Genetic code

### R2.prediction · reel gene-to-protein-read-in-threes
One letter goes missing from the middle of the stretch of a gene that codes for a protein. What happens to that protein? [KEY: Everything after the gap comes out wrong]
Cites: Wikipedia: Genetic code

### R2.takeaway · reel gene-to-protein-read-in-threes
A gene is read in threes from a fixed start, so a single letter lost from its coding part scrambles everything after it.
Cites: Wikipedia: Genetic code; Wikipedia: Transfer RNA

### I.i_vjykhmdk6x · check item (choice)
Nirenberg and Matthaei gave their protein-building soup RNA made only of U, with all 20 amino acids on hand. Why was the chain it built nothing but phenylalanine? [KEY: The only codon that RNA holds is UUU, which stands for phenylalanine] Other options: U on its own is the code for phenylalanine | Phenylalanine was the only amino acid in the soup | The soup turned the U letters into phenylalanine
    Claim: RNA made only of U offers one codon, UUU, which codes for phenylalanine.
    Explain: Read three letters at a time, RNA made only of U holds a single codon, UUU, again and again. UUU stands for phenylalanine, so the chain was phenylalanine repeated, even though all 20 amino acids were there.
Cites: Wikipedia: Nirenberg and Matthaei experiment

### I.i_9jvjhwgxmz · check item (choice)
RNA polymerase copies a gene from its template strand, which reads 3′-TCAAGCA-5′. Which RNA does it build, read 5′ to 3′? [KEY: AGUUCGU] Other options: UCAAGCA | UGCUUGA | ACGAACU
    Claim: RNA is built by pairing against the template strand, running the opposite way, with U where DNA would have T.
    Explain: Each RNA letter pairs with the template letter opposite it: T with A, A with U, C with G, G with C. The RNA grows 5′ to 3′ along a template read 3′ to 5′, so read 5′ to 3′ it lines up letter for letter: AGUUCGU, the same as the coding strand with U for T.
Cites: Wikipedia: Transcription (biology)

### I.i_58bxcex1da · check item (order)
Put the steps from gene to protein in order. RNA polymerase reads the template strand of the gene → A messenger RNA is built, with U where the DNA has T → A ribosome finds the start codon, usually AUG → Transfer RNAs bring amino acids, one for each codon in turn → A stop codon is reached and the chain is let go
    Claim: A gene is copied into messenger RNA, which a ribosome reads from start codon to stop codon, codon by codon.
    Explain: The gene is first copied into messenger RNA. A ribosome then starts at the start codon, usually AUG, and adds one amino acid for each codon, brought by transfer RNAs, until a stop codon releases the finished chain.
Cites: Wikipedia: Transcription (biology); Wikipedia: Genetic code

### I.i_1rzv7y3qg7 · check item (flaw)
Which step in this reasoning breaks? (a) From its start codon, a messenger RNA reads AUG GGC UUU CCA UAA. (b) The ribosome reads each three-letter codon in turn. (c) Every codon it reads adds one amino acid to the chain. (d) So the chain is five amino acids long. [BROKEN: c]
    Claim: A stop codon ends the chain and adds no amino acid.
    Explain: UAA is a stop codon. No amino acid matches it: it makes the ribosome let the chain go. Only AUG, GGC, UUU and CCA add amino acids, so the chain is four long.
Cites: Wikipedia: Genetic code

### I.i_1wheb6dz18 · check item (choice)
George Gamow argued that the genetic code must use words at least three letters long. What was his reasoning? [KEY: Four letters make only 4 one-letter words or 16 two-letter words, too few for 20 amino acids] Other options: Each amino acid is built from three smaller pieces | DNA is made of three strands | There are three kinds of RNA in a cell
    Claim: Four letters in words of three give 64 words, enough for 20 amino acids; shorter words give too few.
    Explain: With four letters, words of one letter give 4 possibilities and words of two give 16. Twenty amino acids need at least 20 words, so the words must be at least three letters long, and three already give 64.
Cites: Wikipedia: Nirenberg and Matthaei experiment

### I.i_vdve1ny19c · check item (number)
A messenger RNA reads GGAUGUUUGGCAAAUGGUAGC. How many amino acids long is the chain a ribosome reads from it? → computed answer 5 amino acids
    Claim: A ribosome reads from a start codon, usually the first AUG, to the first stop codon in the same frame, and the stop adds nothing.
    Explain: Here reading begins at the first AUG and goes three letters at a time. The first stop codon in step with it, UAA, UAG or UGA, ends the chain and adds no amino acid. A stop that straddles two codons does not count.
Cites: Wikipedia: Genetic code

### I.i_adjj00q1z2 · check item (choice)
Why does a ribosome begin reading at a start codon rather than at whatever letter comes first? [KEY: Letters can be cut into threes three different ways; only a fixed start gives the right ones] Other options: The first letters of every RNA are stop codons | AUG is where the RNA was joined to the DNA | Ribosomes can only read the letters A, U and G
    Claim: Reading must begin at a fixed start, because letters can be grouped into threes in three different ways.
    Explain: Any run of letters can be cut into threes starting at its first, second or third letter, and each cut gives a different chain. Starting at the start codon sets the one frame that gives the protein.
Cites: Wikipedia: Reading frame; Wikipedia: Genetic code

### I.i_dbssxgdvcr · check item (choice)
In 2025 researchers reported Syn57, a strain of E. coli whose genes no longer use 7 of the 64 codons. How can its proteins still come out right? [KEY: Each removed codon was replaced by another with the same meaning] Other options: The bacterium makes do with 7 fewer amino acids | Its ribosomes read four letters at a time instead | Those 7 codons never meant anything
    Claim: Most amino acids have several codons, so a gene can be rewritten with other codons and still give the same protein.
    Explain: Most amino acids have more than one codon, and there are three stop codons. So every use of a removed codon can be swapped for another codon with the same meaning, and the proteins come out exactly as before.
Cites: Wikipedia: Genetic code

### I.i_j5d67sq2gp · check item (choice)
In 1961 Francis Crick and his colleagues studied a virus gene changed by proflavin, which adds or removes single letters. With one extra letter the gene did not work. With three extra letters close together it often did. Why? [KEY: Three added letters make one extra codon, so the letters after them are back in step] Other options: The later letters cut out the first one | Proflavin repaired the damage it had done | The virus read the gene twice and kept the better copy
    Claim: Three single-letter insertions close together add one whole codon and restore the reading frame after them.
    Explain: One added letter shifts every codon after it. Three added letters close together add a whole codon: the stretch between them reads wrong, but everything after falls back into the right threes, so the protein mostly works.
Cites: Wikipedia: Frameshift mutation experiment

### I.i_8qhgezztrm · check item (choice)
Geneticists named the stop codon UAG “amber”. In a bacterial gene, the codon UGG, for tryptophan, mutates to UAG. What happens to the protein chain? [KEY: It ends at that codon] Other options: Tryptophan is swapped for another amino acid | Every amino acid after it changes | Nothing: UAG is read as tryptophan
    Claim: A change that turns a codon into a stop codon cuts the chain short at that point.
    Explain: UAG is a stop codon: no transfer RNA matches it, so the ribosome releases the chain there. The protein stops short at the spot where tryptophan used to be.
Cites: Wikipedia: Genetic code

### I.i_5v8z59x331 · check item (choice)
The coding sequence of a jellyfish’s green fluorescent protein, put into bacteria, makes them glow green. Why can a bacterium read it? [KEY: Jellyfish and bacteria use nearly the same genetic code] Other options: Bacteria already make a glowing protein of their own | The gene switches the bacterium’s code to the jellyfish one | The bacterium copies the jellyfish’s proteins, not its gene
    Claim: Nearly all living things use the same genetic code, so one species can translate another’s coding sequence.
    Explain: The genetic code is nearly the same in all living things, so a bacterium’s ribosomes read the jellyfish codons just as the jellyfish’s own would and build the same chain, which folds and glows.
Cites: Wikipedia: Green fluorescent protein; Wikipedia: Genetic code

### I.i_snhdvdbgvt · check item (number)
The standard form of human titin, a giant protein in muscle, is a single chain of 34,350 amino acids. How many letters of its messenger RNA run from the first letter of the start codon to the last letter of the stop codon? → computed answer 103053 letters
    Claim: A chain of n amino acids needs n codons plus a stop codon: 3 × (n + 1) letters.
    Explain: Each amino acid takes one codon of three letters, and a stop codon ends the chain. 34,351 codons of three letters each.
Cites: Wikipedia: Titin

### I.i_jkd6c3rfe7 · check item (number)
In the jellyfish Aequorea victoria, the messenger RNA for its green fluorescent protein has 717 letters from the first letter of the start codon to the last letter of the stop codon. How many amino acids long is the protein chain? → computed answer 238 amino acids
    Claim: Letters from start codon through stop codon, divided by three, minus one for the stop, give the chain length.
    Explain: Dividing by three gives the codons, and the last one is the stop codon, which adds nothing.
Cites: Wikipedia: Green fluorescent protein

### I.i_nqjaexzr9p · check item (number)
Human insulin is first made as preproinsulin, a single chain of 110 amino acids. How many letters of messenger RNA code for it, counting the start codon and the stop codon? → computed answer 333 letters
    Claim: A chain of n amino acids is coded by 3 × (n + 1) letters, the stop codon included.
    Explain: Every amino acid, the first methionine included, takes one codon, and one more codon says stop. Each codon is three letters.
Cites: Wikipedia: Insulin

### C.c_mxk8a0bma9 · case 1 (sequence engine; hash 26f8d1497671: copy it into the verdict as "caseHash")
One letter too many. The β-globin gene makes one of the two kinds of chain in adult haemoglobin. Read from its start codon, it gives a chain of 147 amino acids. In one version found in people, an extra G sits after letter 27 of the coding sequence. How many amino acids long is the chain this version makes?
    Set "Amino acids in the chain" from 1 to 160; the engine computes 22, and calls within 1 win
    Model the engine runs: {"engine":"sequence","kind":"dna","seqs":[{"id":"hbb","label":"β-globin coding sequence","letters":"ATGGTGCATCTGACTCCTGAGGAGAAGTCT…GCTAATGCCCTGGCCCACAAGTATCACTAA (444 letters)"}],"from":"start","changes":[{"id":"g","label":"An extra G after letter 27","change":{"kind":"ins","at":28,"letters":"G"}}],"window":[1,120],"measure":"length"}
    Computed after the run: From amino acid 10 on, the chain reads differently: 12 of the next 13 amino acids differ, and the chain ends after 22 amino acids instead of 147.
    Reveal: The extra G pushes every later letter one place along, so from amino acid 10 the letters fall into new threes. After 13 codons in the new threes comes TGA, a stop: 22 amino acids instead of 147. Earlier letters spell TGA too, but across two codons, so the ribosome never reads them as a stop. The shifted frame leaves no whole β-globin chain, and missing β chains cause β-thalassaemia.
    Claim: One letter added inside the coding part of a gene regroups every later letter into new threes, so the chain reads wrong from there and ends at the first stop codon in step with the new threes.
Cites: Wikipedia: Hemoglobin subunit beta; NCBI dbSNP: rs713040, rs33930165, rs334, rs35699606 and rs34716011 in HBB; NCBI RefSeq NM_000518.5: human HBB mRNA

### C.c_b03vbe8y08 · case 2 (sequence engine; hash 1c0d991d32f4: copy it into the verdict as "caseHash")
Six changes to one gene. The β-globin gene makes one of the two kinds of chain in adult haemoglobin. Each of these six single changes near the start of its coding sequence has been found in people. Which one leaves the β-globin chain exactly as it was?
    Options: Letter 19: G becomes A | Letter 9: T becomes A | Letter 27 doubled | Letter 48: G becomes A | Letter 9: T becomes C [COMPUTED WINNER] | Letter 20: A becomes T
    Model the engine runs: {"engine":"sequence","kind":"dna","seqs":[{"id":"hbb","label":"β-globin coding sequence","letters":"ATGGTGCATCTGACTCCTGAGGAGAAGTCT…GCTAATGCCCTGGCCCACAAGTATCACTAA (444 letters)"}],"from":"start","changes":[{"id":"c19","label":"Letter 19: G becomes A","change":{"kind":"sub","at":19,"to":"A"}},{"id":"c9a","label":"Letter 9: T becomes A","change":{"kind":"sub","at":9,"to":"A"}},{"id":"c27","label":"Letter 27 doubled","change":{"kind":"ins","at":28,"letters":"G"}},{"id":"c48","label":"Letter 48: G becomes A","change":{"kind":"sub","at":48,"to":"A"}},{"id":"c9","label":"Letter 9: T becomes C","change":{"kind":"sub","at":9,"to":"C"}},{"id":"c20","label":"Letter 20: A becomes T","change":{"kind":"sub","at":20,"to":"T"}}],"window":[1,60],"measure":"same"}
    Computed after the run: “Letter 9: T becomes C” leaves the chain exactly as it was. “Letter 19: G becomes A”, “Letter 9: T becomes A” and “Letter 20: A becomes T” each swap one amino acid; “Letter 27 doubled” makes everything after it read wrong; “Letter 48: G becomes A” stops the chain early.
    Reveal: CAT and CAC both spell histidine, so a C at letter 9 changes nothing; CAC is in fact the more common version in most of the world. An A there gives CAA, glutamine. Letter 48 is a third letter too, but it turns TGG, tryptophan, into TGA, a stop. Letters 19 and 20 share one codon, GAG, glutamic acid: G to A gives lysine (haemoglobin C), A to T valine (haemoglobin S, the sickle-cell change).
    Claim: A change in a codon’s third letter often leaves the amino acid the same, but only the new codon tells: a single-letter change can also swap an amino acid, stop the chain or shift the frame.
Cites: Wikipedia: Hemoglobin subunit beta; NCBI dbSNP: rs713040, rs33930165, rs334, rs35699606 and rs34716011 in HBB; NCBI ClinVar VCV000015296: HBB c.9T>A (Hb Okayama); NCBI RefSeq NM_000518.5: human HBB mRNA

### C.c_5hvvxdp841 · case 3 (sequence engine; hash a9a854c8155f: copy it into the verdict as "caseHash")
The stop that wasn’t. One of the two alpha-globin genes makes the other kind of chain in haemoglobin: 141 amino acids long once its first methionine is trimmed off. In haemoglobin Constant Spring, the first letter of this gene’s stop codon, TAA, is a C instead of a T. How many amino acids long is that chain, counted the same way?
    Set "Amino acids in the chain" from 120 to 200; the engine computes 172, and calls within 1 win
    Model the engine runs: {"engine":"sequence","kind":"dna","seqs":[{"id":"hba2","label":"alpha-globin’s coding letters, then the tail copied into its RNA","letters":"ATGGTGCTGTCTCCTGCCGACAAGACCAAC…GGTCTTTGAATAAAGTCTGAGTGGGCAGCA (539 letters)"}],"from":"start","trimFirst":true,"changes":[{"id":"cs","label":"Letter 427: the T of the stop codon becomes C","change":{"kind":"sub","at":427,"to":"C"}}],"window":[397,539],"measure":"length"}
    Computed after the run: The stop codon is gone, so reading runs on: 172 amino acids instead of 141.
    Reveal: TAA, a stop, becomes CAA, the codon for glutamine. Nothing tells the ribosome to let go, so it reads on in threes into the tail of the messenger RNA, letters copied from the gene but normally never read, until it meets the next stop in step, 31 codons on. The chain comes out 31 amino acids too long. It is unstable and little of it is made, so people who carry it can have a form of alpha-thalassaemia. The variant is named after the Constant Spring district of Jamaica.
    Claim: A ribosome reads in threes until it meets a stop codon, so a lost stop lets the chain run on to the next stop in step.
Cites: Wikipedia: Hemoglobin Constant Spring; Clegg, Weatherall & Milner 1971, Nature 234:337; NCBI RefSeq NM_000517.6: human HBA2 mRNA

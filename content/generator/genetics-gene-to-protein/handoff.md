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

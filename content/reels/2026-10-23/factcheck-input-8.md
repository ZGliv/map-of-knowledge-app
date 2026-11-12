# Adversarial fact-check (round 8: only what changed after round 7's fixes): reels for 2026-10-23

You are an independent checker. You did not write these reels. Your job is to BREAK them: for every
unit below, look for a claim that is wrong, overstated, missing a qualifier, unsupported by its quote,
a quote that is not word for word in its pinned source, a prediction key that is not clearly right
(or a wrong choice that is arguably right), alt text that describes something the picture does not
show, and a place tag that does not fit. Default to suspicion; "supported" needs evidence you can
point to. Teaching simplifications are fine if they are true; say "imprecise" when a qualifier is missing.

Pinned sources (text in content/reels/2026-10-23/sources/<file>, field "text"):
- Wikipedia: James Ussher → sources/Wikipedia_James_Ussher.json
- Wikipedia: Age of Earth → sources/Wikipedia_Age_of_Earth.json
- https://commons.wikimedia.org/wiki/File:Patricia_2015-10-23_1730Z.jpg → sources/https_commons.wikimedia.org_wiki_File_Patricia_2015-10-23_1730Z.jpg.json
- Wikipedia: Hurricane Patricia → sources/Wikipedia_Hurricane_Patricia.json
- Wikipedia: Alberto Santos-Dumont → sources/Wikipedia_Alberto_Santos-Dumont.json
- Wikipedia: Santos-Dumont 14-bis → sources/Wikipedia_Santos-Dumont_14-bis.json
- Wikipedia: Biplane → sources/Wikipedia_Biplane.json
- https://commons.wikimedia.org/wiki/File:14-bis_de_Alberto_Santos_Dumont.jpg → sources/https_commons.wikimedia.org_wiki_File_14-bis_de_Alberto_Santos_Dumont.jpg.json
- Wikipedia: Evolution as fact and theory → sources/Wikipedia_Evolution_as_fact_and_theory.json
- Wikipedia: Black Death in England → sources/Wikipedia_Black_Death_in_England.json
- Wikipedia: Auld Alliance → sources/Wikipedia_Auld_Alliance.json
- Wikipedia: Survival of the fittest → sources/Wikipedia_Survival_of_the_fittest.json
Image licence snapshots: content/reels/2026-10-23/media.json. You may also look things up on the web
to break a claim (cite what you find), but a claim stands or falls on its pinned source.

Write content/reels/2026-10-23/factcheck-8.json:
{ "checker": "<who you are>", "checkedAt": "<ISO time>", "units": [
  { "id": "<unit id>", "verdict": "supported" | "imprecise" | "unsupported" | "wrong" | "quote-mismatch",
    "evidence": "<a short quote or [source] reference>", "note": "<what is wrong, if anything>", "fix": "<the smallest change that makes it right>" } ] }
One entry for every unit, in order.

## Units (4, 7 reels)

### 2026-10-23-the-first-flight-anyone-certified/f5 · frame 5 caption
      Brazil counts him a national hero, and many there hold he beat the Wright brothers to showing a practical aeroplane.
    Rests on:
      brazil: He is a national hero in Brazil, where many hold he preceded the Wright brothers [Wikipedia: Alberto Santos-Dumont: “Santos-Dumont is a national hero in Brazil, where it is popularly held that he preceded the Wright brothers in demonstrating a practical aeroplane.”]

### 2026-10-23-whose-words-were-they/f1 · frame 1 caption (and what the voice says)
      "Survival of the fittest" sounds like Darwin. The words are Herbert Spencer's, from 1864.
      spoken: Survival of the fittest sounds like Darwin. The words are Herbert Spencer's, from eighteen sixty-four.
    Rests on:
      spencer: Herbert Spencer first used the phrase, in Principles of Biology (1864) [Wikipedia: Survival of the fittest: “Herbert Spencer first used the phrase, after reading Charles Darwin's On the Origin of Species, in his Principles of Biology (1864)”]

### 2026-10-23-whose-words-were-they/f3 · frame 3 caption (and what the voice says)
      How do we know Darwin borrowed it? His letters. In July 1866 Wallace wrote to him with a worry.
      spoken: How do we know Darwin borrowed it? His letters. In July eighteen sixty-six Wallace wrote to him with a worry.
    Rests on:
      wallace: In July 1866 Wallace wrote that readers took 'natural selection' to personify nature, and suggested Spencer's term [Wikipedia: Survival of the fittest: “In July 1866, Alfred Russel Wallace wrote to Darwin about readers thinking that the phrase "natural selection" personified nature as "selecting" and said this misconception could be avoided "by adopting Spencer's term"”]

### 2026-10-23-whose-words-were-they/f5 · frame 5 caption (and what the voice says)
      Darwin replied that the phrase's advantages had not occurred to him until that letter. He added it to the fifth edition of On the Origin of Species, in 1869.
      spoken: Darwin replied that the phrase's advantages had not occurred to him until that letter. He added it to the fifth edition of On the Origin of Species, in eighteen sixty-nine.
    Rests on:
      reply: Darwin replied that the advantages of Spencer's phrase had not occurred to him till he read Wallace's letter [Wikipedia: Survival of the fittest: “I fully agree with all that you say on the advantages of H. Spencer's excellent expression of 'the survival of the fittest'. This however had not occurred to me till reading your letter.”]
      fifth: Darwin introduced the phrase in the fifth edition of the Origin, 1869 [Wikipedia: Survival of the fittest: “In On the Origin of Species, he introduced the phrase in the fifth edition published in 1869”]

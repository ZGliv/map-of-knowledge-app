# Adversarial fact-check (round 7: only what changed after round 6's fixes): reels for 2026-10-23

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

Write content/reels/2026-10-23/factcheck-7.json:
{ "checker": "<who you are>", "checkedAt": "<ISO time>", "units": [
  { "id": "<unit id>", "verdict": "supported" | "imprecise" | "unsupported" | "wrong" | "quote-mismatch",
    "evidence": "<a short quote or [source] reference>", "note": "<what is wrong, if anything>", "fix": "<the smallest change that makes it right>" } ] }
One entry for every unit, in order.

## Units (5, 7 reels)

### 2026-10-23-the-first-flight-anyone-certified/f1 · frame 1 caption (and what the voice says)
      This is the 14-bis, a biplane Alberto Santos-Dumont designed and built.
      spoken: This is the fourteen-bees, a biplane Alberto Santos-Doomon designed and built.
    Rests on:
      design: The 14-bis was a canard biplane Santos-Dumont designed and built [Wikipedia: Santos-Dumont 14-bis: “was a pioneer era, canard-style biplane designed and built by Brazilian aviation pioneer Alberto Santos-Dumont”]

### 2026-10-23-the-first-flight-anyone-certified/f2 · frame 2 caption (and what the voice says)
      Paris, 23 October 1906: it flew about 60 metres, a few metres up, with no catapult or ramp.
      spoken: Paris, the twenty-third of October, nineteen oh-six: it flew about sixty metres, a few metres up, with no catapult or ramp.
    Rests on:
      first: On 23 October 1906, at the Bagatelle Gamefield in Paris, the 14-bis flew about 60 metres a few metres up, taking off without a launch system [Wikipedia: Alberto Santos-Dumont: “on 23 October 1906 flew about 60 metres at a height of two to three metres with the fixed-wing 14-bis (also dubbed the Oiseau de proie—"bird of prey") at the Bagatelle Gamefield in Paris, taking off unassisted by an external launch system.”]
      unaided: It took off without ramps, catapults or other devices [Wikipedia: Alberto Santos-Dumont: “The plane lifted off and flew for 60 metres, without taking advantage of headwinds, ramps, catapults, slopes, or other devices.”]

### 2026-10-23-the-first-flight-anyone-certified/f3 · frame 3 caption
      On 12 November a crowd watched him fly 220 metres in 21 seconds. This photo is from that day.
    Rests on:
      crowd: On 12 November, before a crowd, he flew 220 metres [Wikipedia: Alberto Santos-Dumont: “On 12 November in front of a crowd, he flew 220 metres at a height of six metres.”]
      seconds: The 220-metre flight lasted 21 seconds [Wikipedia: Alberto Santos-Dumont: “he took off against the wind and flew 220 metres, for 21 seconds at an average speed of 37.4 km/h”]
      photo: The photograph is from 12 November 1906, the day of Santos-Dumont's new triumph [https://commons.wikimedia.org/wiki/File:14-bis_de_Alberto_Santos_Dumont.jpg: “Nouveau triomphe de Santos-Dumont. 12 novembre 1906”]

### 2026-10-23-the-first-flight-anyone-certified/f5 · frame 5 caption
      Brazil counts him a national hero, and many there hold he beat the Wright brothers to a practical aeroplane.
    Rests on:
      brazil: He is a national hero in Brazil, where many hold he preceded the Wright brothers [Wikipedia: Alberto Santos-Dumont: “Santos-Dumont is a national hero in Brazil, where it is popularly held that he preceded the Wright brothers in demonstrating a practical aeroplane.”]

### 2026-10-23-whose-words-were-they/f5 · frame 5 caption (and what the voice says)
      Darwin replied that the phrase's advantages had not occurred to him until that letter. He put it in the Origin's fifth edition, in 1869.
      spoken: Darwin replied that the phrase's advantages had not occurred to him until that letter. He put it in the Origin's fifth edition, in eighteen sixty-nine.
    Rests on:
      reply: Darwin replied that the advantages of Spencer's phrase had not occurred to him till he read Wallace's letter [Wikipedia: Survival of the fittest: “I fully agree with all that you say on the advantages of H. Spencer's excellent expression of 'the survival of the fittest'. This however had not occurred to me till reading your letter.”]
      fifth: Darwin introduced the phrase in the fifth edition of the Origin, 1869 [Wikipedia: Survival of the fittest: “In On the Origin of Species, he introduced the phrase in the fifth edition published in 1869”]

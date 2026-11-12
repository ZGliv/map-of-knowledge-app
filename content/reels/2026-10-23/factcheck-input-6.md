# Adversarial fact-check (round 6: only what changed after round 5's fixes): reels for 2026-10-23

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

Write content/reels/2026-10-23/factcheck-6.json:
{ "checker": "<who you are>", "checkedAt": "<ISO time>", "units": [
  { "id": "<unit id>", "verdict": "supported" | "imprecise" | "unsupported" | "wrong" | "quote-mismatch",
    "evidence": "<a short quote or [source] reference>", "note": "<what is wrong, if anything>", "fix": "<the smallest change that makes it right>" } ] }
One entry for every unit, in order.

## Units (4, 7 reels)

### 2026-10-23-the-fastest-wind-on-record/title · title
      A storm that grew in a day
    Rests on:
      photo: The satellite image shows Patricia just after its peak, nearing western Mexico on 23 October 2015 [https://commons.wikimedia.org/wiki/File:Patricia_2015-10-23_1730Z.jpg: “Hurricane Patricia shortly after peak intensity and approaching Western Mexico on October 23, 2015.”]
      growth: Patricia went from tropical storm to Category 5 hurricane in 24 hours [Wikipedia: Hurricane Patricia: “Patricia grew from a tropical storm to a Category 5 hurricane in just 24 hours”]
      peak: On 23 October its maximum sustained winds peaked at 345 km/h [Wikipedia: Hurricane Patricia: “On October 23, the hurricane achieved its record peak intensity with maximum sustained winds of 215 mph (345 km/h).”]
      record: Its one-minute sustained winds are the highest ever reliably observed or estimated in a tropical cyclone [Wikipedia: Hurricane Patricia: “Patricia's one-minute maximum sustained winds ranked as the highest ever reliably observed or estimated in a tropical cyclone”]
      turn: Near its peak it turned towards Mexico [Wikipedia: Hurricane Patricia: “As Patricia neared its peak strength, the cyclone began to turn east-northeast towards Mexico.”]
      landfall: After dramatic weakening it made landfall near Cuixmala, Jalisco, with 240 km/h winds [Wikipedia: Hurricane Patricia: “Late on October 23, dramatic weakening ensued and Patricia made landfall near Cuixmala, Jalisco, with winds of 150 mph (240 km/h).”]
      mountains: It weakened very fast over Mexico's mountainous terrain [Wikipedia: Hurricane Patricia: “Patricia continued to weaken extremely quickly, faster than it had intensified, as it interacted with the mountainous terrain of Mexico.”]
      faded: Within 24 hours of landfall it was a tropical depression [Wikipedia: Hurricane Patricia: “Within 24 hours of moving ashore, Patricia weakened into a tropical depression”]

### 2026-10-23-the-first-flight-anyone-certified/f6 · frame 6 caption (and what the voice says)
      The first powered, controlled aeroplane to fly was the Wright brothers' Flyer. Santos-Dumont made the first aeroplane flight that a record body certified.
      spoken: The first powered, controlled aeroplane to fly was the Wright brothers' Flyer. Santos-Doomon made the first aeroplane flight that a record body certified.
    Rests on:
      wright: The Wright Flyer was the first powered, controlled aeroplane to fly [Wikipedia: Biplane: “The first powered, controlled aeroplane to fly, the Wright Flyer, used a biplane wing arrangement”]
      certified: They were the first heavier-than-air flights certified by the Aeroclub of France, and the first of their kind recognised by the FAI [Wikipedia: Alberto Santos-Dumont: “These were the first heavier-than-air flights certified by the Aeroclub of France, the first such flights officially witnessed by an aeronautics recordkeeping body, and the first of their kind recognised by the Fédération Aéronautique Internationale.”]

### 2026-10-23-only-a-theory/media.m4 · image: alt text against the file description; credit and licence against Commons
      alt: Cast of a Tiktaalik fossil skull: a long, flat head of tan and brown bone, with the start of the body behind it
      credit: James St John, 2010, cropped · CC BY 2.0 · https://commons.wikimedia.org/wiki/File:Tiktaalik_roseae_(fish_to_amphibian_transitional_fossil)_(Fram_Formation,_Upper_Devonian;_Ellesmere_Island,_Arctic_Canada)_2_(49755646886).jpg
      Commons said: CC BY 2.0, 2859×2000

### 2026-10-23-what-the-skeletons-said/title · title
      Naming the Great Pestilence
    Rests on:
      war: Its most immediate consequence was a halt to the Hundred Years' War campaigns [Wikipedia: Black Death in England: “The most immediate consequence was a halt to the campaigns of the Hundred Years' War.”]
      toll: An estimated 40–60% of England's population died [Wikipedia: Black Death in England: “a figure of 40–60% of the population is widely accepted”]
      names: Contemporaries called it the Great Pestilence or the Great Mortality, not the Black Death [Wikipedia: Black Death in England: “was not used by contemporaries, who preferred such names as the "Great Pestilence" or the "Great Mortality"”]
      later: The name Black Death became common only centuries later [Wikipedia: Black Death in England: “It was not until the 17th century that the term under which we know the outbreak today became common”]
      dna: A 2011 study found Yersinia pestis DNA in skeletons from the Black Death cemetery in East Smithfield, London [Wikipedia: Black Death in England: “A study reported in 2011 of skeletons exhumed from the Black Death cemetery in East Smithfield, London, found Yersinia pestis DNA.”]
      bacterium: Plague is caused by Yersinia pestis bacteria [Wikipedia: Black Death in England: “It is generally agreed today that the disease in question was plague, caused by Yersinia pestis bacteria.”]
      strain: Genotyping showed a then newly evolved strain, ancestral to modern strains [Wikipedia: Black Death in England: “Genotyping showed that it was [at that time] a newly evolved strain, ancestor of all modern strains”]
      defence: Modern medicine suggests a new strain met immune systems with little or no defence, which may help explain the high death rates [Wikipedia: Black Death in England: “because it was a new strain, the human immune system would have had little or no defence against it, helping to explain the plague's virulence and high death rates”]

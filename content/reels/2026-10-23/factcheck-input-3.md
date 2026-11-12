# Adversarial fact-check (round 3: only what changed after round 2's fixes): reels for 2026-10-23

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

Write content/reels/2026-10-23/factcheck-3.json:
{ "checker": "<who you are>", "checkedAt": "<ISO time>", "units": [
  { "id": "<unit id>", "verdict": "supported" | "imprecise" | "unsupported" | "wrong" | "quote-mismatch",
    "evidence": "<a short quote or [source] reference>", "note": "<what is wrong, if anything>", "fix": "<the smallest change that makes it right>" } ] }
One entry for every unit, in order.

## Units (18, 7 reels)

### 2026-10-23-the-night-the-world-began/f5 · frame 5 caption
      Radiometric dating puts Earth's age at about 4.54 billion years.
    Rests on:
      age: Earth is estimated to be about 4.54 billion years old [Wikipedia: Age of Earth: “The age of Earth is estimated to be 4.54 ± 0.05 billion years.”]
      method: The estimate rests on radiometric dating of meteorites [Wikipedia: Age of Earth: “Estimates are based on radiometric dating of meteoritic material”]

### 2026-10-23-the-night-the-world-began/prediction · prediction (the key must be right, every other choice wrong)
      By Ussher's date the world would be about 6,000 years old. How old does radiometric dating make Earth?
      KEY: About 4.5 billion years
      Others: About 10,000 years | About 4.5 million years
    Rests on:
      age: Earth is estimated to be about 4.54 billion years old [Wikipedia: Age of Earth: “The age of Earth is estimated to be 4.54 ± 0.05 billion years.”]

### 2026-10-23-the-night-the-world-began/media.m1 · image: alt text against the file description; credit and licence against Commons
      alt: Portrait of James Ussher holding a small book, in a black cap, white ruff and white-sleeved bishop's robes
      credit: Attributed to Cornelis Janssens van Ceulen, 1641 · Public domain · https://commons.wikimedia.org/wiki/File:James_Ussher_portrait.jpg
      Commons said: Public domain, 1200×1444

### 2026-10-23-the-fastest-wind-on-record/takeaway · takeaway
      In about a day and a half Patricia grew from a tropical storm to the strongest sustained winds ever reliably recorded. Within a day of landfall it was only a tropical depression.
    Rests on:
      photo: The satellite image shows Patricia just after its peak, nearing western Mexico on 23 October 2015 [https://commons.wikimedia.org/wiki/File:Patricia_2015-10-23_1730Z.jpg: “Hurricane Patricia shortly after peak intensity and approaching Western Mexico on October 23, 2015.”]
      growth: Patricia went from tropical storm to Category 5 hurricane in 24 hours [Wikipedia: Hurricane Patricia: “Patricia grew from a tropical storm to a Category 5 hurricane in just 24 hours”]
      peak: On 23 October its maximum sustained winds peaked at 345 km/h [Wikipedia: Hurricane Patricia: “On October 23, the hurricane achieved its record peak intensity with maximum sustained winds of 215 mph (345 km/h).”]
      record: Its one-minute sustained winds are the highest ever reliably observed or estimated in a tropical cyclone [Wikipedia: Hurricane Patricia: “Patricia's one-minute maximum sustained winds ranked as the highest ever reliably observed or estimated in a tropical cyclone”]
      turn: Near its peak it turned towards Mexico [Wikipedia: Hurricane Patricia: “As Patricia neared its peak strength, the cyclone began to turn east-northeast towards Mexico.”]
      landfall: After dramatic weakening it made landfall near Cuixmala, Jalisco, with 240 km/h winds [Wikipedia: Hurricane Patricia: “Late on October 23, dramatic weakening ensued and Patricia made landfall near Cuixmala, Jalisco, with winds of 150 mph (240 km/h).”]
      mountains: It weakened very fast over Mexico's mountainous terrain [Wikipedia: Hurricane Patricia: “Patricia continued to weaken extremely quickly, faster than it had intensified, as it interacted with the mountainous terrain of Mexico.”]
      faded: Within 24 hours of landfall it was a tropical depression [Wikipedia: Hurricane Patricia: “Within 24 hours of moving ashore, Patricia weakened into a tropical depression”]

### 2026-10-23-the-first-flight-anyone-certified/title · title
      The first aeroplane flights on the record
    Rests on:
      first: On 23 October 1906, at the Bagatelle Gamefield in Paris, the 14-bis flew about 60 metres a few metres up, taking off without a launch system [Wikipedia: Alberto Santos-Dumont: “on 23 October 1906 flew about 60 metres at a height of two to three metres with the fixed-wing 14-bis (also dubbed the Oiseau de proie—"bird of prey") at the Bagatelle Gamefield in Paris, taking off unassisted by an external launch system.”]
      design: The 14-bis was a canard biplane Santos-Dumont designed and built [Wikipedia: Santos-Dumont 14-bis: “was a pioneer era, canard-style biplane designed and built by Brazilian aviation pioneer Alberto Santos-Dumont”]
      unaided: It took off without ramps, catapults or other devices [Wikipedia: Alberto Santos-Dumont: “The plane lifted off and flew for 60 metres, without taking advantage of headwinds, ramps, catapults, slopes, or other devices.”]
      crowd: On 12 November, before a crowd, he flew 220 metres [Wikipedia: Alberto Santos-Dumont: “On 12 November in front of a crowd, he flew 220 metres at a height of six metres.”]
      seconds: The 220-metre flight lasted 21 seconds [Wikipedia: Alberto Santos-Dumont: “he took off against the wind and flew 220 metres, for 21 seconds at an average speed of 37.4 km/h”]
      certified: They were the first heavier-than-air flights certified by the Aeroclub of France, and the first of their kind recognised by the FAI [Wikipedia: Alberto Santos-Dumont: “These were the first heavier-than-air flights certified by the Aeroclub of France, the first such flights officially witnessed by an aeronautics recordkeeping body, and the first of their kind recognised by the Fédération Aéronautique Internationale.”]
      brazil: He is a national hero in Brazil, where many hold he preceded the Wright brothers [Wikipedia: Alberto Santos-Dumont: “Santos-Dumont is a national hero in Brazil, where it is popularly held that he preceded the Wright brothers in demonstrating a practical aeroplane.”]
      wright: The Wright Flyer was the first powered, controlled aeroplane to fly [Wikipedia: Biplane: “The first powered, controlled aeroplane to fly, the Wright Flyer, used a biplane wing arrangement”]
      photo: The photograph is from 12 November 1906, the day of Santos-Dumont's new triumph [https://commons.wikimedia.org/wiki/File:14-bis_de_Alberto_Santos_Dumont.jpg: “Nouveau triomphe de Santos-Dumont. 12 novembre 1906”]

### 2026-10-23-the-first-flight-anyone-certified/f3 · frame 3 caption
      On 12 November a crowd watched him fly 220 metres, in 21 seconds. This photograph is from that day.
    Rests on:
      crowd: On 12 November, before a crowd, he flew 220 metres [Wikipedia: Alberto Santos-Dumont: “On 12 November in front of a crowd, he flew 220 metres at a height of six metres.”]
      seconds: The 220-metre flight lasted 21 seconds [Wikipedia: Alberto Santos-Dumont: “he took off against the wind and flew 220 metres, for 21 seconds at an average speed of 37.4 km/h”]
      photo: The photograph is from 12 November 1906, the day of Santos-Dumont's new triumph [https://commons.wikimedia.org/wiki/File:14-bis_de_Alberto_Santos_Dumont.jpg: “Nouveau triomphe de Santos-Dumont. 12 novembre 1906”]

### 2026-10-23-the-first-flight-anyone-certified/f4 · frame 4 caption
      France's Aero-Club certified both flights, and the world body for air records recognised them as the first of their kind.
    Rests on:
      certified: They were the first heavier-than-air flights certified by the Aeroclub of France, and the first of their kind recognised by the FAI [Wikipedia: Alberto Santos-Dumont: “These were the first heavier-than-air flights certified by the Aeroclub of France, the first such flights officially witnessed by an aeronautics recordkeeping body, and the first of their kind recognised by the Fédération Aéronautique Internationale.”]

### 2026-10-23-the-first-flight-anyone-certified/f6 · frame 6 caption
      The first powered, controlled aeroplane to fly was the Wright brothers' Flyer. His were the first flights a record body certified.
    Rests on:
      wright: The Wright Flyer was the first powered, controlled aeroplane to fly [Wikipedia: Biplane: “The first powered, controlled aeroplane to fly, the Wright Flyer, used a biplane wing arrangement”]
      certified: They were the first heavier-than-air flights certified by the Aeroclub of France, and the first of their kind recognised by the FAI [Wikipedia: Alberto Santos-Dumont: “These were the first heavier-than-air flights certified by the Aeroclub of France, the first such flights officially witnessed by an aeronautics recordkeeping body, and the first of their kind recognised by the Fédération Aéronautique Internationale.”]

### 2026-10-23-the-first-flight-anyone-certified/prediction · prediction (the key must be right, every other choice wrong)
      On 23 October 1906 Alberto Santos-Dumont took off in this biplane, the 14-bis. How far did it fly?
      KEY: About 60 metres
      Others: About 6 kilometres | About 60 kilometres
    Rests on:
      first: On 23 October 1906, at the Bagatelle Gamefield in Paris, the 14-bis flew about 60 metres a few metres up, taking off without a launch system [Wikipedia: Alberto Santos-Dumont: “on 23 October 1906 flew about 60 metres at a height of two to three metres with the fixed-wing 14-bis (also dubbed the Oiseau de proie—"bird of prey") at the Bagatelle Gamefield in Paris, taking off unassisted by an external launch system.”]

### 2026-10-23-the-first-flight-anyone-certified/takeaway · takeaway
      The Wright Flyer flew first. Santos-Dumont's 14-bis made the first aeroplane flights that an official body certified.
    Rests on:
      first: On 23 October 1906, at the Bagatelle Gamefield in Paris, the 14-bis flew about 60 metres a few metres up, taking off without a launch system [Wikipedia: Alberto Santos-Dumont: “on 23 October 1906 flew about 60 metres at a height of two to three metres with the fixed-wing 14-bis (also dubbed the Oiseau de proie—"bird of prey") at the Bagatelle Gamefield in Paris, taking off unassisted by an external launch system.”]
      design: The 14-bis was a canard biplane Santos-Dumont designed and built [Wikipedia: Santos-Dumont 14-bis: “was a pioneer era, canard-style biplane designed and built by Brazilian aviation pioneer Alberto Santos-Dumont”]
      unaided: It took off without ramps, catapults or other devices [Wikipedia: Alberto Santos-Dumont: “The plane lifted off and flew for 60 metres, without taking advantage of headwinds, ramps, catapults, slopes, or other devices.”]
      crowd: On 12 November, before a crowd, he flew 220 metres [Wikipedia: Alberto Santos-Dumont: “On 12 November in front of a crowd, he flew 220 metres at a height of six metres.”]
      seconds: The 220-metre flight lasted 21 seconds [Wikipedia: Alberto Santos-Dumont: “he took off against the wind and flew 220 metres, for 21 seconds at an average speed of 37.4 km/h”]
      certified: They were the first heavier-than-air flights certified by the Aeroclub of France, and the first of their kind recognised by the FAI [Wikipedia: Alberto Santos-Dumont: “These were the first heavier-than-air flights certified by the Aeroclub of France, the first such flights officially witnessed by an aeronautics recordkeeping body, and the first of their kind recognised by the Fédération Aéronautique Internationale.”]
      brazil: He is a national hero in Brazil, where many hold he preceded the Wright brothers [Wikipedia: Alberto Santos-Dumont: “Santos-Dumont is a national hero in Brazil, where it is popularly held that he preceded the Wright brothers in demonstrating a practical aeroplane.”]
      wright: The Wright Flyer was the first powered, controlled aeroplane to fly [Wikipedia: Biplane: “The first powered, controlled aeroplane to fly, the Wright Flyer, used a biplane wing arrangement”]
      photo: The photograph is from 12 November 1906, the day of Santos-Dumont's new triumph [https://commons.wikimedia.org/wiki/File:14-bis_de_Alberto_Santos_Dumont.jpg: “Nouveau triomphe de Santos-Dumont. 12 novembre 1906”]

### 2026-10-23-the-first-flight-anyone-certified/claim.certified · claim and its quote (the quote must support the claim, and be in the source)
      They were the first heavier-than-air flights certified by the Aeroclub of France, and the first of their kind recognised by the FAI
      quote: “These were the first heavier-than-air flights certified by the Aeroclub of France, the first such flights officially witnessed by an aeronautics recordkeeping body, and the first of their kind recognised by the Fédération Aéronautique Internationale.”
      source: Wikipedia: Alberto Santos-Dumont

### 2026-10-23-the-first-flight-anyone-certified/claim.photo · claim and its quote (the quote must support the claim, and be in the source)
      The photograph is from 12 November 1906, the day of Santos-Dumont's new triumph
      quote: “Nouveau triomphe de Santos-Dumont. 12 novembre 1906”
      source: https://commons.wikimedia.org/wiki/File:14-bis_de_Alberto_Santos_Dumont.jpg

### 2026-10-23-only-a-theory/media.m5 · image: alt text against the file description; credit and licence against Commons
      alt: Illustration of Tiktaalik, an early fish with stubby, leg-like fins, at the edge of shallow water
      credit: Zina Deretsky, National Science Foundation, 2009 · Public domain · https://commons.wikimedia.org/wiki/File:Tiktaalik_roseae_life_restor.jpg
      Commons said: Public domain, 1890×1092

### 2026-10-23-what-the-skeletons-said/title · title
      What the skeletons said
    Rests on:
      war: Its most immediate consequence was a halt to the Hundred Years' War campaigns [Wikipedia: Black Death in England: “The most immediate consequence was a halt to the campaigns of the Hundred Years' War.”]
      toll: An estimated 40–60% of England's population died [Wikipedia: Black Death in England: “a figure of 40–60% of the population is widely accepted”]
      names: Contemporaries called it the Great Pestilence or the Great Mortality, not the Black Death [Wikipedia: Black Death in England: “was not used by contemporaries, who preferred such names as the "Great Pestilence" or the "Great Mortality"”]
      later: The name Black Death became common only centuries later [Wikipedia: Black Death in England: “It was not until the 17th century that the term under which we know the outbreak today became common”]
      dna: A 2011 study found Yersinia pestis DNA in skeletons from the Black Death cemetery in East Smithfield, London [Wikipedia: Black Death in England: “A study reported in 2011 of skeletons exhumed from the Black Death cemetery in East Smithfield, London, found Yersinia pestis DNA.”]
      bacterium: Plague is caused by Yersinia pestis bacteria [Wikipedia: Black Death in England: “It is generally agreed today that the disease in question was plague, caused by Yersinia pestis bacteria.”]
      strain: Genotyping showed a then newly evolved strain, ancestral to modern strains [Wikipedia: Black Death in England: “Genotyping showed that it was [at that time] a newly evolved strain, ancestor of all modern strains”]
      defence: Modern medicine suggests a new strain met immune systems with little or no defence, which may help explain the high death rates [Wikipedia: Black Death in England: “because it was a new strain, the human immune system would have had little or no defence against it, helping to explain the plague's virulence and high death rates”]

### 2026-10-23-what-the-skeletons-said/f2 · frame 2 caption
      People at the time called it the Great Pestilence or the Great Mortality. The name Black Death came centuries later.
    Rests on:
      names: Contemporaries called it the Great Pestilence or the Great Mortality, not the Black Death [Wikipedia: Black Death in England: “was not used by contemporaries, who preferred such names as the "Great Pestilence" or the "Great Mortality"”]
      later: The name Black Death became common only centuries later [Wikipedia: Black Death in England: “It was not until the 17th century that the term under which we know the outbreak today became common”]

### 2026-10-23-what-the-skeletons-said/f5 · frame 5 caption
      Its genes showed a strain that was new at the time. Many modern plague strains descend from it.
    Rests on:
      strain: Genotyping showed a then newly evolved strain, ancestral to modern strains [Wikipedia: Black Death in England: “Genotyping showed that it was [at that time] a newly evolved strain, ancestor of all modern strains”]

### 2026-10-23-what-the-skeletons-said/takeaway · takeaway
      The dead themselves named the killer: DNA from their skeletons showed Yersinia pestis, in a strain new at the time.
    Rests on:
      war: Its most immediate consequence was a halt to the Hundred Years' War campaigns [Wikipedia: Black Death in England: “The most immediate consequence was a halt to the campaigns of the Hundred Years' War.”]
      toll: An estimated 40–60% of England's population died [Wikipedia: Black Death in England: “a figure of 40–60% of the population is widely accepted”]
      names: Contemporaries called it the Great Pestilence or the Great Mortality, not the Black Death [Wikipedia: Black Death in England: “was not used by contemporaries, who preferred such names as the "Great Pestilence" or the "Great Mortality"”]
      later: The name Black Death became common only centuries later [Wikipedia: Black Death in England: “It was not until the 17th century that the term under which we know the outbreak today became common”]
      dna: A 2011 study found Yersinia pestis DNA in skeletons from the Black Death cemetery in East Smithfield, London [Wikipedia: Black Death in England: “A study reported in 2011 of skeletons exhumed from the Black Death cemetery in East Smithfield, London, found Yersinia pestis DNA.”]
      bacterium: Plague is caused by Yersinia pestis bacteria [Wikipedia: Black Death in England: “It is generally agreed today that the disease in question was plague, caused by Yersinia pestis bacteria.”]
      strain: Genotyping showed a then newly evolved strain, ancestral to modern strains [Wikipedia: Black Death in England: “Genotyping showed that it was [at that time] a newly evolved strain, ancestor of all modern strains”]
      defence: Modern medicine suggests a new strain met immune systems with little or no defence, which may help explain the high death rates [Wikipedia: Black Death in England: “because it was a new strain, the human immune system would have had little or no defence against it, helping to explain the plague's virulence and high death rates”]

### 2026-10-23-what-the-skeletons-said/claim.later · claim and its quote (the quote must support the claim, and be in the source)
      The name Black Death became common only centuries later
      quote: “It was not until the 17th century that the term under which we know the outbreak today became common”
      source: Wikipedia: Black Death in England

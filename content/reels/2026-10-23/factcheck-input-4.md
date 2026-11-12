# Adversarial fact-check (round 4: only what changed after round 3's fixes): reels for 2026-10-23

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

Write content/reels/2026-10-23/factcheck-4.json:
{ "checker": "<who you are>", "checkedAt": "<ISO time>", "units": [
  { "id": "<unit id>", "verdict": "supported" | "imprecise" | "unsupported" | "wrong" | "quote-mismatch",
    "evidence": "<a short quote or [source] reference>", "note": "<what is wrong, if anything>", "fix": "<the smallest change that makes it right>" } ] }
One entry for every unit, in order.

## Units (22, 7 reels)

### 2026-10-23-the-night-the-world-began/f1 · frame 1 caption (and what the voice says)
      James Ussher, Archbishop of Armagh, calculated that the world began at nightfall before 23 October, 4004 BC.
      spoken: James Usher, Archbishop of Armah, calculated that the world began at nightfall before the twenty-third of October, four thousand and four B C.
    Rests on:
      date: Ussher dated the Creation to the start of the night before 23 October 4004 BC [Wikipedia: James Ussher: “the entrance of the night preceding the 23rd day of October ... the year before Christ 4004”]

### 2026-10-23-the-night-the-world-began/f2 · frame 2 caption (and what the voice says)
      He published the date in 1650, in his Annals of the Old Testament.
      spoken: He published the date in sixteen fifty, in his Annals of the Old Testament.
    Rests on:
      annals: His Annals of the Old Testament appeared in 1650 [Wikipedia: James Ussher: “the Annales veteris testamenti, a prima mundi origine deducti ("Annals of the Old Testament, deduced from the first origins of the world"), which appeared in 1650”]

### 2026-10-23-the-night-the-world-began/f4 · frame 4 caption (and what the voice says)
      Where he had several sources beyond the Bible, his dates usually hold up. He put the death of Julius Caesar in 44 BC.
      spoken: Where he had several sources beyond the Bible, his dates usually hold up. He put the death of Julius Caesar in forty-four B C.
    Rests on:
      caesar: Where he had several sources besides the Bible, his dates usually agree with modern ones, such as Caesar's death in 44 BC [Wikipedia: James Ussher: “Ussher's account of historical events for which he had multiple sources other than the Bible is usually in close agreement with modern accounts – for example, he placed the death of Alexander in 323 BC and that of Julius Caesar in 44 BC.”]

### 2026-10-23-the-night-the-world-began/f5 · frame 5 caption (and what the voice says)
      Radiometric dating puts Earth's age at about 4.54 billion years.
      spoken: Radiometric dating puts Earth's age at about four point five four billion years.
    Rests on:
      age: Earth is estimated to be about 4.54 billion years old [Wikipedia: Age of Earth: “The age of Earth is estimated to be 4.54 ± 0.05 billion years.”]
      method: The estimate rests on radiometric dating of meteorites [Wikipedia: Age of Earth: “Estimates are based on radiometric dating of meteoritic material”]

### 2026-10-23-the-fastest-wind-on-record/f1 · frame 1 caption (and what the voice says)
      A storm closes on the Pacific coast of Mexico, photographed by a satellite on 23 October 2015.
      spoken: A storm closes on the Pacific coast of Mexico, photographed by a satellite on 23 October twenty fifteen.
    Rests on:
      photo: The satellite image shows Patricia just after its peak, nearing western Mexico on 23 October 2015 [https://commons.wikimedia.org/wiki/File:Patricia_2015-10-23_1730Z.jpg: “Hurricane Patricia shortly after peak intensity and approaching Western Mexico on October 23, 2015.”]

### 2026-10-23-the-fastest-wind-on-record/f4 · frame 4 caption (and what the voice says)
      Near its peak it turned toward land, and weakened fast. It came ashore near Cuixmala, Jalisco, with winds of about 240 kilometres an hour.
      spoken: Near its peak it turned toward land, and weakened fast. It came ashore near Kweesh-mah-la, Ha-lees-ko, with winds of about two hundred and forty kilometres an hour.
    Rests on:
      turn: Near its peak it turned towards Mexico [Wikipedia: Hurricane Patricia: “As Patricia neared its peak strength, the cyclone began to turn east-northeast towards Mexico.”]
      landfall: After dramatic weakening it made landfall near Cuixmala, Jalisco, with 240 km/h winds [Wikipedia: Hurricane Patricia: “Late on October 23, dramatic weakening ensued and Patricia made landfall near Cuixmala, Jalisco, with winds of 150 mph (240 km/h).”]

### 2026-10-23-the-fastest-wind-on-record/takeaway · takeaway
      In about a day and a half Patricia grew to the strongest sustained winds ever reliably measured or estimated in a tropical cyclone. A day after landfall it was a depression.
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
      The first aeroplane flight an official body certified
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

### 2026-10-23-the-first-flight-anyone-certified/f1 · frame 1 caption (and what the voice says)
      This is the 14-bis, a biplane that Alberto Santos-Dumont designed and built.
      spoken: This is the fourteen-bees, a biplane that Alberto Santos-Doomon designed and built.
    Rests on:
      design: The 14-bis was a canard biplane Santos-Dumont designed and built [Wikipedia: Santos-Dumont 14-bis: “was a pioneer era, canard-style biplane designed and built by Brazilian aviation pioneer Alberto Santos-Dumont”]

### 2026-10-23-the-first-flight-anyone-certified/f2 · frame 2 caption (and what the voice says)
      Paris, 23 October 1906: it flew about 60 metres, a few metres off the ground, with no catapult or ramp to launch it.
      spoken: Paris, the twenty-third of October, nineteen oh-six: it flew about sixty metres, a few metres off the ground, with no catapult or ramp to launch it.
    Rests on:
      first: On 23 October 1906, at the Bagatelle Gamefield in Paris, the 14-bis flew about 60 metres a few metres up, taking off without a launch system [Wikipedia: Alberto Santos-Dumont: “on 23 October 1906 flew about 60 metres at a height of two to three metres with the fixed-wing 14-bis (also dubbed the Oiseau de proie—"bird of prey") at the Bagatelle Gamefield in Paris, taking off unassisted by an external launch system.”]
      unaided: It took off without ramps, catapults or other devices [Wikipedia: Alberto Santos-Dumont: “The plane lifted off and flew for 60 metres, without taking advantage of headwinds, ramps, catapults, slopes, or other devices.”]

### 2026-10-23-the-first-flight-anyone-certified/f4 · frame 4 caption
      France's Aero-Club certified the 12 November flight, and the world body for air records recognised it as the first of its kind.
    Rests on:
      certified: They were the first heavier-than-air flights certified by the Aeroclub of France, and the first of their kind recognised by the FAI [Wikipedia: Alberto Santos-Dumont: “These were the first heavier-than-air flights certified by the Aeroclub of France, the first such flights officially witnessed by an aeronautics recordkeeping body, and the first of their kind recognised by the Fédération Aéronautique Internationale.”]
      seconds: The 220-metre flight lasted 21 seconds [Wikipedia: Alberto Santos-Dumont: “he took off against the wind and flew 220 metres, for 21 seconds at an average speed of 37.4 km/h”]

### 2026-10-23-the-first-flight-anyone-certified/f6 · frame 6 caption (and what the voice says)
      The first powered, controlled aeroplane to fly was the Wright brothers' Flyer. Santos-Dumont made the first one a record body certified.
      spoken: The first powered, controlled aeroplane to fly was the Wright brothers' Flyer. Santos-Doomon made the first one a record body certified.
    Rests on:
      wright: The Wright Flyer was the first powered, controlled aeroplane to fly [Wikipedia: Biplane: “The first powered, controlled aeroplane to fly, the Wright Flyer, used a biplane wing arrangement”]
      certified: They were the first heavier-than-air flights certified by the Aeroclub of France, and the first of their kind recognised by the FAI [Wikipedia: Alberto Santos-Dumont: “These were the first heavier-than-air flights certified by the Aeroclub of France, the first such flights officially witnessed by an aeronautics recordkeeping body, and the first of their kind recognised by the Fédération Aéronautique Internationale.”]

### 2026-10-23-the-first-flight-anyone-certified/takeaway · takeaway
      The Wright Flyer flew first. Santos-Dumont's 14-bis made the first aeroplane flight that an official body certified.
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

### 2026-10-23-only-a-theory/media.m5 · image: alt text against the file description; credit and licence against Commons
      alt: Illustration of Tiktaalik, an early fish with stubby, leg-like fins, at the edge of shallow water
      credit: Zina Deretsky, National Science Foundation, 2006 · Public domain · https://commons.wikimedia.org/wiki/File:Tiktaalik_roseae_life_restor.jpg
      Commons said: Public domain, 1890×1092

### 2026-10-23-what-the-skeletons-said/f1 · frame 1 caption (and what the voice says)
      England, 1348. A plague arrives that halts the campaigns of the Hundred Years' War and kills an estimated 40 to 60 percent of the people.
      spoken: England, thirteen forty-eight. A plague arrives that halts the campaigns of the Hundred Years' War and kills an estimated forty to sixty percent of the people.
    Rests on:
      war: Its most immediate consequence was a halt to the Hundred Years' War campaigns [Wikipedia: Black Death in England: “The most immediate consequence was a halt to the campaigns of the Hundred Years' War.”]
      toll: An estimated 40–60% of England's population died [Wikipedia: Black Death in England: “a figure of 40–60% of the population is widely accepted”]

### 2026-10-23-what-the-skeletons-said/f4 · frame 4 caption (and what the voice says)
      In 2011, scientists reported DNA of Yersinia pestis, the plague bacterium, in skeletons from that cemetery.
      spoken: In twenty eleven, scientists reported DNA of Yersinia pestis, the plague bacterium, in skeletons from that cemetery.
    Rests on:
      dna: A 2011 study found Yersinia pestis DNA in skeletons from the Black Death cemetery in East Smithfield, London [Wikipedia: Black Death in England: “A study reported in 2011 of skeletons exhumed from the Black Death cemetery in East Smithfield, London, found Yersinia pestis DNA.”]
      bacterium: Plague is caused by Yersinia pestis bacteria [Wikipedia: Black Death in England: “It is generally agreed today that the disease in question was plague, caused by Yersinia pestis bacteria.”]

### 2026-10-23-the-auld-alliance/f1 · frame 1 caption (and what the voice says)
      Paris, 23 October 1295. Scottish envoys sign a treaty with France against England.
      spoken: Paris, the twenty-third of October, twelve ninety-five. Scottish envoys sign a treaty with France against England.
    Rests on:
      signed: A Scottish embassy agreed the Treaty of Paris, signed on 23 October 1295 [Wikipedia: Auld Alliance: “In October 1295, a Scottish embassy to France agreed to the Treaty of Paris, which was signed on 23 October.”]

### 2026-10-23-the-auld-alliance/f4 · frame 4 caption (and what the voice says)
      It did not protect Scotland. In 1296 Edward I invaded, and Scottish independence nearly ended.
      spoken: It did not protect Scotland. In twelve ninety-six Edward the First invaded, and Scottish independence nearly ended.
    Rests on:
      edward: Edward I's 1296 invasion all but ended Scottish independence [Wikipedia: Auld Alliance: “the treaty proved to be no protection against Edward, whose swift and devastating invasion of Scotland in 1296 all but eradicated its independence”]

### 2026-10-23-the-auld-alliance/f5 · frame 5 caption (and what the voice says)
      The bond was renewed for centuries. In 1558 Mary, Queen of Scots, married the future Francis II of France.
      spoken: The bond was renewed for centuries. In fifteen fifty-eight Mary, Queen of Scots, married the future Francis the Second of France.
    Rests on:
      renewed: The French and Scottish monarchs of that period renewed the alliance, all but Louis XI [Wikipedia: Auld Alliance: “The alliance was renewed by all the French and Scottish monarchs of that period except Louis XI.”]
      marriage: In 1558 the alliance was revived when Mary, Queen of Scots, married the future Francis II of France [Wikipedia: Auld Alliance: “In 1558, the alliance between the two kingdoms was revived with the marriage of Mary, Queen of Scots to the future Francis II of France”]

### 2026-10-23-whose-words-were-they/f1 · frame 1 caption (and what the voice says)
      "Survival of the fittest" sounds like Darwin. The words are Herbert Spencer's, in his Principles of Biology of 1864.
      spoken: Survival of the fittest sounds like Darwin. The words are Herbert Spencer's, in his Principles of Biology of eighteen sixty-four.
    Rests on:
      spencer: Herbert Spencer first used the phrase, in Principles of Biology (1864) [Wikipedia: Survival of the fittest: “Herbert Spencer first used the phrase, after reading Charles Darwin's On the Origin of Species, in his Principles of Biology (1864)”]

### 2026-10-23-whose-words-were-they/f3 · frame 3 caption (and what the voice says)
      How do we know Darwin borrowed it? His letters. In July 1866 Alfred Russel Wallace wrote with a worry.
      spoken: How do we know Darwin borrowed it? His letters. In July eighteen sixty-six Alfred Russel Wallace wrote with a worry.
    Rests on:
      wallace: In July 1866 Wallace wrote that readers took 'natural selection' to personify nature, and suggested Spencer's term [Wikipedia: Survival of the fittest: “In July 1866, Alfred Russel Wallace wrote to Darwin about readers thinking that the phrase "natural selection" personified nature as "selecting" and said this misconception could be avoided "by adopting Spencer's term"”]

### 2026-10-23-whose-words-were-they/f5 · frame 5 caption (and what the voice says)
      Darwin wrote back that the advantages of Spencer's phrase had not occurred to him until he read the letter. He put it in the fifth edition of the Origin, in 1869.
      spoken: Darwin wrote back that the advantages of Spencer's phrase had not occurred to him until he read the letter. He put it in the fifth edition of the Origin, in eighteen sixty-nine.
    Rests on:
      reply: Darwin replied that the advantages of Spencer's phrase had not occurred to him till he read Wallace's letter [Wikipedia: Survival of the fittest: “I fully agree with all that you say on the advantages of H. Spencer's excellent expression of 'the survival of the fittest'. This however had not occurred to me till reading your letter.”]
      fifth: Darwin introduced the phrase in the fifth edition of the Origin, 1869 [Wikipedia: Survival of the fittest: “In On the Origin of Species, he introduced the phrase in the fifth edition published in 1869”]

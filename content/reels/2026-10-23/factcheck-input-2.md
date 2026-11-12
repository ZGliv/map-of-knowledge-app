# Adversarial fact-check (round 2: only what changed after round 1's fixes): reels for 2026-10-23

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

Write content/reels/2026-10-23/factcheck-2.json:
{ "checker": "<who you are>", "checkedAt": "<ISO time>", "units": [
  { "id": "<unit id>", "verdict": "supported" | "imprecise" | "unsupported" | "wrong" | "quote-mismatch",
    "evidence": "<a short quote or [source] reference>", "note": "<what is wrong, if anything>", "fix": "<the smallest change that makes it right>" } ] }
One entry for every unit, in order.

## Units (53, 7 reels)

### 2026-10-23-the-night-the-world-began/title · title
      The night Ussher said the world began
    Rests on:
      date: Ussher dated the Creation to the start of the night before 23 October 4004 BC [Wikipedia: James Ussher: “the entrance of the night preceding the 23rd day of October ... the year before Christ 4004”]
      annals: His Annals of the Old Testament appeared in 1650 [Wikipedia: James Ussher: “the Annales veteris testamenti, a prima mundi origine deducti ("Annals of the Old Testament, deduced from the first origins of the world"), which appeared in 1650”]
      learning: The chronology needed ancient history, the Bible and its languages, astronomy and ancient calendars [Wikipedia: James Ussher: “it demanded great depth of learning in what was then known of ancient history, including the rise of the Persians, Greeks and Romans, as well as expertise in the Bible, biblical languages, astronomy, ancient calendars and chronology”]
      caesar: Where he had several sources besides the Bible, his dates usually agree with modern ones, such as Caesar's death in 44 BC [Wikipedia: James Ussher: “Ussher's account of historical events for which he had multiple sources other than the Bible is usually in close agreement with modern accounts – for example, he placed the death of Alexander in 323 BC and that of Julius Caesar in 44 BC.”]
      age: Earth is estimated to be about 4.54 billion years old [Wikipedia: Age of Earth: “The age of Earth is estimated to be 4.54 ± 0.05 billion years.”]
      method: The estimate rests on radiometric dating of meteorites [Wikipedia: Age of Earth: “Estimates are based on radiometric dating of meteoritic material”]

### 2026-10-23-the-night-the-world-began/f1 · frame 1 caption
      James Ussher, Archbishop of Armagh, calculated that the world began at nightfall before 23 October, 4004 BC.
    Rests on:
      date: Ussher dated the Creation to the start of the night before 23 October 4004 BC [Wikipedia: James Ussher: “the entrance of the night preceding the 23rd day of October ... the year before Christ 4004”]

### 2026-10-23-the-night-the-world-began/f4 · frame 4 caption
      Where he had several sources beyond the Bible, his dates usually hold up. He put the death of Julius Caesar in 44 BC.
    Rests on:
      caesar: Where he had several sources besides the Bible, his dates usually agree with modern ones, such as Caesar's death in 44 BC [Wikipedia: James Ussher: “Ussher's account of historical events for which he had multiple sources other than the Bible is usually in close agreement with modern accounts – for example, he placed the death of Alexander in 323 BC and that of Julius Caesar in 44 BC.”]

### 2026-10-23-the-night-the-world-began/f5 · frame 5 caption
      Measured by radiometric dating, Earth is about 4.54 billion years old.
    Rests on:
      age: Earth is estimated to be about 4.54 billion years old [Wikipedia: Age of Earth: “The age of Earth is estimated to be 4.54 ± 0.05 billion years.”]
      method: The estimate rests on radiometric dating of meteorites [Wikipedia: Age of Earth: “Estimates are based on radiometric dating of meteoritic material”]

### 2026-10-23-the-night-the-world-began/takeaway · takeaway
      Ussher counted back through written records to 4004 BC. Radiometric dating puts Earth's age at about 4.54 billion years.
    Rests on:
      date: Ussher dated the Creation to the start of the night before 23 October 4004 BC [Wikipedia: James Ussher: “the entrance of the night preceding the 23rd day of October ... the year before Christ 4004”]
      annals: His Annals of the Old Testament appeared in 1650 [Wikipedia: James Ussher: “the Annales veteris testamenti, a prima mundi origine deducti ("Annals of the Old Testament, deduced from the first origins of the world"), which appeared in 1650”]
      learning: The chronology needed ancient history, the Bible and its languages, astronomy and ancient calendars [Wikipedia: James Ussher: “it demanded great depth of learning in what was then known of ancient history, including the rise of the Persians, Greeks and Romans, as well as expertise in the Bible, biblical languages, astronomy, ancient calendars and chronology”]
      caesar: Where he had several sources besides the Bible, his dates usually agree with modern ones, such as Caesar's death in 44 BC [Wikipedia: James Ussher: “Ussher's account of historical events for which he had multiple sources other than the Bible is usually in close agreement with modern accounts – for example, he placed the death of Alexander in 323 BC and that of Julius Caesar in 44 BC.”]
      age: Earth is estimated to be about 4.54 billion years old [Wikipedia: Age of Earth: “The age of Earth is estimated to be 4.54 ± 0.05 billion years.”]
      method: The estimate rests on radiometric dating of meteorites [Wikipedia: Age of Earth: “Estimates are based on radiometric dating of meteoritic material”]

### 2026-10-23-the-night-the-world-began/claim.caesar · claim and its quote (the quote must support the claim, and be in the source)
      Where he had several sources besides the Bible, his dates usually agree with modern ones, such as Caesar's death in 44 BC
      quote: “Ussher's account of historical events for which he had multiple sources other than the Bible is usually in close agreement with modern accounts – for example, he placed the death of Alexander in 323 BC and that of Julius Caesar in 44 BC.”
      source: Wikipedia: James Ussher

### 2026-10-23-the-night-the-world-began/media.m1 · image: alt text against the file description; credit and licence against Commons
      alt: Portrait of James Ussher in a black cap, white ruff and bishop's robes
      credit: After Peter Lely, c. 1654 · Public domain · https://commons.wikimedia.org/wiki/File:James_Ussher_by_Sir_Peter_Lely.jpg
      Commons said: Public domain, 2400×2871

### 2026-10-23-the-night-the-world-began/media.m5 · image: alt text against the file description; credit and licence against Commons
      alt: Earlier portrait of James Ussher holding a small book, in a white ruff and white-sleeved bishop's robes
      credit: Attributed to Cornelis Janssens van Ceulen, 1641 · Public domain · https://commons.wikimedia.org/wiki/File:James_Ussher_portrait.jpg
      Commons said: Public domain, 1200×1444

### 2026-10-23-the-fastest-wind-on-record/title · title
      The fastest sustained hurricane winds on record
    Rests on:
      photo: The satellite image shows Patricia just after its peak, nearing western Mexico on 23 October 2015 [https://commons.wikimedia.org/wiki/File:Patricia_2015-10-23_1730Z.jpg: “Hurricane Patricia shortly after peak intensity and approaching Western Mexico on October 23, 2015.”]
      growth: Patricia went from tropical storm to Category 5 hurricane in 24 hours [Wikipedia: Hurricane Patricia: “Patricia grew from a tropical storm to a Category 5 hurricane in just 24 hours”]
      peak: On 23 October its maximum sustained winds peaked at 345 km/h [Wikipedia: Hurricane Patricia: “On October 23, the hurricane achieved its record peak intensity with maximum sustained winds of 215 mph (345 km/h).”]
      record: Its one-minute sustained winds are the highest ever reliably observed or estimated in a tropical cyclone [Wikipedia: Hurricane Patricia: “Patricia's one-minute maximum sustained winds ranked as the highest ever reliably observed or estimated in a tropical cyclone”]
      turn: Near its peak it turned towards Mexico [Wikipedia: Hurricane Patricia: “As Patricia neared its peak strength, the cyclone began to turn east-northeast towards Mexico.”]
      landfall: After dramatic weakening it made landfall near Cuixmala, Jalisco, with 240 km/h winds [Wikipedia: Hurricane Patricia: “Late on October 23, dramatic weakening ensued and Patricia made landfall near Cuixmala, Jalisco, with winds of 150 mph (240 km/h).”]
      mountains: It weakened very fast over Mexico's mountainous terrain [Wikipedia: Hurricane Patricia: “Patricia continued to weaken extremely quickly, faster than it had intensified, as it interacted with the mountainous terrain of Mexico.”]
      faded: Within 24 hours of landfall it was a tropical depression [Wikipedia: Hurricane Patricia: “Within 24 hours of moving ashore, Patricia weakened into a tropical depression”]

### 2026-10-23-the-fastest-wind-on-record/f4 · frame 4 caption
      Near its peak it turned toward land, and weakened fast. It came ashore near Cuixmala, Jalisco, with winds of about 240 kilometres an hour.
    Rests on:
      turn: Near its peak it turned towards Mexico [Wikipedia: Hurricane Patricia: “As Patricia neared its peak strength, the cyclone began to turn east-northeast towards Mexico.”]
      landfall: After dramatic weakening it made landfall near Cuixmala, Jalisco, with 240 km/h winds [Wikipedia: Hurricane Patricia: “Late on October 23, dramatic weakening ensued and Patricia made landfall near Cuixmala, Jalisco, with winds of 150 mph (240 km/h).”]

### 2026-10-23-the-fastest-wind-on-record/prediction · prediction (the key must be right, every other choice wrong)
      This storm, seen from space on 23 October 2015, set a world record that day. Which one?
      KEY: Strongest sustained winds of any tropical cyclone
      Others: Widest storm ever measured | Most rain in a single day
    Rests on:
      record: Its one-minute sustained winds are the highest ever reliably observed or estimated in a tropical cyclone [Wikipedia: Hurricane Patricia: “Patricia's one-minute maximum sustained winds ranked as the highest ever reliably observed or estimated in a tropical cyclone”]

### 2026-10-23-the-fastest-wind-on-record/takeaway · takeaway
      In about a day Patricia grew to the strongest sustained winds ever reliably recorded in a tropical cyclone. Within a day of landfall it was only a tropical depression.
    Rests on:
      photo: The satellite image shows Patricia just after its peak, nearing western Mexico on 23 October 2015 [https://commons.wikimedia.org/wiki/File:Patricia_2015-10-23_1730Z.jpg: “Hurricane Patricia shortly after peak intensity and approaching Western Mexico on October 23, 2015.”]
      growth: Patricia went from tropical storm to Category 5 hurricane in 24 hours [Wikipedia: Hurricane Patricia: “Patricia grew from a tropical storm to a Category 5 hurricane in just 24 hours”]
      peak: On 23 October its maximum sustained winds peaked at 345 km/h [Wikipedia: Hurricane Patricia: “On October 23, the hurricane achieved its record peak intensity with maximum sustained winds of 215 mph (345 km/h).”]
      record: Its one-minute sustained winds are the highest ever reliably observed or estimated in a tropical cyclone [Wikipedia: Hurricane Patricia: “Patricia's one-minute maximum sustained winds ranked as the highest ever reliably observed or estimated in a tropical cyclone”]
      turn: Near its peak it turned towards Mexico [Wikipedia: Hurricane Patricia: “As Patricia neared its peak strength, the cyclone began to turn east-northeast towards Mexico.”]
      landfall: After dramatic weakening it made landfall near Cuixmala, Jalisco, with 240 km/h winds [Wikipedia: Hurricane Patricia: “Late on October 23, dramatic weakening ensued and Patricia made landfall near Cuixmala, Jalisco, with winds of 150 mph (240 km/h).”]
      mountains: It weakened very fast over Mexico's mountainous terrain [Wikipedia: Hurricane Patricia: “Patricia continued to weaken extremely quickly, faster than it had intensified, as it interacted with the mountainous terrain of Mexico.”]
      faded: Within 24 hours of landfall it was a tropical depression [Wikipedia: Hurricane Patricia: “Within 24 hours of moving ashore, Patricia weakened into a tropical depression”]

### 2026-10-23-the-fastest-wind-on-record/media.m3 · image: alt text against the file description; credit and licence against Commons
      alt: Map of Patricia's track: coloured dots running west, well off southern Mexico, then curving north-east into Jalisco
      credit: Wxtrackercody, 2015 · Public domain · https://commons.wikimedia.org/wiki/File:Patricia_2015_path.png
      Commons said: Public domain, 2700×1669

### 2026-10-23-the-first-flight-anyone-certified/title · title
      The first aeroplane flights anyone certified
    Rests on:
      first: On 23 October 1906, at the Bagatelle Gamefield in Paris, the 14-bis flew about 60 metres a few metres up, taking off without a launch system [Wikipedia: Alberto Santos-Dumont: “on 23 October 1906 flew about 60 metres at a height of two to three metres with the fixed-wing 14-bis (also dubbed the Oiseau de proie—"bird of prey") at the Bagatelle Gamefield in Paris, taking off unassisted by an external launch system.”]
      design: The 14-bis was a canard biplane Santos-Dumont designed and built [Wikipedia: Santos-Dumont 14-bis: “was a pioneer era, canard-style biplane designed and built by Brazilian aviation pioneer Alberto Santos-Dumont”]
      unaided: It took off without ramps, catapults or other devices [Wikipedia: Alberto Santos-Dumont: “The plane lifted off and flew for 60 metres, without taking advantage of headwinds, ramps, catapults, slopes, or other devices.”]
      crowd: On 12 November, before a crowd, he flew 220 metres [Wikipedia: Alberto Santos-Dumont: “On 12 November in front of a crowd, he flew 220 metres at a height of six metres.”]
      seconds: The 220-metre flight lasted 21 seconds [Wikipedia: Alberto Santos-Dumont: “he took off against the wind and flew 220 metres, for 21 seconds at an average speed of 37.4 km/h”]
      certified: They were the first heavier-than-air flights certified by the Aeroclub of France [Wikipedia: Alberto Santos-Dumont: “These were the first heavier-than-air flights certified by the Aeroclub of France”]
      brazil: He is a national hero in Brazil, where many hold he preceded the Wright brothers [Wikipedia: Alberto Santos-Dumont: “Santos-Dumont is a national hero in Brazil, where it is popularly held that he preceded the Wright brothers in demonstrating a practical aeroplane.”]
      wright: The Wright Flyer was the first powered, controlled aeroplane to fly [Wikipedia: Biplane: “The first powered, controlled aeroplane to fly, the Wright Flyer, used a biplane wing arrangement”]
      photo: The photograph records Santos-Dumont's new triumph of 12 November 1906, with the Blériot IV behind the 14-bis [https://commons.wikimedia.org/wiki/File:14-bis_de_Alberto_Santos_Dumont.jpg: “Nouveau triomphe de Santos-Dumont. 12 novembre 1906”]

### 2026-10-23-the-first-flight-anyone-certified/f1 · frame 1 caption
      This is the 14-bis, a biplane that Alberto Santos-Dumont designed and built.
    Rests on:
      design: The 14-bis was a canard biplane Santos-Dumont designed and built [Wikipedia: Santos-Dumont 14-bis: “was a pioneer era, canard-style biplane designed and built by Brazilian aviation pioneer Alberto Santos-Dumont”]

### 2026-10-23-the-first-flight-anyone-certified/f2 · frame 2 caption
      Paris, 23 October 1906: it flew about 60 metres, a few metres off the ground, with no catapult or ramp to launch it.
    Rests on:
      first: On 23 October 1906, at the Bagatelle Gamefield in Paris, the 14-bis flew about 60 metres a few metres up, taking off without a launch system [Wikipedia: Alberto Santos-Dumont: “on 23 October 1906 flew about 60 metres at a height of two to three metres with the fixed-wing 14-bis (also dubbed the Oiseau de proie—"bird of prey") at the Bagatelle Gamefield in Paris, taking off unassisted by an external launch system.”]
      unaided: It took off without ramps, catapults or other devices [Wikipedia: Alberto Santos-Dumont: “The plane lifted off and flew for 60 metres, without taking advantage of headwinds, ramps, catapults, slopes, or other devices.”]

### 2026-10-23-the-first-flight-anyone-certified/f3 · frame 3 caption
      On 12 November a crowd watched him fly 220 metres, in 21 seconds. This photograph is from that day.
    Rests on:
      crowd: On 12 November, before a crowd, he flew 220 metres [Wikipedia: Alberto Santos-Dumont: “On 12 November in front of a crowd, he flew 220 metres at a height of six metres.”]
      seconds: The 220-metre flight lasted 21 seconds [Wikipedia: Alberto Santos-Dumont: “he took off against the wind and flew 220 metres, for 21 seconds at an average speed of 37.4 km/h”]
      photo: The photograph records Santos-Dumont's new triumph of 12 November 1906, with the Blériot IV behind the 14-bis [https://commons.wikimedia.org/wiki/File:14-bis_de_Alberto_Santos_Dumont.jpg: “Nouveau triomphe de Santos-Dumont. 12 novembre 1906”]

### 2026-10-23-the-first-flight-anyone-certified/f4 · frame 4 caption
      The Aero-Club of France certified his flights. No record keeper had ever certified an aeroplane flight before.
    Rests on:
      certified: They were the first heavier-than-air flights certified by the Aeroclub of France [Wikipedia: Alberto Santos-Dumont: “These were the first heavier-than-air flights certified by the Aeroclub of France”]

### 2026-10-23-the-first-flight-anyone-certified/f6 · frame 6 caption
      The first powered, controlled aeroplane to fly was the Wright brothers' Flyer. His were the first aeroplane flights anyone certified.
    Rests on:
      wright: The Wright Flyer was the first powered, controlled aeroplane to fly [Wikipedia: Biplane: “The first powered, controlled aeroplane to fly, the Wright Flyer, used a biplane wing arrangement”]
      certified: They were the first heavier-than-air flights certified by the Aeroclub of France [Wikipedia: Alberto Santos-Dumont: “These were the first heavier-than-air flights certified by the Aeroclub of France”]

### 2026-10-23-the-first-flight-anyone-certified/prediction · prediction (the key must be right, every other choice wrong)
      Paris, 23 October 1906. Alberto Santos-Dumont takes off in his biplane, the 14-bis. How far does it fly?
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
      certified: They were the first heavier-than-air flights certified by the Aeroclub of France [Wikipedia: Alberto Santos-Dumont: “These were the first heavier-than-air flights certified by the Aeroclub of France”]
      brazil: He is a national hero in Brazil, where many hold he preceded the Wright brothers [Wikipedia: Alberto Santos-Dumont: “Santos-Dumont is a national hero in Brazil, where it is popularly held that he preceded the Wright brothers in demonstrating a practical aeroplane.”]
      wright: The Wright Flyer was the first powered, controlled aeroplane to fly [Wikipedia: Biplane: “The first powered, controlled aeroplane to fly, the Wright Flyer, used a biplane wing arrangement”]
      photo: The photograph records Santos-Dumont's new triumph of 12 November 1906, with the Blériot IV behind the 14-bis [https://commons.wikimedia.org/wiki/File:14-bis_de_Alberto_Santos_Dumont.jpg: “Nouveau triomphe de Santos-Dumont. 12 novembre 1906”]

### 2026-10-23-the-first-flight-anyone-certified/claim.first · claim and its quote (the quote must support the claim, and be in the source)
      On 23 October 1906, at the Bagatelle Gamefield in Paris, the 14-bis flew about 60 metres a few metres up, taking off without a launch system
      quote: “on 23 October 1906 flew about 60 metres at a height of two to three metres with the fixed-wing 14-bis (also dubbed the Oiseau de proie—"bird of prey") at the Bagatelle Gamefield in Paris, taking off unassisted by an external launch system.”
      source: Wikipedia: Alberto Santos-Dumont

### 2026-10-23-the-first-flight-anyone-certified/claim.certified · claim and its quote (the quote must support the claim, and be in the source)
      They were the first heavier-than-air flights certified by the Aeroclub of France
      quote: “These were the first heavier-than-air flights certified by the Aeroclub of France”
      source: Wikipedia: Alberto Santos-Dumont

### 2026-10-23-the-first-flight-anyone-certified/claim.photo · claim and its quote (the quote must support the claim, and be in the source)
      The photograph records Santos-Dumont's new triumph of 12 November 1906, with the Blériot IV behind the 14-bis
      quote: “Nouveau triomphe de Santos-Dumont. 12 novembre 1906”
      source: https://commons.wikimedia.org/wiki/File:14-bis_de_Alberto_Santos_Dumont.jpg

### 2026-10-23-the-first-flight-anyone-certified/media.m3 · image: alt text against the file description; credit and licence against Commons
      alt: Santos-Dumont's 14-bis, a boxy biplane built like linked kites, on the field on 12 November 1906, with the Blériot IV aircraft behind it
      credit: Jules Beau · Public domain · https://commons.wikimedia.org/wiki/File:14-bis_de_Alberto_Santos_Dumont.jpg
      Commons said: Public domain, 2632×1814

### 2026-10-23-only-a-theory/title · title
      Only a theory
    Rests on:
      public: To the public 'theory' can mean an opinion; to scientists it means a well-substantiated explanation [Wikipedia: Evolution as fact and theory: “To the public, theory can mean an opinion or conjecture (e.g., "it's only a theory"), but among scientists it has a much stronger connotation of "well-substantiated explanation".”]
      definition: A scientific theory is a well-substantiated explanation of some aspect of the natural world [Wikipedia: Evolution as fact and theory: “A scientific theory is "a well-substantiated explanation of some aspect of the natural world that can incorporate facts, laws, inferences, and tested hypotheses."”]
      tested: Theories come from hypotheses tested repeatedly by attempts to disprove them [Wikipedia: Evolution as fact and theory: “Theories are formed from hypotheses that have been subjected repeatedly to tests of evidence which attempt to disprove or falsify them.”]
      facts: The facts of evolution come from current processes, traces of common descent and fossil transitions [Wikipedia: Evolution as fact and theory: “The facts of evolution come from observational evidence of current processes, from imperfections in organisms recording historical common descent, and from transitions in the fossil record.”]
      both: Many scientists and philosophers of science describe evolution as fact and theory [Wikipedia: Evolution as fact and theory: “Many scientists and philosophers of science have described evolution as fact and theory”]
      ongoing: Evidence for evolution continues to be gathered and tested [Wikipedia: Evolution as fact and theory: “Evidence for evolution continues to be accumulated and tested.”]

### 2026-10-23-only-a-theory/f5 · frame 5 caption
      That is why many scientists call evolution both a fact and a theory. The evidence for it keeps being tested.
    Rests on:
      both: Many scientists and philosophers of science describe evolution as fact and theory [Wikipedia: Evolution as fact and theory: “Many scientists and philosophers of science have described evolution as fact and theory”]
      ongoing: Evidence for evolution continues to be gathered and tested [Wikipedia: Evolution as fact and theory: “Evidence for evolution continues to be accumulated and tested.”]

### 2026-10-23-only-a-theory/takeaway · takeaway
      In science a theory is not a guess. It is the tested explanation that ties the facts together.
    Rests on:
      public: To the public 'theory' can mean an opinion; to scientists it means a well-substantiated explanation [Wikipedia: Evolution as fact and theory: “To the public, theory can mean an opinion or conjecture (e.g., "it's only a theory"), but among scientists it has a much stronger connotation of "well-substantiated explanation".”]
      definition: A scientific theory is a well-substantiated explanation of some aspect of the natural world [Wikipedia: Evolution as fact and theory: “A scientific theory is "a well-substantiated explanation of some aspect of the natural world that can incorporate facts, laws, inferences, and tested hypotheses."”]
      tested: Theories come from hypotheses tested repeatedly by attempts to disprove them [Wikipedia: Evolution as fact and theory: “Theories are formed from hypotheses that have been subjected repeatedly to tests of evidence which attempt to disprove or falsify them.”]
      facts: The facts of evolution come from current processes, traces of common descent and fossil transitions [Wikipedia: Evolution as fact and theory: “The facts of evolution come from observational evidence of current processes, from imperfections in organisms recording historical common descent, and from transitions in the fossil record.”]
      both: Many scientists and philosophers of science describe evolution as fact and theory [Wikipedia: Evolution as fact and theory: “Many scientists and philosophers of science have described evolution as fact and theory”]
      ongoing: Evidence for evolution continues to be gathered and tested [Wikipedia: Evolution as fact and theory: “Evidence for evolution continues to be accumulated and tested.”]

### 2026-10-23-only-a-theory/claim.both · claim and its quote (the quote must support the claim, and be in the source)
      Many scientists and philosophers of science describe evolution as fact and theory
      quote: “Many scientists and philosophers of science have described evolution as fact and theory”
      source: Wikipedia: Evolution as fact and theory

### 2026-10-23-only-a-theory/media.m3 · image: alt text against the file description; credit and licence against Commons
      alt: Photograph of Charles Darwin in old age, with a long white beard, in a dark coat
      credit: Julia Margaret Cameron / Adam Cuerden, c. 1868 · Public domain · https://commons.wikimedia.org/wiki/File:Charles_Darwin_by_Julia_Margaret_Cameron,_c._1868.jpg
      Commons said: Public domain, 2348×2916

### 2026-10-23-only-a-theory/media.m5 · image: alt text against the file description; credit and licence against Commons
      alt: Painting of Tiktaalik, an early fish with stubby, leg-like fins, at the edge of shallow water
      credit: Zina Deretsky , National Science Foundation, 2009 · Public domain · https://commons.wikimedia.org/wiki/File:Tiktaalik_roseae_life_restor.jpg
      Commons said: Public domain, 1890×1092

### 2026-10-23-what-the-skeletons-said/title · title
      What the skeletons said
    Rests on:
      war: Its most immediate consequence was a halt to the Hundred Years' War campaigns [Wikipedia: Black Death in England: “The most immediate consequence was a halt to the campaigns of the Hundred Years' War.”]
      toll: An estimated 40–60% of England's population died [Wikipedia: Black Death in England: “a figure of 40–60% of the population is widely accepted”]
      names: Contemporaries called it the Great Pestilence or the Great Mortality, not the Black Death [Wikipedia: Black Death in England: “was not used by contemporaries, who preferred such names as the "Great Pestilence" or the "Great Mortality"”]
      later: The name Black Death became common only in the 17th century [Wikipedia: Black Death in England: “It was not until the 17th century that the term under which we know the outbreak today became common”]
      dna: A 2011 study found Yersinia pestis DNA in skeletons from the Black Death cemetery in East Smithfield, London [Wikipedia: Black Death in England: “A study reported in 2011 of skeletons exhumed from the Black Death cemetery in East Smithfield, London, found Yersinia pestis DNA.”]
      bacterium: Plague is caused by Yersinia pestis bacteria [Wikipedia: Black Death in England: “It is generally agreed today that the disease in question was plague, caused by Yersinia pestis bacteria.”]
      strain: Genotyping showed a then newly evolved strain, ancestral to modern strains [Wikipedia: Black Death in England: “Genotyping showed that it was [at that time] a newly evolved strain, ancestor of all modern strains”]
      defence: Modern medicine suggests a new strain met immune systems with little or no defence, which may help explain the high death rates [Wikipedia: Black Death in England: “because it was a new strain, the human immune system would have had little or no defence against it, helping to explain the plague's virulence and high death rates”]

### 2026-10-23-what-the-skeletons-said/f1 · frame 1 caption
      England, 1348. A plague arrives that halts the campaigns of the Hundred Years' War and kills an estimated 40 to 60 percent of the people.
    Rests on:
      war: Its most immediate consequence was a halt to the Hundred Years' War campaigns [Wikipedia: Black Death in England: “The most immediate consequence was a halt to the campaigns of the Hundred Years' War.”]
      toll: An estimated 40–60% of England's population died [Wikipedia: Black Death in England: “a figure of 40–60% of the population is widely accepted”]

### 2026-10-23-what-the-skeletons-said/f2 · frame 2 caption
      People at the time called it the Great Pestilence or the Great Mortality. The name Black Death only became common in the 17th century.
    Rests on:
      names: Contemporaries called it the Great Pestilence or the Great Mortality, not the Black Death [Wikipedia: Black Death in England: “was not used by contemporaries, who preferred such names as the "Great Pestilence" or the "Great Mortality"”]
      later: The name Black Death became common only in the 17th century [Wikipedia: Black Death in England: “It was not until the 17th century that the term under which we know the outbreak today became common”]

### 2026-10-23-what-the-skeletons-said/f3 · frame 3 caption
      Key proof of what it was came from London, from a cemetery at East Smithfield dug for the Black Death's dead.
    Rests on:
      dna: A 2011 study found Yersinia pestis DNA in skeletons from the Black Death cemetery in East Smithfield, London [Wikipedia: Black Death in England: “A study reported in 2011 of skeletons exhumed from the Black Death cemetery in East Smithfield, London, found Yersinia pestis DNA.”]

### 2026-10-23-what-the-skeletons-said/f5 · frame 5 caption
      Its genes showed a strain that was new at the time: the ancestor of modern plague strains.
    Rests on:
      strain: Genotyping showed a then newly evolved strain, ancestral to modern strains [Wikipedia: Black Death in England: “Genotyping showed that it was [at that time] a newly evolved strain, ancestor of all modern strains”]

### 2026-10-23-what-the-skeletons-said/f6 · frame 6 caption
      A new strain probably met bodies with little or no defence against it. That may help explain why so many died.
    Rests on:
      defence: Modern medicine suggests a new strain met immune systems with little or no defence, which may help explain the high death rates [Wikipedia: Black Death in England: “because it was a new strain, the human immune system would have had little or no defence against it, helping to explain the plague's virulence and high death rates”]

### 2026-10-23-what-the-skeletons-said/takeaway · takeaway
      The dead themselves named the killer: DNA from their skeletons showed Yersinia pestis, in a strain new at the time.
    Rests on:
      war: Its most immediate consequence was a halt to the Hundred Years' War campaigns [Wikipedia: Black Death in England: “The most immediate consequence was a halt to the campaigns of the Hundred Years' War.”]
      toll: An estimated 40–60% of England's population died [Wikipedia: Black Death in England: “a figure of 40–60% of the population is widely accepted”]
      names: Contemporaries called it the Great Pestilence or the Great Mortality, not the Black Death [Wikipedia: Black Death in England: “was not used by contemporaries, who preferred such names as the "Great Pestilence" or the "Great Mortality"”]
      later: The name Black Death became common only in the 17th century [Wikipedia: Black Death in England: “It was not until the 17th century that the term under which we know the outbreak today became common”]
      dna: A 2011 study found Yersinia pestis DNA in skeletons from the Black Death cemetery in East Smithfield, London [Wikipedia: Black Death in England: “A study reported in 2011 of skeletons exhumed from the Black Death cemetery in East Smithfield, London, found Yersinia pestis DNA.”]
      bacterium: Plague is caused by Yersinia pestis bacteria [Wikipedia: Black Death in England: “It is generally agreed today that the disease in question was plague, caused by Yersinia pestis bacteria.”]
      strain: Genotyping showed a then newly evolved strain, ancestral to modern strains [Wikipedia: Black Death in England: “Genotyping showed that it was [at that time] a newly evolved strain, ancestor of all modern strains”]
      defence: Modern medicine suggests a new strain met immune systems with little or no defence, which may help explain the high death rates [Wikipedia: Black Death in England: “because it was a new strain, the human immune system would have had little or no defence against it, helping to explain the plague's virulence and high death rates”]

### 2026-10-23-what-the-skeletons-said/claim.strain · claim and its quote (the quote must support the claim, and be in the source)
      Genotyping showed a then newly evolved strain, ancestral to modern strains
      quote: “Genotyping showed that it was [at that time] a newly evolved strain, ancestor of all modern strains”
      source: Wikipedia: Black Death in England

### 2026-10-23-what-the-skeletons-said/claim.defence · claim and its quote (the quote must support the claim, and be in the source)
      Modern medicine suggests a new strain met immune systems with little or no defence, which may help explain the high death rates
      quote: “because it was a new strain, the human immune system would have had little or no defence against it, helping to explain the plague's virulence and high death rates”
      source: Wikipedia: Black Death in England

### 2026-10-23-what-the-skeletons-said/media.m2 · image: alt text against the file description; credit and licence against Commons
      alt: Medieval painting of a battle: armoured knights on horseback and archers beneath banners, from Froissart's Chronicles
      credit: Loyset Liédet, 15th century · Public domain · https://commons.wikimedia.org/wiki/File:Battle_of_crecy_froissart.jpg
      Commons said: Public domain, 1998×1755

### 2026-10-23-what-the-skeletons-said/media.m1 · image: alt text against the file description; credit and licence against Commons
      alt: Old coloured map of England and Wales, with towns, roads and county borders, from a late-17th-century Dutch atlas
      credit: Dirk Jansz van Santen, c. 1685 · Public domain · https://commons.wikimedia.org/wiki/File:Atlas_Van_der_Hagen-KW1049B11_004-A_NEW_MAP_OF_THE_KINGDOME_of_ENGLAND,_Representing_the_Princedome_of_WALES,_and_other_PROVINCES,_CITIES,_MARKET_TOWNS,_with_the_ROADS_from_TOWN_to_TOWN.jpeg
      Commons said: Public domain, 4774×5500

### 2026-10-23-the-auld-alliance/title · title
      The alliance that was never revoked
    Rests on:
      signed: A Scottish embassy agreed the Treaty of Paris, signed on 23 October 1295 [Wikipedia: Auld Alliance: “In October 1295, a Scottish embassy to France agreed to the Treaty of Paris, which was signed on 23 October.”]
      terms: If either were attacked by England, the other would invade English territory [Wikipedia: Auld Alliance: “The terms of the treaty stipulated that if either country were attacked by England, the other country would invade English territory.”]
      favoured: The treaty favoured France [Wikipedia: Auld Alliance: “As with all subsequent renewals of what became the Auld Alliance, the treaty favoured France.”]
      gascony: France only had to keep fighting the English in Gascony [Wikipedia: Auld Alliance: “The French were required to do no more than continue their struggle against the English in Gascony.”]
      edward: Edward I's 1296 invasion all but ended Scottish independence [Wikipedia: Auld Alliance: “the treaty proved to be no protection against Edward, whose swift and devastating invasion of Scotland in 1296 all but eradicated its independence”]
      renewed: The French and Scottish monarchs of that period renewed the alliance, all but Louis XI [Wikipedia: Auld Alliance: “The alliance was renewed by all the French and Scottish monarchs of that period except Louis XI.”]
      revoked: The alliance was never formally revoked [Wikipedia: Auld Alliance: “The alliance was never formally revoked, although it is considered by some to have ended with the signing of the Treaty of Edinburgh in 1560.”]
      rugby: Scotland and France play for the Auld Alliance Trophy in rugby's Six Nations [Wikipedia: Auld Alliance: “the Auld Alliance Trophy is played for when Scotland and France play their match”]
      marriage: In 1558 the alliance was revived when Mary, Queen of Scots, married the future Francis II of France [Wikipedia: Auld Alliance: “In 1558, the alliance between the two kingdoms was revived with the marriage of Mary, Queen of Scots to the future Francis II of France”]

### 2026-10-23-the-auld-alliance/f5 · frame 5 caption
      The bond was renewed for centuries. In 1558 Mary, Queen of Scots, married the future Francis II of France.
    Rests on:
      renewed: The French and Scottish monarchs of that period renewed the alliance, all but Louis XI [Wikipedia: Auld Alliance: “The alliance was renewed by all the French and Scottish monarchs of that period except Louis XI.”]
      marriage: In 1558 the alliance was revived when Mary, Queen of Scots, married the future Francis II of France [Wikipedia: Auld Alliance: “In 1558, the alliance between the two kingdoms was revived with the marriage of Mary, Queen of Scots to the future Francis II of France”]

### 2026-10-23-the-auld-alliance/takeaway · takeaway
      Scotland and France allied against England in 1295, and the Auld Alliance was never formally revoked.
    Rests on:
      signed: A Scottish embassy agreed the Treaty of Paris, signed on 23 October 1295 [Wikipedia: Auld Alliance: “In October 1295, a Scottish embassy to France agreed to the Treaty of Paris, which was signed on 23 October.”]
      terms: If either were attacked by England, the other would invade English territory [Wikipedia: Auld Alliance: “The terms of the treaty stipulated that if either country were attacked by England, the other country would invade English territory.”]
      favoured: The treaty favoured France [Wikipedia: Auld Alliance: “As with all subsequent renewals of what became the Auld Alliance, the treaty favoured France.”]
      gascony: France only had to keep fighting the English in Gascony [Wikipedia: Auld Alliance: “The French were required to do no more than continue their struggle against the English in Gascony.”]
      edward: Edward I's 1296 invasion all but ended Scottish independence [Wikipedia: Auld Alliance: “the treaty proved to be no protection against Edward, whose swift and devastating invasion of Scotland in 1296 all but eradicated its independence”]
      renewed: The French and Scottish monarchs of that period renewed the alliance, all but Louis XI [Wikipedia: Auld Alliance: “The alliance was renewed by all the French and Scottish monarchs of that period except Louis XI.”]
      revoked: The alliance was never formally revoked [Wikipedia: Auld Alliance: “The alliance was never formally revoked, although it is considered by some to have ended with the signing of the Treaty of Edinburgh in 1560.”]
      rugby: Scotland and France play for the Auld Alliance Trophy in rugby's Six Nations [Wikipedia: Auld Alliance: “the Auld Alliance Trophy is played for when Scotland and France play their match”]
      marriage: In 1558 the alliance was revived when Mary, Queen of Scots, married the future Francis II of France [Wikipedia: Auld Alliance: “In 1558, the alliance between the two kingdoms was revived with the marriage of Mary, Queen of Scots to the future Francis II of France”]

### 2026-10-23-the-auld-alliance/claim.renewed · claim and its quote (the quote must support the claim, and be in the source)
      The French and Scottish monarchs of that period renewed the alliance, all but Louis XI
      quote: “The alliance was renewed by all the French and Scottish monarchs of that period except Louis XI.”
      source: Wikipedia: Auld Alliance

### 2026-10-23-the-auld-alliance/claim.marriage · claim and its quote (the quote must support the claim, and be in the source)
      In 1558 the alliance was revived when Mary, Queen of Scots, married the future Francis II of France
      quote: “In 1558, the alliance between the two kingdoms was revived with the marriage of Mary, Queen of Scots to the future Francis II of France”
      source: Wikipedia: Auld Alliance

### 2026-10-23-the-auld-alliance/media.m5 · image: alt text against the file description; credit and licence against Commons
      alt: Painted miniature of Francis II of France and Mary, Queen of Scots, as king and queen, in rich court dress
      credit: After François Clouet, c. 1573 · Public domain · https://commons.wikimedia.org/wiki/File:BnF,_NAL_83,_folio_154_v_-_Francis_II_and_Mary,_Queen_of_Scots.jpg
      Commons said: Public domain, 2376×3848

### 2026-10-23-whose-words-were-they/title · title
      Whose words were they
    Rests on:
      spencer: Herbert Spencer first used the phrase, in Principles of Biology (1864) [Wikipedia: Survival of the fittest: “Herbert Spencer first used the phrase, after reading Charles Darwin's On the Origin of Species, in his Principles of Biology (1864)”]
      meant: Spencer equated his phrase with Darwin's natural selection [Wikipedia: Survival of the fittest: “This survival of the fittest, which I have here sought to express in mechanical terms, is that which Mr. Darwin has called 'natural selection'”]
      wallace: In July 1866 Wallace wrote that readers took 'natural selection' to personify nature, and suggested Spencer's term [Wikipedia: Survival of the fittest: “In July 1866, Alfred Russel Wallace wrote to Darwin about readers thinking that the phrase "natural selection" personified nature as "selecting" and said this misconception could be avoided "by adopting Spencer's term"”]
      reply: Darwin replied that the advantages of Spencer's phrase had not occurred to him till he read Wallace's letter [Wikipedia: Survival of the fittest: “I fully agree with all that you say on the advantages of H. Spencer's excellent expression of 'the survival of the fittest'. This however had not occurred to me till reading your letter.”]
      fifth: Darwin introduced the phrase in the fifth edition of the Origin, 1869 [Wikipedia: Survival of the fittest: “In On the Origin of Species, he introduced the phrase in the fifth edition published in 1869”]
      meaning: In Darwinian terms it means survival of the form that leaves most copies of itself [Wikipedia: Survival of the fittest: “In Darwinian terms, the phrase is best understood as "survival of the form that in successive generations will leave most copies of itself."”]

### 2026-10-23-whose-words-were-they/f5 · frame 5 caption
      Darwin wrote back that the advantages of Spencer's phrase had not occurred to him until he read the letter. He put it in the fifth edition of the Origin, in 1869.
    Rests on:
      reply: Darwin replied that the advantages of Spencer's phrase had not occurred to him till he read Wallace's letter [Wikipedia: Survival of the fittest: “I fully agree with all that you say on the advantages of H. Spencer's excellent expression of 'the survival of the fittest'. This however had not occurred to me till reading your letter.”]
      fifth: Darwin introduced the phrase in the fifth edition of the Origin, 1869 [Wikipedia: Survival of the fittest: “In On the Origin of Species, he introduced the phrase in the fifth edition published in 1869”]

### 2026-10-23-whose-words-were-they/f6 · frame 6 caption
      In biology, fittest does not mean strongest. It is best understood as the form that leaves the most copies of itself.
    Rests on:
      meaning: In Darwinian terms it means survival of the form that leaves most copies of itself [Wikipedia: Survival of the fittest: “In Darwinian terms, the phrase is best understood as "survival of the form that in successive generations will leave most copies of itself."”]

### 2026-10-23-whose-words-were-they/takeaway · takeaway
      Survival of the fittest was Spencer's phrase. Darwin's letters show when and why he borrowed it.
    Rests on:
      spencer: Herbert Spencer first used the phrase, in Principles of Biology (1864) [Wikipedia: Survival of the fittest: “Herbert Spencer first used the phrase, after reading Charles Darwin's On the Origin of Species, in his Principles of Biology (1864)”]
      meant: Spencer equated his phrase with Darwin's natural selection [Wikipedia: Survival of the fittest: “This survival of the fittest, which I have here sought to express in mechanical terms, is that which Mr. Darwin has called 'natural selection'”]
      wallace: In July 1866 Wallace wrote that readers took 'natural selection' to personify nature, and suggested Spencer's term [Wikipedia: Survival of the fittest: “In July 1866, Alfred Russel Wallace wrote to Darwin about readers thinking that the phrase "natural selection" personified nature as "selecting" and said this misconception could be avoided "by adopting Spencer's term"”]
      reply: Darwin replied that the advantages of Spencer's phrase had not occurred to him till he read Wallace's letter [Wikipedia: Survival of the fittest: “I fully agree with all that you say on the advantages of H. Spencer's excellent expression of 'the survival of the fittest'. This however had not occurred to me till reading your letter.”]
      fifth: Darwin introduced the phrase in the fifth edition of the Origin, 1869 [Wikipedia: Survival of the fittest: “In On the Origin of Species, he introduced the phrase in the fifth edition published in 1869”]
      meaning: In Darwinian terms it means survival of the form that leaves most copies of itself [Wikipedia: Survival of the fittest: “In Darwinian terms, the phrase is best understood as "survival of the form that in successive generations will leave most copies of itself."”]

### 2026-10-23-whose-words-were-they/claim.reply · claim and its quote (the quote must support the claim, and be in the source)
      Darwin replied that the advantages of Spencer's phrase had not occurred to him till he read Wallace's letter
      quote: “I fully agree with all that you say on the advantages of H. Spencer's excellent expression of 'the survival of the fittest'. This however had not occurred to me till reading your letter.”
      source: Wikipedia: Survival of the fittest

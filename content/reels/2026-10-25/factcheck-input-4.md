# Adversarial fact-check (round 4: only what changed after round 3's fixes): reels for 2026-10-25

You are an independent checker. You did not write these reels. Your job is to BREAK them: for every
unit below, look for a claim that is wrong, overstated, missing a qualifier, unsupported by its quote,
a quote that is not word for word in its pinned source, a prediction key that is not clearly right
(or a wrong choice that is arguably right), alt text that describes something the picture does not
show, and a place tag that does not fit. Default to suspicion; "supported" needs evidence you can
point to. Teaching simplifications are fine if they are true; say "imprecise" when a qualifier is missing.

Pinned sources (text in content/reels/2026-10-25/sources/<file>, field "text"):
- Wikipedia: Hartog Plate → sources/Wikipedia_Hartog_Plate.json
- Wikipedia: Dirk Hartog → sources/Wikipedia_Dirk_Hartog.json
- https://commons.wikimedia.org/wiki/File:Ac_dirkhartogplate.jpg → sources/https_commons.wikimedia.org_wiki_File_Ac_dirkhartogplate.jpg.json
- Wikipedia: Dirk Hartog Island → sources/Wikipedia_Dirk_Hartog_Island.json
- https://commons.wikimedia.org/wiki/File:Ediacaran_ecosystem_diorama_NMNH.jpg → sources/https_commons.wikimedia.org_wiki_File_Ediacaran_ecosystem_diorama_NMNH.jpg.json
- Wikipedia: Ediacaran biota → sources/Wikipedia_Ediacaran_biota.json
- Wikipedia: George III → sources/Wikipedia_George_III.json
- Wikipedia: George II of Great Britain → sources/Wikipedia_George_II_of_Great_Britain.json
- https://commons.wikimedia.org/wiki/File:George,_Prince_of_Wales_(1738-1820),_by_Jean-%C3%89tienne_Liotard.jpg → sources/https_commons.wikimedia.org_wiki_File_George__Prince_of_Wales__1738-1820__by_Jean-_C3_89tienne_Liotard.jpg.json
- https://commons.wikimedia.org/wiki/File:E_coli_at_10000x,_original.jpg → sources/https_commons.wikimedia.org_wiki_File_E_coli_at_10000x__original.jpg.json
- Wikipedia: Escherichia coli → sources/Wikipedia_Escherichia_coli.json
- https://commons.wikimedia.org/wiki/File:Life_cycle_of_Escherichia_coli.png → sources/https_commons.wikimedia.org_wiki_File_Life_cycle_of_Escherichia_coli.png.json
- Wikipedia: Piano Concerto No. 1 (Tchaikovsky) → sources/Wikipedia_Piano_Concerto_No._1_Tchaikovsky_.json
- https://commons.wikimedia.org/wiki/File:Origin_of_Species.svg → sources/https_commons.wikimedia.org_wiki_File_Origin_of_Species.svg.json
- https://commons.wikimedia.org/wiki/File:Origin_of_Species_title_page.jpg → sources/https_commons.wikimedia.org_wiki_File_Origin_of_Species_title_page.jpg.json
- Wikipedia: On the Origin of Species → sources/Wikipedia_On_the_Origin_of_Species.json
- Wikipedia: Uspenski Cathedral → sources/Wikipedia_Uspenski_Cathedral.json
- Wikipedia: Aleksey Gornostayev → sources/Wikipedia_Aleksey_Gornostayev.json
- https://commons.wikimedia.org/wiki/File:Karl_Brullov_15.jpg → sources/https_commons.wikimedia.org_wiki_File_Karl_Brullov_15.jpg.json
Image licence snapshots: content/reels/2026-10-25/media.json. You may also look things up on the web
to break a claim (cite what you find), but a claim stands or falls on its pinned source.

Write content/reels/2026-10-25/factcheck-4.json:
{ "checker": "<who you are>", "checkedAt": "<ISO time>", "units": [
  { "id": "<unit id>", "verdict": "supported" | "imprecise" | "unsupported" | "wrong" | "quote-mismatch",
    "evidence": "<a short quote or [source] reference>", "note": "<what is wrong, if anything>", "fix": "<the smallest change that makes it right>" } ] }
One entry for every unit, in order.

## Units (7, 7 reels)

### 2026-10-25-a-dinner-plate-from-1616/prediction · prediction (the key must be right, every other choice wrong)
      In 1616 Dirk Hartog nailed a pewter plate to a post on an island off western Australia. When did the next European find it?
      KEY: About 80 years later
      Others: About 8 years later | About 800 years later
    Rests on:
      landing: On 25 October 1616 Hartog landed at Cape Inscription, the northernmost tip of Dirk Hartog Island in Shark Bay [Wikipedia: Hartog Plate: “On 25 October 1616, he landed at Cape Inscription on the very northernmost tip of Dirk Hartog Island, in Shark Bay.”]
      vlamingh: In 1697 the Dutch captain Willem de Vlamingh reached the island and found Hartog's plate [Wikipedia: Hartog Plate: “Eighty-one years later, in 1697, the Dutch sea captain Willem de Vlamingh also reached the island and discovered Hartog's pewter dish with the post almost rotted away.”]

### 2026-10-25-the-king-who-never-saw-hanover/title · title
      The Hanoverian who gloried in Britain
    Rests on:
      accession: At 22, George became king when his grandfather George II died suddenly on 25 October 1760 [Wikipedia: George III: “The following year, at the age of 22, George succeeded to the throne when his grandfather George II died suddenly on 25 October 1760, at age 76.”]
      g2: George II was born and raised in northern Germany and is the most recent British monarch born outside Great Britain [Wikipedia: George II of Great Britain: “Born and brought up in northern Germany, George is the most recent British monarch born outside Great Britain.”]
      first: George III was the first Hanoverian monarch born in Great Britain and speaking English as his first language, and he never visited Hanover [Wikipedia: George III: “He was the first monarch of the House of Hanover who was born in Great Britain, spoke English as his first language, and never visited Hanover.”]
      hanover: He was also elector, and later king, of Hanover [Wikipedia: George III: “He was concurrently duke and prince-elector of Hanover in the Holy Roman Empire before becoming King of Hanover on 12 October 1814.”]
      germany: His German titles included prince-elector of the Holy Roman Empire [Wikipedia: George III: “In Germany, he was "Duke of Brunswick and Lüneburg, Arch-Treasurer and Prince-elector of the Holy Roman Empire"”]
      south: He did not travel much and spent his entire life in southern England [Wikipedia: George III: “He did not travel extensively and spent his entire life in southern England.”]
      speech: In his accession speech to Parliament he said he gloried in the name of Britain [Wikipedia: George III: “George, in his accession speech to Parliament, proclaimed: "Born and educated in this country, I glory in the name of Britain."”]
      portrait: Liotard's pastel of George, Prince of Wales, is dated 1754 [https://commons.wikimedia.org/wiki/File:George,_Prince_of_Wales_(1738-1820),_by_Jean-%C3%89tienne_Liotard.jpg: “George, Prince of Wales (1738-1820) pastel on vellum 40.6 x 29.8 cm 1754”]

### 2026-10-25-the-king-who-never-saw-hanover/f2 · frame 2 caption (and what the voice says)
      Here he is still a prince, in 1754. His grandfather had been born and raised in northern Germany. No British monarch since has been born abroad.
      spoken: Here he is still a prince, in seventeen fifty-four. His grandfather had been born and raised in northern Germany. No British monarch since has been born abroad.
    Rests on:
      g2: George II was born and raised in northern Germany and is the most recent British monarch born outside Great Britain [Wikipedia: George II of Great Britain: “Born and brought up in northern Germany, George is the most recent British monarch born outside Great Britain.”]
      portrait: Liotard's pastel of George, Prince of Wales, is dated 1754 [https://commons.wikimedia.org/wiki/File:George,_Prince_of_Wales_(1738-1820),_by_Jean-%C3%89tienne_Liotard.jpg: “George, Prince of Wales (1738-1820) pastel on vellum 40.6 x 29.8 cm 1754”]

### 2026-10-25-the-king-who-never-saw-hanover/takeaway · takeaway
      George III became king on 25 October 1760. The first Hanoverian king born in Britain, he never visited Hanover.
    Rests on:
      accession: At 22, George became king when his grandfather George II died suddenly on 25 October 1760 [Wikipedia: George III: “The following year, at the age of 22, George succeeded to the throne when his grandfather George II died suddenly on 25 October 1760, at age 76.”]
      g2: George II was born and raised in northern Germany and is the most recent British monarch born outside Great Britain [Wikipedia: George II of Great Britain: “Born and brought up in northern Germany, George is the most recent British monarch born outside Great Britain.”]
      first: George III was the first Hanoverian monarch born in Great Britain and speaking English as his first language, and he never visited Hanover [Wikipedia: George III: “He was the first monarch of the House of Hanover who was born in Great Britain, spoke English as his first language, and never visited Hanover.”]
      hanover: He was also elector, and later king, of Hanover [Wikipedia: George III: “He was concurrently duke and prince-elector of Hanover in the Holy Roman Empire before becoming King of Hanover on 12 October 1814.”]
      germany: His German titles included prince-elector of the Holy Roman Empire [Wikipedia: George III: “In Germany, he was "Duke of Brunswick and Lüneburg, Arch-Treasurer and Prince-elector of the Holy Roman Empire"”]
      south: He did not travel much and spent his entire life in southern England [Wikipedia: George III: “He did not travel extensively and spent his entire life in southern England.”]
      speech: In his accession speech to Parliament he said he gloried in the name of Britain [Wikipedia: George III: “George, in his accession speech to Parliament, proclaimed: "Born and educated in this country, I glory in the name of Britain."”]
      portrait: Liotard's pastel of George, Prince of Wales, is dated 1754 [https://commons.wikimedia.org/wiki/File:George,_Prince_of_Wales_(1738-1820),_by_Jean-%C3%89tienne_Liotard.jpg: “George, Prince of Wales (1738-1820) pastel on vellum 40.6 x 29.8 cm 1754”]

### 2026-10-25-the-king-who-never-saw-hanover/claim.portrait · claim and its quote (the quote must support the claim, and be in the source)
      Liotard's pastel of George, Prince of Wales, is dated 1754
      quote: “George, Prince of Wales (1738-1820) pastel on vellum 40.6 x 29.8 cm 1754”
      source: https://commons.wikimedia.org/wiki/File:George,_Prince_of_Wales_(1738-1820),_by_Jean-%C3%89tienne_Liotard.jpg

### 2026-10-25-the-only-picture-in-the-origin/title · title
      The tree in Darwin's Origin
    Rests on:
      only: The diagram is the only illustration in Darwin's 1859 On the Origin of Species, and shows species diverging [https://commons.wikimedia.org/wiki/File:Origin_of_Species.svg: “The only illustration in Charles Darwin 's 1859 On the Origin of Species , showing the divergence of species.”]
      letters: Each letter stands for a separate line of descent [https://commons.wikimedia.org/wiki/File:Origin_of_Species.svg: “The letters A–L represent distinct descents.”]
      levels: In Darwin's example, each horizontal level stands for 1,000 generations [https://commons.wikimedia.org/wiki/File:Origin_of_Species.svg: “Each horizontal line represents 1000 generations.”]
      branching: Some lines branch into several living species [https://commons.wikimedia.org/wiki/File:Origin_of_Species.svg: “Descent A has 3 existent species after 10000 generations.”]
      extinct: Most of the lines die out [https://commons.wikimedia.org/wiki/File:Origin_of_Species.svg: “Descent A has 3 existent species after 10000 generations. Descent I has 2. Descents E, F have 1 each. The other descents have gone extinct.”]
      titlepage: The photograph shows the title page of the 1859 Murray edition [https://commons.wikimedia.org/wiki/File:Origin_of_Species_title_page.jpg: “which is of the title page and the facing page of the 1859 Murray edition of the Origin of species by Charles Darwin.”]
      published: The book was first published on 24 November 1859 with a first printing of 1,250 copies [Wikipedia: On the Origin of Species: “On the Origin of Species was first published on Thursday 24 November 1859, priced at fifteen shillings with a first printing of 1250 copies.”]
      editions: In Darwin's lifetime it went through six editions, revised to deal with counter-arguments [Wikipedia: On the Origin of Species: “During Darwin's lifetime the book went through six editions, with cumulative changes and revisions to deal with counter-arguments raised.”]
      word: The sixth edition was the first in which Darwin used the word evolution [Wikipedia: On the Origin of Species: “Darwin made extensive revisions to the sixth edition of the Origin (this was the first edition in which he used the word "evolution"”]
      sixth: The sixth edition came out on 19 February 1872 [Wikipedia: On the Origin of Species: “The sixth edition was published by Murray on 19 February 1872 as The Origin of Species, with "On" dropped from the title.”]
      ended: Every edition ended with the word evolved [Wikipedia: On the Origin of Species: “though all editions concluded with the word "evolved"”]

### 2026-10-25-bricks-from-a-demolished-fortress/title · title
      Seven hundred thousand bricks
    Rests on:
      opened: The cathedral was inaugurated on 25 October 1868 [Wikipedia: Uspenski Cathedral: “It was inaugurated on 25 October 1868.”]
      hill: It stands on a hillside overlooking the city [Wikipedia: Uspenski Cathedral: “The cathedral is set upon a hillside on the Katajanokka peninsula overlooking the city.”]
      architect: It was designed by the Russian architect Aleksey Gornostayev, who lived from 1808 to 1862 [Wikipedia: Uspenski Cathedral: “The cathedral designed by the Russian architect Aleksey Gornostayev (1808–1862).”]
      completed: The cathedral, his last work, was completed after his death [Wikipedia: Aleksey Gornostayev: “His last work, Orthodox Uspenski Cathedral in Helsinki, was completed after his death.”]
      portrait: The painting is a portrait of A. M. Gornostaev [https://commons.wikimedia.org/wiki/File:Karl_Brullov_15.jpg: “Портрет А. М. Горностаева.”]
      bricks: 700,000 bricks used to build it came by barge from the Bomarsund Fortress, demolished in the Crimean War [Wikipedia: Uspenski Cathedral: “Used in construction of the cathedral, 700 000 bricks were brought over in barges from the Bomarsund Fortress that had been demolished in the Crimean War.”]
      plaque: A plaque on the back commemorates Emperor Alexander II, sovereign of the Grand Duchy of Finland while it was built [Wikipedia: Uspenski Cathedral: “On the back of the cathedral, there is a plaque commemorating Russian Emperor Alexander II, who was the sovereign of the Grand Duchy of Finland during the cathedral's construction.”]
      main: It is the main cathedral of the Orthodox Church of Finland [Wikipedia: Uspenski Cathedral: “and main cathedral of the Orthodox Church of Finland”]
      tourists: About half a million tourists visit it each year [Wikipedia: Uspenski Cathedral: “Annually, about half a million tourists visit the church.”]

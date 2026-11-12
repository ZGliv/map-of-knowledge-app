# Adversarial fact-check (round 3: only what changed after round 2's fixes): reels for 2026-10-25

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

Write content/reels/2026-10-25/factcheck-3.json:
{ "checker": "<who you are>", "checkedAt": "<ISO time>", "units": [
  { "id": "<unit id>", "verdict": "supported" | "imprecise" | "unsupported" | "wrong" | "quote-mismatch",
    "evidence": "<a short quote or [source] reference>", "note": "<what is wrong, if anything>", "fix": "<the smallest change that makes it right>" } ] }
One entry for every unit, in order.

## Units (23, 7 reels)

### 2026-10-25-a-dinner-plate-from-1616/title · title
      A dinner plate from 1616
    Rests on:
      landing: On 25 October 1616 Hartog landed at Cape Inscription, the northernmost tip of Dirk Hartog Island in Shark Bay [Wikipedia: Hartog Plate: “On 25 October 1616, he landed at Cape Inscription on the very northernmost tip of Dirk Hartog Island, in Shark Bay.”]
      island: He made landfall on an island off Shark Bay, Western Australia, now named after him [Wikipedia: Dirk Hartog: “He made landfall at an island off the coast of Shark Bay, Western Australia, which is now called Dirk Hartog Island after him.”]
      plate: Before leaving, Hartog fixed a pewter plate to a post, scratched with a record of his visit [Wikipedia: Dirk Hartog: “Before Hartog left, he affixed a pewter plate to a post, now known as the Hartog plate, on which he scratched a record of his visit to the island.”]
      post: The pewter dinner plate was nailed to a post set upright on the cliff top [Wikipedia: Hartog Plate: “Before departing, Hartog left behind a pewter dinner plate, nailed to a post and placed upright in a fissure on the cliff top.”]
      photo: The photograph shows the Hartog Plate [https://commons.wikimedia.org/wiki/File:Ac_dirkhartogplate.jpg: “en:Hartog Plate or Dirk Hartog's Plate is either of two plates, although primarily the first, which were left on Dirk Hartog Island”]
      vlamingh: In 1697 the Dutch captain Willem de Vlamingh reached the island and found Hartog's plate [Wikipedia: Hartog Plate: “Eighty-one years later, in 1697, the Dutch sea captain Willem de Vlamingh also reached the island and discovered Hartog's pewter dish with the post almost rotted away.”]
      rijks: Vlamingh replaced it with his own plate copying Hartog's inscription; the original was returned to the Netherlands and is kept in the Rijksmuseum Amsterdam [Wikipedia: Hartog Plate: “He removed it and replaced it with another plate which was attached to a new post. The new post was made of a cypress pine trunk taken from Rottnest Island. The original dish was returned to the Netherlands, where it is still kept in the Rijksmuseum Amsterdam. De Vlamingh's replacement dish contains all of the text of Hartog's original plate”]
      oldest: Hartog's 1616 plate is the oldest-known artefact of European exploration in Australia still in existence [Wikipedia: Hartog Plate: “The first plate, left in 1616 by Dutch explorer Dirk Hartog, is the oldest-known artefact of European exploration in Australia still in existence.”]
      names: The island is named after Hartog; its traditional custodians, the Malgana people, call it Wirruwana [Wikipedia: Dirk Hartog Island: “Known as Wirruwana by the traditional custodians of the island, the Malgana people, the island is named after Dirk Hartog”]

### 2026-10-25-a-dinner-plate-from-1616/f4 · frame 4 caption
      He put up a new plate, and the original went back to the Netherlands. It is now in the Rijksmuseum in Amsterdam.
    Rests on:
      rijks: Vlamingh replaced it with his own plate copying Hartog's inscription; the original was returned to the Netherlands and is kept in the Rijksmuseum Amsterdam [Wikipedia: Hartog Plate: “He removed it and replaced it with another plate which was attached to a new post. The new post was made of a cypress pine trunk taken from Rottnest Island. The original dish was returned to the Netherlands, where it is still kept in the Rijksmuseum Amsterdam. De Vlamingh's replacement dish contains all of the text of Hartog's original plate”]

### 2026-10-25-a-dinner-plate-from-1616/prediction · prediction (the key must be right, every other choice wrong)
      In 1616 Dirk Hartog nailed a pewter plate to a post on an island off western Australia. Where is the plate now?
      KEY: In a museum in Amsterdam
      Others: Still on the island | Lost at sea
    Rests on:
      post: The pewter dinner plate was nailed to a post set upright on the cliff top [Wikipedia: Hartog Plate: “Before departing, Hartog left behind a pewter dinner plate, nailed to a post and placed upright in a fissure on the cliff top.”]
      island: He made landfall on an island off Shark Bay, Western Australia, now named after him [Wikipedia: Dirk Hartog: “He made landfall at an island off the coast of Shark Bay, Western Australia, which is now called Dirk Hartog Island after him.”]
      rijks: Vlamingh replaced it with his own plate copying Hartog's inscription; the original was returned to the Netherlands and is kept in the Rijksmuseum Amsterdam [Wikipedia: Hartog Plate: “He removed it and replaced it with another plate which was attached to a new post. The new post was made of a cypress pine trunk taken from Rottnest Island. The original dish was returned to the Netherlands, where it is still kept in the Rijksmuseum Amsterdam. De Vlamingh's replacement dish contains all of the text of Hartog's original plate”]

### 2026-10-25-a-dinner-plate-from-1616/takeaway · takeaway
      Hartog's plate marked his landing in 1616. Willem de Vlamingh removed it in 1697, and it is now in the Rijksmuseum in Amsterdam.
    Rests on:
      landing: On 25 October 1616 Hartog landed at Cape Inscription, the northernmost tip of Dirk Hartog Island in Shark Bay [Wikipedia: Hartog Plate: “On 25 October 1616, he landed at Cape Inscription on the very northernmost tip of Dirk Hartog Island, in Shark Bay.”]
      island: He made landfall on an island off Shark Bay, Western Australia, now named after him [Wikipedia: Dirk Hartog: “He made landfall at an island off the coast of Shark Bay, Western Australia, which is now called Dirk Hartog Island after him.”]
      plate: Before leaving, Hartog fixed a pewter plate to a post, scratched with a record of his visit [Wikipedia: Dirk Hartog: “Before Hartog left, he affixed a pewter plate to a post, now known as the Hartog plate, on which he scratched a record of his visit to the island.”]
      post: The pewter dinner plate was nailed to a post set upright on the cliff top [Wikipedia: Hartog Plate: “Before departing, Hartog left behind a pewter dinner plate, nailed to a post and placed upright in a fissure on the cliff top.”]
      photo: The photograph shows the Hartog Plate [https://commons.wikimedia.org/wiki/File:Ac_dirkhartogplate.jpg: “en:Hartog Plate or Dirk Hartog's Plate is either of two plates, although primarily the first, which were left on Dirk Hartog Island”]
      vlamingh: In 1697 the Dutch captain Willem de Vlamingh reached the island and found Hartog's plate [Wikipedia: Hartog Plate: “Eighty-one years later, in 1697, the Dutch sea captain Willem de Vlamingh also reached the island and discovered Hartog's pewter dish with the post almost rotted away.”]
      rijks: Vlamingh replaced it with his own plate copying Hartog's inscription; the original was returned to the Netherlands and is kept in the Rijksmuseum Amsterdam [Wikipedia: Hartog Plate: “He removed it and replaced it with another plate which was attached to a new post. The new post was made of a cypress pine trunk taken from Rottnest Island. The original dish was returned to the Netherlands, where it is still kept in the Rijksmuseum Amsterdam. De Vlamingh's replacement dish contains all of the text of Hartog's original plate”]
      oldest: Hartog's 1616 plate is the oldest-known artefact of European exploration in Australia still in existence [Wikipedia: Hartog Plate: “The first plate, left in 1616 by Dutch explorer Dirk Hartog, is the oldest-known artefact of European exploration in Australia still in existence.”]
      names: The island is named after Hartog; its traditional custodians, the Malgana people, call it Wirruwana [Wikipedia: Dirk Hartog Island: “Known as Wirruwana by the traditional custodians of the island, the Malgana people, the island is named after Dirk Hartog”]

### 2026-10-25-a-dinner-plate-from-1616/claim.rijks · claim and its quote (the quote must support the claim, and be in the source)
      Vlamingh replaced it with his own plate copying Hartog's inscription; the original was returned to the Netherlands and is kept in the Rijksmuseum Amsterdam
      quote: “He removed it and replaced it with another plate which was attached to a new post. The new post was made of a cypress pine trunk taken from Rottnest Island. The original dish was returned to the Netherlands, where it is still kept in the Rijksmuseum Amsterdam. De Vlamingh's replacement dish contains all of the text of Hartog's original plate”
      source: Wikipedia: Hartog Plate

### 2026-10-25-the-king-who-never-saw-hanover/title · title
      The king who never saw Hanover
    Rests on:
      accession: At 22, George became king when his grandfather George II died suddenly on 25 October 1760 [Wikipedia: George III: “The following year, at the age of 22, George succeeded to the throne when his grandfather George II died suddenly on 25 October 1760, at age 76.”]
      g2: George II was born and raised in northern Germany and is the most recent British monarch born outside Great Britain [Wikipedia: George II of Great Britain: “Born and brought up in northern Germany, George is the most recent British monarch born outside Great Britain.”]
      first: George III was the first Hanoverian monarch born in Great Britain and speaking English as his first language, and he never visited Hanover [Wikipedia: George III: “He was the first monarch of the House of Hanover who was born in Great Britain, spoke English as his first language, and never visited Hanover.”]
      hanover: He was also elector, and later king, of Hanover [Wikipedia: George III: “He was concurrently duke and prince-elector of Hanover in the Holy Roman Empire before becoming King of Hanover on 12 October 1814.”]
      germany: His German titles included prince-elector of the Holy Roman Empire [Wikipedia: George III: “In Germany, he was "Duke of Brunswick and Lüneburg, Arch-Treasurer and Prince-elector of the Holy Roman Empire"”]
      south: He did not travel much and spent his entire life in southern England [Wikipedia: George III: “He did not travel extensively and spent his entire life in southern England.”]
      speech: In his accession speech to Parliament he said he gloried in the name of Britain [Wikipedia: George III: “George, in his accession speech to Parliament, proclaimed: "Born and educated in this country, I glory in the name of Britain."”]
      portrait: Liotard's pastel shows George, Prince of Wales, in 1754 [https://commons.wikimedia.org/wiki/File:George,_Prince_of_Wales_(1738-1820),_by_Jean-%C3%89tienne_Liotard.jpg: “George, Prince of Wales”]

### 2026-10-25-the-king-who-never-saw-hanover/f2 · frame 2 caption (and what the voice says)
      Here he is still a prince, in 1754. His grandfather had been born and raised in northern Germany. No British monarch since has been born abroad.
      spoken: Here he is still a prince, in seventeen fifty-four. His grandfather had been born and raised in northern Germany. No British monarch since has been born abroad.
    Rests on:
      g2: George II was born and raised in northern Germany and is the most recent British monarch born outside Great Britain [Wikipedia: George II of Great Britain: “Born and brought up in northern Germany, George is the most recent British monarch born outside Great Britain.”]
      portrait: Liotard's pastel shows George, Prince of Wales, in 1754 [https://commons.wikimedia.org/wiki/File:George,_Prince_of_Wales_(1738-1820),_by_Jean-%C3%89tienne_Liotard.jpg: “George, Prince of Wales”]

### 2026-10-25-the-king-who-never-saw-hanover/f3 · frame 3 caption (and what the voice says)
      George III was the first Hanoverian king born in Britain, and the first with English as his first language.
      spoken: George the Third was the first Hanoverian king born in Britain, and the first with English as his first language.
    Rests on:
      first: George III was the first Hanoverian monarch born in Great Britain and speaking English as his first language, and he never visited Hanover [Wikipedia: George III: “He was the first monarch of the House of Hanover who was born in Great Britain, spoke English as his first language, and never visited Hanover.”]

### 2026-10-25-the-king-who-never-saw-hanover/f5 · frame 5 caption
      In his first speech to Parliament as king, he said he gloried in being British.
    Rests on:
      speech: In his accession speech to Parliament he said he gloried in the name of Britain [Wikipedia: George III: “George, in his accession speech to Parliament, proclaimed: "Born and educated in this country, I glory in the name of Britain."”]

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
      portrait: Liotard's pastel shows George, Prince of Wales, in 1754 [https://commons.wikimedia.org/wiki/File:George,_Prince_of_Wales_(1738-1820),_by_Jean-%C3%89tienne_Liotard.jpg: “George, Prince of Wales”]

### 2026-10-25-the-king-who-never-saw-hanover/claim.portrait · claim and its quote (the quote must support the claim, and be in the source)
      Liotard's pastel shows George, Prince of Wales, in 1754
      quote: “George, Prince of Wales”
      source: https://commons.wikimedia.org/wiki/File:George,_Prince_of_Wales_(1738-1820),_by_Jean-%C3%89tienne_Liotard.jpg

### 2026-10-25-evolution-you-can-watch/f1 · frame 1 caption (and what the voice says)
      E. coli breeds fast. In good conditions, one can split in two in as little as 20 minutes.
      spoken: Ee coli breeds fast. In good conditions, one can split in two in as little as twenty minutes.
    Rests on:
      twenty: In favourable conditions E. coli can reproduce in as little as 20 minutes [Wikipedia: Escherichia coli: “Under favourable conditions, it takes as little as 20 minutes to reproduce.”]
      fission: E. coli reproduces by binary fission, one cell splitting into two [Wikipedia: Escherichia coli: “Although E. coli reproduces by binary fission”]
      diagram: The diagram shows E. coli's life cycle, a cell dividing into two [https://commons.wikimedia.org/wiki/File:Life_cycle_of_Escherichia_coli.png: “Schematic diagram of the life cycle of Escherichia coli . Original caption During cell division, two new poles are formed, one in each of the progeny cells”]

### 2026-10-25-evolution-you-can-watch/f2 · frame 2 caption (and what the voice says)
      E. coli bacteria under an electron microscope, enlarged 10,000 times. Each rod is one bacterium.
      spoken: Ee coli bacteria under an electron microscope, enlarged ten thousand times. Each rod is one bacterium.
    Rests on:
      micrograph: The picture is an electron micrograph of a cluster of E. coli magnified 10,000 times [https://commons.wikimedia.org/wiki/File:E_coli_at_10000x,_original.jpg: “Low-temperature electron micrograph of a cluster of E. coli bacteria, magnified 10,000 times.”]
      rod: Each oblong shape in the picture is one bacterium [https://commons.wikimedia.org/wiki/File:E_coli_at_10000x,_original.jpg: “Each individual bacterium is oblong shaped.”]

### 2026-10-25-evolution-you-can-watch/f3 · frame 3 caption (and what the voice says)
      In 1988 Richard Lenski began growing E. coli in the lab, to watch evolution happen.
      spoken: In nineteen eighty-eight Richard Lenski began growing Ee coli in the lab, to watch evolution happen.
    Rests on:
      lenski: Richard Lenski's long-term evolution experiments with E. coli, begun in 1988, have followed genome evolution directly over more than 65,000 generations [Wikipedia: Escherichia coli: “The long-term evolution experiments using E. coli, begun by Richard Lenski in 1988, have allowed direct observation of genome evolution over more than 65,000 generations in the laboratory.”]

### 2026-10-25-evolution-you-can-watch/f4 · frame 4 caption (and what the voice says)
      His experiment has followed more than 65,000 generations.
      spoken: His experiment has followed more than sixty-five thousand generations.
    Rests on:
      lenski: Richard Lenski's long-term evolution experiments with E. coli, begun in 1988, have followed genome evolution directly over more than 65,000 generations [Wikipedia: Escherichia coli: “The long-term evolution experiments using E. coli, begun by Richard Lenski in 1988, have allowed direct observation of genome evolution over more than 65,000 generations in the laboratory.”]

### 2026-10-25-the-only-picture-in-the-origin/f1 · frame 1 caption (and what the voice says)
      Charles Darwin's On the Origin of Species came out in November 1859, in a first printing of 1,250 copies.
      spoken: Charles Darwin's On the Origin of Species came out in November eighteen fifty-nine, in a first printing of twelve hundred and fifty copies.
    Rests on:
      published: The book was first published on 24 November 1859 with a first printing of 1,250 copies [Wikipedia: On the Origin of Species: “On the Origin of Species was first published on Thursday 24 November 1859, priced at fifteen shillings with a first printing of 1250 copies.”]
      titlepage: The photograph shows the title page of the 1859 Murray edition [https://commons.wikimedia.org/wiki/File:Origin_of_Species_title_page.jpg: “which is of the title page and the facing page of the 1859 Murray edition of the Origin of species by Charles Darwin.”]

### 2026-10-25-the-only-picture-in-the-origin/f2 · frame 2 caption
      It has only one illustration. Lines climb from a row of letters; some stop short, while others fork again and again.
    Rests on:
      only: The diagram is the only illustration in Darwin's 1859 On the Origin of Species, and shows species diverging [https://commons.wikimedia.org/wiki/File:Origin_of_Species.svg: “The only illustration in Charles Darwin 's 1859 On the Origin of Species , showing the divergence of species.”]
      letters: Each letter stands for a separate line of descent [https://commons.wikimedia.org/wiki/File:Origin_of_Species.svg: “The letters A–L represent distinct descents.”]
      extinct: Most of the lines die out [https://commons.wikimedia.org/wiki/File:Origin_of_Species.svg: “Descent A has 3 existent species after 10000 generations. Descent I has 2. Descents E, F have 1 each. The other descents have gone extinct.”]
      branching: Some lines branch into several living species [https://commons.wikimedia.org/wiki/File:Origin_of_Species.svg: “Descent A has 3 existent species after 10000 generations.”]

### 2026-10-25-the-only-picture-in-the-origin/f3 · frame 3 caption (and what the voice says)
      Each letter is a line of descent. In Darwin's example, each level up the page stands for 1,000 generations.
      spoken: Each letter is a line of descent. In Darwin's example, each level up the page stands for a thousand generations.
    Rests on:
      letters: Each letter stands for a separate line of descent [https://commons.wikimedia.org/wiki/File:Origin_of_Species.svg: “The letters A–L represent distinct descents.”]
      levels: In Darwin's example, each horizontal level stands for 1,000 generations [https://commons.wikimedia.org/wiki/File:Origin_of_Species.svg: “Each horizontal line represents 1000 generations.”]

### 2026-10-25-the-only-picture-in-the-origin/f4 · frame 4 caption (and what the voice says)
      Darwin revised it through six editions, answering critics. Only the sixth, in 1872, used the word evolution.
      spoken: Darwin revised it through six editions, answering critics. Only the sixth, in eighteen seventy-two, used the word evolution.
    Rests on:
      editions: In Darwin's lifetime it went through six editions, revised to deal with counter-arguments [Wikipedia: On the Origin of Species: “During Darwin's lifetime the book went through six editions, with cumulative changes and revisions to deal with counter-arguments raised.”]
      word: The sixth edition was the first in which Darwin used the word evolution [Wikipedia: On the Origin of Species: “Darwin made extensive revisions to the sixth edition of the Origin (this was the first edition in which he used the word "evolution"”]
      sixth: The sixth edition came out on 19 February 1872 [Wikipedia: On the Origin of Species: “The sixth edition was published by Murray on 19 February 1872 as The Origin of Species, with "On" dropped from the title.”]

### 2026-10-25-the-only-picture-in-the-origin/f5 · frame 5 caption
      Yet every edition ends on the word evolved. The tree was there from the start.
    Rests on:
      ended: Every edition ended with the word evolved [Wikipedia: On the Origin of Species: “though all editions concluded with the word "evolved"”]
      only: The diagram is the only illustration in Darwin's 1859 On the Origin of Species, and shows species diverging [https://commons.wikimedia.org/wiki/File:Origin_of_Species.svg: “The only illustration in Charles Darwin 's 1859 On the Origin of Species , showing the divergence of species.”]

### 2026-10-25-the-only-picture-in-the-origin/prediction · prediction (the key must be right, every other choice wrong)
      On the Origin of Species, 1859, changed biology. How many illustrations does it have?
      KEY: Just one
      Others: About a dozen | More than a hundred
    Rests on:
      only: The diagram is the only illustration in Darwin's 1859 On the Origin of Species, and shows species diverging [https://commons.wikimedia.org/wiki/File:Origin_of_Species.svg: “The only illustration in Charles Darwin 's 1859 On the Origin of Species , showing the divergence of species.”]

### 2026-10-25-the-only-picture-in-the-origin/media.m3 · image: alt text against the file description; credit and licence against Commons
      alt: Photograph of Charles Darwin seated, in a dark coat and checked trousers, with his signature below
      credit: Maull & Polyblank, c. 1860 · Public domain · https://commons.wikimedia.org/wiki/File:Charles_Darwin_seated.jpg
      Commons said: Public domain, 2448×3456

### 2026-10-25-the-only-picture-in-the-origin/place · the atlas place it is tagged to (does the story belong there?)
      knowledge.science.biology.evolution.tree-thinking (expedition evolution-e01)

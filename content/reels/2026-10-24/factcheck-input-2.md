# Adversarial fact-check (round 2: only what changed after round 1's fixes): reels for 2026-10-24

You are an independent checker. You did not write these reels. Your job is to BREAK them: for every
unit below, look for a claim that is wrong, overstated, missing a qualifier, unsupported by its quote,
a quote that is not word for word in its pinned source, a prediction key that is not clearly right
(or a wrong choice that is arguably right), alt text that describes something the picture does not
show, and a place tag that does not fit. Default to suspicion; "supported" needs evidence you can
point to. Teaching simplifications are fine if they are true; say "imprecise" when a qualifier is missing.

Pinned sources (text in content/reels/2026-10-24/sources/<file>, field "text"):
- https://commons.wikimedia.org/wiki/File:Crowd_outside_nyse.jpg → sources/https_commons.wikimedia.org_wiki_File_Crowd_outside_nyse.jpg.json
- Wikipedia: Wall Street crash of 1929 → sources/Wikipedia_Wall_Street_crash_of_1929.json
- https://commons.wikimedia.org/wiki/File:19291030_Crash_of_'29_-_New_York_Times.jpg → sources/https_commons.wikimedia.org_wiki_File_19291030_Crash_of__29_-_New_York_Times.jpg.json
- https://commons.wikimedia.org/wiki/File:Harga_Saham_Wall_Street_1929_-_1932_menjunam.png → sources/https_commons.wikimedia.org_wiki_File_Harga_Saham_Wall_Street_1929_-_1932_menjunam.png.json
- https://commons.wikimedia.org/wiki/File:Astronomy_Evolution_2_(27458655072).jpg → sources/https_commons.wikimedia.org_wiki_File_Astronomy_Evolution_2__27458655072_.jpg.json
- Wikipedia: March of Progress → sources/Wikipedia_March_of_Progress.json
- https://commons.wikimedia.org/wiki/File:Frontispiece_to_Huxley_'Evidence_as_to_man's_place...'_Wellcome_L0063032.jpg → sources/https_commons.wikimedia.org_wiki_File_Frontispiece_to_Huxley__Evidence_as_to_man_s_place...__Wellcome_L0063032.jpg.json
- https://commons.wikimedia.org/wiki/File:Annotated_Moons_of_Uranus.png → sources/https_commons.wikimedia.org_wiki_File_Annotated_Moons_of_Uranus.png.json
- Wikipedia: Umbriel → sources/Wikipedia_Umbriel.json
- https://commons.wikimedia.org/wiki/File:William_Lassell.jpg → sources/https_commons.wikimedia.org_wiki_File_William_Lassell.jpg.json
- Wikipedia: Moons of Uranus → sources/Wikipedia_Moons_of_Uranus.json
- https://commons.wikimedia.org/wiki/File:PIA00040_Umbrielx2.47.jpg → sources/https_commons.wikimedia.org_wiki_File_PIA00040_Umbrielx2.47.jpg.json
- https://commons.wikimedia.org/wiki/File:016_Ocelot_in_Encontro_das_%C3%81guas_State_Park_Photo_by_Giles_Laurent.jpg → sources/https_commons.wikimedia.org_wiki_File_016_Ocelot_in_Encontro_das__C3_81guas_State_Park_Photo_by_Giles_Laurent.jpg.json
- Wikipedia: Ocelot → sources/Wikipedia_Ocelot.json
- https://commons.wikimedia.org/wiki/File:Jaguatirica.jpg → sources/https_commons.wikimedia.org_wiki_File_Jaguatirica.jpg.json
- https://commons.wikimedia.org/wiki/File:Santa_Mar%C3%ADa_Ausbruch_1902.jpg → sources/https_commons.wikimedia.org_wiki_File_Santa_Mar_C3_ADa_Ausbruch_1902.jpg.json
- Wikipedia: 1902 eruption of Santa María → sources/Wikipedia_1902_eruption_of_Santa_Mar_a.json
- https://commons.wikimedia.org/wiki/File:Crater_of_Santa_Maria_volcano,_Guatemala,_1903.png → sources/https_commons.wikimedia.org_wiki_File_Crater_of_Santa_Maria_volcano__Guatemala__1903.png.json
- Wikipedia: Carl Correns → sources/Wikipedia_Carl_Correns.json
- https://commons.wikimedia.org/wiki/File:Critique_of_the_Theory_of_Evolution_Fig_076.jpg → sources/https_commons.wikimedia.org_wiki_File_Critique_of_the_Theory_of_Evolution_Fig_076.jpg.json
- Wikipedia: Heritability → sources/Wikipedia_Heritability.json
Image licence snapshots: content/reels/2026-10-24/media.json. You may also look things up on the web
to break a claim (cite what you find), but a claim stands or falls on its pinned source.

Write content/reels/2026-10-24/factcheck-2.json:
{ "checker": "<who you are>", "checkedAt": "<ISO time>", "units": [
  { "id": "<unit id>", "verdict": "supported" | "imprecise" | "unsupported" | "wrong" | "quote-mismatch",
    "evidence": "<a short quote or [source] reference>", "note": "<what is wrong, if anything>", "fix": "<the smallest change that makes it right>" } ] }
One entry for every unit, in order.

## Units (43, 7 reels)

### 2026-10-24-the-crash-that-paused/title · title
      The crash that paused
    Rests on:
      photo: The photograph shows a crowd outside the Stock Exchange after the 1929 crash [https://commons.wikimedia.org/wiki/File:Crowd_outside_nyse.jpg: “A solemn crowd gathers outside the Stock Exchange after the crash. 1929.”]
      black: The crash is most associated with Thursday 24 October 1929 (Black Thursday) and Tuesday 29 October 1929 (Black Tuesday) [Wikipedia: Wall Street crash of 1929: “It is most associated with October 24, 1929, known as "Black Thursday", when a record 12.9 million shares were traded on the exchange, and October 29, 1929, or "Black Tuesday", when some 16.4 million shares were traded.”]
      open: On Black Thursday the market lost 11% of its value at the opening bell [Wikipedia: Wall Street crash of 1929: “On October 24, "Black Thursday", the market lost 11% of its value at the opening bell.”]
      bankers: Leading Wall Street bankers met to stop the panic [Wikipedia: Wall Street crash of 1929: “Several leading Wall Street bankers met to find a solution to the panic and chaos on the trading floor.”]
      whitney: The bankers chose Richard Whitney, the Exchange's vice president, to act for them [Wikipedia: Wall Street crash of 1929: “They chose Richard Whitney, vice president of the Exchange, to act on their behalf.”]
      bid: Whitney bid $205 a share for US Steel, well above the market price [Wikipedia: Wall Street crash of 1929: “Whitney placed a bid to purchase 25,000 shares of U.S. Steel at $205 per share, a price well above the current market.”]
      halted: The tactic halted the slide [Wikipedia: Wall Street crash of 1929: “The tactic was similar to one that had ended the Panic of 1907 and succeeded in halting the slide.”]
      close: The Dow closed Black Thursday down only 2.09% [Wikipedia: Wall Street crash of 1929: “The Dow Jones Industrial Average recovered, closing down only 6.38 points (2.09%) for the day.”]
      monday: On Monday 28 October the slide continued with a record one-day loss [Wikipedia: Wall Street crash of 1929: “On October 28, "Black Monday", more investors facing margin calls decided to get out of the market, and the slide continued with a record loss in the Dow for the day of 38.33 points, or 12.82%.”]
      twoday: With Black Tuesday's loss the Dow fell 23.05% in two days [Wikipedia: Wall Street crash of 1929: “The Dow lost an additional 30.57 points, or 11.73%, for a total drop of 68.90 points, or 23.05% in two days.”]
      nyt: The page is The New York Times of the day after Black Tuesday [https://commons.wikimedia.org/wiki/File:19291030_Crash_of_'29_-_New_York_Times.jpg: “Part of front page, and part of page 31, of The New York Times on the day after "Black Tuesday" U.S. stock market collapse.”]
      low: The Dow's lowest close came on 8 July 1932, an 89.2% loss in less than three years [Wikipedia: Wall Street crash of 1929: “The Dow then embarked on another, much longer, steady slide from April 1930 to July 8, 1932, when it closed at 41.22, its lowest level of the 20th century, concluding an 89.2% loss for the index in less than three years.”]
      peak: The Dow did not return to its September 1929 peak until November 1954 [Wikipedia: Wall Street crash of 1929: “The Dow Jones did not return to its peak close of September 3, 1929, for 25 years, until November 23, 1954.”]
      graph: The graph shows Wall Street share prices plunging from 1929 to 1932 [https://commons.wikimedia.org/wiki/File:Harga_Saham_Wall_Street_1929_-_1932_menjunam.png: “Graf ini menunjukan harga saham Wall Street menjunam dari tahun 1929 hingga tahun 1932”]

### 2026-10-24-the-crash-that-paused/f1 · frame 1 caption (and what the voice says)
      A crowd outside the New York Stock Exchange in 1929, after the crash.
      spoken: A crowd outside the New York Stock Exchange in nineteen twenty-nine, after the crash.
    Rests on:
      photo: The photograph shows a crowd outside the Stock Exchange after the 1929 crash [https://commons.wikimedia.org/wiki/File:Crowd_outside_nyse.jpg: “A solemn crowd gathers outside the Stock Exchange after the crash. 1929.”]

### 2026-10-24-the-crash-that-paused/f2 · frame 2 caption (and what the voice says)
      On Black Thursday, 24 October, prices fell 11 percent as trading opened.
      spoken: On Black Thursday, the twenty-fourth of October, prices fell 11 percent as trading opened.
    Rests on:
      black: The crash is most associated with Thursday 24 October 1929 (Black Thursday) and Tuesday 29 October 1929 (Black Tuesday) [Wikipedia: Wall Street crash of 1929: “It is most associated with October 24, 1929, known as "Black Thursday", when a record 12.9 million shares were traded on the exchange, and October 29, 1929, or "Black Tuesday", when some 16.4 million shares were traded.”]
      open: On Black Thursday the market lost 11% of its value at the opening bell [Wikipedia: Wall Street crash of 1929: “On October 24, "Black Thursday", the market lost 11% of its value at the opening bell.”]

### 2026-10-24-the-crash-that-paused/f3 · frame 3 caption (and what the voice says)
      Leading bankers had Richard Whitney, of the Exchange, bid $205 a share for US Steel, well above the market.
      spoken: Leading bankers had Richard Whitney, of the Exchange, bid two hundred and five dollars a share for U S Steel, well above the market.
    Rests on:
      bankers: Leading Wall Street bankers met to stop the panic [Wikipedia: Wall Street crash of 1929: “Several leading Wall Street bankers met to find a solution to the panic and chaos on the trading floor.”]
      whitney: The bankers chose Richard Whitney, the Exchange's vice president, to act for them [Wikipedia: Wall Street crash of 1929: “They chose Richard Whitney, vice president of the Exchange, to act on their behalf.”]
      bid: Whitney bid $205 a share for US Steel, well above the market price [Wikipedia: Wall Street crash of 1929: “Whitney placed a bid to purchase 25,000 shares of U.S. Steel at $205 per share, a price well above the current market.”]

### 2026-10-24-the-crash-that-paused/f6 · frame 6 caption (and what the voice says)
      By July 1932 it stood 89 percent below its 1929 peak, which it did not regain until 1954.
      spoken: By July nineteen thirty-two it stood 89 percent below its nineteen twenty-nine peak, which it did not regain until nineteen fifty-four.
    Rests on:
      low: The Dow's lowest close came on 8 July 1932, an 89.2% loss in less than three years [Wikipedia: Wall Street crash of 1929: “The Dow then embarked on another, much longer, steady slide from April 1930 to July 8, 1932, when it closed at 41.22, its lowest level of the 20th century, concluding an 89.2% loss for the index in less than three years.”]
      peak: The Dow did not return to its September 1929 peak until November 1954 [Wikipedia: Wall Street crash of 1929: “The Dow Jones did not return to its peak close of September 3, 1929, for 25 years, until November 23, 1954.”]
      graph: The graph shows Wall Street share prices plunging from 1929 to 1932 [https://commons.wikimedia.org/wiki/File:Harga_Saham_Wall_Street_1929_-_1932_menjunam.png: “Graf ini menunjukan harga saham Wall Street menjunam dari tahun 1929 hingga tahun 1932”]

### 2026-10-24-the-crash-that-paused/takeaway · takeaway
      Bankers briefly stopped Black Thursday's slide. By July 1932 the Dow stood 89 percent below its 1929 peak.
    Rests on:
      photo: The photograph shows a crowd outside the Stock Exchange after the 1929 crash [https://commons.wikimedia.org/wiki/File:Crowd_outside_nyse.jpg: “A solemn crowd gathers outside the Stock Exchange after the crash. 1929.”]
      black: The crash is most associated with Thursday 24 October 1929 (Black Thursday) and Tuesday 29 October 1929 (Black Tuesday) [Wikipedia: Wall Street crash of 1929: “It is most associated with October 24, 1929, known as "Black Thursday", when a record 12.9 million shares were traded on the exchange, and October 29, 1929, or "Black Tuesday", when some 16.4 million shares were traded.”]
      open: On Black Thursday the market lost 11% of its value at the opening bell [Wikipedia: Wall Street crash of 1929: “On October 24, "Black Thursday", the market lost 11% of its value at the opening bell.”]
      bankers: Leading Wall Street bankers met to stop the panic [Wikipedia: Wall Street crash of 1929: “Several leading Wall Street bankers met to find a solution to the panic and chaos on the trading floor.”]
      whitney: The bankers chose Richard Whitney, the Exchange's vice president, to act for them [Wikipedia: Wall Street crash of 1929: “They chose Richard Whitney, vice president of the Exchange, to act on their behalf.”]
      bid: Whitney bid $205 a share for US Steel, well above the market price [Wikipedia: Wall Street crash of 1929: “Whitney placed a bid to purchase 25,000 shares of U.S. Steel at $205 per share, a price well above the current market.”]
      halted: The tactic halted the slide [Wikipedia: Wall Street crash of 1929: “The tactic was similar to one that had ended the Panic of 1907 and succeeded in halting the slide.”]
      close: The Dow closed Black Thursday down only 2.09% [Wikipedia: Wall Street crash of 1929: “The Dow Jones Industrial Average recovered, closing down only 6.38 points (2.09%) for the day.”]
      monday: On Monday 28 October the slide continued with a record one-day loss [Wikipedia: Wall Street crash of 1929: “On October 28, "Black Monday", more investors facing margin calls decided to get out of the market, and the slide continued with a record loss in the Dow for the day of 38.33 points, or 12.82%.”]
      twoday: With Black Tuesday's loss the Dow fell 23.05% in two days [Wikipedia: Wall Street crash of 1929: “The Dow lost an additional 30.57 points, or 11.73%, for a total drop of 68.90 points, or 23.05% in two days.”]
      nyt: The page is The New York Times of the day after Black Tuesday [https://commons.wikimedia.org/wiki/File:19291030_Crash_of_'29_-_New_York_Times.jpg: “Part of front page, and part of page 31, of The New York Times on the day after "Black Tuesday" U.S. stock market collapse.”]
      low: The Dow's lowest close came on 8 July 1932, an 89.2% loss in less than three years [Wikipedia: Wall Street crash of 1929: “The Dow then embarked on another, much longer, steady slide from April 1930 to July 8, 1932, when it closed at 41.22, its lowest level of the 20th century, concluding an 89.2% loss for the index in less than three years.”]
      peak: The Dow did not return to its September 1929 peak until November 1954 [Wikipedia: Wall Street crash of 1929: “The Dow Jones did not return to its peak close of September 3, 1929, for 25 years, until November 23, 1954.”]
      graph: The graph shows Wall Street share prices plunging from 1929 to 1932 [https://commons.wikimedia.org/wiki/File:Harga_Saham_Wall_Street_1929_-_1932_menjunam.png: “Graf ini menunjukan harga saham Wall Street menjunam dari tahun 1929 hingga tahun 1932”]

### 2026-10-24-the-crash-that-paused/claim.black · claim and its quote (the quote must support the claim, and be in the source)
      The crash is most associated with Thursday 24 October 1929 (Black Thursday) and Tuesday 29 October 1929 (Black Tuesday)
      quote: “It is most associated with October 24, 1929, known as "Black Thursday", when a record 12.9 million shares were traded on the exchange, and October 29, 1929, or "Black Tuesday", when some 16.4 million shares were traded.”
      source: Wikipedia: Wall Street crash of 1929

### 2026-10-24-the-crash-that-paused/media.m1 · image: alt text against the file description; credit and licence against Commons
      alt: Black-and-white photograph looking down a street packed with people and parked cars, between tall stone buildings
      credit: US Social Security Administration archive, 1929 · Public domain · https://commons.wikimedia.org/wiki/File:Crowd_outside_nyse.jpg
      Commons said: Public domain, 718×1024

### 2026-10-24-the-crash-that-paused/media.m5 · image: alt text against the file description; credit and licence against Commons
      alt: Collage of parts of The New York Times, 30 October 1929: the masthead turned sideways, part of the front page with the banner headline Stocks collapse in 16,410,030-share day, but rally at close cheers brokers, and a trading-volume table from page 31
      credit: Work for hire of The New York Times, 1929 · Public domain · https://commons.wikimedia.org/wiki/File:19291030_Crash_of_'29_-_New_York_Times.jpg
      Commons said: Public domain, 3393×2796

### 2026-10-24-a-parade-not-a-family-line/title · title
      A parade, not a family line
    Rests on:
      astro: The image is titled Astronomy Evolution 2 [https://commons.wikimedia.org/wiki/File:Astronomy_Evolution_2_(27458655072).jpg: “Astronomy Evolution 2”]
      parody: The March of Progress has been widely parodied to make images of other kinds of progress [Wikipedia: March of Progress: “It has been widely parodied and imitated to create images of progress of other kinds.”]
      drawn: Rudolph Zallinger drew it for the Early Man volume, published in 1965 [Wikipedia: March of Progress: “It was created for the Early Man volume of the Life Nature Library, published in 1965, and drawn by the artist Rudolph Zallinger.”]
      parade: Its 15 figures are lined up as if marching in a parade, left to right [Wikipedia: March of Progress: “The 15 human evolutionary forebears are lined up as if they were marching in a parade from left to right.”]
      linear: It looks like one direct line of ancestors, but the original text knew that reading would be wrong [Wikipedia: March of Progress: “Contrary to appearances and some complaints, the original 1965 text of "The Road to Homo Sapiens" reveals an understanding of the fact that a linear presentation of a sequence of primate species, all in the direct line of human ancestors, would not be a correct interpretation.”]
      branch: The text called the fourth figure a likely side branch of the human family tree [Wikipedia: March of Progress: “For example, the fourth of Zallinger's figures (Oreopithecus) is said to be "a likely side branch on man's family tree".”]
      deadend: The text called the seventh figure an evolutionary dead end [Wikipedia: March of Progress: “Likewise, the seventh figure (Paranthropus) is said to be "an evolutionary dead end".”]
      howell: F. Clark Howell, the anthropologist who wrote the section, commented on how it was read [Wikipedia: March of Progress: “With regard to the way the illustration has been interpreted, the anthropologist and author of the section, F. Clark Howell, remarked”]
      intent: The artist did not intend a linear sequence, but viewers read it that way [Wikipedia: March of Progress: “The artist didn't intend to reduce the evolution of man to a linear sequence, but it was read that way by viewers.”]
      overwhelmed: Howell said the graphic overwhelmed the text [Wikipedia: March of Progress: “The graphic overwhelmed the text.”]
      huxley: Huxley's 1863 frontispiece compared ape and human skeletons, and the historian Jennifer Tucker argues its left-to-right sequence became a shorthand for evolution [Wikipedia: March of Progress: “Thomas Henry Huxley added a frontispiece to his 1863 book Evidence as to Man's Place in Nature comparing the skeletons of apes and humans, but historian Jennifer Tucker argues that its left-to-right progressionist sequence unintentionally became "an iconic and instantly recognizable visual shorthand for evolution".”]
      skeletons: The image is Huxley's frontispiece showing the skeletons of apes and man [https://commons.wikimedia.org/wiki/File:Frontispiece_to_Huxley_'Evidence_as_to_man's_place...'_Wellcome_L0063032.jpg: “Frontispiece to Huxley 'Evidence as to man's place in Nature'. Illustration showing skeleton's of apes and man”]
      progress: The March of Progress has been criticised as wrongly implying that evolution is progressive [Wikipedia: March of Progress: “It has also been criticized as "unintentionally and wrongly" implying that "evolution is progressive".”]

### 2026-10-24-a-parade-not-a-family-line/f2 · frame 2 caption (and what the voice says)
      Rudolph Zallinger drew the original for a 1965 book. Its 15 figures march as if each became the next.
      spoken: Rudolph Zallinger drew the original for a nineteen sixty-five book. Its 15 figures march as if each became the next.
    Rests on:
      drawn: Rudolph Zallinger drew it for the Early Man volume, published in 1965 [Wikipedia: March of Progress: “It was created for the Early Man volume of the Life Nature Library, published in 1965, and drawn by the artist Rudolph Zallinger.”]
      parade: Its 15 figures are lined up as if marching in a parade, left to right [Wikipedia: March of Progress: “The 15 human evolutionary forebears are lined up as if they were marching in a parade from left to right.”]
      linear: It looks like one direct line of ancestors, but the original text knew that reading would be wrong [Wikipedia: March of Progress: “Contrary to appearances and some complaints, the original 1965 text of "The Road to Homo Sapiens" reveals an understanding of the fact that a linear presentation of a sequence of primate species, all in the direct line of human ancestors, would not be a correct interpretation.”]

### 2026-10-24-a-parade-not-a-family-line/f4 · frame 4 caption
      The artist never meant a single line, its author said. The picture overpowered the words.
    Rests on:
      howell: F. Clark Howell, the anthropologist who wrote the section, commented on how it was read [Wikipedia: March of Progress: “With regard to the way the illustration has been interpreted, the anthropologist and author of the section, F. Clark Howell, remarked”]
      intent: The artist did not intend a linear sequence, but viewers read it that way [Wikipedia: March of Progress: “The artist didn't intend to reduce the evolution of man to a linear sequence, but it was read that way by viewers.”]
      overwhelmed: Howell said the graphic overwhelmed the text [Wikipedia: March of Progress: “The graphic overwhelmed the text.”]

### 2026-10-24-a-parade-not-a-family-line/f5 · frame 5 caption (and what the voice says)
      Thomas Henry Huxley's 1863 row of ape and human skeletons became an unintended shorthand for evolution, a historian argues.
      spoken: Thomas Henry Huxley's eighteen sixty-three row of ape and human skeletons became an unintended shorthand for evolution, a historian argues.
    Rests on:
      huxley: Huxley's 1863 frontispiece compared ape and human skeletons, and the historian Jennifer Tucker argues its left-to-right sequence became a shorthand for evolution [Wikipedia: March of Progress: “Thomas Henry Huxley added a frontispiece to his 1863 book Evidence as to Man's Place in Nature comparing the skeletons of apes and humans, but historian Jennifer Tucker argues that its left-to-right progressionist sequence unintentionally became "an iconic and instantly recognizable visual shorthand for evolution".”]
      skeletons: The image is Huxley's frontispiece showing the skeletons of apes and man [https://commons.wikimedia.org/wiki/File:Frontispiece_to_Huxley_'Evidence_as_to_man's_place...'_Wellcome_L0063032.jpg: “Frontispiece to Huxley 'Evidence as to man's place in Nature'. Illustration showing skeleton's of apes and man”]

### 2026-10-24-a-parade-not-a-family-line/f6 · frame 6 caption
      Critics say the march wrongly makes evolution look like progress.
    Rests on:
      progress: The March of Progress has been criticised as wrongly implying that evolution is progressive [Wikipedia: March of Progress: “It has also been criticized as "unintentionally and wrongly" implying that "evolution is progressive".”]
      huxley: Huxley's 1863 frontispiece compared ape and human skeletons, and the historian Jennifer Tucker argues its left-to-right sequence became a shorthand for evolution [Wikipedia: March of Progress: “Thomas Henry Huxley added a frontispiece to his 1863 book Evidence as to Man's Place in Nature comparing the skeletons of apes and humans, but historian Jennifer Tucker argues that its left-to-right progressionist sequence unintentionally became "an iconic and instantly recognizable visual shorthand for evolution".”]

### 2026-10-24-a-parade-not-a-family-line/takeaway · takeaway
      The famous march was never meant as a line of ancestors: its own book called one marcher a likely side branch and another a dead end.
    Rests on:
      astro: The image is titled Astronomy Evolution 2 [https://commons.wikimedia.org/wiki/File:Astronomy_Evolution_2_(27458655072).jpg: “Astronomy Evolution 2”]
      parody: The March of Progress has been widely parodied to make images of other kinds of progress [Wikipedia: March of Progress: “It has been widely parodied and imitated to create images of progress of other kinds.”]
      drawn: Rudolph Zallinger drew it for the Early Man volume, published in 1965 [Wikipedia: March of Progress: “It was created for the Early Man volume of the Life Nature Library, published in 1965, and drawn by the artist Rudolph Zallinger.”]
      parade: Its 15 figures are lined up as if marching in a parade, left to right [Wikipedia: March of Progress: “The 15 human evolutionary forebears are lined up as if they were marching in a parade from left to right.”]
      linear: It looks like one direct line of ancestors, but the original text knew that reading would be wrong [Wikipedia: March of Progress: “Contrary to appearances and some complaints, the original 1965 text of "The Road to Homo Sapiens" reveals an understanding of the fact that a linear presentation of a sequence of primate species, all in the direct line of human ancestors, would not be a correct interpretation.”]
      branch: The text called the fourth figure a likely side branch of the human family tree [Wikipedia: March of Progress: “For example, the fourth of Zallinger's figures (Oreopithecus) is said to be "a likely side branch on man's family tree".”]
      deadend: The text called the seventh figure an evolutionary dead end [Wikipedia: March of Progress: “Likewise, the seventh figure (Paranthropus) is said to be "an evolutionary dead end".”]
      howell: F. Clark Howell, the anthropologist who wrote the section, commented on how it was read [Wikipedia: March of Progress: “With regard to the way the illustration has been interpreted, the anthropologist and author of the section, F. Clark Howell, remarked”]
      intent: The artist did not intend a linear sequence, but viewers read it that way [Wikipedia: March of Progress: “The artist didn't intend to reduce the evolution of man to a linear sequence, but it was read that way by viewers.”]
      overwhelmed: Howell said the graphic overwhelmed the text [Wikipedia: March of Progress: “The graphic overwhelmed the text.”]
      huxley: Huxley's 1863 frontispiece compared ape and human skeletons, and the historian Jennifer Tucker argues its left-to-right sequence became a shorthand for evolution [Wikipedia: March of Progress: “Thomas Henry Huxley added a frontispiece to his 1863 book Evidence as to Man's Place in Nature comparing the skeletons of apes and humans, but historian Jennifer Tucker argues that its left-to-right progressionist sequence unintentionally became "an iconic and instantly recognizable visual shorthand for evolution".”]
      skeletons: The image is Huxley's frontispiece showing the skeletons of apes and man [https://commons.wikimedia.org/wiki/File:Frontispiece_to_Huxley_'Evidence_as_to_man's_place...'_Wellcome_L0063032.jpg: “Frontispiece to Huxley 'Evidence as to man's place in Nature'. Illustration showing skeleton's of apes and man”]
      progress: The March of Progress has been criticised as wrongly implying that evolution is progressive [Wikipedia: March of Progress: “It has also been criticized as "unintentionally and wrongly" implying that "evolution is progressive".”]

### 2026-10-24-a-parade-not-a-family-line/claim.howell · claim and its quote (the quote must support the claim, and be in the source)
      F. Clark Howell, the anthropologist who wrote the section, commented on how it was read
      quote: “With regard to the way the illustration has been interpreted, the anthropologist and author of the section, F. Clark Howell, remarked”
      source: Wikipedia: March of Progress

### 2026-10-24-a-parade-not-a-family-line/media.m5 · image: alt text against the file description; credit and licence against Commons
      alt: Engraving of five skeletons standing in a row, labelled gibbon, orang, chimpanzee, gorilla and man, with a printed caption below
      credit: Benjamin Waterhouse Hawkins for T. H. Huxley, 1863 · Wellcome Collection, cropped · CC BY 4.0 · https://commons.wikimedia.org/wiki/File:Frontispiece_to_Huxley_'Evidence_as_to_man's_place...'_Wellcome_L0063032.jpg
      Commons said: CC BY 4.0, 6252×3866

### 2026-10-24-two-real-moons-four-false/f1 · frame 1 caption (and what the voice says)
      Uranus and its moons, seen by the James Webb Space Telescope in 2023. Ariel and Umbriel were discovered on 24 October 1851.
      spoken: Uranus and its moons, seen by the James Webb Space Telescope in twenty twenty-three. Ariel and Umbriel were discovered on the twenty-fourth of October, eighteen fifty-one.
    Rests on:
      photo: The image of Uranus and its moons was taken by the James Webb telescope on 4 September 2023 [https://commons.wikimedia.org/wiki/File:Annotated_Moons_of_Uranus.png: “An updated near infrared (NIR) image of Uranus (September 4, 2023) from the James Webb Telescope”]
      found: William Lassell discovered Umbriel and Ariel on 24 October 1851 [Wikipedia: Umbriel: “It was discovered on October 24, 1851, by William Lassell at the same time as neighboring moon Ariel.”]

### 2026-10-24-two-real-moons-four-false/f3 · frame 3 caption (and what the voice says)
      Two other moons, Titania and Oberon, had been known since 1787. Their discoverer, William Herschel, claimed four more.
      spoken: Two other moons, Titania and Oberon, had been known since seventeen eighty-seven. Their discoverer, William Herschel, claimed four more.
    Rests on:
      herschel: William Herschel discovered Titania and Oberon in 1787 [Wikipedia: Moons of Uranus: “William Herschel discovered the first two moons, Titania and Oberon, in 1787.”]
      four: Herschel claimed four more moons, which were never confirmed [Wikipedia: Umbriel: “Although William Herschel, the discoverer of Titania and Oberon, claimed at the end of the 18th century that he had observed four additional moons of Uranus, his observations were not confirmed and those four objects are now thought to be spurious.”]

### 2026-10-24-a-coat-like-no-other/f1 · frame 1 caption (and what the voice says)
      A spotted hunter stands on a branch in Encontro das Águas State Park, in Brazil.
      spoken: A spotted hunter stands on a branch in Encontro dahs Ah-gwahs State Park, in Brazil.
    Rests on:
      park: The photograph shows an ocelot in Encontro das Águas State Park, Brazil [https://commons.wikimedia.org/wiki/File:016_Ocelot_in_Encontro_das_%C3%81guas_State_Park_Photo_by_Giles_Laurent.jpg: “Ocelot in Parque Estadual Encontro das Águas, Brazil”]

### 2026-10-24-a-coat-like-no-other/f2 · frame 2 caption (and what the voice says)
      It is an ocelot. Grown ones usually weigh between 7 and 15.5 kilograms.
      spoken: It is an ocelot. Grown ones usually weigh between seven and fifteen and a half kilograms.
    Rests on:
      size: Ocelots weigh between 7 and 15.5 kg on average [Wikipedia: Ocelot: “The ocelot (Leopardus pardalis) is a medium-sized spotted wild cat that reaches 40–50 cm (16–20 in) at the shoulders and weighs between 7 and 15.5 kg (15 and 34 lb) on average.”]

### 2026-10-24-a-coat-like-no-other/f6 · frame 6 caption (and what the voice says)
      It climbs, leaps and swims well. Its name may come from ōcēlōtl, a Nahuatl word that generally meant the jaguar.
      spoken: It climbs, leaps and swims well. Its name may come from oh-say-loht, a Nah-wah-tul word that generally meant the jaguar.
    Rests on:
      agile: Ocelots climb, leap and swim well [Wikipedia: Ocelot: “The ocelot is efficient at climbing, leaping and swimming.”]
      name: The name comes from the Nahuatl word ōcēlōtl, which generally refers to the jaguar [Wikipedia: Ocelot: “The name "ocelot" comes from the Nahuatl word ōcēlōtl (pronounced [oːˈseːloːt͡ɬ]), which generally refers to the jaguar, rather than the ocelot.”]
      latin: Latin ocellatus is another possible origin of the name, so the Nahuatl origin is not certain [Wikipedia: Ocelot: “Another possible origin for the name is the Latin ocellatus ("having little eyes" or "marked with eye-like spots"), in reference to the cat's spotted coat.”]

### 2026-10-24-the-volcano-thought-extinct/title · title
      The volcano that was thought extinct
    Rests on:
      photo: The photograph shows Santa María, Guatemala, during its 1902 eruption [https://commons.wikimedia.org/wiki/File:Santa_Mar%C3%ADa_Ausbruch_1902.jpg: “Der Vulkan Santa María in Guatemala während des Ausbruchs im Jahr 1902.”]
      norecord: There were no historical records of activity on the volcano before 1902 [Wikipedia: 1902 eruption of Santa María: “Prior to the 1902 eruption, there were no historical records of activity on the volcano.”]
      extinct: It was previously considered extinct [Wikipedia: 1902 eruption of Santa María: “It was previously considered extinct.”]
      began: The main eruption began on 24 October 1902 [Wikipedia: 1902 eruption of Santa María: “The main eruption began on 24 October 1902 and lasted no more than 20 hours.”]
      column: By 8 pm a large eruption column rose, with lightning flashes [Wikipedia: 1902 eruption of Santa María: “By 20:00, the volcano produced a large eruption column accompanied by lightning flashes.”]
      ash: Ash was already falling about 14 km from the volcano that evening [Wikipedia: 1902 eruption of Santa María: “At 18:15, ash particles were reported in Finca Helvetia, about 14 km (8.7 mi) west of the volcano.”]
      sextant: The captain of the SS Newport used a sextant to estimate the column's height at 27–29 km [Wikipedia: 1902 eruption of Santa María: “The captain of the S.S. Newport used her sextant to estimate the height of the eruption column at 27–29 km (17–18 mi).”]
      hours: The initial Plinian eruption went on for 18 to 20 hours [Wikipedia: 1902 eruption of Santa María: “The initial Plinian eruption continued for 18 to 20 hours.”]
      largest: It was one of the largest eruptions of the 20th century [Wikipedia: 1902 eruption of Santa María: “The 1902 eruption of Santa María was one of the largest eruptions of the 20th century, measuring a six on the volcanic explosivity index.”]
      heard: Explosions were heard in Costa Rica, some 850 km away [Wikipedia: 1902 eruption of Santa María: “Explosions were heard in Costa Rica, some 850 km (530 mi) southeast of the volcano, and also in Oaxaca and Belize.”]
      crater: A new crater formed [Wikipedia: 1902 eruption of Santa María: “Although there was no caldera, a new, oval-shaped crater formed.”]
      cratersize: The new crater measured about 1 km east to west [Wikipedia: 1902 eruption of Santa María: “In a late November survey, crater had an east-west axis of 1 km (0.62 mi)”]
      cratershot: The photograph shows the crater of Santa María [https://commons.wikimedia.org/wiki/File:Crater_of_Santa_Maria_volcano,_Guatemala,_1903.png: “The crater of Santa Maria, in the background the ash landscape furrowed by scours”]
      downplay: President Manuel Estrada Cabrera tried to downplay the eruption [Wikipedia: 1902 eruption of Santa María: “President Manuel Estrada Cabrera attempted to downplay the impact of the eruption.”]
      fair: The eruption came just before a propaganda fair, which the 26 October newspaper covered instead [Wikipedia: 1902 eruption of Santa María: “As the eruption occurred just before Fiestas Minervalias, a propaganda fair, commenced, the 26 October issue of Diario de Centro América heavily focused on the fair instead.”]
      report: Diario de Centro America's first report about the eruption was published on 3 November [Wikipedia: 1902 eruption of Santa María: “No issues were published on 27 and 28 October due to the festival, and the first report about the eruption was published on 3 November.”]

### 2026-10-24-the-volcano-thought-extinct/f1 · frame 1 caption (and what the voice says)
      Santa María in Guatemala, erupting in 1902. It had never been recorded erupting, and was thought extinct.
      spoken: Santa María in Guatemala, erupting in nineteen oh-two. It had never been recorded erupting, and was thought extinct.
    Rests on:
      photo: The photograph shows Santa María, Guatemala, during its 1902 eruption [https://commons.wikimedia.org/wiki/File:Santa_Mar%C3%ADa_Ausbruch_1902.jpg: “Der Vulkan Santa María in Guatemala während des Ausbruchs im Jahr 1902.”]
      norecord: There were no historical records of activity on the volcano before 1902 [Wikipedia: 1902 eruption of Santa María: “Prior to the 1902 eruption, there were no historical records of activity on the volcano.”]
      extinct: It was previously considered extinct [Wikipedia: 1902 eruption of Santa María: “It was previously considered extinct.”]

### 2026-10-24-the-volcano-thought-extinct/f2 · frame 2 caption (and what the voice says)
      On the evening of 24 October, an ash column rose amid lightning. A ship's captain later put its height by sextant at 27 to 29 kilometres.
      spoken: On the evening of the twenty-fourth of October, an ash column rose amid lightning. A ship's captain later put its height by sextant at twenty-seven to twenty-nine kilometres.
    Rests on:
      column: By 8 pm a large eruption column rose, with lightning flashes [Wikipedia: 1902 eruption of Santa María: “By 20:00, the volcano produced a large eruption column accompanied by lightning flashes.”]
      ash: Ash was already falling about 14 km from the volcano that evening [Wikipedia: 1902 eruption of Santa María: “At 18:15, ash particles were reported in Finca Helvetia, about 14 km (8.7 mi) west of the volcano.”]
      sextant: The captain of the SS Newport used a sextant to estimate the column's height at 27–29 km [Wikipedia: 1902 eruption of Santa María: “The captain of the S.S. Newport used her sextant to estimate the height of the eruption column at 27–29 km (17–18 mi).”]

### 2026-10-24-the-volcano-thought-extinct/f5 · frame 5 caption (and what the voice says)
      The president played it down, with a propaganda fair about to open. The official paper's first report appeared on 3 November.
      spoken: The president played it down, with a propaganda fair about to open. The official paper's first report appeared on the third of November.
    Rests on:
      downplay: President Manuel Estrada Cabrera tried to downplay the eruption [Wikipedia: 1902 eruption of Santa María: “President Manuel Estrada Cabrera attempted to downplay the impact of the eruption.”]
      fair: The eruption came just before a propaganda fair, which the 26 October newspaper covered instead [Wikipedia: 1902 eruption of Santa María: “As the eruption occurred just before Fiestas Minervalias, a propaganda fair, commenced, the 26 October issue of Diario de Centro América heavily focused on the fair instead.”]
      report: Diario de Centro America's first report about the eruption was published on 3 November [Wikipedia: 1902 eruption of Santa María: “No issues were published on 27 and 28 October due to the festival, and the first report about the eruption was published on 3 November.”]

### 2026-10-24-the-volcano-thought-extinct/takeaway · takeaway
      Santa María had no recorded eruption before 1902. Then its main eruption, one of the 20th century's largest, lasted some 20 hours.
    Rests on:
      photo: The photograph shows Santa María, Guatemala, during its 1902 eruption [https://commons.wikimedia.org/wiki/File:Santa_Mar%C3%ADa_Ausbruch_1902.jpg: “Der Vulkan Santa María in Guatemala während des Ausbruchs im Jahr 1902.”]
      norecord: There were no historical records of activity on the volcano before 1902 [Wikipedia: 1902 eruption of Santa María: “Prior to the 1902 eruption, there were no historical records of activity on the volcano.”]
      extinct: It was previously considered extinct [Wikipedia: 1902 eruption of Santa María: “It was previously considered extinct.”]
      began: The main eruption began on 24 October 1902 [Wikipedia: 1902 eruption of Santa María: “The main eruption began on 24 October 1902 and lasted no more than 20 hours.”]
      column: By 8 pm a large eruption column rose, with lightning flashes [Wikipedia: 1902 eruption of Santa María: “By 20:00, the volcano produced a large eruption column accompanied by lightning flashes.”]
      ash: Ash was already falling about 14 km from the volcano that evening [Wikipedia: 1902 eruption of Santa María: “At 18:15, ash particles were reported in Finca Helvetia, about 14 km (8.7 mi) west of the volcano.”]
      sextant: The captain of the SS Newport used a sextant to estimate the column's height at 27–29 km [Wikipedia: 1902 eruption of Santa María: “The captain of the S.S. Newport used her sextant to estimate the height of the eruption column at 27–29 km (17–18 mi).”]
      hours: The initial Plinian eruption went on for 18 to 20 hours [Wikipedia: 1902 eruption of Santa María: “The initial Plinian eruption continued for 18 to 20 hours.”]
      largest: It was one of the largest eruptions of the 20th century [Wikipedia: 1902 eruption of Santa María: “The 1902 eruption of Santa María was one of the largest eruptions of the 20th century, measuring a six on the volcanic explosivity index.”]
      heard: Explosions were heard in Costa Rica, some 850 km away [Wikipedia: 1902 eruption of Santa María: “Explosions were heard in Costa Rica, some 850 km (530 mi) southeast of the volcano, and also in Oaxaca and Belize.”]
      crater: A new crater formed [Wikipedia: 1902 eruption of Santa María: “Although there was no caldera, a new, oval-shaped crater formed.”]
      cratersize: The new crater measured about 1 km east to west [Wikipedia: 1902 eruption of Santa María: “In a late November survey, crater had an east-west axis of 1 km (0.62 mi)”]
      cratershot: The photograph shows the crater of Santa María [https://commons.wikimedia.org/wiki/File:Crater_of_Santa_Maria_volcano,_Guatemala,_1903.png: “The crater of Santa Maria, in the background the ash landscape furrowed by scours”]
      downplay: President Manuel Estrada Cabrera tried to downplay the eruption [Wikipedia: 1902 eruption of Santa María: “President Manuel Estrada Cabrera attempted to downplay the impact of the eruption.”]
      fair: The eruption came just before a propaganda fair, which the 26 October newspaper covered instead [Wikipedia: 1902 eruption of Santa María: “As the eruption occurred just before Fiestas Minervalias, a propaganda fair, commenced, the 26 October issue of Diario de Centro América heavily focused on the fair instead.”]
      report: Diario de Centro America's first report about the eruption was published on 3 November [Wikipedia: 1902 eruption of Santa María: “No issues were published on 27 and 28 October due to the festival, and the first report about the eruption was published on 3 November.”]

### 2026-10-24-the-volcano-thought-extinct/claim.ash · claim and its quote (the quote must support the claim, and be in the source)
      Ash was already falling about 14 km from the volcano that evening
      quote: “At 18:15, ash particles were reported in Finca Helvetia, about 14 km (8.7 mi) west of the volcano.”
      source: Wikipedia: 1902 eruption of Santa María

### 2026-10-24-the-volcano-thought-extinct/claim.report · claim and its quote (the quote must support the claim, and be in the source)
      Diario de Centro America's first report about the eruption was published on 3 November
      quote: “No issues were published on 27 and 28 October due to the festival, and the first report about the eruption was published on 3 November.”
      source: Wikipedia: 1902 eruption of Santa María

### 2026-10-24-the-volcano-thought-extinct/media.m3 · image: alt text against the file description; credit and licence against Commons
      alt: Old photograph looking down into a steep-sided crater filled with white steam, with bare, gullied slopes and mountains behind
      credit: Winterton, 1903 · Public domain · https://commons.wikimedia.org/wiki/File:Crater_of_Santa_Maria_volcano,_Guatemala,_1903.png
      Commons said: Public domain, 1052×1648

### 2026-10-24-leaves-that-follow-the-mother/title · title
      Leaves that follow the mother
    Rests on:
      botanist: Correns was a German botanist who discovered the principles of heredity independently of Hugo de Vries [Wikipedia: Carl Correns: “was a German botanist and geneticist notable primarily for his independent discovery of the principles of heredity, which he achieved simultaneously but independently of the botanist Hugo de Vries”]
      rediscovered: He rediscovered and independently verified Mendel's work [Wikipedia: Carl Correns: “He rediscovered and independently verified the work of Mendel in a separate model organism.”]
      paper: He published his first paper on heredity in 1900 [Wikipedia: Carl Correns: “Correns published his first paper on 25 January 1900, which cited both Charles Darwin and Mendel, recognising the relevance of genetics to Darwin's ideas.”]
      puzzle: He experimented with four o'clock plants to investigate apparent exceptions to Mendel's laws in mottled green-and-white leaves [Wikipedia: Carl Correns: “he undertook experiments with the four o'clock plant Mirabilis jalapa to investigate apparent counterexamples to Mendel's laws in the heredity of variegated (green and white mottled) leaf color”]
      reciprocal: Green pollen on a white stigma gave white offspring; white pollen on a green stigma gave green offspring [Wikipedia: Carl Correns: “However, if green pollen fertilized a white stigma, the progeny were white, but if the sexes of the donors were reversed (white pollen on a green stigma), the progeny were green.”]
      sex: Mendelian traits do not depend on which parent passes them on, but leaf colour depended greatly on it [Wikipedia: Carl Correns: “Correns found that, while Mendelian traits behave independently of the sex of the source parent, leaf color depended greatly on which parent had which trait.”]
      green: Seedlings of a green mother inherit working chloroplasts and so are green [Wikipedia: Carl Correns: “Conversely, if a white father is paired with a green mother with functional chloroplasts, the progeny will only inherit functional chloroplasts, and will thus be green.”]
      chloro: In most angiosperms the chloroplasts come only from the mother [Wikipedia: Carl Correns: “since the chloroplasts come exclusively from the mother in most angiosperms”]
      first: His 1909 paper made variegated leaf colour the first conclusive example of cytoplasmic inheritance [Wikipedia: Carl Correns: “In his 1909 paper, he established variegated leaf color as the first conclusive example of cytoplasmic inheritance.”]
      extra: Cytoplasmic inheritance showed that factors outside the chromosomes shape traits [Wikipedia: Carl Correns: “He also discovered cytoplasmic inheritance, an important extension of Mendel's theories, which demonstrated the existence of extrachromosomal factors on phenotype.”]

### 2026-10-24-leaves-that-follow-the-mother/f1 · frame 1 caption (and what the voice says)
      The German botanist Carl Correns rediscovered Mendel's laws of heredity, publishing in 1900.
      spoken: The German botanist Carl Correns rediscovered Mendel's laws of heredity, publishing in nineteen hundred.
    Rests on:
      botanist: Correns was a German botanist who discovered the principles of heredity independently of Hugo de Vries [Wikipedia: Carl Correns: “was a German botanist and geneticist notable primarily for his independent discovery of the principles of heredity, which he achieved simultaneously but independently of the botanist Hugo de Vries”]
      rediscovered: He rediscovered and independently verified Mendel's work [Wikipedia: Carl Correns: “He rediscovered and independently verified the work of Mendel in a separate model organism.”]
      paper: He published his first paper on heredity in 1900 [Wikipedia: Carl Correns: “Correns published his first paper on 25 January 1900, which cited both Charles Darwin and Mendel, recognising the relevance of genetics to Darwin's ideas.”]

### 2026-10-24-leaves-that-follow-the-mother/f6 · frame 6 caption (and what the voice says)
      His 1909 paper made it the first conclusive case of inheritance outside the chromosomes.
      spoken: His nineteen oh-nine paper made it the first conclusive case of inheritance outside the chromosomes.
    Rests on:
      first: His 1909 paper made variegated leaf colour the first conclusive example of cytoplasmic inheritance [Wikipedia: Carl Correns: “In his 1909 paper, he established variegated leaf color as the first conclusive example of cytoplasmic inheritance.”]
      extra: Cytoplasmic inheritance showed that factors outside the chromosomes shape traits [Wikipedia: Carl Correns: “He also discovered cytoplasmic inheritance, an important extension of Mendel's theories, which demonstrated the existence of extrachromosomal factors on phenotype.”]

### 2026-10-24-leaves-that-follow-the-mother/takeaway · takeaway
      Crossing four o'clocks both ways showed Correns that leaf colour can come from the mother alone.
    Rests on:
      botanist: Correns was a German botanist who discovered the principles of heredity independently of Hugo de Vries [Wikipedia: Carl Correns: “was a German botanist and geneticist notable primarily for his independent discovery of the principles of heredity, which he achieved simultaneously but independently of the botanist Hugo de Vries”]
      rediscovered: He rediscovered and independently verified Mendel's work [Wikipedia: Carl Correns: “He rediscovered and independently verified the work of Mendel in a separate model organism.”]
      paper: He published his first paper on heredity in 1900 [Wikipedia: Carl Correns: “Correns published his first paper on 25 January 1900, which cited both Charles Darwin and Mendel, recognising the relevance of genetics to Darwin's ideas.”]
      puzzle: He experimented with four o'clock plants to investigate apparent exceptions to Mendel's laws in mottled green-and-white leaves [Wikipedia: Carl Correns: “he undertook experiments with the four o'clock plant Mirabilis jalapa to investigate apparent counterexamples to Mendel's laws in the heredity of variegated (green and white mottled) leaf color”]
      reciprocal: Green pollen on a white stigma gave white offspring; white pollen on a green stigma gave green offspring [Wikipedia: Carl Correns: “However, if green pollen fertilized a white stigma, the progeny were white, but if the sexes of the donors were reversed (white pollen on a green stigma), the progeny were green.”]
      sex: Mendelian traits do not depend on which parent passes them on, but leaf colour depended greatly on it [Wikipedia: Carl Correns: “Correns found that, while Mendelian traits behave independently of the sex of the source parent, leaf color depended greatly on which parent had which trait.”]
      green: Seedlings of a green mother inherit working chloroplasts and so are green [Wikipedia: Carl Correns: “Conversely, if a white father is paired with a green mother with functional chloroplasts, the progeny will only inherit functional chloroplasts, and will thus be green.”]
      chloro: In most angiosperms the chloroplasts come only from the mother [Wikipedia: Carl Correns: “since the chloroplasts come exclusively from the mother in most angiosperms”]
      first: His 1909 paper made variegated leaf colour the first conclusive example of cytoplasmic inheritance [Wikipedia: Carl Correns: “In his 1909 paper, he established variegated leaf color as the first conclusive example of cytoplasmic inheritance.”]
      extra: Cytoplasmic inheritance showed that factors outside the chromosomes shape traits [Wikipedia: Carl Correns: “He also discovered cytoplasmic inheritance, an important extension of Mendel's theories, which demonstrated the existence of extrachromosomal factors on phenotype.”]

### 2026-10-24-leaves-that-follow-the-mother/claim.paper · claim and its quote (the quote must support the claim, and be in the source)
      He published his first paper on heredity in 1900
      quote: “Correns published his first paper on 25 January 1900, which cited both Charles Darwin and Mendel, recognising the relevance of genetics to Darwin's ideas.”
      source: Wikipedia: Carl Correns

### 2026-10-24-leaves-that-follow-the-mother/place · the atlas place it is tagged to (does the story belong there?)
      knowledge.science.biology.genetics-genomes

### 2026-10-24-the-sixty-percent-mistake/title · title
      The sixty percent mistake
    Rests on:
      photo: The picture shows a short and a tall boy holding stalks from a short and a tall race of corn [https://commons.wikimedia.org/wiki/File:Critique_of_the_Theory_of_Evolution_Fig_076.jpg: “A short and a tall boy each holding a stalk of corn—one stalk of a race of short corn, the other of tall corn.”]
      population: Heritability estimates how much of the variation in a trait within a population is due to genetic variation [Wikipedia: Heritability: “Heritability is a statistic used in the fields of breeding and genetics that estimates the degree of variation in a phenotypic trait in a population that is due to genetic variation between individuals in that population.”]
      confusion: Heritability causes confusion because its technical meaning differs from the everyday one [Wikipedia: Heritability: “It is the source of much confusion because its technical definition is different from its commonly-understood folk definition.”]
      personality: Even if the heritability of personality is about 0.6, it is incorrect to read that as 60% of your personality being inherited [Wikipedia: Heritability: “For example, it is incorrect to say that since the heritability of personality traits is about 0.6, that means that 60% of your personality is inherited from your parents and 40% comes from the environment.”]
      measures: Heritability measures the fraction of variation in a trait that can be attributed to genetic variation [Wikipedia: Heritability: “Heritability measures the fraction of phenotype variability that can be attributed to genetic variation.”]
      individual: It is not the fraction of one individual's trait that genes caused [Wikipedia: Heritability: “This is not the same as saying that this fraction of an individual phenotype is caused by genetics.”]
      notindividual: Heritability should not be read as a measure of how far a trait is genetically determined in an individual [Wikipedia: Heritability: “The heritability of a trait should not be interpreted as a measure of the extent to which said trait is genetically determined in an individual.”]
      specific: Heritability is specific to one population in one environment [Wikipedia: Heritability: “Heritability is specific to a particular population in a particular environment.”]
      shift: Heritability can change with no genetic change, for instance when the environment contributes more variation [Wikipedia: Heritability: “In addition, heritability can change without any genetic change occurring, such as when the environment starts contributing to more variation.”]

### 2026-10-24-the-sixty-percent-mistake/f2 · frame 2 caption (and what the voice says)
      Heritability is a statistic about such variation. For personality it has been put as high as 0.6, which is easy to misread as 60 percent of you.
      spoken: Heritability is a statistic about such variation. For personality it has been put as high as zero point six, which is easy to misread as sixty percent of you.
    Rests on:
      population: Heritability estimates how much of the variation in a trait within a population is due to genetic variation [Wikipedia: Heritability: “Heritability is a statistic used in the fields of breeding and genetics that estimates the degree of variation in a phenotypic trait in a population that is due to genetic variation between individuals in that population.”]
      personality: Even if the heritability of personality is about 0.6, it is incorrect to read that as 60% of your personality being inherited [Wikipedia: Heritability: “For example, it is incorrect to say that since the heritability of personality traits is about 0.6, that means that 60% of your personality is inherited from your parents and 40% comes from the environment.”]
      confusion: Heritability causes confusion because its technical meaning differs from the everyday one [Wikipedia: Heritability: “It is the source of much confusion because its technical definition is different from its commonly-understood folk definition.”]

### 2026-10-24-the-sixty-percent-mistake/f3 · frame 3 caption
      That reading is wrong. Heritability measures how much of the variation within a population can be put down to genetic differences.
    Rests on:
      personality: Even if the heritability of personality is about 0.6, it is incorrect to read that as 60% of your personality being inherited [Wikipedia: Heritability: “For example, it is incorrect to say that since the heritability of personality traits is about 0.6, that means that 60% of your personality is inherited from your parents and 40% comes from the environment.”]
      measures: Heritability measures the fraction of variation in a trait that can be attributed to genetic variation [Wikipedia: Heritability: “Heritability measures the fraction of phenotype variability that can be attributed to genetic variation.”]

### 2026-10-24-the-sixty-percent-mistake/prediction · prediction (the key must be right, every other choice wrong)
      Suppose personality traits have a heritability of about 0.6. Which reading of that number is right?
      KEY: It is about differences between people, not one person
      Others: 60% of your personality comes from your genes | 60 in 100 people inherit their parents' personality
    Rests on:
      measures: Heritability measures the fraction of variation in a trait that can be attributed to genetic variation [Wikipedia: Heritability: “Heritability measures the fraction of phenotype variability that can be attributed to genetic variation.”]
      individual: It is not the fraction of one individual's trait that genes caused [Wikipedia: Heritability: “This is not the same as saying that this fraction of an individual phenotype is caused by genetics.”]

### 2026-10-24-the-sixty-percent-mistake/takeaway · takeaway
      Heritability describes the differences within a population. It is not the share of one person's trait that genes caused.
    Rests on:
      photo: The picture shows a short and a tall boy holding stalks from a short and a tall race of corn [https://commons.wikimedia.org/wiki/File:Critique_of_the_Theory_of_Evolution_Fig_076.jpg: “A short and a tall boy each holding a stalk of corn—one stalk of a race of short corn, the other of tall corn.”]
      population: Heritability estimates how much of the variation in a trait within a population is due to genetic variation [Wikipedia: Heritability: “Heritability is a statistic used in the fields of breeding and genetics that estimates the degree of variation in a phenotypic trait in a population that is due to genetic variation between individuals in that population.”]
      confusion: Heritability causes confusion because its technical meaning differs from the everyday one [Wikipedia: Heritability: “It is the source of much confusion because its technical definition is different from its commonly-understood folk definition.”]
      personality: Even if the heritability of personality is about 0.6, it is incorrect to read that as 60% of your personality being inherited [Wikipedia: Heritability: “For example, it is incorrect to say that since the heritability of personality traits is about 0.6, that means that 60% of your personality is inherited from your parents and 40% comes from the environment.”]
      measures: Heritability measures the fraction of variation in a trait that can be attributed to genetic variation [Wikipedia: Heritability: “Heritability measures the fraction of phenotype variability that can be attributed to genetic variation.”]
      individual: It is not the fraction of one individual's trait that genes caused [Wikipedia: Heritability: “This is not the same as saying that this fraction of an individual phenotype is caused by genetics.”]
      notindividual: Heritability should not be read as a measure of how far a trait is genetically determined in an individual [Wikipedia: Heritability: “The heritability of a trait should not be interpreted as a measure of the extent to which said trait is genetically determined in an individual.”]
      specific: Heritability is specific to one population in one environment [Wikipedia: Heritability: “Heritability is specific to a particular population in a particular environment.”]
      shift: Heritability can change with no genetic change, for instance when the environment contributes more variation [Wikipedia: Heritability: “In addition, heritability can change without any genetic change occurring, such as when the environment starts contributing to more variation.”]

### 2026-10-24-the-sixty-percent-mistake/claim.personality · claim and its quote (the quote must support the claim, and be in the source)
      Even if the heritability of personality is about 0.6, it is incorrect to read that as 60% of your personality being inherited
      quote: “For example, it is incorrect to say that since the heritability of personality traits is about 0.6, that means that 60% of your personality is inherited from your parents and 40% comes from the environment.”
      source: Wikipedia: Heritability

### 2026-10-24-the-sixty-percent-mistake/media.m1 · image: alt text against the file description; credit and licence against Commons
      alt: Old photograph of two young men beside a measuring pole numbered 1 to 9: the shorter one holds a short corn plant, the taller one a corn stalk taller than himself
      credit: After A. F. Blakeslee, in Thomas Hunt Morgan, A Critique of the Theory of Evolution, 1916 · Public domain · https://commons.wikimedia.org/wiki/File:Critique_of_the_Theory_of_Evolution_Fig_076.jpg
      Commons said: Public domain, 597×856

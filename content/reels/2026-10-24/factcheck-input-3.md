# Adversarial fact-check (round 3: only what changed after round 2's fixes): reels for 2026-10-24

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

Write content/reels/2026-10-24/factcheck-3.json:
{ "checker": "<who you are>", "checkedAt": "<ISO time>", "units": [
  { "id": "<unit id>", "verdict": "supported" | "imprecise" | "unsupported" | "wrong" | "quote-mismatch",
    "evidence": "<a short quote or [source] reference>", "note": "<what is wrong, if anything>", "fix": "<the smallest change that makes it right>" } ] }
One entry for every unit, in order.

## Units (3, 7 reels)

### 2026-10-24-the-crash-that-paused/f2 · frame 2 caption (and what the voice says)
      On Black Thursday, 24 October, prices fell 11 percent soon after trading opened.
      spoken: On Black Thursday, the twenty-fourth of October, prices fell eleven percent soon after trading opened.
    Rests on:
      black: The crash is most associated with Thursday 24 October 1929 (Black Thursday) and Tuesday 29 October 1929 (Black Tuesday) [Wikipedia: Wall Street crash of 1929: “It is most associated with October 24, 1929, known as "Black Thursday", when a record 12.9 million shares were traded on the exchange, and October 29, 1929, or "Black Tuesday", when some 16.4 million shares were traded.”]
      open: On Black Thursday the market lost 11% of its value at the opening bell [Wikipedia: Wall Street crash of 1929: “On October 24, "Black Thursday", the market lost 11% of its value at the opening bell.”]

### 2026-10-24-the-crash-that-paused/prediction · prediction (the key must be right, every other choice wrong)
      Black Thursday, 24 October 1929: share prices plunge soon after trading opens. How far down is the Dow Jones average when trading closes?
      KEY: About 2 percent
      Others: About 11 percent | About 25 percent
    Rests on:
      close: The Dow closed Black Thursday down only 2.09% [Wikipedia: Wall Street crash of 1929: “The Dow Jones Industrial Average recovered, closing down only 6.38 points (2.09%) for the day.”]

### 2026-10-24-a-coat-like-no-other/f6 · frame 6 caption (and what the voice says)
      It climbs, leaps and swims well. Its name may come from ōcēlōtl, a Nahuatl word that generally meant the jaguar.
      spoken: It climbs, leaps and swims well. Its name may come from oh-SAY-lohtl, a Nah-wah-tul word that generally meant the jaguar.
    Rests on:
      agile: Ocelots climb, leap and swim well [Wikipedia: Ocelot: “The ocelot is efficient at climbing, leaping and swimming.”]
      name: The name comes from the Nahuatl word ōcēlōtl, which generally refers to the jaguar [Wikipedia: Ocelot: “The name "ocelot" comes from the Nahuatl word ōcēlōtl (pronounced [oːˈseːloːt͡ɬ]), which generally refers to the jaguar, rather than the ocelot.”]
      latin: Latin ocellatus is another possible origin of the name, so the Nahuatl origin is not certain [Wikipedia: Ocelot: “Another possible origin for the name is the Latin ocellatus ("having little eyes" or "marked with eye-like spots"), in reference to the cat's spotted coat.”]

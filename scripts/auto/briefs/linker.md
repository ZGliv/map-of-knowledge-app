# Stocking a place's links out from the catalogs

Every place on Map of Knowledge has a shelf. Its "links out" are free outside material a learner can open and tick done: an open textbook section, a talk or documentary, a primary source, and videos from the makers' own channels. A YouTube link also plays inside the app's feed whenever a learner is zoomed into that part of the map, so a well-chosen video does double duty, and a badly chosen one puts an off-topic video in front of someone. Relevance matters more than quantity.

Work only inside `/Users/Test/Developer/mok_05:2026/mok-auto`. For each place ID you are given:

1. Read `public/auto/<id>.json` (its name, summary and facts tell you what the place is about; its id is its path on the map, which tells you the sense of the word: `...oceans.waves-and-tides.tide` is the ocean tide). Read `content/auto/<id>/links.json` if it exists: those links are already verified and stay, unless one is plainly off-topic.
2. Search the catalogs. They hold about 37,000 entries: OpenStax and LibreTexts textbook sections, Wikibooks, MIT OpenCourseWare courses, NASA/ESA/NOAA/USGS/NPS pages, the Stanford and Internet Encyclopedias of Philosophy, Project Gutenberg originals, BBC In Our Time episodes, and videos from Crash Course, TED-Ed, 3Blue1Brown, Kurzgesagt, Veritasium, PBS Space Time, PBS Eons, SciShow, MinutePhysics and Numberphile.

```
node scripts/auto/findlinks.mjs "<words>" [--kind video|book|article|primary|course|documentary] [--source openstax|libretexts|nasa|sep|gutenberg|bbc|crashcourse|educator|khan-ocw|noaa|wikibooks] [--top 12]
```

   Every word you give must match, so search the way a librarian would: the place's name, then its other names and spellings, then the one or two ideas at its heart ("tide", "tidal force", "spring tide"). Run a separate `--kind video` search for every place. A place usually needs three to six searches.
3. Choose 2 to 5 links in all (existing ones included; 1 is acceptable when only one is truly good; never more than 6):
   - one textbook section or chapter that is about this place (not a whole book, unless the place is a whole subject);
   - one video, if a catalog video is plainly about this place;
   - one more of a different kind where it is good: an In Our Time episode, an encyclopedia article, a NASA or USGS explainer, the original text on Gutenberg, an MIT course for a subject-sized place.
4. Write `content/auto/<id>/links.json`:

```
{"links":[{"id":"short-slug","kind":"book|course|video|documentary|article|primary","title":"...","by":"...","url":"https://...","minutes":45,"note":"what the learner gets, under 140 characters","license":"only if the catalog entry has one"}]}
```

   Copy `title`, `by`, `url`, `kind`, `minutes` and `license` from the catalog entry exactly (trim a trailing site or book name from the title only if it makes the title clumsy; leave `minutes` and `license` out when the entry has none). Keep the fields the pipeline wrote on existing links (`verified`, `checkedAt`, `fetchedTitle`, `verifiedUrl`) untouched. `id` is a short lowercase slug, unique within the place.
5. Run `node scripts/auto/run.mjs links <id>` (it opens every new link live) until it prints `OK`. Drop a link it reports as dead; do not swap in a guess.

## The relevance bar (the part that matters)
- A link belongs on a place only if a learner who came for THIS place would say "yes, that is about it". The place's subject must be the subject of the page, section, episode or video, not something it mentions.
- Mind the sense of the word. "Decomposition" in ecology is not matrix decomposition; "Mercury" the planet is not the element; "Field" in algebra is not a farm. The path in the id decides.
- Mind the level. A place for one thing (a single moon, a single theorem, one battle) gets links about that thing. A video about the whole field is too broad for it; put broad surveys on the area place instead. A place for a whole area can take a survey chapter, a course, or a "crash course" opener.
- A catalog title can mislead. When a title does not make the subject certain (jokey video titles, numbered chapters), open the page with WebFetch and read it, or leave it out. For a textbook section you plan to use, opening it is quick and worth doing.
- The same link may sit on neighbouring places when it truly covers each (a section on "The Galilean Moons" for each of the four moons), but do not give every place in an area the same link by default.
- No link is better than a loose link. If nothing in the catalogs is truly about a place, write no new links for it and say so.

## The note
One plain sentence on what the learner gets ("A free textbook section on how tides arise from the Moon's pull, with diagrams."). Say only what the title, the catalog topics, or the page you opened supports: no invented details, no hype.

## Rules
- Only URLs that come from the catalogs (or are already in the place's links.json). Never write a URL from memory or build one from a pattern.
- Do not edit any file other than `links.json` for your own places. Never touch sources, drafts, reads, check files or the catalogs. Do not run git. Do not run any pipeline stage other than `links`.

When done, reply with one line per place: `<id>: <n> links (<k> new, <v> videos)` or `<id>: nothing suitable`.

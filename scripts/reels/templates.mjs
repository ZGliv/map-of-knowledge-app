// The reel engine's story templates and writing rules, shared by the drafting brief (any drafter,
// agent or API model reads the same words) and the skill. Distinct shapes, each with its own kind
// of prediction hook, so a day's set never reads as one reel five times.

export const TEMPLATES = {
  'this-day': {
    name: 'This day',
    fits: 'An on-this-day event, birth or death with a picture and a consequence that still shows.',
    shape: 'Open on the picture and the date. Two or three frames tell what happened, concretely. The reveal settles the prediction. Close on why it still matters, or what it changed.',
    hook: 'Ask about a consequential detail the story will settle: what happened next, how long it took, how many, which one. Three plausible choices.',
    dated: true,
  },
  number: {
    name: 'A number that surprises',
    fits: 'A story with one number (a size, an age, a count, a speed) that is far from what people would guess.',
    shape: 'Set up the thing in a frame or two, so the number has something to be compared with. Then the number, alone in its frame. Then what makes it that big or that small.',
    hook: 'Ask for the number, with choices an order of magnitude apart (about 10 / 1,000 / 1,000,000), or "more or less than…".',
    dated: false,
  },
  myth: {
    name: 'Myth and what is true',
    fits: 'Only when the pinned source itself says a common belief is wrong, and says what is true instead. Quote both.',
    shape: 'State the belief plainly, without mocking anyone who holds it. Show the evidence. Then what is true, and how it was found out.',
    hook: '"Which is true?" with the belief as one choice and the truth as another.',
    dated: false,
  },
  'how-we-know': {
    name: 'How we know',
    fits: 'A fact with a method behind it: a measurement, an experiment, a dating technique, an observation that settled a question.',
    shape: 'The fact first, briefly. Then the method, step by step, on the picture of the instrument, the site or the evidence. The reveal is the method. Close on what it showed.',
    hook: 'Ask how it was found or measured, with three methods that sound possible.',
    dated: false,
  },
  picture: {
    name: 'The picture',
    fits: 'A striking image (a picture of the day, a famous photograph, a painting, a specimen) that rewards a second look.',
    shape: 'Open on the image alone, with a plain description. Then move around it: what to notice, where and when it was made. The reveal names what it shows. Close on what it means.',
    hook: 'Ask what it is, where, how big or how old, before the reel says.',
    dated: false,
  },
};

export const RULES = `
Writing
- Plain English, concrete and specific: names, places, dates, numbers. One idea per reel.
- 4–7 frames. Each caption is one or two short sentences, at most 200 characters. The whole reel is
  60–100 spoken words: the voice reads about 2.3 words a second and a reel must stay under 50 seconds.
- Avoid abbreviations with full stops ("U.S.", "No. 1", "c. 1656", initials like "F. Clark"): the
  captions split into spoken lines at full stops. Write "US", "about 1656", the full name.
- Banned: "Did you know", hype ("amazing", "incredible", "fascinating", "stunning", "mind-blowing",
  "shocking", "you won't believe", "believe it or not", "whopping"…), AI tells ("delve", "tapestry",
  "testament to", "unveil", "unlock", "journey through", "let's dive in"), emoji, exclamation marks
  (except inside a quotation), questions in captions (the prediction is the question).
- Your own words: never eight words in a row from a source's text. Write from the facts.
- No "today", "this week" or "right now" unless the story is date-bound (it then expires).
- Titles: at most 60 characters, a phrase not a headline ("The fleet that lost its way").

Evidence
- Every frame, the prediction and the takeaway rest on claims. Every claim has an exact quote, 12–600
  characters, copied character for character from ONE numbered sentence of the source it cites
  (S1, S2…), without the [S1.4] marker. The claim itself is in your words.
- State only what a quote supports. Round numbers only the way the source does ("about", "nearly").
- A claim about what a picture shows cites the file's own description (its source key is listed with
  the file) or the article sentence that describes it.

The prediction (one tap before the story)
- A real question the story settles, 2–4 choices of at most 60 characters, exactly one right,
  wrong ones plausible. "reveal" is the 0-based index of the frame whose caption settles it.

Media
- Use one to three of the story's files. The first frame shows the hero. x and y are the focal point
  in percent of the image (0–100), zoom 1–2.2. Files marked "show whole" must keep zoom 1 on every
  frame (ShareAlike: never cropped or moved).
- Write alt text for each file you use, from its description: what is in the picture, plainly.
- Never an AI-made image; never a file that is not in the story's list.

Voice
- Add "say" when the voice could misread the caption: years ("1707" → "seventeen oh-seven"), symbols,
  abbreviations, names (spell them as they sound). "say" has the same number of sentences as "text".
`.trim();

export const DRAFT_SCHEMA = `{
  "drafter": "<who drafted: an agent name or a model id>",
  "reels": [
    {
      "story": "<story id from the brief>",
      "template": "this-day" | "number" | "myth" | "how-we-know" | "picture",
      "slug": "<lowercase-words-joined-by-hyphens, 2–6 words>",
      "title": "…",
      "hero": "m1",
      "prediction": { "prompt": "…", "choices": [{ "id": "a", "label": "…" }, …], "answer": "a", "reveal": 2, "claims": ["c1"] },
      "frames": [ { "media": "m1", "x": 50, "y": 45, "zoom": 1.1, "text": "…", "say": "… (optional)", "claims": ["c1"] }, … ],
      "takeaway": "…",
      "claims": [ { "id": "c1", "claim": "…in your words…", "source": "S1", "quote": "…exact words from S1…" }, … ],
      "alt": { "m1": "…" },
      "fit": { "m2": "contain" },  (optional: show a file whole even if it may move)
      "credit": { "m1": "…" },     (optional, after a fact-check: a better attribution than Commons' fields give)
      "place": "knowledge.…"       (optional, after a fact-check: a better atlas place than the matcher's)
    }
  ]
}`;

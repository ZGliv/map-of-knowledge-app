/** Evolution's Core shelf (PLAN §5.4), limited to rows verified in
 * mok-content-lab docs/research/appendix-evolution.md (verified 2026-10-16).
 * Links were re-checked on 2026-10-16: Gutenberg, LibriVox and BBC pages by title,
 * Open Library work keys by title + first author. "Why" lines are MoK's own words.
 *
 * Left off until verified: Reich, "Who We Are and How We Got Here" (its viewpoint
 * pairing is "chosen at verification" in the plan, so the row is not ready). */

export type WorkFormat = 'Book' | 'Public-domain book' | 'Textbook' | 'Lecture course' | 'Documentary series' | 'Radio series';

export interface LibraryWork {
  readonly id: string;
  readonly title: string;
  readonly creator: string;
  readonly year: number;
  readonly format: WorkFormat;
  /** Reading, viewing or listening time, as the appendix gives it. */
  readonly hours: string;
  readonly why: string;
  readonly links: readonly { label: string; url: string }[];
  /** A viewpoint pairing from the plan: read this alongside. */
  readonly pairedWith?: { title: string; creator: string; year: number; url: string };
  /** Evolution territories the work covers, from the slice's companion-check table (EVOLUTION-SLICE §11). */
  readonly covers?: readonly string[];
}

const openLibrary = (key: string) => `https://openlibrary.org/works/${key}`;

export const EVOLUTION_CORE: readonly LibraryWork[] = [
  {
    id: 'origin', title: 'On the Origin of Species', creator: 'Charles Darwin', year: 1859, format: 'Public-domain book', hours: '10.5 h read · 24.4 h audio',
    why: 'Darwin’s own long argument for descent with modification, written for any careful reader.',
    links: [{ label: 'Project Gutenberg', url: 'https://www.gutenberg.org/ebooks/1228' }, { label: 'LibriVox audio', url: 'https://librivox.org/the-origin-of-species-by-charles-darwin/' }],
    covers: ['E02', 'E03', 'E05', 'E06', 'E07', 'E01', 'E11'],
  },
  {
    id: 'triumph', title: 'Evolution: The Triumph of an Idea', creator: 'Carl Zimmer', year: 2001, format: 'Book', hours: 'about 10 h',
    why: 'A tour of the whole field, written as the companion to PBS’s Evolution series.',
    links: [{ label: 'Open Library', url: openLibrary('OL2699777W') }],
  },
  {
    id: 'finch', title: 'The Beak of the Finch', creator: 'Jonathan Weiner', year: 1994, format: 'Book', hours: '7 h',
    why: 'Natural selection measured year by year on one Galápagos island. Pulitzer Prize, 1995.',
    links: [{ label: 'Open Library', url: openLibrary('OL1974714W') }],
  },
  {
    id: 'inner-fish', title: 'Your Inner Fish', creator: 'Neil Shubin', year: 2008, format: 'Book', hours: '5 h',
    why: 'The hunt for Tiktaalik, and the fish anatomy still inside the human body.',
    links: [{ label: 'Open Library', url: openLibrary('OL8036314W') }],
    covers: ['E06', 'E07', 'E01'],
  },
  {
    id: 'selfish-gene', title: 'The Selfish Gene', creator: 'Richard Dawkins', year: 1976, format: 'Book', hours: '8 h',
    why: 'Evolution seen from the gene’s point of view.',
    links: [{ label: 'Open Library', url: openLibrary('OL1966488W') }],
    pairedWith: { title: 'Dawkins vs. Gould', creator: 'Kim Sterelny', year: 2001, url: openLibrary('OL1989283W') },
  },
  {
    id: 'wonderful-life', title: 'Wonderful Life', creator: 'Stephen Jay Gould', year: 1989, format: 'Book', hours: '8 h',
    why: 'The Burgess Shale, and how much of life’s history turned on chance.',
    links: [{ label: 'Open Library', url: openLibrary('OL473533W') }],
    pairedWith: { title: 'Life’s Solution', creator: 'Simon Conway Morris', year: 2003, url: openLibrary('OL8128801W') },
  },
  {
    id: 'endless-forms', title: 'Endless Forms Most Beautiful', creator: 'Sean B. Carroll', year: 2005, format: 'Book', hours: '8 h',
    why: 'Evo-devo: how a shared genetic toolkit builds very different bodies.',
    links: [{ label: 'Open Library', url: openLibrary('OL8062118W') }],
  },
  {
    id: 'ancestors-tale', title: 'The Ancestor’s Tale', creator: 'Richard Dawkins & Yan Wong', year: 2004, format: 'Book', hours: '15 h',
    why: 'The tree of life walked backwards, from us to the first cells.',
    links: [{ label: 'Open Library', url: openLibrary('OL1966480W') }],
  },
  {
    id: 'sixth-extinction', title: 'The Sixth Extinction', creator: 'Elizabeth Kolbert', year: 2014, format: 'Book', hours: '8 h',
    why: 'Mass extinction as something happening now. Pulitzer Prize, 2015.',
    links: [{ label: 'Open Library', url: openLibrary('OL16820830W') }],
  },
  {
    id: 'symbiotic-planet', title: 'Symbiotic Planet', creator: 'Lynn Margulis', year: 1998, format: 'Book', hours: '3 h',
    why: 'A short case for endosymbiosis: complex cells began as partnerships.',
    links: [{ label: 'Open Library', url: openLibrary('OL1959208W') }],
  },
  {
    id: 'bergstrom', title: 'Evolution', creator: 'Bergstrom & Dugatkin', year: 2012, format: 'Textbook', hours: '25–40 h',
    why: 'A complete introductory course in one volume.',
    links: [{ label: 'Open Library', url: openLibrary('OL16142811W') }],
  },
  {
    id: 'eeb-122', title: 'Principles of Evolution, Ecology and Behavior', creator: 'Stephen Stearns, Yale (EEB 122)', year: 2009, format: 'Lecture course', hours: 'about 35 h · 36 lectures',
    why: 'A full university course, free to watch.',
    links: [{ label: 'Open Yale Courses', url: 'https://oyc.yale.edu/ecology-and-evolutionary-biology/eeb-122' }],
  },
  {
    id: 'pbs-evolution', title: 'Evolution', creator: 'PBS / WGBH', year: 2001, format: 'Documentary series', hours: '7 episodes',
    why: 'Seven films, from Darwin’s idea to the evolutionary arms race and the origins of the mind.',
    links: [{ label: 'PBS', url: 'https://www.pbs.org/wgbh/evolution/' }],
  },
  {
    id: 'in-our-time-darwin', title: 'In Our Time: Darwin', creator: 'BBC Radio 4', year: 2009, format: 'Radio series', hours: '4 episodes · about 3 h',
    why: 'Four conversations: Darwin’s origins, the Beagle, the Origin itself, and what came after.',
    links: [{ label: 'BBC', url: 'https://www.bbc.co.uk/programmes/b00g9z9x' }],
    covers: ['E03', 'E12', 'E01'],
  },
];

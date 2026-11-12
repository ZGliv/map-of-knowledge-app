import { describe, expect, it } from 'vitest';
import { evolutionTerritoryId } from '../core/evolution';
import { applyImport, cleanTitle, htmlToText, importDate, isbn13, parseCsv, parseLibraryCsv, titleKey } from './importCsv';
import { createLibraryStore, entryAt, liveItems, liveNotes, notesFor, removeEntry, setStatus, upsertEntry, type LibraryStore } from './libraryStore';
// Anonymized synthetic parser fixtures in each service’s export format; no real review or private-note text.
import GOODREADS from './fixtures/goodreads_library_export.csv?raw';
import GOODREADS_2021 from './fixtures/goodreads_library_export_2021.csv?raw';
import STORYGRAPH from './fixtures/storygraph_export.csv?raw';

const NOW = '2001-10-23T15:00:00.000Z';

describe('reading CSV', () => {
  it('handles quotes, doubled quotes, delimiters and line breaks inside fields', () => {
    expect(parseCsv('a,b,c\n"x, y","say ""hi""","line one\nline two"\n')).toEqual([['a', 'b', 'c'], ['x, y', 'say "hi"', 'line one\nline two']]);
  });
  it('ignores a byte-order mark, Windows line endings and blank lines', () => {
    expect(parseCsv('﻿a,b\r\n1,2\r\n\r\n3,4')).toEqual([['a', 'b'], ['1', '2'], ['3', '4']]);
  });
  it('reads the semicolons or tabs a spreadsheet saves', () => {
    expect(parseCsv('Title;Author\n"A; B";C')).toEqual([['Title', 'Author'], ['A; B', 'C']]);
    expect(parseCsv('Title\tAuthor\nA\tB')).toEqual([['Title', 'Author'], ['A', 'B']]);
  });
  it('keeps a stray quote in an unquoted field, and Goodreads’ unquoted ="…" survives', () => {
    expect(parseCsv('a,b\n5" floppy,="0679733736"')).toEqual([['a', 'b'], ['5" floppy', '="0679733736"']]);
  });
});

describe('fields', () => {
  it('reads ISBNs in every form the exports use, and refuses bad ones', () => {
    expect(isbn13('="9780679733379"')).toBe('9780679733379');
    expect(isbn13('="067973337X"')).toBe('9780679733379');
    expect(isbn13('0-679-73337-X')).toBe('9780679733379');
    expect(isbn13('=""')).toBeNull();
    expect(isbn13('9780679733370')).toBeNull(); // wrong check digit
    expect(isbn13('c7a6f0de-1c47-4f3e-8a43-6d1e0d8b2f5a')).toBeNull();
  });
  it('reads dates as the same calendar day everywhere, and refuses impossible ones', () => {
    expect(importDate('2000/01/19')).toBe('2000-01-19T12:00:00.000Z');
    expect(importDate('2000-1-9')).toBe('2000-01-09T12:00:00.000Z');
    expect(importDate('2000/02/30')).toBeNull();
    expect(importDate('')).toBeNull();
  });
  it('sets the series apart from the title', () => {
    expect(cleanTitle('The Fellowship of the Ring (The Lord of the Rings, #1)')).toEqual({ title: 'The Fellowship of the Ring', series: 'The Lord of the Rings, #1' });
    expect(cleanTitle('Foundation (Foundation, #1)')).toEqual({ title: 'Foundation', series: 'Foundation, #1' });
    expect(cleanTitle('Non-Well-Founded Sets (Volume 14) (Lecture Notes)').series).toBeNull();
  });
  it('turns a review’s HTML into plain lines', () => {
    expect(htmlToText('One drought at a time.<br/><br/>The Grants &amp; their <i>finches</i>.')).toBe('One drought at a time.\n\nThe Grants & their finches.');
  });
  it('recognises one book across catalogs by main title and surname', () => {
    expect(titleKey('The Beak of the Finch: A Story of Evolution in Our Time', 'Jonathan Weiner')).toBe(titleKey('The Beak of the Finch', 'Weiner, Jonathan'.split(', ').reverse().join(' ')));
    expect(titleKey('Gödel, Escher, Bach', 'Douglas R. Hofstadter')).toBe('godel escher bach|hofstadter');
  });
});

describe('a Goodreads export', () => {
  const parsed = parseLibraryCsv(GOODREADS);
  it('is recognised and read row by row', () => {
    expect(parsed.source).toBe('goodreads');
    expect(parsed.rows).toHaveLength(44);
    expect(parsed.skipped).toBe(0);
  });
  it('maps the exclusive shelf, the dates, the rating and the ISBN', () => {
    const finch = parsed.rows.find(r => r.sourceId === '172367')!;
    expect(finch).toMatchObject({ title: 'The Beak of the Finch: A Story of Evolution in Our Time', creator: 'Jonathan Weiner', isbn: '9780679733379', year: 1994, status: 'finished', addedAt: '2000-04-20T12:00:00.000Z', finishedAt: '2000-05-04T12:00:00.000Z', rating: 5, shelves: ['science', 'evolution', 'favorites'] });
    expect(finch.review).toBe("Synthetic review for parser fixture row 4.\n\nA \"quoted\" example & plain text.");
    expect(finch.privateNotes).toBe("Synthetic private note for parser fixture row 4.");
    expect(parsed.rows.find(r => r.sourceId === '27276428')).toMatchObject({ status: 'started', finishedAt: null, rating: null, shelves: ['science'] });
    expect(parsed.rows.find(r => r.sourceId === '7170627')).toMatchObject({ status: 'want', shelves: [] });
    expect(parsed.rows.find(r => r.sourceId === '24113')).toMatchObject({ status: 'stopped', title: 'Gödel, Escher, Bach: An Eternal Golden Braid' });
    expect(parsed.rows.find(r => r.sourceId === '30659')).toMatchObject({ year: 180, rating: 5 });
    expect(parsed.rows.find(r => r.sourceId === '29579')).toMatchObject({ title: 'Foundation', series: 'Foundation, #1', isbn: null, format: 'Kindle Edition' });
  });
  it('reads quotes inside a review exactly', () => {
    expect(parsed.rows.find(r => r.sourceId === '61535')!.review).toContain('\"quoted\" example');
  });
  it('reads the older 31-column export, with a byte-order mark and Windows line endings', () => {
    const old = parseLibraryCsv(GOODREADS_2021);
    expect(old.source).toBe('goodreads');
    expect(old.rows.map(r => r.title)).toEqual(['A Brief History of Time', 'The Selfish Gene', 'Pride and Prejudice']);
  });
  it('reads the same file re-saved by a spreadsheet with semicolons', () => {
    const resaved = parseCsv(GOODREADS).map(cells => cells.map(cell => /[;"\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell).join(';')).join('\r\n');
    expect(parseLibraryCsv(resaved).rows).toEqual(parsed.rows);
  });
});

describe('a StoryGraph export', () => {
  const parsed = parseLibraryCsv(STORYGRAPH);
  it('is recognised, with every read status', () => {
    expect(parsed.source).toBe('storygraph');
    expect(parsed.rows).toHaveLength(12);
    expect(parsed.rows.map(r => r.status)).toEqual(['finished', 'finished', 'finished', 'started', 'finished', 'stopped', 'started', 'finished', 'want', 'want', 'finished', 'want']);
  });
  it('reads quarter-star ratings, the first author, tags and the reading dates', () => {
    const tale = parsed.rows[0];
    expect(tale).toMatchObject({ creator: 'Richard Dawkins', isbn: '9780618619160', rating: 4.5, shelves: ['evolution', 'science'], startedAt: '2000-01-05T12:00:00.000Z', finishedAt: '2000-02-16T12:00:00.000Z' });
    expect(parsed.rows[2].rating).toBe(4.75);
    expect(parsed.rows[6]).toMatchObject({ status: 'started', startedAt: '2001-02-16T12:00:00.000Z', finishedAt: null }); // paused, open range
    expect(parsed.rows[11]).toMatchObject({ isbn: null, sourceId: 'c7a6f0de-1c47-4f3e-8a43-6d1e0d8b2f5a', creator: 'Charles Darwin' });
  });
});

describe('other files', () => {
  it('are refused in plain words', () => {
    expect(() => parseLibraryCsv('')).toThrow(/empty/);
    expect(() => parseLibraryCsv('name,email\nA,a@example.org')).toThrow(/not a Goodreads or StoryGraph export/);
    expect(() => parseLibraryCsv('{"version":1,"entries":[]}')).toThrow(/not a Goodreads/);
    expect(() => parseLibraryCsv('Book Id,Title,Author,Exclusive Shelf\n')).toThrow(/no books/);
  });
  it('skips a row with no title instead of failing the file', () => {
    const parsed = parseLibraryCsv('Book Id,Title,Author,Exclusive Shelf\n1,,Nobody,read\n2,Cosmos,Carl Sagan,read');
    expect(parsed).toMatchObject({ skipped: 1, rows: [{ title: 'Cosmos' }] });
  });
});

describe('importing', () => {
  const imported = (library: LibraryStore = createLibraryStore(), text = GOODREADS) => applyImport(library, parseLibraryCsv(text), NOW);

  it('adds every book with its status, dates, rating, tags and a first guess at its places', () => {
    const { library, plan, lookup } = imported();
    expect(plan).toMatchObject({ rows: 44, added: 44, updated: 0, unchanged: 0, skipped: 0, byStatus: { finished: 31, started: 2, want: 10, stopped: 1 } });
    expect(liveItems(library)).toHaveLength(44);
    expect(lookup).toHaveLength(44);
    const brief = entryAt(library, 'entry:gr-3869')!;
    expect(brief).toMatchObject({ title: 'A Brief History of Time', creator: 'Stephen Hawking', year: 1988, status: 'finished', finishedAt: '2000-01-19T12:00:00.000Z', rating: 5, ids: { gr: '3869', isbn: '9780553380163' }, tags: ['science', 'physics'], source: 'goodreads', enrich: 'pending' });
    expect(brief.places.map(p => p.nodeId)).toEqual(['knowledge.science.physics']);
    // The review is a thought on the book.
    expect(notesFor(library, 'entry:gr-3869').map(n => n.text)).toEqual(["Synthetic review for parser fixture row 1.\n\nA \"quoted\" example & plain text."]);
  });

  it('recognises the Evolution shelf’s own works and keeps their curated places', () => {
    const { library } = imported();
    expect(entryAt(library, 'work:finch')).toMatchObject({ id: 'shelf-finch', status: 'finished', ids: { shelf: 'finch', gr: '172367', ol: 'OL1974714W' }, source: 'shelf' });
    expect(entryAt(library, 'work:inner-fish')?.places.map(p => p.nodeId)).toEqual(['deep-time', 'evidence', 'tree-thinking'].map(evolutionTerritoryId));
    expect(notesFor(library, 'work:finch').map(n => n.text)).toHaveLength(2);
  });

  it('twice is the same as once: no duplicates, nothing changed', () => {
    const once = imported();
    const twice = applyImport(once.library, parseLibraryCsv(GOODREADS), '2001-10-24T09:00:00.000Z');
    expect(twice.plan).toMatchObject({ added: 0, updated: 0, unchanged: 44 });
    expect(twice.library.items).toHaveLength(once.library.items.length);
    expect(twice.library.notes).toHaveLength(once.library.notes.length);
    expect(twice.library).toEqual(once.library);
  });

  it('a newer export moves books forward but never back, and fills what was missing', () => {
    let { library } = imported();
    const newer = GOODREADS.replace('27276428,"The Gene: An Intimate History","Siddhartha Mukherjee"', '27276428,"The Gene: An Intimate History","Siddhartha Mukherjee"')
      .replace(/(27276428,The Gene: An Intimate History,.*?),0,4\.37,(.*?),,2001\/09\/14,"currently-reading, science","[^"]*",currently-reading/, '$1,5,4.37,$2,2001/10/20,2001/09/14,"science","science (#1)",read');
    expect(newer).not.toBe(GOODREADS);
    library = setStatus(library, 'entry:gr-6288', 'want', NOW); // changed here after the first import
    const { plan, library: after } = applyImport(library, parseLibraryCsv(newer), '2001-10-24T09:00:00.000Z');
    expect(plan.added).toBe(0);
    expect(entryAt(after, 'entry:gr-27276428')).toMatchObject({ status: 'finished', finishedAt: '2001-10-20T12:00:00.000Z', rating: 5 });
    // The Road was set back to "want" here; the export says read, so it moves forward again.
    expect(entryAt(after, 'entry:gr-6288')).toMatchObject({ status: 'finished' });
  });

  it('a book the learner removed stays removed', () => {
    const { library } = imported();
    const { plan, library: after } = applyImport(removeEntry(library, 'gr-6288', NOW), parseLibraryCsv(GOODREADS), '2001-10-24T09:00:00.000Z');
    expect(plan.skipped).toBe(1);
    expect(entryAt(after, 'entry:gr-6288')).toBeUndefined();
  });

  it('a StoryGraph export after a Goodreads one joins the books both know', () => {
    const goodreads = imported().library;
    const { plan, library } = applyImport(goodreads, parseLibraryCsv(STORYGRAPH), NOW);
    expect(plan.added).toBe(11); // Cosmos is already there, by its ISBN
    expect(liveItems(library).filter(i => i.title === 'Cosmos')).toHaveLength(1);
    expect(entryAt(library, 'entry:gr-55030')?.ids).toMatchObject({ gr: '55030', isbn: '9780345539434' });
    expect(liveItems(library).find(i => i.title === 'Infinite Jest')).toMatchObject({ status: 'stopped', id: 'isbn-9780316066525', source: 'storygraph' });
    expect(liveItems(library).find(i => i.title === 'The Voyage of the Beagle')?.id).toBe('sg-c7a6f0de-1c47-4f3e-8a43-6d1e0d8b2f5a');
    expect(applyImport(library, parseLibraryCsv(STORYGRAPH), NOW).plan).toMatchObject({ added: 0, updated: 0 });
  });

  it('joins a book already added from a search', () => {
    const searched = upsertEntry(createLibraryStore(), {
      id: 'ol-OL1892617W', kind: 'book', format: 'Book', title: 'A Brief History of Time', creator: 'Stephen Hawking', year: 1988, cover: 9259256,
      ids: { ol: 'OL1892617W' }, subjects: ['Cosmology'], tags: [], places: [{ nodeId: 'knowledge.science.astronomy', score: 1 }], placesBy: 'auto',
      status: 'want', addedAt: NOW, source: 'search', createdAt: NOW, updatedAt: NOW,
    }, NOW);
    const { library } = imported(searched);
    expect(liveItems(library).filter(i => i.title === 'A Brief History of Time')).toHaveLength(1);
    expect(entryAt(library, 'entry:ol-OL1892617W')).toMatchObject({ status: 'finished', ids: { ol: 'OL1892617W', gr: '3869' }, cover: 9259256 });
  });

  it('keeps notes once each, and every one of them valid', () => {
    const { library } = imported();
    const notes = liveNotes(library);
    expect(notes.map(n => n.id).sort()).toEqual(['pn-shelf-finch', 'rv-gr-11468377', 'rv-gr-24113', 'rv-gr-30659', 'rv-gr-3869', 'rv-shelf-finch', 'rv-shelf-selfish-gene']);
  });
});

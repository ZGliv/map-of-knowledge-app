# Personal learning studio

September 7, 2026

The map is now the center of a personal learning workspace. The accepted map geometry, zoom camera, gradients, and continuous return paths are preserved. The new design uses a light, quiet application frame around the dark atlas, with territory navigation, a contextual notebook, and a phone layout that keeps the map prominent.

## What works

- Capture an idea or an open question from any map level. Save your own words, a source label and optional web link, and one or more related territories.
- Browse, search, edit, and delete entries in the notebook. Topic links return to the corresponding place on the map. Ancestor counts include notes from descendants without counting a single note twice in the same territory.
- Revisit an entry: explain it before revealing the original, compare, and append a reflection. The original note stays intact. An applied entry stays applied; an open question stays a question.
- Export a JSON backup and import it into another browser. Import merges entries by ID, retaining the newer update; unrelated entries remain. Standard saving refuses to overwrite unreadable data. Explicit import first preserves the unreadable original in a recovery storage key.
- Changes from another tab update the notebook. An open capture reads the latest stored notebook before adding its entry. Editing or deleting a stale entry reports a conflict and retains the draft. If browser storage fails, the current session retains successive edits and remains exportable; a later change in another tab blocks overwriting storage until explicit recovery.

## What the notebook means

An entry records the user's thinking. Encountered, explained, and applied are self-reported context, not verified mastery scores. The product accepts learning from books, videos, classes, conversations, or experiments; adding a source link does not import or analyze that source.

The existing color preview and sample completions remain demonstrations. Notebook entries appear as note counts, not automatic mastery coloring. There is no fabricated starting history, AI assessment, generated course, or automatic content ingestion.

## Storage and compatibility

The notebook uses the versioned `mok-notebook-v1` browser key. Demo progress (`mok-next.demo-progress.v1`) and the earlier learning sketch (`mok-next.save.v1`, available at `?learning=1`) remain separate. Existing saved map locations and marks are retained. Nothing is synchronized to an account or server; export/import is the way to transfer notes between devices or origins. A storage warning means session-only changes must be exported before leaving.

The atlas stays mounted when the notebook is open, keeping its viewport dimensions and camera position stable. Visual tone and note captions changed; the spatial and camera algorithms did not.

## Verification

- 138 unit tests across 13 files, including 43 notebook validation and persistence cases.
- TypeScript check and Vite production build.
- Chromium desktop and WebKit phone camera regression: entering/reversing Technology and Music, exact endpoints and continuous motion.
- Dedicated Chromium and WebKit notebook browser journeys and screenshots in `output/learning-studio/`; both engines pass capture, multi-topic linking, filtering, edit/delete, import/export, reflection, cross-tab synchronization, failed saving, deep return and resize. Disposable browser contexts keep test notes out of the user's notebook.
- Official develop-web-game client map and capture screenshots inspected alongside populated desktop/phone notebook and reflection screens.

Physical iPhone keyboard and touch behavior remains a useful next check; the phone browser coverage uses WebKit automation. Notebook data is local and backups are manual. Simultaneous editing of the same entry is not a collaborative editor with conflict history.

## Next product question

Use the notebook with a real source and revisit the same idea later. Decide whether capturing, finding, and reconnecting that thought is useful before choosing any learning score, content generation system, or curriculum. The current loop is deliberately small enough to test with real habits.

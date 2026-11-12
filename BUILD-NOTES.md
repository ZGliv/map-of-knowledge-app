# Map of Knowledge — integrated prototype

**Superseded scope:** the latest map-focused revision is documented in [MAP-PROTOTYPE-NOTES.md](MAP-PROTOTYPE-NOTES.md). This document records the earlier learning implementation, retained at `?learning=1`.

Built September 6, 2026, from the researched One-Shot-Build-Brief.md. The production preview runs at http://127.0.0.1:4178/; the development server runs at http://127.0.0.1:5178/. Start the experience with **Find out why**.

The app combines the approved recursive Voronoi motion with a finite, named atlas. Eight broad territories provide context; Mathematics contains eight narrow objective encounters, each with practice, independent transfer, and retrieval content. A separate synthesis offers an independent entry point. Pairing accepts alternative valid correspondences; collections ask for a prediction before observation; rulers express exact quarter-unit positions, origins, and unit widths. Hints or repaired revealed answers lead to a changed independent check.

Only independently demonstrated objectives illuminate their own parcels. The parent subject is never declared complete. The same geometry appears as a small gold fragment or beacon at larger scales. Restoration remains earned history; due reviews are separate. Exploration stays open, interrupted work can resume, and progress can be exported and imported.

The original application is untouched. A recoverable archive of 398 relevant tracked and ignored source/content/configuration files, with every member hash-verified and a sample restored, lives in `../preserved/2026-09-06/`. The new build is isolated in this directory, including its own dependency directory. The original Git status remains the two pre-existing untracked “App 2” and “styles 2” files.

## Verification

- `npm test`: 50 passing tests across spatial invariants, finite catalog and geometry identity, learning evaluators, and persistence. The 720-transition invariant test has a 15-second harness allowance; an earlier run exceeded Vitest’s default five-second timeout while multiple browsers ran concurrently. Assertions were unchanged; the final suite completed in 3.48 seconds.
- `npm run build`: TypeScript and production bundling pass. Production JavaScript is about 270 kB, 86 kB gzip; stylesheet about 23 kB, 6 kB gzip.
- Real browser journeys at desktop and 390 × 844: all eight objectives; interrupted reload; assisted success followed by fresh transfer; same-location import; export/import; eight world-scale marks; bounded due reviews and retrieval; damaged-save recovery. Zero page errors. Reports and screenshots are under `output/playwright/journey/`.
- Encounter visuals inspected at 390px, 360px, and desktop. Keyboard pairing, noncanonical pairing, reduced motion, and partial-state reload pass. New encounters reset their scroll position. Search/settings dialogs contain keyboard focus.
- The official web-game Playwright client reaches the opening encounter with a settled navigation state and no errors. Its artifacts are under `output/web-game-flow/`.
- The production preview was opened and checked with agent-browser: atlas controls render, no blank page or error overlay, no reported browser errors.
- The separate development-only `/stress.html` fixture reaches synthetic depth 50 with 302 generated nodes, zero added nodes on the repeat route, six visible cells, finite geometry, matching partition area, and identical reconstructed geography. The captured run measured 10.8 ms cold / 0.1 ms warm synchronous geometry on an Apple M4 Pro, 24 GB Mac using headless Chromium. These timings are not animation frame rates or physical-phone measurements.

## Deliberate limits

Mathematics is the only playable territory. Other regions are honestly marked as map-only when selected. This is a local prototype with no accounts, cloud synchronization, live content generation, social systems, or deployment. The 1/3/7-day review schedule is provisional; learning effectiveness and delayed retention have not been validated with learners. Physical-phone performance and delivered animation frame rates remain unmeasured.

Layout uses stable seeds and the same recursive projection at every depth. Returning to the same viewport reproduces geography independently of cache history. Aspect-ratio changes deterministically retessellate the same identities. Navigation and layout caches are bounded to 384 entries each. The finite learner catalog does not generate fake deep topics.

Saved evidence uses stable, namespaced objective IDs. Unsupported save/content versions are preserved for recovery rather than silently rewritten; this prototype supports its current version. Browser storage is local to the origin and latest-write-wins across tabs. Export a copy before moving devices, origins, or clearing browser data.

## Running again

Use `npm run dev` for development, `npm test` for semantic/spatial tests, `npm run build` to rebuild, and `npm run preview` for the compiled preview. Dependencies are already present locally; `npm ci` can recreate them from the lockfile.

Run a full browser journey with `MOK_DEVICE=phone node tests/journey.mjs` or `MOK_DEVICE=desktop node tests/journey.mjs`. `node tests/capture.mjs` creates the atlas, first encounter, restoration, and deep-fixture captures in `output/visuals/`.

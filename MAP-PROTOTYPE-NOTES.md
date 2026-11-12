# Map proof of concept — September 6 refinement

The user's approved structure and organic motion remain the basis. The current scope is the map, drill-down, subject identity and mock progression. Audience, pedagogy, generated content, accuracy workflows and engagement design are a later project; do not expand the learning system as part of map polish.

The local preview is http://127.0.0.1:4178/ and the production project is https://map-of-knowledge.vercel.app. Choose **Follow one idea**, **Complete this sample**, then **Pull back to the whole atlas**. The route traverses eight levels. The completed leaf fills when viewed close up and becomes a tiny subject-colored light at world scale. Settings offer a deep sample in each of the eight subjects, export/import, and undo/reset of demo marks.

Each territory owns a thin colored stroke clipped inside its own polygon. At shared borders, one side retains one region's spectrum and the other side retains its neighbor's spectrum. A narrow dark seam separates them. Technology is blue, Earth green; all eight subjects have related bands of color inherited by their descendants. Geometry and navigation still use the existing Voronoi and coherent polygon-morph implementation.

Completion has two separate visual channels: an exact projected footprint and a visibility floor for subpixel footprints. The floor has a0.65CSS-pixel core radius and a restrained1.6px halo. It never fills an ancestor's polygon. Colliding tiny marks share a beacon without enlarging earned coverage. Final phone tests measured the eight deep samples at0.0283–0.2209CSSpx² each at world scale. Their subject hues remain distinct. Shallow mock leaves naturally occupy larger footprints; the deep illustrative routes demonstrate the intended full-knowledge scale.

Demo marks use `mok-next.demo-progress.v1` and do not establish learning evidence. Prior learning history under `mok-next.save.v1` remains untouched. The earlier learning sketch is available from settings or at `?learning=1`. Both implementations remain on disk. A source snapshot taken before visual integration is at `../preserved/2026-09-06-approved-atlas/approved-source.tar.gz`; it includes the new illustrative route definitions but preserves the approved visual source.

The named sample routes are a finite illustration of the structure, not an authored or reviewed curriculum. The mock completion button deliberately bypasses educational assessment. No content-generation service, account system or backend is required. Deployment details are in DEPLOYMENT.md.

## Inherited spectrum and continuous pullback

The color reference is Dominic Walliman's [The Donut of Knowledge](https://www.flickr.com/photos/95869671@N08/29852456427/), found through his original Domain of Science publication. This iteration takes its broad spectrum of related subject colors as inspiration; it retains the approved organic atlas geometry and uses no copied artwork.

`territoryTheme.ts` assigns each subject a hue interval. Science spans mint through cyan to blue. A fixed canonical layout orders siblings spatially; each child inherits an overlapping half-width interval within its parent. Palette identity therefore does not depend on the active viewport, zoom, completion state, or query order. Borders and resolved completion fragments use three-stop SVG gradients; distant completion beacons use the midpoint of their own inherited palette. Actual completion footprints remain unchanged.

The temporary **Preview color** switch sits above the map without resizing it. **Sample areas** reveals Science, Computing, Music, Oceans and Geometry; **Whole map** reveals all subjects. At each visible scope, a continuous gradient is clipped to the relevant area masks so neighboring pieces can reveal a shared field of color. The preview is ephemeral React state, defaults to off, resets on reload, and never writes marks or learning evidence. It is intentionally easy to remove in a later iteration. Normal progress coloring remains available with the switch off.

All three whole-atlas controls now pull back through multiple layers using one precomputed route and one animation clock. Easing occurs only at the beginning and end. Each leg receives time proportional to its logarithmic zoom distance, and a shared-coordinate Hermite camera joins translation with continuous velocity. An eight-layer return lasts about 3.54 seconds. There are no intermediate idle scenes or location commits. A smooth camera boundary constraint prevents sideways drift from revealing empty edges, with shared endpoint tangents kept inside the feasible range. A 192,192-frame sweep across eight branches and three viewport sizes confirms coverage to floating-point precision. Single-level navigation retains its existing path. Resize rebuilds the route at the current global progress; reduced motion resolves directly to the requested ancestor.

Verification for this iteration: 95 unit tests pass, including palette inheritance across the catalog and all eight camera routes at phone and desktop sizes. The production build passes. The official web-game client preview capture was visually inspected. Full eight-subject progression and persistence regressions pass in Chromium and WebKit; the five-mask preview and whole-map preview preserve saved bytes and actual region/mark geometry. Browser evidence is collected under `output/playwright/spectrum/`; `node tests/spectrum-journey.mjs` covers all three world-return controls, actual SVG camera motion, preview modes, persistence isolation, mid-route resize and reduced motion. Single-step regressions use `node tests/camera-journey.mjs`. Physical iPhone performance remains untested.

## Earlier camera travel refinement

The user preferred the smooth handoffs but wanted diving into layers rather than fading between fitted screens. Navigation now uses an exponential camera zoom centered on the selected region, lasting 1,160ms. Surrounding territories scale and translate with it at full opacity. The selected world polygon stays unchanged; the camera moves far enough inside it to cover the viewport. Child cells keep an opaque surface throughout travel. Only their paint, outlines, and labels gradually gain detail. Reverse navigation evaluates the same camera path backward.

Display cells are clipped to the viewport before positioning labels, while raw world cells are retained for motion and ownership. Existing resting geography is unchanged. Completion anchors and footprint vertices transport inside their moving owner polygons, and beacon sizes stay measured in screen pixels. The earlier screen-wide fade and polygon-to-rectangle expansion are no longer the navigation mechanism.

Verification: 86 unit tests and production build pass. A 7,280-frame geometry sweep covers eight routes on phone and desktop with no invalid cells or completion geometry crossing owners. Near-end labels keep the same font and wrapping. Camera-aware browser captures verify opaque surfaces, changing screen transforms, unchanged selected-region footprints, and exact screen-space endpoints for Technology and Music/Rhythm forward and backward in Chromium and WebKit. Actual-timing videos and five-frame storyboards were recorded; the storyboards were visually inspected. These are local browser checks, not physical iPhone performance measurements.

Reproduce camera checks with `node tests/camera-journey.mjs`; the earlier `tests/motion-endpoints.mjs` command now forwards to it. Evidence: `output/playwright/camera/` and `output/motion-endpoints/camera-geometry-sweep.json`. Prior motion source/test snapshots are retained under `output/camera-refinement/` for comparison.

## Navigation and introductions

Every layer now offers **Explore [current topic]** in the bottom panel. Its introduction opens over the map with Overview, Key ideas, and Try an example tabs; child-topic links offer a route further in. **Go deeper** remains a separate map-navigation control. All 370 finite catalog nodes have a preview, including broad Music and Design. The atlas, eight subjects, Music, and Design have illustrative copy; the remaining entries use their actual catalog context. This establishes the interface, not a complete content library.

Reading an introduction never writes completion or learning evidence. Broad terminal placeholders such as Design no longer offer a button that claims the entire field is complete. Deep sample pieces retain the existing mock coloring controls.

The dock remains mounted at every level, with a fixed height per viewport breakpoint (180px desktop, 244px phone, 124px short landscape). Topic changes therefore cannot resize the map at the final animation frame. Forward and reverse navigation share canonical endpoints; exact endpoint regions replace interpolated regions at the handoff. Parent and child labels, contours, fills, and outlines blend on the same animation clock. Nested contours transport established sites rather than reseeding each frame. CSS no longer adds a second opacity animation. A real resize rebuilds endpoints at the current progress instead of abruptly committing the destination.

Current verification: 80 unit tests pass. Eight real browser frame-sampling cases cover desktop/phone forward and reverse navigation plus midflight resize. Cell paths, full details, and completion markup match at both handoffs; local sampled frame intervals peaked at 21ms, which does not establish performance on a physical iPhone. Chromium and WebKit introduction journeys cover five depths/contexts, all tabs, child navigation, Escape, rotation, unchanged geography and saved coloring, and availability across the whole catalog. Evidence: `output/motion-endpoints/`, `output/playwright/level-content/`; reproduce with `node tests/motion-endpoints.mjs` and `node tests/level-content-journey.mjs`.

## Earlier map/color verification

-77 unit tests pass: existing spatial and learning invariants, separate demo persistence, exact completion footprints, bounded visibility and collision behavior, and eight finite deep routes.
-Production build and TypeScript pass. Test discovery is restricted to `src/**/*.test.{ts,tsx}` so a pre-existing `node_modules 2` alias does not pull dependency packages' own test suites into the app's checks.
-Both Chromium149 and WebKit26.5 pass the complete phone touch journey at390×844, including all8 subjects, exact leaf fill with no completed ancestors, world projection, reload, same-leaf import, export/download, undo, reset and restoring the export. A sentinel verifies that the earlier learning storage remains byte-for-byte unchanged. No browser errors.
-Both engines also pass desktop1440×900→phone390×844 resize followed by the complete automatic route, and landscape rotation/return. A real viewport-change race in the pending route was fixed: navigation now waits for both the rendered transition and its active reference to settle before taking the next step.
-Primary and return controls have at least44px height; the completion control is46px. Header action targets were enlarged too.
-Actual phone, parent, root-pixel and landscape screenshots were inspected. Long region labels wrap within the available viewport space and center their line block. Narrow cells omit secondary captions.
-The official web-game Playwright client reached the depth8 sample, with settled navigation and no errors. The updated production tab was refreshed in the user's in-app browser.

WebKit is Safari-engine testing with an iPhone-sized touch viewport, not a physical iPhone test. Real-device animation performance remains to be checked. No learning-effectiveness claims are made.

Reports: `output/playwright/prototype/report-{chromium,webkit}.json` and corresponding resize reports. Visual evidence: `output/map-refinement/` and `output/playwright/prototype/`.

Run `npm test`, `npm run build`, `npm run dev`, and `npm run preview` as before. Run `node tests/prototype-journey.mjs` for the map browser journey (see its environment options for one engine); `node tests/prototype-capture.mjs` records the short visual loop. Existing learning tests now target `?learning=1`.

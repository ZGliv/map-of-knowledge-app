# A territory that feels like a place

September 10, 2026. User request: let the surrounding application colors follow the zoomed territory, and substantially improve the exploration experience before noon.

## What changed

- All eight territories have a coordinated surrounding palette derived from the midpoint of their existing spectrum. Smaller fields inherit their own narrower hue range. The world returns to the midnight green atlas.
- Header, margins, navigation, footer, guide, lesson diagrams, settings, and notebook share that palette. The existing map paint, geometry, typography, and camera algorithms are unchanged.
- Chrome updates on the same canonical zoom coordinate as the camera. There is no separate CSS timing curve or React workspace re-render for each frame. Reverse travel and continuous ancestor routes retrace the palette changes.
- A territory field guide replaces unrelated global recommendations in the desktop margin. It contains the real topic overview, directions into children, separate local evidence and note counts, recent relevant notes, a clearly located discovery, and the full ancestor path.
- The same field guide is available as a phone sheet. The current-place button and Field guide control open it without changing the map's viewport dimensions.
- Clickable desktop breadcrumbs allow direct ancestor navigation. The sidebar continues highlighting the containing territory at every depth.
- The footer prioritizes an authored discovery inside the current area. When none exists, it offers the actual area overview. A Music discovery is no longer presented as Design's main content.
- Broad terminal fields no longer claim to be color demos. Their overview opens directly; decorative heading focus no longer draws a large blue box. Button focus indicators remain visible.

## Implementation boundaries

`atlasAtmosphere.ts` derives and interpolates the actual inherited hues. `useAtlasAtmosphere.ts` writes one inherited CSS custom property. Atlas exposes a read-only atmosphere callback from its existing frame state; it does not change navigation computation.

`cartographic-theme.css` defines the coordinated hue-relative tokens. New navigation and field-guide styles load after the existing theme so sizing, focus, and typography are predictable. Map selectors and global map tokens remain untouched.

`explorationContext.ts` computes membership through the real catalog. An earned terminal footprint counts in its ancestors, not in sibling areas. One note linked to multiple child topics counts once in a parent. Broad parent notes are not silently assigned to every descendant. Nearby and elsewhere suggestions have explicit location labels.

Field-note buttons use the existing notebook editor and persistence rules. This iteration adds no storage schema, account integration, AI provider, or paid inference.

## Verification

- 198 unit tests pass, including 11 new atmosphere/context cases.
- TypeScript and the production build pass.
- `tests/adaptive-atmosphere.mjs`: 26 static Chromium/WebKit cases and 10 real animation recordings pass, including inherited hues, full dialog/footer palettes, reduced motion, resizing, and eight-leg deep world returns. No JavaScript errors or horizontal overflow.
- World and Technology map images are byte-identical to the preceding release in both engines. Geometry, paint, label styles/positions, and viewport bounds match exactly. Frame hue error is below 0.000005 degrees from decimal rounding.
- Official web-game client world capture inspected. Existing camera movement, opacity, endpoints, and storyboards pass in both engines. The phone field-guide capture/save/reopen/edit loop passes, with correct separate counts, focus trapping, Escape restoration, scrolling, and no browser errors.

Production deployment `dpl_3NNLZ5p1GuudVqskwjU9ivXrnZqJ` is READY at https://map-of-knowledge.vercel.app. Local preview and deployed assets match. No personal browser data or paid AI credits were touched.

## Local environment

Online-only files in the original Desktop dependency folder blocked Vite and Vitest in synchronous reads. The exact package lock was installed at `/Users/Test/.codex/tmp/mok-adaptive-deps-20260910`; the app's node_modules points there. The original folder is preserved at `/Users/Test/Desktop/Projects/mok_05:2026/mok-next-dependency-backup-20260910-084158`. No dependency versions or package manifests changed. Vercel still installs with npm ci normally.

## Potential next iteration

Try a real outside learning source, capture a few related questions, and revisit its territory. Use that experience to refine the field-guide ordering and how much progress evidence should be visible. The finite authored content, local-only storage, disabled hosted AI, and need for physical iPhone testing remain unchanged.

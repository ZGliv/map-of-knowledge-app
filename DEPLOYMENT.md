# Vercel deployment

Latest release: October 15, 2026.

- Production: https://map-of-knowledge.vercel.app
- Project: `map-of-knowledge`
- Team: `zgliv21-gmailcoms-projects`
- Deployment ID: `dpl_7FMShqg8fX4KjpMRaWpRioNATCLs`
- Deployment: https://map-of-knowledge-9h68exr7g-zgliv21-gmailcoms-projects.vercel.app
- Vercel status: `READY`, target `production`

October release adds a connected starter trail, evidence-based resume after reload, notebook capture from a completed discovery, direct mobile Learn navigation, and prominent local-backup guidance. The existing evidence engine, storage formats, exact map geometry, hosted AI-offline configuration, and production project are preserved. Compatible dependency patches remove all six prior npm audit findings.

Verification: 203 app tests, 21 guide-runtime tests, all nine discoveries on Chromium1440 and WebKit375, four persistence-hook cases, five guide/cross-tab regressions in both engines, and the complete return/reflection/download flow in both engines passed. Screenshots were inspected at375px and1440px; physical-device performance and learning effectiveness remain unmeasured. Final browser asset names match the verified build: `index-C6mECeJF.js` and `index-D_Vbhe0w.css`. Vercel reports READY and the production alias points to the deployment above. Evidence is under `output/overnight-mvp/` and `output/playwright/learning-return/`.

At initial setup, all 46 available team projects were checked. No identifiable prior Map of Knowledge project or local Vercel link was found, so this project was created. This release updates that same project and production alias.

`vercel.json` configures Vite, `npm ci`, `npm run build`, and the `dist` output directory. The upload dry run confirmed that dependency directories (including the `node_modules 2` symlink), local environment files, screenshots, browser-test output, and project notes were excluded. Vercel built the source successfully and assigned the production address above.

The authored discoveries, map, notebook, learning memory, and cost calculator work without provider credentials. The hosted `/api/guide` handler explicitly reports AI offline; real Qwen inference is connected in the local Mac preview. Optional hosted paid AI requires dedicated credentials, private access, and a durable capped ledger, and remains disabled in this release. Learning history, demo progress, and notebook entries are stored separately per browser origin. Use their export/import controls to transfer localhost data to production or another device.

The local directory is linked through `.vercel/project.json`. Publish a later iteration from this directory with:

```sh
npx --yes vercel@59.11.7 deploy --prod --yes --scope zgliv21-gmailcoms-projects
```

The September 10 release made the surrounding atlas palette follow the zoomed territory on the same animation clock as the camera. It adds contextual territory field guides on desktop and phone, clickable ancestor paths, persistent containing-territory highlighting, precise local earned/note counts, editable recent field notes, and a location-appropriate footer. All eight subject palettes and their inherited subregions work across the existing midnight atlas interface. The map itself is preserved. See ADAPTIVE-ATLAS-NOTES.md for details.

The preceding release added nine interactive discoveries, editable learner memory, observed attempt evidence, exact earned map coloring, a recommendation frontier, notebook/source retrieval, an AI guide interface, and a cost calculator. It retains inherited spectra, gradient borders, color preview, introductions at every catalog level, the continuous camera, and the existing notebook. See LIVING-ATLAS-NOTES.md and server/GUIDE-RUNTIME.md for scope and local AI setup.

Previous functional verification: 187 unit tests plus 21 runtime tests passed, as did the production build. Chromium desktop and WebKit phone completed all nine discoveries, four React persistence scenarios, and targeted regressions for stale and late cross-tab evidence, offline-guide behavior, and cost calculations. Existing camera and notebook journeys also passed. The real local model was verified through the browser, with measured token usage and $0 API cost. Official game-client captures and desktop/phone screenshots were inspected. A native scroll-effect cleanup issue found in the actual Codex in-app browser was fixed and verified there; the atlas returned correctly after closing the guide, preserving both of the user's prior demo marks. Physical iPhone performance remains untested.

Theme verification: the final TypeScript/production build passes. Chromium at 1440 × 1000 and WebKit at 390 × 844 have byte-identical before/after atlas screenshots, with identical geometry, fill/stroke, label styles and positions, and viewport dimensions. Twenty-eight surrounding UI states were captured, including notebook reflections and the mobile guide; no white surfaces, horizontal overflow, or JavaScript errors remained. The actual in-app preview was refreshed and guide open/close verified with both prior completion marks retained. Reports and visual evidence are in output/cartographic-theme/.

Deployment verification uses Vercel's READY status and successful production alias assignment. The deployed page is not fetched during deployment verification.

The September 10 deployment was READY and aliased to production. Its index assets (`index-DhFc2n9h.js`, `index-Dk7cgdaJ.css`) match the final local preview build. The inherited regression suite also includes two browser tests for promise-returning scrollIntoView cleanup, preserving the atlas after repeated guide open/close.

Adaptive release verification: 198 unit tests and the final production build pass. An independent Chromium/WebKit suite passes 26 palette/surface cases and 10 real camera recordings, including eight-leg continuous world returns; hue follows the camera every frame. World and Technology map screenshots are byte-identical to baseline in both engines. The inherited camera endpoint, opacity, motion, and storyboard suite passes in both engines. A phone field-guide flow captures, saves, reopens, and edits a scoped note while preserving zero earned pieces; focus trapping, Escape restoration, and scrolling pass. No JavaScript errors or horizontal overflow were found. Production assets match the local preview; Vercel reports READY with the existing production alias assigned.

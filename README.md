> **Work-in-progress snapshot — November 12, 2026.** This branch preserves the current `mok-auto` working tree, including the new reading shelf, reader, linked resources, and feed changes. It is based on stable master commit `9a3d0fc` from November 7. These changes are captured for review and backup; this snapshot is not a statement that they are fully tested or deployed.

# Map of Knowledge

A personal learning guide built around a recursive knowledge atlas. Follow a question, try an interactive discovery, ask an on-device AI for help, and earn exact pieces of map color with evidence from fresh examples. Your notes and questions connect learning from outside the app to the same atlas.

Current behavior, verification and scope: [LIVING-ATLAS-NOTES.md](LIVING-ATLAS-NOTES.md). The guide uses an already installed local Qwen3:8b through Ollama, with $0 API cost. Nine authored discoveries work with or without AI. Start the complete local demo with `npm start` (Ollama must be running), then open http://127.0.0.1:4178. The hosted Vercel version keeps AI honestly offline until an explicitly capped private cloud configuration is added. See [GUIDE-RUNTIME.md](server/GUIDE-RUNTIME.md). The spatial proof of concept still supports gradient borders, sample completion coloring and continuous zoom. Start with **Follow one idea** to see that demonstration; the details are in [MAP-PROTOTYPE-NOTES.md](MAP-PROTOTYPE-NOTES.md).

```sh
npm install
npm run dev
# In a second terminal: npm run guide
npm test
npm run test:guide
npm run build
```

The development app opens at http://127.0.0.1:5178.

Start **Your discoveries** (the **Learn** tab on phones) for a connected rhythm → fractions → motion trail. After an unfinished attempt, **Continue learning** resumes the saved example or the next fresh transfer. Completed discoveries can open a linked notebook note. **Keep a backup** groups the existing memory and notebook exports in Settings.

Learning memory is stored under `mok-learner-v1`: an editable profile, visits, and evidence from attempts. Use Settings → Learning memory to export or merge it. Settings → Usage & cost shows actual spending and an editable subscription estimate. The guide retrieves relevant notes and source excerpts; it cannot grade itself into map progress.

Your notebook is stored in this browser under `mok-notebook-v1`. There are no accounts or cloud backups. Use the notebook's export/import controls to keep a backup or transfer ideas between devices, browsers, or localhost and production. Source links are references supplied by you; the app does not automatically import their content. Encountered, explained and applied are self-reported, not assessments.

Imports validate all entries and merge by ID, keeping the newer update. Unreadable stored notebooks block normal writes; explicit recovery import preserves the original in a `.recovery.*` storage key before replacing it. Failed writes leave session notes exportable. If another tab changes storage during a failed-save session, the app blocks overwriting it; export the session copy, reload, then import to combine notes. Stale entry editors keep their draft and report the conflict.

Demo map coloring uses `mok-next.demo-progress.v1`. The earlier learning sketch remains available at `?learning=1`, preserving its separate `mok-next.save.v1` history, unfinished activities and export controls. Neither is changed by notebook entries.

For the compiled app, run `npm run build` and `npm run preview`, then open http://127.0.0.1:4178. The development-only synthetic depth fixture is at `/stress.html` on port5178. See [BUILD-NOTES.md](BUILD-NOTES.md) for the delivered scope, verification evidence, preservation archive, and measured limits.

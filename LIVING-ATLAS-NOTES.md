# The learning guide iteration

The atlas now gives a personal AI guide a concrete place to work: suggest a question, let someone try it, help when needed, test it with a different example, and keep the resulting evidence on the map. The interface preserves the recursive geography and continuous camera that the user approved.

## Try the complete local demo

Ollama and `qwen3:8b` are already installed on this Mac. With Ollama running, `npm start` builds the app and starts both the preview at `http://127.0.0.1:4178/` and its private guide server at `127.0.0.1:5189`. If those servers are already running, use the existing preview. Development uses `npm run dev` and `npm run guide` in separate terminals.

Start with **The space between beats**. Listen to the pattern, answer a probe, and try a different example. Open the guide to ask why something happened. After a supported answer, the app offers another unseen transfer example when one remains. Use **Your discoveries** to move freely among all nine explorations or inspect the learning evidence. Mathematics provides an explicit bridge from musical subdivision to fractions.

**Your guide** can discuss the current territory, retrieve relevant notebook entries across subjects, use a small source library, and consider the editable profile and recent learning attempts. It answers through the real local model and reports actual tokens with zero API cost. No Claude or Parley credits are connected. It does not fine-tune the model, ingest other accounts, watch videos, or pretend to have read a linked book. Add notes from outside learning through the existing notebook; a source URL remains a reference, not an imported document.

## Returning to learning · October 15, 2026

**Your discoveries** now opens with a ten-minute starter trail through rhythm, fractions, and motion. On phones the **Learn** tab opens this library directly; the AI guide remains accessible from the header.

When an attempt is unfinished, the world view offers **Continue learning**. The discovery remembers whether to resume the current example or move from a solved probe to a fresh transfer. Previous hints and wrong answers remain supported evidence after reload. An earned discovery remains available to revisit, and exhausted variants are never presented as fresh.

The completion screen offers **Add to my notebook**, opening a note with the discovery title and its map topic. Write the reflection yourself; the app does not invent a learning claim. Existing notebook revisits let you recall the idea, compare with the original, and append a reflection.

**Keep a backup** is visible in the sidebar and discovery library. Settings presents both memory and notebook exports together and explains that this browser is the only copy. The two existing storage formats and import/merge controls are preserved; this is not cloud synchronization.

## Evidence, memory, and map color

- Nine authored discoveries span eight territories, with a probe and two distinct transfer variants each. Sources link to primary educational material; excerpts are short authored paraphrases.
- Hints, opening sources during a challenge, and asking the guide record assistance. Wrong answers expose feedback and therefore affect later attempts on that same variant. Assistance persists across closing, reloading, and merging tabs.
- A correct independent transfer earns the exact terminal footprint. The map projects that real footprint at every scale using the existing geometry. An encounter, a note, or an AI claim cannot award color.
- Recommendations are transparent rules over interests, territory, attempts, available fresh examples, and connections. They are tentative readiness suggestions, not validated ZPD measurements or a global mastery score. Exhausted examples remain revisitable but no longer crowd out untried discoveries.
- `mok-learner-v1` stores the profile, immutable attempt events, visits, and separate profile/activity clocks. Export and merge preserve these records; invalid stored data blocks ordinary writes. Explicit recovery backs up the original first. Failed storage writes keep the session exportable.
- The notebook (`mok-notebook-v1`), demo marks (`mok-next.demo-progress.v1`), and earlier learning sketch (`mok-next.save.v1`) keep their separate history and export controls. Existing demo marks are explicitly labeled when displayed beside earned color.

## Local and hosted operation

The local conversational guide is operational. Qwen3:8b runs through Ollama on this Mac with bounded context, output length, cancellation, and no paid fallback. Cold startup can take substantially longer than a warm response. The guide's answers remain fallible; known source IDs prevent fabricated citation links, not unsupported reasoning.

The Vercel site includes the complete authored discovery, memory, notebook, progression, and cost-calculator interface. It honestly reports the AI guide offline because Vercel cannot use this Mac's loopback model. A private hosted paid mode is implemented but disabled. Enabling it requires a dedicated provider key, an explicit paid-mode switch, a private access token, and a durable Redis budget ledger. The ledger reserves worst-case request costs atomically against a $15 total authorization; uncertain requests retain their reservation. This limits this app's configured AI calls, not unrelated infrastructure or other projects. See [runtime documentation](server/GUIDE-RUNTIME.md).

The **Usage & cost** view separates actual trial spending from a subscription calculator. The calculator allows average or heavy usage, subscription price, and model rates to vary, with explicit token assumptions. Its remainder excludes hosting, payment fees, support, taxes, and profit. Local inference has zero API cost, while hardware and electricity still cost something.

This is a working learning-loop prototype, with nine authored discoveries and a small retrieval library. It is not an exhaustive curriculum, a permanently awake agent, automatic textbook/YouTube ingestion, a scientifically calibrated learner model, or an unlimited free hosted service.

## Verification

The unit, browser, real-model, camera, notebook, and production-build results for this release are recorded in `progress.md` and `DEPLOYMENT.md`. Browser fixtures use isolated data; the user's real notebook and map marks are preserved. Physical iPhone performance has not been measured.

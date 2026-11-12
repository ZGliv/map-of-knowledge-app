// The words every drafting call is given: the house rules and the exact shapes to answer in.

export const RULES = `You write for Map of Knowledge, an atlas of human knowledge, for curious adults who are new to the topic.
Plain words, concrete, no hype. Never mention "the article", "the text" or "the passage".
Write in your own words: never copy a sentence. Use ONLY what the numbered source sentences say. Every claim lists the numbers of the sentences that back it.
Every fact is about this place itself, never a neighbouring idea the source mentions in passing.
Questions test understanding: put the idea in a fresh everyday situation where you can, not "what is the definition of". Wrong options are believable mistakes people really make, about the same length as the right one. Never "all of the above".`;

export const numbered = source => source.sentences.map((sentence, index) => `[${index + 1}] ${sentence}`).join('\n');

export const PLACE_SCHEMA = `{"summary":[{"text":"one sentence","cites":[1]}, exactly 3 of these],
"facts":[{"label":"2-4 words","value":"under 12 words","cites":[1]}, 3 to 5 of these],
"items":[{"prompt":"question","options":[{"id":"a","label":"..."},{"id":"b","label":"..."},{"id":"c","label":"..."},{"id":"d","label":"..."}],"answer":"a","explain":"why, in one or two sentences","cites":[1]}, exactly 6 of these; vary which letter is right]}`;

export const PACK_SCHEMA = `{"title":"under 6 words, intriguing, not a definition","question":"the one question this answers","hook":"one sentence that makes someone want to find out","idea":"the takeaway, one sentence",
"beats":[ exactly 4 of these, using at least 3 different kinds:
 {"kind":"predict","prompt":"a situation; what happens?","choices":[{"id":"a","label":"...","feedback":"why it tempts and fails (wrong choices only)"}, 3 or 4 of these],"answer":"a","explain":"what really happens and why","cites":[1]},
 {"kind":"order","prompt":"put these in order","items":["first","second","third","fourth"],"ends":["start label","end label"],"explain":"why this order","cites":[1]},
 {"kind":"match","prompt":"match each to its partner","pairs":[["left","right"], 3 or 4 of these],"explain":"what connects them","cites":[1]},
 {"kind":"sort","prompt":"sort each into its group","groups":["group one","group two"],"items":[["item","group one"], 4 to 6 of these],"explain":"what separates the groups","cites":[1]},
 {"kind":"flaw","prompt":"one step in this reasoning is wrong; which?","steps":["step","step","step","step"],"wrong":2,"explain":"why that step fails","cites":[1]}
]} ("wrong" is the 0-based index of the bad step; "items" in order beats are in the correct order)`;


import { createUnfurlHandler } from '../server/unfurl.mjs';

// The page fetch has its own 4 s budget (server/unfurl.mjs); this only bounds the function.
export const config = { maxDuration: 10 };
export default createUnfurlHandler();

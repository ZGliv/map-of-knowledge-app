import { createGuideHandler } from '../server/guide-http.mjs';

export const config = { maxDuration: 120 };
export default createGuideHandler();

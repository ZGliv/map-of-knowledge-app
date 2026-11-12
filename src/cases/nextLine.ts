/** The date of what comes next at a place once a case is played: a new case while one is left there,
 * else a fresh check in words. `settled` is whether the call was right. */
export function nextLine(settled: boolean, caseLeft: boolean, date: string): string {
  if (caseLeft) return settled ? `Back for a new case on ${date}.` : `Another new case opens ${date}.`;
  return settled ? `Back for a fresh check on ${date}.` : `A fresh check opens ${date}.`;
}

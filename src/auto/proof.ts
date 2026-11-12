import { useCallback, useEffect, useMemo, useState } from 'react';

/** Places proved on their generated pages, kept apart from the hand-built ledgers. */
const KEY = 'mok-auto-proof-v1';

export interface AutoProof { readonly nodeId: string; readonly at: string; readonly how: 'check' | 'lesson' }

/** The stored proofs. The first version kept bare node IDs; those read as proved now, by a check. */
export function readAutoProofs(): AutoProof[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(value)) return [];
    return value.flatMap((item): AutoProof[] => typeof item === 'string' ? [{ nodeId: item, at: new Date().toISOString(), how: 'check' }]
      : item && typeof item.nodeId === 'string' && typeof item.at === 'string' ? [{ nodeId: item.nodeId, at: item.at, how: item.how === 'lesson' ? 'lesson' : 'check' }] : []);
  } catch { return []; }
}

export function useAutoProof(): { proofs: readonly AutoProof[]; proven: readonly string[]; prove: (nodeId: string, how: AutoProof['how']) => void } {
  const [proofs, setProofs] = useState<readonly AutoProof[]>(readAutoProofs);
  useEffect(() => {
    const sync = (event: StorageEvent) => { if (event.key === KEY) setProofs(readAutoProofs()); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const prove = useCallback((nodeId: string, how: AutoProof['how']) => setProofs(list => {
    if (list.some(proof => proof.nodeId === nodeId)) return list;
    const next = [...list, { nodeId, at: new Date().toISOString(), how }];
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode: proof lasts this visit */ }
    return next;
  }), []);
  const proven = useMemo(() => proofs.map(proof => proof.nodeId), [proofs]);
  return { proofs, proven, prove };
}

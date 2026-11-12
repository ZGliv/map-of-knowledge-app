// Canvases cannot read CSS custom properties directly. In the lab these lived on
// :root; inside the atlas they are scoped to the player, so read them from there.
export function token(name: string): string {
  const host = document.querySelector('.expedition-shell .player') ?? document.documentElement;
  return getComputedStyle(host).getPropertyValue(name).trim();
}

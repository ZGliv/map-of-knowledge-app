/** The approved folded-atlas mark, shared with the home-screen icon. */
export function BrandMark({ size = 28 }: { size?: number }) {
  return <img src="/app-icons-v3/icon-192.png" width={size} height={size} alt="" aria-hidden="true" style={{ display: 'block', borderRadius: size * 0.18 }} />;
}

/** The same Commons image at a standard thumbnail width, for small places like reel cards.
 * Commons serves only standard widths (330 is one), so reuse it rather than inventing sizes. */
export function commonsAtWidth(src: string, width = 330): string {
  const thumb = src.match(/^(https:\/\/(?:upload|thumb)\.wikimedia\.org\/wikipedia\/commons\/thumb\/.+\/)\d+px-([^/]+)$/);
  if (thumb) return `${thumb[1]}${width}px-${thumb[2]}`;
  const original = src.match(/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/([0-9a-f])\/([0-9a-f]{2})\/([^/]+)$/);
  if (original) return `https://upload.wikimedia.org/wikipedia/commons/thumb/${original[1]}/${original[2]}/${original[3]}/${width}px-${original[3]}`;
  return src;
}

/** The backdrop behind a picture shown whole: its small Commons copy blurred and enlarged here, once,
 * as a blob: URL. Not a CSS filter (WebKit paints a filtered layer over a reel as a square at a phone's
 * top-left corner) and not the small copy stretched by the browser (WebKit shows its pixels as blocks).
 * Null when it can't be read (no canvas, Commons unreachable), and the picture shows over the reel's night. */
const soft = new Map<string, Promise<string | null>>();
const softReady = new Map<string, string>();
/** The blurred copy made already for this source, if any. */
export const softCopyNow = (src: string): string | undefined => softReady.get(src);
export function softCopy(src: string): Promise<string | null> {
  let made = soft.get(src);
  if (!made) {
    made = new Promise<string | null>(resolve => {
      if (typeof Image === 'undefined' || typeof document === 'undefined') return resolve(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onerror = () => resolve(null);
      img.onload = () => {
        try {
          const canvas = blurredAndEnlarged(img);
          if (!canvas) return resolve(null);
          canvas.toBlob(blob => {
            if (!blob) return resolve(null);
            const url = URL.createObjectURL(blob);
            softReady.set(src, url);
            resolve(url);
          }, 'image/png');
        } catch {
          resolve(null); // a canvas the browser won't let us read
        }
      };
      img.src = src;
    });
    soft.set(src, made);
  }
  return made;
}

/** Three box blurs of radius 1 (about a Gaussian of 1.4 source pixels) at the copy's own size, then a
 * bilinear enlargement to 180 px wide, so the browser stretches a smooth picture by a few times at most. */
const SOFT_WIDTH = 180;
function blurredAndEnlarged(img: HTMLImageElement): HTMLCanvasElement | null {
  const w = img.naturalWidth, h = img.naturalHeight;
  if (!w || !h) return null;
  const source = document.createElement('canvas');
  source.width = w; source.height = h;
  const sx = source.getContext('2d', { willReadFrequently: true });
  if (!sx) return null;
  sx.drawImage(img, 0, 0);
  const px = sx.getImageData(0, 0, w, h).data;
  const pass = (from: Uint8ClampedArray, to: Uint8ClampedArray, dx: number, dy: number) => {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const a = (Math.max(0, Math.min(h - 1, y - dy)) * w + Math.max(0, Math.min(w - 1, x - dx))) * 4;
      const b = (y * w + x) * 4;
      const c = (Math.max(0, Math.min(h - 1, y + dy)) * w + Math.max(0, Math.min(w - 1, x + dx))) * 4;
      for (let k = 0; k < 3; k++) to[b + k] = (from[a + k] + from[b + k] + from[c + k]) / 3;
      to[b + 3] = 255;
    }
  };
  let one = new Uint8ClampedArray(px), two = new Uint8ClampedArray(px.length);
  for (let n = 0; n < 3; n++) { pass(one, two, 1, 0); pass(two, one, 0, 1); }
  const W = Math.max(w, SOFT_WIDTH), H = Math.max(1, Math.round(W * h / w));
  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  const ox = out.getContext('2d');
  if (!ox) return null;
  const big = ox.createImageData(W, H), d = big.data;
  for (let y = 0; y < H; y++) {
    const fy = Math.max(0, Math.min(h - 1, (y + 0.5) * h / H - 0.5)), y0 = Math.floor(fy), y1 = Math.min(h - 1, y0 + 1), ty = fy - y0;
    for (let x = 0; x < W; x++) {
      const fx = Math.max(0, Math.min(w - 1, (x + 0.5) * w / W - 0.5)), x0 = Math.floor(fx), x1 = Math.min(w - 1, x0 + 1), tx = fx - x0;
      const i00 = (y0 * w + x0) * 4, i01 = (y0 * w + x1) * 4, i10 = (y1 * w + x0) * 4, i11 = (y1 * w + x1) * 4, o = (y * W + x) * 4;
      for (let k = 0; k < 3; k++) d[o + k] = (one[i00 + k] * (1 - tx) + one[i01 + k] * tx) * (1 - ty) + (one[i10 + k] * (1 - tx) + one[i11 + k] * tx) * ty;
      d[o + 3] = 255;
    }
  }
  ox.putImageData(big, 0, 0);
  return out;
}

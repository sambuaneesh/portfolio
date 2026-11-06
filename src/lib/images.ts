import { getImage, inferRemoteSize } from 'astro:assets';

export interface Img { src: string; width?: number; height?: number }

const memo = new Map<string, Promise<Img>>();

/**
 * Re-encode a remote (admin-uploaded) image to a small AVIF at build time,
 * returning its real dimensions so the page can reserve space (no layout
 * shift). Never fails the build: if the source can't be fetched or decoded,
 * the original URL is used as-is.
 */
export function optimize(src: string, width: number, height?: number): Promise<Img> {
  const key = `${src}|${width}|${height ?? ''}`;
  if (!memo.has(key)) {
    memo.set(key, (async () => {
      try {
        // Without a height, keep the source's aspect ratio (and never upscale).
        // Passing inferSize alone would keep the original height and crop.
        let size: { width: number; height: number; fit?: 'cover' };
        if (height) size = { width, height, fit: 'cover' };
        else {
          const orig = await inferRemoteSize(src);
          const w = Math.min(width, orig.width);
          size = { width: w, height: Math.round((w * orig.height) / orig.width) };
        }
        const img = await getImage({ src, ...size, format: 'avif', quality: 60 });
        const w = Number(img.attributes.width) || undefined;
        const h = Number(img.attributes.height) || undefined;
        return { src: img.src, width: w, height: h };
      } catch (err) {
        console.warn(`[images] keeping original for ${src}: ${(err as Error).message}`);
        return { src };
      }
    })());
  }
  return memo.get(key)!;
}

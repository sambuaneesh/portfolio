import { getImage } from 'astro:assets';

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
        const img = await getImage({ src, width, ...(height ? { height, fit: 'cover' } : {}), format: 'avif', quality: 60, inferSize: true });
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

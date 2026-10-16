import { record, recall } from './snapshot';

// Reads a public Steam profile's XML feed at build time (no API key needed):
// display name and recently played games with hours. Never fails the build.

export interface SteamGame { name: string; link: string; capsule: string; hours2wk: number; hoursTotal: number }
export interface SteamProfile { url: string; handle: string; summary: string; games: SteamGame[] }

const tag = (xml: string, name: string) =>
  xml.match(new RegExp(`<${name}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${name}>`))?.[1]?.trim() ?? '';

const decode = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<[^>]+>/g, '');

const memo = new Map<string, Promise<SteamProfile | null>>();

export function getSteam(profileUrl: string): Promise<SteamProfile | null> {
  if (!memo.has(profileUrl)) {
    memo.set(profileUrl, (async () => {
      try {
        const res = await fetch(`${profileUrl.replace(/\/$/, '')}/?xml=1`, { signal: AbortSignal.timeout(6000) });
        if (!res.ok) throw new Error(`steam ${res.status}`);
        const xml = await res.text();
        if (tag(xml, 'privacyState') !== 'public') return null;
        const games = [...xml.matchAll(/<mostPlayedGame>([\s\S]*?)<\/mostPlayedGame>/g)].map(([, g]) => ({
          name: decode(tag(g, 'gameName')),
          link: tag(g, 'gameLink'),
          capsule: tag(g, 'gameLogo'),
          hours2wk: Number(tag(g, 'hoursPlayed')) || 0,
          hoursTotal: Number(tag(g, 'hoursOnRecord').replace(/,/g, '')) || 0,
        }));
        const profile = { url: profileUrl, handle: decode(tag(xml, 'steamID')), summary: decode(tag(xml, 'summary')), games };
        record(`steam:${profileUrl}`, profile);
        return profile;
      } catch {
        try { return await recall<SteamProfile>(`steam:${profileUrl}`); } catch { return null; }
      }
    })());
  }
  return memo.get(profileUrl)!;
}

export interface SteamReview { app: string; name: string; capsule: string; recommended: boolean; hours: string; text: string; url: string }

const reviewMemo = new Map<string, Promise<SteamReview[]>>();

/** Public reviews from the profile's /recommended/ page (names via the store API). */
export function getSteamReviews(profileUrl: string): Promise<SteamReview[]> {
  if (!reviewMemo.has(profileUrl)) {
    reviewMemo.set(profileUrl, (async () => {
      try {
        const base = profileUrl.replace(/\/$/, '');
        const res = await fetch(`${base}/recommended/`, { signal: AbortSignal.timeout(6000) });
        if (!res.ok) throw new Error(`steam ${res.status}`);
        const html = await res.text();
        const blocks = html.split('class="review_box"').slice(1);
        const out: SteamReview[] = [];
        for (const b of blocks) {
          const app = b.match(/steamcommunity\.com\/app\/(\d+)/)?.[1];
          const verdict = b.match(/class="title"><a href="([^"]+)"[^>]*>([^<]+)/);
          if (!app || !verdict) continue;
          const text = decode(b.match(/class="content\s*">([\s\S]*?)<\/div>/)?.[1].replace(/<br\s*\/?>/g, ' ').trim() ?? '');
          let name = '';
          try {
            const r = await fetch(`https://store.steampowered.com/api/appdetails?appids=${app}&filters=basic`, { signal: AbortSignal.timeout(5000) });
            name = (await r.json())?.[app]?.data?.name ?? '';
          } catch { /* name stays empty */ }
          out.push({
            app,
            name: name || `app ${app}`,
            capsule: b.match(/class="game_capsule"\s*src="([^"]+)"/)?.[1] ?? '',
            recommended: !/not recommended/i.test(verdict[2]),
            hours: (b.match(/class="hours">\s*([\d.,]+ hrs)/)?.[1] ?? '').trim(),
            text,
            url: verdict[1],
          });
        }
        const reviews = out.filter((r) => r.text);
        record(`steamrev:${profileUrl}`, reviews);
        return reviews;
      } catch {
        try { return await recall<SteamReview[]>(`steamrev:${profileUrl}`); } catch { return []; }
      }
    })());
  }
  return reviewMemo.get(profileUrl)!;
}

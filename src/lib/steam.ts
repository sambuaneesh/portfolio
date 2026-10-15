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
        if (!res.ok) return null;
        const xml = await res.text();
        if (tag(xml, 'privacyState') !== 'public') return null;
        const games = [...xml.matchAll(/<mostPlayedGame>([\s\S]*?)<\/mostPlayedGame>/g)].map(([, g]) => ({
          name: decode(tag(g, 'gameName')),
          link: tag(g, 'gameLink'),
          capsule: tag(g, 'gameLogo'),
          hours2wk: Number(tag(g, 'hoursPlayed')) || 0,
          hoursTotal: Number(tag(g, 'hoursOnRecord').replace(/,/g, '')) || 0,
        }));
        return { url: profileUrl, handle: decode(tag(xml, 'steamID')), summary: decode(tag(xml, 'summary')), games };
      } catch {
        return null;
      }
    })());
  }
  return memo.get(profileUrl)!;
}

import { record, recall } from './snapshot';

// Reads a public Steam profile at build time: display name, recently played
// games and the whole library by playtime. With STEAM_API_KEY it uses the
// official Web API; the community XML feed is only a fallback, because Steam
// rate-limits it (429) for GitHub Actions' shared IPs. Never fails the build.

export interface SteamGame { name: string; link: string; capsule: string; hours2wk: number; hoursTotal: number }
/** games = recently played (public feed); top = whole library by playtime (needs STEAM_API_KEY). */
export interface SteamProfile { url: string; handle: string; summary: string; games: SteamGame[]; top: SteamGame[] }

const tag = (xml: string, name: string) =>
  xml.match(new RegExp(`<${name}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${name}>`))?.[1]?.trim() ?? '';

const decode = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<[^>]+>/g, '');

const memo = new Map<string, Promise<SteamProfile | null>>();

// .env (local dev/build) arrives via import.meta.env; CI passes a real env var.
// Build-time only, never sent to the browser.
const apiKey = (): string | undefined => import.meta.env.STEAM_API_KEY ?? process.env.STEAM_API_KEY;

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`https://api.steampowered.com/${path}&key=${apiKey()}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`steam api ${res.status}`);
  return res.json() as Promise<T>;
}

/** steamcommunity.com pages: one retry, since a 429 there is usually brief. */
async function community(url: string): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (res.ok) return res.text();
    if (attempt === 1 || res.status !== 429) throw new Error(`steam ${res.status}`);
    await new Promise((r) => setTimeout(r, 3000));
  }
}

interface ApiGame { appid: number; name: string; playtime_forever: number; playtime_2weeks?: number }
const hours = (minutes = 0) => Math.round((minutes / 60) * 10) / 10;
const toGame = (g: ApiGame): SteamGame => ({
  name: g.name,
  link: `https://steamcommunity.com/app/${g.appid}`,
  capsule: `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${g.appid}/capsule_184x69.jpg`,
  hours2wk: hours(g.playtime_2weeks),
  hoursTotal: hours(g.playtime_forever),
});

/** The whole library, most played first. Needs the profile's "Game details"
 *  public; returns null otherwise. */
async function ownedGames(steamid: string): Promise<SteamGame[] | null> {
  if (!apiKey() || !steamid) return null;
  try {
    const r = await api<{ response?: { games?: ApiGame[] } }>(`IPlayerService/GetOwnedGames/v1/?steamid=${steamid}&include_appinfo=1&include_played_free_games=1&format=json`);
    return (r.response?.games ?? []).filter((g) => g.playtime_forever > 0).sort((a, b) => b.playtime_forever - a.playtime_forever).map(toGame);
  } catch {
    return null;
  }
}

async function fromApi(profileUrl: string): Promise<SteamProfile | null> {
  let id = profileUrl.match(/\/profiles\/(\d{17})/)?.[1];
  if (!id) {
    const vanity = profileUrl.match(/\/id\/([^/?#]+)/)?.[1];
    const r = await api<{ response: { success: number; steamid?: string } }>(`ISteamUser/ResolveVanityURL/v1/?vanityurl=${vanity}`);
    if (r.response.success !== 1 || !r.response.steamid) throw new Error('steam: unknown profile');
    id = r.response.steamid;
  }
  const [players, recent] = await Promise.all([
    api<{ response: { players: { personaname: string; communityvisibilitystate: number }[] } }>(`ISteamUser/GetPlayerSummaries/v2/?steamids=${id}`),
    api<{ response: { games?: ApiGame[] } }>(`IPlayerService/GetRecentlyPlayedGames/v1/?steamid=${id}&format=json`),
  ]);
  const player = players.response.players[0];
  if (!player) throw new Error('steam: no such player');
  if (player.communityvisibilitystate !== 3) return null;   // private profile
  const games = (recent.response.games ?? []).sort((a, b) => (b.playtime_2weeks ?? 0) - (a.playtime_2weeks ?? 0)).map(toGame);
  const top = await ownedGames(id);
  if (!top) throw new Error('steam: library unavailable');
  return { url: profileUrl, handle: player.personaname, summary: '', games, top };
}

async function fromFeed(profileUrl: string): Promise<SteamProfile | null> {
  const xml = await community(`${profileUrl.replace(/\/$/, '')}/?xml=1`);
  if (tag(xml, 'privacyState') !== 'public') return null;
  const games = [...xml.matchAll(/<mostPlayedGame>([\s\S]*?)<\/mostPlayedGame>/g)].map(([, g]) => ({
    name: decode(tag(g, 'gameName')),
    link: tag(g, 'gameLink'),
    capsule: tag(g, 'gameLogo'),
    hours2wk: Number(tag(g, 'hoursPlayed')) || 0,
    hoursTotal: Number(tag(g, 'hoursOnRecord').replace(/,/g, '')) || 0,
  }));
  const owned = await ownedGames(tag(xml, 'steamID64'));
  return { url: profileUrl, handle: decode(tag(xml, 'steamID')), summary: decode(tag(xml, 'summary')), games, top: owned ?? [] };
}

export function getSteam(profileUrl: string): Promise<SteamProfile | null> {
  if (!memo.has(profileUrl)) {
    memo.set(profileUrl, (async () => {
      // the API first (reliable from CI), then the public feed, then the
      // snapshot of the last build that reached Steam
      for (const source of apiKey() ? [fromApi, fromFeed] : [fromFeed]) {
        try {
          const profile = await source(profileUrl);
          if (profile) record(`steam:${profileUrl}`, profile);
          return profile;
        } catch (err) {
          console.warn(`[steam] ${source.name}: ${(err as Error).message}`);
        }
      }
      try { return await recall<SteamProfile>(`steam:${profileUrl}`); } catch { return null; }
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
        const html = await community(`${base}/recommended/`);
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
      } catch (err) {
        console.warn(`[steam] reviews: ${(err as Error).message}`);
        try { return await recall<SteamReview[]>(`steamrev:${profileUrl}`); } catch { return []; }
      }
    })());
  }
  return reviewMemo.get(profileUrl)!;
}

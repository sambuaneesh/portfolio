// Public Monkeytype profile (no key needed), read at build time and covered
// by the snapshot fallback like everything else.
import { record, recall } from './snapshot';

export interface TypingStats {
  name: string;
  url: string;
  best: { label: string; wpm: number; acc: number }[];
  tests: number;
  hours: number;
  rank: { pct: number; mode: string } | null;
}

interface PB { wpm: number; acc: number; language: string }

export async function getMonkeytype(profileUrl: string): Promise<TypingStats | null> {
  const name = profileUrl.match(/monkeytype\.com\/profile\/([^/?#]+)/i)?.[1];
  if (!name) return null;
  const key = `monkeytype:${name}`;
  try {
    const res = await fetch(`https://api.monkeytype.com/users/${encodeURIComponent(name)}/profile`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`monkeytype ${res.status}`);
    const d = (await res.json()).data;
    const top = (mode: string, k: string) => {
      const list: PB[] = (d.personalBests?.[mode]?.[k] ?? []).filter((x: PB) => x.language === 'english');
      return list.length ? list.reduce((a, b) => (b.wpm > a.wpm ? b : a)) : null;
    };
    const best = ([['time', '15', '15s'], ['time', '60', '60s'], ['words', '10', '10 words']] as const)
      .map(([m, k, label]) => { const pb = top(m, k); return pb ? { label, wpm: Math.round(pb.wpm), acc: Math.round(pb.acc) } : null; })
      .filter(Boolean) as TypingStats['best'];
    const lb = d.allTimeLbs?.time?.['60']?.english ?? d.allTimeLbs?.time?.['15']?.english;
    const stats: TypingStats = {
      name: d.name,
      url: profileUrl,
      best,
      tests: d.typingStats?.completedTests ?? 0,
      hours: Math.round((d.typingStats?.timeTyping ?? 0) / 3600),
      rank: lb?.rank && lb?.count ? { pct: Math.round((lb.rank / lb.count) * 1000) / 10, mode: d.allTimeLbs?.time?.['60'] ? '60s, en' : '15s, en' } : null,
    };
    record(key, stats);
    return stats;
  } catch {
    try { return await recall<TypingStats>(key); } catch { return null; }
  }
}

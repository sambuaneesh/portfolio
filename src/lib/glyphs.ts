// Highlight icons are stored as lucide icon names (e.g. "Cpu"). Instead of
// shipping an icon library, each maps to a mono glyph on a keycap.
const GLYPHS: Record<string, string> = {
  Cpu: '▣', GitBranch: '⑂', Code2: '</>', Code: '</>', Network: '⇄', Server: '▤', Database: '◫',
  Terminal: '>_', Layers: '≡', Brain: '∴', BookOpen: '¶', Award: '★', Rocket: '↗', Shield: '◈',
  Globe: '◎', Zap: 'ϟ', Wrench: '⚒', Lightbulb: '!', Users: '⁂', Cloud: '☁', Sparkles: '✳',
};

export function glyph(name: string): string {
  return GLYPHS[name] ?? name.slice(0, 2).toUpperCase();
}

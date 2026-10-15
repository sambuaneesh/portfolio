import type { Module, Skill } from './db';

// Skill names and GitHub-style project languages don't always agree.
const ALIASES: Record<string, string> = { golang: 'go', 'c plus plus': 'c++', js: 'javascript', ts: 'typescript' };
const norm = (s: string) => {
  const k = s.trim().toLowerCase();
  return ALIASES[k] ?? k;
};

/** Projects that actually use a skill: matched on the project's language, then its tags. */
export function usedIn(skill: string, modules: Module[]): Module[] {
  const k = norm(skill);
  return modules.filter((m) =>
    (m.language && norm(m.language) === k) || (m.tags ?? []).some((t) => norm(t) === k),
  );
}

export function toolchain(skills: Skill[], modules: Module[]) {
  const rows = skills.map((s) => ({ skill: s, mods: usedIn(s.skill_name, modules) }));
  return { proven: rows.filter((r) => r.mods.length), rest: rows.filter((r) => !r.mods.length) };
}

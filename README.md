# aneesh sambu

Personal site of Aneesh Sambu: projects, research, CV, writing, and a contact inbox, all editable from the site itself.

Live at **https://sambuaneesh.github.io/portfolio/**

## What it is

- **A photocopied hacker zine on a tiling desk.** Every page is a grid of tiled windows, and each tile is a hex-numbered "phile" pasted on with tape: ransom-note name, highlighter, stamps, one layer of static photocopier grain. All CSS, no images.
- **Keyboard-driven, never keyboard-only.**
  - `1`–`5` switch pages, `h j k l` move between tiles, `↵` opens the focused tile.
  - `:` (or `ctrl k`) opens a command line, `?` shows help.
  - Mouse and touch work normally; on phones the pages become a bottom tab bar.
- **One theme, chosen by me.** `/admin/` → Appearance picks it (`zine`, `zine-night`, plus the older `putty`, `nostromo`, `phosphor`, `paper`, `aero`) along with the cassette tagline and the greetz list; it's baked in at build.
- **Static and fast.** Content is read from Supabase **at build time** and baked into plain HTML.
  - Pages ship about 2–3 KB of JS and about 111 KB total, fonts included.
  - Lighthouse mobile: 100 performance, 100 SEO, 100 best practices.
  - A budget check in CI fails the build if a page gets heavier.
- **Editable.** `/admin/` edits every table (profile, projects, experience, posts, settings, inbox) through a Supabase Edge Function. "Publish site" triggers a rebuild, which goes live in about a minute.

## Stack

- **Frontend:** [Astro](https://astro.build) (static output) with plain TypeScript for the small amount of runtime behaviour. No UI framework.
- **Data:** Supabase Postgres with row-level security. Every table is prefixed `aneesh_` because the project is shared with other apps.
- **Server:** one Supabase Edge Function, `supabase/functions/admin`, for login (bcrypt + self-signed JWT), writes, uploads and rebuild triggers.
- **Hosting:** GitHub Pages via `.github/workflows/deploy.yml`.

See **[docs/DEVELOPING.md](docs/DEVELOPING.md)** for setup and deployment, and **[docs/DESIGN_NOTES.md](docs/DESIGN_NOTES.md)** for the design research behind the look.

The previous React version lives on the `archive/v1-react` branch.

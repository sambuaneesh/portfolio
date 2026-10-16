# aneesh sambu

Personal site of Aneesh Sambu: projects, research, CV, writing, and a contact inbox, all editable from the site itself.

Live at **https://sambuaneesh.github.io/portfolio/**

## What it is

- **A zine.** The site is one photocopied booklet, "The Boring Zine" (modelled on the zines that shipped with EXAPUNKS).
  - The home page is a coloured cover (masthead, halftoned photo, cover lines, barcode), then a contents page and a letter from the editor.
  - Every project is a two-page article: specs and screenshot on the left, its GitHub README on the right, cut off at the page with "continued on github".
  - The CV is a "field log"; contact is the classifieds. Pages have running heads, page numbers and a fold.
- **Page turns.** `←` / `→` (and the links at the foot of each spread) go to the previous and next spread, with a CSS 3D page-turn transition. `:` / `ctrl k` opens a command line, `1`–`5` jump to sections, `?` shows help.
- **Cover colour set by me.** `/admin/` → Appearance picks it (`trash`, `riso`, `riso-blue`, `toner`, `blueprint`, `acid`) plus the masthead, tagline, cover line and issue number. Its **Preview** button opens the site with a colour without saving; `?preview=<theme>` works on localhost and for signed-in admins only.
- **Static and fast.** Content is read from Supabase **at build time** and baked into plain HTML.
  - Pages ship about 2 KB of JS and about 110–115 KB total, fonts included.
  - A budget check in CI fails the build if a page gets heavier.
- **Editable.** `/admin/` edits every table (profile, projects, experience, posts, settings, inbox) through a Supabase Edge Function. "Publish site" triggers a rebuild, which goes live in about a minute.

## Stack

- **Frontend:** [Astro](https://astro.build) (static output) with plain TypeScript for the small amount of runtime behaviour. No UI framework.
- **Data:** Supabase Postgres with row-level security. Every table is prefixed `aneesh_` because the project is shared with other apps.
- **Server:** one Supabase Edge Function, `supabase/functions/admin`, for login (bcrypt + self-signed JWT), writes, uploads and rebuild triggers.
- **Hosting:** GitHub Pages via `.github/workflows/deploy.yml`.

See **[docs/DEVELOPING.md](docs/DEVELOPING.md)** for setup and deployment, and **[docs/DESIGN_NOTES.md](docs/DESIGN_NOTES.md)** for the design research behind the look.

The previous React version lives on the `archive/v1-react` branch.

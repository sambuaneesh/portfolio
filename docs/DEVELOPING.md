# Developing

## Setup

Requires Node 22.12+.

```sh
npm install
cp .env.example .env      # fill in PUBLIC_SUPABASE_URL + PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm run dev               # http://localhost:4321/portfolio/
```

| Command | What it does |
|---|---|
| `npm run dev` | dev server (data is fetched from Supabase on each request) |
| `npm run build` | static build into `dist/` |
| `npm run preview` | serve `dist/` |
| `npm run check` | type-check (`astro check`) |
| `npm run budget` | per-page weight report; exits non-zero over budget |
| `scripts/subset-fonts.sh` | regenerate the subset fonts in `src/assets/fonts` (needs `uv`) |

`GITHUB_TOKEN` in `.env` is optional. Without it, GitHub's API rate limit can make project stars and last-push dates fall back to the database values.

## How content flows

```
Supabase (aneesh_* tables) ──build──▶ static HTML (GitHub Pages)
        ▲                                   │
        │ writes via Edge Function          │ browser-side, anon key:
        │ (/admin)                          │ contact form, task requests,
        └─── "Publish site" ─▶ GitHub       │ blog likes + comments
             repository_dispatch ─▶ rebuild ◀┘
```

- **Public pages** read through `src/lib/db.ts` at build time only.
- **Visitor writes** (contact form, task requests, likes, comments) go straight to PostgREST with the publishable key, restricted by RLS. See `src/scripts/rest.ts`.
- **Admin writes** go through `supabase/functions/admin`. See `src/scripts/admin/`.
- **The admin console** is generated from `src/scripts/admin/schema.ts`. Adding an editable column means adding one line there.

## Deploy

`.github/workflows/deploy.yml` builds and deploys to GitHub Pages:
- on every push to `main`;
- when `/admin` presses **Publish site**;
- every 6 hours;
- manually from the Actions tab.

The build fails if `npm run budget` fails.

### One-time setup for the "Publish site" button

The Edge Function needs a token that can trigger the workflow:

1. Create a **fine-grained personal access token** on GitHub:
   - repository access: only `sambuaneesh/portfolio`;
   - permission: **Contents: Read and write**, which `repository_dispatch` requires.
2. Deploy the function and set the secret:

   ```sh
   npx supabase login
   npx supabase link --project-ref egqcfennzkzywarpxmwi
   npx supabase functions deploy admin
   npx supabase secrets set GITHUB_DISPATCH_TOKEN=<token>
   ```

Until this is done, Publish shows a hint. Edits still go live on the next scheduled or manual run.

### Database

Migrations live in `supabase/migrations/`. The Supabase instance is shared, so never run anything that touches tables outside the `aneesh_` namespace.

- `20260101000000_aneesh_portfolio_baseline.sql`: every table, RLS, storage bucket, seed content.
- `20261016000000_blog_likes_public_count.sql` (**not yet applied**): makes like counts readable so posts can show them.

Project pages render the repo's GitHub README (fetched at build from raw.githubusercontent.com). Per-project "show readme" / "write-up" options are edited on the project form in `/admin/` and stored in the `project_extras` site setting, so they need no migration.

Apply pending migrations with `npx supabase db push`.

### Admin users

```sh
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
ADMIN_BOOTSTRAP_USERNAME=... ADMIN_BOOTSTRAP_PASSWORD=... npm run create-admin
```

## Site settings worth knowing

Edited under **Site settings** in `/admin/` (JSON values):

| key | used for |
|---|---|
| `footer_text`, `footer_github_url` | statusline at the bottom of every page |
| `auth_title`, `auth_description` | admin sign-in screen |
| `badge_lab` | `{ "label", "url" }` on the home ID badge |
| `extra_links` | `[{ "label", "url" }]` added to links and the command line; a Steam profile link also drives the games tile |
| `theme`, `cassette_tagline`, `greetz` | edited on the Appearance page; theme is fixed for every visitor |
| `project_extras` | `{ "<project id>": { "show_readme": bool, "readme_override": "markdown" } }`; edited from the project form |

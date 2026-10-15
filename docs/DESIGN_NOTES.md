# Design Notes (expanded)

Research done 2026-10-16. Every style below has: what it is, the concrete vocabulary (things you can actually write in CSS), references, how it fails, what it costs to render, and a verdict for this site.

Cost scale: `free` = flat colors/borders, `cheap` = gradients/transforms, `pricey` = blur/filters/webfonts galore, `heavy` = WebGL/video.

---

## 1. The raw family

### Brutalism (web)
- **Roots:** *béton brut* (raw concrete), Le Corbusier's Unité d'Habitation, 1952. Honesty of material, visible structure. Pascal Deville started brutalistwebsites.com in 2014.
- **Two strands** (Smashing Magazine, 2020):
  - *l'Internet Brut*: raw HTML used honestly (Craigslist, HN, Wikipedia, danluu.com).
  - *l'Internet Fou*: deliberately broken, Dada-ish.
- **The manifesto that fits a systems programmer:** David Bryant Copeland's brutalist-web.design.
  - Content is readable on any screen.
  - Only links and buttons are clickable.
  - Links are underlined.
  - The back button always works.
  - Decoration only when it solves a problem.
- **Vocabulary:**
  - system font stack or one mono (IBM Plex Mono, JetBrains Mono)
  - `#000` on `#fff`, link blue `#0000EE`, visited `#551A8B`
  - `border-radius: 0`, no shadows
  - giant solid headings (`line-height: .9`), `<pre>`, `<details>`, visible tables, full-bleed `<hr>`
- **Refs:** brutalistwebsites.com, art.yale.edu (a site that is a wiki anyone at the school edits), danluu.com, news.ycombinator.com, storyofbrutalism.com (the art-directed version).
- **Fails when:**
  - Type scale and spacing aren't rigorous, so it looks unfinished rather than deliberate.
  - "Lowercase mono + blinking cursor" has become the dev-portfolio starter cliché.
- **Cost:** free. Lighthouse 100 is realistic.
- **Verdict:** **the base layer.** Its "honest structure" maps directly onto shells, file systems and interpreters.

### Neo-brutalism
- **Roots:** Gumroad's 2021 rebrand (Sahil Lavingia). Named by Michał Malewicz's 2022 essay. NN/g defines it as "high contrast, blocky, bold colors, thick borders, 'unpolished' elements."
- **Vocabulary:**
  - `border: 3px solid #000`
  - `box-shadow: 4px 4px 0 #000` (blur is always 0)
  - radius 0 to 4px
  - hover lifts: `translate(-2px,-2px)` plus a bigger shadow
  - **active presses into the shadow:** `translate(4px,4px); box-shadow: none`
  - Gumroad tokens: pink `#ff90e8`, yellow `#ffc900`, teal `#23a094`, paper `#f4f4f0`, ink `#242423`
  - fonts: Space Grotesk, Archivo Black, Syne 800, DM Sans, Space Mono
  - sticker badges `rotate(-3deg)`, starburst SVGs, marquees, highlighter underlines
- **Refs:** gumroad.com, panda-css.com, tonyschocolonely.com, neobrutalism.dev.
- **Fails when:**
  - It's used as cream background + pastel + 4px black shadow. **neobrutalism.dev ships that as a shadcn theme**, so it is now the 2026 version of the generic-template look we are escaping.
  - Yellow or pink *text* fails contrast. Colors belong in fills; text stays ink.
  - The decorative shadow is mistaken for a focus ring.
- **2026 drift:** "soft/tactile brutalism" (more whitespace, friendlier type). The full-page look is cooling. The **border + hard shadow + press** mechanic survives as an accent.
- **Cost:** free (zero-blur shadows are trivial to paint).
- **Verdict:** **take the mechanic, not the costume.** Keep the press-in tactility and drop the pastel-cream palette.

### Anti-design
- **Roots:** Italian Radical Design, 1966–75 (Superstudio, Archizoom). Design used as critique rather than problem-solving.
- **Vocabulary:**
  - three or more clashing typefaces, `font-stretch` abuse
  - overlapping absolutely positioned elements, rotated or vertical text (`writing-mode`)
  - `mix-blend-mode: difference`
  - `#00FF00` on `#FF00FF`, crushed JPEGs, cursor trails
  - hover effects that relocate content
- **Refs:** mschf.com, toiletpapermagazine.org, jisooeom.com.
  - **Paul Ford's "What Is Code?"** (Bloomberg, 2015) is the best precedent for a programmer: chaotic and self-aware, but in service of content.
- **Fails when:**
  - Recruiters can't find the CV. NN/g: use it only where the visitor has no task to complete.
  - Screen readers get scrambled source order.
- **Cost:** varies (cheap as DOM, heavy once canvases and GIFs pile up).
- **Verdict:** **contained zones only:** the 404 page, a /lab page, blog post art, easter eggs. Never on the CV path.

### Maximalism
- **Roots:** Venturi's "Less is a bore" (1966); Memphis Group (Milan, 1981–87, Sottsass).
- **2026 strands:** dopamine color, tactile maximalism, "controlled maximalism" (at most 3 font families, rich texture, hard blocks).
- **Vocabulary:**
  - grain via an SVG `feTurbulence` filter, patterns, stickers, overlapping images
  - display type at 15–25vw: Bricolage Grotesque, Fraunces (WONK axis), Instrument Serif, Bungee, Rubik Mono One
  - Memphis palette: `#F25C54` `#F7B267` `#4ECDC4` `#1A1A2E`, with squiggles and confetti
- **Refs:** cameronsworld.net, lingscars.com, poolsuite.net, spacejam.com/1996.
- **Fails when:** there is no organizing system, so it becomes noise; contrast breaks over textures; LCP gets slow.
- **Cost:** pricey to heavy. Grain must be a tiny SVG or PNG tile, never video.
- **Verdict:** **seasoning.** Use it in delight zones and one hero moment.

---

## 2. The nostalgia family

### Y2K / late-90s web
- **Vocabulary:**
  - Win98 face `#C0C0C0`, title bar `#000080 → #1084D0`, desktop `#008080`
  - bevels via stacked inset shadows: `inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px #808080, inset 2px 2px #dfdfdf`
  - pixel fonts (Pixelify Sans, W95FA, VT323, Silkscreen) for chrome only, never body text
  - dithering, `image-rendering: pixelated`, 88x31 badges, hit counters
- **Refs:** dustinbrett.com (daedalOS), posthog.com (the 2025 "website as an OS"), poolsuite.net, windows93.net, henryheffernan.com.
- **Fails when:** "my portfolio is Windows 98" is a cliché now owned by PostHog and daedalOS. Windows also hide content from scanning, search engines and mobile.
- **Cost:** free.
- **Verdict:** borrow badges, bevels and hit-counter humor as details. **Do not build a fake desktop.**

### Retro-futurism → **cassette futurism** (new, most on-brand)
- **Strands:**
  - Atompunk / Space Age (1945–65): Googie, starbursts, chrome optimism.
  - **Cassette futurism** (1970s to mid-90s): Ron Cobb's Nostromo in *Alien*, CRTs, chunky keys, tape drives, utilitarian and industrial.
  - Modern heirs: Teenage Engineering ("future industrial") and Nothing's dot-matrix branding.
- **Vocabulary:**
  - phosphor `#33FF66` on `#0A0F0A`; amber `#FFB000` on `#120B00`
  - Nostromo putty `#D8CFB8` + warning orange `#FF5F1F` + `#3A3A3A` + red `#D7263D`
  - type: Berkeley Mono (paid) / JetBrains Mono / IBM Plex Mono / Departure Mono; display in Michroma or Major Mono Display
  - box-drawing borders `┌─┐`, block cursors, segmented LED readouts, label tape, hazard stripes, part numbers, grid-paper schematics
  - scanlines: `repeating-linear-gradient(transparent 0 2px, rgba(0,0,0,.25) 2px 4px)` as a static overlay
  - glow: `text-shadow: 0 0 2px currentColor, 0 0 8px color-mix(in oklab, currentColor 60%, transparent)`
- **Fails when:**
  - Flicker breaks WCAG 2.3.1.
  - Glow blurs body text (keep it on an overlay).
  - Synthwave sunset + Orbitron = the overused version.
- **Cost:** cheap if static. Animated full-screen overlays and SVG displacement are pricey.
- **Verdict:** **strongest identity fit.** It's functional, made of mono and box-drawing, and reads as "a person who builds tools."

### Frutiger Aero (~2004–2013)
- **Roots:** term coined retroactively by Sofi Xian (CARI, 2017–18). Vista/7 Aero, Mac OS X Aqua, Wii menus, Web 2.0 gloss. Techno-optimism plus nature: sky, water, bubbles, goldfish, aurora.
- **Variants:** Frutiger Metro (Win8/Zune), Frutiger Eco (green), Aqua (lickable buttons).
- **Vocabulary:**
  - sky `#5BC0EB`, Aqua `#3A8DDE → #9FD3FF`, leaf `#7AC943`
  - aqua pill: base gradient + top-50% white `::before` + `inset 0 1px 0 #fff`
  - glossy orbs from layered `radial-gradient`, reflections
  - type: Segoe UI / Lucida Grande; free substitutes Hind, Istok Web
- **Refs:** 7.css, frutigeraeroarchive.org, makeaero.com.
- **Fails when:** it reads as a Gen-Z meme; stock nature photos look like clip art; white on light blue fails contrast.
- **Cost:** gloss is cheap (gradients only). Real glass needs `backdrop-filter`, which is pricey.
- **Verdict:** **a secret theme / easter egg,** not the identity.

### NeoPOP (CRED)
- **What it actually is:** CRED's open-source design system (2022; web, iOS, Android, Flutter), named after the 80s–90s neo-pop art movement (Koons, Murakami). The Memphis resemblance is visual kinship, not stated lineage.
- **Vocabulary:**
  - **"Plunk":** flat face with 3px extruded edges drawn as 45°-skewed pseudo-elements, each edge a darker shade of the face
  - press = `translate3d(3px,3px,0)` over 120ms
  - near-black `#0D0D0D`, red `#EE4D37`, orange `#F08D32`, blue `#144CC7`, green `#06C270`, purple `#6A35FF`
  - Cirka display serif + bold geometric sans; shimmer sweeps
  - DIY version: stepped shadow `1px 1px 0 E, 2px 2px 0 E, 3px 3px 0 E`
- **Fails when:** copied wholesale, it reads as a CRED clone.
- **Cost:** free.
- **Verdict:** **"brutalism with taste."** The extruded, darker-edge press is a classier version of the neo-brutal shadow. Use it for every interactive element.

### Glassmorphism → Liquid Glass
- **Roots:** Vista Aero (2006), iOS 7, macOS Big Sur. Named by Malewicz (Nov 2020). visionOS made glass the base material (2023); Apple's Liquid Glass followed (WWDC 2025), with refraction via SVG displacement (Chromium only on the web).
- **Recipe:** `rgba(255,255,255,.12)` + `backdrop-filter: blur(16px) saturate(160%)` + a 1px white-25% border + an inset top highlight, over vivid gradient blobs.
- **Fails when:**
  - Contrast depends on whatever sits behind the panel.
  - It reads as "Apple 2025," i.e. a default, not an identity.
  - Clashes with brutalism (soft against hard).
- **Cost:** **the most expensive item in these notes.**
  - It re-blurs every frame while the page scrolls; ~3.5ms of GPU per frame on mobile at 18px blur.
  - Never use it on a sticky header over scrolling content.
  - Cheap fake: pre-blur a static background once and use plain `rgba` panels.
- **Verdict:** **skip as a system.** At most it's the Aero easter-egg theme, with `@supports` and `prefers-reduced-transparency` fallbacks.

---

## 3. The structure and motion family

### Bento grid
- **Roots:** Apple product pages and keynote slides (2022–23), then Linear and Vercel landing pages. (bento.me itself was shut down by Linktree on 13 Feb 2026.)
- **Vocabulary:**
  - CSS Grid with `span` tiles (1x1, 2x1, 2x2), one hero tile
  - **subgrid** to align titles and footers across tiles
  - **container queries** so each tile adapts to its *own* width
  - live widgets (clock, commit heatmap, now-playing)
  - a cursor spotlight via `radial-gradient` at `var(--x) var(--y)`
- **Fails when:**
  - Rounded cards plus soft shadows make the Vercel-clone template look.
  - Mobile reflow isn't explicitly designed.
  - Decorative filler tiles appear.
- **Cost:** free.
- **Verdict:** **the skeleton,** reinterpreted (see the tiling-WM idea).

### Experimental web (Awwwards, 2026)
- **What's winning:** choreographed, meaningful motion over decoration; continuous state changes instead of hard cuts; 3D as atmosphere, not spectacle. **60fps on mid-range phones is a judging bar.**
- **Vocabulary:**
  - broken or asymmetric grids, oversized type as layout, pinned scenes, horizontal sections
  - kinetic and variable-font type, scramble/decode text
  - custom cursors (blend `difference`), magnetic buttons
  - marquees, `clip-path` reveals, grain
- **Refs:** lynnandtonic.com (rebuilt yearly, barely any JS: **the best model here**), joshwcomeau.com, rauno.me, p5aholic.me, minhpham.design, dennissnellenberg.com.
- **Fails when:**
  - Preloaders delay LCP.
  - Scroll-jacking breaks find, anchors and the keyboard.
  - Custom cursors mean nothing on touch (~60% of traffic).
  - Kinetic type everywhere is "polish over substance."
- **Verdict:** **one** hero moment of kinetic type and **one** signature interaction. Everything else stays still and fast.

### Interactive 3D & motion UI
- **Tools and weights (gzip):**

  | Option | Size |
  |---|---|
  | CSS 3D transforms, SVG | 0 KB of JS |
  | raw WebGL fragment shader | 2–4 KB |
  | OGL | 8–29 KB |
  | three.js | 92–180 KB, plus R3F/drei 40–100 KB |
  | Spline runtime | ~544 KB, plus 2–5 MB of scene (**banned**) |

- **Refs:** bruno-simon.com (has quality settings, worth copying), henryheffernan.com (a 3D desk with a working OS on the monitor), jesse-zhou.com, igloo.inc, lusion.co.
- **Rules:**
  1. Ship an AVIF poster (20–40KB, fixed aspect-ratio) as the LCP element.
  2. Load the WebGL with `import()` only on idle, visibility or interaction.
  3. Skip it entirely on `prefers-reduced-motion`, `saveData`, 2G, `deviceMemory <= 4`, `hardwareConcurrency <= 4`, or a failed `webgl2` context.
  4. DPR capped at 1.5, render on demand, pause when offscreen, a manual 3D on/off toggle.
- **Verdict:** **one** gated object at most, or none. CSS 3D gets most of the effect for 0 KB.

---

## 4. Compatibility matrix

|              | Brutal | Neo-brutal | Anti | Maxi | Y2K | Cassette | Aero | NeoPOP | Glass | Bento | 3D |
|--------------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Brutal       | – | ✅ | ✅ | ⚠️ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ (bordered) | ⚠️ |
| Neo-brutal   |   | – | ⚠️ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ⚠️ (flat/toon only) |
| Cassette     |   |   |   |   | ✅ | – | ❌ | ✅ | ❌ | ✅ (instrument panels) | ✅ (one object) |
| Aero / Glass |   |   |   | ⚠️ |   | ❌ | – | ❌ | ✅ | ✅ | ✅ |
| Anti / Maxi  |   |   |   | – | ✅ |   |   |   |   | ❌ (bento = order) | ✅ |

The two clusters that never mix well on the same surface:
- **hard/honest** (brutal, neo-brutal, cassette, NeoPOP, Y2K)
- **soft/translucent** (glass, Aero)

Pick one cluster as the system. The other can appear only as a deliberate *mode* (a theme or an easter egg), never side by side on the same surface.

---

## 5. Performance and accessibility contract (non-negotiable)

**Targets** (p75, Moto G-class device on Slow 4G):

| Metric | Google "good" | Ours |
|---|---|---|
| LCP | ≤ 2.5s | ≤ 1.5s |
| INP | ≤ 200ms | ≤ 100ms |
| CLS | ≤ 0.1 | ≤ 0.02 |

**First-load budget** (compressed):

| Resource | Budget |
|---|---|
| HTML | ≤ 30 KB |
| Critical CSS | ≤ 20 KB, inlined |
| **JS before interaction** | **≤ 30 KB** (aim < 10) |
| Fonts | ≤ 100 KB (two families max, Latin-subset WOFF2, self-hosted) |
| Hero image | ≤ 60 KB AVIF |
| **Total** | **≤ 250 KB** (the 2025 median mobile page is 2.56 MB) |
| Lazy 3D chunk | ≤ 150 KB, gated |

**Use native CSS instead of JS libraries:**
- scroll-driven animations (`animation-timeline: view()`): Chrome and Safari 26; Firefox missing, so wrap in `@supports`
- cross-document View Transitions: Chrome and Safari; Firefox just navigates instantly
- container queries, `:has()`, subgrid, `@property`, OKLCH + `color-mix()`, `@starting-style`, Speculation Rules prefetch

**Accessibility:**
- **Motion:** every animation lives inside `@media (prefers-reduced-motion: no-preference)`; static is the default. Marquees get a pause control. Nothing flashes more than 3 times per second.
- **Focus:** `:focus-visible` gets a 3px outline with offset, never the decorative shadow.
- **Contrast:** checked on text, not fills; 4.5:1 body text, 3:1 UI.
- **Semantics:**
  - Real content lives in the HTML; any canvas is `aria-hidden`.
  - Split-letter type gets an `aria-label` on the parent.
  - Hover reveals have tap and keyboard equivalents.
  - Touch targets ≥ 24px.
  - No scroll-jacking.

**Enforce it in CI** with Lighthouse CI or size-limit, so the build fails when the budget is exceeded.

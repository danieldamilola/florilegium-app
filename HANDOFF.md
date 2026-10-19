# Florilegium × Expo — handoff

_Written 2026-10-19 from the thread that built and shipped the web version.
Everything below is verified fact unless explicitly marked "proposed"._

## TL;DR

- The **web version is done, live, and fully tested** (Section 1). Don't break it.
- The **Expo rewrite scaffold already exists** at `C:\dev\florilegium-app` (Section 3). It has **no commits, no remote, no app code yet** — just the template.
- Next steps are in Section 4: commit → push to a new repo → build with a 4-way fan-out → verify.

---

## 1. The finished web app (reference + regression baseline)

| What | Where |
|---|---|
| Live site | https://danieldamilola.github.io/florilegium/ |
| Repo | https://github.com/danieldamilola/florilegium — `main` @ `1393d8d` |
| Source | `C:\dev\library\index.html` (single self-contained file, vanilla JS/CSS, no frameworks) |
| Tests | `C:\dev\library\tests\` (all green) |

Test commands (Windows PowerShell):

```powershell
$env:NODE_PATH='C:\Users\Daniel\AppData\Local\Temp\flori-tools\node_modules'
node tests/full-book.test.js                 # full-book reader invariants
node --test tests/e2e.test.js                # 25-case acceptance suite (stubbed network)
$env:FLORI_LIVE='1'; node --test tests/e2e.test.js   # same suite on the real network
$env:FLORI_URL='https://danieldamilola.github.io/florilegium/'; node tests/live-verify.js  # 10-check live gate
node tests/parser-fidelity.test.js           # 6 real Gutenberg books, chapter-detection report
node tests/perf.test.js                      # 4x CPU-throttle reader profile
```

Behaviors to port **exactly** (these were the user's explicit requirements):

- Preview = **exactly 3 paragraphs** + "End of preview" + CTA **"Read a little"**; daily hero CTA "Start reading".
- Reader must read the **entire book** — chapter mode when ≥3 headings, else 22-paragraph pages; only the current section in the DOM.
- Shelf persists; reading position (section index + scroll fraction) persists per book.
- Monochrome only, mobile-first, no color accents.

The web app's parser rules worth reusing in TS: `isHeading`, `headingIndices`, `cleanTitle`, `cleanBlocks`, `readerModel` in `index.html` (numbered story headings, epistolary "Letter from/to" exclusions, TOC run-collapse).

---

## 2. The rewrite: goal + stack decisions

Goal: same product, **one codebase → iOS + Android + Web** (Expo = React Native + React Native Web).
"Desktop" = the web build in a browser; native desktop binaries would need Electron/Tauri later — out of scope.

Decided stack:

| Piece | Decision |
|---|---|
| Shell | Expo SDK 58 + `expo-router` + TypeScript (already scaffolded) |
| State | `zustand` — no Redux, no Context soup |
| Persistence | `@react-native-async-storage/async-storage` (shelf ids + positions). SQLite is overkill |
| UI | Plain RN components + `StyleSheet`, monochrome theme ported from `index.html`. **No NativeBase.** Tamagui only if truly needed |
| Reader | `epub.js` in `react-native-webview` on native; `epub.js` directly on web; **fallback** to the ported plain-text pipeline when a book has no EPUB or EPUB fails |
| Data | Gutendex (keyless): `https://gutendex.com/books/` — random popular classics + topic filter (`?topic=`) |
| Fetch | Native: fetch Gutenberg EPUB/TXT **directly** (no CORS). Web build: direct fetch is CORS-blocked → use `r.jina.ai` proxy as fallback (what the web app does) |
| Distribution | Expo Go QR for device testing; later `npx expo export --platform web` for a public link (set `web.output` to `static` in `app.json` for plain static hosting — template says `server`); EAS + store accounts much later (Apple $99/yr) |

Rate-limit facts: Jina free tier ≈ 20 req/min/IP; Gutendex deep pages are slow/hang → bound every fetch, retry once, never cache failures.

---

## 3. Verified machine state (2026-10-19)

**Scaffold — `C:\dev\florilegium-app`:**

- Expo SDK `~58.0.14`, React Native `0.88.0`, React `19.3.0`, expo-router `~58.0.23`, TypeScript `~6.0.3`
- `node_modules/` installed; routes live under `src/app/`; typed routes + react compiler enabled in `app.json`
- **Git: branch `master`, zero commits, no remote**
- Template extras present (strip or repurpose): `AGENTS.md`, `scripts/reset-project.js`, example screens (`src/app/index.tsx`, `src/app/explore.tsx`), themed components, template assets (react-logo, expo-badge, etc.)

**Toolchain:**

- Node `v26.7.0`, npm `11.19.0`
- `gh` CLI `2.101.0`, authed as `danieldamilola` — can create/push the new repo
- Android: `C:\Android\Sdk` has `platform-tools` (adb), `build-tools`, `cmdline-tools`, `platforms`; **no emulator package / system image installed**, **no device attached**. Java 21 at `C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot`
  - Installable later via `sdkmanager` (~1–2 GB if an emulator is wanted)
  - Fastest real-device check: **Expo Go** on a phone on the same Wi-Fi (`npx expo start` → QR)
- Browser automation for web smoke tests: `puppeteer-core` at `C:\Users\Daniel\AppData\Local\Temp\flori-tools\node_modules` (use `$env:NODE_PATH`); Edge at `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`
- Node 26 quirk: `node --test tests/` fails; always name test files explicitly

---

## 4. Next actions

1. **Commit the scaffold**

   ```powershell
   cd C:\dev\florilegium-app
   git add -A
   git commit -m "Scaffold: Expo SDK 58 + expo-router + TypeScript"
   git branch -M main
   ```

2. **Create + push the repo**

   ```powershell
   gh repo create danieldamilola/florilegium-app --public --source . --remote origin --push
   ```

3. **Baseline verify**

   ```powershell
   npx tsc --noEmit
   npx expo export --platform web
   ```

4. **Build, with strict file ownership** (fan out via Orchestra; see Section 6).
   First create and commit the frozen shared contract files (types + theme tokens + store shape), then:

   | Worker | Owns |
   |---|---|
   | A — theme + store + shelf/settings | `src/theme/**`, `src/store/**`, `src/app/(tabs)/shelf*`, `src/app/settings*`, root layout |
   | B — data + discovery + preview | `src/data/**`, `src/app/(tabs)/index*`, `src/app/(tabs)/browse*`, `src/app/preview*` |
   | C — reader | `src/reader/**`, `src/app/reader*` |
   | D — tests + smoke harness | `tests/**`, `scripts/**` |

   Rules: everyone bases on `main`; only touches their own files plus their own `package.json` deps; commits on their branch; **never pushes**; reports commit hash.

5. **Verification ladder:** `tsc --noEmit` → Jest + React Native Testing Library → `expo export --platform web` → puppeteer smoke of the exported web build → Expo Go on a physical phone.

6. **Publish:** host the web export (GitHub Pages on the new repo) for a public link.

---

## 5. Non-negotiables from the original brief

- Monochrome only, mobile-first; no color accents; no slop.
- Preview: exactly 3 paragraphs, CTA "Read a little"; daily hero CTA "Start reading".
- Reader reaches the **true end of the book**; whole-book tests accumulate ≥40 distinct paragraphs across page turns.
- End-of-book detection must be **structural** — never a bare "the end" regex (real prose contains that phrase; see `tests/README.md`).
- Free/keyless sources only; public-domain texts only.
- Shelf + reading position persist across reloads (`{index, frac}` shape, forward-compatible like the web app's `florilegium.reader.v1`).

---

## 6. Orchestra notes (if continuing with distributed workers)

- Provider id: `acp-opencode`
- Working models: `opencode/deepseek-v4.1-flash-free`, `opencode/space-bunny-free`, `opencode/glm-5.3-flash-free`, `opencode/mimo-v2.6-flash-free`, `opencode/nemotron-3.5-super-vl-free`
- Avoid `opencode/beam-free` (fails provider auth)
- Workers get git worktrees of the **session's** repo — so the session's working directory must be `C:\dev\florilegium-app` for workers to target this project
- Match model to task difficulty; `high` effort for reader/epub integration; `medium` for theme port; keep one dedicated tester

---

## 7. Gotchas learned on the web build (avoid repeating)

- Gutenberg direct fetch is CORS-blocked in browsers → Jina proxy needed **for the web build only**.
- Jina 429s: serialize requests + backoff; **never cache failures**.
- Fail-safe chapter detection: run-collapse TOC-like heading runs; exclude epistolary "Letter from/to" captions; accept numbered story headings ("I. A SCANDAL IN BOHEMIA"). All implemented in `index.html`; port with the same tests.
- Bound every network call (the web app uses 14–22 s per attempt, 60 s load budget).

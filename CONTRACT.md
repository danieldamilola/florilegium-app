# Florilegium (Expo) — build contract

This file freezes everything parallel workers share. Do not change it without
the orchestrator's say-so. The web app at `C:\dev\library` is the **spec and
reference** — read it freely, never modify it.

## Product (non-negotiable)

- Monochrome only (paper/ink/wash tokens in `src/theme/tokens.ts`); mobile-first.
- Home: daily hero (quote + cover) + "For You" deck with Keep/Skip.
- Preview: **exactly 3 paragraphs**, "End of preview", CTA **"Read a little"** → opens the reader.
- Reader: reads the **whole book** — chapter mode when ≥3 headings, else 22-paragraph
  pages; only the current section rendered; Prev/Next; progress label;
  end-of-book card; position (section index + scroll fraction) persists per book.
- Shelf: saved books persist; deck never offers shelf books.
- Free/keyless sources only (Gutendex + Project Gutenberg). Public domain only.

## Frozen modules (already committed — use, don't re-port)

| File | Contents |
|---|---|
| `src/types/book.ts` | `Book`, `ShelfItem`, `ReaderModel`, `ReaderSection`, `ReaderSettings`, `ReaderPosition`, enums |
| `src/theme/tokens.ts` | `palette`, `radii`, `metrics`, `fonts`, `readerThemeColors`, `readerTokens`, `defaultReaderSettings` |
| `src/lib/parse.ts` | `cleanBlocks`, `isHeading`, `numberedTitle`, `headingIndices`, `cleanTitle`, `chaptersOf`, `isProse`, `proseParas`, `readerModel` — verbatim port of the web parser; treat as correct |

Porting reference for everything else: `C:\dev\library\index.html`
(`normBook`/Gutendex fetch ~L430–510, preview ~L1150–1230, reader ~L1290–1500,
theme CSS ~L14–30; tests in `C:\dev\library\tests\`).

## Routes (expo-router, `src/app/`)

| Path | Screen | Owner |
|---|---|---|
| `_layout.tsx` | root stack + fonts/splash | A |
| `(tabs)/_layout.tsx` | tab bar (monochrome) | A |
| `(tabs)/index` | Home: hero + deck | B |
| `(tabs)/browse` | categories + search entry | B |
| `(tabs)/shelf` | shelf list + filters | A |
| `(tabs)/profile` | settings / about / reset | A |
| `search` (modal) | search results | B |
| `preview` (modal, param `id`) | 3-para preview sheet | B |
| `reader` (param `id`) | full-book reader | C |

Navigation: `router.push({ pathname: '/preview', params: { id: String(book.id) } })`.

## Store API (Worker A implements; frozen signatures)

`src/store/` zustand stores, persisted with AsyncStorage under exactly:

- `florilegium.shelf.v1` → `useShelfStore`: `{ items: ShelfItem[]; add(b: Book): void; remove(id: number): void; has(id: number): boolean; hydrated: boolean }`
- `florilegium.settings.v1` → `useSettingsStore`: `{ settings: ReaderSettings; set(p: Partial<ReaderSettings>): void; hydrated: boolean }` (defaults from `defaultReaderSettings`)
- `florilegium.reader.v1` → `usePositionsStore`: `{ positions: Record<number, ReaderPosition>; get(id: number): ReaderPosition | null; set(id: number, p: ReaderPosition): void; hydrated: boolean }`

## Data API (Worker B implements; frozen signatures)

- `src/data/gutendex.ts`: `normBook(json): Book`, `fetchPopular(): Promise<Book[]>`,
  `fetchRandom(): Promise<Book[]>`, `fetchTopic(topic: string): Promise<{ count: number; books: Book[] }>`,
  `fetchSearch(q: string): Promise<{ count: number; books: Book[] }>` — Gutendex, keyless.
- `src/data/text.ts`: `getBookText(book: Book): Promise<string>` — full Gutenberg text.
  Native: fetch `book.textUrl` directly (no CORS). Web: direct fetch is CORS-blocked →
  fall back to `https://r.jina.ai/<textUrl>`. Bound every attempt (~22 s), overall
  budget ≤60 s, single-flight Jina queue + 429 backoff, in-memory LRU (6), never
  cache failures. Return the **raw** text; callers run `cleanBlocks`.

## Reader behaviour (Worker C)

Uses `getBookText` → `cleanBlocks` → `readerModel` (both frozen). Settings from
`useSettingsStore`; position from `usePositionsStore` (index + scroll `frac`,
restore both; write on nav and on scroll-end). Optional EPUB path (epub.js in
`react-native-webview` on native, directly on web) is allowed as a progressive
enhancement **only if** the text path ships first and remains the fallback.

## Ownership + deps

| Worker | Owns | May add deps |
|---|---|---|
| A | `src/theme/**` (tokens frozen), `src/store/**`, `src/app/_layout.tsx`, `(tabs)/_layout.tsx`, `(tabs)/shelf.tsx`, `(tabs)/profile.tsx`, `app.json` | `@react-native-async-storage/async-storage`, `zustand`, `@expo-google-fonts/newsreader`, `@expo-google-fonts/inter` |
| B | `src/data/**`, `(tabs)/index.tsx`, `(tabs)/browse.tsx`, `search.tsx`, `preview.tsx` | none expected (use `fetch`) |
| C | `src/reader/**`, `reader.tsx` | `react-native-webview`, `epubjs` (only if EPUB lands) |
| D | `tests/**`, `scripts/smoke-web.js`, jest config files | `jest-expo`, `jest`, `@testing-library/react-native` |

Rules: branch from `main`; touch **only** your files; add only **your** deps
(`npx expo install <pkg>` for RN packages) and run `npm install` after; never
edit another worker's files — report needed changes instead. Never push.

## Definition of done (each worker)

`npx tsc --noEmit` passes; your flow works when run (`npx expo start --web` for a
quick manual check); commit on your branch with a clear message; report: commit
hash, changed files, what you verified, known gaps.

## Verification ladder (orchestrator runs after merge)

1. `npx tsc --noEmit`
2. `npm test` (jest + RNTL — parser unit tests, preview-3-paras, reader model)
3. `npx expo export --platform web` then `node scripts/smoke-web.js` (puppeteer,
   loads the export over a local static server; checks home → preview → reader →
   ≥40 distinct paragraphs across page turns → end-of-book)
4. Expo Go on a physical phone (QR from `npx expo start`)

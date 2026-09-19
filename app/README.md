# Print Ledger — source

`../index.html` is **generated**. Do not edit it by hand; the next build overwrites it.

The app is a Vite + React + TypeScript + Tailwind v4 project that builds through
`vite-plugin-singlefile` into one self-contained HTML file, so deploying is still
"copy `index.html` anywhere and open it" — no server, no build step on the device.

## Working on it

```
npm install
npm run dev        # hot-reloading dev server
npm run typecheck  # tsc --noEmit (strict, no unused locals)
npm run build      # builds dist/index.html, then ships it to ../index.html
```

## Layout

```
src/domain/    business logic, no React
  types.ts     the shapes stored in localStorage and pushed to Firebase
  storage.ts   the localStorage key contract + one-time migrations
  pricing.ts   the quote maths
  bills.ts     bill <-> ledger reconciliation
  sync.ts      optional Firebase Realtime Database sync
  billImage.ts the canvas bill customers receive
  exportCsv.ts CSV export
src/state/     the store hook and the mood list
src/components/
  Mesh.tsx     the drifting aurora behind everything
  ui.tsx       the glass pane, inputs, toggles, buttons
  QuoteCard…   the dashboard cards
  *Panel.tsx   the overlays (ledger, bills, settings)
```

## Four CSS traps this codebase already hit

- **Put resets in `@layer base`.** Unlayered CSS outranks every Tailwind
  utility, so a bare `button { font: inherit; color: inherit }` silently beat
  `text-[13px]` and `text-acc-ink` on every button in the app.
- **Theme keys must be kebab-case.** `@theme { --color-accInk }` generates no
  utility at all — it has to be `--color-acc-ink` for `text-acc-ink` to exist.
- The aurora sits at `z-index: -10`, so the base colour lives on `html`. A
  painted `body` background would cover it, because block backgrounds paint
  after negative-z descendants.
- **Grid and flex children need `min-w-0`, and inputs need `size={1}`.** Both
  refuse to shrink below their content otherwise: a bare `<input>` carries a
  20-character intrinsic width that propped the whole quote column open at
  320px, and the cards overflowed their column by 18px without ever showing a
  scrollbar, because the page hides horizontal overflow.

## House rules the UI is held to

Checked mechanically before every ship (see the audit script notes below):

- **Zero em-dashes and en-dashes** in anything the user can see. Ranges take a
  hyphen (`A-Z`), a minus sign stays a minus sign (U+2212).
- **One middle dot per line** at most, in metadata strips.
- **No decorative status dots.** State is spelled out (an `Unpaid` pill) or not
  shown at all.
- **One radius scale**: panes 26px, overlays 30px, rows 20px, fields 16px,
  anything pressable is a full pill.
- **One accent per mood**, used everywhere. No stray second colour.
- **Type is inlined**, so the app renders in Outfit and Plus Jakarta Sans with
  no network. The only outbound request is the optional Firebase SDK.
- **Every animation has a reason** (hierarchy, feedback, or state change) and
  collapses under `prefers-reduced-motion`.

## Known deviations from the Web Interface Guidelines

Three rules are knowingly not followed. Do not "fix" them without reading this:

- **Ledger list is not virtualized.** It pages 40 at a time, so the DOM only
  passes 50 rows if the reader asks for more. Rows expand to variable heights,
  and a windowing library would put the keyboard and screen-reader behaviour at
  risk for a list that is realistically a few hundred entries.
- **Deletes confirm with Undo, not with a dialog.** Both delete paths raise a
  toast with a working Undo that also restores a bill's discounts. That is
  better than a modal for an action taken dozens of times a week.
- **Headings are sentence case, not Title Case.** The whole interface speaks in
  second person and plain sentences; Title Case would fight it.

## Things that must not change

- The keys in `src/domain/storage.ts`. Every device that has ever synced depends
  on them, and so does the Firebase payload.
- The field names on `Entry` and `Bill`, for the same reason.
- The quote order in `pricing.ts`: coupon comes off the marked-up total, a manual
  override replaces the result outright, a freebie zeroes it.

Sync is optional by design. If the Firebase CDN scripts fail to load — offline,
blocked, opened from a file — `sync.ts` degrades to local-only and nothing throws.

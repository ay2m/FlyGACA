# Writing a Guide

A practical, no-coding-required walkthrough for authoring a **guide page** on Fly GACA.

Guides are the short, plain-language explainers under **/guides** (e.g. "How to become a pilot in
Saudi Arabia"). This page is for the **content writer** and the **flight instructor** — you write
the words; a one-line command handles the wiring.

> Fly GACA is an **independent educational platform** — not affiliated with GACA. Guides help a
> reader find and understand the regulation; they never replace it. Always point the reader back to
> the official source, and cite the exact GACAR Part/section. The not-affiliated disclaimer is
> added to every guide **automatically** — you never write or reword it.

---

## 1. Who this is for

You don't need to be a developer. You do need to:

- write the guide in **both English and Arabic** (both are required — see step 4), and
- edit two text files where the words live.

Everything else — the page layout, the route, the disclaimer, the "on this page" menu — is handled
for you.

## 2. Create the guide (one command)

From the project folder, run:

```bash
npm run new:guide -- --slug night-currency-for-instructors \
  --title "Night currency for flight instructors" \
  --topic licensing --level intermediate
```

- **`--slug`** — the URL name, lower-case with hyphens (becomes `/guides/night-currency-for-instructors`).
- **`--title`** — the English title shown on the card and page heading.
- **`--topic`** — one of: `regulation`, `licensing`, `medical`, `language`, `airspace`, `weather`,
  `planning`, `operations`, `performance`.
- **`--level`** — one of: `beginner`, `intermediate`, `advanced`.

Add `--dry` to preview the changes without writing anything.

## 3. What that created

The command wires the guide in and seeds it as a **draft**:

- `src/pages/guides/guides.ts` — registers the slug, its topic/level, and `status: 'draft'`.
- `src/i18n/en.json` and `src/i18n/ar.json` — a content **skeleton** under `guides.items.<slug>`
  with every required field filled with `TODO (...)` placeholders.

Because it's a **draft**, the guide is **unlisted**: it won't show on the /guides index or in the
sitemap, but you (and reviewers) can open it directly at `/guides/<slug>` to preview — it shows a
**Draft** badge.

## 4. Fill in the content (both languages)

Open `src/i18n/en.json` and `src/i18n/ar.json`, find your guide under `guides` → `items` →
`<slug>`, and replace every `TODO (...)` with real text. The fields are:

| Field        | What to write                                                                 |
| ------------ | ----------------------------------------------------------------------------- |
| `name`       | The guide title.                                                              |
| `blurb`      | One sentence summarising the guide (shown on the index card).                 |
| `intro`      | One opening paragraph.                                                        |
| `sections`   | The body — a list of `{ "h": heading, "p": paragraph }` blocks. Add as many as you need. |
| `adel`       | A question a reader might ask **Captain Adel** about this topic (becomes a handy link). |
| `takeaways`  | A short list of key points.                                                   |

**Both `en.json` and `ar.json` must be filled in** — English in one, Arabic in the other, with the
same structure. (A built-in check fails the build if a guide is left half-written.)

## 5. Writing style

- **Plain text only** — no Markdown, bold, bullets, or links inside the prose. Keep sentences
  clear; use separate `sections` instead of in-text formatting.
- **Cite the regulation** — name the Part/section in the text, e.g. "GACAR Part 61" or "§61.57".
- **Educational, not authoritative** — remind the reader to confirm against the official GACA
  source. (The disclaimer block is added automatically.)

## 6. Optional extras (in `src/pages/guides/guides.ts`)

These make a guide richer but are not required:

- **`GUIDE_TOOLS`** — related calculator links (e.g. a night-flying guide → `/tools/sun-times`).
- **`GUIDE_REGS`** — GACAR Parts to show as "Regulations cited" chips (e.g. `['part-61']`).
- **`GUIDE_QUIZ`** — a quiz-bank id for the "Test yourself" link.

Each is a `'<slug>': ...` line you add alongside the existing entries. Ask a developer if unsure.

## 7. Check your work

```bash
npm run test
```

This runs the bilingual **parity** check and the **content-completeness** check. If something's
missing, the message tells you which guide and field. Then run the full gate before sharing:

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

## 8. Publish (draft → live)

When the guide is ready, open `src/pages/guides/guides.ts`, find your guide in **`GUIDE_STATUS`**,
and change `'draft'` to `'live'`:

```ts
'night-currency-for-instructors': 'live',
```

Now it appears on the /guides index and in the sitemap, and the Draft badge disappears.

## 9. Open a pull request

Commit your changes and open a PR. Reviewers can preview the draft on the PR's preview deployment
by visiting `/guides/<slug>` directly. You can flip it to `live` in the same PR or a follow-up.

---

_Reference: guides render from `src/pages/guides/Guide.tsx`; the registry is
`src/pages/guides/guides.ts`; content lives in `src/i18n/{en,ar}.json` under `guides.items`._

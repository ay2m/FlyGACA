---
name: design-taste-frontend
description: Use when designing or reviewing a new FlyGACA page, marketing section, or landing surface (content/guides, the home bento dashboard, pricing) to avoid generic "AI slop" layouts — before reaching for the obvious centered-hero-plus-three-cards default.
---

# Design Taste for FlyGACA Frontend

A checklist for catching generic, templated-looking output before it ships — not a new design system. FlyGACA already has one: **`FIGMA_DESIGN_SYSTEM.md`** and `src/styles/tokens.css` are the source of truth for color, type, and spacing. This skill governs *layout and composition judgment*, not tokens.

**Hard constraints this skill never overrides** (from `CLAUDE.md`):
- CSS Modules only, tokens via `src/styles/tokens.css` custom properties — never inline styles, never a hard-coded hex/px value that already has a token.
- `margin-inline` / `padding-inline`, never `margin-left/right` — every layout must mirror correctly under `dir="rtl"` (Arabic).
- All copy through i18n (`en.json` / `ar.json`) — no hard-coded strings, and Arabic runs longer/shorter than English, so a layout that only works at English text length is broken.
- Respect `prefers-reduced-motion` — see the gotcha in the `run-flygaca` skill about how axe scores mid-fade colour as a contrast failure; any new motion must settle before being considered "rendered".
- No new animation library. Motion here means CSS transitions/keyframes consistent with what's already in `src/styles/`, not GSAP or similar.

## Read the brief before designing

Before generating layout, state in one line what you're building and for whom: *"This is a \<pricing / guide / dashboard card / marketing section> for \<a prospective learner / an existing subscriber / a B2B admin>, and it needs to \<primary action>."* If that's ambiguous, ask one question — don't guess and generate.

## The anti-slop checklist

Generic AI-generated UI has a recognizable signature. Catch it before it ships:

- **Not every section is a centered hero over three equal-width cards.** If everything in the page has the same visual weight, nothing does — establish a real hierarchy (one dominant element per section, not three siblings).
- **No default purple/teal gradient glow "because it's AI."** FlyGACA's brand gradients (`--grad-brand`, `--grad-wing`) exist for a reason — use them deliberately (CTAs, wordmark hairlines), not as decorative filler.
- **No glassmorphism on everything.** A frosted-glass card is a specific choice for a specific surface (e.g. an overlay on the falcon-night dark canvas), not a default treatment for every panel.
- **Spacing should read as intentional, not templated.** Uniform 16px gaps everywhere is the tell. Use the fluid type/spacing scale in `tokens.css` to build real rhythm — tight where content is dense (the study/quiz surfaces), airy where it's a single message (a pricing headline).
- **Copy-driven layout, not lorem-ipsum shaped layout.** Real EN/AR copy is often a different length than a placeholder — design against the actual string lengths from `en.json`/`ar.json`, not a filler sentence that happens to wrap nicely.
- **Numbers and stats should mean something.** FlyGACA already animates stat cards up from zero (`<CountUp>`) — don't add a second, redundant motion treatment on top of it.

## What "good" looks like here

State one line before generating: *"Reading this as: \<page kind> for \<audience>, leaning toward \<existing FlyGACA pattern — e.g. the bento home dashboard, a calculator tool page, a study pack card>."* Then reach for an existing, working FlyGACA surface as the reference pattern rather than inventing a new visual language — consistency across ~300+ bilingual routes matters more here than novelty on any single page.

## Pre-ship checklist

- [ ] Every color/spacing/font value traces to a token in `tokens.css` — nothing hard-coded
- [ ] Hierarchy: one clear focal point per section, not three equal cards
- [ ] Checked at realistic EN and AR string lengths, in both `dir="ltr"` and `dir="rtl"`
- [ ] Motion (if any) respects `prefers-reduced-motion` and settles before being screenshotted/tested
- [ ] No new dependency introduced for something CSS already does
- [ ] Contrast checked against the token pair actually used (light and dark reading surfaces both exist — `--ivory` vs `--falcon-night`)

---
Adapted from [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) (`skills/taste-skill`, install name `design-taste-frontend`), MIT License, © 2026 Leonxlnx. This is a substantial trim of the upstream skill: the "three dials" (variance/motion/density) framework, GSAP code skeletons, and the catalog of alternate skill variants (brutalist/minimalist/soft/stitch/image-generation) were dropped as not applicable — FlyGACA has its own token system and motion conventions, and this skill defers to them rather than introducing a parallel one.

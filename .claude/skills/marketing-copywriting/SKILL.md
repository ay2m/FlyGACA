---
name: marketing-copywriting
description: Use when writing or improving FlyGACA marketing copy — pricing/billing pages, guide intros, landing sections, upgrade CTAs, hero/subheadline text. Use for headline help, CTA wording, or "this copy is weak/generic" requests. For SEO structure and metadata, use the flygaca-seo skill instead.
---

# Marketing Copywriting for FlyGACA

For conversion-focused marketing copy — not for regulatory/study content (that's `GUIDE_AUTHORING.md` and the `flygaca-content-seo`/`flygaca-corpus-pipeline` agents' territory) and not for SEO metadata/JSON-LD/sitemap structure (that's the `flygaca-seo` skill).

## Non-negotiable for this repo

- **Every string ships in both `en.json` and `ar.json`.** Never hand back English-only copy — draft the English, then either translate it yourself into aviation-appropriate Arabic or flag it explicitly for the `flygaca-i18n-arabic` agent. A "final" copy draft that only exists in one language isn't final.
- **No fabricated numbers or claims.** FlyGACA cites GACAR sections and is a regulatory-education product — invented statistics or testimonial-sounding lines erode exactly the credibility the product depends on. If a stat isn't in the codebase/corpus, don't write it in as if it were.
- **Copy lands in real components**, not a document — check how it will actually render (CSS Modules, existing hero/section components) rather than assuming unlimited space; Arabic and English differ in length for the same meaning.

## Before writing

1. **Page purpose** — pricing, a guide's intro paragraph, the home bento dashboard, an upgrade prompt in the study flow, an org/school landing section. What's the ONE action wanted?
2. **Audience** — a private pilot student prepping for a GACAR exam, a flight school admin evaluating the B2B seat product, or a subscriber deciding whether to renew. These are different readers with different objections.
3. **Proof points available** — what's actually true and checkable (exam pack coverage, calculator accuracy, AIRAC freshness), not invented social proof.

## Principles

- **Clarity over cleverness.** If a reader has to decode the line, it's already lost them — this matters more than usual for a bilingual, technical-subject-matter audience.
- **Benefits over features.** "Crosswind calculator" is a feature; "know your crosswind limit before you're at the hold-short line" is the benefit.
- **Specific over vague.** Not "master the regulations" — "cite the exact GACAR section for every exam question, not a paraphrase."
- **Customer language over company language.** Use the terms pilots and CFIs actually use, not internal names for calculators or packs.

## Style rules

1. Simple over complex — "use," not "utilize"
2. Active over passive — "Fly GACA tracks your currency," not "currency is tracked"
3. Confident over qualified — cut "almost," "very," "really"
4. Show over tell — describe the outcome, not an adverb describing it
5. No exclamation points, no unearned superlatives

## CTA copy

Weak (avoid): "Submit," "Learn More," "Click Here," bare "Sign Up."
Strong: name what they get — "Start Studying Free," "See Your Exam Readiness," "Add Your School's Seats."

Formula: **[Action verb] + [what they get] + [qualifier if needed]**

## Page-specific notes for this repo

- **Pricing/billing pages** (`flygaca-billing` territory): help the reader pick the right plan; make the recommended tier obvious; be explicit about what a free vs paid tier actually includes — no ambiguity that could read as dark-pattern upsell.
- **Guide intros**: connect the regulatory topic to a concrete pilot decision before diving into GACAR citations — the hook is "why this matters in the cockpit," the body is the citation.
- **B2B/school landing copy** (`flygaca-b2b-org` territory): the buyer is an admin, not a student — lead with seat management, cohort readiness reporting, not individual study features.

## Output format

Provide the EN copy by section (headline / subheadline / CTA / body), the AR counterpart or an explicit translation flag, and 2 alternatives for the headline and CTA with a one-line rationale each.

---
Adapted from [coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) (`skills/copywriting`), MIT License, © 2025 Corey Haines. Trimmed from the upstream general-purpose version: dropped the generic page-structure/section-framework reference tables and cross-links to sibling skills (cro, popups, ab-testing, emails) that don't exist in this repo, and added the bilingual (EN/AR) and no-fabricated-claims requirements that are specific to FlyGACA.

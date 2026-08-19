# AIP Exam Prep — Curriculum & Content Map

> **Not affiliated with GACA.** This curriculum trains candidates to *navigate and study* the
> Saudi AIP and the underlying ICAO framework. It is preparation, not the official exam or the
> official eAIP. Every module points at a cited source in the corpus so candidates learn to
> verify.

This is the syllabus a B2B seat works through. It maps 1:1 to material already live in the app,
so a cohort consumes real product — no bespoke content required for the MVP.

## Learning outcomes

By the end, a candidate can:

1. Explain what an AIP is and its basis in **ICAO Annex 15** (Aeronautical Information Services).
2. Navigate the three-part **GEN / ENR / AD** structure and locate a given datum quickly.
3. Explain the **AIRAC** 28-day cycle and why amendments are effective on fixed dates.
4. Distinguish **AIP · AIP Amendment · AIP Supplement · NOTAM · AIC** and when each is used.
5. Read the Saudi eAIP GEN/ENR sections and answer scenario questions about KSA airspace.
6. Pass the in-app **Mock Exam** at the org's readiness threshold, with citations understood.

## Delivery format per seat

- **Bilingual** throughout: English (LTR) and Arabic (RTL, Amiri Naskh) — the seat picks either.
- **Study sheet** (PDF, 11 pages) for offline/print revision.
- **Question bank** with explanations + Part/section citations for every item.
- **Captain Adel** RAG assistant for "where in the AIP does it say…" questions, always cited.
- **Mock Exam** for readiness scoring.

## Module map (→ in-app assets)

The `aip` prep pack (`src/lib/prepCatalog.ts`) already bundles these; the curriculum
just sequences them.

### Module 0 — Orientation (0.5 h)
- What Fly GACA is and is not (the disclaimer, verifying against the official eAIP).
- How to use the pack: study sheet → reading → bank → Mock Exam loop.

### Module 1 — What the AIP is (Annex 15 foundations) (1 h)
- AIP definition, purpose, Annex 15 basis; the AIS "integrated aeronautical information package".
- AIRAC cycle (28 days), amendments vs. supplements, NOTAM, AIC.
- **Assets:** study sheet pp. 1–3 · AIM reader (`aeronautical-information-manual-aim`) · bank
  `aip-ais` (AIP structure, NOTAM, AIRAC items).

### Module 2 — GEN (General) (1 h)
- National rules & requirements, tables & codes, units of measurement, holidays, entry/transit.
- **Assets:** eAIP `saudi-aip-gen-2-1`, `gen-2-2`, `gen-3-3`, `gen-3-4` · study sheet GEN page.

### Module 3 — ENR (En-route) (1.5 h)
- Airspace classification, ATS routes, holding/approach/departure general, radio nav aids,
  KSA airspace specifics.
- **Assets:** eAIP `saudi-aip-enr-1-1`, `enr-1-2`, `enr-1-4`, `enr-1-6` · banks `aip-ais` +
  `airspace` · study sheet ENR page.

### Module 4 — AD (Aerodromes) (1 h)
- Aerodrome data: runways, frequencies, services, charts; where AD data lives vs. GEN/ENR.
- **Assets:** study sheet AD page · `aip-ais` AD items.

### Module 5 — Exam focus & readiness (1 h)
- Key-facts revision page; high-yield distinctions (which section holds which datum).
- **Full Mock Exam** across `aip-ais` + `airspace`; review misses against citations; repeat to
  threshold.
- **Assets:** study sheet exam-focus page · `MockExam.tsx` (combined pack quiz).

> Total guided time ≈ **6 hours** of content + self-paced repetition. A typical cohort runs it
> over **2–3 weeks** with the Mock Exam gating "ready".

## Assessment & readiness

- **Formative:** per-bank quizzes with instant cited explanations (unlimited attempts).
- **Summative:** Mock Exam; org sets the pass threshold (default 75%).
- **"Ready" flag:** a seat is *ready* when it has (a) covered every module's bank and (b) hit
  the threshold on the Mock Exam at least once. This flag is what the readiness report rolls up.

## Content provenance

All items are drawn from the corpus and cited to Part/section (ICAO Annex 15 · Saudi eAIP
GEN/ENR/AD · Aeronautical Information Manual). The study-sheet source of truth is
`scripts/build-aip-study-sheet.mjs`; the question bank lives in `public/data/quiz.json`
(`aip-ais`, `airspace`). Candidates are told throughout to confirm anything operational against
the current official eAIP, because AIP content changes on the AIRAC cycle.

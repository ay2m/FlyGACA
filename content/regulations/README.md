<div align="center">

# 📖 Regulatory Markdown Corpus & AST Compiler
### Authoring Source-of-Truth, Linting & Compilation for 74 GACAR Parts
#### المصدر المرجعي للوائح الطيران المدني السعودي · المترجم الهيكلي · التحقق الآلي

<p align="center">
  <img src="https://img.shields.io/badge/Made%20in-Saudi%20Arabia-006C35?style=for-the-badge&labelColor=0a0e12" alt="صنع في السعودية" />
  <img src="https://img.shields.io/badge/GACAR-74%20Parts-0D96F6?style=for-the-badge&labelColor=0a0e12" alt="74 Parts" />
  <img src="https://img.shields.io/badge/Format-Markdown%20AST-8E75B2?style=for-the-badge&labelColor=0a0e12" alt="Markdown AST" />
  <img src="https://img.shields.io/badge/Lookup-Sub--Millisecond-006C35?style=for-the-badge&labelColor=0a0e12" alt="Fast Lookup" />
</p>

</div>

---

## 🧭 Purpose & Architecture

This directory serves as the **authoring source-of-truth** for Fly GACA's complete regulatory library. Each GACAR Part is maintained as a clean, version-controlled Markdown file (`part-<n>.md`).

An automated AST compilation pipeline parses these files, extracts internal cross-references, validates regulatory citations against the canonical index (`public/data/gacar-index.json`), and generates an optimized JSON lookup table (`public/data/regulations-lookup.json`) for instant client-side rendering.

```
┌────────────────────────────────────────────────────────┐
│            content/regulations/part-*.md               │
│               (Authoring Source-of-Truth)              │
└───────────────────────────┬────────────────────────────┘
                            │ npm run parse:regulations
                            ▼
┌────────────────────────────────────────────────────────┐
│             AST Markdown Parser & Cross-Ref Extractor  │
│   • Validates frontmatter & slug consistency           │
│   • Extracts § section anchors (e.g. § 91.155)         │
│   • Resolves cross-part links against gacar-index.json │
└───────────────────────────┬────────────────────────────┘
                            │ Emits
                            ▼
┌────────────────────────────────────────────────────────┐
│          public/data/regulations-lookup.json           │
│         (Sub-millisecond frontend search & anchors)    │
└────────────────────────────────────────────────────────┘
```

---

## 📋 Frontmatter Specification

Every Part markdown file must start with a strictly validated YAML frontmatter header:

```yaml
---
part: '91'                 # String representation of Part number
partNum: 91                # Integer used for sorting and numeric lookup
title: General Operating and Flight Rules
category: airspace         # Regulatory category matching gacar-index.json
slug: part-91              # Must match filename stem exactly
---
```

---

## 🔗 Cross-Referencing Syntax & Rules

1. **Prose Part References:** Referenced automatically in text (e.g. `"... complies with Part 121 requirements ..."`).
2. **Explicit Markdown Links:** Relative links to sibling files (e.g. `[Part 121](./part-121.md)`).
3. **Section Number Anchors:** Extracted automatically via regex pattern `§\s*(\d+\.\d+)` (e.g. `§ 91.205`).

All referenced Parts must exist in the canonical GACAR registry. Typos or non-existent Parts (e.g. `Part 999`) will fail compilation.

---

## ⚡ Local Validation & Compilation Commands

```bash
# 1. Lint markdown files for style and formatting
npm run lint:md

# 2. Compile and validate cross-references to regulations-lookup.json
npm run parse:regulations

# 3. Optional: Upsert embeddings to Supabase pgvector
npm run embeddings:upsert
```

---

<div align="center">

<sub>🇸🇦 صنع في السعودية · Made in Saudi Arabia</sub>

</div>

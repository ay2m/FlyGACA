<div align="center">

<img src="public/img/flygaca-mark.png" alt="Fly GACA Logo" width="128" />

# ✈️ Fly GACA
### The Independent Flight Deck for Saudi Civil Aviation
#### مكتبة الطيران المدني السعودي · أدوات الطيران · أكاديمية التدريب

<p align="center">
  <img src="https://img.shields.io/badge/Made%20in-Saudi%20Arabia-006C35?style=for-the-badge&labelColor=0a0e12" alt="صنع في السعودية" />
  <a href="https://github.com/ay2m/FlyGACA/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/ay2m/FlyGACA/ci.yml?branch=main&style=for-the-badge&label=CI&labelColor=0a0e12&color=006C35" alt="CI status" /></a>
  <img src="https://img.shields.io/badge/tests-2%2C392%20passing-C8A04A?style=for-the-badge&labelColor=0a0e12" alt="2,392 tests" />
  <img src="https://img.shields.io/badge/bundle-146.8%20kB%20gz-0D96F6?style=for-the-badge&labelColor=0a0e12" alt="146.8 kB gzipped" />
  <img src="https://img.shields.io/badge/i18n-EN%20%E2%87%84%20AR-8E75B2?style=for-the-badge&labelColor=0a0e12" alt="English and Arabic" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-2D6E8A?style=for-the-badge&labelColor=0a0e12" alt="MIT" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white&labelColor=0a0e12" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=flat-square&logo=vite&logoColor=white&labelColor=0a0e12" alt="Vite 8" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript&logoColor=white&labelColor=0a0e12" alt="TypeScript strict" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=flat-square&logo=tailwindcss&logoColor=white&labelColor=0a0e12" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express&logoColor=white&labelColor=0a0e12" alt="Express 5" />
  <img src="https://img.shields.io/badge/Gemini-Genkit-8E75B2?style=flat-square&logo=googlegemini&logoColor=white&labelColor=0a0e12" alt="Gemini AI" />
</p>

[**🌐 Live Application (flygaca.com)**](https://flygaca.com) · [**🤖 Ask Captain Adel**](https://flygaca.com/chat) · [**📚 Regulatory Library**](https://flygaca.com/library) · [**🧮 55+ Flight Tools**](https://flygaca.com/tools)

</div>

---

> [!IMPORTANT]
> **Fly GACA is not affiliated with GACA.** It helps you *find, study, and calculate* regulations — it never replaces the official source. Every AI response and study guide cites the exact GACAR Part and section number. **Always verify against official publications at [gaca.gov.sa](https://gaca.gov.sa).**

---

## 🌟 Key Capabilities

<div align="center">

```
┌───────────────────────────────────────┬───────────────────────────────────────┐
│ 📚 74 GACAR Parts & 211 Ref Documents │ 🤖 Captain Adel AI Flight Instructor  │
│ Deep-linkable down to the section     │ Grounded RAG with exact GACAR cites   │
├───────────────────────────────────────┼───────────────────────────────────────┤
│ 🧮 55+ Pure Flight Calculators        │ 🌤️ Real-Time NOAA Saudi Weather Feed  │
│ Crosswind, TAS, Density Alt, W&B, TSD │ 61 Saudi aerodromes (OE** METAR/TAF)  │
├───────────────────────────────────────┼───────────────────────────────────────┤
│ 🎓 Part 141 Ground School & Exams     │ 📱 iPadOS Cockpit EFB Mode            │
│ 1,000+ questions across 26 banks      │ Red-light night vision & Zulu toolbar │
└───────────────────────────────────────┴───────────────────────────────────────┘
```

</div>

### ✨ Feature Highlights

- **📖 Complete Open GACAR Corpus:** 74 GACAR Parts and 211 official advisory circulars and manuals, indexed with client-side full-text search and permanent URL anchors (e.g. `/library/gacar-part-91#91.155`).
- **🤖 Captain Adel RAG Assistant:** An AI tutor with strict *cite-or-refuse* discipline. Arabic queries route to in-Kingdom models (ALLaM) while English queries use Gemini with sub-second streaming.
- **🛩️ Flight Operations Calculators:** 55 URL-state encoded tools for crosswind resolver, weight & balance CG envelope, fuel burn & reserve compliance (§91.151), and density altitude.
- **🛂 Foreign License Conversion Wizard:** 5-step interactive pathway calculator converting FAA, EASA, or ICAO pilot certificates to Saudi GACA PPL/CPL/ATPL under Part 61.
- **🏫 Flight Academy Admin Portal:** Real-time cohort health tracking, weak-area analytics by GACAR subject, and stage-check readiness for Part 141 approved training organizations (ATOs).
- **🧾 ZATCA Phase 2 E-Invoicing:** Production-ready UBL 2.1 XML generation with SHA-256 canonical hashing and TLV QR code encoding for Saudi flight school B2B billing.

---

## ⚡ Quickstart

### Prerequisites
- **Node.js ≥ 20.x**
- **npm ≥ 10.x**

### 1. Clone & Install
```bash
git clone https://github.com/ay2m/FlyGACA.git
cd FlyGACA
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
# Add your GEMINI_API_KEY (optional for local mock mode)
```

### 3. Launch Development Server
```bash
npm run dev
# 🚀 Web App running at http://localhost:5173
```

---

## 🧪 Testing & Quality Gates

Fly GACA enforces strict quality gates across both frontend and backend:

```bash
# Run unit & integration test suite (2,392 tests)
npm test

# Run build with static prerender & JSON-LD validation
npm run build

# Run production Playwright full-body prerender (703 sitemap URLs)
npm run build:deploy

# Run AI visibility & bot audit
npm run audit:ai
```

---

## 📂 Project Structure

```
FlyGACA/
├── 📁 src/
│   ├── 📁 components/     # UI components (BentoCard, CockpitToolbar, etc.)
│   ├── 📁 calc/           # 55 pure TypeScript aviation calculation modules
│   ├── 📁 i18n/           # Bilingual translations (en.json & ar.json)
│   ├── 📁 lib/            # SEO helpers, JSON-LD builders, backend services
│   └── 📁 pages/          # 30+ application routes (Library, Tools, Chat, Ground School)
├── 📁 server/             # Express API backend, auth & billing services
├── 📁 public/             # Static assets, manifests, and llms.txt
├── 📁 scripts/            # Prerendering, sitemap generation, and validation scripts
└── 📁 tests/              # 232 test suites covering parity, math, and accessibility
```

---

## 🛡️ License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

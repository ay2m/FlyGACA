<div align="center">

# ✈️ **Fly GACA**
> *The modern flight intelligence platform for Saudi civil aviation*

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/STATUS-🚀_LIVE-00ff88?style=for-the-badge&labelColor=0a0e12&fontColor=ffffff">
  <img alt="Status: Live" src="https://img.shields.io/badge/STATUS-🚀_LIVE-006C35?style=for-the-badge&labelColor=0a0e12">
</picture>

**Web App** · **Express Backend** · **55+ Flight Tools** · **AI Flight Instructor** · **GACAR Library**

</div>

---

## 🎯 What's this?

Fly GACA is the **all-in-one flight platform** built for Saudi civil aviation. We combine:
- 📚 **Deep GACAR regulatory knowledge** (74 Parts, 211 reference docs)
- 🤖 **AI flight instructor** with grounded, cite-or-refuse responses  
- 🧮 **55+ pure calculators** (crosswind, TAS, W&B, density alt, and more)
- 🎓 **1000+ exam questions** across 26 banks
- 🌤️ **Live weather feeds** (61 Saudi aerodromes)
- 📱 **Bilingual native apps** (iOS, soon iPadOS)

**Not affiliated with GACA.** We help pilots *study, calculate, and master* regulations—[gaca.gov.sa](https://gaca.gov.sa) is always the source of truth.

---

## ⚡ Get Started in 30 Seconds

### 1️⃣ Clone & Install
```bash
git clone https://github.com/ay2m/FlyGACA.git
cd FlyGACA && npm install
```

### 2️⃣ Set Up Environment
```bash
cp .env.example .env.local
# Add GEMINI_API_KEY (optional—works in mock mode without it)
```

### 3️⃣ Launch
```bash
npm run dev
# 🚀 Opens at http://localhost:5173
```

**That's it.** Full app, full offline functionality.

---

## 🌟 Platform at a Glance

<table>
<tr>
<td>

### 📚 Regulatory Core
- 74 GACAR Parts indexed
- 211 reference documents
- Deep-linkable to section level
- Always cite official sources

</td>
<td>

### 🤖 Captain Adel AI
- Grounded RAG pipeline
- English + Arabic
- Never hallucinate regulations
- Exact GACAR citations

</td>
</tr>
<tr>
<td>

### 🧮 Pure Flight Calculators
- Aerodynamics (TAS, CAS, Mach)
- Wind & navigation
- Weight & balance (CG envelope)
- Fuel planning & reserves
- Performance & takeoff/landing

</td>
<td>

### 🌤️ Real-Time Weather
- Live NOAA Saudi feed
- METAR/TAF decoder
- 61 Saudi aerodromes
- VFR/MVFR/IFR categories

</td>
</tr>
</table>

---

## 🛠 Tech Stack (2027 Edition)

| Layer | Tech | Why |
|-------|------|-----|
| **Frontend** | React 19 + Vite | Blazing fast, strict TypeScript, RTL-native |
| **Backend** | Express 5 | Cloud Run ready, minimal overhead |
| **Database** | PostgreSQL | Forward-only migrations, PDPL-safe |
| **AI** | Gemini + ALLaM | Multi-provider, grounded retrieval |
| **i18n** | EN + AR | Bilingual from the ground up |
| **Style** | CSS Modules + tokens | Design system coherence, no drift |

---

## 📊 Live Stats

```
✅ 2,392+ passing tests
✅ 146.8 kB gzipped (bundle)
✅ 74 GACAR Parts indexed
✅ 1,000+ questions banks
✅ 55+ flight calculators
✅ 61 Saudi aerodromes
✅ 100% offline capable (mobile)
```

---

## 🚀 Key Features

### **🎓 Part 141 Ground School**
Study packs aligned to Saudi curriculum. Mock exams, flashcards, spaced repetition SRS (Leitner system). Track mastery across all modules.

### **🧮 Mathematically Verified Calculators**
Every algorithm tested against web vectors. URL-state encoding = shareable calculations. No rounding errors, no surprises.

### **🌍 Multi-Provider AI**
- English: Gemini 2.5 Flash
- Arabic: ALLaM (in-Kingdom) or Gemini (fallback)
- Hybrid dense + lexical (BM25) retrieval
- Exact section citations or explicit refusal

### **📱 Native iOS Family**
ELPT, AIP shipping. App Group sync (streaks, SRS, study progress). Offline-first, 100% no internet needed.

### **🛡️ PDPL Compliant**
- Data residency: Saudi Arabia only (`me-central2`)
- No PII logging
- Immutable audit trail
- Right-to-be-forgotten implemented

---

## 🏗 Project Structure

```
FlyGACA/
├── src/                    # React 19 SPA (Vite)
│   ├── components/         # Reusable UI blocks
│   ├── pages/              # Route-based views
│   ├── lib/                # Flight calc engines
│   └── i18n/               # Bilingual strings
├── server/                 # Express API
│   ├── routes/             # RESTful endpoints
│   ├── middleware/         # Auth, CORS, etc
│   └── brain/              # AI orchestration
├── migrations/             # PostgreSQL schemas (forward-only)
├── corpus/                 # GACAR indexing pipelines
└── tests/                  # Vitest + Playwright e2e
```

---

## 📖 Full Documentation

- **[CLAUDE.md](./CLAUDE.md)** — For AI contributors
- **[ROADMAP.md](./ROADMAP.md)** — What's next
- **[docs/](./docs/)** — Runbooks, architecture, deployment
- **[.github/workflows/](./github/workflows/)** — CI/CD gates

---

## 💻 Commands You'll Love

```bash
# 🧪 Tests & Quality
npm run lint              # ESLint + TypeScript strict
npm run typecheck         # Full type audit
npm test                  # Vitest suite (2,392 tests)
npm run test:watch        # Live test mode
npm run test:e2e          # Playwright end-to-end
npm run verify            # Pre-flight bundle check

# 🚀 Development
npm run dev               # Vite dev server + API mock
npm run dev:api           # API on :3000, app on :5173
npm run dev:db            # Start local PostgreSQL

# 📦 Build & Deploy
npm run build             # Production bundle
npm run build:api         # API bundle (Cloud Run)
npm run preview           # Test production build locally

# 🧮 Flight Tools
npm run tools:test        # Calculator test vectors
npm run tools:bundle      # Verify calc bundle size
```

---

## 🌐 Live Links

🔗 **[flygaca.com](https://flygaca.com)** — Web app  
🔗 **[ask.flygaca.com](https://ask.flygaca.com)** — Captain Adel AI  
🔗 **[App Store](https://apps.apple.com/sa/app/fly-gaca/...)** — iOS apps (ELPT, AIP)  

---

## 🧑‍💻 Contributing

We welcome pilots, engineers, designers, and educators.

1. **Fork** the repo
2. **Create** a feature branch (`git checkout -b feat/my-feature`)
3. **Test** thoroughly (`npm test`)
4. **Push** and open a **Pull Request**

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## 📜 License

MIT © BDA Company International, operating as Fly GACA

---

<div align="center">

**Built for pilots. Grounded in regulations. Powered by AI.**

[Report an Issue](https://github.com/ay2m/FlyGACA/issues) · [Star us ⭐](https://github.com/ay2m/FlyGACA) · [Follow us on 𝕏](https://x.com/flygaca)

</div>

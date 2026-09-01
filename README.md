<div align="center">

<img src="public/img/flygaca-mark.png" alt="Fly GACA Logo" width="128" />

# ✈️ Fly GACA
### The Independent Web Platform & Flight Deck for Saudi Civil Aviation
#### مكتبة الطيران المدني السعودي · أدوات الطيران · أكاديمية التدريب · الفوترة الإلكترونية

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

[**🌐 Live Application (flygaca.com)**](https://flygaca.com) · [**🤖 Ask Captain Adel**](https://flygaca.com/chat) · [**📚 Regulatory Library**](https://flygaca.com/library) · [**🧮 55+ Flight Tools**](https://flygaca.com/tools) · [**🎓 Ground School**](https://flygaca.com/study)

</div>

---

> [!IMPORTANT]
> **Independent Educational Platform.** Fly GACA is an independent platform and is not affiliated with or endorsed by the General Authority of Civil Aviation (GACA). It helps pilots, students, and dispatchers *find, study, and calculate* regulations — it never replaces the official source. Every AI response and study guide cites the exact GACAR Part and section number. **Always verify flight operations against official publications at [gaca.gov.sa](https://gaca.gov.sa).**

---

## 🌟 Platform Capabilities

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
├───────────────────────────────────────┼───────────────────────────────────────┤
│ 🏫 Flight School B2B Portal           │ 🧾 ZATCA Phase 2 E-Invoicing          │
│ Cohort readiness & analytics tracking │ UBL 2.1 XML, SHA-256 hash & TLV QR    │
└───────────────────────────────────────┴───────────────────────────────────────┘
```

---

## 🧮 Comprehensive Aviation Calculators (55+ Pure Tools)

All calculators are implemented in pure, mathematically verified TypeScript with zero runtime side effects and URL-state encoding:

1. **Aerodynamics & Atmosphere:** Pressure Altitude, Density Altitude, True Airspeed (TAS), Calibrated Airspeed (CAS), Mach Number, International Standard Atmosphere (ISA) Deviations.
2. **Wind & Navigation:** Crosswind and Headwind/Tailwind Resolver, Wind Correction Angle, Ground Speed, Heading & Track, Great Circle Distance, Magnetic Variation.
3. **Weight & Balance:** Center of Gravity (CG) Envelope Visualizer, Station Arm & Moment Calculator, Forward/Aft Limit Warnings, Fuel Burn CG Shift.
4. **Performance & Fuel Planning:** GACAR §91.151 Day/Night Fuel Reserves, Climb/Descent Gradient, Top of Descent (TOD), Rate of Turn & Radius, Hydroplaning Speed.
5. **Regulatory Compliance:** Foreign License Conversion Pathway Calculator (Part 61), Pilot Flight Duty Time Limitations (Part 121/135), Oxygen Requirements (§91.211).

---

## ⚡ Quickstart & Local Setup

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

## 📂 Architecture & Directory Structure

```
FlyGACA/
├── 📁 src/
│   ├── 📁 components/     # UI components (BentoCard, CockpitToolbar, Nav, Footer)
│   ├── 📁 calc/           # 55 pure TypeScript aviation calculation modules
│   ├── 📁 i18n/           # Bilingual translations (en.json & ar.json)
│   ├── 📁 lib/            # SEO helpers, JSON-LD builders, backend API services
│   └── 📁 pages/          # 30+ application routes (Library, Tools, Chat, Ground School)
├── 📁 server/             # Express API backend, auth & ZATCA billing services
├── 📁 public/             # Static assets, manifests, and llms.txt
├── 📁 content/            # Regulatory Markdown corpus (74 GACAR Parts)
├── 📁 scripts/            # Prerendering, sitemap generation, and validation scripts
└── 📁 tests/              # 232 test suites covering parity, math, and accessibility
```

---

## 🛡️ License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

---

<div align="center">

<sub>🇸🇦 صنع في السعودية · Made in Saudi Arabia</sub>

</div>

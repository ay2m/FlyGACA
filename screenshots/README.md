<div align="center">

# 📸 FlyGACA iOS App Screenshots & Asset Pipeline
### High-Resolution Automated Screen Capture, Device Framing & App Store Assets
#### خط إنتاج لقطات الشاشة للتطبيق · الأجهزة المدعومة · متطلبات متجر التطبيقات

<p align="center">
  <img src="https://img.shields.io/badge/Made%20in-Saudi%20Arabia-006C35?style=for-the-badge&labelColor=0a0e12" alt="صنع في السعودية" />
  <img src="https://img.shields.io/badge/Devices-iPhone%20%26%20iPad%20Pro-0D96F6?style=for-the-badge&labelColor=0a0e12" alt="Devices" />
  <img src="https://img.shields.io/badge/Theme-Falcon%20Palette-C8A04A?style=for-the-badge&labelColor=0a0e12" alt="Falcon Theme" />
  <img src="https://img.shields.io/badge/Automation-Capacitor%20%26%20XCTest-8E75B2?style=for-the-badge&labelColor=0a0e12" alt="Automation" />
</p>

</div>

---

## 🧭 Overview & Toolchains

This directory manages the promotional, marketing, and App Store screenshot assets for the Fly GACA iOS ecosystem.

Two primary capture pathways exist:
1. **Capacitor 8 iOS Simulator Automation:** Captures live screens directly from the integrated web-to-native shell.
2. **Mac-Free Headless HTML Renderer:** Uses Playwright and Chromium to rasterize pixel-exact Falcon UI screens in CI environments without macOS hardware.

---

## ⚡ Screenshot Capture Workflows

### Option A: Capacitor iOS Simulator Automation
```bash
# 1. Sync latest build to the iOS shell
npm run cap:sync

# 2. Boot iOS Simulator
xcrun simctl boot "iPhone 16 Pro"

# 3. Open project & capture
npm run cap:open
xcrun simctl io booted screenshot screenshots/raw/iPhone16Pro/01-home.png
```

### Option B: Automated XCTest UI Automation
```bash
cd apple
xcodebuild test \
  -scheme FlyGACA \
  -configuration Debug \
  -testPlan Screenshots \
  -derivedDataPath build/
```

---

## 📐 Device & Resolution Specifications

| Device Type | Viewport Size | Native Capture Resolution | Target App Store Dimensions |
|:---|:---|:---|:---|
| **iPhone 6.7" / 6.9" Display** | 390 × 844 pt | 1179 × 2556 px | 1290 × 2796 px (or 1170 × 2532 px) |
| **iPad Pro 12.9" / 13" Display**| 1024 × 1366 pt| 2048 × 2732 px | 2048 × 2732 px (Portrait & Landscape)|

---

## 🎨 Falcon Design Palette

- **Primary Teal:** `#2D6E8A`
- **Gold Accent:** `#C8A04A`
- **Success Sage:** `#8FC9A8`
- **Night Dark Background:** `#0A0E12`

---

<div align="center">

<sub>🇸🇦 صنع في السعودية · Made in Saudi Arabia</sub>

</div>

# FlyGACA iOS App Screenshot Guide

This document outlines the complete workflow for capturing, processing, and publishing marketing screenshots for the FlyGACA iOS app family.

## Quick Start

```bash
# Generate Xcode project
npm run ios:generate

# Capture all screenshots (requires macOS + Xcode)
npm run screenshots:capture

# View screenshot documentation
npm run screenshots:help
```

## What's Included

### 📸 Automated Capture System
- **`apple/Scripts/capture-screenshots.sh`** — Shell script to boot simulators, install app, and capture screenshots
- **`apple/AppleTests/ScreenshotTests.swift`** — XCTest UI testing framework for programmatic screenshot capture
- **`apple/Scripts/process-screenshots.sh`** — Post-processing: add device frames, optimize for App Store

### 📁 Screenshot Organization
- **`screenshots/raw/`** — Original simulator captures organized by device/orientation
  - `iPhone15Pro/portrait/` — iPhone portrait screenshots
  - `iPhone15Pro/landscape/` — iPhone landscape screenshots
  - `iPadPro/portrait/` — iPad portrait screenshots
  - `iPadPro/landscape/` — iPad landscape screenshots
- **`screenshots/device-frames/`** — (Optional) Marketing-ready screenshots with device bezels
- **`screenshots/INDEX.md`** — Detailed inventory of all screenshots
- **`screenshots/README.md`** — Complete user guide and troubleshooting

### 📦 NPM Scripts
Added to `package.json`:
- `npm run screenshots:capture` — Automate screenshot capture from simulators
- `npm run screenshots:process` — Add device frames and optimize
- `npm run screenshots:help` — View full README documentation

## Screenshot Inventory

**22 total screenshots** covering:

| Feature | Device | Orientations | Count |
|---------|--------|---------------|-------|
| Home Screen | iPhone, iPad | Portrait, Landscape | 3 |
| Quiz (Banks) | iPhone, iPad | Portrait | 2 |
| Quiz (Question) | iPhone, iPad | Portrait, Landscape | 4 |
| Quiz (Results) | iPhone, iPad | Portrait | 2 |
| Flashcards | iPhone, iPad | Portrait | 4 |
| Mock Exam | iPhone, iPad | Portrait | 2 |
| Timed Exam | iPhone, iPad | Portrait, Landscape | 4 |
| Lessons | iPhone, iPad | Portrait | 2 |
| App Family | iPhone, iPad | Portrait | 2 |

## Capture Methods

### Method 1: Automated Script (Recommended)

Fastest approach. Handles everything: simulator boot, install, capture, cleanup.

```bash
npm run screenshots:capture
```

**What it does:**
1. Generates Xcode project with XcodeGen
2. Builds app for iPhone & iPad simulators
3. Boots simulators
4. Installs app
5. Launches app and waits for stable state
6. Captures all key screens
7. Rotates to landscape and captures
8. Cleans up (terminates app, shuts down simulators)

**Requirements:**
- macOS 13+
- Xcode 16+
- `brew install xcodegen`

### Method 2: XCTest UI Testing

For more control and integration with CI/CD. Use the `ScreenshotTests.swift` test target.

```bash
cd apple
xcodebuild test \
  -scheme PPL \
  -configuration Debug \
  -testPlan Screenshots \
  -derivedDataPath build/
```

**Advantages:**
- Deterministic (same results every run)
- CI/CD friendly
- Can add custom logic (wait for animations, verify state)
- Integrates with Xcode test reporting

### Method 3: Manual Simulator

For testing or one-off captures.

```bash
# Boot simulator
xcrun simctl boot "iPhone 15 Pro"
sleep 2

# Install and run app
xcodebuild build-for-testing -scheme PPL
APP=$(find build -name "PPL.app" -type d | head -1)
xcrun simctl install booted "$APP"
xcrun simctl launch booted com.flygaca.ppl

# Wait for app to settle
sleep 3

# Capture
xcrun simctl io booted screenshot screenshots/raw/iPhone15Pro/portrait/01-home.png

# Navigate manually, capture more screens...

# Cleanup
xcrun simctl terminate booted com.flygaca.ppl
xcrun simctl shutdown booted
```

## Post-Processing

### Add Device Frames

```bash
npm run screenshots:process
```

Requires ImageMagick:
```bash
brew install imagemagick
```

Creates `screenshots/device-frames/` with device bezels (for App Store submission).

### Optimize for App Store

Xcode requires specific sizes:
- **iPhone 6.7"**: 1170×2532
- **iPhone 6.5"**: 1242×2688
- **iPad 12.9"**: 2048×2732

Include a resize step in your processing script.

## App Store Submission

### Required Screenshots

- **Minimum**: 2 screenshots per device type
- **Recommended**: 5-10 screenshots per device for full feature showcase
- **Maximum**: 10 screenshots per device (App Store Connect limit)

### Order

1. Home screen (feature grid)
2. Quiz question interface
3. Quiz results with explanation
4. Flashcard flip
5. Mock exam results
6. Timed exam with timer
7. Lessons / ground school
8. Multi-module showcase (optional)

### File Requirements

- **Format**: PNG or JPEG
- **Resolution**: Native device resolution (1170×2532, 2048×2732, etc.)
- **Orientation**: Portrait (primary), Landscape (optional)
- **Text Overlay**: Optional captions/marketing text via App Store Connect interface

### Submission Checklist

- [ ] Screenshots capture all 5 core features
- [ ] Both iPhone and iPad representations
- [ ] Marketing text adds context (via App Store Connect)
- [ ] No system UI artifacts (status bar, Control Center)
- [ ] Falcon Palette colors accurate (no filters)
- [ ] Text legible at required resolution
- [ ] Screenshots file size < 10 MB each

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Capture iOS Screenshots
on:
  push:
    branches: [main, develop]
    paths:
      - 'apple/**'
      - '.github/workflows/screenshots.yml'

jobs:
  screenshots:
    runs-on: macos-15
    steps:
      - uses: actions/checkout@v4
      
      - name: Install XcodeGen
        run: brew install xcodegen
      
      - name: Generate Xcode Project
        run: npm run ios:generate
      
      - name: Capture Screenshots
        run: npm run screenshots:capture
      
      - name: Upload Artifacts
        uses: actions/upload-artifact@v4
        with:
          name: screenshots
          path: screenshots/raw/
          retention-days: 7
      
      - name: Comment PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '📸 Screenshots captured! Download the artifact to review.'
            })
```

## Versioning Strategy

Screenshots are version-controlled in git. Commit whenever:

1. **New features ship** → Screenshot new screens before release
2. **UI design changes** → Update affected screenshots
3. **Falcon theme updates** → Retake all screenshots (design consistency)

### Commit Message Format

```
screenshots: update iPhone/iPad for [feature]

- Updated home screen with new teal accent
- Added flashcard landscape variant
- Captured timed exam timer countdown

Closes #123
```

## Troubleshooting

### Screenshots are blurry

**Cause**: Simulator display scale or compression  
**Fix**: 
- Ensure simulator runs at 100% scale in Xcode
- Check iPhone model supports native 1179 width
- Verify simulator fully booted before capture

### Taps not working

**Cause**: Coordinate mismatch in test script  
**Fix**:
- Use Xcode Inspector to identify exact element coordinates
- Adjust tap coordinates in `ScreenshotTests.swift`
- Test manually first in Simulator, note working taps

### App crashes on launch

**Cause**: Missing or incorrect app bundle  
**Fix**:
- Verify build succeeded: check `build/Build/Products/`
- Check app entitlements in `.xcconfig`
- Try `npm run ios:clean && npm run ios:build:ppl`

### Simulator won't boot

**Cause**: Simulator not available or already booted  
**Fix**:
- List simulators: `xcrun simctl list devices`
- Erase simulator: `xcrun simctl erase "iPhone 15 Pro"`
- Restart: close Simulator app, then try again
- Update Xcode: `xcode-select --install`

## Resources

- **Xcode Screenshots**: https://developer.apple.com/documentation/xcode/taking_screenshots_of_your_app
- **XCTest UI Testing**: https://developer.apple.com/documentation/xctest/testing-uis
- **App Store Screenshot Requirements**: https://help.apple.com/app-store-connect/en/dev/d4b8fea0b5c24b3ca2a2f8a65a3ab8b1/
- **Falcon Design System**: See `apple/FlyGACAKit/FeatureUI/Theme.swift`

## Maintenance

Schedule screenshot updates:

- **Weekly**: During active development, if UI changes
- **Monthly**: Before marketing campaign launches
- **Quarterly**: Before major version releases
- **As-needed**: When new features ship or design refreshes

---

**Last Updated**: 2026-07-24  
**App Version**: 1.0.0  
**Xcode Required**: 16.0+  
**Total Screenshots**: 22

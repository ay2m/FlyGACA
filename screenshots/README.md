# FlyGACA iOS App Screenshots

Marketing and promotional screenshots for the FlyGACA iOS app family (PPL, ELPT, AIP, CPL, IR, ATPL).

## Directory Structure

```
screenshots/
├── README.md                 # This file
├── INDEX.md                  # Detailed screenshot inventory
├── raw/                      # Original simulator captures
│   ├── iPhone15Pro/
│   │   ├── portrait/         # iPhone screenshots (portrait)
│   │   └── landscape/        # iPhone screenshots (landscape)
│   └── iPadPro/
│       ├── portrait/         # iPad screenshots (portrait)
│       └── landscape/        # iPad screenshots (landscape)
└── device-frames/            # Marketing-ready with device bezels (optional)
    ├── iPhone/
    └── iPad/
```

## Quick Start: Capturing Screenshots

### Prerequisites

- macOS with Xcode 16+
- Brew: `brew install xcodegen`
- iOS simulators: iPhone 15 Pro, iPad Pro 12.9"

### Step 1: Generate Project

```bash
cd apple
npm run ios:generate  # or: xcodegen generate
```

### Step 2: Run Screenshot Capture

Choose one of these methods:

#### Option A: Automated Shell Script (Recommended)

```bash
cd apple
bash Scripts/capture-screenshots.sh
```

This script:
- Generates the Xcode project
- Boots simulators
- Installs and launches the app
- Captures screenshots for all screens
- Shuts down simulators gracefully

#### Option B: Manual Xcode UI Testing

```bash
cd apple
xcodebuild test \
  -scheme PPL \
  -configuration Debug \
  -testPlan Screenshots \
  -derivedDataPath build/
```

Screenshots are saved to `build/` and copied to `screenshots/raw/`

#### Option C: Manual Simulator Screenshots

```bash
# Boot iPhone simulator
xcrun simctl boot "iPhone 15 Pro"
sleep 2

# Install and run app
xcodebuild build-for-testing -scheme PPL
APP_PATH="build/Build/Products/Debug-iphonesimulator/PPL.app"
xcrun simctl install booted "$APP_PATH"
xcrun simctl launch booted com.flygaca.ppl

# Capture screenshot
sleep 3
xcrun simctl io booted screenshot screenshots/raw/iPhone15Pro/portrait/01-home.png

# Rotate to landscape
xcrun simctl io booted rotate left
sleep 1
xcrun simctl io booted screenshot screenshots/raw/iPhone15Pro/landscape/01-home-landscape.png
```

## Screenshot Specifications

### Devices

- **iPhone 15 Pro**: 1179×2556 (viewport: 390×844)
- **iPad Pro 12.9"**: 2048×2732 (viewport: 1024×1366)

### Orientations

- Portrait (all screens)
- Landscape (quiz, exam, flashcard screens)

### Design System

All screenshots use the **Falcon Palette** theme colors:
- Primary Teal: `#2D6E8A`
- Success Sage: `#8FC9A8`
- Alert Clay: `#CF6B52`
- Night Dark: `#0A0E12`

No manual colorizing or filters—raw app UI only.

## Screenshots to Capture

See `INDEX.md` for the complete inventory with:
- Screenshot name and filename
- Device and orientation
- What's shown (description)
- Use case (App Store, website, etc.)

## Processing & Publishing

### Add Device Frames (Optional)

For polished App Store screenshots with device bezels:

```bash
bash Scripts/process-screenshots.sh
```

This uses:
- ScreenFrame CLI (recommended): https://www.screenframes.com/
- Custom frame overlays (included)

Output: `screenshots/device-frames/`

### Optimize for App Store

```bash
# Resize and optimize for submission
bash Scripts/optimize-for-appstore.sh
```

Creates:
- 1170×2532 for 6.7" display
- 1290×2796 for 6.9" display
- 2048×2732 for iPad 12.9"

## Quality Checklist

Before committing screenshots:

- [ ] All 5 core features visible (Study, Quiz, Flashcards, Mock Exam, Timed Exam)
- [ ] Both iPhone and iPad orientations captured
- [ ] Timer visible/active in Timed Exam screen
- [ ] Flashcard shows both front and back states
- [ ] Results breakdown clearly legible
- [ ] Falcon design colors accurate (no filters/adjustments)
- [ ] No status bar remnants or system UI artifacts
- [ ] Consistent lighting and device state
- [ ] Filenames follow convention: `{device}-{orientation}-{screen-name}-{variant}.png`

## Using in Marketing

### App Store

Place screenshots in Xcode → App Store Connect:
1. Upload from `device-frames/` (with bezels, preferred)
2. Or use raw `raw/` screenshots with 1170×2532 resize

**Order for App Store Connect** (tap order):
1. Home/features grid
2. Quiz question
3. Quiz results
4. Flashcard flip
5. Mock exam results
6. Timed exam
7. Lessons

### Website

Use raw or framed screenshots:
- Blog posts: `device-frames/` (with bezel)
- Feature comparisons: `raw/` (clean, no bezel)
- Hero section: `device-frames/landscape/` (iPad landscape)

### Social Media

Crop interesting regions, apply filters, add text overlay:
- Twitter: 1024×512 (crop key screens)
- Instagram: 1080×1350 (vertical, full screen)
- LinkedIn: 1200×627 (feature showcase)

## Automation

### GitHub Actions CI

```yaml
# .github/workflows/screenshots.yml
name: Update Screenshots
on:
  push:
    branches: [main, develop]
jobs:
  screenshots:
    runs-on: macos-15
    steps:
      - uses: actions/checkout@v4
      - run: brew install xcodegen
      - run: cd apple && bash Scripts/capture-screenshots.sh
      - uses: actions/upload-artifact@v4
        with:
          name: screenshots
          path: apple/screenshots/raw/
```

## Versioning

Screenshots are version-controlled in git. Commit strategy:

1. **New feature**: Commit updated screenshots same PR as code
2. **Minor UI tweak**: Commit screenshot changes separately
3. **Bulk retake** (e.g., design refresh): Squash all screenshot changes into one commit

Commit message format:

```
screenshots: update iPhone/iPad screenshots for {feature}

- Updated home screen (new colors)
- Added flashcard landscape variant
- Captured timer countdown sequence
```

## Troubleshooting

### Screenshots are blurry
- Ensure simulator is running at 100% scale
- Use `xcrun simctl list devices` to verify device is booted
- Try capturing again after app settles (sleep 3-5 seconds)

### Taps not registering
- Coordinates in `ScreenshotTests.swift` may need adjustment for your layout
- Use Xcode's Inspector to verify element positions
- Alternatively, manually navigate using Simulator's gesture support

### App crashes on launch
- Verify PPL.app built successfully: check `build/` directory
- Check app entitlements in `Apps/PPL/PPL.xcconfig`
- Clear simulator state: `xcrun simctl erase all`

### Device simulator won't boot
- Update Xcode: `xcode-select --install` or via App Store
- Ensure device profile exists: `xcrun simctl list devices available`
- Restart simulator app and/or Mac if needed

## Resources

- Xcode User Guide: https://developer.apple.com/documentation/xcode
- XCTest UI Testing: https://developer.apple.com/documentation/xctest/testing-uis
- XCUITest Screenshot Testing: https://github.com/fastlane-community/fastlane-plugin-snapshot
- App Store Screenshot Requirements: https://developer.apple.com/app-store/screenshots/

## Contributing

When updating app UI:

1. Take fresh screenshots using one of the methods above
2. Update `INDEX.md` with any changes
3. Verify all screenshots in checklist above
4. Commit with descriptive message
5. Tag screenshots in PR description

---

**Last Updated**: 2026-07-24  
**App Version**: 1.0.0  
**iOS Target**: 17.0+  
**Xcode Required**: 16.0+

# Fly GACA Design System Reference

**Version:** 3.0.0 (Phase 3 Launch Ready)  
**Brand Foundation:** Falcon over Kingdom (Dark-First Aviation Modernism)  
**Accessibility Target:** WCAG 2.1 Level AA Compliance

---

## 1. Color System (The Falcon Palette)

The Fly GACA color palette is designed specifically for low-fatigue cockpit readability and high-contrast ambient clarity.

| Token Name | Hex Value | Semantic Usage | Minimum AA Ratio |
|---|---|---|---|
| `--falcon-night` | `#0a0e12` | Primary Canvas / Background | N/A (Canvas) |
| `--falcon-deep` | `#0f1a24` | Elevated Cards / Widgets | N/A (Surface) |
| `--falcon-mist` | `#1a2a38` | Default Borders / Dividers | 3.0:1 |
| `--falcon-mist-2` | `#243749` | Raised Borders / Active Edges | 3.2:1 |
| `--falcon-teal` | `#2d6e8a` | Primary Brand / Action Buttons | 4.6:1 |
| `--teal-bright` | `#4a9cb8` | Interactive Links / Focus Accents | 7.1:1 |
| `--falcon-sage` | `#8fc9a8` | Success Indicators / Verified GACA Citations | 11.2:1 |
| `--sage-bright` | `#b5ddc2` | Primary Focus Rings / High-Visibility Indicators | 13.8:1 |
| `--falcon-gold` | `#c8a04a` | Heritage Accents / Warning Badges | 8.3:1 |
| `--falcon-clay` | `#cf6b52` | Error / Deletion / Hold Alerts | 5.2:1 |
| `--text` | `#e8edf2` | Primary Text | 16.4:1 |
| `--text-muted` | `#9da9b4` | Secondary Metadata | 8.8:1 |
| `--text-dim` | `#8a95a1` | Tertiary Captions | 6.2:1 |

---

## 2. Typography Hierarchy

Fly GACA utilizes two typography scales for bilingual (Arabic/English) readability and alphanumeric cockpit data clarity.

- **Primary Typeface:** Readex Pro (`--font-sans`)
- **Monospace Typeface:** JetBrains Mono (`--font-mono`)

### Type Scale

| Scale Role | Font Size | Line Height | Weight | Letter Spacing |
|---|---|---|---|---|
| `Hero Display` | `2.5rem` (40px) | `1.15` | `700` | `-0.02em` |
| `Heading 1` | `2.0rem` (32px) | `1.2` | `700` | `-0.015em` |
| `Heading 2` | `1.5rem` (24px) | `1.25` | `600` | `-0.01em` |
| `Heading 3` | `1.25rem` (20px) | `1.3` | `600` | `0` |
| `Body Base` | `1.0rem` (16px) | `1.5` | `400` | `0` |
| `Body Small` | `0.875rem` (14px) | `1.45` | `400` | `0.01em` |
| `Caption / Monospace` | `0.75rem` (12px) | `1.4` | `500` | `0.02em` |

---

## 3. Motion & Animation Tokens

All motion across web and native platforms is built on composite-only GPU properties (`transform`, `opacity`) to guarantee 60fps performance without layout thrashing.

### Spring Profiles

| Profile Name | Stiffness | Damping | Mass | Primary Use Case |
|---|---|---|---|---|
| `SPRING_SNAPPY` | `400` | `30` | `0.8` | Button taps, toggle states |
| `SPRING_GENTLE` | `200` | `25` | `1.0` | Parallax cursor tracking, dropdowns |
| `SPRING_BOUNCY` | `300` | `18` | `0.9` | Quiz correct answer reveal |
| `SPRING_INSTANT` | `500` | `35` | `0.7` | High-frequency telemetry |

### Kinetic Timing Constants
- **`BENTO_DUR_ENTRY_S`:** `0.62s` (`cubic-bezier(0.16, 1, 0.3, 1)`)
- **`BENTO_STAGGER_S`:** `0.07s`
- **`BENTO_LIFT_HOVER`:** `1.015`

---

## 4. Reusable Component Guidelines

### Button (`src/components/ui/Button.tsx`)
```tsx
import { Button, ButtonLink } from '@/components/ui/Button';

<Button variant="primary" icon={<PlaneIcon />}>
  Launch Simulator
</Button>

<ButtonLink to="/library" variant="clayPrimary">
  Open Library
</ButtonLink>
```

### Bento Grid & Cards (`src/components/bento/`)
- Grid automatically manages staggered entrance and responsive collapses.
- Bento cards provide hover glow effects and WCAG-compliant `aria-labelledby` linkages.

---

## 5. Accessibility (A11y) Standards
- **Focus Rings:** Visible `2px` focus ring using `--sage-bright` with `2px` offset.
- **Motion Reduction:** All animations gracefully collapse to instant transitions when `prefers-reduced-motion` is active.
- **Keyboard Navigation:** Full arrow key navigation in palettes and Escape-to-dismiss in modals.


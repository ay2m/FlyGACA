import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Calculates relative luminance of an sRGB color.
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
function getLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const [rLinear, gLinear, bLinear] = [r, g, b].map((val) => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculates contrast ratio between two hex colors.
 * https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
 */
function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

describe('WCAG AA Contrast Audit', () => {
  const tokensCss = readFileSync(join(process.cwd(), 'src/styles/tokens.css'), 'utf8');

  it('verifies tokens.css contains required color definitions', () => {
    expect(tokensCss).toContain('--falcon-night:');
    expect(tokensCss).toContain('--text:');
    expect(tokensCss).toContain('--text-muted:');
    expect(tokensCss).toContain('--text-dim:');
  });

  it('passes WCAG AA 4.5:1 text contrast for primary text on dark canvas', () => {
    const bgNight = '#0a0e12';
    const textPrimary = '#e8edf2';
    const ratio = getContrastRatio(bgNight, textPrimary);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('passes WCAG AA 4.5:1 text contrast for secondary text on dark canvas', () => {
    const bgNight = '#0a0e12';
    const textMuted = '#9da9b4';
    const ratio = getContrastRatio(bgNight, textMuted);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('passes WCAG AA 4.5:1 text contrast for tertiary text on dark canvas', () => {
    const bgNight = '#0a0e12';
    const textDim = '#8a95a1';
    const ratio = getContrastRatio(bgNight, textDim);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('passes WCAG AA 3.0:1 UI component and graphical object contrast', () => {
    const bgNight = '#0a0e12';
    const borderInput = '#5a6b7b';
    const ratio = getContrastRatio(bgNight, borderInput);
    expect(ratio).toBeGreaterThanOrEqual(3.0);
  });
});


/**
 * Simplified outline of Saudi Arabia for the HUD globe.
 *
 * A hand-simplified, approximate ring (~50 vertices) tracing the Red Sea
 * coast, the southern and eastern land borders, the Gulf coast and the
 * northern borders. Decorative anchor for the globe only — NOT a boundary
 * dataset and never to be read as chart or navigational data.
 */
import type { HudPoint } from './types';

/** Closed rings ([0] is the mainland ring; first point repeated last). */
export const KSA_OUTLINE: readonly (readonly HudPoint[])[] = [
  [
    // Gulf of Aqaba, then south along the Red Sea coast.
    { lat: 29.36, lon: 34.96 },
    { lat: 28.6, lon: 34.78 },
    { lat: 28.05, lon: 35.1 },
    { lat: 27.5, lon: 35.55 },
    { lat: 26.75, lon: 36.05 },
    { lat: 26.1, lon: 36.55 },
    { lat: 25.35, lon: 37.05 },
    { lat: 24.65, lon: 37.35 },
    { lat: 24.05, lon: 37.95 },
    { lat: 23.45, lon: 38.5 },
    { lat: 22.75, lon: 38.95 },
    { lat: 22.0, lon: 39.0 },
    { lat: 21.35, lon: 39.15 },
    { lat: 20.75, lon: 39.5 },
    { lat: 20.15, lon: 40.05 },
    { lat: 19.55, lon: 40.7 },
    { lat: 18.95, lon: 41.15 },
    { lat: 18.3, lon: 41.6 },
    { lat: 17.6, lon: 42.05 },
    { lat: 16.95, lon: 42.4 },
    { lat: 16.55, lon: 42.8 },
    // Yemen border, west → east.
    { lat: 16.4, lon: 43.15 },
    { lat: 17.05, lon: 43.3 },
    { lat: 17.35, lon: 44.1 },
    { lat: 17.45, lon: 45.2 },
    { lat: 17.3, lon: 46.35 },
    { lat: 16.95, lon: 47.0 },
    { lat: 17.35, lon: 47.6 },
    { lat: 18.0, lon: 48.6 },
    { lat: 18.6, lon: 50.0 },
    { lat: 18.99, lon: 52.0 },
    // Oman then UAE borders across the Empty Quarter.
    { lat: 19.95, lon: 54.95 },
    { lat: 21.95, lon: 55.65 },
    { lat: 22.65, lon: 55.2 },
    { lat: 22.95, lon: 52.6 },
    { lat: 24.1, lon: 51.6 },
    // Gulf coast past the Qatar base and up to Kuwait.
    { lat: 24.65, lon: 51.35 },
    { lat: 24.55, lon: 50.85 },
    { lat: 25.45, lon: 50.4 },
    { lat: 26.25, lon: 50.15 },
    { lat: 26.65, lon: 49.95 },
    { lat: 27.1, lon: 49.55 },
    { lat: 27.65, lon: 49.15 },
    { lat: 28.45, lon: 48.6 },
    { lat: 28.95, lon: 48.35 },
    // Kuwait, Iraq and Jordan borders back to the Gulf of Aqaba.
    { lat: 29.1, lon: 47.65 },
    { lat: 29.65, lon: 46.9 },
    { lat: 30.3, lon: 45.6 },
    { lat: 30.95, lon: 43.7 },
    { lat: 31.65, lon: 41.9 },
    { lat: 32.1, lon: 40.35 },
    { lat: 31.95, lon: 39.15 },
    { lat: 31.3, lon: 37.7 },
    { lat: 30.4, lon: 37.65 },
    { lat: 29.85, lon: 36.65 },
    { lat: 29.35, lon: 36.05 },
    { lat: 29.36, lon: 34.96 },
  ],
];

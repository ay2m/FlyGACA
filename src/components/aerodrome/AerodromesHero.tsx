import styles from './aerodrome.module.css';

/**
 * Decorative header banner for the Aerodromes directory: a runway receding to a
 * horizon under the Falcon-palette sky, with a compass tick. Purely ornamental,
 * so it is aria-hidden.
 */
export function AerodromesHero() {
  return (
    <svg
      className={styles.hero}
      viewBox="0 0 800 200"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      focusable={false}
    >
      <defs>
        <linearGradient id="aeroSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--falcon-teal)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--falcon-sage)" stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id="aeroRwy" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="var(--teal-bright)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--teal-bright)" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="800" height="200" fill="url(#aeroSky)" />
      {/* Horizon line. */}
      <line x1="0" y1="120" x2="800" y2="120" stroke="var(--teal-bright)" strokeOpacity="0.35" />
      {/* Runway receding to a vanishing point. */}
      <polygon points="400,120 366,200 434,200" fill="url(#aeroRwy)" />
      <line
        x1="400"
        y1="124"
        x2="400"
        y2="196"
        stroke="var(--sage-bright)"
        strokeOpacity="0.7"
        strokeWidth="2"
        strokeDasharray="6 10"
      />
      {/* A few approach-light dots along the centreline. */}
      {[140, 158, 178, 200].map((y, i) => (
        <circle key={y} cx="400" cy={y} r={1.6 + i * 0.4} fill="var(--falcon-gold)" opacity="0.8" />
      ))}
      {/* Sun / compass disc on the horizon. */}
      <circle cx="650" cy="120" r="34" fill="var(--falcon-gold)" opacity="0.16" />
      <circle
        cx="650"
        cy="120"
        r="34"
        fill="none"
        stroke="var(--falcon-gold)"
        strokeOpacity="0.4"
      />
    </svg>
  );
}

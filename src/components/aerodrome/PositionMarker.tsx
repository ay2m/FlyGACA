import { useTranslation } from 'react-i18next';
import styles from './aerodrome.module.css';

interface Props {
  lat: number;
  lon: number;
}

const C = 60;
const R = 50;

/**
 * A lightweight SVG "position" badge — a stylised globe (equirectangular grid)
 * with a pin at the airport's lat/lon. A no-network companion to the external
 * map link.
 */
export function PositionMarker({ lat, lon }: Props) {
  const { t } = useTranslation();
  const x = C + (lon / 180) * R;
  const y = C - (lat / 90) * R;

  return (
    <svg
      className={styles.globe}
      viewBox="0 0 120 120"
      role="img"
      aria-label={t('aerodromesTool.position')}
    >
      <circle className={styles.globeEdge} cx={C} cy={C} r={R} />
      {/* Equator + prime meridian. */}
      <line className={styles.grid} x1={C - R} y1={C} x2={C + R} y2={C} />
      <line className={styles.grid} x1={C} y1={C - R} x2={C} y2={C + R} />
      {/* Two latitude/longitude ellipses for a globe feel. */}
      <ellipse className={styles.grid} cx={C} cy={C} rx={R * 0.5} ry={R} />
      <ellipse className={styles.grid} cx={C} cy={C} rx={R} ry={R * 0.5} />
      <line className={styles.pinStem} x1={x} y1={y} x2={x} y2={y - 12} />
      <circle className={styles.pin} cx={x} cy={y - 13} r={4.5} />
    </svg>
  );
}

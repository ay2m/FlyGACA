import styles from './aerodrome.module.css';

interface Props {
  /** Short OurAirports type: large | medium | small | heliport | seaplane | balloonport. */
  type?: string;
  className?: string;
}

/**
 * A small inline glyph for the aerodrome type. Decorative (the type is also
 * conveyed in text), so it is aria-hidden and inherits `currentColor`.
 */
export function AirportTypeIcon({ type, className }: Props) {
  const cls = `${styles.typeIcon}${className ? ` ${className}` : ''}`;
  const common = { viewBox: '0 0 24 24', className: cls, 'aria-hidden': true, focusable: false };

  switch (type) {
    case 'heliport':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M9 8v8M15 8v8M9 12h6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      );
    case 'seaplane':
    case 'seaplane_base':
      return (
        <svg {...common}>
          <path
            d="M2 21c1.6 0 1.6-1.2 3.2-1.2S6.8 21 8.4 21s1.6-1.2 3.2-1.2S13.2 21 14.8 21s1.6-1.2 3.2-1.2S19.6 21 21.2 21"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M21 9.5 13.5 11 9 5H7l2.5 6.6-4 .8L4 11H2.5l1.4 4.2L21 12.5a1.5 1.5 0 0 0 0-3Z"
            fill="currentColor"
          />
        </svg>
      );
    case 'balloonport':
      return (
        <svg {...common}>
          <path
            d="M12 2a7 7 0 0 1 7 7c0 4-3.5 6.5-5.2 7.6H10.2C8.5 15.5 5 13 5 9a7 7 0 0 1 7-7Z"
            fill="currentColor"
          />
          <path
            d="M10.4 17h3.2l-.5 3a1 1 0 0 1-1 .9h-.2a1 1 0 0 1-1-.9Z"
            fill="currentColor"
            opacity="0.7"
          />
        </svg>
      );
    default:
      // large / medium / small airports — an airliner silhouette.
      return (
        <svg {...common}>
          <path
            d="M21 13.5 13.5 12 9 4H7l2.5 8-4 .8L4 11H2.5l1.4 4.2-1.4 4.3H4l1.5-2.6 4 .8L7 22h2l4.5-8 7.5-1.5a1.6 1.6 0 0 0 0-3Z"
            fill="currentColor"
          />
        </svg>
      );
  }
}

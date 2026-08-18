import { Link } from 'react-router';
import styles from './HubBackLink.module.css';

/**
 * A small "← back to hub" link for leaf pages that render outside their hub
 * shell (e.g. the study modes and guides that live under the merged /learn hub).
 * Keeps orientation without pulling the whole hub chrome onto the leaf.
 */
export function HubBackLink({ to, label }: { to: string; label: string }) {
  return (
    <p className={styles.back}>
      <Link to={to} viewTransition>
        ← {label}
      </Link>
    </p>
  );
}

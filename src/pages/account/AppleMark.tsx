import { AppleLogo } from '@phosphor-icons/react';
import styles from './AccountPage.module.css';

/** The Apple logo, on a white chip so it reads on the teal button. */
export function AppleMark() {
  return (
    <span className={styles.googleChip} aria-hidden="true">
      <AppleLogo size={18} weight="fill" color="#000" />
    </span>
  );
}

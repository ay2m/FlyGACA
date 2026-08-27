import styles from './AmbientGlow.module.css';

interface AmbientGlowProps {
  className?: string;
  variant?: 'auth' | 'dashboard' | 'chat';
}

export function AmbientGlow({ className = '', variant = 'auth' }: AmbientGlowProps) {
  return (
    <div
      className={`${styles.ambientContainer} ${styles[variant]} ${className}`}
      aria-hidden="true"
    >
      <div className={styles.blob1} />
      <div className={styles.blob2} />
      <div className={styles.blob3} />
      <div className={styles.noise} />
    </div>
  );
}

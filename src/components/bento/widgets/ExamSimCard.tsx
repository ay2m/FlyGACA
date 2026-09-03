import { BentoCard } from '../BentoCard';
import styles from './widgets.module.css';

interface ExamSimCardProps {
  examName?: string;
  questionCount?: number;
  timeLimitMinutes?: number;
}

export function ExamSimCard({
  examName = 'GACA Commercial Pilot (Aeroplane)',
  questionCount = 100,
  timeLimitMinutes = 150,
}: ExamSimCardProps) {
  return (
    <BentoCard span="md" tone="cyan" to="/study/exam" labelledBy="exam-sim-heading">
      <div className={styles.header}>
        <h3 id="exam-sim-heading" className={styles.title}>
          {examName}
        </h3>
      </div>
      <p className={styles.body}>
        Timed GACA mock examination simulation under official exam room constraints.
      </p>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-dim)' }}>
        <span>{questionCount} Questions</span>
        <span>•</span>
        <span>{timeLimitMinutes} Mins</span>
      </div>
    </BentoCard>
  );
}

export default ExamSimCard;


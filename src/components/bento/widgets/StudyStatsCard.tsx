import { motion } from 'framer-motion';
import { listContainerVariants, listReorderVariants } from '@/animations/microInteractions';
import { BentoCard } from '../BentoCard';
import styles from './widgets.module.css';

interface TopicStat {
  id: string;
  name: string;
  progress: number;
}

interface StudyStatsCardProps {
  topics?: TopicStat[];
}

const DEFAULT_TOPICS: TopicStat[] = [
  { id: 'part61', name: 'GACAR Part 61 (Pilot Cert)', progress: 85 },
  { id: 'part91', name: 'GACAR Part 91 (General Ops)', progress: 72 },
  { id: 'nav', name: 'Air Navigation & Altimetry', progress: 94 },
  { id: 'met', name: 'Aviation Meteorology (METAR/TAF)', progress: 68 },
];

export function StudyStatsCard({ topics = DEFAULT_TOPICS }: StudyStatsCardProps) {
  return (
    <BentoCard span="md" tone="default" labelledBy="study-stats-heading">
      <div className={styles.header}>
        <h3 id="study-stats-heading" className={styles.title}>
          Study Progress
        </h3>
      </div>
      <motion.ul
        variants={listContainerVariants}
        initial="hidden"
        animate="visible"
        className={styles.topicList}
        style={{ listStyle: 'none', padding: 0, margin: '0.75rem 0' }}
      >
        {topics.map((topic, i) => (
          <motion.li
            key={`topic-${topic.id}-${i}`}
            variants={listReorderVariants}
            custom={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.35rem 0',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <span style={{ fontSize: '0.875rem' }}>{topic.name}</span>
            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--falcon-sage, #8fc9a8)' }}>
              {topic.progress}%
            </span>
          </motion.li>
        ))}
      </motion.ul>
    </BentoCard>
  );
}

export default StudyStatsCard;


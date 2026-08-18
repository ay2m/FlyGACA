import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import styles from './AdelHeroWidget.module.css';

interface Cite {
  code: string;
  tip: string;
}
interface Demo {
  q: string;
  a: string;
  cites: Cite[];
}

/**
 * An "electronic flight bag" demo panel from the landing comp: Captain Adel
 * answering real GACAR questions with a typewriter effect and hover-able
 * citation pills, looping through a few canned exchanges. The content is
 * explicitly illustrative (see the footer note) — the live, grounded assistant
 * lives at /chat. Reduced-motion parks it on the first exchange, fully typed.
 */
export function AdelHeroWidget() {
  const { t, i18n } = useTranslation();
  const reduce = usePrefersReducedMotion();

  const demos = useMemo<Demo[]>(() => {
    const list = t('home.adel.demos', { returnObjects: true });
    return Array.isArray(list) ? (list as Demo[]) : [];
    // Re-resolve when the language changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [cites, setCites] = useState<Cite[]>([]);
  const [thinking, setThinking] = useState(false);
  const [typing, setTyping] = useState(false);

  // Keep the latest `reduce` for the async loop without re-subscribing it.
  const reduceRef = useRef(reduce);
  reduceRef.current = reduce;

  useEffect(() => {
    if (demos.length === 0) return;

    if (reduce) {
      const d = demos[0];
      setQuestion(d.q);
      setAnswer(d.a);
      setCites(d.cites ?? []);
      setThinking(false);
      setTyping(false);
      return;
    }

    let cancelled = false;
    const timers: number[] = [];
    const wait = (ms: number) =>
      new Promise<void>((res) => {
        timers.push(window.setTimeout(res, ms));
      });

    const run = async () => {
      let i = 0;
      while (!cancelled) {
        const d = demos[i % demos.length];
        setQuestion(d.q);
        setAnswer('');
        setCites([]);
        setThinking(true);
        setTyping(false);
        await wait(750);
        if (cancelled) return;

        setThinking(false);
        setTyping(true);
        for (let c = 1; c <= d.a.length; c++) {
          if (cancelled) return;
          setAnswer(d.a.slice(0, c));
          await wait(18);
        }
        setTyping(false);
        setCites(d.cites ?? []);

        await wait(3800);
        i++;
      }
    };

    void run();
    return () => {
      cancelled = true;
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [demos, reduce]);

  if (demos.length === 0) return null;

  return (
    <div className={styles.efb} aria-hidden="true">
      <div className={styles.screen}>
        <div className={styles.bar}>
          <span className={styles.dot} />
          <span className={styles.id}>{t('home.adel.id')}</span>
          <span className={styles.engine}>{t('home.adel.engine')}</span>
          <span className={styles.status}>
            {thinking ? t('home.adel.thinking') : t('home.adel.onDuty')}
          </span>
        </div>

        <div className={styles.thread}>
          <p className={styles.q}>{question}</p>
          <p className={`${styles.a} ${typing ? styles.cursor : ''}`}>{answer}</p>
          <div className={styles.cites}>
            {cites.map((c) => (
              <span key={c.code} className={styles.cite} data-tip={c.tip} title={c.tip}>
                §{c.code}
              </span>
            ))}
          </div>
        </div>

        <p className={styles.note}>{t('home.adel.note')}</p>
      </div>
    </div>
  );
}

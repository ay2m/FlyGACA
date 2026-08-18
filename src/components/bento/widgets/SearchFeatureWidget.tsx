import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { BentoCard } from '@/components/bento/BentoCard';
import shared from './widgets.module.css';

/**
 * Regulation-search feature tile — the second co-equal hero. Its inline field
 * deep-links into the Library with a `?q=` term, so the home doubles as the
 * product's search box.
 */
export function SearchFeatureWidget() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    navigate(trimmed ? `/library?q=${encodeURIComponent(trimmed)}` : '/library');
  }

  return (
    <BentoCard span="wide" tone="cyan">
      <p className={shared.eyebrow}>{t('home.dashboard.search.eyebrow')}</p>
      <h3 className={shared.heading}>{t('home.dashboard.search.heading')}</h3>
      <p className={shared.desc}>{t('home.dashboard.search.desc')}</p>
      <form className={shared.featForm} onSubmit={onSubmit}>
        <input
          className={shared.featInput}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('home.dashboard.search.placeholder')}
          aria-label={t('home.dashboard.search.placeholder')}
        />
        <button className={shared.featBtn} type="submit">
          {t('home.dashboard.search.submit')}
        </button>
      </form>
      <Link className={shared.featOpen} to="/library">
        {t('home.dashboard.search.open')} →
      </Link>
    </BentoCard>
  );
}

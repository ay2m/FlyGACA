import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { BentoCard } from '@/components/bento/BentoCard';
import { StatusPill } from '@/components/StatusPill';
import { CaptainAvatar } from '@/components/CaptainAvatar';
import shared from './widgets.module.css';

/**
 * Captain Adel feature tile — a co-equal hero with an inline "ask" field that
 * deep-links into the chat (which auto-sends the `?q=` question). The card is not
 * itself a link, so the input is the natural focus target.
 */
export function AdelFeatureWidget() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    navigate(trimmed ? `/chat?q=${encodeURIComponent(trimmed)}` : '/chat');
  }

  return (
    <BentoCard span="wide" tone="green">
      <div className={shared.adelHead}>
        <CaptainAvatar size="lg" glow decorative pose="smile" />
        <div className={shared.adelHeadText}>
          <StatusPill tone="live" pulse>
            {t('home.dashboard.adel.status')}
          </StatusPill>
          <h3 className={shared.heading}>{t('home.dashboard.adel.heading')}</h3>
        </div>
      </div>
      <p className={shared.desc}>{t('home.dashboard.adel.desc')}</p>
      <form className={shared.featForm} onSubmit={onSubmit}>
        <input
          className={shared.featInput}
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('home.dashboard.ask.placeholder')}
          aria-label={t('home.dashboard.ask.placeholder')}
        />
        <button className={shared.featBtn} type="submit">
          {t('home.dashboard.ask.submit')}
        </button>
      </form>
      <Link className={shared.featOpen} to="/chat">
        {t('home.dashboard.ask.open')} →
      </Link>
    </BentoCard>
  );
}

import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { RequireSession } from '@/pages/account/RequireSession';
import { Disclaimer } from '@/components/Disclaimer';
import { EmptyState } from '@/components/EmptyState';
import { StatStrip } from '@/components/StatStrip';
import { StatusPill, type StatusTone } from '@/components/StatusPill';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useNoindexMeta } from '@/hooks/usePageMeta';
import {
  getMyOrgs,
  getCohortReadiness,
  revokeSeat,
  type OrgSummary,
  type CohortReadiness,
  type CohortRow,
} from '@/lib/services/org';
import { ProvisionPanel } from './ProvisionPanel';
import { BuyCohortPanel } from './BuyCohortPanel';
import styles from './admin.module.css';
import { triggerDownload } from '@/lib/download';

/** Cohort admin dashboard — an org owner sees their seats + study readiness. */
export function BusinessAdmin() {
  const { t } = useTranslation();
  useNoindexMeta(t('business.admin.title'));
  return (
    <RequireSession>
      <Inner />
    </RequireSession>
  );
}

type State =
  | { kind: 'loading' }
  | { kind: 'no-org' }
  | { kind: 'ready'; orgs: OrgSummary[]; data: CohortReadiness };

function Inner() {
  const { t } = useTranslation();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [showInvitePanel, setShowInvitePanel] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const orgs = await getMyOrgs();
      if (!live) return;
      if (orgs.length === 0) {
        setState({ kind: 'no-org' });
        return;
      }
      const data = await getCohortReadiness(orgs[0].id);
      if (!live) return;
      if (!data) {
        setState({ kind: 'no-org' });
        return;
      }
      setState({ kind: 'ready', orgs, data });
    })();
    return () => {
      live = false;
    };
  }, []);

  if (state.kind === 'loading') {
    return (
      <section className={`container ${styles.page}`}>
        <p className={styles.muted}>{t('business.admin.loading')}</p>
      </section>
    );
  }

  if (state.kind === 'no-org') {
    return (
      <section className={`container-narrow ${styles.page}`}>
        <h1>{t('business.admin.title')}</h1>
        <BuyCohortPanel />
        <EmptyState icon="🔒">
          {t('business.admin.noAccess')} <Link to="/schools">{t('business.admin.talkToUs')}</Link>
        </EmptyState>
        <Disclaimer />
      </section>
    );
  }

  const { data, orgs } = state;
  const org = orgs[0];
  const handleInviteClose = async () => {
    setShowInvitePanel(false);
    // Refresh cohort data after provisioning.
    const updated = await getCohortReadiness(org.id);
    if (updated) {
      setState({ kind: 'ready', orgs, data: updated });
    }
  };

  const handleRevoke = async (email: string) => {
    if (!window.confirm(t('business.admin.confirmRevoke', 'Are you sure you want to revoke this seat?'))) return;
    const success = await revokeSeat(org.id, email);
    if (success) {
      const updated = await getCohortReadiness(org.id);
      if (updated) {
        setState({ kind: 'ready', orgs, data: updated });
      }
    }
  };

  return (
    <section className={`container ${styles.page}`}>
      <header className={styles.head}>
        <h1>{data.name}</h1>
        <p className={styles.muted}>
          {t('business.admin.subtitle', { threshold: data.threshold })}
        </p>
      </header>

      <StatStrip
        stats={[
          { value: data.counts.total, label: t('business.admin.seats') },
          { value: data.counts.active, label: t('business.admin.active') },
          { value: data.counts.ready, label: t('business.admin.ready') },
          { value: `${data.healthScore}%`, label: t('business.admin.healthScore', 'Health Score (H)') },
          { value: `${data.passProbability}%`, label: t('business.admin.passProb', 'Pass Probability') },
        ]}
      />

      <Card>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('business.admin.col.email')}</th>
                <th>{t('business.admin.col.seat')}</th>
                <th>{t('business.admin.col.coverage')}</th>
                <th>{t('business.admin.col.exam')}</th>
                <th>{t('business.admin.col.readyCol')}</th>
                <th>{t('business.admin.col.active')}</th>
                <th>{t('business.admin.col.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.email}>
                  <td>
                    <bdi dir="ltr">{r.email}</bdi>
                  </td>
                  <td>{statusCell(r, t)}</td>
                  {r.pdplConsent ? (
                    <>
                      <td>{r.coverage}</td>
                      <td>{r.hasProgress ? `${r.examBest}%` : '—'}</td>
                      <td>{readyCell(r, t)}</td>
                      <td>
                        <bdi dir="ltr">{r.lastActive || '—'}</bdi>
                      </td>
                    </>
                  ) : (
                    <td colSpan={4} className={styles.muted} style={{ textAlign: 'center' }}>
                      {t('business.admin.pendingConsent', 'Pending PDPL Consent')}
                    </td>
                  )}
                  <td>
                    {r.status !== 'revoked' && (
                      <button 
                        type="button" 
                        className={styles.linkBtn} 
                        style={{ color: 'var(--fg-danger, red)' }}
                        onClick={() => handleRevoke(r.email)}
                      >
                        {t('business.admin.revoke', 'Revoke')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className={styles.actions}>
        <Button type="button" variant="clay" onClick={() => setShowInvitePanel(true)}>
          {t('business.admin.addSeats')}
        </Button>
        <Button type="button" variant="clay" onClick={() => exportCsv(data)}>
          {t('business.admin.exportCsv')}
        </Button>
      </div>

      {showInvitePanel && (
        <ProvisionPanel
          orgId={data.orgId}
          seatLimit={org.seatLimit}
          seatsUsed={data.counts.total}
          onClose={handleInviteClose}
        />
      )}

      <p className={styles.note}>{t('business.admin.note')}</p>
      <Disclaimer />
    </section>
  );
}

const SEAT_STATUS_TONE: Partial<Record<CohortRow['status'], StatusTone>> = {
  active: 'success',
  invited: 'warning',
  expired: 'danger',
};

function statusCell(r: CohortRow, t: (k: string) => string): ReactNode {
  const label = t(`business.admin.status.${r.status}`);
  const tone = SEAT_STATUS_TONE[r.status];
  if (!tone) return <span className={styles.muted}>{label}</span>;
  return <StatusPill tone={tone}>{label}</StatusPill>;
}

function readyCell(r: CohortRow, t: (k: string) => string): ReactNode {
  if (!r.hasProgress) return <span className={styles.muted}>—</span>;
  if (r.ready) return <StatusPill tone="success">{t('business.admin.yes')}</StatusPill>;
  return <span className={styles.muted}>{t('business.admin.no')}</span>;
}

/** Client-side CSV export — same columns as school-cohort-report.mjs. */
function exportCsv(data: CohortReadiness) {
  const header = 'email,seat_status,coverage,exam_best,ready,last_active';
  const lines = data.rows.map((r) =>
    [
      r.email,
      r.status,
      r.coverage,
      r.hasProgress ? r.examBest : '',
      r.hasProgress ? (r.ready ? 'yes' : 'no') : '',
      r.lastActive,
    ].join(','),
  );
  triggerDownload(`${data.orgId}-cohort.csv`, `${[header, ...lines].join('\n')}\n`, 'text/csv');
}

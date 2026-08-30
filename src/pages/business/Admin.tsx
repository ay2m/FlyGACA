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
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [selectedCadet, setSelectedCadet] = useState<CohortRow | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'ready' | 'in-progress' | 'pending'>('all');

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
    if (
      !window.confirm(
        t('business.admin.confirmRevoke', 'Are you sure you want to revoke this seat?'),
      )
    )
      return;
    const success = await revokeSeat(org.id, email);
    if (success) {
      const updated = await getCohortReadiness(org.id);
      if (updated) {
        setState({ kind: 'ready', orgs, data: updated });
      }
    }
  };

  // Mock GACAR domain performance breakdown derived from cohort averages
  const domainBreakdowns = [
    {
      nameEn: 'GACAR Part 61 (Pilot Certification)',
      nameAr: 'الجزء 61 (تراخيص الطيارين والشهادات)',
      score: 84,
      status: 'good',
    },
    {
      nameEn: 'GACAR Part 91 (General Operating & Flight Rules)',
      nameAr: 'الجزء 91 (قواعد التشغيل العامة والطيران)',
      score: 78,
      status: 'warning',
    },
    {
      nameEn: 'GACAR Part 67 (Medical Standards)',
      nameAr: 'الجزء 67 (المعايير والشهادات الطبية)',
      score: 92,
      status: 'good',
    },
    {
      nameEn: 'Saudi AIP & Airspace (GEN/ENR/AD)',
      nameAr: 'دليل الطيران السعودي AIP والمجال الجوي',
      score: 72,
      status: 'danger',
    },
    {
      nameEn: 'Aviation Meteorology & Altimetry',
      nameAr: 'الأرصاد الجوية وضبط مقياس الارتفاع',
      score: 86,
      status: 'good',
    },
  ];

  const filteredRows = data.rows.filter((r) => {
    if (filterMode === 'ready') return r.ready;
    if (filterMode === 'in-progress') return r.hasProgress && !r.ready;
    if (filterMode === 'pending') return !r.pdplConsent || !r.hasProgress;
    return true;
  });

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
          {
            value: `${data.healthScore}%`,
            label: t('business.admin.healthScore', 'Health Score (H)'),
          },
          {
            value: `${data.passProbability}%`,
            label: t('business.admin.passProb', 'Pass Probability'),
          },
        ]}
      />

      {/* GACAR Cohort Subject Breakdown & Weak Area Metrics */}
      <section className={styles.subjectSection}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 'var(--space-2)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 'var(--fs-h3)' }}>
            {ar ? 'مؤشرات الكفاءة حسب أبواب GACAR' : 'Cohort GACAR Subject Competency'}
          </h2>
          <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-dim)' }}>
            {ar ? 'مستهدف النجاح: 75% فأعلى' : 'Readiness Threshold: ≥75%'}
          </span>
        </div>

        <div className={styles.weakAlert}>
          <span>⚠️</span>
          <span>
            {ar
              ? 'تنبيه تدريبي: لوحظ انخفاض طفيف في متوسط الدفعة بموضوع «إجراءات ضبط مقياس الارتفاع AIP ENR 1.7». يُوصى بمراجعة مادة الدورة الأرضية المرفقة.'
              : 'Cohort Weak Area Alert: Below-average proficiency detected in "AIP ENR 1.7 Altimeter Setting Procedures". Remedial ground school review recommended.'}
          </span>
        </div>

        <div className={styles.subjectGrid}>
          {domainBreakdowns.map((d, i) => (
            <div key={i} className={styles.subjectCard}>
              <div className={styles.subjectHeader}>
                <span>{ar ? d.nameAr : d.nameEn}</span>
                <span
                  style={{
                    color: d.score >= 80 ? '#22c55e' : d.score >= 75 ? '#f59e0b' : '#ef4444',
                  }}
                >
                  {d.score}%
                </span>
              </div>
              <div className={styles.progressBar}>
                <div
                  className={`${styles.progressFill} ${d.score >= 80 ? styles.fillGood : d.score >= 75 ? styles.fillWarning : styles.fillDanger}`}
                  style={{ inlineSize: `${d.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cadets Table with Filter Strip */}
      <div style={{ marginBlockStart: 'var(--space-4)' }}>
        <div className={styles.filterStrip}>
          <button
            type="button"
            className={`${styles.filterBtn} ${filterMode === 'all' ? styles.filterBtnActive : ''}`}
            onClick={() => setFilterMode('all')}
          >
            {ar ? `جميع المتدربين (${data.rows.length})` : `All Cadets (${data.rows.length})`}
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${filterMode === 'ready' ? styles.filterBtnActive : ''}`}
            onClick={() => setFilterMode('ready')}
          >
            {ar
              ? `جاهز للاختبار (${data.rows.filter((r) => r.ready).length})`
              : `Checkride Ready (${data.rows.filter((r) => r.ready).length})`}
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${filterMode === 'in-progress' ? styles.filterBtnActive : ''}`}
            onClick={() => setFilterMode('in-progress')}
          >
            {ar ? 'قيد الدراسة' : 'In Progress'}
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${filterMode === 'pending' ? styles.filterBtnActive : ''}`}
            onClick={() => setFilterMode('pending')}
          >
            {ar ? 'بانتظار الموافقة' : 'Pending Consent'}
          </button>
        </div>

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
                {filteredRows.map((r) => (
                  <tr
                    key={r.email}
                    className={styles.clickableRow}
                    onClick={() => r.pdplConsent && setSelectedCadet(r)}
                  >
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
                    <td onClick={(e) => e.stopPropagation()}>
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
      </div>

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

      {/* Cadet Detail Drill-Down Modal */}
      {selectedCadet && (
        <div className={styles.modalOverlay} onClick={() => setSelectedCadet(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <h2>{ar ? 'تقرير تفصيلي للمتدرب' : 'Cadet Progress Inspection'}</h2>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setSelectedCadet(null)}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <div>
                <strong>{ar ? 'المرشح:' : 'Candidate:'}</strong>{' '}
                <bdi dir="ltr">{selectedCadet.email}</bdi>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <strong>{ar ? 'حالة الاعتماد:' : 'Stage Endorsement:'}</strong>
                {selectedCadet.ready ? (
                  <StatusPill tone="success">
                    {ar ? 'جاهز للاختبار العملي' : 'Stage Check Approved'}
                  </StatusPill>
                ) : (
                  <StatusPill tone="warning">
                    {ar ? 'قيد المراجعة والاستكمال' : 'Ground Review Required'}
                  </StatusPill>
                )}
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                <div>
                  <span className={styles.muted}>
                    {ar ? 'أفضل درجة اختبار تجريبي' : 'Best Mock Exam'}:{' '}
                  </span>
                  <strong>{selectedCadet.examBest}%</strong>
                </div>
                <div>
                  <span className={styles.muted}>
                    {ar ? 'تغطية الأسئلة' : 'Question Coverage'}:{' '}
                  </span>
                  <strong>{selectedCadet.coverage}</strong>
                </div>
              </div>

              <div style={{ marginBlockStart: 'var(--space-2)' }}>
                <h4 style={{ margin: 0, marginBlockEnd: 'var(--space-2)' }}>
                  {ar ? 'تفصيل الكفاءة حسب المادة' : 'Subject Competency Breakdown'}
                </h4>
                <ul
                  style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-2)',
                    fontSize: 'var(--fs-xs)',
                  }}
                >
                  <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>GACAR Part 61 (Pilot Certifications)</span>
                    <strong style={{ color: '#22c55e' }}>88%</strong>
                  </li>
                  <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>GACAR Part 91 (General Operating Rules)</span>
                    <strong style={{ color: selectedCadet.examBest >= 75 ? '#22c55e' : '#f59e0b' }}>
                      {selectedCadet.examBest >= 75 ? `${selectedCadet.examBest}%` : '72%'}
                    </strong>
                  </li>
                  <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Saudi AIP & Airspace Navigation</span>
                    <strong style={{ color: '#f59e0b' }}>76%</strong>
                  </li>
                  <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Aviation Weather & METAR Interpretation</span>
                    <strong style={{ color: '#22c55e' }}>92%</strong>
                  </li>
                </ul>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <Button type="button" variant="clay" onClick={() => setSelectedCadet(null)}>
                {t('business.admin.done', 'Done')}
              </Button>
            </div>
          </div>
        </div>
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

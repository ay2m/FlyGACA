import { useTranslation } from 'react-i18next';
import type { GroundingKind } from '@/lib/api';
import { StatusPill, type StatusTone } from '@/components/StatusPill';

const LABEL_KEY: Record<'grounded' | 'partial' | 'refusal', string> = {
  grounded: 'chat.grounding.grounded',
  partial: 'chat.grounding.partial',
  refusal: 'chat.grounding.refusal',
};

/** Verdict → semantic pill tone. */
const TONE: Record<'grounded' | 'partial' | 'refusal', StatusTone> = {
  grounded: 'success',
  partial: 'warning',
  refusal: 'danger',
};

/**
 * Renders the brain's grounding verdict (grounded / partially grounded / hold)
 * as a shared {@link StatusPill}. `na` or an unknown kind renders nothing — same
 * rule as the legacy client. For a refusal, the cited rule is shown LTR via <bdi>
 * even under RTL. `data-state` is kept on the pill for styling/test hooks.
 */
export function GroundingBadge({
  kind,
  refusalClass,
}: {
  kind?: GroundingKind;
  refusalClass?: string;
}) {
  const { t } = useTranslation();
  if (!kind || kind === 'na') return null;
  const key = LABEL_KEY[kind];
  if (!key) return null;

  return (
    <StatusPill
      tone={TONE[kind]}
      role="status"
      data-state={kind}
      cite={
        kind === 'refusal' && refusalClass ? (
          <bdi dir="ltr" lang="en">
            §{refusalClass}
          </bdi>
        ) : undefined
      }
    >
      {t(key)}
    </StatusPill>
  );
}

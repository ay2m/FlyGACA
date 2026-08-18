import shared from './widgets.module.css';

/**
 * The tile-footer call-to-action cue — visible link text plus the hover-nudged
 * arrow. One component so the widgets can't drift apart on the pattern. The
 * `cardHoverArrow` global class hooks the RTL-aware arrow nudge in
 * widgets.module.css.
 */
export function CardCta({ label }: { label: string }) {
  return (
    <span className={`${shared.foot} cardHoverArrow`}>
      {label}
      <span className={shared.arrow} aria-hidden="true">
        →
      </span>
    </span>
  );
}

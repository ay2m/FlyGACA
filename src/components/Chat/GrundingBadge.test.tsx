import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { GrundingBadge } from './GrundingBadge';

describe('GrundingBadge', () => {
  describe('rendering', () => {
    it('renders with status role', () => {
      const { getByRole } = render(
        <GrundingBadge status="grounded" label="Grounded in GACAR §91.155" />
      );

      const badge = getByRole('status');
      expect(badge).toBeTruthy();
    });

    it('displays the label text', () => {
      const { getByText } = render(
        <GrundingBadge status="grounded" label="Grounded in GACAR §91.155" />
      );

      expect(getByText('Grounded in GACAR §91.155')).toBeTruthy();
    });

    it('sets proper aria-label for status', () => {
      const { getByRole } = render(
        <GrundingBadge status="grounded" label="Grounded" />
      );

      const badge = getByRole('status');
      expect(badge).toHaveAttribute('aria-label', 'Grounding status: grounded');
    });
  });

  describe('grounded status', () => {
    it('renders grounded badge', () => {
      const { getByRole } = render(
        <GrundingBadge status="grounded" label="Grounded" />
      );

      const badge = getByRole('status');
      expect(badge.className).toContain('grounded');
    });

    it('shows status in aria-label', () => {
      const { getByRole } = render(
        <GrundingBadge status="grounded" label="Grounded" />
      );

      const badge = getByRole('status');
      expect(badge.getAttribute('aria-label')).toContain('grounded');
    });
  });

  describe('partial status', () => {
    it('renders partial badge', () => {
      const { getByRole } = render(
        <GrundingBadge status="partial" label="Partially grounded" />
      );

      const badge = getByRole('status');
      expect(badge.className).toContain('partial');
    });

    it('shows partial status in aria-label', () => {
      const { getByRole } = render(
        <GrundingBadge status="partial" label="Partially grounded" />
      );

      const badge = getByRole('status');
      expect(badge.getAttribute('aria-label')).toContain('partial');
    });
  });

  describe('refusal status', () => {
    it('renders refusal badge', () => {
      const { getByRole } = render(
        <GrundingBadge status="refusal" label="Not grounded" />
      );

      const badge = getByRole('status');
      expect(badge.className).toContain('refusal');
    });

    it('shows refusal status in aria-label', () => {
      const { getByRole } = render(
        <GrundingBadge status="refusal" label="Not grounded" />
      );

      const badge = getByRole('status');
      expect(badge.getAttribute('aria-label')).toContain('refusal');
    });
  });

  describe('dot indicator', () => {
    it('hides dot from screen readers', () => {
      const { container } = render(
        <GrundingBadge status="grounded" label="Grounded" />
      );

      const dot = container.querySelector('[aria-hidden="true"]');
      expect(dot).toBeTruthy();
      expect(dot?.className).toContain('dot');
    });
  });

  describe('custom className', () => {
    it('applies custom className', () => {
      const { getByRole } = render(
        <GrundingBadge
          status="grounded"
          label="Grounded"
          className="custom-badge"
        />
      );

      const badge = getByRole('status');
      expect(badge.className).toContain('custom-badge');
    });
  });

  describe('ReactNode label', () => {
    it('renders label with JSX elements', () => {
      const { getByText } = render(
        <GrundingBadge
          status="grounded"
          label={<span>Grounded in <strong>§91.155</strong></span>}
        />
      );

      expect(getByText('Grounded in')).toBeTruthy();
      expect(getByText('§91.155')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('provides semantic status information', () => {
      const { getByRole } = render(
        <GrundingBadge status="grounded" label="Grounded" />
      );

      const badge = getByRole('status');
      expect(badge).toHaveAttribute('role', 'status');
      expect(badge).toHaveAttribute('aria-label');
    });

    it('maintains proper semantic structure with dot visibility toggle', () => {
      const { container, getByRole } = render(
        <GrundingBadge status="grounded" label="Grounded" />
      );

      const badge = getByRole('status');
      const dot = badge.querySelector('[aria-hidden="true"]');
      const label = badge.querySelector('span:last-child');

      expect(dot).toBeTruthy();
      expect(label?.textContent).toBe('Grounded');
      expect(dot?.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('all statuses', () => {
    const statuses = ['grounded', 'partial', 'refusal'] as const;

    statuses.forEach((status) => {
      it(`correctly labels ${status} status`, () => {
        const { getByRole } = render(
          <GrundingBadge status={status} label={`${status} badge`} />
        );

        const badge = getByRole('status');
        expect(badge.getAttribute('aria-label')).toBe(`Grounding status: ${status}`);
      });
    });
  });
});

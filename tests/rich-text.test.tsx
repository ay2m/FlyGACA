import { describe, expect, it, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { RichText } from '@/components/chat/RichText';

afterEach(cleanup);

describe('<RichText />', () => {
  it('renders bold and inline code as elements', () => {
    const { container } = render(<RichText text="see **GACAR** at `91.155` now" />);
    expect(container.querySelector('strong')?.textContent).toBe('GACAR');
    expect(container.querySelector('code')?.textContent).toBe('91.155');
  });

  it('renders unordered and ordered lists', () => {
    const { container: ul } = render(<RichText text={'- one\n- two\n- three'} />);
    expect(ul.querySelector('ul')).toBeInTheDocument();
    expect(ul.querySelectorAll('li')).toHaveLength(3);

    const { container: ol } = render(<RichText text={'1. first\n2. second'} />);
    expect(ol.querySelector('ol')).toBeInTheDocument();
    expect(ol.querySelectorAll('li')).toHaveLength(2);
  });

  it('separates paragraphs on blank lines', () => {
    const { container } = render(<RichText text={'first\n\nsecond'} />);
    expect(container.querySelectorAll('p')).toHaveLength(2);
  });

  it('renders a blockquote for the "In practice" takeaway', () => {
    const { container } = render(<RichText text={'> In practice: study Part 91.'} />);
    expect(container.querySelector('blockquote')?.textContent).toContain('In practice');
  });

  it('linkifies a cited Part inside a blockquote when a resolver is given', () => {
    const { container } = render(
      <MemoryRouter>
        <RichText text={'> See Part 91 here.'} resolveCitation={() => '/library/part-91'} />
      </MemoryRouter>,
    );
    const a = container.querySelector('blockquote a');
    expect(a).toHaveAttribute('href', '/library/part-91');
  });

  it('renders hostile HTML as inert text (no injection)', () => {
    const evil = '<script>alert(1)</script> <img src=x onerror=boom>';
    const { container } = render(<RichText text={evil} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    // The angle-bracket text survives as literal content.
    expect(screen.getByText(/alert\(1\)/)).toBeInTheDocument();
  });
});

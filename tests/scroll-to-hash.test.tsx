import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { useScrollToHash } from '@/hooks/useScrollToHash';

const scrollIntoView = vi.fn();

beforeEach(() => {
  scrollIntoView.mockClear();
  Element.prototype.scrollIntoView = scrollIntoView;
});
afterEach(cleanup);

function Page({ ready = true as unknown }: { ready?: unknown }) {
  useScrollToHash(ready);
  return <h2 id="sec-2">Section two</h2>;
}

describe('useScrollToHash', () => {
  it('scrolls the hash target into view once mounted', () => {
    render(
      <MemoryRouter initialEntries={['/guides/x#sec-2']}>
        <Page />
      </MemoryRouter>,
    );
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('does nothing without a hash', () => {
    render(
      <MemoryRouter initialEntries={['/guides/x']}>
        <Page />
      </MemoryRouter>,
    );
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('waits for ready before jumping', () => {
    const view = render(
      <MemoryRouter initialEntries={['/guides/x#sec-2']}>
        <Page ready={false} />
      </MemoryRouter>,
    );
    expect(scrollIntoView).not.toHaveBeenCalled();
    view.rerender(
      <MemoryRouter initialEntries={['/guides/x#sec-2']}>
        <Page ready={true} />
      </MemoryRouter>,
    );
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });
});

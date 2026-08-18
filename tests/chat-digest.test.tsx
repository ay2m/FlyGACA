/**
 * Chat peripheral UI that was previously uncovered:
 *  - SourcesDigest  — "Referenced in this conversation" Part chips
 *  - CrossRefChips  — "Also referenced" Part chips
 *  - ExportActions  — copy-as-Markdown / download-.md conversation actions
 * Render/interaction per source-list.test.tsx + message-actions.test.tsx.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, fireEvent, cleanup, within } from '@testing-library/react';
import { renderWithRouter } from './helpers/render';
import type { DigestPart } from '@/calc/chatSources';
import type { CrossRef } from '@/calc/chatCrossRefs';
import { SourcesDigest } from '@/components/chat/SourcesDigest';
import { CrossRefChips } from '@/components/chat/CrossRefChips';
import { ExportActions } from '@/components/chat/ExportActions';

afterEach(cleanup);

describe('SourcesDigest', () => {
  const parts: DigestPart[] = [
    { slug: 'part-61', num: '61', count: 3 },
    { slug: 'part-91', num: '91', count: 1 },
  ];

  it('renders nothing when there are no resolved parts', () => {
    const { container } = renderWithRouter(<SourcesDigest parts={[]} />);
    expect(container.querySelector('ul')).toBeNull();
  });

  it('renders a linked chip per part and shows the count only when > 1', () => {
    renderWithRouter(<SourcesDigest parts={parts} />);
    const p61 = screen.getByRole('link', { name: /Part 61/ });
    expect(p61).toHaveAttribute('href', '/library/part-61');
    expect(within(p61).getByText('3')).toBeInTheDocument(); // count badge
    const p91 = screen.getByRole('link', { name: /Part 91/ });
    expect(p91).toHaveAttribute('href', '/library/part-91');
    expect(within(p91).queryByText('1')).toBeNull(); // count of 1 is hidden
  });
});

describe('CrossRefChips', () => {
  const refs: CrossRef[] = [{ slug: 'part-1', num: '1' }];

  it('renders nothing when there are no refs', () => {
    const { container } = renderWithRouter(<CrossRefChips refs={[]} />);
    expect(container.querySelector('ul')).toBeNull();
  });

  it('links each cross-referenced part into the Library', () => {
    renderWithRouter(<CrossRefChips refs={refs} />);
    expect(screen.getByRole('link', { name: /Part 1/ })).toHaveAttribute('href', '/library/part-1');
  });
});

describe('ExportActions', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('copies the markdown to the clipboard and shows the "Copied" confirmation', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    renderWithRouter(<ExportActions markdown="# Chat" filename="chat.md" />);
    fireEvent.click(screen.getByRole('button', { name: /Copy conversation/ }));
    expect(writeText).toHaveBeenCalledWith('# Chat');

    // The label flips to "Copied" once the async clipboard write resolves.
    expect(await screen.findByRole('button', { name: /Copied/ })).toBeInTheDocument();
  });

  it('builds a blob download when Download is clicked', () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:x');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    renderWithRouter(<ExportActions markdown="# Chat" filename="chat.md" />);
    fireEvent.click(screen.getByRole('button', { name: /Download \.md/ }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:x');

    click.mockRestore();
    vi.unstubAllGlobals();
  });
});

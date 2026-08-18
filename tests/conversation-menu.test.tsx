import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import { ConversationMenu } from '@/components/chat/ConversationMenu';
import type { Conversation } from '@/calc/chat/conversations';

const convo = (over: Partial<Conversation>): Conversation => ({
  id: 'c1',
  title: 'Crosswind limits',
  messages: [{ role: 'user', text: 'what is the crosswind limit' }],
  updatedAt: Date.UTC(2026, 0, 1),
  ...over,
});

const handlers = () => ({
  onNew: vi.fn(),
  onSelect: vi.fn(),
  onDelete: vi.fn(),
  onRename: vi.fn(),
  onTogglePin: vi.fn(),
});

/** Open the native <details> history menu so its contents are interactable. */
function openHistory() {
  const summary = screen.getByText('History', { exact: false });
  fireEvent.click(summary);
}

afterEach(cleanup);

describe('ConversationMenu', () => {
  it('fires onNew from the New chat button', () => {
    const h = handlers();
    render(<ConversationMenu conversations={[]} activeId="" {...h} />);
    fireEvent.click(screen.getByText('New chat', { exact: false }));
    expect(h.onNew).toHaveBeenCalled();
  });

  it('shows the empty state and no search box when there are no conversations', () => {
    render(<ConversationMenu conversations={[]} activeId="" {...handlers()} />);
    openHistory();
    expect(screen.queryByRole('searchbox')).toBeNull();
  });

  it('selects a conversation and reports its id', () => {
    const h = handlers();
    render(<ConversationMenu conversations={[convo({})]} activeId="" {...h} />);
    openHistory();
    fireEvent.click(screen.getByText('Crosswind limits'));
    expect(h.onSelect).toHaveBeenCalledWith('c1');
  });

  it('filters by title and message text, then shows a no-match state', () => {
    const list = [
      convo({ id: 'c1', title: 'Crosswind limits', messages: [{ role: 'user', text: 'wind' }] }),
      convo({ id: 'c2', title: 'Density altitude', messages: [{ role: 'user', text: 'hot day' }] }),
    ];
    render(<ConversationMenu conversations={list} activeId="" {...handlers()} />);
    openHistory();
    const search = screen.getByRole('searchbox');

    fireEvent.change(search, { target: { value: 'density' } });
    expect(screen.queryByText('Crosswind limits')).toBeNull();
    expect(screen.getByText('Density altitude')).toBeInTheDocument();

    // Matches on message text, not just the title.
    fireEvent.change(search, { target: { value: 'hot day' } });
    expect(screen.getByText('Density altitude')).toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'nothing-here' } });
    expect(screen.queryByText('Density altitude')).toBeNull();
  });

  it('toggles pin and deletes via the row icons', () => {
    const h = handlers();
    render(<ConversationMenu conversations={[convo({})]} activeId="" {...h} />);
    openHistory();
    const row = screen.getByText('Crosswind limits').closest('li')!;
    fireEvent.click(within(row).getByLabelText('Pin', { exact: false }));
    expect(h.onTogglePin).toHaveBeenCalledWith('c1');
    fireEvent.click(within(row).getByLabelText('Delete', { exact: false }));
    expect(h.onDelete).toHaveBeenCalledWith('c1');
  });

  it('commits a rename on Enter and ignores an empty one', () => {
    const h = handlers();
    render(<ConversationMenu conversations={[convo({})]} activeId="" {...h} />);
    openHistory();
    const row = screen.getByText('Crosswind limits').closest('li')!;
    fireEvent.click(within(row).getByLabelText('Rename', { exact: false }));

    const input = within(row).getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Wind components' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(h.onRename).toHaveBeenCalledWith('c1', 'Wind components');
  });

  it('cancels a rename on Escape without calling onRename', () => {
    const h = handlers();
    render(<ConversationMenu conversations={[convo({})]} activeId="" {...h} />);
    openHistory();
    const row = screen.getByText('Crosswind limits').closest('li')!;
    fireEvent.click(within(row).getByLabelText('Rename', { exact: false }));

    const input = within(row).getByRole('textbox');
    fireEvent.change(input, { target: { value: 'discarded' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(h.onRename).not.toHaveBeenCalled();
  });

  it('rejects a whitespace-only rename', () => {
    const h = handlers();
    render(<ConversationMenu conversations={[convo({})]} activeId="" {...h} />);
    openHistory();
    const row = screen.getByText('Crosswind limits').closest('li')!;
    fireEvent.click(within(row).getByLabelText('Rename', { exact: false }));

    const input = within(row).getByRole('textbox');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(h.onRename).not.toHaveBeenCalled();
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Tab, Tabs } from '@/components/ui/Tabs';

afterEach(cleanup);

describe('Tabs', () => {
  it('renders a labelled tablist with tab semantics', () => {
    render(
      <Tabs label="Browse">
        <Tab active>Regulations</Tab>
        <Tab>Handbooks</Tab>
      </Tabs>,
    );
    expect(screen.getByRole('tablist', { name: 'Browse' })).toBeInTheDocument();
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
  });

  it('marks only the active tab and fires onClick', () => {
    const onClick = vi.fn();
    render(
      <Tabs label="Browse">
        <Tab onClick={onClick}>One</Tab>
      </Tabs>,
    );
    const tab = screen.getByRole('tab', { name: 'One' });
    expect(tab).toHaveAttribute('type', 'button');
    fireEvent.click(tab);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('appends custom classes to both container and tab', () => {
    render(
      <Tabs label="Browse" className="outer">
        <Tab className="inner">One</Tab>
      </Tabs>,
    );
    expect(screen.getByRole('tablist').className).toContain('outer');
    expect(screen.getByRole('tab').className).toContain('inner');
  });
});

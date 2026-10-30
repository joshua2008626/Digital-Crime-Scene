import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '@/components/Toast';
import { AppProvider } from '@/store/AppContext';
import { ConfirmDialog, Tabs } from '@/components/ui';
import PhishingLab from '@/pages/PhishingLab';
import Landing from '@/pages/Landing';
import Cases from '@/pages/Cases';
import { useState, type ReactElement } from 'react';

const wrap = (ui: ReactElement) => render(<MemoryRouter><ToastProvider><AppProvider>{ui}</AppProvider></ToastProvider></MemoryRouter>);

describe('UI', () => {
  it('landing page shows the product name and a call to action', () => {
    wrap(<Landing />);
    expect(screen.getByRole('heading', { level: 1, name: /digital crime scene/i })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /open a case/i }).length).toBeGreaterThan(0);
  });

  it('cases page lists all four cases and filters by search', () => {
    wrap(<Cases />);
    expect(screen.getByText('The Phantom Login')).toBeInTheDocument();
    expect(screen.getByText('The Insider Paradox')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/search cases/i), { target: { value: 'blueprint' } });
    expect(screen.queryByText('The Phantom Login')).not.toBeInTheDocument();
    expect(screen.getByText('The Missing Blueprint')).toBeInTheDocument();
  });

  it('phishing lab never renders suspicious links as anchors', () => {
    const { container } = wrap(<PhishingLab />);
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '');
    expect(hrefs.some((h) => /^https?:/i.test(h))).toBe(false);
  });

  it('tabs support arrow-key navigation', () => {
    function Demo() {
      const [v, setV] = useState('a');
      return <Tabs label="demo" value={v} onChange={setV} tabs={[{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]} />;
    }
    render(<Demo />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'A' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'B' })).toHaveAttribute('aria-selected', 'true');
  });

  it('confirm dialog closes on Escape and calls onCancel', () => {
    let cancelled = false;
    render(<ConfirmDialog open title="Sure?" body="body" confirmLabel="Yes" onConfirm={() => undefined} onCancel={() => { cancelled = true; }} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(cancelled).toBe(true);
  });
});

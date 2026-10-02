import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { QRPanel } from '../QRPanel';

describe('QRPanel Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockPayload = 'data:image/svg+xml;utf8,<svg>mock-qr</svg>';

  it('renders API-provided QR code image and countdown', () => {
    const expiresAt = new Date(Date.now() + 30 * 1000).toISOString();
    const onRefresh = vi.fn().mockResolvedValue({
      qrPayload: 'data:image/svg+xml;utf8,<svg>fresh</svg>',
      expiresAt: new Date(Date.now() + 30 * 1000).toISOString(),
      refreshIntervalSeconds: 30,
    });

    render(
      <QRPanel
        ticketId="tkt-123"
        initialQrPayload={mockPayload}
        initialExpiresAt={expiresAt}
        refreshIntervalSeconds={30}
        onRefreshRequest={onRefresh}
        status="valid"
      />
    );

    const img = screen.getByAltText(/dynamic entry barcode for ticket tkt-123/i);
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', mockPayload);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('automatically requests fresh token when countdown reaches zero', async () => {
    const expiresAt = new Date(Date.now() + 2 * 1000).toISOString();
    const freshPayload = 'data:image/svg+xml;utf8,<svg>fresh-token-123</svg>';
    const onRefresh = vi.fn().mockResolvedValue({
      qrPayload: freshPayload,
      expiresAt: new Date(Date.now() + 30 * 1000).toISOString(),
      refreshIntervalSeconds: 30,
    });

    render(
      <QRPanel
        ticketId="tkt-123"
        initialQrPayload={mockPayload}
        initialExpiresAt={expiresAt}
        refreshIntervalSeconds={30}
        onRefreshRequest={onRefresh}
        status="valid"
      />
    );

    // Fast-forward past expiry
    await act(async () => {
      vi.advanceTimersByTime(3 * 1000);
    });

    expect(onRefresh).toHaveBeenCalledWith('tkt-123');
  });

  it('shows expired, refreshing state if token refresh fails', async () => {
    const expiresAt = new Date(Date.now() + 2 * 1000).toISOString();
    const onRefresh = vi.fn().mockRejectedValue(new Error('Network error'));

    render(
      <QRPanel
        ticketId="tkt-123"
        initialQrPayload={mockPayload}
        initialExpiresAt={expiresAt}
        refreshIntervalSeconds={30}
        onRefreshRequest={onRefresh}
        status="valid"
      />
    );

    // Fast-forward past expiry to trigger failure
    await act(async () => {
      vi.advanceTimersByTime(3 * 1000);
    });

    expect(screen.getByText(/pass expired/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh pass/i })).toBeInTheDocument();
  });

  it('renders revoked and used ticket states clearly', () => {
    const expiresAt = new Date(Date.now() + 30 * 1000).toISOString();
    const onRefresh = vi.fn();

    const { rerender } = render(
      <QRPanel
        ticketId="tkt-revoked"
        initialQrPayload={mockPayload}
        initialExpiresAt={expiresAt}
        onRefreshRequest={onRefresh}
        status="revoked"
      />
    );
    expect(screen.getByText(/ticket revoked/i)).toBeInTheDocument();

    rerender(
      <QRPanel
        ticketId="tkt-used"
        initialQrPayload={mockPayload}
        initialExpiresAt={expiresAt}
        onRefreshRequest={onRefresh}
        status="used"
      />
    );
    expect(screen.getByText(/ticket redeemed/i)).toBeInTheDocument();
  });
});

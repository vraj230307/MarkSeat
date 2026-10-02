import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SeatMap } from '../SeatMap';
import { Seat } from '../../types';

describe('SeatMap Component', () => {
  const mockSeats: Seat[] = [
    { id: 's1', section: 'Orchestra', row: 'A', number: 1, price: 100, status: 'available' },
    { id: 's2', section: 'Orchestra', row: 'A', number: 2, price: 100, status: 'held' },
    { id: 's3', section: 'Orchestra', row: 'A', number: 3, price: 100, status: 'sold' },
    { id: 's4', section: 'Orchestra', row: 'A', number: 4, price: 100, status: 'available' },
  ];

  it('renders available, held, and sold states with distinct accessibility labels and styles', () => {
    render(
      <SeatMap
        seats={mockSeats}
        selectedSeatIds={[]}
        currentHold={null}
        onSeatToggle={vi.fn()}
        onHoldSeats={vi.fn()}
        onHoldExpired={vi.fn()}
        isHolding={false}
      />
    );

    const s1 = screen.getByRole('button', { name: /Seat Row A Number 1, Orchestra, \$100\. State: Available/i });
    const s2 = screen.getByRole('button', { name: /Seat Row A Number 2, Orchestra, \$100\. State: Held by another buyer/i });
    const s3 = screen.getByRole('button', { name: /Seat Row A Number 3, Orchestra, \$100\. State: Sold/i });

    expect(s1).toBeEnabled();
    expect(s2).toBeDisabled();
    expect(s3).toBeDisabled();
  });

  it('allows clicking only available seats and triggers onSeatToggle', async () => {
    const handleToggle = vi.fn();
    render(
      <SeatMap
        seats={mockSeats}
        selectedSeatIds={[]}
        currentHold={null}
        onSeatToggle={handleToggle}
        onHoldSeats={vi.fn()}
        onHoldExpired={vi.fn()}
        isHolding={false}
      />
    );

    const s1 = screen.getByRole('button', { name: /Seat Row A Number 1/i });
    await userEvent.click(s1);
    expect(handleToggle).toHaveBeenCalledWith('s1');

    // Click disabled seat
    const s3 = screen.getByRole('button', { name: /Seat Row A Number 3/i });
    await userEvent.click(s3);
    expect(handleToggle).toHaveBeenCalledTimes(1); // not called again
  });

  it('maintains selected seats state across re-renders', () => {
    const { rerender } = render(
      <SeatMap
        seats={mockSeats}
        selectedSeatIds={['s1']}
        currentHold={null}
        onSeatToggle={vi.fn()}
        onHoldSeats={vi.fn()}
        onHoldExpired={vi.fn()}
        isHolding={false}
      />
    );

    expect(screen.getByText('1 Seat Selected')).toBeInTheDocument();
    expect(screen.getByText(/subtotal: \$100/i)).toBeInTheDocument();

    // Re-render with updated seat data
    const updatedSeats = [...mockSeats];
    rerender(
      <SeatMap
        seats={updatedSeats}
        selectedSeatIds={['s1']}
        currentHold={null}
        onSeatToggle={vi.fn()}
        onHoldSeats={vi.fn()}
        onHoldExpired={vi.fn()}
        isHolding={false}
      />
    );

    expect(screen.getByText('1 Seat Selected')).toBeInTheDocument();
  });

  it('disables seat lock button when no seats are selected or isHolding is true', () => {
    const { rerender } = render(
      <SeatMap
        seats={mockSeats}
        selectedSeatIds={[]}
        currentHold={null}
        onSeatToggle={vi.fn()}
        onHoldSeats={vi.fn()}
        onHoldExpired={vi.fn()}
        isHolding={false}
      />
    );

    const lockBtn = screen.getByRole('button', { name: /lock seats/i });
    expect(lockBtn).toBeDisabled();

    rerender(
      <SeatMap
        seats={mockSeats}
        selectedSeatIds={['s1']}
        currentHold={null}
        onSeatToggle={vi.fn()}
        onHoldSeats={vi.fn()}
        onHoldExpired={vi.fn()}
        isHolding={true}
      />
    );

    expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueueModal } from '../QueueModal';
import { QueueState } from '../../types';

describe('QueueModal Component', () => {
  it('renders waiting room with randomized position and explanation', () => {
    const queueState: QueueState = {
      inQueue: true,
      position: 14,
      status: 'waiting',
      queueToken: 'qtok_123',
    };

    render(
      <QueueModal
        eventTitle="Symphony Concert"
        queueState={queueState}
        onContinue={vi.fn()}
        onLeaveQueue={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Fair Virtual Waiting Room')).toBeInTheDocument();
    expect(screen.getByText('#14')).toBeInTheDocument();
    expect(screen.getByText(/randomized queue positions are assigned by the server/i)).toBeInTheDocument();
  });

  it('renders access granted and allows entry when queue position is ready', async () => {
    const handleContinue = vi.fn();
    const readyState: QueueState = {
      inQueue: true,
      position: 1,
      status: 'ready',
      queueToken: 'qtok_123',
    };

    render(
      <QueueModal
        eventTitle="Symphony Concert"
        queueState={readyState}
        onContinue={handleContinue}
        onLeaveQueue={vi.fn()}
      />
    );

    expect(screen.getByText('Your Turn in Line Has Arrived')).toBeInTheDocument();
    expect(screen.getByText(/access granted/i)).toBeInTheDocument();

    const selectSeatsBtn = screen.getByRole('button', { name: /select seats/i });
    await userEvent.click(selectSeatsBtn);
    expect(handleContinue).toHaveBeenCalledTimes(1);
  });

  it('calls onLeaveQueue when user decides to leave waiting room', async () => {
    const handleLeave = vi.fn();
    const queueState: QueueState = {
      inQueue: true,
      position: 8,
      status: 'waiting',
      queueToken: 'qtok_123',
    };

    render(
      <QueueModal
        eventTitle="Symphony Concert"
        queueState={queueState}
        onContinue={vi.fn()}
        onLeaveQueue={handleLeave}
      />
    );

    const leaveBtn = screen.getByRole('button', { name: /leave waiting room/i });
    await userEvent.click(leaveBtn);
    expect(handleLeave).toHaveBeenCalledTimes(1);
  });
});

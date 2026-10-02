import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoadingState } from '../LoadingState';
import { EmptyState } from '../EmptyState';
import { ErrorState } from '../ErrorState';

describe('Common UI State Components', () => {
  it('LoadingState renders spinner with accessible status role', () => {
    render(<LoadingState message="Fetching seat map..." />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Fetching seat map...')).toBeInTheDocument();
  });

  it('EmptyState renders title, description, and action button', async () => {
    const handleAction = vi.fn();
    render(
      <EmptyState
        title="No Tickets Found"
        description="You have no reserved tickets."
        actionText="Browse Events"
        onAction={handleAction}
      />
    );

    expect(screen.getByText('No Tickets Found')).toBeInTheDocument();
    expect(screen.getByText('You have no reserved tickets.')).toBeInTheDocument();
    
    const btn = screen.getByRole('button', { name: /browse events/i });
    await userEvent.click(btn);
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  it('ErrorState renders alert role, message, and retry button', async () => {
    const handleRetry = vi.fn();
    render(
      <ErrorState
        title="Failed to Load Events"
        message="Gateway timeout."
        onRetry={handleRetry}
      />
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Failed to Load Events')).toBeInTheDocument();
    expect(screen.getByText('Gateway timeout.')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /try again/i });
    await userEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});

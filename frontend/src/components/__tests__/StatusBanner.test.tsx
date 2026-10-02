import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBanner } from '../StatusBanner';

describe('StatusBanner Component', () => {
  it('renders info banner with message', () => {
    render(<StatusBanner type="info" message="Information update" />);
    expect(screen.getByText('Information update')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveClass('bg-[#ece7fb]');
  });

  it('renders error banner with alert role', () => {
    render(<StatusBanner type="error" title="Payment Failed" message="Card declined" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-[#fae8ee]');
    expect(screen.getByText('Payment Failed')).toBeInTheDocument();
    expect(screen.getByText('Card declined')).toBeInTheDocument();
  });

  it('renders warning and success states', () => {
    const { rerender } = render(<StatusBanner type="warning" message="Warning alert" />);
    expect(screen.getByRole('status')).toHaveClass('bg-[#fdf0f7]');

    rerender(<StatusBanner type="success" message="Success confirmation" />);
    expect(screen.getByRole('status')).toHaveClass('bg-[#eefaf2]');
  });
});

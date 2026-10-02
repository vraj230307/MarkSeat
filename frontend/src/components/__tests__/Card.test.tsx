import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '../Card';

describe('Card Component', () => {
  it('renders default variant with children', () => {
    render(<Card>Card content</Card>);
    const card = screen.getByText('Card content');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('rounded-[8px]');
    expect(card).toHaveClass('bg-white');
  });

  it('renders highlight and muted variants', () => {
    const { rerender } = render(<Card variant="highlight">Highlight</Card>);
    expect(screen.getByText('Highlight')).toHaveClass('border-[#5c34d7]');

    rerender(<Card variant="muted">Muted</Card>);
    expect(screen.getByText('Muted')).toHaveClass('bg-[#faf8fe]');
  });
});

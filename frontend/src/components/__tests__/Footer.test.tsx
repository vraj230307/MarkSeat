import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Footer } from '../Footer';

describe('Footer Component', () => {
  it('renders strictly product name Verity and legal links', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    expect(screen.getByText('Verity')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /privacy policy/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /terms and conditions/i })).toBeInTheDocument();

    // Verify no generator or template text
    const footerText = screen.getByRole('contentinfo').textContent || '';
    expect(footerText).not.toMatch(/made with/i);
    expect(footerText).not.toMatch(/built with/i);
  });
});

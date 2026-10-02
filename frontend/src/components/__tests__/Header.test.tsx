import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Header } from '../Header';
import { AuthProvider } from '../../context/AuthContext';

describe('Header Component', () => {
  it('renders brand name Verity and navigation links', () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <Header />
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByLabelText(/verity home/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /events/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /my tickets/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /profile/i })).toBeInTheDocument();
  });

  it('toggles mobile navigation drawer on hamburger button click', async () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <Header />
        </MemoryRouter>
      </AuthProvider>
    );

    const toggleBtn = screen.getByRole('button', { name: /open main navigation menu/i });
    expect(toggleBtn).toBeInTheDocument();

    await userEvent.click(toggleBtn);
    expect(screen.getByRole('button', { name: /close main navigation menu/i })).toBeInTheDocument();
  });
});

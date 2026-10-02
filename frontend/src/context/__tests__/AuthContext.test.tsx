import { useState } from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider, useAuth } from '../AuthContext';
import { mockService } from '../../mocks/mockService';

const TestAuthConsumer = () => {
  const { user, isAuthenticated, login, verifyOtp, logout, isLoading } = useAuth();
  const [stepMessage, setStepMessage] = useState<string>('idle');

  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'LOGGED_IN' : 'LOGGED_OUT'}</div>
      <div data-testid="user-name">{user?.fullName || 'NO_USER'}</div>
      <div data-testid="loading-status">{isLoading ? 'IS_LOADING' : 'NOT_LOADING'}</div>
      <div data-testid="step-msg">{stepMessage}</div>
      <button
        onClick={async () => {
          await login('test@example.com');
          setStepMessage('OTP_SENT');
        }}
      >
        Trigger Login
      </button>
      <button
        onClick={async () => {
          await verifyOtp('123456');
          setStepMessage('VERIFIED');
        }}
      >
        Verify Code
      </button>
      <button
        onClick={async () => {
          await logout();
          setStepMessage('LOGGED_OUT');
        }}
      >
        Sign Out
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    mockService.resetMockState();
  });

  it('loads initial user profile and provides auth session state', async () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    // Initial load from mockService provides MOCK_USER after async refreshUser
    await screen.findByText('Morgan Ellis');
    expect(screen.getByTestId('auth-status')).toHaveTextContent('LOGGED_IN');
    expect(screen.getByTestId('user-name')).toHaveTextContent('Morgan Ellis');
  });

  it('handles logout and updates session to LOGGED_OUT', async () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    await screen.findByText('Morgan Ellis');
    const logoutBtn = screen.getByRole('button', { name: /sign out/i });
    await userEvent.click(logoutBtn);

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('LOGGED_OUT');
      expect(screen.getByTestId('user-name')).toHaveTextContent('NO_USER');
    });
  });

  it('handles login flow and OTP verification', async () => {
    render(
      <AuthProvider>
        <TestAuthConsumer />
      </AuthProvider>
    );

    // Wait for initial load
    await screen.findByText('Morgan Ellis');

    // Logout first
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('LOGGED_OUT');
    });

    // Trigger Login
    await userEvent.click(screen.getByRole('button', { name: /trigger login/i }));
    await screen.findByText('OTP_SENT');

    // Verify OTP
    await userEvent.click(screen.getByRole('button', { name: /verify code/i }));
    await screen.findByText('VERIFIED');

    // Now logged in
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('LOGGED_IN');
    });
  });
});

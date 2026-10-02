import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../Input';

describe('Input Component', () => {
  it('renders input with label and helper text', () => {
    render(
      <Input
        id="test-input"
        label="Full Name"
        helperText="Enter your legal name"
        placeholder="Jane Doe"
      />
    );
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByText(/enter your legal name/i)).toBeInTheDocument();
  });

  it('renders error state with accessible role="alert"', () => {
    render(
      <Input
        id="test-email"
        label="Email"
        error="Invalid email address"
      />
    );
    const input = screen.getByLabelText(/email/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/invalid email address/i);
  });

  it('handles typing and value changes', async () => {
    render(<Input id="test-field" label="Username" />);
    const input = screen.getByLabelText(/username/i);
    await userEvent.type(input, 'testuser');
    expect(input).toHaveValue('testuser');
  });

  it('handles disabled state properly', () => {
    render(<Input id="test-disabled" label="Locked" disabled />);
    const input = screen.getByLabelText(/locked/i);
    expect(input).toBeDisabled();
  });
});

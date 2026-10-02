import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Countdown } from '../Countdown';

describe('Countdown Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders countdown timer formatted as MM:SS', () => {
    const target = Date.now() + 120 * 1000; // 2 minutes in future
    render(<Countdown targetTimestamp={target} label="Time Left" />);
    
    expect(screen.getByRole('timer')).toBeInTheDocument();
    expect(screen.getByText('02:00')).toBeInTheDocument();
  });

  it('counts down each second and turns urgent in final minute', () => {
    const target = Date.now() + 65 * 1000; // 65 seconds
    render(<Countdown targetTimestamp={target} />);

    expect(screen.getByText('01:05')).toBeInTheDocument();

    // Advance 10 seconds into the final minute (< 60s)
    act(() => {
      vi.advanceTimersByTime(10 * 1000);
    });

    expect(screen.getByText('00:55')).toBeInTheDocument();
    expect(screen.getByText('(Final minute)')).toBeInTheDocument();
  });

  it('reaches zero, fires onExpire callback once, and shows expiredMessage', () => {
    const onExpire = vi.fn();
    const target = Date.now() + 3 * 1000; // 3 seconds
    render(<Countdown targetTimestamp={target} onExpire={onExpire} expiredMessage="Seat released" />);

    expect(onExpire).not.toHaveBeenCalled();

    // Advance timer past target
    act(() => {
      vi.advanceTimersByTime(4 * 1000);
    });

    expect(onExpire).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toHaveTextContent('Seat released');

    // Advance more time, onExpire should not be called again
    act(() => {
      vi.advanceTimersByTime(5 * 1000);
    });
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('cleans up interval timer on unmount', () => {
    const target = Date.now() + 60 * 1000;
    const { unmount } = render(<Countdown targetTimestamp={target} />);
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});

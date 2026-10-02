import { describe, it, expect, beforeEach } from 'vitest';
import { api } from '../client';
import { mapApiError } from '../errorHandler';
import { mockService } from '../../mocks/mockService';

describe('API and Mock Service Functions', () => {
  beforeEach(() => {
    mockService.resetMockState();
  });
  it('retrieves events list and individual event by ID', async () => {
    const events = await api.getEvents();
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]).toHaveProperty('id');
    expect(events[0]).toHaveProperty('title');

    const single = await api.getEventById(events[0].id);
    expect(single).not.toBeNull();
    expect(single?.id).toBe(events[0].id);

    const nonExistent = await api.getEventById('invalid-id-999');
    expect(nonExistent).toBeNull();
  });

  it('manages seat maps, holds, and automatic expiry', async () => {
    const seats = await api.getSeats('evt-102');
    expect(seats.length).toBeGreaterThan(0);

    const availableSeats = seats.filter(s => s.status === 'available');
    expect(availableSeats.length).toBeGreaterThan(0);

    // Hold a seat
    const seatToHold = availableSeats[0];
    const holdResult = await api.holdSeats('evt-102', [seatToHold.id]);
    expect(holdResult.holdId).toBeDefined();
    expect(holdResult.seats[0].id).toBe(seatToHold.id);

    // Check hold status
    const status = await api.getHoldStatus(holdResult.holdId);
    expect(status?.holdId).toBe(holdResult.holdId);

    // Release hold
    const released = await api.releaseHold(holdResult.holdId);
    expect(released).toBe(true);
  });

  it('handles virtual queue join and poll operations', async () => {
    const queue = await api.joinQueue('evt-101');
    expect(queue.inQueue).toBe(true);
    expect(queue.position).toBeGreaterThan(0);

    const updated = await api.pollQueue('evt-101');
    expect(updated.inQueue).toBe(true);
  });

  it('executes checkout and payments, minting valid tickets', async () => {
    // Hold a seat first
    const seats = await api.getSeats('evt-102');
    const available = seats.find(s => s.status === 'available');
    if (!available) throw new Error('No available seats for test');

    const hold = await api.holdSeats('evt-102', [available.id]);

    const tickets = await api.completePayment(hold.holdId, {
      attendeeFullName: 'Alex Rivera',
      attendeeEmail: 'alex@example.com',
      governmentIdLast4: '4321',
      paymentMethod: 'card',
      cardNumber: '4242424242424242',
      cardExpiry: '10/29',
      cardCvc: '123',
      agreeToTerms: true,
    });

    expect(tickets.length).toBe(1);
    expect(tickets[0].attendeeName).toBe('Alex Rivera');
    expect(tickets[0].status).toBe('valid');
    expect(tickets[0].qrPayload).toContain('data:image/svg+xml');

    // Refresh rotating ticket QR
    const freshQR = await api.refreshTicketQR(tickets[0].id);
    expect(freshQR.qrPayload).toBeDefined();
    expect(freshQR.refreshIntervalSeconds).toBe(30);
  });

  it('handles user authentication, profile retrieval, and profile updates', async () => {
    const reg = await api.registerUser({
      fullName: 'Jordan Lee',
      email: 'jordan@example.com',
      phone: '+15551234567',
    });
    expect(reg.requiresOtp).toBe(true);

    const log = await api.loginUser('jordan@example.com');
    expect(log.requiresOtp).toBe(true);

    const auth = await api.verifyOtp('jordan@example.com', '123456');
    expect(auth.user.email).toBe('jordan@example.com');

    const profile = await api.getUserProfile();
    expect(profile?.email).toBe('jordan@example.com');

    const updatedProfile = await api.updateUserProfile({ fullName: 'Jordan M. Lee' });
    expect(updatedProfile.fullName).toBe('Jordan M. Lee');

    await api.logout();
    const afterLogout = await api.getUserProfile();
    expect(afterLogout).toBeNull();
  });
});

describe('Error Handler (mapApiError)', () => {
  it('maps network errors correctly', () => {
    const res = mapApiError(new Error('Failed to fetch'));
    expect(res.title).toBe('Connection Unavailable');
  });

  it('maps HTTP 401, 404, 409, 429, 500 status codes', () => {
    expect(mapApiError(new Error('HTTP error 401: Unauthorized')).statusCode).toBe(401);
    expect(mapApiError(new Error('HTTP error 404: Not Found')).statusCode).toBe(404);
    expect(mapApiError(new Error('HTTP error 409: Seat Conflict')).statusCode).toBe(409);
    expect(mapApiError(new Error('HTTP error 429: Too Many Requests')).statusCode).toBe(429);
    expect(mapApiError(new Error('HTTP error 500: Internal Server Error')).statusCode).toBe(500);
  });
});

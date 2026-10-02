// In-memory mock server state manager for development and testing
import { EventItem, Seat, SeatHoldResult, Ticket, TicketQRResponse, UserProfile, QueueState, CheckoutFormData } from '../types';
import { MOCK_EVENTS, generateMockSeats, generateMockQRSvg, MOCK_USER, MOCK_INITIAL_TICKETS } from './mockData';

// Simulated server persistence
function getInitialUser(): UserProfile | null {
  if (typeof window !== 'undefined' && window.localStorage.getItem('verity_auth_logged_out') === 'true') {
    return null;
  }
  return { ...MOCK_USER };
}

let currentSeatsMap: Record<string, Seat[]> = {};
let activeHolds: Record<string, { hold: SeatHoldResult; expiresAtNum: number }> = {};
let ticketsStore: Ticket[] = [...MOCK_INITIAL_TICKETS];
let currentUserProfile: UserProfile | null = getInitialUser();
let queueSessions: Record<string, QueueState> = {};

function initSeats(eventId: string): Seat[] {
  if (!currentSeatsMap[eventId]) {
    currentSeatsMap[eventId] = generateMockSeats(eventId);
  }
  return currentSeatsMap[eventId];
}

const delay = (ms = 200) => new Promise(res => setTimeout(res, ms));

export const mockService = {
  async getEvents(): Promise<EventItem[]> {
    await delay(250);
    return [...MOCK_EVENTS];
  },

  async getEventById(id: string): Promise<EventItem | null> {
    await delay(200);
    const event = MOCK_EVENTS.find(e => e.id === id);
    return event ? { ...event } : null;
  },

  async getSeats(eventId: string): Promise<Seat[]> {
    await delay(200);
    const seats = initSeats(eventId);
    // Purge expired holds
    const now = Date.now();
    for (const [holdId, holdInfo] of Object.entries(activeHolds)) {
      if (holdInfo.expiresAtNum < now) {
        // Release seats held by expired hold
        for (const seat of seats) {
          if (holdInfo.hold.seats.some(s => s.id === seat.id) && seat.status === 'held') {
            seat.status = 'available';
            seat.heldByCurrentUser = false;
          }
        }
        delete activeHolds[holdId];
      }
    }
    return JSON.parse(JSON.stringify(seats));
  },

  async holdSeats(eventId: string, seatIds: string[]): Promise<SeatHoldResult> {
    await delay(300);
    const seats = initSeats(eventId);
    const targetSeats = seats.filter(s => seatIds.includes(s.id));

    if (targetSeats.length === 0) {
      throw new Error('No seats specified for lock.');
    }

    for (const seat of targetSeats) {
      if (seat.status !== 'available') {
        throw new Error(`Seat ${seat.row}-${seat.number} is no longer available.`);
      }
    }

    // Atomic hold for 5 minutes (300 seconds)
    const holdDurationMs = 5 * 60 * 1000;
    const expiresAt = new Date(Date.now() + holdDurationMs).toISOString();
    const holdId = `hold-${Math.random().toString(36).substring(2, 9)}`;

    for (const seat of targetSeats) {
      seat.status = 'held';
      seat.heldByCurrentUser = true;
    }

    const totalAmount = targetSeats.reduce((sum, s) => sum + s.price, 0);
    const holdResult: SeatHoldResult = {
      holdId,
      eventId,
      seats: JSON.parse(JSON.stringify(targetSeats)),
      totalAmount,
      expiresAt,
      bookingToken: `tok_signed_${Math.random().toString(36).substring(2, 12)}`,
    };

    activeHolds[holdId] = {
      hold: holdResult,
      expiresAtNum: Date.now() + holdDurationMs,
    };

    return holdResult;
  },

  async releaseHold(holdId: string): Promise<boolean> {
    await delay(150);
    const holdInfo = activeHolds[holdId];
    if (holdInfo) {
      const seats = currentSeatsMap[holdInfo.hold.eventId] || [];
      for (const seat of seats) {
        if (holdInfo.hold.seats.some(s => s.id === seat.id) && seat.status === 'held') {
          seat.status = 'available';
          seat.heldByCurrentUser = false;
        }
      }
      delete activeHolds[holdId];
      return true;
    }
    return false;
  },

  async getHoldStatus(holdId: string): Promise<SeatHoldResult | null> {
    await delay(150);
    const holdInfo = activeHolds[holdId];
    if (!holdInfo) {
      return null;
    }
    if (Date.now() > holdInfo.expiresAtNum) {
      await this.releaseHold(holdId);
      return null;
    }
    return { ...holdInfo.hold };
  },

  async joinQueue(eventId: string): Promise<QueueState> {
    await delay(300);
    // Server assigns a randomized position from queue engine
    const randomPos = Math.floor(Math.random() * 18) + 3;
    const queueState: QueueState = {
      inQueue: true,
      position: randomPos,
      status: 'waiting',
      queueToken: `qtok_${Math.random().toString(36).substring(2, 10)}`,
    };
    queueSessions[eventId] = queueState;
    return queueState;
  },

  async pollQueue(eventId: string): Promise<QueueState> {
    await delay(200);
    let state = queueSessions[eventId];
    if (!state) {
      return { inQueue: false, position: null, status: 'idle', queueToken: null };
    }
    if (state.position !== null && state.position > 1) {
      // Step forward position
      state.position = Math.max(1, state.position - Math.floor(Math.random() * 3 + 1));
      if (state.position === 1) {
        state.status = 'ready';
      }
    } else {
      state.status = 'ready';
    }
    return { ...state };
  },

  async completeCheckout(holdId: string, formData: CheckoutFormData): Promise<Ticket[]> {
    await delay(500);
    const holdInfo = activeHolds[holdId];
    if (!holdInfo) {
      throw new Error('Hold session expired or invalid. Your seats were released.');
    }
    if (Date.now() > holdInfo.expiresAtNum) {
      await this.releaseHold(holdId);
      throw new Error('Hold session expired before checkout completed. Seats were returned to pool.');
    }

    const event = MOCK_EVENTS.find(e => e.id === holdInfo.hold.eventId);
    if (!event) {
      throw new Error('Event not found.');
    }

    // Mark seats as permanently sold
    const seats = currentSeatsMap[holdInfo.hold.eventId] || [];
    for (const seat of seats) {
      if (holdInfo.hold.seats.some(s => s.id === seat.id)) {
        seat.status = 'sold';
        seat.heldByCurrentUser = false;
      }
    }

    // Server mints identity-locked tickets
    const issuedTickets: Ticket[] = holdInfo.hold.seats.map(seat => {
      const ticketId = `tkt-${Math.floor(1000 + Math.random() * 9000)}`;
      const now = Date.now();
      return {
        id: ticketId,
        ticketNumber: `VR-2026-${ticketId}-${seat.row}${seat.number}`,
        eventId: event.id,
        eventTitle: event.title,
        venue: event.venue,
        city: event.city,
        eventDate: event.date,
        eventTime: event.time,
        seatSection: seat.section,
        seatRow: seat.row,
        seatNumber: seat.number,
        attendeeName: formData.attendeeFullName,
        identityHash: `sha256:${Math.random().toString(36).substring(2)}${Math.random().toString(36).substring(2)}`,
        qrPayload: generateMockQRSvg(ticketId, now),
        issuedAt: new Date(now).toISOString(),
        expiresAt: new Date(now + 30000).toISOString(),
        refreshIntervalSeconds: 30,
        status: 'valid',
      };
    });

    ticketsStore.unshift(...issuedTickets);
    delete activeHolds[holdId];

    return issuedTickets;
  },

  async getTickets(): Promise<Ticket[]> {
    await delay(250);
    return JSON.parse(JSON.stringify(ticketsStore));
  },

  async refreshTicketQR(ticketId: string): Promise<TicketQRResponse> {
    await delay(300);
    const ticket = ticketsStore.find(t => t.id === ticketId);
    if (!ticket) {
      throw new Error('Ticket not found.');
    }
    if (ticket.status !== 'valid') {
      throw new Error(`Ticket is ${ticket.status}. Cannot refresh barcode.`);
    }

    // Server creates fresh signed token payload
    const now = Date.now();
    const freshPayload = generateMockQRSvg(ticketId, now);
    ticket.qrPayload = freshPayload;
    ticket.issuedAt = new Date(now).toISOString();
    ticket.expiresAt = new Date(now + 30000).toISOString();

    return {
      ticketId,
      qrPayload: freshPayload,
      issuedAt: ticket.issuedAt,
      expiresAt: ticket.expiresAt,
      refreshIntervalSeconds: 30,
      signatureFreshness: 'verified_active',
    };
  },

  async getUserProfile(): Promise<UserProfile | null> {
    await delay(150);
    if (typeof window !== 'undefined' && window.localStorage.getItem('verity_auth_logged_out') === 'true') {
      return null;
    }
    return currentUserProfile ? { ...currentUserProfile } : null;
  },

  async updateUserProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    await delay(250);
    if (!currentUserProfile) {
      throw new Error('No active user profile.');
    }
    currentUserProfile = {
      ...currentUserProfile,
      ...profile,
    };
    return { ...currentUserProfile };
  },

  async registerUser(data: { fullName: string; email: string; phone: string }): Promise<{ requiresOtp: boolean; email: string }> {
    await delay(300);
    return { requiresOtp: true, email: data.email };
  },

  async loginUser(email: string): Promise<{ requiresOtp: boolean; email: string }> {
    await delay(300);
    return { requiresOtp: true, email };
  },

  async verifyOtp(email: string, code: string): Promise<{ token: string; user: UserProfile }> {
    await delay(350);
    if (code === '999999') {
      throw new Error('Verification code has expired. Please request a new one.');
    }
    if (code !== '123456' && code !== '000000') {
      throw new Error('Invalid verification code. Enter 123456 for test access.');
    }

    currentUserProfile = {
      id: 'usr-9281',
      fullName: currentUserProfile?.fullName || 'Morgan Ellis',
      email,
      phone: currentUserProfile?.phone || '+1 (555) 234-8901',
      verifiedIdentity: true,
      verificationType: 'National ID Pass',
      registeredAt: currentUserProfile?.registeredAt || new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('verity_auth_logged_out');
      window.localStorage.setItem('verity_auth_token', 'jwt_mock_token_verified');
    }

    return {
      token: 'jwt_mock_token_verified',
      user: { ...currentUserProfile },
    };
  },

  async logout(): Promise<void> {
    await delay(150);
    currentUserProfile = null;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('verity_auth_logged_out', 'true');
      window.localStorage.removeItem('verity_auth_token');
    }
  },

  resetMockState(): void {
    currentSeatsMap = {};
    activeHolds = {};
    ticketsStore = [...MOCK_INITIAL_TICKETS];
    currentUserProfile = { ...MOCK_USER };
    queueSessions = {};
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('verity_auth_logged_out');
      window.localStorage.removeItem('verity_auth_token');
    }
  },
};


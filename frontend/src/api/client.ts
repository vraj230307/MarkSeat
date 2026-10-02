// API Module
// Single centralized access point for network calls.
// Base URL is configured from environment variables.
// Can seamlessly switch between mock provider and production REST backend.

import {
  EventItem,
  Seat,
  SeatHoldResult,
  QueueState,
  Ticket,
  TicketQRResponse,
  UserProfile,
  CheckoutFormData,
} from '../types';
import { mockService } from '../mocks/mockService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson?.message) {
        errorMessage = errorJson.message;
      }
    } catch {
      // Use fallback error message
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

declare global {
  interface Window {
    __MOCK_OVERRIDES__?: {
      eventsError?: boolean;
      emptyEvents?: boolean;
      seatsError?: boolean;
      ticketsError?: boolean;
      checkoutError?: boolean;
    };
  }
}

export const api = {
  async getEvents(): Promise<EventItem[]> {
    if (typeof window !== 'undefined' && window.__MOCK_OVERRIDES__?.eventsError) {
      throw new Error('Simulated network error retrieving events.');
    }
    if (typeof window !== 'undefined' && window.__MOCK_OVERRIDES__?.emptyEvents) {
      return [];
    }
    if (USE_MOCK) return mockService.getEvents();
    return request<EventItem[]>('/events');
  },

  async getEventById(id: string): Promise<EventItem | null> {
    if (USE_MOCK) return mockService.getEventById(id);
    return request<EventItem>(`/events/${id}`);
  },

  async getSeats(eventId: string): Promise<Seat[]> {
    if (typeof window !== 'undefined' && window.__MOCK_OVERRIDES__?.seatsError) {
      throw new Error('Simulated failure loading seat layout.');
    }
    if (USE_MOCK) return mockService.getSeats(eventId);
    return request<Seat[]>(`/events/${eventId}/seats`);
  },

  async holdSeats(eventId: string, seatIds: string[]): Promise<SeatHoldResult> {
    if (USE_MOCK) return mockService.holdSeats(eventId, seatIds);
    return request<SeatHoldResult>(`/events/${eventId}/hold`, {
      method: 'POST',
      body: JSON.stringify({ seatIds }),
    });
  },

  async releaseHold(holdId: string): Promise<boolean> {
    if (USE_MOCK) return mockService.releaseHold(holdId);
    return request<{ success: boolean }>(`/holds/${holdId}/release`, {
      method: 'POST',
    }).then(res => res.success);
  },

  async getHoldStatus(holdId: string): Promise<SeatHoldResult | null> {
    if (USE_MOCK) return mockService.getHoldStatus(holdId);
    return request<SeatHoldResult>(`/holds/${holdId}`);
  },

  async joinQueue(eventId: string): Promise<QueueState> {
    if (USE_MOCK) return mockService.joinQueue(eventId);
    return request<QueueState>(`/events/${eventId}/queue/join`, {
      method: 'POST',
    });
  },

  async pollQueue(eventId: string): Promise<QueueState> {
    if (USE_MOCK) return mockService.pollQueue(eventId);
    return request<QueueState>(`/events/${eventId}/queue/status`);
  },

  async completeCheckout(holdId: string, formData: CheckoutFormData): Promise<Ticket[]> {
    if (typeof window !== 'undefined' && window.__MOCK_OVERRIDES__?.checkoutError) {
      throw new Error('Payment gateway declined transaction: Card issuer rejected payment.');
    }
    if (USE_MOCK) return mockService.completeCheckout(holdId, formData);
    return request<Ticket[]>(`/checkout/${holdId}`, {
      method: 'POST',
      body: JSON.stringify(formData),
    });
  },

  async completePayment(holdId: string, formData: CheckoutFormData): Promise<Ticket[]> {
    return this.completeCheckout(holdId, formData);
  },

  async getTickets(): Promise<Ticket[]> {
    if (typeof window !== 'undefined' && window.__MOCK_OVERRIDES__?.ticketsError) {
      throw new Error('Simulated failure retrieving tickets.');
    }
    if (USE_MOCK) return mockService.getTickets();
    return request<Ticket[]>('/tickets');
  },

  async refreshTicketQR(ticketId: string): Promise<TicketQRResponse> {
    if (USE_MOCK) return mockService.refreshTicketQR(ticketId);
    return request<TicketQRResponse>(`/tickets/${ticketId}/qr/refresh`, {
      method: 'POST',
    });
  },

  async getUserProfile(): Promise<UserProfile | null> {
    if (USE_MOCK) return mockService.getUserProfile();
    return request<UserProfile>('/user/profile');
  },

  async updateUserProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    if (USE_MOCK) return mockService.updateUserProfile(profile);
    return request<UserProfile>('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    });
  },

  async registerUser(data: { fullName: string; email: string; phone: string }): Promise<{ requiresOtp: boolean; email: string }> {
    if (USE_MOCK) return mockService.registerUser(data);
    return request<{ requiresOtp: boolean; email: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async loginUser(email: string): Promise<{ requiresOtp: boolean; email: string }> {
    if (USE_MOCK) return mockService.loginUser(email);
    return request<{ requiresOtp: boolean; email: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async verifyOtp(email: string, code: string): Promise<{ token: string; user: UserProfile }> {
    if (USE_MOCK) return mockService.verifyOtp(email, code);
    return request<{ token: string; user: UserProfile }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  },

  async logout(): Promise<void> {
    if (USE_MOCK) return mockService.logout();
    await request<void>('/auth/logout', { method: 'POST' });
  },
};

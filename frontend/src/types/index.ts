export type EventStatus = 'upcoming' | 'on_sale' | 'sold_out';

export interface EventItem {
  id: string;
  title: string;
  venue: string;
  city: string;
  date: string;
  time: string;
  doorsOpenTime: string;
  priceMin: number;
  priceMax: number;
  category: string;
  description: string;
  status: EventStatus;
  requiresQueue: boolean;
}

export type SeatStatus = 'available' | 'held' | 'sold';

export interface Seat {
  id: string;
  section: string;
  row: string;
  number: number;
  price: number;
  status: SeatStatus;
  heldByCurrentUser?: boolean;
}

export interface SeatHoldResult {
  holdId: string;
  eventId: string;
  seats: Seat[];
  totalAmount: number;
  expiresAt: string; // ISO 8601 string, exactly 5 minutes from hold
  bookingToken: string; // Cryptographic booking token from API
}

export interface QueueState {
  inQueue: boolean;
  position: number | null;
  status: 'idle' | 'waiting' | 'ready';
  queueToken: string | null;
}

export interface Ticket {
  id: string;
  ticketNumber: string;
  eventId: string;
  eventTitle: string;
  venue: string;
  city: string;
  eventDate: string;
  eventTime: string;
  seatSection: string;
  seatRow: string;
  seatNumber: number;
  attendeeName: string;
  identityHash: string;
  qrPayload: string; // SVG data or API image URL provided strictly by server
  issuedAt: string;
  expiresAt: string;
  refreshIntervalSeconds: number; // e.g. 45s
  status: 'valid' | 'revoked' | 'used';
}

export interface TicketQRResponse {
  ticketId: string;
  qrPayload: string; // Provided by API only
  issuedAt: string;
  expiresAt: string;
  refreshIntervalSeconds: number;
  signatureFreshness: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  verifiedIdentity: boolean;
  verificationType: string;
  registeredAt: string;
}

export interface AuthSession {
  user: UserProfile | null;
  token: string | null;
  requiresOtp: boolean;
  pendingEmail?: string;
}

export interface CheckoutFormData {
  attendeeFullName: string;
  attendeeEmail: string;
  governmentIdLast4: string;
  paymentMethod: 'card' | 'instant_bank';
  cardNumber: string;
  cardExpiry: string;
  cardCvc: string;
  agreeToTerms: boolean;
}

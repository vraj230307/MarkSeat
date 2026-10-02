// MOCK DATA REPOSITORY
// All numbers, seats, events, and ticket payloads below are explicitly marked as mock fixtures.
// Used for development and when VITE_USE_MOCK=true.

import { EventItem, Seat, Ticket, UserProfile } from '../types';

export const MOCK_EVENTS: EventItem[] = [
  {
    id: 'evt-101',
    title: 'Metro Civic Auditorium Orchestral Suite',
    venue: 'Civic Auditorium Hall A',
    city: 'Seattle, WA',
    date: '2026-11-14',
    time: '19:30',
    doorsOpenTime: '18:30',
    priceMin: 45,
    priceMax: 120,
    category: 'Classical',
    description: 'Annual autumn performance featuring chamber pieces and selected classical compositions. Assigned seating only.',
    status: 'on_sale',
    requiresQueue: true,
  },
  {
    id: 'evt-102',
    title: 'Pacific Northwest Indoor Track Finals',
    venue: 'Cascade Regional Arena',
    city: 'Portland, OR',
    date: '2026-11-28',
    time: '13:00',
    doorsOpenTime: '11:30',
    priceMin: 30,
    priceMax: 75,
    category: 'Athletics',
    description: 'Regional championship track and field final heats. Identity verification required at ticket turnstiles.',
    status: 'on_sale',
    requiresQueue: false,
  },
  {
    id: 'evt-103',
    title: 'Downtown Contemporary Theater Repertory',
    venue: 'Mercer Arts Stage',
    city: 'Seattle, WA',
    date: '2026-12-05',
    time: '20:00',
    doorsOpenTime: '19:00',
    priceMin: 55,
    priceMax: 110,
    category: 'Theater',
    description: 'Three-act contemporary dramatic presentation. No late entry permitted once curtain rises.',
    status: 'on_sale',
    requiresQueue: true,
  },
  {
    id: 'evt-104',
    title: 'Pacific Robotics Exhibition and Keynotes',
    venue: 'Convention Center Pavilion',
    city: 'Vancouver, BC',
    date: '2026-12-18',
    time: '09:00',
    doorsOpenTime: '08:00',
    priceMin: 60,
    priceMax: 150,
    category: 'Conference',
    description: 'Technical hardware demonstrations, engineering lectures, and showcase exhibits. Badge required.',
    status: 'upcoming',
    requiresQueue: false,
  },
  {
    id: 'evt-105',
    title: 'Winter Chamber Music Ensemble',
    venue: 'Guild Recital Hall',
    city: 'Bellevue, WA',
    date: '2026-12-22',
    time: '18:00',
    doorsOpenTime: '17:15',
    priceMin: 40,
    priceMax: 85,
    category: 'Classical',
    description: 'Strings and woodwind quintet performing classical arrangements for the winter season.',
    status: 'sold_out',
    requiresQueue: false,
  },
];

// Generates an initial deterministic seat map for an event
export function generateMockSeats(eventId: string): Seat[] {
  const seats: Seat[] = [];
  const sections = [
    { name: 'Floor A', rows: ['A', 'B'], price: 120, countPerRow: 8 },
    { name: 'Mezzanine B', rows: ['C', 'D'], price: 75, countPerRow: 10 },
    { name: 'Balcony C', rows: ['E', 'F'], price: 45, countPerRow: 10 },
  ];

  // Specific deterministic sold/held seats for mock testing
  const soldIdentifiers = new Set([
    `${eventId}-Floor A-A-1`,
    `${eventId}-Floor A-A-2`,
    `${eventId}-Floor A-B-4`,
    `${eventId}-Mezzanine B-C-3`,
    `${eventId}-Mezzanine B-D-6`,
    `${eventId}-Balcony C-E-2`,
  ]);

  const heldIdentifiers = new Set([
    `${eventId}-Floor A-B-1`,
    `${eventId}-Mezzanine B-C-5`,
    `${eventId}-Balcony C-F-8`,
  ]);

  for (const sec of sections) {
    for (const r of sec.rows) {
      for (let n = 1; n <= sec.countPerRow; n++) {
        const id = `${eventId}-${sec.name}-${r}-${n}`;
        let status: 'available' | 'held' | 'sold' = 'available';
        if (soldIdentifiers.has(id)) {
          status = 'sold';
        } else if (heldIdentifiers.has(id)) {
          status = 'held';
        }

        seats.push({
          id,
          section: sec.name,
          row: r,
          number: n,
          price: sec.price,
          status,
          heldByCurrentUser: false,
        });
      }
    }
  }

  return seats;
}

// Generate valid SVG mock QR payload string provided strictly from server
export function generateMockQRSvg(ticketId: string, timestamp: number): string {
  // SVG representation of high density cryptographically rotating pass token
  const patternSeed = (ticketId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + Math.floor(timestamp / 30000)) % 16;
  
  // Return server-formatted data URL or SVG XML
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="240" height="240" fill="none">
  <rect width="240" height="240" rx="6" fill="#ffffff" stroke="#cbbfef" stroke-width="2"/>
  
  <!-- Outer Finder 1 (Top Left) -->
  <rect x="20" y="20" width="50" height="50" rx="3" fill="#0b0519"/>
  <rect x="28" y="28" width="34" height="34" rx="2" fill="#ffffff"/>
  <rect x="36" y="36" width="18" height="18" rx="1" fill="#0b0519"/>

  <!-- Outer Finder 2 (Top Right) -->
  <rect x="170" y="20" width="50" height="50" rx="3" fill="#0b0519"/>
  <rect x="178" y="28" width="34" height="34" rx="2" fill="#ffffff"/>
  <rect x="186" y="36" width="18" height="18" rx="1" fill="#0b0519"/>

  <!-- Outer Finder 3 (Bottom Left) -->
  <rect x="20" y="170" width="50" height="50" rx="3" fill="#0b0519"/>
  <rect x="28" y="178" width="34" height="34" rx="2" fill="#ffffff"/>
  <rect x="36" y="186" width="18" height="18" rx="1" fill="#0b0519"/>

  <!-- Rotating Token Data Cells -->
  <g fill="#0b0519">
    <rect x="85" y="25" width="12" height="12"/>
    <rect x="105" y="25" width="12" height="12"/>
    <rect x="125" y="25" width="12" height="12"/>
    <rect x="145" y="25" width="12" height="12"/>
    
    <rect x="85" y="45" width="12" height="12"/>
    <rect x="115" y="45" width="12" height="12"/>
    <rect x="135" y="45" width="12" height="12"/>
    
    <rect x="25" y="85" width="12" height="12"/>
    <rect x="45" y="85" width="12" height="12"/>
    <rect x="65" y="85" width="12" height="12"/>
    <rect x="85" y="85" width="12" height="12"/>
    <rect x="105" y="85" width="12" height="12"/>
    <rect x="125" y="85" width="12" height="12"/>
    <rect x="145" y="85" width="12" height="12"/>
    <rect x="165" y="85" width="12" height="12"/>
    <rect x="185" y="85" width="12" height="12"/>
    <rect x="205" y="85" width="12" height="12"/>

    <rect x="25" y="105" width="12" height="12"/>
    <rect x="55" y="105" width="12" height="12"/>
    <rect x="75" y="105" width="12" height="12"/>
    <rect x="95" y="105" width="12" height="12"/>
    <rect x="115" y="105" width="12" height="12"/>
    <rect x="135" y="105" width="12" height="12"/>
    <rect x="155" y="105" width="12" height="12"/>
    <rect x="175" y="105" width="12" height="12"/>
    <rect x="195" y="105" width="12" height="12"/>

    <rect x="35" y="125" width="12" height="12"/>
    <rect x="65" y="125" width="12" height="12"/>
    <rect x="85" y="125" width="12" height="12"/>
    <rect x="105" y="125" width="12" height="12"/>
    <rect x="125" y="125" width="12" height="12"/>
    <rect x="145" y="125" width="12" height="12"/>
    <rect x="165" y="125" width="12" height="12"/>
    <rect x="195" y="125" width="12" height="12"/>

    <rect x="25" y="145" width="12" height="12"/>
    <rect x="55" y="145" width="12" height="12"/>
    <rect x="85" y="145" width="12" height="12"/>
    <rect x="115" y="145" width="12" height="12"/>
    <rect x="145" y="145" width="12" height="12"/>
    <rect x="175" y="145" width="12" height="12"/>
    <rect x="205" y="145" width="12" height="12"/>

    <rect x="85" y="175" width="12" height="12"/>
    <rect x="105" y="175" width="12" height="12"/>
    <rect x="125" y="175" width="12" height="12"/>
    <rect x="155" y="175" width="12" height="12"/>
    <rect x="185" y="175" width="12" height="12"/>

    <rect x="95" y="195" width="12" height="12"/>
    <rect x="115" y="195" width="12" height="12"/>
    <rect x="135" y="195" width="12" height="12"/>
    <rect x="165" y="195" width="12" height="12"/>
    <rect x="195" y="195" width="12" height="12"/>

    <!-- Dynamic seed offset indicator square -->
    <rect x="${85 + patternSeed * 5}" y="115" width="14" height="14" fill="#5c34d7"/>
  </g>
</svg>
`)}`;
}

export const MOCK_USER: UserProfile = {
  id: 'usr-9281',
  fullName: 'Morgan Ellis',
  email: 'morgan.ellis@example.com',
  phone: '+1 (555) 234-8901',
  verifiedIdentity: true,
  verificationType: 'Government Photo ID',
  registeredAt: '2026-08-12T14:22:00Z',
};

export const MOCK_INITIAL_TICKETS: Ticket[] = [
  {
    id: 'tkt-8821',
    ticketNumber: 'VR-2026-8821-A3',
    eventId: 'evt-101',
    eventTitle: 'Metro Civic Auditorium Orchestral Suite',
    venue: 'Civic Auditorium Hall A',
    city: 'Seattle, WA',
    eventDate: '2026-11-14',
    eventTime: '19:30',
    seatSection: 'Floor A',
    seatRow: 'A',
    seatNumber: 3,
    attendeeName: 'Morgan Ellis',
    identityHash: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    qrPayload: generateMockQRSvg('tkt-8821', Date.now()),
    issuedAt: new Date(Date.now() - 10000).toISOString(),
    expiresAt: new Date(Date.now() + 20000).toISOString(),
    refreshIntervalSeconds: 30,
    status: 'valid',
  },
  {
    id: 'tkt-8822',
    ticketNumber: 'VR-2026-8822-D4',
    eventId: 'evt-102',
    eventTitle: 'Pacific Northwest Indoor Track Finals',
    venue: 'Cascade Regional Arena',
    city: 'Portland, OR',
    eventDate: '2026-11-28',
    eventTime: '13:00',
    seatSection: 'Mezzanine B',
    seatRow: 'D',
    seatNumber: 4,
    attendeeName: 'Morgan Ellis',
    identityHash: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    qrPayload: generateMockQRSvg('tkt-8822', Date.now()),
    issuedAt: new Date(Date.now() - 15000).toISOString(),
    expiresAt: new Date(Date.now() + 15000).toISOString(),
    refreshIntervalSeconds: 30,
    status: 'valid',
  },
];

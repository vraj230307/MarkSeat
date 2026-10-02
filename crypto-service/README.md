# FairPass / MarkSeat — Crypto & Verification Layer (Member 4 Scope)

Standalone microservice providing JWT identity-locked ticketing, rotating TOTP QR codes, tamper-evident hash chain auditing, and venue gate verification.

---

## 🏛️ Architecture Overview

```
                      ┌──────────────────────────────────┐
                      │   FairPass / MarkSeat Engine    │
                      └────────────────┬─────────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            │                                                     │
            ▼                                                     ▼
 [Risk Engine (Port 3001)]                           [Crypto Service (Port 3000)]
┌──────────────────────────┐                        ┌────────────────────────────┐
│ Black-Market Inspector   ├───────────────────────►│ POST /tickets/revoke       │
└──────────────────────────┘  Trigger Scalper       └─────────────┬──────────────┘
                              Revocation Notice                   │
                                                                  ▼
                                                    ┌────────────────────────────┐
                                                    │ Tamper-Evident Hash Chain  │
                                                    │ SHA-256 Chained Blocks     │
                                                    └────────────────────────────┘
```

---

## 🚀 Quick Start & Running

### 1. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Ensure `.env` contains:
```ini
PORT=3000
JWT_SECRET=8f4b29a1e03c7d6e5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f
TOTP_STEP_SECONDS=30
TOTP_WINDOW=1
DB_PATH=./fairpass.sqlite
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:5173
```

### 2. Install & Seed
```bash
npm install
npm run seed
```

### 3. Start the Crypto Service
```bash
npm start
```
The server starts listening on `http://localhost:3000`.

### 4. Run Test Suite
```bash
npm test
```

---

## 📡 API Endpoint Reference

### 1. Ticket Revocation Endpoint (Called by Risk Engine)
`POST /tickets/revoke`

**Request Body:**
```json
{
  "event_name": "Taylor Swift Eras Tour / Premier Concert",
  "section": "Sec 112",
  "row": "Row J",
  "seat_number": "Seat 14"
}
```

**Response Body (HTTP 200):**
```json
{
  "status": "REVOKED",
  "message": "Ticket successfully invalidated in ticketing system database.",
  "revocation_timestamp": "2026-10-02T16:05:00.000Z",
  "ticket_details": {
    "event_name": "Taylor Swift Eras Tour / Premier Concert",
    "section": "Sec 112",
    "row": "Row J",
    "seat_number": "Seat 14"
  }
}
```

---

### 2. Gate Verification Endpoint
`POST /verify-gate-scan`

**Request Body:**
```json
{
  "ticket_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "totp_code": "847291",
  "scanned_email": "buyer@example.com"
}
```

**Response Body (ACCEPTED):**
```json
{
  "status": "ACCEPTED",
  "reason": "Gate verification passed all 3 security checks.",
  "details": {
    "ticket_id": "tkt_12345",
    "event_name": "IND vs PAK T20",
    "section": "Sec 112",
    "row": "Row J",
    "seat_number": "Seat 14"
  }
}
```

---

### 3. Ticket Management Endpoints
- `POST /issue-ticket`: Issues a signed, identity-locked ticket.
- `GET /ticket-qr/:ticketId`: Returns fresh rotating QR code image (Base64) and current TOTP code.
- `GET /tickets/revoked/feed`: Lists recently revoked scalper tickets.

---

### 4. Admin Dashboard Endpoint
`GET /dashboard/stats`

Returns live metrics and hash chain verification status:
```json
{
  "tickets_sold": 3,
  "tickets_revoked": 1,
  "total_booking_attempts": 12,
  "requests_processed": 39,
  "suspicious_sessions_flagged": 1,
  "seat_conflicts_prevented": 2,
  "oversold_tickets": 0,
  "hash_chain_status": {
    "is_valid": true,
    "total_blocks": 12,
    "tampered_block_index": null,
    "message": "All 12 blocks verified successfully. Hash chain is 100% intact."
  }
}
```

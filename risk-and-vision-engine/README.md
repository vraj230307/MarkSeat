# FairPass / MarkSeat — AI Risk & Verification Engine

Standalone backend module (Member 3 scope) providing real-time bot risk assessment, visual verification challenges, and black-market ticket resale detection using **Gemini 2.5 Flash** and rule-based behavioral telemetry analysis.

---

## 🏛️ System Architecture Overview

```
                          ┌────────────────────────┐
                          │   Client / Frontend    │
                          └───────────┬────────────┘
                                      │
              ┌───────────────────────┴───────────────────────┐
              │                                               │
              ▼                                               ▼
   [SYSTEM A: Real-Time Risk Engine]               [SYSTEM B: Vision Inspector]
 ┌──────────────────────────────────┐            ┌──────────────────────────────┐
 │ POST /risk/analyze-session       │            │ POST /inspector/analyze-     │
 └────────────────┬─────────────────┘            │      listing                 │
                  │                              └──────────────┬───────────────┘
                  ▼                                             │
    ┌──────────────────────────┐                                ▼
    │  Threshold Rule Filter   │                      ┌───────────────────┐
    │  (Fast, no AI overhead)  │                      │ Gemini 2.5 Flash  │
    └─────────────┬────────────┘                      │ Vision Model      │
                  │                                   └─────────┬─────────┘
     ┌────────────┴────────────┐                                │
     ▼                         ▼                                ▼
[2+ Violations]          [0-1 Violations]               ┌───────────────────┐
Immediate BLOCKED      Borderline Session               │ Scalper Listing?  │
                               │                        └─────────┬─────────┘
                               ▼                                  │
                     ┌───────────────────┐               ┌────────┴────────┐
                     │ Gemini 2.5 Flash  │               ▼                 ▼
                     │ Reasoning Layer   │            [TRUE]            [FALSE]
                     └─────────┬─────────┘         Trigger Revocation   Log Clean
                               │                   Service (POST)       Resale
         ┌─────────────────────┼────────────────────┐
         ▼                     ▼                    ▼
     [ALLOWED]             [BLOCKED]       [CHALLENGE_REQUIRED]
                                                    │
                                                    ▼
                                           ┌─────────────────┐
                                           │ Dynamic Visual  │
                                           │ Challenge (60s) │
                                           └─────────────────┘
```

---

## 🚀 Quick Start & Installation

### 1. Environment Configuration
Copy `.env.example` to `.env` and insert your Gemini API Key:

```bash
cp .env.example .env
```

Ensure your `.env` contains:

```ini
GEMINI_API_KEY=your_gemini_api_key_here
MAX_ACTIONS_PER_MIN=60
MIN_CLICK_INTERVAL_MS=100
MAX_SEATS_SELECTED_BURST=10
MAX_SEAT_CHANGES_WINDOW=5
MAX_FAILED_ATTEMPTS=5
MIN_SESSION_DURATION_MS=2000
REPEATED_ACTION_THRESHOLD=3
CHALLENGE_EXPIRY_SECONDS=60
TICKET_SERVICE_REVOKE_URL=http://localhost:3001/tickets/revoke
PORT=3001
TARGET_BOOKING_URL=http://localhost:3001/demo-booking
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Server
```bash
npm start
```
The server will start at `http://localhost:3001`.

---

## 🛑 Tiered Rate Limiting & Exponential Backoff

All rate limits are **fully configurable via environment variables** and segmented into three security tiers:

| Tier | Target Endpoints | Rate Limit Threshold | Strategy / Backoff |
| :--- | :--- | :--- | :--- |
| **Tier 1: Authentication** | `/auth/login`, `/auth/signup`, `/auth/password-reset` | `AUTH_MAX_REQUESTS_PER_WINDOW` (default 5 req / 15 mins) | **Per-IP + Per-Account** tracking with **Exponential Backoff** (`2s`, `4s`, `8s`, `16s`... up to 5 mins) |
| **Tier 2: Public Endpoints** | `/risk/analyze-session`, `/risk/generate-challenge`, `/inspector/analyze-listing` | `PUBLIC_MAX_REQUESTS_PER_WINDOW` (default 60 req / min) | Standard sliding window per IP |
| **Tier 3: Authenticated Actions** | `/risk/verify-challenge`, `/inspector/revocation-log` | `AUTHED_MAX_REQUESTS_PER_WINDOW` (default 200 req / min) | User/Token/IP sliding window |

---

## 📡 API Endpoint Reference

### 0. Authentication Endpoints (`/auth`) — Stricter Tier + Exponential Backoff

#### `POST /auth/login`
User login endpoint protected by per-IP and per-account rate tracking with exponential backoff delay calculation.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "mySecurePassword"
}
```

**HTTP 429 Too Many Requests Response (When Backoff Enforced):**
```json
{
  "error": "Too Many Requests",
  "message": "Authentication rate limit exceeded. Exponential backoff delay enforced (4s).",
  "tier": "stricter_authentication",
  "limited_by": "per_ip_and_per_account",
  "retry_after_seconds": 4,
  "backoff_delay_ms": 4000,
  "current_attempts": 6,
  "threshold_limit": 5
}
```

#### `POST /auth/signup`
User registration endpoint protected by auth rate limiter.

#### `POST /auth/password-reset`
Password reset request endpoint protected by auth rate limiter.

---

### 1. Real-Time Risk Engine (`/risk`)

#### `POST /risk/analyze-session`
Analyzes session behavior object against rule-based thresholds and Gemini 2.5 Flash reasoning layer.

**Request Body:**
```json
{
  "session_id": "sess_89421",
  "requests_per_minute": 45,
  "time_between_clicks_ms": [180, 220, 310, 190],
  "seats_selected_count": 3,
  "rapid_seat_changes": 2,
  "failed_booking_attempts": 1,
  "session_duration_ms": 12500,
  "repeated_action_count": 1
}
```

**Unified Response Schema:**
```json
{
  "session_id": "sess_89421",
  "verdict": "ALLOWED",
  "reason": "session_passed_thresholds",
  "challenge_id": null,
  "details": {
    "threshold_violations": [],
    "gemini_verdict": null
  }
}
```

*Verdicts:*
- `"ALLOWED"`: Session pattern is clean or verified human by Gemini.
- `"BLOCKED"`: Immediate block due to 2+ threshold violations or Gemini bot assessment.
- `"CHALLENGE_REQUIRED"`: Gemini marked session as uncertain; `challenge_id` generated.

---

#### `POST /risk/generate-challenge`
Generates dynamic visual question based on seat map image using Gemini Vision.

**Request Body:**
```json
{
  "seat_map_image": "base64_string_here",
  "mime_type": "image/png"
}
```

**Response Schema:**
```json
{
  "question": "How many occupied (red) seats are in Row B?",
  "challenge_id": "ch_7a9f8b2c-..."
}
```

---

#### `POST /risk/verify-challenge`
Verifies user answer against server-stored challenge answer (expires after 60 seconds).

**Request Body:**
```json
{
  "challenge_id": "ch_7a9f8b2c-...",
  "submitted_answer": "3"
}
```

**Response Schema:**
```json
{
  "passed": true,
  "reason": "Verification successful."
}
```

---

### 2. Black-Market Ticket Inspector (`/inspector`)

#### `POST /inspector/analyze-listing`
Inspects social media resale screenshot for scalper markups and triggers automatic revocation if scalped.

**Request:** `multipart/form-data` with `image` file OR JSON `{ "image": "base64_string" }`

**Response Schema:**
```json
{
  "is_black_market_listing": true,
  "event_name": "Taylor Swift - The Eras Tour",
  "section": "Sec 112",
  "row": "Row J",
  "seat_number": "Seat 14",
  "asked_price": 750,
  "face_value_estimate": 120,
  "reasoning": "Ticket is listed at $750 vs $120 face value markup.",
  "revocation_attempt": {
    "id": "rev_12345",
    "status": "SUCCESS",
    "response": { "status": "REVOKED" }
  }
}
```

---

#### `GET /inspector/revocation-log`
Queries all past ticket revocation trigger attempts and outcomes.

**Response Schema:**
```json
{
  "total_attempts": 1,
  "logs": [
    {
      "id": "rev_12345",
      "timestamp": "2026-10-02T14:50:00.000Z",
      "ticket": { "event_name": "...", "section": "...", "row": "...", "seat_number": "..." },
      "status": "SUCCESS"
    }
  ]
}
```

---

## 🧪 Test Scripts & Verification

### 1. Risk Engine Test Suite
Runs 6 session scenarios (Clearly Human, Bot Bursts, Seat Spinners, Borderline Patterns, Hesitant Humans):
```bash
npm run test:risk
```

### 2. Inspector Test Suite
Inspects sample scalper vs legitimate resale screenshots and verifies ticket revocation logs:
```bash
npm run test:inspector
```

### 3. Rate Limiter Test Suite
Verifies tiered rate limits and exponential backoff on auth, public, and authed routes:
```bash
npm run test:ratelimit
```

### 4. Puppeteer Bot Attack Simulator
Simulates rapid high-frequency programmatic script execution against the live demo booking page:
```bash
npm run simulate:bot
```

---

## 📂 Project Structure

```
risk-and-vision-engine/
├── src/
│   ├── config/
│   │   ├── env.js
│   │   └── gemini.js
│   ├── services/
│   │   ├── thresholdService.js
│   │   ├── geminiRiskService.js
│   │   ├── challengeService.js
│   │   └── visionInspectorService.js
│   ├── routes/
│   │   ├── riskRoutes.js
│   │   └── inspectorRoutes.js
│   └── server.js
├── scripts/
│   ├── test-risk-engine.js
│   ├── test-inspector.js
│   └── bot-simulator.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 🛡️ Telemetry & Threshold Reference

| Metric | Threshold | Bot Anomaly Signal |
| :--- | :--- | :--- |
| Reaction Time | `< 100ms` | Instantaneous actions (`< 150ms`) |
| Click Variance | `stdDev < 10ms` | Uniform clockwork timing |
| Actions / Min | `> 60 req/min` | High-frequency polling loops |
| Seat Selection Burst | `> 10 seats` | Rapid hoarding / seat spinning |
| Failed Attempts | `> 5 attempts` | Automated brute-force / payload loops |
| Session Duration | `< 2000ms` | Instant script checkout workflows |

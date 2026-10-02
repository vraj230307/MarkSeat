# Verity Frontend Complete Test Inventory

This inventory documents every route, page, component, context, and API/service function in the Verity frontend. Every item below will be verified and reported with pass/fail evidence in the final test report.

## 1. Routes (in `src/App.tsx`)
1. `ROUTE-ROOT`: `/` (Redirects to `/events`)
2. `ROUTE-EVENTS`: `/events` (EventListPage)
3. `ROUTE-EVENT-DETAIL`: `/events/:id` (EventDetailPage)
4. `ROUTE-CHECKOUT`: `/checkout` (CheckoutPage)
5. `ROUTE-TICKETS`: `/tickets` (TicketsPage)
6. `ROUTE-REGISTER`: `/register` (RegisterPage)
7. `ROUTE-LOGIN`: `/login` (LoginPage)
8. `ROUTE-VERIFY-OTP`: `/verify-otp` (OtpPage)
9. `ROUTE-PROFILE`: `/profile` (ProfilePage)
10. `ROUTE-PRIVACY`: `/privacy` (PrivacyPage)
11. `ROUTE-TERMS`: `/terms` (TermsPage)
12. `ROUTE-404`: `*` (NotFoundPage)

## 2. Pages (in `src/pages/`)
1. `PAGE-EVENT-LIST`: `EventListPage.tsx`
2. `PAGE-EVENT-DETAIL`: `EventDetailPage.tsx`
3. `PAGE-CHECKOUT`: `CheckoutPage.tsx`
4. `PAGE-TICKETS`: `TicketsPage.tsx`
5. `PAGE-REGISTER`: `RegisterPage.tsx`
6. `PAGE-LOGIN`: `LoginPage.tsx`
7. `PAGE-OTP`: `OtpPage.tsx`
8. `PAGE-PROFILE`: `ProfilePage.tsx`
9. `PAGE-PRIVACY`: `PrivacyPage.tsx`
10. `PAGE-TERMS`: `TermsPage.tsx`

## 3. Components (in `src/components/`)
1. `COMP-BUTTON`: `Button.tsx` (Variants: primary, secondary, accent, outline, ghost; Sizes: sm, md, lg; States: disabled, loading)
2. `COMP-INPUT`: `Input.tsx` (States: default, error, disabled, helper text)
3. `COMP-CARD`: `Card.tsx` (Variants: default, highlight, muted)
4. `COMP-STATUS-BANNER`: `StatusBanner.tsx` (Types: info, warning, error, success)
5. `COMP-COUNTDOWN`: `Countdown.tsx` (Normal, urgent <= 60s, expired state, onExpire callback, cleanup)
6. `COMP-QRPANEL`: `QRPanel.tsx` (API-rendered SVG/data QR, 30s countdown bar, manual sync, expired/stale state)
7. `COMP-SEATMAP`: `SeatMap.tsx` (Sections, rows, multi-factor states: available, selected, temporary hold, sold, selection persistence)
8. `COMP-HEADER`: `Header.tsx` (Desktop nav, mobile hamburger drawer, brand mark, auth state)
9. `COMP-FOOTER`: `Footer.tsx` (Product name, Privacy Policy link, Terms link)
10. `COMP-LOADING-STATE`: `LoadingState.tsx` (Accessible spinner with aria-live)
11. `COMP-EMPTY-STATE`: `EmptyState.tsx` (Empty icon, description, optional CTA button)
12. `COMP-ERROR-STATE`: `ErrorState.tsx` (Alert role, message, retry action)
13. `COMP-QUEUE-MODAL`: `QueueModal.tsx` (Dialog role, randomized position, waiting room, ready state, exit)
14. `COMP-META-TAGS`: `MetaTags.tsx` (Route document title, meta description, canonical link)

## 4. Contexts (in `src/context/`)
1. `CTX-AUTH`: `AuthContext.tsx` (`AuthProvider`, `useAuth` hook, login, register, verifyOtp, logout, refreshUser)

## 5. API Module Functions (in `src/api/client.ts` and `src/api/errorHandler.ts`)
1. `API-GET-EVENTS`: `api.getEvents()`
2. `API-GET-EVENT-BY-ID`: `api.getEventById(id)`
3. `API-GET-SEATS`: `api.getSeats(eventId)`
4. `API-HOLD-SEATS`: `api.holdSeats(eventId, seatIds)`
5. `API-RELEASE-HOLD`: `api.releaseHold(holdId)`
6. `API-GET-HOLD-STATUS`: `api.getHoldStatus(holdId)`
7. `API-JOIN-QUEUE`: `api.joinQueue(eventId)`
8. `API-POLL-QUEUE`: `api.pollQueue(eventId)`
9. `API-COMPLETE-CHECKOUT`: `api.completeCheckout(holdId, formData)`
10. `API-COMPLETE-PAYMENT`: `api.completePayment(holdId, formData)`
11. `API-GET-TICKETS`: `api.getTickets()`
12. `API-REFRESH-QR`: `api.refreshTicketQR(ticketId)`
13. `API-GET-USER-PROFILE`: `api.getUserProfile()`
14. `API-UPDATE-USER-PROFILE`: `api.updateUserProfile(profile)`
15. `API-REGISTER-USER`: `api.registerUser(data)`
16. `API-LOGIN-USER`: `api.loginUser(email)`
17. `API-VERIFY-OTP`: `api.verifyOtp(email, code)`
18. `API-LOGOUT`: `api.logout()`
19. `API-ERROR-HANDLER`: `mapApiError(error, fallback)`

## 6. Mock Service Layer (in `src/mocks/mockService.ts`)
1. `MOCK-GET-EVENTS`: `mockService.getEvents()`
2. `MOCK-GET-EVENT-BY-ID`: `mockService.getEventById(id)`
3. `MOCK-GET-SEATS`: `mockService.getSeats(eventId)`
4. `MOCK-HOLD-SEATS`: `mockService.holdSeats(eventId, seatIds)`
5. `MOCK-RELEASE-HOLD`: `mockService.releaseHold(holdId)`
6. `MOCK-GET-HOLD-STATUS`: `mockService.getHoldStatus(holdId)`
7. `MOCK-JOIN-QUEUE`: `mockService.joinQueue(eventId)`
8. `MOCK-POLL-QUEUE`: `mockService.pollQueue(eventId)`
9. `MOCK-COMPLETE-CHECKOUT`: `mockService.completeCheckout(holdId, formData)`
10. `MOCK-GET-TICKETS`: `mockService.getTickets()`
11. `MOCK-REFRESH-QR`: `mockService.refreshTicketQR(ticketId)`
12. `MOCK-GET-USER-PROFILE`: `mockService.getUserProfile()`
13. `MOCK-UPDATE-USER-PROFILE`: `mockService.updateUserProfile(profile)`
14. `MOCK-REGISTER-USER`: `mockService.registerUser(data)`
15. `MOCK-LOGIN-USER`: `mockService.loginUser(email)`
16. `MOCK-VERIFY-OTP`: `mockService.verifyOtp(email, code)`
17. `MOCK-LOGOUT`: `mockService.logout()`

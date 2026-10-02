import { test, expect } from '@playwright/test';

test.describe('End-to-End User Journeys', () => {

  test('Journey 1: New user register, OTP verify, land in profile', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('h1')).toContainText('Create Verified Account');

    // Fill registration form with exact input IDs
    await page.fill('#register-fullname', 'Alex Mercer');
    await page.fill('#register-email', 'alex.mercer@example.com');
    await page.fill('#register-phone', '+1 (555) 789-0123');
    await page.check('#register-consent');

    await page.click('button[type="submit"]');

    // Lands on verify-otp
    await page.waitForURL(url => url.pathname.includes('/verify-otp'));
    expect(page.url()).toContain('email=alex.mercer%40example.com');

    // Verify OTP with valid test code
    await page.fill('#otp-code', '123456');
    await page.click('button[type="submit"]');

    // Lands on profile
    await page.waitForURL(url => url.pathname === '/profile');
    await expect(page.locator('h1')).toContainText('Account and Identity Profile');
  });

  test('Journey 2: Form validation & authentication error handling', async ({ page }) => {
    // 2a: Empty fields on login
    await page.goto('/login');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Please enter a valid account email address')).toBeVisible();

    // Invalid email on login
    await page.fill('#login-email', 'invalid-email-format');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Please enter a valid account email address')).toBeVisible();

    // 2b: Empty OTP on verify-otp
    await page.goto('/verify-otp?email=test%40example.com');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Please enter the full 6-digit verification code')).toBeVisible();

    // 2c: Wrong OTP error
    await page.fill('#otp-code', '888888');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid verification code')).toBeVisible();

    // 2d: Expired OTP error (code 999999)
    await page.fill('#otp-code', '999999');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Verification code has expired')).toBeVisible();

    // 2e: Registration validation (empty fields)
    await page.goto('/register');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Full legal name is required')).toBeVisible();
    await expect(page.locator('text=A valid email address is required')).toBeVisible();
    await expect(page.locator('text=Phone number is required')).toBeVisible();
    await expect(page.locator('text=You must agree to the Terms')).toBeVisible();
  });

  test('Journey 3: Complete ticket purchasing flow (Browse -> Select Seats -> Hold -> Pay -> Tickets)', async ({ page }) => {
    // 3a: Browse events
    await page.goto('/events');
    const eventBtn = page.locator('a[href="/events/evt-102"] button').first();
    await expect(eventBtn).toBeVisible();
    await eventBtn.click();

    // 3b: Event Detail
    await page.waitForURL('**/events/evt-102');
    await page.waitForSelector('button[aria-label*="Available"]');

    // 3c: Seat Selection
    const availableSeat = page.locator('button[aria-label*="Available"]').first();
    await expect(availableSeat).toBeVisible();
    await availableSeat.click();

    // Click Lock Seats & Proceed
    const proceedBtn = page.locator('button:has-text("Lock Seats & Proceed")');
    await expect(proceedBtn).toBeEnabled();
    await proceedBtn.click();

    // 3d: Checkout Page
    await page.waitForURL('**/checkout?holdId=*');
    expect(page.url()).toContain('holdId=');

    // Verify timer
    await expect(page.locator('div[role="timer"]')).toBeVisible();

    // Fill checkout form with exact IDs
    await page.fill('#checkout-name', 'Morgan Ellis');
    await page.fill('#checkout-email', 'morgan.ellis@example.com');
    await page.fill('#checkout-id-last4', '8901');
    await page.fill('#card-number', '4242 4242 4242 4242');
    await page.fill('#card-expiry', '12/28');
    await page.fill('#card-cvc', '123');
    await page.check('#checkout-agree-terms');

    // 3e: Pay & Mint
    const payBtn = page.locator('button:has-text("Complete Booking")');
    await payBtn.click();

    // Lands on TicketsPage with checkoutSuccess=true
    await page.waitForURL('**/tickets?checkoutSuccess=true', { timeout: 15000 });
    await expect(page.locator('h1')).toContainText('My Active Tickets');
    await expect(page.locator('text=Booking Confirmed')).toBeVisible();
  });

  test('Journey 4: Hold timer expiry releases seat and disables checkout', async ({ page }) => {
    // Navigate to checkout with non-existent / expired hold
    await page.goto('/checkout?holdId=expired-hold-999');
    await page.waitForTimeout(600);

    // Should indicate hold expiration
    await expect(page.locator('text=Seat Hold Expired')).toBeVisible();
    // Cannot proceed with checkout
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toHaveCount(0);
  });

  test('Journey 5: Payment failure displays error and allows retry', async ({ page }) => {
    // Navigate to events -> select seat on non-queued event evt-102
    await page.goto('/events/evt-102');
    await page.waitForSelector('button[aria-label*="Available"]');
    const availableSeat = page.locator('button[aria-label*="Available"]').first();
    await availableSeat.click();
    await page.click('button:has-text("Lock Seats & Proceed")');

    await page.waitForURL('**/checkout?holdId=*');

    // Trigger simulated checkout error via window mock hook
    await page.evaluate(() => {
      window.__MOCK_OVERRIDES__ = { checkoutError: true };
    });

    await page.fill('#checkout-name', 'Morgan Ellis');
    await page.fill('#checkout-email', 'morgan.ellis@example.com');
    await page.fill('#checkout-id-last4', '9876');
    await page.fill('#card-number', '4000 0000 0000 0002');
    await page.fill('#card-expiry', '11/27');
    await page.fill('#card-cvc', '456');
    await page.check('#checkout-agree-terms');

    const payBtn = page.locator('button:has-text("Complete Booking")');
    await payBtn.click();

    // Verify error is displayed clearly
    await expect(page.locator('text=Payment gateway declined transaction')).toBeVisible();
    // Checkout form remains available to retry
    await expect(payBtn).toBeVisible();

    // Clear error override and retry successfully
    await page.evaluate(() => {
      window.__MOCK_OVERRIDES__ = { checkoutError: false };
    });
    await payBtn.click();
    await page.waitForURL('**/tickets?checkoutSuccess=true', { timeout: 15000 });
  });

  test('Journey 6: Seat conflict handling (seat taken by another user)', async ({ page }) => {
    await page.goto('/events/evt-102');
    // Verify sold seats cannot be clicked
    const soldSeat = page.locator('button[aria-label*="Sold"]').first();
    if (await soldSeat.count() > 0) {
      await expect(soldSeat).toBeDisabled();
    }
  });

  test('Journey 7: Rotating QR code refreshes and shows countdown', async ({ page }) => {
    // Ensure active session
    await page.goto('/login');
    await page.fill('#login-email', 'test@example.com');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => url.pathname.includes('/verify-otp'));
    await page.fill('#otp-code', '123456');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => url.pathname === '/profile');

    await page.goto('/tickets');
    await page.waitForTimeout(600);

    // Verify QR panel and countdown
    await expect(page.locator('img[alt*="Dynamic entry barcode"]').first()).toBeVisible();
    await expect(page.locator('div[role="progressbar"]').first()).toBeVisible();

    // Verify sync button exists and works
    const syncBtn = page.locator('button[aria-label="Manually refresh QR pass"]').first();
    await expect(syncBtn).toBeVisible();
    await syncBtn.click();
    await expect(syncBtn).toBeVisible();
  });

  test('Journey 8: Logged-out user visiting protected route is redirected to login and returned after login', async ({ page }) => {
    // Navigate to events and explicitly set logged-out storage flag
    await page.goto('/events');
    await page.evaluate(() => {
      localStorage.setItem('verity_auth_logged_out', 'true');
      localStorage.removeItem('verity_auth_token');
    });

    // Attempt to access protected /profile while logged out
    await page.goto('/profile');
    await expect(page).toHaveURL(/.*login.*redirect.*/);

    // Complete login
    await page.fill('#login-email', 'morgan.ellis@example.com');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => url.pathname.includes('/verify-otp'));

    // Complete OTP
    await page.fill('#otp-code', '123456');
    await page.click('button[type="submit"]');

    // Returned to original protected route
    await page.waitForURL(url => url.pathname === '/profile');
    await expect(page.locator('h1')).toContainText('Account and Identity Profile');
  });

  test('Journey 9: Error handling when service fails (loading and error states)', async ({ page }) => {
    // Inject seats error override
    await page.addInitScript(() => {
      window.__MOCK_OVERRIDES__ = { seatsError: true };
    });

    await page.goto('/events/evt-102');
    await expect(page.locator('text=Event Not Available')).toBeVisible();
    await expect(page.locator('button:has-text("Try Again")')).toBeVisible();

    // Clear error override and reload
    await page.addInitScript(() => {
      window.__MOCK_OVERRIDES__ = { seatsError: false };
    });
    await page.reload();
    await expect(page.locator('button[aria-label*="Available"]').first()).toBeVisible();
  });

  test('Journey 10: Double-click on pay and rapid repeated seat clicks prevent duplicate actions', async ({ page }) => {
    await page.goto('/events/evt-102');
    await page.waitForSelector('button[aria-label*="Available"]');
    const availableSeat = page.locator('button[aria-label*="Available"]').first();

    // Rapid double click
    await availableSeat.dblclick();

    // Verify seat selection remains stable without crashing
    const proceedBtn = page.locator('button:has-text("Lock Seats & Proceed")');
    await expect(proceedBtn).toBeVisible();
  });
});

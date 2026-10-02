import { test, expect } from '@playwright/test';

const PAGES = [
  { name: 'EventListPage', path: '/events' },
  { name: 'EventDetailPage', path: '/events/evt-101' },
  { name: 'CheckoutPage', path: '/checkout' },
  { name: 'TicketsPage', path: '/tickets' },
  { name: 'RegisterPage', path: '/register' },
  { name: 'LoginPage', path: '/login' },
  { name: 'OtpPage', path: '/verify-otp?email=test%40example.com' },
  { name: 'ProfilePage', path: '/profile' },
  { name: 'PrivacyPage', path: '/privacy' },
  { name: 'TermsPage', path: '/terms' },
  { name: 'NotFoundPage', path: '/invalid-route-404' },
];

test.describe('Pages - Render, Responsiveness & Console Checks', () => {
  for (const pageItem of PAGES) {
    test(`${pageItem.name} (${pageItem.path}) loads cleanly without horizontal scroll or console errors`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      const response = await page.goto(pageItem.path, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(400);

      // Wait a moment for async content to settle
      await page.waitForTimeout(500);

      // Verify no console errors
      expect(consoleErrors).toEqual([]);

      // Verify no horizontal overflow/scroll
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      expect(hasHorizontalScroll).toBe(false);

      // Verify page has non-empty title
      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
      expect(title).toContain('Verity');

      // Verify main content is rendered and visible
      const mainContent = page.locator('#main-content');
      await expect(mainContent).toBeVisible();
    });
  }

  test('History navigation: browser back, forward and reload behave correctly', async ({ page }) => {
    await page.goto('/events');
    await page.waitForTimeout(300);

    await page.goto('/privacy');
    await page.waitForTimeout(300);
    expect(page.url()).toContain('/privacy');

    await page.goBack();
    await page.waitForTimeout(300);
    expect(page.url()).toContain('/events');

    await page.goForward();
    await page.waitForTimeout(300);
    expect(page.url()).toContain('/privacy');

    await page.reload();
    await page.waitForTimeout(300);
    expect(page.url()).toContain('/privacy');
  });

  test('Navigation links route properly', async ({ page }) => {
    await page.goto('/events');
    // Click header logo/brand to return to events
    const brandLink = page.locator('header a[href="/events"]').first();
    await expect(brandLink).toBeVisible();
    await brandLink.click();
    expect(page.url()).toContain('/events');

    // Click footer terms link
    const termsLink = page.locator('footer a[href="/terms"]').first();
    await expect(termsLink).toBeVisible();
    await termsLink.click();
    expect(page.url()).toContain('/terms');
  });
});

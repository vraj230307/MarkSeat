import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const TEST_PAGES = [
  { name: 'Events Page', path: '/events' },
  { name: 'Event Detail Page', path: '/events/evt-101' },
  { name: 'Checkout Page', path: '/checkout' },
  { name: 'Tickets Page', path: '/tickets' },
  { name: 'Register Page', path: '/register' },
  { name: 'Login Page', path: '/login' },
  { name: 'OTP Verification Page', path: '/verify-otp?email=test%40example.com' },
  { name: 'Profile Page', path: '/profile' },
  { name: 'Privacy Page', path: '/privacy' },
  { name: 'Terms Page', path: '/terms' },
  { name: '404 Page', path: '/non-existent-page' },
];

test.describe('Accessibility (axe-core) Audits', () => {
  for (const pageItem of TEST_PAGES) {
    test(`axe-core compliance on ${pageItem.name} (${pageItem.path})`, async ({ page }) => {
      await page.goto(pageItem.path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      if (accessibilityScanResults.violations.length > 0) {
        console.warn(
          `Accessibility violations on ${pageItem.path}:`,
          JSON.stringify(accessibilityScanResults.violations, null, 2)
        );
      }

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }

  test('Keyboard-only navigation of core booking flow', async ({ page }) => {
    await page.goto('/events');
    // Press Tab multiple times to verify logical tab order and focusability
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON', 'INPUT']).toContain(focusedTag);
  });
});

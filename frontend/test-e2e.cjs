const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:4173';
const SCREENSHOTS_DIR = path.join(__dirname, 'test-screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runTests() {
  console.log('--- STARTING VERITY E2E AUTOMATED BROWSER TESTS ---');
  console.log('Target URL:', BASE_URL);
  console.log('Using Browser:', CHROME_PATH);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();

  // Test results collector
  const results = [];
  function record(name, pass, detail) {
    results.push({ name, pass, detail });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}: ${detail}`);
  }

  try {
    // ----------------------------------------------------
    // TEST 1: DESKTOP (1280px) EVENT LISTING & NAVIGATION
    // ----------------------------------------------------
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(`${BASE_URL}/events`, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-events-desktop-1280.png') });

    const title = await page.title();
    const hasVerityTitle = title.includes('Verity');
    record('Desktop Page Title', hasVerityTitle, `Title is "${title}"`);

    const eventCardsCount = await page.$$eval('[class*="border-[#dfd8f5]"]', cards => cards.length);
    record('Event Listings Rendered', eventCardsCount > 0, `Found ${eventCardsCount} card elements`);

    // Test Search & Filter
    await page.type('#event-search', 'Pacific Northwest');
    await new Promise(r => setTimeout(r, 400));
    const filteredText = await page.$eval('h2', el => el.textContent);
    record('Search Filter Working', filteredText.includes('Pacific Northwest'), `Top filtered result: "${filteredText}"`);

    // ----------------------------------------------------
    // TEST 2: QUEUE MODAL BEHAVIOR ON EVT-101
    // ----------------------------------------------------
    await page.goto(`${BASE_URL}/events/evt-101`, { waitUntil: 'networkidle0' });
    const queueDialog = await page.waitForSelector('div[role="dialog"]', { timeout: 3000 });
    const queueHeader = queueDialog ? await page.$eval('h2#queue-dialog-title', el => el.textContent) : '';
    record('Virtual Queue Modal', queueHeader.includes('Waiting Room') || queueHeader.includes('Turn'), `Queue modal verified: "${queueHeader}"`);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-queue-modal.png') });

    // Leave queue dialog
    const leaveBtn = await page.$('div[role="dialog"] button');
    if (leaveBtn) await leaveBtn.click();
    await new Promise(r => setTimeout(r, 400));

    // ----------------------------------------------------
    // TEST 3: DIRECT SEAT SELECTION & ATOMIC LOCK ON EVT-102
    // ----------------------------------------------------
    await page.goto(`${BASE_URL}/events/evt-102`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('button[aria-label*="Seat Row"]', { timeout: 4000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-seatmap-desktop.png') });

    // Check legend items
    const legendText = await page.$eval('h4', el => el.textContent);
    record('Seat Map Legend', legendText.includes('Seat Status Legend'), `Found legend header: "${legendText}"`);

    // Find and click an available seat button
    const seatButtons = await page.$$('button[aria-label*="Available"]');
    if (seatButtons.length > 0) {
      const seatLabel = await page.evaluate(el => el.getAttribute('aria-label'), seatButtons[0]);
      await seatButtons[0].click();
      await new Promise(r => setTimeout(r, 300));
      record('Seat Selection Interaction', true, `Clicked available seat: ${seatLabel}`);
    } else {
      record('Seat Selection Interaction', false, 'No available seat buttons found.');
    }

    // Click "Lock Seats & Proceed"
    const lockBtn = await page.waitForSelector('button::-p-text(Lock Seats & Proceed)');
    if (lockBtn) {
      await lockBtn.click();
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
      record('Atomic Hold Lock Action', page.url().includes('/checkout'), `Navigated to checkout URL: ${page.url()}`);
    } else {
      record('Atomic Hold Lock Action', false, 'Lock Seats button not found.');
    }

    // ----------------------------------------------------
    // TEST 4: CHECKOUT & 5-MINUTE COUNTDOWN
    // ----------------------------------------------------
    await page.waitForSelector('div[role="timer"]', { timeout: 4000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-checkout-page.png') });
    const timerText = await page.$eval('div[role="timer"]', el => el.textContent);
    record('5-Minute Hold Countdown', timerText.includes(':'), `Active timer displayed: "${timerText}"`);

    // Fill Attendee Info
    await page.type('#checkout-name', 'Morgan Ellis');
    await page.type('#checkout-email', 'morgan.ellis@example.com');
    await page.type('#checkout-id-last4', '8901');

    // Fill Card Details
    await page.type('#card-number', '4111222233334444');
    await page.type('#card-expiry', '12/28');
    await page.type('#card-cvc', '789');

    // Check Terms
    await page.click('#checkout-agree-terms');

    // Submit Checkout
    const completeBookingBtn = await page.waitForSelector('button::-p-text(Complete Booking)');
    if (completeBookingBtn) {
      await completeBookingBtn.click();
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
      record('Complete Booking Submission', page.url().includes('/tickets'), `Redirected to: ${page.url()}`);
    }

    // ----------------------------------------------------
    // TEST 5: MY TICKETS & ROTATING QR PANEL (30s REFRESH)
    // ----------------------------------------------------
    await page.waitForSelector('img[alt*="Dynamic entry barcode"]', { timeout: 4000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-my-tickets.png') });
    const qrImage = await page.$('img[alt*="Dynamic entry barcode"]');
    const qrSrc = qrImage ? await page.evaluate(el => el.getAttribute('src'), qrImage) : '';
    record('Server Rendered QR Image', qrSrc.startsWith('data:image/svg+xml'), `QR src length: ${qrSrc.length} bytes`);

    const qrTimer = await page.$eval('div[role="progressbar"]', el => el.getAttribute('aria-label'));
    record('QR Rotating Countdown Bar', !!qrTimer, `Progress bar label: "${qrTimer}"`);

    // Test Manual QR Sync
    const syncBtn = await page.$('button[aria-label="Manually refresh QR pass"]');
    if (syncBtn) {
      await syncBtn.click();
      await new Promise(r => setTimeout(r, 400));
      record('Manual QR Sync Refresh', true, 'Clicked Sync button without errors.');
    }

    // ----------------------------------------------------
    // TEST 6: PROFILE & IDENTITY VERIFICATION
    // ----------------------------------------------------
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('h1', { timeout: 4000 });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-profile-page.png') });
    const profileText = await page.evaluate(() => document.body.innerText);
    record('Identity Verified Badge', profileText.includes('Identity Verified'), 'Identity Verified badge displayed.');
    record('Profile Registered Info', profileText.includes('Morgan Ellis'), 'Verified user Morgan Ellis details rendered.');

    // ----------------------------------------------------
    // TEST 7: PRIVACY POLICY & TERMS PAGES
    // ----------------------------------------------------
    await page.goto(`${BASE_URL}/privacy`, { waitUntil: 'networkidle0' });
    const privacyContent = await page.evaluate(() => document.body.innerText);
    const hasAiNotice = privacyContent.includes('[AI PROVIDER NAME]');
    const hasRetention = privacyContent.includes('Data Retention');
    const hasBotSignals = privacyContent.includes('Behavior Signals Used for Bot Detection');
    record('Privacy Policy Outlines', hasAiNotice && hasRetention && hasBotSignals, 'AI Provider notice, retention, and bot signals sections verified.');

    await page.goto(`${BASE_URL}/terms`, { waitUntil: 'networkidle0' });
    const termsContent = await page.evaluate(() => document.body.innerText);
    const hasAntiScalping = termsContent.includes('Anti-Scalping');
    record('Terms & Conditions Anti-Scalping Section', hasAntiScalping, 'Anti-scalping non-transferability section verified.');

    // ----------------------------------------------------
    // TEST 8: TABLET RESPONSIVENESS (768px)
    // ----------------------------------------------------
    await page.setViewport({ width: 768, height: 1024 });
    await page.goto(`${BASE_URL}/events`, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-events-tablet-768.png') });

    const tabletScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    record('Tablet (768px) No Horizontal Scroll', tabletScrollWidth <= 768, `Scroll width is ${tabletScrollWidth}px (<= 768px)`);

    // ----------------------------------------------------
    // TEST 9: MOBILE RESPONSIVENESS (360px) & MOBILE MENU
    // ----------------------------------------------------
    await page.setViewport({ width: 360, height: 780 });
    await page.goto(`${BASE_URL}/events`, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-events-mobile-360.png') });

    const mobileScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    record('Mobile (360px) No Horizontal Scroll', mobileScrollWidth <= 360, `Scroll width is ${mobileScrollWidth}px (<= 360px)`);

    // Mobile Hamburger Menu Test
    const mobileMenuBtn = await page.$('button[aria-label*="main navigation menu"]');
    if (mobileMenuBtn) {
      await mobileMenuBtn.click();
      await new Promise(r => setTimeout(r, 200));
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-mobile-menu-drawer.png') });
      const drawerVisible = await page.$('a[href="/tickets"]');
      record('Mobile Navigation Drawer', !!drawerVisible, 'Hamburger toggled mobile navigation links.');
    }

    // Test Seat Map on Mobile (360px)
    await page.goto(`${BASE_URL}/events/evt-102`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('button[aria-label*="Seat Row"]', { timeout: 4000 });
    const seatMapMobileScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    record('Mobile (360px) Seat Map No Horizontal Scroll', seatMapMobileScrollWidth <= 360, `Seat Map page scroll width: ${seatMapMobileScrollWidth}px (<= 360px)`);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10-seatmap-mobile-360.png') });

    // Test Tickets on Mobile (360px)
    await page.goto(`${BASE_URL}/tickets`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('img[alt*="Dynamic entry barcode"]', { timeout: 4000 });
    const ticketsMobileScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    record('Mobile (360px) Tickets No Horizontal Scroll', ticketsMobileScrollWidth <= 360, `Tickets page scroll width: ${ticketsMobileScrollWidth}px (<= 360px)`);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11-tickets-mobile-360.png') });

  } catch (err) {
    console.error('Test execution error:', err);
    record('Suite Execution', false, err.message);
  } finally {
    await browser.close();
  }

  console.log('\n--- TEST SUITE SUMMARY ---');
  const passedCount = results.filter(r => r.pass).length;
  console.log(`Total: ${results.length} | Passed: ${passedCount} | Failed: ${results.length - passedCount}`);
  
  if (passedCount === results.length) {
    console.log('ALL VERITY AUTOMATED BROWSER TESTS PASSED SUCCESSFULLY!');
  } else {
    process.exit(1);
  }
}

runTests();

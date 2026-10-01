const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runRegressionSuite() {
  console.log('================================================================');
  console.log('--- Starting Provider Availability Synchronization Suite ---');
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
  });

  const results = {};

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    // Enable request interception to mock backend booking and availability contracts reliably
    await page.setRequestInterception(true);

    let mockBookingsA = [];
    let mockUnavailableA = [];
    let mockBookingsB = [];
    let mockUnavailableB = [];

    page.on('request', (req) => {
      const url = req.url();
      const method = req.method();

      // Handle CORS preflight
      if (method === 'OPTIONS') {
        return req.respond({
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        });
      }

      if (url.includes('/api/auth/me')) {
        return req.respond({
          status: 200,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            success: true,
            user: {
              id: 'user_prov_a',
              fullName: 'LensCraft Studios',
              email: 'studio@lenscraft.com',
              role: 'provider',
              providerProfile: {
                id: 'prov_profile_a',
                businessName: 'LensCraft Studios',
                category: { name: 'Photographer', slug: 'photographer' },
              },
            },
          }),
        });
      }

      if (url.includes('/api/providers/prov_profile_a/unavailable-dates')) {
        return req.respond({
          status: 200,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            success: true,
            providerId: 'prov_profile_a',
            unavailableDates: mockUnavailableA,
          }),
        });
      }

      if (url.includes('/api/providers/prov_profile_b/unavailable-dates')) {
        return req.respond({
          status: 200,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            success: true,
            providerId: 'prov_profile_b',
            unavailableDates: mockUnavailableB,
          }),
        });
      }

      const authHeader = req.headers()['authorization'] || '';
      const isProvB = authHeader.includes('token_prov_profile_b');

      if (url.includes('/api/providers/availability') && method === 'GET') {
        const list = isProvB ? mockUnavailableB : mockUnavailableA;
        return req.respond({
          status: 200,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            success: true,
            availability: list.map((d) => ({ date: d })),
          }),
        });
      }

      if (url.includes('/api/providers/availability/sync') && method === 'PUT') {
        const payload = JSON.parse(req.postData() || '{}');
        if (isProvB) {
          mockUnavailableB = payload.dates || [];
        } else {
          mockUnavailableA = payload.dates || [];
        }
        return req.respond({
          status: 200,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            success: true,
            message: 'Schedule synchronized',
            unavailableDates: isProvB ? mockUnavailableB : mockUnavailableA,
          }),
        });
      }

      if (url.includes('/api/bookings/provider') && method === 'GET') {
        return req.respond({
          status: 200,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            success: true,
            bookings: isProvB ? mockBookingsB : mockBookingsA,
          }),
        });
      }

      if (url.includes('/api/bookings/') && url.includes('/status') && method === 'PATCH') {
        const urlParts = url.split('/');
        const bookingId = urlParts[urlParts.indexOf('bookings') + 1];
        const payload = JSON.parse(req.postData() || '{}');
        const b = mockBookingsA.find((item) => item.id === bookingId || item.bookingId === bookingId);
        if (b) {
          b.status = payload.status;
          b.updatedAt = new Date().toISOString();
        }
        return req.respond({
          status: 200,
          contentType: 'application/json',
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            success: true,
            booking: b,
          }),
        });
      }

      req.continue();
    });

    // Helper to ensure October 2026 is visible
    const navigateToOctober = async () => {
      await page.evaluate(() => {
        const text = document.body.innerText;
        if (!text.includes('October 2026')) {
          const nextBtn = document.querySelector('button[title="Next Month"]');
          if (nextBtn) nextBtn.click();
        }
      });
      await sleep(300);
    };

    // Setup Provider A Session
    const setupProviderSession = async (provId, email, name) => {
      await page.goto(`${BASE_URL}/provider/schedule`, { waitUntil: 'domcontentloaded' });
      await page.evaluate(
        (id, em, nm) => {
          localStorage.clear();
          const session = {
            providerId: id,
            userId: `user_${id}`,
            businessName: nm,
            fullName: nm,
            email: em,
            category: 'Photographer',
            token: `token_${id}`,
            role: 'provider',
          };
          localStorage.setItem('eva_ai_provider_session', JSON.stringify(session));
          localStorage.setItem('eva_ai_auth_token', `token_${id}`);
        },
        provId,
        email,
        name
      );
    };

    // =========================================================================
    // SCENARIO A: Accept booking for 2026-10-10 -> schedule shows 10 Oct unavailable/booked
    // =========================================================================
    console.log('--- TEST A: Accept booking for 2026-10-10 -> schedule shows 10 Oct booked ---');
    mockBookingsA = [
      {
        id: 'book_oct10',
        bookingId: 'book_oct10',
        providerId: 'prov_profile_a',
        eventDate: '2026-10-10',
        status: 'ACCEPTED',
        packageName: 'Platinum Cinematic',
        totalPrice: 45000,
      },
    ];
    mockUnavailableA = [];

    await setupProviderSession('prov_profile_a', 'studio@lenscraft.com', 'LensCraft Studios');
    await page.goto(`${BASE_URL}/provider/schedule`, { waitUntil: 'networkidle0' });
    await navigateToOctober();
    await sleep(600);

    // Check if 2026-10-10 is rendered as booked
    const testA = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const text = document.body.innerText;
      const hasUnavailableCount = text.includes('Unavailable this month') || text.includes('Total');
      const day10Btn = buttons.find((b) => b.innerText.includes('10') && (b.innerText.includes('Booked') || b.innerText.includes('Unavailable') || b.innerText.includes('Off')));
      const hasBookedBadge = text.includes('Booked') || text.includes('2026-10-10');
      return {
        hasUnavailableCount,
        hasDay10Blocked: Boolean(day10Btn),
        hasBookedBadge,
      };
    });

    console.log('Scenario A Result:', testA.hasDay10Blocked ? 'PASSED' : 'FAILED', testA);
    results['Scenario A (Accept Booking Blocks Date)'] = testA.hasDay10Blocked ? 'PASS' : 'FAIL';

    // =========================================================================
    // SCENARIO B: Pending booking for 2026-10-15 -> schedule still shows 15 Oct available
    // =========================================================================
    console.log('\n--- TEST B: Pending booking for 2026-10-15 -> schedule shows 15 Oct available ---');
    mockBookingsA = [
      {
        id: 'book_oct15_pending',
        bookingId: 'book_oct15_pending',
        providerId: 'prov_profile_a',
        eventDate: '2026-10-15',
        status: 'PENDING',
        packageName: 'Gold',
      },
    ];
    mockUnavailableA = [];

    await page.reload({ waitUntil: 'networkidle0' });
    await navigateToOctober();
    await sleep(600);

    const testB = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const day15Btn = buttons.find((b) => b.innerText.includes('15') && (b.innerText.includes('Avail') || b.innerText.includes('Available')));
      const day15Blocked = buttons.find((b) => b.innerText.includes('15') && (b.innerText.includes('Booked') || b.innerText.includes('Blackout')));
      return {
        isDay15Available: Boolean(day15Btn) && !day15Blocked,
      };
    });

    console.log('Scenario B Result:', testB.isDay15Available ? 'PASSED' : 'FAILED', testB);
    results['Scenario B (Pending Booking Does Not Block)'] = testB.isDay15Available ? 'PASS' : 'FAIL';

    // =========================================================================
    // SCENARIO C: Reject booking -> date remains available
    // =========================================================================
    console.log('\n--- TEST C: Rejected booking for 2026-10-18 -> date remains available ---');
    mockBookingsA = [
      {
        id: 'book_oct18_rejected',
        bookingId: 'book_oct18_rejected',
        providerId: 'prov_profile_a',
        eventDate: '2026-10-18',
        status: 'REJECTED',
        packageName: 'Gold',
      },
    ];
    await page.reload({ waitUntil: 'networkidle0' });
    await navigateToOctober();
    await sleep(600);

    const testC = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const day18Btn = buttons.find((b) => b.innerText.includes('18') && (b.innerText.includes('Avail') || b.innerText.includes('Available')));
      const day18Blocked = buttons.find((b) => b.innerText.includes('18') && (b.innerText.includes('Booked') || b.innerText.includes('Blackout')));
      return {
        isDay18Available: Boolean(day18Btn) && !day18Blocked,
      };
    });

    console.log('Scenario C Result:', testC.isDay18Available ? 'PASSED' : 'FAILED', testC);
    results['Scenario C (Rejected Booking Remains Available)'] = testC.isDay18Available ? 'PASS' : 'FAIL';

    // =========================================================================
    // SCENARIO D: Cancel accepted booking -> date becomes available
    // =========================================================================
    console.log('\n--- TEST D: Cancelled accepted booking -> date becomes available ---');
    mockBookingsA = [
      {
        id: 'book_oct20_cancelled',
        bookingId: 'book_oct20_cancelled',
        providerId: 'prov_profile_a',
        eventDate: '2026-10-20',
        status: 'CANCELLED',
      },
    ];
    await page.reload({ waitUntil: 'networkidle0' });
    await navigateToOctober();
    await sleep(600);

    const testD = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const day20Btn = buttons.find((b) => b.innerText.includes('20') && (b.innerText.includes('Avail') || b.innerText.includes('Available')));
      const day20Blocked = buttons.find((b) => b.innerText.includes('20') && (b.innerText.includes('Booked') || b.innerText.includes('Blackout')));
      return {
        isDay20Available: Boolean(day20Btn) && !day20Blocked,
      };
    });

    console.log('Scenario D Result:', testD.isDay20Available ? 'PASSED' : 'FAILED', testD);
    results['Scenario D (Cancelled Booking Restores Availability)'] = testD.isDay20Available ? 'PASS' : 'FAIL';

    // =========================================================================
    // SCENARIO E: Two bookings on same date -> one cancelled, one accepted -> stays blocked
    // =========================================================================
    console.log('\n--- TEST E: Two bookings on same date (1 CANCELLED, 1 ACCEPTED) -> stays blocked ---');
    mockBookingsA = [
      {
        id: 'book_1',
        bookingId: 'book_1',
        providerId: 'prov_profile_a',
        eventDate: '2026-10-22',
        status: 'CANCELLED',
      },
      {
        id: 'book_2',
        bookingId: 'book_2',
        providerId: 'prov_profile_a',
        eventDate: '2026-10-22',
        status: 'ACCEPTED',
      },
    ];
    await page.reload({ waitUntil: 'networkidle0' });
    await navigateToOctober();
    await sleep(600);

    const testE = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const day22Blocked = buttons.find((b) => b.innerText.includes('22') && (b.innerText.includes('Booked') || b.innerText.includes('Unavailable') || b.innerText.includes('Off')));
      return {
        isDay22Blocked: Boolean(day22Blocked),
      };
    });

    console.log('Scenario E Result:', testE.isDay22Blocked ? 'PASSED' : 'FAILED', testE);
    results['Scenario E (Multiple Bookings Single Date Guard)'] = testE.isDay22Blocked ? 'PASS' : 'FAIL';

    // =========================================================================
    // SCENARIO F: Manual blackout + cancelled booking -> date remains blocked
    // =========================================================================
    console.log('\n--- TEST F: Manual blackout + cancelled booking -> date remains blocked ---');
    mockUnavailableA = ['2026-10-25'];
    mockBookingsA = [
      {
        id: 'book_oct25_canc',
        bookingId: 'book_oct25_canc',
        providerId: 'prov_profile_a',
        eventDate: '2026-10-25',
        status: 'CANCELLED',
      },
    ];
    await page.reload({ waitUntil: 'networkidle0' });
    await navigateToOctober();
    await sleep(600);

    const testF = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const day25Blackout = buttons.find((b) => b.innerText.includes('25') && (b.innerText.includes('Blackout') || b.innerText.includes('Off') || b.innerText.includes('Unavailable')));
      return {
        isDay25Blackout: Boolean(day25Blackout),
      };
    });

    console.log('Scenario F Result:', testF.isDay25Blackout ? 'PASSED' : 'FAILED', testF);
    results['Scenario F (Manual Blackout Preserved on Cancel)'] = testF.isDay25Blackout ? 'PASS' : 'FAIL';

    // =========================================================================
    // SCENARIO G: Provider isolation -> Provider A accepted booking does NOT block Provider B
    // =========================================================================
    console.log('\n--- TEST G: Provider isolation -> Prov A accepted booking does not block Prov B ---');
    mockBookingsA = [
      {
        id: 'book_provA',
        bookingId: 'book_provA',
        providerId: 'prov_profile_a',
        eventDate: '2026-10-10',
        status: 'ACCEPTED',
      },
    ];
    mockBookingsB = [];
    mockUnavailableB = [];

    // Switch session to Provider B
    await setupProviderSession('prov_profile_b', 'events@grandregal.com', 'Grand Regal');
    await page.goto(`${BASE_URL}/provider/schedule`, { waitUntil: 'networkidle0' });
    await navigateToOctober();
    await sleep(600);

    const testG = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const day10Btn = buttons.find((b) => b.innerText.includes('10') && (b.innerText.includes('Avail') || b.innerText.includes('Available')));
      const day10Blocked = buttons.find((b) => b.innerText.includes('10') && (b.innerText.includes('Booked') || b.innerText.includes('Blackout')));
      return {
        isProvBDay10Available: Boolean(day10Btn) && !day10Blocked,
      };
    });

    console.log('Scenario G Result:', testG.isProvBDay10Available ? 'PASSED' : 'FAILED', testG);
    results['Scenario G (Strict Provider Isolation)'] = testG.isProvBDay10Available ? 'PASS' : 'FAIL';

    // =========================================================================
    // SCENARIO H: Hard refresh resilience
    // =========================================================================
    console.log('\n--- TEST H: Hard refresh resilience ---');
    await setupProviderSession('prov_profile_a', 'studio@lenscraft.com', 'LensCraft Studios');
    mockBookingsA = [
      {
        id: 'book_oct10_resilient',
        bookingId: 'book_oct10_resilient',
        providerId: 'prov_profile_a',
        eventDate: '2026-10-10',
        status: 'ACCEPTED',
      },
    ];
    await page.goto(`${BASE_URL}/provider/schedule`, { waitUntil: 'networkidle0' });
    await navigateToOctober();
    await sleep(400);
    await page.reload({ waitUntil: 'networkidle0' });
    await navigateToOctober();
    await sleep(600);

    const testH = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const day10Blocked = buttons.find((b) => b.innerText.includes('10') && (b.innerText.includes('Booked') || b.innerText.includes('Unavailable') || b.innerText.includes('Off')));
      return {
        isDay10BlockedAfterRefresh: Boolean(day10Blocked),
      };
    });

    console.log('Scenario H Result:', testH.isDay10BlockedAfterRefresh ? 'PASSED' : 'FAILED', testH);
    results['Scenario H (Hard Refresh Resilience)'] = testH.isDay10BlockedAfterRefresh ? 'PASS' : 'FAIL';

    // =========================================================================
    // SCENARIO I: Save Schedule preserves only manual blackouts
    // =========================================================================
    console.log('\n--- TEST I: Save Schedule persists ONLY manual blackouts without polluting with bookings ---');
    mockBookingsA = [
      {
        id: 'book_oct10_booked',
        bookingId: 'book_oct10_booked',
        providerId: 'prov_profile_a',
        eventDate: '2026-10-10',
        status: 'ACCEPTED',
      },
    ];
    mockUnavailableA = ['2026-10-28'];
    await page.reload({ waitUntil: 'networkidle0' });
    await navigateToOctober();
    await sleep(600);

    // Click "Save Schedule"
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const saveBtn = btns.find((b) => b.innerText.includes('Save Schedule') || b.innerText.includes('Save Changes'));
      if (saveBtn) saveBtn.click();
    });
    await sleep(600);

    console.log('Mock unavailable synced to backend:', mockUnavailableA);
    const testI = !mockUnavailableA.includes('2026-10-10') && mockUnavailableA.includes('2026-10-28');
    console.log('Scenario I Result:', testI ? 'PASSED' : 'FAILED');
    results['Scenario I (Save Schedule Pure Manual Sync)'] = testI ? 'PASS' : 'FAIL';

    // Summary
    console.log('\n================================================================');
    console.log('--- TEST RESULTS SUMMARY ---');
    console.log('================================================================');
    let allPassed = true;
    for (const [key, val] of Object.entries(results)) {
      console.log(`${val === 'PASS' ? '✅' : '❌'} ${val}: ${key}`);
      if (val !== 'PASS') allPassed = false;
    }
    console.log('================================================================\n');

    if (allPassed) {
      console.log('ALL AVAILABILITY SYNCHRONIZATION SCENARIOS PASSED PERFECTLY! 🎉');
    }
  } catch (err) {
    console.error('Test run failed with error:', err);
  } finally {
    await browser.close();
  }
}

runRegressionSuite().catch(console.error);

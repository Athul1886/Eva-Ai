const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function runRegressionTests() {
  console.log('================================================================');
  console.log('--- Starting My Bookings Rehydration Regression Suite ---');
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
  });

  const results = {};

  const mockCustomerSession = {
    customerId: 'cust_ananya_test',
    userId: 'user_ananya_test',
    fullName: 'Ananya Nair',
    email: 'ananya@eva-ai.internal',
    loginAt: new Date().toISOString(),
    role: 'customer',
    token: 'mock-jwt-token-ananya',
  };

  const mockCustomerSessionB = {
    customerId: 'cust_rohit_test',
    userId: 'user_rohit_test',
    fullName: 'Rohit Verma',
    email: 'rohit@eva-ai.internal',
    loginAt: new Date().toISOString(),
    role: 'customer',
    token: 'mock-jwt-token-rohit',
  };

  const mockBookingPlatinum = {
    bookingId: 'EVA-BOOK-PLAT01',
    providerId: 'provider-1',
    providerName: 'LensCraft Imperial Studios',
    category: 'Photography',
    packageName: 'Platinum',
    price: 45000,
    startingPrice: 45000,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    customerId: 'cust_ananya_test',
    customerEmail: 'ananya@eva-ai.internal',
    eventDate: '2026-11-20',
    location: 'Kochi',
    guestCount: 200,
  };

  const mockBookingAce = {
    bookingId: 'EVA-BOOK-ACE002',
    providerId: 'provider-2',
    providerName: 'Grand Feast Catering',
    category: 'Catering',
    packageName: 'ACE',
    price: 33000,
    startingPrice: 33000,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    customerId: 'cust_ananya_test',
    customerEmail: 'ananya@eva-ai.internal',
    eventDate: '2026-11-20',
    location: 'Kochi',
    guestCount: 200,
  };

  async function createConfiguredPage({ session = mockCustomerSession, initialCache = [mockBookingPlatinum], backendBookings = [mockBookingPlatinum], backendDelay = 0, backendStatus = 200, authUser = null }) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    };

    const currentUser = authUser || { id: session.customerId, role: 'customer', fullName: session.fullName, email: session.email };

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const url = req.url();
      if (req.method() === 'OPTIONS') {
        req.respond({
          status: 200,
          headers: corsHeaders,
        }).catch(() => {});
        return;
      }

      if (url.includes('/bookings/my')) {
        if (backendDelay > 0) {
          setTimeout(() => {
            req.respond({
              status: backendStatus,
              headers: corsHeaders,
              contentType: 'application/json',
              body: JSON.stringify(
                backendStatus === 200
                  ? { success: true, data: backendBookings }
                  : { success: false, message: 'Server Error' }
              ),
            }).catch(() => {});
          }, backendDelay);
        } else {
          req.respond({
            status: backendStatus,
            headers: corsHeaders,
            contentType: 'application/json',
            body: JSON.stringify(
              backendStatus === 200
                ? { success: true, data: backendBookings }
                : { success: false, message: 'Server Error' }
            ),
          }).catch(() => {});
        }
      } else if (url.includes('/auth/me')) {
        req.respond({
          status: 200,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { user: currentUser } }),
        }).catch(() => {});
      } else if (url.includes('/events')) {
        req.respond({
          status: 200,
          headers: corsHeaders,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [] }),
        }).catch(() => {});
      } else {
        req.continue().catch(() => {});
      }
    });

    // Set initial localStorage state
    await page.goto(`${BASE_URL}/login/customer`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((s, b) => {
      localStorage.clear();
      localStorage.setItem('eva_ai_customer_session', JSON.stringify(s));
      localStorage.setItem('eva_ai_customer', JSON.stringify({
        fullName: s.fullName,
        email: s.email,
      }));
      localStorage.setItem('eva_ai_auth_token', s.token);
      if (b && b.length > 0) {
        localStorage.setItem('eva_ai_bookings', JSON.stringify(b));
      }
    }, session, initialCache);

    return page;
  }

  try {
    // -------------------------------------------------------------------------
    // TEST A: Cached booking + backend loading → never shows "No bookings yet"
    // -------------------------------------------------------------------------
    console.log('--- TEST A: Cached booking + backend loading → never shows "No bookings yet" ---');
    {
      const pageA = await createConfiguredPage({
        session: mockCustomerSession,
        initialCache: [mockBookingPlatinum],
        backendBookings: [mockBookingPlatinum],
        backendDelay: 800,
      });

      await pageA.goto(`${BASE_URL}/customer/bookings`, { waitUntil: 'domcontentloaded' });

      // In flight check (200ms)
      await new Promise((r) => setTimeout(r, 200));
      const inFlightA = await pageA.evaluate(() => {
        const text = document.body.innerText;
        return {
          hasEmpty: text.includes('No bookings yet'),
          hasBooking: text.includes('LensCraft Imperial Studios') || text.includes('Platinum'),
        };
      });

      // Wait for backend completion (1100ms total)
      await new Promise((r) => setTimeout(r, 900));
      const finalA = await pageA.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('LensCraft Imperial Studios') && !text.includes('No bookings yet');
      });

      results['Scenario A (No Empty Flash During Loading)'] = !inFlightA.hasEmpty && inFlightA.hasBooking && finalA;
      console.log('Scenario A Result:', results['Scenario A (No Empty Flash During Loading)'] ? 'PASSED' : 'FAILED', { inFlightA, finalA });
      await pageA.close();
    }

    // -------------------------------------------------------------------------
    // TEST B: Cached booking + backend returns same booking → no flicker
    // -------------------------------------------------------------------------
    console.log('\n--- TEST B: Cached booking + backend returns same booking → no flicker ---');
    {
      const pageB = await createConfiguredPage({
        session: mockCustomerSession,
        initialCache: [mockBookingPlatinum],
        backendBookings: [mockBookingPlatinum],
        backendDelay: 50,
      });

      await pageB.goto(`${BASE_URL}/customer/bookings`, { waitUntil: 'domcontentloaded' });
      await new Promise((r) => setTimeout(r, 400));

      const finalB = await pageB.evaluate(() => {
        const text = document.body.innerText;
        const has1Request = text.includes('1 Booking Request') || text.includes('1 of 1 requests');
        const hasPending = text.includes('Waiting for provider response') || text.includes('PENDING');
        const hasName = text.includes('LensCraft Imperial Studios');
        return has1Request && hasPending && hasName;
      });

      results['Scenario B (Seamless Authoritative Match)'] = finalB;
      console.log('Scenario B Result:', finalB ? 'PASSED' : 'FAILED');
      await pageB.close();
    }

    // -------------------------------------------------------------------------
    // TEST C: Cached booking + backend returns [] → authoritatively shows "No bookings yet"
    // -------------------------------------------------------------------------
    console.log('\n--- TEST C: Cached booking + backend returns [] → authoritatively shows "No bookings yet" ---');
    {
      const pageC = await createConfiguredPage({
        session: mockCustomerSession,
        initialCache: [mockBookingPlatinum],
        backendBookings: [],
        backendDelay: 400,
      });

      await pageC.goto(`${BASE_URL}/customer/bookings`, { waitUntil: 'domcontentloaded' });

      // In flight: must NOT show empty yet
      await new Promise((r) => setTimeout(r, 150));
      const inFlightC = await pageC.evaluate(() => document.body.innerText.includes('No bookings yet'));

      // After backend returns []: must show empty
      await new Promise((r) => setTimeout(r, 650));
      const finalC = await pageC.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('No bookings yet') && !text.includes('LensCraft Imperial Studios');
      });

      results['Scenario C (Backend [] Authoritative Update)'] = !inFlightC && finalC;
      console.log('Scenario C Result:', results['Scenario C (Backend [] Authoritative Update)'] ? 'PASSED' : 'FAILED', { inFlightC, finalC });
      await pageC.close();
    }

    // -------------------------------------------------------------------------
    // TEST D: No cache + backend returns [] → show "No bookings yet"
    // -------------------------------------------------------------------------
    console.log('\n--- TEST D: No cache + backend returns [] → show "No bookings yet" ---');
    {
      const pageD = await createConfiguredPage({
        session: mockCustomerSession,
        initialCache: [],
        backendBookings: [],
        backendDelay: 50,
      });

      await pageD.goto(`${BASE_URL}/customer/bookings`, { waitUntil: 'domcontentloaded' });
      await new Promise((r) => setTimeout(r, 400));

      const finalD = await pageD.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('No bookings yet') && text.includes('Build your event plan');
      });

      results['Scenario D (No Cache Clean Empty State)'] = finalD;
      console.log('Scenario D Result:', finalD ? 'PASSED' : 'FAILED');
      await pageD.close();
    }

    // -------------------------------------------------------------------------
    // TEST E: Cache + backend request fails → preserve cache & show error/retry
    // -------------------------------------------------------------------------
    console.log('\n--- TEST E: Cache + backend request fails → preserve cache & show error/retry ---');
    {
      const pageE = await createConfiguredPage({
        session: mockCustomerSession,
        initialCache: [mockBookingPlatinum],
        backendStatus: 500,
        backendDelay: 50,
      });

      await pageE.goto(`${BASE_URL}/customer/bookings`, { waitUntil: 'domcontentloaded' });
      await new Promise((r) => setTimeout(r, 400));

      const finalE = await pageE.evaluate(() => {
        const text = document.body.innerText;
        const hasBooking = text.includes('LensCraft Imperial Studios');
        const hasRetry = text.includes('Retry Sync') || text.includes('saved bookings') || text.includes('locally saved');
        const hasEmpty = text.includes('No bookings yet');
        return hasBooking && hasRetry && !hasEmpty;
      });

      results['Scenario E (Failure Preserves Cache & Shows Retry)'] = finalE;
      console.log('Scenario E Result:', finalE ? 'PASSED' : 'FAILED');
      await pageE.close();
    }

    // -------------------------------------------------------------------------
    // TEST F: Backend returns Platinum ₹45,000 & ACE ₹33,000 → correct package & price
    // -------------------------------------------------------------------------
    console.log('\n--- TEST F: Backend returns Platinum ₹45,000 & ACE ₹33,000 → correct package & price ---');
    {
      const pageF = await createConfiguredPage({
        session: mockCustomerSession,
        initialCache: [mockBookingPlatinum, mockBookingAce],
        backendBookings: [mockBookingPlatinum, mockBookingAce],
        backendDelay: 50,
      });

      await pageF.goto(`${BASE_URL}/customer/bookings`, { waitUntil: 'domcontentloaded' });
      await new Promise((r) => setTimeout(r, 400));

      const finalF = await pageF.evaluate(() => {
        const text = document.body.innerText;
        const textUpper = text.toUpperCase();
        const hasPlatinum = textUpper.includes('PLATINUM');
        const hasPlatinumPrice = text.includes('45,000');
        const hasAce = textUpper.includes('ACE');
        const hasAcePrice = text.includes('33,000');
        return {
          hasPlatinum,
          hasPlatinumPrice,
          hasAce,
          hasAcePrice,
        };
      });

      const passedF = finalF.hasPlatinum && finalF.hasPlatinumPrice && finalF.hasAce && finalF.hasAcePrice;
      results['Scenario F (Package & Price Resolution)'] = passedF;
      console.log('Scenario F Result:', passedF ? 'PASSED' : 'FAILED', finalF);
      await pageF.close();
    }



    // -------------------------------------------------------------------------
    // TEST G: Hard refresh → no visible empty-state flash
    // -------------------------------------------------------------------------
    console.log('\n--- TEST G: Hard refresh → no visible empty-state flash ---');
    {
      const pageG = await createConfiguredPage({
        session: mockCustomerSession,
        initialCache: [mockBookingPlatinum],
        backendBookings: [mockBookingPlatinum],
        backendDelay: 400,
      });

      await pageG.goto(`${BASE_URL}/customer/bookings`, { waitUntil: 'domcontentloaded' });
      await new Promise((r) => setTimeout(r, 200));

      // Perform hard reload
      await pageG.reload({ waitUntil: 'domcontentloaded' });

      // Immediate check on reload
      const quickCheckG = await pageG.evaluate(() => !document.body.innerText.includes('No bookings yet'));
      await new Promise((r) => setTimeout(r, 600));
      const finalG = await pageG.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('LensCraft Imperial Studios') && !text.includes('No bookings yet');
      });

      results['Scenario G (Hard Refresh Resilience)'] = quickCheckG && finalG;
      console.log('Scenario G Result:', results['Scenario G (Hard Refresh Resilience)'] ? 'PASSED' : 'FAILED');
      await pageG.close();
    }

    // -------------------------------------------------------------------------
    // TEST H: Logout/login with another customer → no previous bookings leak
    // -------------------------------------------------------------------------
    console.log('\n--- TEST H: Logout/login with another customer → no previous bookings leak ---');
    {
      // Rohit signs in, but localStorage somehow still had Ananya's booking
      const pageH = await createConfiguredPage({
        session: mockCustomerSessionB,
        initialCache: [mockBookingPlatinum], // Ananya's booking
        backendBookings: [], // Rohit has no bookings
        backendDelay: 50,
        authUser: { id: 'cust_rohit_test', role: 'customer', fullName: 'Rohit Verma', email: 'rohit@eva-ai.internal' },
      });

      await pageH.goto(`${BASE_URL}/customer/bookings`, { waitUntil: 'domcontentloaded' });
      await new Promise((r) => setTimeout(r, 400));

      const finalH = await pageH.evaluate(() => {
        const text = document.body.innerText;
        const leakedOldBooking = text.includes('LensCraft Imperial Studios');
        const showsEmpty = text.includes('No bookings yet');
        return !leakedOldBooking && showsEmpty;
      });

      results['Scenario H (Customer Isolation Protection)'] = finalH;
      console.log('Scenario H Result:', finalH ? 'PASSED' : 'FAILED');
      await pageH.close();
    }

    // -------------------------------------------------------------------------
    // TEST I: ACCEPTED Booking with nested provider contact info → displays phone/email & enabled actions
    // -------------------------------------------------------------------------
    console.log('\n--- TEST I: ACCEPTED Booking with nested provider contact info → displays phone/email ---');
    {
      const acceptedNestedBooking = {
        bookingId: 'EVA-BOOK-ACC099',
        providerId: 'provider-royal-1',
        providerName: 'Royal Grand Photography',
        category: 'Photography',
        packageName: 'Platinum',
        price: 45000,
        startingPrice: 45000,
        status: 'ACCEPTED',
        createdAt: new Date().toISOString(),
        customerId: 'cust_ananya_test',
        customerEmail: 'ananya@eva-ai.internal',
        eventDate: '2026-11-20',
        location: 'Kochi',
        guestCount: 200,
        provider: {
          name: 'Royal Grand Photography',
          contactPhone: '+91 98470 12345',
          contactEmail: 'contact@royalgrand.com',
          location: 'MG Road, Kochi',
          fullName: 'Arjun Menon',
        },
      };

      const pageI = await createConfiguredPage({
        session: mockCustomerSession,
        initialCache: [acceptedNestedBooking],
        backendBookings: [acceptedNestedBooking],
        backendDelay: 50,
      });

      await pageI.goto(`${BASE_URL}/customer/bookings`, { waitUntil: 'domcontentloaded' });
      await new Promise((r) => setTimeout(r, 400));

      const finalI = await pageI.evaluate(() => {
        const text = document.body.innerText;
        const hasAccepted = text.includes('Booking Accepted');
        const hasPhone = text.includes('+91 98470 12345');
        const hasEmail = text.includes('contact@royalgrand.com');
        const hasPackage = text.toUpperCase().includes('PLATINUM');
        const hasPrice = text.includes('45,000');
        const callLink = document.querySelector('a[href="tel:+919847012345"]');
        const mailLink = document.querySelector('a[href="mailto:contact@royalgrand.com"]');
        return {
          hasAccepted,
          hasPhone,
          hasEmail,
          hasPackage,
          hasPrice,
          hasCallLink: Boolean(callLink),
          hasMailLink: Boolean(mailLink),
        };
      });

      const passedI =
        finalI.hasAccepted &&
        finalI.hasPhone &&
        finalI.hasEmail &&
        finalI.hasPackage &&
        finalI.hasPrice &&
        finalI.hasCallLink &&
        finalI.hasMailLink;

      results['Scenario I (ACCEPTED Provider Contact Display & Actions)'] = passedI;
      console.log('Scenario I Result:', passedI ? 'PASSED' : 'FAILED', finalI);
      await pageI.close();
    }

    // -------------------------------------------------------------------------
    // TEST J: PENDING Booking with contact fields in backend → strictly hides contact info
    // -------------------------------------------------------------------------
    console.log('\n--- TEST J: PENDING Booking with contact fields → hides phone/email ---');
    {
      const pendingWithContacts = {
        bookingId: 'EVA-BOOK-PEND099',
        providerId: 'provider-royal-1',
        providerName: 'Royal Grand Photography',
        category: 'Photography',
        packageName: 'Platinum',
        price: 45000,
        startingPrice: 45000,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        customerId: 'cust_ananya_test',
        customerEmail: 'ananya@eva-ai.internal',
        eventDate: '2026-11-20',
        location: 'Kochi',
        guestCount: 200,
        providerPhone: '+91 98470 12345',
        providerEmail: 'contact@royalgrand.com',
        provider: {
          contactPhone: '+91 98470 12345',
          contactEmail: 'contact@royalgrand.com',
        },
      };

      const pageJ = await createConfiguredPage({
        session: mockCustomerSession,
        initialCache: [pendingWithContacts],
        backendBookings: [pendingWithContacts],
        backendDelay: 50,
      });

      await pageJ.goto(`${BASE_URL}/customer/bookings`, { waitUntil: 'domcontentloaded' });
      await new Promise((r) => setTimeout(r, 400));

      const finalJ = await pageJ.evaluate(() => {
        const text = document.body.innerText;
        const hasPendingBadge = text.includes('Waiting for provider response');
        const hasContactCard = text.includes('Contact Provider');
        const leakedPhone = text.includes('+91 98470 12345');
        const leakedEmail = text.includes('contact@royalgrand.com');
        return {
          hasPendingBadge,
          hasContactCard,
          leakedPhone,
          leakedEmail,
        };
      });

      const passedJ = finalJ.hasPendingBadge && !finalJ.hasContactCard && !finalJ.leakedPhone && !finalJ.leakedEmail;
      results['Scenario J (PENDING Contact Lock Protection)'] = passedJ;
      console.log('Scenario J Result:', passedJ ? 'PASSED' : 'FAILED', finalJ);
      await pageJ.close();
    }

    // -------------------------------------------------------------------------
    // TEST K: COMPLETED Booking → displays contact info and completed status
    // -------------------------------------------------------------------------
    console.log('\n--- TEST K: COMPLETED Booking → displays contact info & completed status ---');
    {
      const completedBooking = {
        bookingId: 'EVA-BOOK-COMP099',
        providerId: 'provider-catering-1',
        providerName: 'Imperial Feast',
        category: 'Catering',
        packageName: 'ACE',
        price: 33000,
        startingPrice: 33000,
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
        customerId: 'cust_ananya_test',
        customerEmail: 'ananya@eva-ai.internal',
        eventDate: '2026-09-10',
        location: 'Kochi',
        guestCount: 200,
        contact: {
          phone: '+91 98470 99887',
          email: 'hello@imperialfeast.com',
          manager: 'Suresh Kumar',
        },
      };

      const pageK = await createConfiguredPage({
        session: mockCustomerSession,
        initialCache: [completedBooking],
        backendBookings: [completedBooking],
        backendDelay: 50,
      });

      await pageK.goto(`${BASE_URL}/customer/bookings`, { waitUntil: 'domcontentloaded' });
      await new Promise((r) => setTimeout(r, 400));

      const finalK = await pageK.evaluate(() => {
        const text = document.body.innerText;
        const hasCompleted = text.includes('Service Completed');
        const hasPhone = text.includes('+91 98470 99887');
        const hasEmail = text.includes('hello@imperialfeast.com');
        const hasPackage = text.toUpperCase().includes('ACE');
        const hasPrice = text.includes('33,000');
        return {
          hasCompleted,
          hasPhone,
          hasEmail,
          hasPackage,
          hasPrice,
        };
      });

      const passedK = finalK.hasCompleted && finalK.hasPhone && finalK.hasEmail && finalK.hasPackage && finalK.hasPrice;
      results['Scenario K (COMPLETED Contact Resolution)'] = passedK;
      console.log('Scenario K Result:', passedK ? 'PASSED' : 'FAILED', finalK);
      await pageK.close();
    }

    // -------------------------------------------------------------------------
    // TEST L: ACCEPTED Booking without phone/email → shows 'Phone not provided' / 'Email not provided' safely
    // -------------------------------------------------------------------------
    console.log('\n--- TEST L: ACCEPTED Booking without contact info → safe fallback text ---');
    {
      const acceptedNoContact = {
        bookingId: 'EVA-BOOK-NOCONTACT',
        providerId: 'provider-venue-1',
        providerName: 'Grand Royal Palace',
        category: 'Venue',
        packageName: 'Standard',
        price: 50000,
        startingPrice: 50000,
        status: 'ACCEPTED',
        createdAt: new Date().toISOString(),
        customerId: 'cust_ananya_test',
        customerEmail: 'ananya@eva-ai.internal',
        eventDate: '2026-11-20',
        location: 'Kochi',
        guestCount: 300,
      };

      const pageL = await createConfiguredPage({
        session: mockCustomerSession,
        initialCache: [acceptedNoContact],
        backendBookings: [acceptedNoContact],
        backendDelay: 50,
      });

      await pageL.goto(`${BASE_URL}/customer/bookings`, { waitUntil: 'domcontentloaded' });
      await new Promise((r) => setTimeout(r, 400));

      const finalL = await pageL.evaluate(() => {
        const text = document.body.innerText;
        const hasPhoneNotProvided = text.includes('Phone not provided');
        const hasEmailNotProvided = text.includes('Email not provided');
        const hasCallBtn = Boolean(document.querySelector('a[href^="tel:"]'));
        const hasMailBtn = Boolean(document.querySelector('a[href^="mailto:"]'));
        return {
          hasPhoneNotProvided,
          hasEmailNotProvided,
          hasCallBtn,
          hasMailBtn,
        };
      });

      const passedL =
        finalL.hasPhoneNotProvided &&
        finalL.hasEmailNotProvided &&
        !finalL.hasCallBtn &&
        !finalL.hasMailBtn;

      results['Scenario L (Safe Missing Contact Fallback)'] = passedL;
      console.log('Scenario L Result:', passedL ? 'PASSED' : 'FAILED', finalL);
      await pageL.close();
    }

  } catch (err) {
    console.error('Test Suite Execution Error:', err);
  } finally {
    await browser.close();
  }

  console.log('\n================================================================');
  console.log('--- TEST RESULTS SUMMARY ---');
  console.log('================================================================');
  let allPassed = true;
  for (const [testName, passed] of Object.entries(results)) {
    console.log(`${passed ? '✅ PASS' : '❌ FAIL'}: ${testName}`);
    if (!passed) allPassed = false;
  }
  console.log('================================================================\n');

  if (!allPassed) {
    process.exit(1);
  } else {
    console.log('ALL REGRESSION SCENARIOS PASSED PERFECTLY! 🎉');
  }
}

runRegressionTests();


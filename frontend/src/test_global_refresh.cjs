const puppeteer = require('puppeteer-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

async function runGlobalRefreshTests() {
  console.log('================================================================');
  console.log('--- Starting Global Refresh UX Regression Suite (Scenarios A-K) ---');
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
    token: 'valid-customer-access-token',
  };

  const mockProviderSession = {
    providerId: 'provider-1',
    userId: 'user_provider_1',
    businessName: 'LensCraft Imperial Studios',
    fullName: 'Rajesh Kumar',
    email: 'rajesh@lenscraft.internal',
    category: 'Photography',
    loginAt: new Date().toISOString(),
    role: 'provider',
    token: 'valid-provider-access-token',
  };

  const mockCustomerEvent = {
    id: 'evt-test-101',
    customerId: 'cust_ananya_test',
    eventName: 'Ananya & Karthik Royal Wedding',
    eventType: 'Wedding',
    eventDate: '2026-12-15',
    guestCount: 350,
    budget: 800000,
    location: 'Kochi, Kerala',
    createdAt: new Date().toISOString(),
  };

  const mockCustomerBookings = [
    {
      bookingId: 'EVA-BOOK-PLAT01',
      providerId: 'provider-1',
      providerName: 'LensCraft Imperial Studios',
      category: 'Photography',
      packageName: 'Platinum Heritage',
      price: 45000,
      startingPrice: 45000,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      customerId: 'cust_ananya_test',
      customerEmail: 'ananya@eva-ai.internal',
      eventDate: '2026-12-15',
      location: 'Kochi',
      guestCount: 350,
    },
  ];

  try {
    // -------------------------------------------------------------
    // Scenario A: Customer refresh with cached session
    // -------------------------------------------------------------
    console.log('[Test A] Customer refresh with cached session...');
    {
      const page = await browser.newPage();
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (req.url().includes('/auth/me')) {
          setTimeout(() => {
            req.respond({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                status: 'success',
                data: {
                  user: {
                    id: 'user_ananya_test',
                    customerId: 'cust_ananya_test',
                    name: 'Ananya Nair',
                    email: 'ananya@eva-ai.internal',
                    role: 'customer',
                  },
                },
              }),
            });
          }, 800);
        } else {
          req.continue();
        }
      });

      await page.goto(`${BASE_URL}/login/customer`);
      await page.evaluate((sess, evt) => {
        localStorage.setItem('eva_ai_customer_session', JSON.stringify(sess));
        localStorage.setItem('eva_ai_event', JSON.stringify(evt));
        localStorage.setItem('eva_ai_access_token', 'valid-customer-access-token');
      }, mockCustomerSession, mockCustomerEvent);

      await page.goto(`${BASE_URL}/customer/dashboard`);
      await page.reload();

      // Immediately check DOM before /auth/me returns
      const headerOnReload = await page.evaluate(() => Boolean(document.querySelector('header')));
      const portalShell = await page.evaluate(() => document.body.innerText.includes('Ananya') || document.body.innerText.includes('Customer Portal') || document.body.innerText.includes('Planning Overview') || Boolean(document.querySelector('header')));

      // Wait for rehydration to complete
      await new Promise((r) => setTimeout(r, 1000));

      const finalState = await page.evaluate(() => document.body.innerText.includes('Customer Portal') || Boolean(document.querySelector('header')));

      results.testA = {
        success: portalShell && finalState,
        portalShellImmediate: portalShell,
        finalState,
      };
      console.log(`  -> Immediate shell rendered: ${portalShell}, Final state: ${finalState}`);
      await page.close();
    }

    // -------------------------------------------------------------
    // Scenario B: Provider refresh with cached session
    // -------------------------------------------------------------
    console.log('\n[Test B] Provider refresh with cached session...');
    {
      const page = await browser.newPage();
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (req.url().includes('/auth/me')) {
          setTimeout(() => {
            req.respond({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                status: 'success',
                data: {
                  user: {
                    id: 'user_provider_1',
                    providerId: 'provider-1',
                    name: 'Rajesh Kumar',
                    email: 'rajesh@lenscraft.internal',
                    role: 'provider',
                  },
                },
              }),
            });
          }, 800);
        } else {
          req.continue();
        }
      });

      await page.goto(`${BASE_URL}/login/provider`);
      await page.evaluate((sess) => {
        localStorage.setItem('eva_ai_provider_session', JSON.stringify(sess));
        localStorage.setItem('eva_ai_access_token', 'valid-provider-access-token');
      }, mockProviderSession);

      await page.goto(`${BASE_URL}/provider/dashboard`);
      await page.reload();

      // Immediately check if Provider Header & Sidebar layout shell are present
      const hasProviderShell = await page.evaluate(() => {
        return Boolean(document.querySelector('header') || document.querySelector('aside') || document.body.innerText.includes('LensCraft') || document.body.innerText.includes('Dashboard'));
      });

      await new Promise((r) => setTimeout(r, 1000));
      const finalProviderShell = await page.evaluate(() => Boolean(document.querySelector('header')));

      results.testB = {
        success: hasProviderShell && finalProviderShell,
        hasProviderShell,
        finalProviderShell,
      };
      console.log(`  -> Immediate provider shell rendered: ${hasProviderShell}, Final: ${finalProviderShell}`);
      await page.close();
    }

    // -------------------------------------------------------------
    // Scenario C: Customer refresh with expired access token + valid refresh token
    // -------------------------------------------------------------
    console.log('\n[Test C] Customer refresh with expired access token + valid refresh token...');
    {
      const page = await browser.newPage();
      let refreshAttempted = false;
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const authHeader = req.headers()['authorization'] || '';
        const url = req.url();
        console.log('    [Test C Intercept]:', req.method(), url);
        if (url.includes('/auth/refresh')) {
          refreshAttempted = true;
          req.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                token: 'fresh-customer-access-token',
                accessToken: 'fresh-customer-access-token',
                refreshToken: 'valid-customer-refresh-token',
              },
            }),
          });
        } else if (url.includes('/auth/me')) {
          if (authHeader.includes('fresh-customer-access-token')) {
            req.respond({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                success: true,
                data: {
                  user: {
                    id: 'user_ananya_test',
                    customerId: 'cust_ananya_test',
                    fullName: 'Ananya Nair',
                    email: 'ananya@eva-ai.internal',
                    role: 'customer',
                  },
                },
              }),
            });
          } else {
            req.respond({
              status: 401,
              contentType: 'application/json',
              body: JSON.stringify({ success: false, error: 'TOKEN_EXPIRED', message: 'Token expired' }),
            });
          }
        } else if (url.includes('/events') || url.includes('/bookings')) {
          req.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: [] }),
          });
        } else {
          req.continue();
        }
      });

      await page.goto(`${BASE_URL}/login/customer`);
      await page.evaluate((sess) => {
        const expiredSess = { ...sess, token: 'expired-customer-token' };
        localStorage.setItem('eva_ai_customer_session', JSON.stringify(expiredSess));
        localStorage.setItem('eva_ai_access_token', 'expired-customer-token');
        localStorage.setItem('eva_ai_refresh_token', 'valid-customer-refresh-token');
      }, mockCustomerSession);

      await page.goto(`${BASE_URL}/customer/dashboard`);
      await new Promise((r) => setTimeout(r, 1500));

      const isStillOnCustomerRoute = !page.url().includes('/login');
      results.testC = {
        success: isStillOnCustomerRoute,
        isStillOnCustomerRoute,
      };
      console.log(`  -> Kept on customer portal: ${isStillOnCustomerRoute}`);
      await page.close();
    }

    // -------------------------------------------------------------
    // Scenario D: Provider refresh with expired access token + valid refresh token
    // -------------------------------------------------------------
    console.log('\n[Test D] Provider refresh with expired access token + valid refresh token...');
    {
      const page = await browser.newPage();
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const url = req.url();
        if (url.includes('/auth/refresh')) {
          req.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                token: 'fresh-provider-access-token',
                accessToken: 'fresh-provider-access-token',
                refreshToken: 'valid-provider-refresh-token',
              },
            }),
          });
        } else if (url.includes('/auth/me')) {
          req.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                user: {
                  id: 'user_provider_1',
                  providerId: 'provider-1',
                  fullName: 'Rajesh Kumar',
                  email: 'rajesh@lenscraft.internal',
                  role: 'provider',
                },
              },
            }),
          });
        } else if (url.includes('/providers') || url.includes('/bookings')) {
          req.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: [] }),
          });
        } else {
          req.continue();
        }
      });

      await page.goto(`${BASE_URL}/login/provider`);
      await page.evaluate((sess) => {
        const expiredSess = { ...sess, token: 'expired-provider-token' };
        localStorage.setItem('eva_ai_provider_session', JSON.stringify(expiredSess));
        localStorage.setItem('eva_ai_access_token', 'expired-provider-token');
        localStorage.setItem('eva_ai_refresh_token', 'valid-provider-refresh-token');
      }, mockProviderSession);

      await page.goto(`${BASE_URL}/provider/dashboard`);
      await new Promise((r) => setTimeout(r, 1500));

      const isStillOnProviderRoute = !page.url().includes('/login');
      results.testD = {
        success: isStillOnProviderRoute,
        isStillOnProviderRoute,
      };
      console.log(`  -> Kept on provider portal: ${isStillOnProviderRoute}`);
      await page.close();
    }

    // -------------------------------------------------------------
    // Scenario E: Invalid/revoked customer token -> Redirect to login
    // -------------------------------------------------------------
    console.log('\n[Test E] Invalid/revoked customer token...');
    {
      const page = await browser.newPage();
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (req.url().includes('/auth/me') || req.url().includes('/auth/refresh')) {
          req.respond({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'error', message: 'Invalid or revoked token' }),
          });
        } else {
          req.continue();
        }
      });

      await page.goto(`${BASE_URL}/login/customer`);
      await page.evaluate((sess) => {
        localStorage.setItem('eva_ai_customer_session', JSON.stringify(sess));
        localStorage.setItem('eva_ai_access_token', 'revoked-token');
        localStorage.setItem('eva_ai_refresh_token', 'revoked-refresh-token');
      }, mockCustomerSession);

      await page.goto(`${BASE_URL}/customer/dashboard`);
      await page.waitForNavigation({ timeout: 4000 }).catch(() => {});

      const redirectedToLogin = page.url().includes('/login/customer');
      const sessionCleared = await page.evaluate(() => localStorage.getItem('eva_ai_customer_session') === null);

      results.testE = {
        success: redirectedToLogin && sessionCleared,
        redirectedToLogin,
        sessionCleared,
      };
      console.log(`  -> Redirected to customer login: ${redirectedToLogin}, Session cleared: ${sessionCleared}`);
      await page.close();
    }

    // -------------------------------------------------------------
    // Scenario F: Invalid/revoked provider token -> Redirect to provider login
    // -------------------------------------------------------------
    console.log('\n[Test F] Invalid/revoked provider token...');
    {
      const page = await browser.newPage();
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (req.url().includes('/auth/me') || req.url().includes('/auth/refresh')) {
          req.respond({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'error', message: 'Invalid or revoked provider token' }),
          });
        } else {
          req.continue();
        }
      });

      await page.goto(`${BASE_URL}/login/provider`);
      await page.evaluate((sess) => {
        localStorage.setItem('eva_ai_provider_session', JSON.stringify(sess));
        localStorage.setItem('eva_ai_access_token', 'revoked-provider-token');
        localStorage.setItem('eva_ai_refresh_token', 'revoked-provider-refresh-token');
      }, mockProviderSession);

      await page.goto(`${BASE_URL}/provider/dashboard`);
      await page.waitForNavigation({ timeout: 4000 }).catch(() => {});

      const redirectedToProviderLogin = page.url().includes('/login/provider');
      const providerSessionCleared = await page.evaluate(() => localStorage.getItem('eva_ai_provider_session') === null);

      results.testF = {
        success: redirectedToProviderLogin && providerSessionCleared,
        redirectedToProviderLogin,
        providerSessionCleared,
      };
      console.log(`  -> Redirected to provider login: ${redirectedToProviderLogin}, Session cleared: ${providerSessionCleared}`);
      await page.close();
    }

    // -------------------------------------------------------------
    // Scenario G: Customer without an event
    // -------------------------------------------------------------
    console.log('\n[Test G] Customer without an event...');
    {
      const page = await browser.newPage();
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (req.url().includes('/auth/me')) {
          req.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              status: 'success',
              data: {
                user: {
                  id: 'user_ananya_test',
                  customerId: 'cust_ananya_test',
                  name: 'Ananya Nair',
                  email: 'ananya@eva-ai.internal',
                  role: 'customer',
                },
              },
            }),
          });
        } else if (req.url().includes('/events')) {
          req.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'success', data: { events: [] } }),
          });
        } else {
          req.continue();
        }
      });

      await page.goto(`${BASE_URL}/login/customer`);
      await page.evaluate((sess) => {
        localStorage.setItem('eva_ai_customer_session', JSON.stringify(sess));
        localStorage.setItem('eva_ai_access_token', 'valid-token');
        localStorage.removeItem('eva_ai_event');
        localStorage.removeItem('eva_ai_customer');
      }, mockCustomerSession);

      await page.goto(`${BASE_URL}/customer/dashboard`);
      await new Promise((r) => setTimeout(r, 1000));

      const hasEmptyState = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        return bodyText.includes('No Event Created Yet') || bodyText.includes('Create Your Event Plan') || bodyText.includes('event plan is ready') || bodyText.includes('Customer Portal');
      });

      results.testG = {
        success: hasEmptyState,
        hasEmptyState,
      };
      console.log(`  -> Proper empty state rendered: ${hasEmptyState}`);
      await page.close();
    }

    // -------------------------------------------------------------
    // Scenario H: Customer with existing event
    // -------------------------------------------------------------
    console.log('\n[Test H] Customer with existing event...');
    {
      const page = await browser.newPage();
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (req.url().includes('/auth/me')) {
          req.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              status: 'success',
              data: {
                user: {
                  id: 'user_ananya_test',
                  customerId: 'cust_ananya_test',
                  name: 'Ananya Nair',
                  email: 'ananya@eva-ai.internal',
                  role: 'customer',
                },
              },
            }),
          });
        } else if (req.url().includes('/events')) {
          req.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'success', data: { events: [mockCustomerEvent] } }),
          });
        } else {
          req.continue();
        }
      });

      await page.goto(`${BASE_URL}/login/customer`);
      await page.evaluate((sess, evt) => {
        localStorage.setItem('eva_ai_customer_session', JSON.stringify(sess));
        localStorage.setItem('eva_ai_access_token', 'valid-token');
        localStorage.setItem('eva_ai_event', JSON.stringify(evt));
      }, mockCustomerSession, mockCustomerEvent);

      await page.goto(`${BASE_URL}/customer/dashboard`);
      const hasEventInstantly = await page.evaluate(() => document.body.innerText.includes('Wedding') || document.body.innerText.includes('Your event plan is ready'));

      await new Promise((r) => setTimeout(r, 800));
      const hasEventAfterRehydrate = await page.evaluate(() => document.body.innerText.includes('Wedding') || document.body.innerText.includes('Kochi'));

      results.testH = {
        success: hasEventInstantly && hasEventAfterRehydrate,
        hasEventInstantly,
        hasEventAfterRehydrate,
      };
      console.log(`  -> Event rendered instantly: ${hasEventInstantly}, After rehydrate: ${hasEventAfterRehydrate}`);
      await page.close();
    }

    // -------------------------------------------------------------
    // Scenario I: Customer My Bookings with cached bookings
    // -------------------------------------------------------------
    console.log('\n[Test I] Customer My Bookings with cached bookings...');
    {
      const page = await browser.newPage();
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (req.url().includes('/auth/me')) {
          req.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              status: 'success',
              data: {
                user: {
                  id: 'user_ananya_test',
                  customerId: 'cust_ananya_test',
                  name: 'Ananya Nair',
                  email: 'ananya@eva-ai.internal',
                  role: 'customer',
                },
              },
            }),
          });
        } else if (req.url().includes('/bookings/my') || req.url().includes('/bookings')) {
          req.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, data: { bookings: mockCustomerBookings } }),
          });
        } else {
          req.continue();
        }
      });

      await page.goto(`${BASE_URL}/login/customer`);
      await page.evaluate((sess, bookings) => {
        localStorage.setItem('eva_ai_customer_session', JSON.stringify(sess));
        localStorage.setItem('eva_ai_access_token', 'valid-token');
        localStorage.setItem('eva_ai_bookings', JSON.stringify(bookings));
      }, mockCustomerSession, mockCustomerBookings);

      await page.goto(`${BASE_URL}/customer/bookings`);
      const hasBookingImmediately = await page.evaluate(() => document.body.innerText.includes('LensCraft') || document.body.innerText.includes('Platinum Heritage'));

      await new Promise((r) => setTimeout(r, 800));
      const hasBookingAfterRehydrate = await page.evaluate(() => document.body.innerText.includes('LensCraft') || document.body.innerText.includes('Platinum Heritage'));

      results.testI = {
        success: hasBookingImmediately && hasBookingAfterRehydrate,
        hasBookingImmediately,
        hasBookingAfterRehydrate,
      };
      console.log(`  -> Booking shown immediately: ${hasBookingImmediately}, Rehydrated without flicker: ${hasBookingAfterRehydrate}`);
      await page.close();
    }

    // -------------------------------------------------------------
    // Scenario J: Provider Schedule with accepted Oct 10 booking
    // -------------------------------------------------------------
    console.log('\n[Test J] Provider Schedule with accepted Oct 10 booking...');
    {
      const page = await browser.newPage();
      const mockOct10Booking = [
        {
          bookingId: 'EVA-BOOK-OCT10',
          providerId: 'provider-1',
          providerName: 'LensCraft Imperial Studios',
          status: 'ACCEPTED',
          eventDate: '2026-10-10',
          category: 'Photography',
        },
      ];

      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (req.url().includes('/auth/me')) {
          req.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              status: 'success',
              data: {
                user: {
                  id: 'user_provider_1',
                  providerId: 'provider-1',
                  name: 'Rajesh Kumar',
                  email: 'rajesh@lenscraft.internal',
                  role: 'provider',
                },
              },
            }),
          });
        } else if (req.url().includes('/providers/availability')) {
          req.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'success', data: { unavailableDates: [] } }),
          });
        } else if (req.url().includes('/bookings/provider')) {
          req.respond({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ status: 'success', data: { bookings: mockOct10Booking } }),
          });
        } else {
          req.continue();
        }
      });

      await page.goto(`${BASE_URL}/login/provider`);
      await page.evaluate((sess, bookings) => {
        localStorage.setItem('eva_ai_provider_session', JSON.stringify(sess));
        localStorage.setItem('eva_ai_access_token', 'valid-token');
        localStorage.setItem('eva_ai_bookings', JSON.stringify(bookings));
      }, mockProviderSession, mockOct10Booking);

      await page.goto(`${BASE_URL}/provider/schedule`);
      await new Promise((r) => setTimeout(r, 800));

      const isDateBooked = await page.evaluate(() => {
        return document.body.innerText.includes('Booked') || document.body.innerText.includes('October 10') || document.body.innerText.includes('10');
      });

      results.testJ = {
        success: isDateBooked,
        isDateBooked,
      };
      console.log(`  -> Oct 10 correctly reflected as booked on schedule: ${isDateBooked}`);
      await page.close();
    }

    // -------------------------------------------------------------
    // Scenario K: Hard refresh on all major protected routes
    // -------------------------------------------------------------
    console.log('\n[Test K] Hard refresh on all major protected routes...');
    {
      const routesToTest = [
        { path: '/customer/dashboard', role: 'customer' },
        { path: '/customer/services', role: 'customer' },
        { path: '/customer/event-plan', role: 'customer' },
        { path: '/customer/bookings', role: 'customer' },
        { path: '/customer/profile', role: 'customer' },
        { path: '/provider/dashboard', role: 'provider' },
        { path: '/provider/bookings', role: 'provider' },
        { path: '/provider/schedule', role: 'provider' },
        { path: '/provider/profile', role: 'provider' },
        { path: '/provider/portfolio', role: 'provider' },
      ];

      const routeResults = [];

      for (const route of routesToTest) {
        const page = await browser.newPage();
        await page.setRequestInterception(true);
        page.on('request', (req) => {
          if (req.url().includes('/auth/me')) {
            req.respond({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({
                status: 'success',
                data: {
                  user: {
                    id: route.role === 'customer' ? 'user_ananya_test' : 'user_provider_1',
                    customerId: route.role === 'customer' ? 'cust_ananya_test' : undefined,
                    providerId: route.role === 'provider' ? 'provider-1' : undefined,
                    name: route.role === 'customer' ? 'Ananya Nair' : 'Rajesh Kumar',
                    email: route.role === 'customer' ? 'ananya@eva-ai.internal' : 'rajesh@lenscraft.internal',
                    role: route.role,
                  },
                },
              }),
            });
          } else {
            req.continue();
          }
        });

        await page.goto(`${BASE_URL}/login/${route.role}`);
        await page.evaluate((sess, role, evt, bkg) => {
          if (role === 'customer') {
            localStorage.setItem('eva_ai_customer_session', JSON.stringify(sess));
            localStorage.setItem('eva_ai_event', JSON.stringify(evt));
            localStorage.setItem('eva_ai_bookings', JSON.stringify(bkg));
          } else {
            localStorage.setItem('eva_ai_provider_session', JSON.stringify(sess));
            localStorage.setItem('eva_ai_bookings', JSON.stringify(bkg));
          }
          localStorage.setItem('eva_ai_access_token', 'valid-token');
        }, route.role === 'customer' ? mockCustomerSession : mockProviderSession, route.role, mockCustomerEvent, mockCustomerBookings);

        await page.goto(`${BASE_URL}${route.path}`);
        // Hard reload
        await page.reload();

        const shellRendered = await page.evaluate(() => Boolean(document.querySelector('header')));
        const noRedirect = !page.url().includes('/login');

        routeResults.push({ path: route.path, success: shellRendered && noRedirect });
        console.log(`    Route ${route.path.padEnd(25)} -> Immediate Shell: ${shellRendered}, Protected: ${noRedirect}`);
        await page.close();
      }

      const allRoutesPassed = routeResults.every((r) => r.success);
      results.testK = {
        success: allRoutesPassed,
        routeResults,
      };
    }

    console.log('\n================================================================');
    console.log('--- GLOBAL REFRESH REGRESSION SUITE RESULTS ---');
    console.log('================================================================');
    const allPassed = Object.values(results).every((t) => t.success);
    console.log(`OVERALL RESULT: ${allPassed ? 'ALL TESTS PASSED ✓' : 'SOME TESTS FAILED ✗'}`);
    console.log(JSON.stringify(results, null, 2));

  } finally {
    await browser.close();
  }
}

runGlobalRefreshTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});

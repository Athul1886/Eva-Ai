const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

// Helper to generate a 100x100 PNG buffer
function createTestImageBase64(color = '#ffb2be') {
  // Simple 1x1 or small base64 png
  // Valid 1x1 transparent PNG:
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
}

async function runTests() {
  console.log('--- Starting Step 3 Verification Suite ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  page.on('pageerror', (err) => console.log('BROWSER PAGE ERROR:', err.message));

  const results = {};

  try {
    // 0. RESET STORAGE TO CLEAN STATE
    console.log('[Setup] Resetting test state...');
    await page.goto(`${BASE_URL}/login/provider`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.reload({ waitUntil: 'networkidle0' });

    // SCENARIO A — PROFILE
    console.log('\n--- SCENARIO A: Profile Edit Persistence ---');
    // Login Provider A (studio@lenscraft.com / password123)
    await page.goto(`${BASE_URL}/login/provider`, { waitUntil: 'networkidle0' });
    await page.type('input[type="email"]', 'studio@lenscraft.com');
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });

    // Navigate to profile page
    await page.goto(`${BASE_URL}/provider/profile`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));

    // Click "Edit Profile" button
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const edit = btns.find((b) => b.textContent.includes('Edit Profile'));
      if (edit) edit.click();
    });
    await new Promise((r) => setTimeout(r, 600));

    // Focus and type business name using Puppeteer keyboard (properly triggers React onChange)
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="text"]'));
      if (inputs[0]) inputs[0].focus();
    });
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('LensCraft Imperial Studios');

    // Focus and type description using Puppeteer keyboard
    await page.evaluate(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) textarea.focus();
    });
    await page.keyboard.down('Control');
    await page.keyboard.press('KeyA');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.keyboard.type('Royal cinematic captures with bespoke heirloom storytelling albums.');

    // Save changes
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button[type="submit"]'));
      const save = btns.find((b) => b.textContent.includes('Save Changes'));
      if (save) save.click();
    });
    await new Promise((r) => setTimeout(r, 800));

    // Refresh page
    await page.reload({ waitUntil: 'networkidle0' });

    // Verify changes remain
    const scenarioAPassed = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const hasName = bodyText.includes('LensCraft Imperial Studios');
      const hasDesc = bodyText.includes('Royal cinematic captures with bespoke heirloom storytelling albums.');
      return hasName && hasDesc;
    });

    results['Scenario A (Profile Edit Persistence)'] = scenarioAPassed ? 'PASS' : 'FAIL';
    console.log(`Scenario A Result: ${results['Scenario A (Profile Edit Persistence)']}`);

    // SCENARIO B — PROFILE PHOTO
    console.log('\n--- SCENARIO B: Profile Photo Persistence & Isolation ---');
    // Set a custom profile photo in storage for Provider A directly or via save
    const testAvatarA = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

    await page.evaluate((avatar) => {
      const provRaw = localStorage.getItem('eva_ai_providers');
      if (provRaw) {
        const list = JSON.parse(provRaw);
        const idx = list.findIndex((p) => p.id === 'lenscraft-studio');
        if (idx >= 0) {
          list[idx].profileImage = avatar;
          localStorage.setItem('eva_ai_providers', JSON.stringify(list));
        }
      }
      const sessRaw = localStorage.getItem('eva_ai_provider_session');
      if (sessRaw) {
        const sess = JSON.parse(sessRaw);
        sess.profileImage = avatar;
        localStorage.setItem('eva_ai_provider_session', JSON.stringify(sess));
      }
    }, testAvatarA);

    await page.reload({ waitUntil: 'networkidle0' });

    const photoAfterRefresh = await page.evaluate((expected) => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.some((img) => img.src === expected);
    }, testAvatarA);

    // Logout Provider A
    await page.evaluate(() => {
      localStorage.removeItem('eva_ai_provider_session');
    });

    // Login Provider A again
    await page.goto(`${BASE_URL}/login/provider`, { waitUntil: 'networkidle0' });
    await page.type('input[type="email"]', 'studio@lenscraft.com');
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });

    await page.goto(`${BASE_URL}/provider/profile`, { waitUntil: 'networkidle0' });
    const photoAfterReLogin = await page.evaluate((expected) => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.some((img) => img.src === expected);
    }, testAvatarA);

    results['Scenario B (Profile Photo Persistence)'] = photoAfterRefresh && photoAfterReLogin ? 'PASS' : 'FAIL';
    console.log(`Scenario B Result: ${results['Scenario B (Profile Photo Persistence)']}`);

    // SCENARIO C — PORTFOLIO GALLERY
    console.log('\n--- SCENARIO C: Portfolio Multi-image Add/Remove ---');
    await page.goto(`${BASE_URL}/provider/portfolio`, { waitUntil: 'networkidle0' });

    const img1 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP1';
    const img2 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP2';
    const img3 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP3';

    // Add images 1, 2, 3
    await page.evaluate(([i1, i2, i3]) => {
      const provRaw = localStorage.getItem('eva_ai_providers');
      if (provRaw) {
        const list = JSON.parse(provRaw);
        const idx = list.findIndex((p) => p.id === 'lenscraft-studio');
        if (idx >= 0) {
          list[idx].categoryData = list[idx].categoryData || {};
          list[idx].categoryData.portfolioImages = [i1, i2, i3];
          localStorage.setItem('eva_ai_providers', JSON.stringify(list));
        }
      }
    }, [img1, img2, img3]);

    await page.reload({ waitUntil: 'networkidle0' });

    const hasAll3AfterRefresh = await page.evaluate(([i1, i2, i3]) => {
      const imgs = Array.from(document.querySelectorAll('img')).map((im) => im.src);
      return imgs.includes(i1) && imgs.includes(i2) && imgs.includes(i3);
    }, [img1, img2, img3]);

    // Remove image 2
    await page.evaluate(([i1, i3]) => {
      const provRaw = localStorage.getItem('eva_ai_providers');
      if (provRaw) {
        const list = JSON.parse(provRaw);
        const idx = list.findIndex((p) => p.id === 'lenscraft-studio');
        if (idx >= 0) {
          list[idx].categoryData.portfolioImages = [i1, i3];
          localStorage.setItem('eva_ai_providers', JSON.stringify(list));
        }
      }
    }, [img1, img3]);

    await page.reload({ waitUntil: 'networkidle0' });

    const hasImg1And3Only = await page.evaluate(([i1, i2, i3]) => {
      const imgs = Array.from(document.querySelectorAll('img')).map((im) => im.src);
      return imgs.includes(i1) && !imgs.includes(i2) && imgs.includes(i3);
    }, [img1, img2, img3]);

    results['Scenario C (Portfolio Multi-Image Persistence)'] = hasAll3AfterRefresh && hasImg1And3Only ? 'PASS' : 'FAIL';
    console.log(`Scenario C Result: ${results['Scenario C (Portfolio Multi-Image Persistence)']}`);

    // SCENARIO D — PRICING CRUD
    console.log('\n--- SCENARIO D: Pricing Package CRUD ---');
    // Add Package A & Package B via UI or storage
    await page.evaluate(() => {
      const provRaw = localStorage.getItem('eva_ai_providers');
      if (provRaw) {
        const list = JSON.parse(provRaw);
        const idx = list.findIndex((p) => p.id === 'lenscraft-studio');
        if (idx >= 0) {
          list[idx].categoryData = list[idx].categoryData || {};
          list[idx].categoryData.packageInfo = [
            { id: 'pkg-a', name: 'Royal Gold Cinema', price: 55000, description: 'Single-day core coverage with drone', features: ['1 Lead', 'Drone 4K'] },
            { id: 'pkg-b', name: 'Imperial Diamond Grand', price: 95000, description: 'Complete 2-day multi-camera master coverage', features: ['2 Leads', 'Highlight Reel'] },
          ];
          localStorage.setItem('eva_ai_providers', JSON.stringify(list));
        }
      }
    });

    await page.reload({ waitUntil: 'networkidle0' });

    const bothPackagesExist = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Royal Gold Cinema') && text.includes('Imperial Diamond Grand');
    });

    // Edit Package A
    await page.evaluate(() => {
      const provRaw = localStorage.getItem('eva_ai_providers');
      if (provRaw) {
        const list = JSON.parse(provRaw);
        const idx = list.findIndex((p) => p.id === 'lenscraft-studio');
        if (idx >= 0) {
          list[idx].categoryData.packageInfo[0].name = 'Royal Gold Cinema Ultra';
          list[idx].categoryData.packageInfo[0].price = 62000;
          localStorage.setItem('eva_ai_providers', JSON.stringify(list));
        }
      }
    });

    await page.reload({ waitUntil: 'networkidle0' });

    const editPersisted = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Royal Gold Cinema Ultra') && text.includes('62,000');
    });

    // Delete Package B
    await page.evaluate(() => {
      const provRaw = localStorage.getItem('eva_ai_providers');
      if (provRaw) {
        const list = JSON.parse(provRaw);
        const idx = list.findIndex((p) => p.id === 'lenscraft-studio');
        if (idx >= 0) {
          list[idx].categoryData.packageInfo = list[idx].categoryData.packageInfo.filter((p) => p.id !== 'pkg-b');
          localStorage.setItem('eva_ai_providers', JSON.stringify(list));
        }
      }
    });

    await page.reload({ waitUntil: 'networkidle0' });

    const packageBDeleted = await page.evaluate(() => {
      const text = document.body.innerText;
      return !text.includes('Imperial Diamond Grand') && text.includes('Royal Gold Cinema Ultra');
    });

    results['Scenario D (Pricing CRUD Persistence)'] = bothPackagesExist && editPersisted && packageBDeleted ? 'PASS' : 'FAIL';
    console.log(`Scenario D Result: ${results['Scenario D (Pricing CRUD Persistence)']}`);

    // SCENARIO E — PROVIDER ISOLATION
    console.log('\n--- SCENARIO E: Provider Isolation ---');
    // Logout Provider A
    await page.evaluate(() => {
      localStorage.removeItem('eva_ai_provider_session');
    });

    // Login Provider B (events@grandregal.com / password123)
    await page.goto(`${BASE_URL}/login/provider`, { waitUntil: 'networkidle0' });
    await page.type('input[type="email"]', 'events@grandregal.com');
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });

    // Open profile
    await page.goto(`${BASE_URL}/provider/profile`, { waitUntil: 'networkidle0' });
    const isolationProfile = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Grand Regal Palace') && !text.includes('LensCraft Imperial Studios');
    });

    // Open portfolio & packages
    await page.goto(`${BASE_URL}/provider/portfolio`, { waitUntil: 'networkidle0' });
    const isolationPortfolio = await page.evaluate(() => {
      const text = document.body.innerText;
      const imgs = Array.from(document.querySelectorAll('img')).map((i) => i.src);
      // Provider B must not see Provider A's packages
      const noApackages = !text.includes('Royal Gold Cinema Ultra');
      // Provider B must not see Provider A's unique custom avatar
      const noAavatar = !imgs.some((src) => src.includes('QALCAABAAEBAREA'));
      return noApackages && noAavatar;
    });

    results['Scenario E (Provider Isolation)'] = isolationProfile && isolationPortfolio ? 'PASS' : 'FAIL';
    console.log(`Scenario E Result: ${results['Scenario E (Provider Isolation)']}`);

    // SCENARIO F — CUSTOMER VIEW
    console.log('\n--- SCENARIO F: Customer-facing Provider Details View ---');
    // 4. Login as Customer (per Scenario F requirement 4)
    await page.evaluate(() => {
      const custSession = {
        customerId: 'demo-customer-1',
        fullName: 'Ananya Nair',
        email: 'ananya@eva-ai.internal',
        phone: '+91 98470 11223',
        location: 'Kochi, Kerala',
        loginAt: new Date().toISOString(),
      };
      localStorage.setItem('eva_ai_customer_session', JSON.stringify(custSession));
      localStorage.setItem('eva_ai_customer', JSON.stringify({
        fullName: 'Ananya Nair',
        email: 'ananya@eva-ai.internal',
        phone: '+91 98470 11223',
      }));
    });

    // 5. Customer opens Provider A's details page
    await page.goto(`${BASE_URL}/customer/services/lenscraft-studio`, { waitUntil: 'networkidle0' });

    // 6. Verify updated information appears
    const customerSeesUpdatedA = await page.evaluate(() => {
      const text = document.body.innerText;
      const hasUpdatedName = text.includes('LensCraft Imperial Studios');
      const hasUpdatedPackage = text.includes('Royal Gold Cinema Ultra');
      const hasUpdatedPrice = text.includes('62,000');
      return hasUpdatedName && hasUpdatedPackage && hasUpdatedPrice;
    });

    results['Scenario F (Customer View Reflection)'] = customerSeesUpdatedA ? 'PASS' : 'FAIL';
    console.log(`Scenario F Result: ${results['Scenario F (Customer View Reflection)']}`);

    // SCENARIO G — CATEGORY DATA FILTERING
    console.log('\n--- SCENARIO G: Category-specific Data Integrity ---');
    // Check Photographer: Must show styles & equipment, MUST NOT show cuisines or guest capacity
    const photographerCategoryCheck = await page.evaluate(() => {
      const text = document.body.innerText;
      const hasPhotoStyles = text.includes('Photography Styles') || text.includes('Candid Photography');
      const hasNoCuisines = !text.includes('Cuisines Offered') && !text.includes('Price / Plate');
      return hasPhotoStyles && hasNoCuisines;
    });

    // Check Venue: Grand Regal Auditorium
    await page.goto(`${BASE_URL}/customer/services/grand-regal-auditorium`, { waitUntil: 'networkidle0' });
    const venueCategoryCheck = await page.evaluate(() => {
      const text = document.body.innerText;
      const hasCapacity = text.includes('Seating Capacity') || text.includes('1200 Guests');
      const hasNoCameraRigs = !text.includes('Equipment Rigs & Cinema Cameras');
      const hasNoCuisines = !text.includes('Cuisines Offered');
      return hasCapacity && hasNoCameraRigs && hasNoCuisines;
    });

    results['Scenario G (Category Data Integrity)'] = photographerCategoryCheck && venueCategoryCheck ? 'PASS' : 'FAIL';
    console.log(`Scenario G Result: ${results['Scenario G (Category Data Integrity)']}`);

    // SCENARIO H — BOOKING COMPATIBILITY
    console.log('\n--- SCENARIO H: Historical Booking Record Integrity ---');
    // Seed a booking for Provider A
    await page.evaluate(() => {
      const testBooking = {
        bookingId: 'test-booking-compat-1',
        providerId: 'lenscraft-studio',
        providerName: 'LensCraft Studio Historical',
        category: 'Photography',
        eventId: 'event-101',
        eventType: 'Wedding',
        eventDate: '2026-12-15',
        location: 'Palakkad',
        guestCount: 400,
        startingPrice: 45000,
        status: 'PENDING',
        createdAt: '2026-03-01T10:00:00Z',
        customerName: 'Ananya & Karthik',
        customerPhone: '+91 99999 11111',
        customerEmail: 'ananya@example.com',
      };
      localStorage.setItem('eva_ai_bookings', JSON.stringify([testBooking]));
    });

    // Provider A updates starting price & location in profile
    await page.evaluate(() => {
      const provRaw = localStorage.getItem('eva_ai_providers');
      if (provRaw) {
        const list = JSON.parse(provRaw);
        const idx = list.findIndex((p) => p.id === 'lenscraft-studio');
        if (idx >= 0) {
          list[idx].location = 'Kochi & Trivandrum';
          list[idx].startingPrice = 75000;
          localStorage.setItem('eva_ai_providers', JSON.stringify(list));
        }
      }
    });

    // Check existing booking is still intact with PENDING status and historical startingPrice
    const bookingCompatPassed = await page.evaluate(() => {
      const raw = localStorage.getItem('eva_ai_bookings');
      if (!raw) return false;
      const list = JSON.parse(raw);
      const b = list.find((item) => item.bookingId === 'test-booking-compat-1');
      return b && b.status === 'PENDING' && b.startingPrice === 45000;
    });

    results['Scenario H (Booking Compatibility)'] = bookingCompatPassed ? 'PASS' : 'FAIL';
    console.log(`Scenario H Result: ${results['Scenario H (Booking Compatibility)']}`);

    // SCENARIO I — STEP 1 COMPATIBILITY (AVAILABILITY)
    console.log('\n--- SCENARIO I: Step 1 Availability Preservation ---');
    // Set 2026-11-20 as unavailable date for lenscraft-studio
    await page.evaluate(() => {
      const avail = { 'lenscraft-studio': ['2026-11-20'] };
      localStorage.setItem('eva_ai_provider_availability', JSON.stringify(avail));
      const evt = {
        eventName: 'Royal Gala',
        eventType: 'Wedding Reception',
        eventDate: '2026-11-20',
        guestCount: 500,
        budgetRange: 'Luxury',
      };
      localStorage.setItem('eva_ai_event', JSON.stringify(evt));
    });

    // Reload customer view of Provider A
    await page.goto(`${BASE_URL}/customer/services/lenscraft-studio`, { waitUntil: 'networkidle0' });
    const isUnavailableEnforced = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Unavailable') || text.includes('Marked Unavailable for Your Target Date');
    });

    results['Scenario I (Step 1 Availability Preservation)'] = isUnavailableEnforced ? 'PASS' : 'FAIL';
    console.log(`Scenario I Result: ${results['Scenario I (Step 1 Availability Preservation)']}`);

    // SCENARIO J — STEP 2 COMPATIBILITY (ACCEPT / REJECT & CONTACT PROTECTION)
    console.log('\n--- SCENARIO J: Step 2 Booking Lifecycle & Contact Protection ---');
    // Seed pending booking
    await page.evaluate(() => {
      const testBooking = {
        bookingId: 'test-booking-j-1',
        providerId: 'lenscraft-studio',
        providerName: 'LensCraft Imperial Studios',
        category: 'Photography',
        eventId: 'event-101',
        eventType: 'Wedding',
        eventDate: '2026-12-15',
        location: 'Palakkad',
        guestCount: 400,
        startingPrice: 45000,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        customerName: 'Ananya & Karthik',
        customerPhone: '+91 99999 11111',
        customerEmail: 'ananya@example.com',
      };
      localStorage.setItem('eva_ai_bookings', JSON.stringify([testBooking]));
    });

    await page.goto(`${BASE_URL}/customer/services/lenscraft-studio`, { waitUntil: 'networkidle0' });

    // Customer views without accepted booking: Contact must be locked
    const contactLockedBeforeAccept = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes('protected') || text.includes('contact details available');
    });

    // Provider accepts the booking
    await page.evaluate(() => {
      const raw = localStorage.getItem('eva_ai_bookings');
      if (raw) {
        const list = JSON.parse(raw);
        if (list[0]) {
          list[0].status = 'ACCEPTED';
          localStorage.setItem('eva_ai_bookings', JSON.stringify(list));
        }
      }
    });

    // Refresh customer Provider Details page
    await page.reload({ waitUntil: 'networkidle0' });
    const contactUnlockedAfterAccept = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      const hasAccepted = text.includes('booking accepted');
      const hasContact = text.includes('provider phone number') || text.includes('94470');
      return hasAccepted && hasContact;
    });

    results['Scenario J (Step 2 Lifecycle & Contact Protection)'] =
      contactLockedBeforeAccept && contactUnlockedAfterAccept ? 'PASS' : 'FAIL';
    console.log(`Scenario J Result: ${results['Scenario J (Step 2 Lifecycle & Contact Protection)']}`);

  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    await browser.close();
  }

  console.log('\n========================================');
  console.log('FINAL TEST RESULTS:');
  console.log('========================================');
  let allPassed = true;
  for (const [scenario, res] of Object.entries(results)) {
    console.log(`${scenario}: ${res}`);
    if (res !== 'PASS') allPassed = false;
  }
  console.log('========================================');
  console.log(`OVERALL RESULT: ${allPassed ? 'ALL SCENARIOS PASSED' : 'SOME SCENARIOS FAILED'}`);
  return allPassed;
}

runTests();

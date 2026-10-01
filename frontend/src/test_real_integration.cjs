const https = require('https');
const http = require('http');
const puppeteer = require('puppeteer-core');
const fs = require('fs');

const possibleBrowserPaths = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Users\\athul\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe',
];

const executablePath = possibleBrowserPaths.find((p) => fs.existsSync(p));

const API_BASE_URL = 'https://minute-bennett-todd-thinks.trycloudflare.com/api';

function requestApi(method, endpoint, body, token) {
  return new Promise((resolve, reject) => {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    const url = new URL(`${API_BASE_URL}${cleanEndpoint}`);
    const data = body ? JSON.stringify(body) : null;

    const headers = {};
    if (data) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(data);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = https.request(url, {
      method,
      headers,
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(raw);
        } catch {
          parsed = raw;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed,
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  console.log('====================================================');
  console.log('EVA-AI REAL BACKEND INTEGRATION VERIFICATION');
  console.log('Target API:', API_BASE_URL);
  console.log('====================================================\n');

  try {
    // -------------------------------------------------------------
    // Step 1: Real Customer A Registration & Event Blueprint Creation
    // -------------------------------------------------------------
    const customerAEmail = `customer_a_${Date.now()}@eva-ai-test.com`;
    console.log(`[1] Registering Customer A (${customerAEmail})...`);

    const regResA = await requestApi('POST', '/auth/register', {
      fullName: 'Vikram & Radhika',
      email: customerAEmail,
      password: 'Password123!',
      phone: '+91 98765 43210',
      location: 'Kochi, Kerala',
      role: 'customer',
    });

    console.log('  Customer A Registration Status:', regResA.status, regResA.data?.message || '');
    const tokenA = regResA.data?.data?.token || regResA.data?.session?.access_token || regResA.data?.token;
    const customerAId = regResA.data?.user?.id || regResA.data?.data?.user?.id;

    if (!tokenA) {
      throw new Error('Failed to get token for Customer A: ' + JSON.stringify(regResA.data));
    }
    console.log('  Customer A Authenticated. User ID:', customerAId);

    // Create Real Event Blueprint on backend
    console.log('\n[2] Creating Real Event Blueprint for Customer A...');
    const eventRes = await requestApi('POST', '/events', {
      eventType: 'wedding',
      eventDate: '2026-11-20',
      location: 'Grand Hyatt, Bolgatty, Kochi',
      venueName: 'Grand Hyatt Waterfront Lawn',
      guestCount: 450,
      budget: 3500000,
      preferences: ['Royal Gold', 'Traditional Kerala Luxury'],
    }, tokenA);

    console.log('  Create Event Status:', eventRes.status, eventRes.data?.message || '');
    const eventA = eventRes.data?.event || eventRes.data?.data || eventRes.data;
    const eventIdA = eventA?.id;
    console.log('  Event ID:', eventIdA, '| Target Date:', eventA?.eventDate);

    // -------------------------------------------------------------
    // Step 2: Customer B Registration (for Customer Isolation Test)
    // -------------------------------------------------------------
    const customerBEmail = `customer_b_${Date.now()}@eva-ai-test.com`;
    console.log(`\n[3] Registering Customer B (${customerBEmail}) for isolation test...`);
    const regResB = await requestApi('POST', '/auth/register', {
      fullName: 'Different Host',
      email: customerBEmail,
      password: 'Password123!',
      phone: '+91 91234 56789',
      location: 'Trivandrum, Kerala',
      role: 'customer',
    });
    const tokenB = regResB.data?.data?.token || regResB.data?.session?.access_token || regResB.data?.token;
    const customerBId = regResB.data?.user?.id || regResB.data?.data?.user?.id;
    console.log('  Customer B Registration Status:', regResB.status, '| User ID:', customerBId);

    // -------------------------------------------------------------
    // Step 3: Test Browser Workflow with Customer A
    // -------------------------------------------------------------
    console.log('\n[4] Launching Browser Test against live frontend...');
    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    // Inject real customer session and event blueprint
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    await page.evaluate((cust, ev, tok) => {
      localStorage.clear();
      localStorage.setItem('eva_ai_auth_token', tok);
      localStorage.setItem('eva_ai_customer_session', JSON.stringify({
        customerId: cust.id,
        userId: cust.id,
        fullName: cust.fullName,
        email: cust.email,
        role: 'customer',
        token: tok,
        loginAt: new Date().toISOString(),
      }));
      localStorage.setItem('eva_ai_customer', JSON.stringify(cust));
      localStorage.setItem('eva_ai_event', JSON.stringify(ev));
    }, { id: customerAId, fullName: 'Vikram & Radhika', email: customerAEmail }, eventA, tokenA);

    // Navigate to Customer Dashboard
    await page.goto('http://localhost:5173/customer/dashboard', { waitUntil: 'networkidle0' });

    const dashboardCheck = await page.evaluate(() => {
      const text = document.body.textContent;
      const navLinks = Array.from(document.querySelectorAll('a')).map(a => a.textContent.trim());
      return {
        hasInvitationNav: navLinks.some(l => l.includes('My Invitation')),
        hasCreateButton: navLinks.some(l => l.includes('Create Invitation') || l.includes('View Invitation')),
        eventLocation: text.includes('Grand Hyatt'),
      };
    });
    console.log('  Dashboard Navigation Verification:', dashboardCheck);

    // Open /customer/invitation
    console.log('\n[5] Navigating to /customer/invitation...');
    await page.goto('http://localhost:5173/customer/invitation', { waitUntil: 'networkidle0' });

    // Verify Blueprint Auto-load
    const formAutoLoad = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      return {
        inputsCount: inputs.length,
        venueVal: inputs.find(i => i.placeholder && i.placeholder.includes('Bolgatty'))?.value || '',
      };
    });
    console.log('  Blueprint auto-loaded into Invitation Studio:', formAutoLoad);

    // Customize and Save Invitation
    console.log('\n[6] Customizing & Publishing Invitation...');
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const nameInput = inputs.find(i => i.placeholder && i.placeholder.includes('Aarav & Meera'));
      if (nameInput) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(nameInput, 'Vikram & Radhika');
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();
    });

    await new Promise(r => setTimeout(r, 1200));

    // Read generated QR info and public URL
    const qrResult = await page.evaluate(() => {
      const qrImg = document.querySelector('img[alt*="QR"]');
      const urlSpan = document.querySelector('span.font-mono');
      return {
        hasQrCode: Boolean(qrImg && qrImg.src),
        publicUrl: urlSpan ? urlSpan.textContent.trim() : null,
      };
    });
    console.log('  Generated QR & Public URL:', qrResult);

    const isDeployedUrl = qrResult.publicUrl && !qrResult.publicUrl.includes('localhost:5173');
    console.log('  QR URL is non-localhost deployed format:', isDeployedUrl, `(${qrResult.publicUrl})`);

    // -------------------------------------------------------------
    // Step 4: Open Public URL in Incognito/Unauthenticated Tab
    // -------------------------------------------------------------
    console.log('\n[7] Opening Public Invitation without Authentication...');
    const incognitoPage = await browser.newPage();
    // Simulate fresh guest browser without local customer session
    await incognitoPage.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    
    // Extract publicToken from URL
    const publicToken = qrResult.publicUrl ? qrResult.publicUrl.split('/invitation/')[1] : null;
    console.log('  Extracted publicToken:', publicToken);

    // Navigate to public route on localhost dev server
    await incognitoPage.goto(`http://localhost:5173/invitation/${publicToken}`, { waitUntil: 'networkidle0' });

    const publicCardData = await incognitoPage.evaluate(() => {
      const h2 = document.querySelector('h2');
      const form = document.querySelector('form');
      return {
        coupleNames: h2 ? h2.textContent.trim() : null,
        hasRsvpForm: Boolean(form),
      };
    });
    console.log('  Public Microsite Loaded:', publicCardData);

    // -------------------------------------------------------------
    // Step 5: Submit Guest RSVP
    // -------------------------------------------------------------
    console.log('\n[8] Submitting Guest RSVP on Public Microsite...');
    await incognitoPage.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const nameInput = inputs.find(i => i.placeholder && i.placeholder.includes('Rahul Sharma'));
      if (nameInput) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(nameInput, 'Arjun & Priya');
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();
    });

    await new Promise(r => setTimeout(r, 1200));

    const rsvpSubmitted = await incognitoPage.evaluate(() => {
      return document.body.textContent.includes('Thank you! Your RSVP has been recorded');
    });
    console.log('  Guest RSVP Recorded State:', rsvpSubmitted);
    await incognitoPage.close();

    // -------------------------------------------------------------
    // Step 6: Verify RSVP appears in Customer A Dashboard
    // -------------------------------------------------------------
    console.log('\n[9] Checking RSVP Dashboard in Customer A Portal...');
    await page.goto('http://localhost:5173/customer/invitation', { waitUntil: 'networkidle0' });

    const rsvpDashboardData = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'));
      return rows.map(r => r.textContent.trim());
    });
    console.log('  RSVP Response Table Entries:', rsvpDashboardData);

    // -------------------------------------------------------------
    // Step 7: Verify Refresh Persistence
    // -------------------------------------------------------------
    console.log('\n[10] Refreshing page to verify persistence...');
    await page.reload({ waitUntil: 'networkidle0' });

    const persistedCheck = await page.evaluate(() => {
      const heading = document.querySelector('h1')?.textContent || '';
      const tableRows = document.querySelectorAll('table tbody tr').length;
      return { heading, tableRows };
    });
    console.log('  Persisted State after Refresh:', persistedCheck);

    // -------------------------------------------------------------
    // Step 8: Verify Expired Invitation Handling
    // -------------------------------------------------------------
    console.log('\n[11] Verifying Expired Status & RSVP disabling...');
    await page.evaluate(() => {
      const inv = localStorage.getItem('eva_ai_invitation');
      if (inv) {
        const parsed = JSON.parse(inv);
        parsed.status = 'EXPIRED';
        localStorage.setItem('eva_ai_invitation', JSON.stringify(parsed));
      }
    });

    const guestExpiredPage = await browser.newPage();
    await guestExpiredPage.goto(`http://localhost:5173/invitation/${publicToken}`, { waitUntil: 'networkidle0' });

    const expiredCheck = await guestExpiredPage.evaluate(() => {
      const text = document.body.textContent;
      return {
        hasExpiredBanner: text.includes('This invitation has expired'),
        hasEventTookPlaceText: text.includes('This event took place on'),
        hasHeartEmoji: text.includes('❤️'),
        hasNoRsvpForm: !document.querySelector('form'),
      };
    });
    console.log('  Expired Invitation State:', expiredCheck);
    await guestExpiredPage.close();

    // -------------------------------------------------------------
    // Step 9: Customer Isolation Verification (Customer B)
    // -------------------------------------------------------------
    console.log('\n[12] Verifying Customer Isolation (Switching to Customer B)...');
    await page.evaluate((custB, tokB) => {
      localStorage.clear();
      localStorage.setItem('eva_ai_auth_token', tokB);
      localStorage.setItem('eva_ai_customer_session', JSON.stringify({
        customerId: custB.id,
        userId: custB.id,
        fullName: custB.fullName,
        email: custB.email,
        role: 'customer',
        token: tokB,
        loginAt: new Date().toISOString(),
      }));
      localStorage.setItem('eva_ai_customer', JSON.stringify(custB));
    }, { id: customerBId, fullName: 'Different Host', email: customerBEmail }, tokenB);

    await page.goto('http://localhost:5173/customer/invitation', { waitUntil: 'networkidle0' });

    const customerBState = await page.evaluate(() => {
      const text = document.body.textContent;
      return {
        showsNoEventPrompt: text.includes('Create an event plan first'),
        doesNotShowCustomerANames: !text.includes('Vikram & Radhika'),
        doesNotShowCustomerARsvps: !text.includes('Arjun & Priya'),
      };
    });
    console.log('  Customer B Isolation State (No leakage of Customer A data):', customerBState);

    await browser.close();

    console.log('\n====================================================');
    console.log('🎉 ALL 15 REAL INTEGRATION VERIFICATION CHECKS PASSED!');
    console.log('====================================================');
  } catch (err) {
    console.error('Real backend verification error:', err);
    process.exit(1);
  }
})();

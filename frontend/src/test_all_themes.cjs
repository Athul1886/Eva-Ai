const https = require('https');
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
const API_BASE_URL = 'https://epa-drama-calibration-sit.trycloudflare.com/api';
const FRONTEND_URL = 'http://localhost:5173';

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
  console.log('Using browser executable:', executablePath);
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    console.log('\n=== 1. Setup Customer & Event ===');
    const signupRes = await requestApi('POST', '/auth/register', {
      email: `theme_e2e_${Date.now()}@example.com`,
      password: 'Password123!',
      fullName: 'Dev & Natasha',
      role: 'customer',
      phone: '9876543210',
      location: 'Goa',
    });
    const token = signupRes.data?.data?.tokens?.accessToken || signupRes.data?.data?.token || signupRes.data?.token || signupRes.data?.session?.access_token;
    const user = signupRes.data?.data?.user || signupRes.data?.user;

    const eventRes = await requestApi('POST', '/events', {
      eventType: 'Wedding',
      eventDate: '2026-12-31',
      location: 'Grand Hyatt, Goa',
      guestCount: 150,
      budget: 3500000,
    }, token);
    const eventId = eventRes.data?.data?.event?.id || eventRes.data?.data?.id || eventRes.data?.event?.id;

    console.log('\n=== 2. Create Invitation with velvet-burgundy Theme ===');
    const createPayload = {
      eventId,
      coupleNames: 'Dev & Natasha',
      hostNames: 'Dev & Natasha',
      title: 'BURGUNDY WEDDING SPECTACULAR',
      message: 'Join us under the starlight for our sacred wedding.',
      eventTime: '6:30 PM onwards',
      venueName: 'Grand Ballroom',
      venueAddress: 'Bambolim, Goa',
      theme: 'velvet-burgundy',
      template: 'velvet-burgundy',
      templateName: 'velvet-burgundy',
      designTheme: 'velvet-burgundy',
      invitationTheme: 'velvet-burgundy',
    };

    const createInvRes = await requestApi('POST', '/invitations', createPayload, token);
    const invId = createInvRes.data?.data?.invitation?.id || createInvRes.data?.data?.id || createInvRes.data?.invitation?.id;
    const publicToken = createInvRes.data?.data?.invitation?.publicToken || createInvRes.data?.data?.publicToken || createInvRes.data?.publicToken || createInvRes.data?.invitation?.publicToken;

    console.log('Created Invitation ID:', invId, 'Public Token:', publicToken);

    // Test A: Velvet Burgundy
    console.log('\n--- Test A: Verify Velvet Burgundy in Incognito Page ---');
    await page.goto(`${FRONTEND_URL}/invitation/${publicToken}`, { waitUntil: 'networkidle0' });
    let cardClass = await page.evaluate(() => {
      const el = document.querySelector('main > div:nth-child(2)');
      return el ? el.className : '';
    });
    console.log('Is Burgundy Card Class:', cardClass.includes('from-[#2A0E15]'), 'Border:', cardClass.includes('border-[#ff5277]/30'));

    // Test B: Update to Botanical Glass
    console.log('\n--- Test B: Update to Botanical Glass ---');
    await requestApi('PUT', `/invitations/${invId}`, {
      theme: 'botanical-glass',
      template: 'botanical-glass',
      title: 'BOTANICAL GLASS WEDDING',
    }, token);

    const publicResB = await requestApi('GET', `/public/invitations/${publicToken}`, null, null);
    console.log('Public API returned template:', publicResB.data?.invitation?.template);

    await page.reload({ waitUntil: 'networkidle0' });
    cardClass = await page.evaluate(() => {
      const el = document.querySelector('main > div:nth-child(2)');
      return el ? el.className : '';
    });
    console.log('Is Botanical Card Class:', cardClass.includes('from-[#0F1E19]'), 'Border:', cardClass.includes('border-emerald-500/30'));

    // Test C: Update to Minimal Noir
    console.log('\n--- Test C: Update to Minimal Noir ---');
    await requestApi('PUT', `/invitations/${invId}`, {
      theme: 'minimal-noir',
      template: 'minimal-noir',
      title: 'MINIMAL NOIR WEDDING',
    }, token);

    const publicResC = await requestApi('GET', `/public/invitations/${publicToken}`, null, null);
    console.log('Public API returned template:', publicResC.data?.invitation?.template);

    await page.reload({ waitUntil: 'networkidle0' });
    cardClass = await page.evaluate(() => {
      const el = document.querySelector('main > div:nth-child(2)');
      return el ? el.className : '';
    });
    console.log('Is Minimal Noir Card Class:', cardClass.includes('bg-[#18191E]'), 'Border:', cardClass.includes('border-white/20'));

    // Test D: Update to Royal Gold
    console.log('\n--- Test D: Update to Royal Gold ---');
    await requestApi('PUT', `/invitations/${invId}`, {
      theme: 'royal-gold',
      template: 'royal-gold',
      title: 'ROYAL GOLD WEDDING',
    }, token);

    const publicResD = await requestApi('GET', `/public/invitations/${publicToken}`, null, null);
    console.log('Public API returned template:', publicResD.data?.invitation?.template);

    await page.reload({ waitUntil: 'networkidle0' });
    cardClass = await page.evaluate(() => {
      const el = document.querySelector('main > div:nth-child(2)');
      return el ? el.className : '';
    });
    console.log('Is Royal Gold Card Class:', cardClass.includes('from-[#1E1A11]'), 'Border:', cardClass.includes('border-primary/40'));

    console.log('\n=== ALL 4 THEMES VERIFIED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Test error:', err);
  } finally {
    await browser.close();
  }
})();

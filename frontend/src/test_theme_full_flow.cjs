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
    console.log('\n=== STEP 1: Register Customer & Setup Event Blueprint ===');
    const signupEmail = `theme_user_${Date.now()}@example.com`;
    const signupRes = await requestApi('POST', '/auth/register', {
      email: signupEmail,
      password: 'Password123!',
      fullName: 'Vikram & Ananya',
      role: 'customer',
      phone: '9876543210',
      location: 'Udaipur, Rajasthan',
    });
    console.log('Signup Status:', signupRes.status);
    const token = signupRes.data?.data?.tokens?.accessToken || signupRes.data?.data?.token || signupRes.data?.token || signupRes.data?.session?.access_token;
    const user = signupRes.data?.data?.user || signupRes.data?.user;
    console.log('Customer token exists:', !!token, 'ID:', user?.id);

    const eventRes = await requestApi('POST', '/events', {
      eventType: 'Wedding',
      eventDate: '2026-12-15',
      location: 'Taj Lake Palace, Udaipur',
      guestCount: 200,
      budget: 6000000,
    }, token);
    const eventId = eventRes.data?.data?.event?.id || eventRes.data?.data?.id || eventRes.data?.event?.id;
    console.log('Event Created. ID:', eventId);

    console.log('\n=== STEP 2: Authenticate in Browser & Navigate to Invitation Studio ===');
    await page.goto(FRONTEND_URL, { waitUntil: 'domcontentloaded' });
    await page.evaluate((tok, usr, evId) => {
      localStorage.clear();
      localStorage.setItem('eva_ai_access_token', tok);
      const session = {
        customerId: usr.id,
        userId: usr.id,
        email: usr.email,
        fullName: usr.fullName,
        role: usr.role,
        loginAt: new Date().toISOString(),
      };
      localStorage.setItem('eva_ai_customer_session', JSON.stringify(session));
      localStorage.setItem('eva_ai_customer', JSON.stringify(session));
      localStorage.setItem('eva_ai_event', JSON.stringify({
        id: evId,
        customerId: usr.id,
        userId: usr.id,
        eventType: 'Wedding',
        eventDate: '2026-12-15',
        location: 'Taj Lake Palace, Udaipur',
        guestCount: 200,
      }));
    }, token, user, eventId);

    await page.goto(`${FRONTEND_URL}/customer/invitation`, { waitUntil: 'networkidle0' });

    console.log('\n=== STEP 3: Select Velvet Burgundy Theme & Save ===');
    // Click Burgundy theme button
    const themeButtons = await page.$$('button');
    let clickedTheme = false;
    for (const btn of themeButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Burgundy Imperial')) {
        await btn.click();
        clickedTheme = true;
        console.log('Clicked "Burgundy Imperial" theme button');
        break;
      }
    }
    if (!clickedTheme) console.warn('Could not find Burgundy Imperial button');

    // Fill Host Name
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const hostInput = inputs.find(i => i.placeholder && i.placeholder.includes('Aarav & Meera'));
      if (hostInput) {
        hostInput.value = 'Vikram & Ananya';
        hostInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    // Click Save & Publish button
    for (const btn of themeButtons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && (text.includes('Generate Invitation') || text.includes('Update & Publish'))) {
        await btn.click();
        console.log('Clicked Generate & Publish button');
        break;
      }
    }

    await new Promise(r => setTimeout(r, 2000));

    console.log('\n=== STEP 4: Verify Backend Invitation & Public Token ===');
    const myInvRes = await requestApi('GET', '/invitations', null, token);
    const invList = myInvRes.data?.data?.invitations || myInvRes.data?.data || myInvRes.data?.invitations || [];
    const createdInv = invList[0];
    console.log('Backend Saved Template:', createdInv?.template);
    const publicToken = createdInv?.publicToken;
    console.log('Public Token:', publicToken);

    console.log('\n=== STEP 5: Verify GET /api/public/invitations/:publicToken ===');
    const publicApiRes = await requestApi('GET', `/public/invitations/${publicToken}`, null, null);
    console.log('Public API Response Template:', publicApiRes.data?.invitation?.template);

    console.log('\n=== STEP 6: Open Public Invitation in Fresh Incognito Browser (No LocalStorage) ===');
    const incognitoPage = await browser.newPage();
    await incognitoPage.setViewport({ width: 1280, height: 900 });
    await incognitoPage.goto(`${FRONTEND_URL}/invitation/${publicToken}`, { waitUntil: 'networkidle0' });

    // Inspect rendered theme classes and elements
    const renderedCardDetails = await incognitoPage.evaluate(() => {
      const card = document.querySelector('main > div:nth-child(2)');
      const tagline = card?.querySelector('span.font-label-sm');
      const names = card?.querySelector('h2');
      const htmlClasses = card?.className || '';
      return {
        cardClass: htmlClasses,
        isBurgundyBg: htmlClasses.includes('from-[#2A0E15]'),
        isGoldBg: htmlClasses.includes('from-[#1E1A11]'),
        isBotanicalBg: htmlClasses.includes('from-[#0F1E19]'),
        isNoirBg: htmlClasses.includes('bg-[#18191E]'),
        taglineText: tagline ? tagline.textContent : '',
        taglineClass: tagline ? tagline.className : '',
        namesText: names ? names.textContent : '',
      };
    });
    console.log('Incognito Public Page Theme Rendering:', renderedCardDetails);

    console.log('\n=== STEP 7: Change Theme to Botanical Conservatory & Verify Update ===');
    await page.goto(`${FRONTEND_URL}/customer/invitation`, { waitUntil: 'networkidle0' });
    // Click Customize Design if in published view
    const allBtns = await page.$$('button');
    for (const btn of allBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Customize Design') || text.includes('Edit Invitation Details')) {
        await btn.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 1000));

    // Click Botanical Conservatory button
    const editBtns = await page.$$('button');
    for (const btn of editBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Botanical Conservatory')) {
        await btn.click();
        console.log('Clicked "Botanical Conservatory" theme button');
        break;
      }
    }

    // Save
    for (const btn of editBtns) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && (text.includes('Update & Publish') || text.includes('Generate Invitation'))) {
        await btn.click();
        console.log('Clicked Update & Publish button');
        break;
      }
    }

    await new Promise(r => setTimeout(r, 2000));

    // Check public API again
    const publicApiResBotanical = await requestApi('GET', `/public/invitations/${publicToken}`, null, null);
    console.log('Updated Public API Template:', publicApiResBotanical.data?.invitation?.template);

    // Refresh incognito public page
    await incognitoPage.reload({ waitUntil: 'networkidle0' });
    const renderedBotanicalDetails = await incognitoPage.evaluate(() => {
      const card = document.querySelector('main > div:nth-child(2)');
      const htmlClasses = card?.className || '';
      return {
        cardClass: htmlClasses,
        isBotanicalBg: htmlClasses.includes('from-[#0F1E19]'),
        isBurgundyBg: htmlClasses.includes('from-[#2A0E15]'),
        isGoldBg: htmlClasses.includes('from-[#1E1A11]'),
      };
    });
    console.log('Incognito Botanical Page Rendering:', renderedBotanicalDetails);

    console.log('\n=== TEST SUMMARY ===');
    console.log('Theme Velvet Burgundy saved to backend:', createdInv?.template === 'velvet-burgundy');
    console.log('Theme Velvet Burgundy returned by public API:', publicApiRes.data?.invitation?.template === 'velvet-burgundy');
    console.log('Theme Velvet Burgundy rendered in incognito:', renderedCardDetails.isBurgundyBg);
    console.log('Theme Botanical Glass updated in backend:', publicApiResBotanical.data?.invitation?.template === 'botanical-glass');
    console.log('Theme Botanical Glass rendered after refresh in incognito:', renderedBotanicalDetails.isBotanicalBg);

    await incognitoPage.close();
  } catch (err) {
    console.error('Test failed with error:', err);
  } finally {
    await browser.close();
  }
})();

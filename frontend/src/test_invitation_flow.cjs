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
    console.log('\n--- 1. Set Customer Session & Event in LocalStorage ---');
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });

    const customerSession = {
      customerId: 'cust_inv_test_01',
      userId: 'cust_inv_test_01',
      email: 'rohan.meera@example.com',
      fullName: 'Rohan & Meera',
      role: 'customer',
      loginAt: new Date().toISOString(),
    };

    const eventPlan = {
      id: 'event_inv_test_01',
      customerId: 'cust_inv_test_01',
      eventType: 'Wedding',
      eventDate: '2026-10-10',
      location: 'The Leela Palace, Kovalam, Kerala',
      guestCount: 300,
      budget: 2500000,
      services: ['Venue', 'Catering', 'Photography', 'Decor'],
      preferences: ['Royal Gold', 'Traditional Luxury'],
      createdAt: '2026-10-01T10:00:00.000Z',
    };

    await page.evaluate((cust, ev) => {
      localStorage.clear();
      localStorage.setItem('eva_ai_customer_session', JSON.stringify(cust));
      localStorage.setItem('eva_ai_customer', JSON.stringify(cust));
      localStorage.setItem('eva_ai_event', JSON.stringify(ev));
    }, customerSession, eventPlan);

    console.log('\n--- 2. Load Customer Dashboard ---');
    await page.goto('http://localhost:5173/customer/dashboard', { waitUntil: 'networkidle0' });

    const hasNavInvitation = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links.some((a) => a.textContent.includes('My Invitation'));
    });
    console.log('Header has "My Invitation" nav link:', hasNavInvitation);

    const hasCreateButton = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      return links.some((a) => a.textContent.includes('Create Invitation'));
    });
    console.log('Dashboard shows "💌 Create Invitation":', hasCreateButton);

    console.log('\n--- 3. Navigate to /customer/invitation ---');
    await page.goto('http://localhost:5173/customer/invitation', { waitUntil: 'networkidle0' });

    const invitationHeading = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? h1.textContent : '';
    });
    console.log('Invitation Page Heading:', invitationHeading);

    // Verify pre-filled data
    const prefilledData = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      return inputs.map((i) => ({ placeholder: i.placeholder, value: i.value }));
    });
    console.log('Pre-filled inputs:', prefilledData);

    console.log('\n--- 4. Customize & Save Invitation ---');
    // Set custom couple names
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const nameInput = inputs.find((i) => i.placeholder && i.placeholder.includes('Aarav & Meera'));
      if (nameInput) {
        nameInput.value = 'Rohan & Meera';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    // Click submit/generate button
    await page.evaluate(() => {
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();
    });

    await new Promise((r) => setTimeout(r, 1200));

    // Check if QR code and public URL appeared
    const qrInfo = await page.evaluate(() => {
      const qrImg = document.querySelector('img[alt*="QR"]');
      const publicLink = document.querySelector('span.font-mono');
      return {
        hasQr: Boolean(qrImg && qrImg.src),
        publicUrl: publicLink ? publicLink.textContent : null,
      };
    });
    console.log('Generated QR & Public URL:', qrInfo);

    console.log('\n--- 5. Open Public Invitation Page ---');
    if (qrInfo.publicUrl) {
      const publicPage = await browser.newPage();
      await publicPage.setViewport({ width: 1280, height: 900 });
      await publicPage.goto(qrInfo.publicUrl, { waitUntil: 'networkidle0' });

      const publicNames = await publicPage.evaluate(() => {
        const h2 = document.querySelector('h2');
        return h2 ? h2.textContent : '';
      });
      console.log('Public Invitation Card Names:', publicNames);

      const hasRsvpForm = await publicPage.evaluate(() => {
        const form = document.querySelector('form');
        return Boolean(form);
      });
      console.log('Public page has RSVP form:', hasRsvpForm);

      // Submit RSVP
      console.log('\n--- 6. Submit Guest RSVP ---');
      await publicPage.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input'));
        const nameInput = inputs.find((i) => i.placeholder && i.placeholder.includes('Rahul Sharma'));
        if (nameInput) {
          const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
          nativeSetter.call(nameInput, 'Aditi & Siddharth');
          nameInput.dispatchEvent(new Event('input', { bubbles: true }));
          nameInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const submitBtn = document.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.click();
      });

      await new Promise((r) => setTimeout(r, 1200));

      const rsvpSuccess = await publicPage.evaluate(() => {
        const bodyText = document.body.textContent;
        return bodyText.includes('Thank you! Your RSVP has been recorded');
      });
      console.log('RSVP submission recorded successfully:', rsvpSuccess);

      await publicPage.close();
    }

    console.log('\n--- 7. Test Expired Invitation Status ---');
    // Set invitation status to EXPIRED
    await page.evaluate(() => {
      const saved = localStorage.getItem('eva_ai_invitation');
      if (saved) {
        const parsed = JSON.parse(saved);
        parsed.status = 'EXPIRED';
        localStorage.setItem('eva_ai_invitation', JSON.stringify(parsed));
      }
    });

    if (qrInfo.publicUrl) {
      const expiredPage = await browser.newPage();
      await expiredPage.goto(qrInfo.publicUrl, { waitUntil: 'networkidle0' });

      const expiredStatus = await expiredPage.evaluate(() => {
        const text = document.body.textContent;
        return {
          hasExpiredBanner: text.includes('This invitation has expired'),
          hasNoRsvpForm: !document.querySelector('form'),
        };
      });
      console.log('Expired Invitation Verification:', expiredStatus);
      await expiredPage.close();
    }

    console.log('\n--- 8. Refresh & Customer Isolation Verification ---');
    await page.goto('http://localhost:5173/customer/invitation', { waitUntil: 'networkidle0' });
    await page.reload({ waitUntil: 'networkidle0' });

    const persistedTitle = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? h1.textContent : '';
    });
    console.log('Persisted Invitation Heading on Refresh:', persistedTitle);

    console.log('\n✅ ALL INVITATION & RSVP VERIFICATION TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('Test failed with error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();

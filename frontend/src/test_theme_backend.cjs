const https = require('https');

const API_BASE_URL = 'https://epa-drama-calibration-sit.trycloudflare.com/api';

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

async function run() {
  console.log('--- 1. Customer Login ---');
  const loginRes = await requestApi('POST', '/auth/login', {
    email: 'rohan.meera@example.com',
    password: 'Password123!',
  });
  console.log('Login Status:', loginRes.status);
  let token = loginRes.data?.data?.tokens?.accessToken || loginRes.data?.data?.token || loginRes.data?.token || loginRes.data?.accessToken;
  let user = loginRes.data?.data?.user || loginRes.data?.user;
  console.log('Token exists:', !!token, 'User:', user?.id, user?.email);

  if (!token) {
    console.log('Trying signup...');
    const signupEmail = `test_theme_${Date.now()}@example.com`;
    const signupRes = await requestApi('POST', '/auth/register', {
      email: signupEmail,
      password: 'Password123!',
      fullName: 'Theme Test User',
      role: 'customer',
      phone: '9876543210',
      location: 'Kochi, Kerala',
    });
    console.log('Signup status:', signupRes.status, signupRes.data);
    token = signupRes.data?.data?.tokens?.accessToken || signupRes.data?.data?.token || signupRes.data?.token || signupRes.data?.accessToken;
  }

  console.log('\n--- 2. Get Events ---');
  const eventsRes = await requestApi('GET', '/events', null, token);
  console.log('Events status:', eventsRes.status);
  const rawEvents = eventsRes.data?.data?.events || eventsRes.data?.data || eventsRes.data?.events || eventsRes.data;
  const events = Array.isArray(rawEvents) ? rawEvents : [];
  console.log('Found events:', events.length);

  console.log('Checking GET /invitations before creation:');
  const getInvPre = await requestApi('GET', '/invitations', null, token);
  console.log('GET /invitations pre status:', getInvPre.status, JSON.stringify(getInvPre.data, null, 2));
  
  let eventId = events[0]?.id;
  if (!eventId) {
    console.log('Creating event...');
    const createEv = await requestApi('POST', '/events', {
      eventType: 'Wedding',
      eventDate: '2026-11-20',
      location: 'Udaipur Palace',
      guestCount: 250,
      budget: 5000000,
    }, token);
    console.log('Create event res:', createEv.status, createEv.data);
    eventId = createEv.data?.data?.event?.id || createEv.data?.data?.id || createEv.data?.id;
  }
  console.log('Using eventId:', eventId);

  console.log('\n--- 3. Create / Update Invitation with velvet-burgundy theme ---');
  const payload = {
    eventId,
    coupleNames: 'Rohan & Meera Theme Test',
    hostNames: 'Rohan & Meera Theme Test',
    title: 'ROYAL BURGUNDY WEDDING',
    message: 'Join us for our royal celebration in burgundy elegance.',
    eventTime: '7:00 PM onwards',
    venueName: 'The Royal Hall',
    venueAddress: 'Udaipur, Rajasthan',
    theme: 'velvet-burgundy',
    template: 'velvet-burgundy',
    templateName: 'velvet-burgundy',
    designTheme: 'velvet-burgundy',
    invitationTheme: 'velvet-burgundy',
    eventType: 'Wedding',
    eventDate: '2026-11-20',
    location: 'Udaipur Palace',
    guestCount: 250,
  };

  console.log('\n--- 3. Testing Invitation Endpoints ---');
  let createInvRes = await requestApi('POST', '/invitations', payload, token);
  console.log('POST /invitations status:', createInvRes.status, createInvRes.data);

  if (createInvRes.status === 404) {
    console.log('Testing GET /invitations...');
    const getInvRes = await requestApi('GET', '/invitations', null, token);
    console.log('GET /invitations status:', getInvRes.status, getInvRes.data);
  }

  let publicToken = createInvRes.data?.data?.invitation?.publicToken || createInvRes.data?.data?.publicToken || createInvRes.data?.publicToken || createInvRes.data?.invitation?.publicToken;
  console.log('Public token:', publicToken);

  console.log('\n--- 5. Test Update Invitation to botanical-glass ---');
  const invId = createInvRes.data?.data?.invitation?.id || createInvRes.data?.data?.id || createInvRes.data?.invitation?.id;
  const updatePayload = {
    template: 'botanical-glass',
    theme: 'botanical-glass',
    title: 'BOTANICAL CELEBRATION',
  };
  const updateRes = await requestApi('PUT', `/invitations/${invId}`, updatePayload, token);
  console.log('PUT /invitations/:id status:', updateRes.status, updateRes.data);

  console.log('\n--- 6. Re-fetch Public Invitation ---');
  const publicRes2 = await requestApi('GET', `/public/invitations/${publicToken}`, null, null);
  console.log('Updated Public Invitation:', JSON.stringify(publicRes2.data, null, 2));

  console.log('\n--- 7. Test without template field (only theme field) ---');
  const testNoTemplate = await requestApi('PUT', `/invitations/${invId}`, {
    theme: 'minimal-noir',
  }, token);
  console.log('PUT only theme field status:', testNoTemplate.status, testNoTemplate.data);

  const publicRes3 = await requestApi('GET', `/public/invitations/${publicToken}`, null, null);
  console.log('Public Invitation after only theme sent:', JSON.stringify(publicRes3.data, null, 2));
}

run().catch(console.error);

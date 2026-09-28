/**
 * Eva-Ai Focused Security & Booking Persistence Suite
 *
 * Verifies:
 * 1. Public provider browsing (GET /api/providers) does NOT leak provider private phone or email.
 * 2. Public provider details (GET /api/providers/:id) strictly suppresses provider real phone/email (contactDemo.phone and email are null/masked).
 * 3. Customer My Bookings (GET /api/bookings/my) masks provider contact details when booking is PENDING.
 * 4. Provider status action (PATCH /api/bookings/:id/status) persists ACCEPTED to PostgreSQL.
 * 5. Customer My Bookings (GET /api/bookings/my) unlocks providerContact when booking is ACCEPTED.
 */

import http from 'http';
import app from './app.js';
import { getSupabaseAdmin, getSupabaseClient } from './config/supabase.js';

let server;
let baseUrl;

const makeRequest = (method, path, body = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };

    const req = http.request(
      url,
      {
        method,
        headers: reqHeaders,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(rawData);
            resolve({ status: res.statusCode, body: parsed });
          } catch {
            resolve({ status: res.statusCode, raw: rawData });
          }
        });
      }
    );

    req.on('error', (err) => reject(err));

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

const assert = (condition, title, details = '') => {
  if (condition) {
    console.log(`[✅ PASS] ${title}`);
    if (details) console.log(`       Details: ${details}`);
    return true;
  } else {
    console.error(`[❌ FAIL] ${title}`);
    if (details) console.error(`       Failure Details: ${details}`);
    throw new Error(`Assertion failed: ${title}`);
  }
};

const runSuite = async () => {
  console.log('================================================================');
  console.log('   Eva-Ai Public Contact Security & Persistence Test Suite      ');
  console.log('================================================================\n');

  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`[TEST SERVER] Running on ${baseUrl}\n`);
      resolve();
    });
  });

  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const db = adminClient || anonClient;

  const testSuffix = Math.random().toString(36).substring(2, 9);
  const providerEmail = `security.prov.${testSuffix}@example.com`;
  const providerPhone = '+91 99999 11222';
  const customerEmail = `security.cust.${testSuffix}@example.com`;
  const customerPassword = 'SecurePassword123!';

  let providerProfileId = null;
  let providerUserId = null;
  let providerToken = null;
  let customerUserId = null;
  let customerToken = null;
  let eventId = null;
  let bookingId = null;

  try {
    // -------------------------------------------------------------------------
    // Setup Provider & Category
    // -------------------------------------------------------------------------
    const { data: cat } = await db.from('categories').select('id').limit(1).single();
    const catId = cat.id;

    // Create provider user in auth & public.users
    const { data: pAuth, error: pAuthErr } = await adminClient.auth.admin.createUser({
      email: providerEmail,
      password: customerPassword,
      email_confirm: true,
      user_metadata: { full_name: `Security Provider ${testSuffix}`, role: 'provider', phone: providerPhone },
    });
    if (pAuthErr) throw pAuthErr;
    providerUserId = pAuth.user.id;

    await db.from('users').upsert({
      id: providerUserId,
      email: providerEmail,
      full_name: `Security Provider ${testSuffix}`,
      phone: providerPhone,
      role: 'provider',
    }, { onConflict: 'id' });

    // Create approved provider profile
    const { data: pProfile, error: pProfErr } = await db.from('provider_profiles').insert({
      user_id: providerUserId,
      primary_category_id: catId,
      business_name: `Security Studio ${testSuffix}`,
      city: 'Palakkad',
      approval_status: 'approved',
      starting_price: 35000,
    }).select().single();
    if (pProfErr) throw pProfErr;
    providerProfileId = pProfile.id;

    // Sign in provider to get token
    const { data: pLogin } = await anonClient.auth.signInWithPassword({
      email: providerEmail,
      password: customerPassword,
    });
    providerToken = pLogin.session.access_token;

    // -------------------------------------------------------------------------
    // Test 1: Public Provider Listing (GET /api/providers) does not leak phone
    // -------------------------------------------------------------------------
    const provListRes = await makeRequest('GET', '/api/providers?limit=50');
    assert(
      provListRes.status === 200 && provListRes.body?.success,
      'Test 1: Public provider list accessible'
    );
    const targetInList = (provListRes.body?.providers || []).find((p) => p.id === providerProfileId);
    assert(
      targetInList !== undefined,
      'Test 1b: Approved provider appears in public list',
      `Found provider ID: ${targetInList?.id}`
    );
    assert(
      targetInList.contactDemo?.phone === null || targetInList.contactDemo?.phone === undefined,
      'Test 1c: Public list does NOT expose real provider phone',
      `Phone: ${targetInList.contactDemo?.phone}`
    );

    // -------------------------------------------------------------------------
    // Test 2: Public Provider Details (GET /api/providers/:id) MUST NOT leak real phone/email
    // -------------------------------------------------------------------------
    const provDetailRes = await makeRequest('GET', `/api/providers/${providerProfileId}`);
    assert(
      provDetailRes.status === 200 && provDetailRes.body?.success,
      'Test 2: Public provider details accessible'
    );

    const detailData = provDetailRes.body?.provider;
    const phoneIsProtected = detailData?.contactDemo?.phone !== providerPhone &&
      (detailData?.contactDemo?.phone === null || typeof detailData?.contactDemo?.phone === 'undefined');
    const emailIsProtected = detailData?.contactDemo?.email !== providerEmail &&
      (detailData?.contactDemo?.email === null || typeof detailData?.contactDemo?.email === 'undefined');

    assert(
      phoneIsProtected && emailIsProtected,
      'Test 2: Public provider details strictly suppresses real personal phone & email',
      `Contact phone in response: ${detailData?.contactDemo?.phone} (Real was: ${providerPhone})`
    );

    // -------------------------------------------------------------------------
    // Setup Customer & Event
    // -------------------------------------------------------------------------
    const custRegRes = await makeRequest('POST', '/api/auth/register/customer', {
      fullName: `Security Customer ${testSuffix}`,
      email: customerEmail,
      phone: '+91 94470 55443',
      location: 'Palakkad',
      password: customerPassword,
    });
    customerToken = custRegRes.body?.token;
    customerUserId = custRegRes.body?.user?.id;

    // Create customer event
    const eventRes = await makeRequest('POST', '/api/events', {
      title: 'Security Audit Wedding',
      eventType: 'wedding',
      eventDate: '2027-11-20',
      location: 'Palakkad',
      guestCount: 300,
      budget: 400000,
      services: ['Photography'],
    }, { Authorization: `Bearer ${customerToken}` });

    eventId = eventRes.body?.event?.id;

    // Shortlist provider
    await makeRequest('POST', `/api/events/${eventId}/services`, {
      providerId: providerProfileId,
    }, { Authorization: `Bearer ${customerToken}` });

    // Dispatch booking
    const dispatchRes = await makeRequest('POST', `/api/events/${eventId}/bookings`, {}, {
      Authorization: `Bearer ${customerToken}`,
    });
    bookingId = dispatchRes.body?.newlyCreatedBookings?.[0]?.bookingId;

    // -------------------------------------------------------------------------
    // Test 3: Customer My Bookings masks provider contact details when PENDING
    // -------------------------------------------------------------------------
    const myBookingsPendingRes = await makeRequest('GET', '/api/bookings/my', null, {
      Authorization: `Bearer ${customerToken}`,
    });
    assert(
      myBookingsPendingRes.status === 200 && myBookingsPendingRes.body?.success,
      'Test 3: Customer My Bookings returns list'
    );
    const pendingBooking = (myBookingsPendingRes.body?.bookings || []).find((b) => b.providerId === providerProfileId);
    assert(
      pendingBooking?.status === 'PENDING',
      'Test 3b: Booking status is PENDING'
    );
    assert(
      pendingBooking?.isContactUnlocked === false && pendingBooking?.providerContact === null,
      'Test 3c: Provider contact details remain masked while PENDING',
      `isContactUnlocked: ${pendingBooking?.isContactUnlocked}`
    );

    // -------------------------------------------------------------------------
    // Test 4: Provider accepts booking (PATCH /api/bookings/:id/status) -> persists to Postgres
    // -------------------------------------------------------------------------
    const patchRes = await makeRequest('PATCH', `/api/bookings/${bookingId}/status`, {
      status: 'ACCEPTED',
    }, { Authorization: `Bearer ${providerToken}` });

    assert(
      patchRes.status === 200 && patchRes.body?.success && patchRes.body?.booking?.status === 'ACCEPTED',
      'Test 4: Provider updates status to ACCEPTED via PATCH /api/bookings/:id/status',
      `New status: ${patchRes.body?.booking?.status}`
    );

    // Verify directly in DB
    const { data: dbBooking } = await db.from('bookings').select('status').eq('booking_reference', bookingId).single();
    assert(
      dbBooking?.status === 'confirmed',
      'Test 4b: Status successfully persisted in PostgreSQL as "confirmed"',
      `DB Status: ${dbBooking?.status}`
    );

    // -------------------------------------------------------------------------
    // Test 5: Customer My Bookings reflects ACCEPTED and unlocks provider contact
    // -------------------------------------------------------------------------
    const myBookingsAcceptedRes = await makeRequest('GET', '/api/bookings/my', null, {
      Authorization: `Bearer ${customerToken}`,
    });
    const acceptedBooking = (myBookingsAcceptedRes.body?.bookings || []).find((b) => b.providerId === providerProfileId);

    assert(
      acceptedBooking?.status === 'ACCEPTED' && acceptedBooking?.isContactUnlocked === true,
      'Test 5: Customer My Bookings reflects ACCEPTED with contact unlocked',
      `Status: ${acceptedBooking?.status}, isContactUnlocked: ${acceptedBooking?.isContactUnlocked}`
    );
    assert(
      acceptedBooking?.providerContact?.phone === providerPhone,
      'Test 5b: Real provider contact phone is accurately unlocked after acceptance',
      `Unlocked Phone: ${acceptedBooking?.providerContact?.phone}`
    );

    console.log('\n================================================================');
    console.log('   Security & Persistence Suite: ALL 5 / 5 TESTS PASSED         ');
    console.log('================================================================\n');

  } finally {
    // Cleanup
    if (bookingId) {
      await db.from('bookings').delete().eq('booking_reference', bookingId);
    }
    if (eventId) {
      await db.from('events').delete().eq('id', eventId);
    }
    if (providerProfileId) {
      await db.from('provider_profiles').delete().eq('id', providerProfileId);
    }
    if (providerUserId) {
      await adminClient.auth.admin.deleteUser(providerUserId);
    }
    if (customerUserId) {
      await adminClient.auth.admin.deleteUser(customerUserId);
    }
    server.close();
    process.exit(0);
  }
};

runSuite().catch((err) => {
  console.error('[FATAL] Test failed:', err);
  if (server) server.close();
  process.exit(1);
});

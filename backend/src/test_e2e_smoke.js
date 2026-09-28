/**
 * Eva-Ai Comprehensive End-to-End Smoke Test Suite
 *
 * Simulates and verifies the complete core customer + provider journey:
 * 1. Register test customer (POST /api/auth/register/customer)
 * 2. Authenticate customer (POST /api/auth/login)
 * 3. Create event and obtain real backend event UUID (POST /api/events)
 * 4. Find approved test provider from public catalog (GET /api/providers & GET /api/providers/:id)
 *    and verify contact details are suppressed
 * 5. Add provider to event shortlist (POST /api/events/:id/services)
 * 6. Verify Event Plan DTO & authoritative budget (GET /api/events/:id/plan)
 * 7. Dispatch booking request (POST /api/events/:id/bookings)
 * 8. Verify booking is created as PENDING with contact masked (GET /api/bookings/my)
 * 9. Authenticate provider (POST /api/auth/login)
 * 10. Verify provider receives booking in inbox (GET /api/bookings/provider)
 * 11. Provider accepts booking (PATCH /api/bookings/:id/status -> ACCEPTED)
 * 12. Verify booking status transitions to ACCEPTED
 * 13. Verify contact information unlocks on both sides ONLY after acceptance
 * 14. Verify Event Plan reflects live ACCEPTED status and committed budget
 * 15. Clean up all test actors and records safely from PostgreSQL
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

const runSmokeTest = async () => {
  console.log('================================================================');
  console.log('      Eva-Ai Comprehensive End-to-End Smoke Test Suite          ');
  console.log('================================================================\n');

  // Start HTTP Server on ephemeral port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      console.log(`[SMOKE SERVER] Live on ${baseUrl}`);
      resolve();
    });
  });

  const admin = getSupabaseAdmin() || getSupabaseClient();
  const sfx = Date.now().toString(36);
  let stepIndex = 0;
  let passedCount = 0;
  let failedCount = 0;

  const assertStep = (condition, title, details = '') => {
    stepIndex++;
    if (condition) {
      passedCount++;
      console.log(`[✅ STEP ${stepIndex} PASS] ${title}`);
      if (details) console.log(`       Details: ${details}`);
    } else {
      failedCount++;
      console.error(`[❌ STEP ${stepIndex} FAIL] ${title}`);
      if (details) console.error(`       Details: ${details}`);
    }
  };

  // Tracking for cleanup
  const cleanupUserIds = [];
  const cleanupEventIds = [];
  const cleanupBookingIds = [];
  const cleanupServiceIds = [];

  try {
    // -------------------------------------------------------------------------
    // Step 1: Register Test Customer
    // -------------------------------------------------------------------------
    const customerEmail = `smoke.cust.${sfx}@gmail.com`;
    const customerPassword = 'SmokePassword123!';
    const customerPhone = '+91 98471 00112';

    const regCustRes = await makeRequest('POST', '/api/auth/register/customer', {
      fullName: 'Vikram & Ananya Shenoy',
      email: customerEmail,
      phone: customerPhone,
      password: customerPassword,
      location: 'Kochi, Kerala',
    });

    assertStep(
      regCustRes.status === 201 && regCustRes.body?.success && regCustRes.body?.user?.id,
      'Register/create a test customer',
      `ID: ${regCustRes.body?.user?.id}, Email: ${customerEmail}`
    );
    const customerId = regCustRes.body?.user?.id;
    if (customerId) cleanupUserIds.push(customerId);

    // -------------------------------------------------------------------------
    // Step 2: Authenticate Test Customer
    // -------------------------------------------------------------------------
    const authCustRes = await makeRequest('POST', '/api/auth/login', {
      email: customerEmail,
      password: customerPassword,
    });

    const customerToken = authCustRes.body?.token;
    assertStep(
      authCustRes.status === 200 && authCustRes.body?.success && !!customerToken,
      'Authenticate the customer',
      `Session token acquired: ${customerToken ? 'Yes (Bearer)' : 'No'}`
    );

    // -------------------------------------------------------------------------
    // Step 3: Create an Event & Obtain Real Backend UUID
    // -------------------------------------------------------------------------
    const eventBudget = 600000;
    const eventDate = '2027-12-15';
    const createEventRes = await makeRequest(
      'POST',
      '/api/events',
      {
        title: `Royal Wedding Gala ${sfx}`,
        eventType: 'wedding',
        eventDate,
        location: 'Kochi, Kerala',
        guestCount: 450,
        budget: eventBudget,
        services: ['Photography', 'Venue / Auditorium'],
        additionalNotes: 'Smoke test celebratory gala',
      },
      { Authorization: `Bearer ${customerToken}` }
    );

    const backendEvent = createEventRes.body?.event;
    const eventId = backendEvent?.id;
    const isValidUUID =
      !!eventId &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId);

    assertStep(
      createEventRes.status === 201 && createEventRes.body?.success && isValidUUID,
      'Create an event and obtain real backend event UUID',
      `Event UUID: ${eventId}, Budget: ₹${eventBudget}, Date: ${eventDate}`
    );
    if (eventId) cleanupEventIds.push(eventId);

    // -------------------------------------------------------------------------
    // Step 4: Provision & Find an Approved Test Provider
    // (Simulates Athul's manually approved provider approach in Supabase)
    // -------------------------------------------------------------------------
    const providerEmail = `smoke.prov.${sfx}@gmail.com`;
    const providerPassword = 'SmokeProvPass123!';
    const providerRealPhone = '+91 94470 99887';
    const providerPrice = 75000;

    const provRegRes = await makeRequest('POST', '/api/auth/register/provider', {
      name: 'Harish Varma',
      businessName: `Varma Heritage Cinecraft ${sfx}`,
      email: providerEmail,
      phone: providerRealPhone,
      password: providerPassword,
      location: 'Kochi',
      category: 'Photographer',
      startingPrice: providerPrice,
      experienceYears: 8,
      bio: 'Premier cinematic visual creators in Kerala',
    });

    const provUserId = provRegRes.body?.user?.id;
    if (provUserId) cleanupUserIds.push(provUserId);

    // Verify initial registration status is strictly PENDING
    const { data: initialProfile } = await admin
      .from('provider_profiles')
      .select('id, approval_status')
      .eq('user_id', provUserId)
      .single();

    assertStep(
      initialProfile?.approval_status === 'pending',
      'Verify newly registered provider defaults to PENDING',
      `Approval status: ${initialProfile?.approval_status}`
    );

    // Athul manually approves test provider in Supabase
    await admin
      .from('provider_profiles')
      .update({ approval_status: 'approved' })
      .eq('user_id', provUserId);

    const providerProfileId = initialProfile?.id;

    // Create active service for provider
    const provLoginRes = await makeRequest('POST', '/api/auth/login', {
      email: providerEmail,
      password: providerPassword,
    });
    const providerToken = provLoginRes.body?.token;

    const createServiceRes = await makeRequest(
      'POST',
      '/api/services',
      {
        title: 'Master Cinematic Film Package',
        price: providerPrice,
        pricing_model: 'fixed',
        is_active: true,
      },
      { Authorization: `Bearer ${providerToken}` }
    );
    const serviceId = createServiceRes.body?.service?.id;
    if (serviceId) cleanupServiceIds.push(serviceId);

    // Query Public Provider Details & Verify Contact Suppression
    const pubProvRes = await makeRequest('GET', `/api/providers/${providerProfileId}`);
    const pubData = pubProvRes.body?.provider;
    const isContactSuppressed =
      pubData?.contactDemo?.phone === null && pubData?.contactDemo?.email === null;

    assertStep(
      pubProvRes.status === 200 && pubProvRes.body?.success && isContactSuppressed,
      'Find approved test provider & verify public contact suppression',
      `Found Provider: "${pubData?.name}", Phone: ${pubData?.contactDemo?.phone ?? 'null (Masked)'}`
    );

    // -------------------------------------------------------------------------
    // Step 5: Add Provider to Event Shortlist
    // -------------------------------------------------------------------------
    const addCartRes = await makeRequest(
      'POST',
      `/api/events/${eventId}/services`,
      { providerId: providerProfileId, serviceId },
      { Authorization: `Bearer ${customerToken}` }
    );

    assertStep(
      addCartRes.status === 201 && addCartRes.body?.success,
      'Add the provider to the event shortlist',
      `CartItemId: ${addCartRes.body?.item?.id}, ServiceId: ${serviceId}`
    );

    // -------------------------------------------------------------------------
    // Step 6: Verify Event Plan and Authoritative Budget
    // -------------------------------------------------------------------------
    const planRes = await makeRequest('GET', `/api/events/${eventId}/plan`, null, {
      Authorization: `Bearer ${customerToken}`,
    });
    const plan = planRes.body?.plan;
    const budgetOverview = plan?.budgetOverview;
    const hasShortlistedProvider =
      Array.isArray(plan?.selectedServices) &&
      plan.selectedServices.some((s) => s.providerId === providerProfileId);

    assertStep(
      planRes.status === 200 &&
        planRes.body?.success &&
        hasShortlistedProvider &&
        budgetOverview?.estimatedCost === providerPrice &&
        budgetOverview?.remainingBudget === eventBudget - providerPrice,
      'Verify Event Plan and authoritative budget',
      `Total: ₹${budgetOverview?.totalBudget}, Estimated: ₹${budgetOverview?.estimatedCost}, Remaining: ₹${budgetOverview?.remainingBudget}`
    );

    // -------------------------------------------------------------------------
    // Step 7: Dispatch the Booking Request
    // -------------------------------------------------------------------------
    const dispatchRes = await makeRequest(
      'POST',
      `/api/events/${eventId}/bookings`,
      { notes: 'Smoke test celebration booking' },
      { Authorization: `Bearer ${customerToken}` }
    );

    const dispatchedBookings = dispatchRes.body?.newlyCreatedBookings || [];
    const firstBooking = dispatchedBookings[0];
    const bookingId = firstBooking?.id;
    if (bookingId) cleanupBookingIds.push(bookingId);

    assertStep(
      dispatchRes.status === 201 &&
        dispatchRes.body?.success &&
        dispatchedBookings.length === 1 &&
        firstBooking?.bookingReference?.startsWith('EVA-BOOK-'),
      'Dispatch the booking request',
      `Created: ${dispatchedBookings.length}, Ref: ${firstBooking?.bookingReference}, BookingId: ${bookingId}`
    );

    // -------------------------------------------------------------------------
    // Step 8: Verify Booking is Created as PENDING with Contact Masked
    // -------------------------------------------------------------------------
    const myBookingsRes = await makeRequest('GET', '/api/bookings/my', null, {
      Authorization: `Bearer ${customerToken}`,
    });

    const myBookings = myBookingsRes.body?.bookings || [];
    const myMatch = myBookings.find((b) => b.id === bookingId || b.bookingId === bookingId);
    const isPendingAndMasked =
      myMatch?.status === 'PENDING' &&
      myMatch?.isContactUnlocked === false &&
      (myMatch?.providerContact == null || myMatch?.providerContact?.phone == null);

    assertStep(
      myBookingsRes.status === 200 && isPendingAndMasked,
      'Verify the booking is created as PENDING with contact masked',
      `Status: ${myMatch?.status}, Unlocked: ${myMatch?.isContactUnlocked}, Phone: ${myMatch?.providerContact?.phone ?? 'null (Protected)'}`
    );

    // -------------------------------------------------------------------------
    // Step 9: Authenticate the Provider
    // -------------------------------------------------------------------------
    assertStep(
      !!providerToken,
      'Authenticate the provider',
      `Provider: ${providerEmail}, Authenticated with Bearer token: true`
    );

    // -------------------------------------------------------------------------
    // Step 10: Verify Provider Receives the Booking
    // -------------------------------------------------------------------------
    const provInboxRes = await makeRequest('GET', '/api/bookings/provider', null, {
      Authorization: `Bearer ${providerToken}`,
    });

    const provBookings = provInboxRes.body?.bookings || [];
    const provMatch = provBookings.find((b) => b.id === bookingId || b.bookingId === bookingId);
    const provSideProtected =
      provMatch?.status === 'PENDING' &&
      provMatch?.isContactUnlocked === false &&
      (provMatch?.customerContact == null || provMatch?.customerContact?.phone == null);

    assertStep(
      provInboxRes.status === 200 && provSideProtected,
      'Verify the provider receives the booking with client contact protected',
      `Provider inbox count: ${provBookings.length}, Client phone masked: ${provMatch?.customerContact?.phone ?? 'null (Protected)'}`
    );

    // -------------------------------------------------------------------------
    // Step 11 & 12: Provider Accepts the Booking & Verify ACCEPTED Status
    // -------------------------------------------------------------------------
    const acceptRes = await makeRequest(
      'PATCH',
      `/api/bookings/${bookingId}/status`,
      { status: 'ACCEPTED' },
      { Authorization: `Bearer ${providerToken}` }
    );

    assertStep(
      acceptRes.status === 200 &&
        acceptRes.body?.success &&
        acceptRes.body?.booking?.status === 'ACCEPTED',
      'Provider accepts the booking and status becomes ACCEPTED',
      `New status: ${acceptRes.body?.booking?.status}`
    );

    // -------------------------------------------------------------------------
    // Step 13: Verify Contact Information Unlocks ONLY After Acceptance
    // -------------------------------------------------------------------------
    const myBookingsAfterRes = await makeRequest('GET', '/api/bookings/my', null, {
      Authorization: `Bearer ${customerToken}`,
    });
    const myUpdated = myBookingsAfterRes.body?.bookings?.find(
      (b) => b.id === bookingId || b.bookingId === bookingId
    );

    const provInboxAfterRes = await makeRequest('GET', '/api/bookings/provider', null, {
      Authorization: `Bearer ${providerToken}`,
    });
    const provUpdated = provInboxAfterRes.body?.bookings?.find(
      (b) => b.id === bookingId || b.bookingId === bookingId
    );

    const customerSeesUnlockedContact =
      myUpdated?.status === 'ACCEPTED' &&
      myUpdated?.isContactUnlocked === true &&
      myUpdated?.providerContact?.phone === providerRealPhone;

    const providerSeesUnlockedContact =
      provUpdated?.status === 'ACCEPTED' &&
      provUpdated?.isContactUnlocked === true &&
      provUpdated?.customerContact?.phone === customerPhone;

    assertStep(
      customerSeesUnlockedContact && providerSeesUnlockedContact,
      'Verify customer/provider contact information unlocks only after acceptance',
      `Customer unlocked Provider Phone: ${myUpdated?.providerContact?.phone} | Provider unlocked Customer Phone: ${provUpdated?.customerContact?.phone}`
    );

    // -------------------------------------------------------------------------
    // Step 14: Verify Event Plan Reflects Live Booking Status & Committed Budget
    // -------------------------------------------------------------------------
    const planAfterRes = await makeRequest('GET', `/api/events/${eventId}/plan`, null, {
      Authorization: `Bearer ${customerToken}`,
    });
    const updatedPlan = planAfterRes.body?.plan;
    const planService = updatedPlan?.selectedServices?.find(
      (s) => s.providerId === providerProfileId
    );
    const updatedBudget = updatedPlan?.budgetOverview;

    const planSynchronized =
      planService?.hasActiveBooking === true &&
      planService?.bookingStatus === 'ACCEPTED' &&
      updatedBudget?.committedCost === providerPrice;

    assertStep(
      planSynchronized,
      'Verify the Event Plan reflects updated booking status and committed budget',
      `Provider status in Plan: ${planService?.bookingStatus}, Committed Cost: ₹${updatedBudget?.committedCost}`
    );
  } catch (error) {
    console.error('[UNEXPECTED SMOKE ERROR]:', error);
  } finally {
    // -------------------------------------------------------------------------
    // Step 15: Clean Up All Test Data Safely Afterward
    // -------------------------------------------------------------------------
    console.log('\n[CLEANUP] Cleaning up test records safely from PostgreSQL...');
    try {
      if (cleanupBookingIds.length > 0) {
        await admin.from('bookings').delete().in('id', cleanupBookingIds);
      }
      if (cleanupEventIds.length > 0) {
        await admin.from('event_cart_items').delete().in('event_id', cleanupEventIds);
        await admin.from('events').delete().in('id', cleanupEventIds);
      }
      if (cleanupServiceIds.length > 0) {
        await admin.from('services').delete().in('id', cleanupServiceIds);
      }
      if (cleanupUserIds.length > 0) {
        await admin.from('provider_profiles').delete().in('user_id', cleanupUserIds);
        await admin.from('users').delete().in('id', cleanupUserIds);
        if (admin.auth?.admin?.deleteUser) {
          for (const uid of cleanupUserIds) {
            await admin.auth.admin.deleteUser(uid).catch(() => {});
          }
        }
      }
      console.log('[CLEANUP] Completed cleanly. All smoke artifacts purged.');
    } catch (cleanupErr) {
      console.warn('[CLEANUP WARNING]:', cleanupErr.message);
    }

    if (server) {
      server.close();
    }
  }

  console.log('\n================================================================');
  console.log(`   Smoke Test Execution Complete: ${passedCount} / ${stepIndex} PASSED`);
  if (failedCount > 0) {
    console.log(`   FAILED STEPS: ${failedCount}`);
  }
  console.log('================================================================\n');

  process.exit(failedCount === 0 ? 0 : 1);
};

runSmokeTest();

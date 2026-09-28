/**
 * Eva-Ai Phase 6 — Step 4: Event Plan & Multi-Provider Booking Dispatch Integration Test Suite
 *
 * Verifies end-to-end integration:
 * 1. Customer registration & session token generation
 * 2. Event creation with budget & metadata (POST /api/events)
 * 3. Shortlisting multiple providers into the event (POST /api/events/:id/services)
 * 4. Consuming consolidated Event Plan DTO (GET /api/events/:id/plan) with authoritative budget metrics & availability
 * 5. Multi-provider booking dispatch (POST /api/events/:id/bookings) creating individual EVA-BOOK records
 * 6. Shortlist retention verification: providers remain visible in Event Plan with live status 'PENDING'
 * 7. Duplicate dispatch protection: secondary dispatch skips already-requested providers
 * 8. Customer My Bookings visibility (GET /api/bookings/my) with contact protection (masked phone/email)
 * 9. Provider inbox visibility (GET /api/bookings/provider) and status transition to 'ACCEPTED' (PATCH /api/bookings/:id/status)
 * 10. Post-acceptance contact unlocking & Event Plan DTO reflects 'ACCEPTED' status
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

const runStep4Tests = async () => {
  console.log('================================================================');
  console.log('   Eva-Ai Phase 6 — Step 4: Event Plan & Dispatch Integration');
  console.log('================================================================\n');

  // Start HTTP Server
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });

  const admin = getSupabaseAdmin() || getSupabaseClient();
  const sfx = Date.now().toString(36);
  let passedCount = 0;
  let totalTests = 0;

  const assert = (condition, message, details = '') => {
    totalTests++;
    if (condition) {
      passedCount++;
      console.log(`[✅ PASS] Test ${totalTests}: ${message}`);
      if (details) console.log(`       Details: ${details}`);
    } else {
      console.error(`[❌ FAIL] Test ${totalTests}: ${message}`);
      if (details) console.error(`       Details: ${details}`);
    }
  };

  const createdCustomerIds = [];
  const createdProviderIds = [];
  const createdEventIds = [];
  const createdBookingIds = [];

  try {
    // -------------------------------------------------------------
    // Test 1: Customer Registration & Auth Session
    // -------------------------------------------------------------
    const custEmail = `cust.step4.${sfx}@gmail.com`;
    const custRegRes = await makeRequest('POST', '/api/auth/register/customer', {
      fullName: 'Aarav & Meera Menon',
      email: custEmail,
      phone: '+91 98471 88990',
      password: 'Password123!',
      location: 'Kochi, Kerala',
    });

    assert(
      custRegRes.status === 201 && custRegRes.body?.success && custRegRes.body?.token,
      'Customer registers and receives JWT token',
      `CustomerId: ${custRegRes.body?.user?.id}, email: ${custEmail}`
    );
    const customerToken = custRegRes.body?.token;
    const customerId = custRegRes.body?.user?.id;
    if (customerId) createdCustomerIds.push(customerId);

    // -------------------------------------------------------------
    // Setup 2 Approved Providers with Services
    // -------------------------------------------------------------
    const prov1Email = `prov1.step4.${sfx}@gmail.com`;
    const prov1RegRes = await makeRequest('POST', '/api/auth/register/provider', {
      name: 'Rohan Varma',
      businessName: `Royal Stills & Films ${sfx}`,
      email: prov1Email,
      phone: '+91 94470 11223',
      password: 'Password123!',
      location: 'Kochi',
      category: 'Photographer',
      startingPrice: 60000,
      experienceYears: 7,
      bio: 'Award winning wedding photographer in Kerala',
    });
    const provider1Token = prov1RegRes.body?.token;
    const prov1UserId = prov1RegRes.body?.user?.id;
    if (prov1UserId) createdProviderIds.push(prov1UserId);

    // Approve Provider 1 in database (provider_profiles)
    await admin.from('provider_profiles').update({ approval_status: 'approved' }).eq('user_id', prov1UserId);
    const { data: pProfile1 } = await admin.from('provider_profiles').select('id').eq('user_id', prov1UserId).single();
    const provider1ProfileId = pProfile1?.id;
    const provider1Id = provider1ProfileId;

    // Create active service for Provider 1
    const p1ServiceRes = await makeRequest(
      'POST',
      '/api/services',
      {
        title: 'Full Day Cinematic Wedding Coverage',
        price: 60000,
        pricing_model: 'fixed',
        is_active: true,
      },
      { Authorization: `Bearer ${provider1Token}` }
    );
    const service1Id = p1ServiceRes.body?.service?.id;

    // Provider 2 (Venue)
    const prov2Email = `prov2.step4.${sfx}@gmail.com`;
    const prov2RegRes = await makeRequest('POST', '/api/auth/register/provider', {
      name: 'Kavitha Nair',
      businessName: `Grand Heritage Palace ${sfx}`,
      email: prov2Email,
      phone: '+91 94470 44556',
      password: 'Password123!',
      location: 'Kochi',
      category: 'Venue / Auditorium',
      startingPrice: 200000,
      experienceYears: 12,
      bio: 'Lush heritage resort and banquet hall',
    });
    const provider2Token = prov2RegRes.body?.token;
    const prov2UserId = prov2RegRes.body?.user?.id;
    if (prov2UserId) createdProviderIds.push(prov2UserId);

    // Approve Provider 2 in database (provider_profiles)
    await admin.from('provider_profiles').update({ approval_status: 'approved' }).eq('user_id', prov2UserId);
    const { data: pProfile2 } = await admin.from('provider_profiles').select('id').eq('user_id', prov2UserId).single();
    const provider2ProfileId = pProfile2?.id;
    const provider2Id = provider2ProfileId;

    const p2ServiceRes = await makeRequest(
      'POST',
      '/api/services',
      {
        title: 'Grand Palace Banquet Hall',
        price: 200000,
        pricing_model: 'fixed',
        is_active: true,
      },
      { Authorization: `Bearer ${provider2Token}` }
    );
    const service2Id = p2ServiceRes.body?.service?.id;

    // -------------------------------------------------------------
    // Test 2: Event Creation with Authoritative Budget (POST /api/events)
    // -------------------------------------------------------------
    const eventDate = '2027-11-20';
    const createEventRes = await makeRequest(
      'POST',
      '/api/events',
      {
        title: 'Aarav & Meera Grand Wedding',
        eventType: 'wedding',
        eventDate,
        city: 'Kochi',
        location: 'Kochi',
        guestCount: 600,
        budget: 500000,
        status: 'draft',
      },
      { Authorization: `Bearer ${customerToken}` }
    );

    const eventId = createEventRes.body?.event?.id || createEventRes.body?.data?.id;
    if (eventId) createdEventIds.push(eventId);

    assert(
      createEventRes.status === 201 && eventId,
      'Customer creates event with budget & metadata (POST /api/events)',
      `EventId: ${eventId}, Budget: ₹500,000, Date: ${eventDate}`
    );

    // -------------------------------------------------------------
    // Test 3: Shortlisting Providers into Event (POST /api/events/:id/services)
    // -------------------------------------------------------------
    // Add Provider 1 (auto-resolve service)
    const addP1Res = await makeRequest(
      'POST',
      `/api/events/${eventId}/services`,
      { providerId: provider1Id },
      { Authorization: `Bearer ${customerToken}` }
    );

    // Add Provider 2 (explicit service)
    const addP2Res = await makeRequest(
      'POST',
      `/api/events/${eventId}/services`,
      { providerId: provider2Id, serviceId: service2Id },
      { Authorization: `Bearer ${customerToken}` }
    );

    assert(
      addP1Res.status === 201 && addP2Res.status === 201,
      'Shortlist multiple providers into event cart (POST /api/events/:id/services)',
      `P1 CartItemId: ${addP1Res.body?.service?.id}, P2 CartItemId: ${addP2Res.body?.service?.id}`
    );

    // -------------------------------------------------------------
    // Test 4: Consuming Consolidated Event Plan DTO (GET /api/events/:id/plan)
    // -------------------------------------------------------------
    const planRes = await makeRequest('GET', `/api/events/${eventId}/plan`, null, {
      Authorization: `Bearer ${customerToken}`,
    });

    const plan = planRes.body?.plan;
    const budgetOverview = plan?.budgetOverview;
    const selectedServices = plan?.selectedServices;

    assert(
      planRes.status === 200 &&
        plan?.event?.id === eventId &&
        Array.isArray(selectedServices) &&
        selectedServices.length === 2 &&
        budgetOverview?.totalBudget === 500000 &&
        budgetOverview?.estimatedCost === 260000 &&
        budgetOverview?.remainingBudget === 240000 &&
        budgetOverview?.isOverBudget === false &&
        selectedServices[0].hasActiveBooking === false &&
        selectedServices[0].bookingStatus === null,
      'Consolidated Event Plan DTO returns authoritative budget metrics and initial booking state',
      `EstimatedCost: ₹${budgetOverview?.estimatedCost}, Remaining: ₹${budgetOverview?.remainingBudget}, SelectedCount: ${selectedServices?.length}`
    );

    // -------------------------------------------------------------
    // Test 5: Multi-Provider Booking Dispatch (POST /api/events/:id/bookings)
    // -------------------------------------------------------------
    const dispatchRes = await makeRequest(
      'POST',
      `/api/events/${eventId}/bookings`,
      { notes: 'Please reserve this date for our wedding ceremony.' },
      { Authorization: `Bearer ${customerToken}` }
    );

    const newlyCreated = dispatchRes.body?.newlyCreatedBookings || [];
    newlyCreated.forEach((b) => {
      if (b.id) createdBookingIds.push(b.id);
    });

    assert(
      dispatchRes.status === 201 &&
        dispatchRes.body?.success &&
        newlyCreated.length === 2 &&
        newlyCreated.every((b) => b.bookingReference && b.bookingReference.startsWith('EVA-BOOK-') && b.status === 'PENDING'),
      'Multi-provider booking dispatch creates individual PENDING records with EVA-BOOK references',
      `Count: ${newlyCreated.length}, Refs: ${newlyCreated.map((b) => b.bookingReference).join(', ')}`
    );

    // -------------------------------------------------------------
    // Test 6: Shortlist Retention with Live 'PENDING' Status in Event Plan
    // -------------------------------------------------------------
    const postDispatchPlanRes = await makeRequest('GET', `/api/events/${eventId}/plan`, null, {
      Authorization: `Bearer ${customerToken}`,
    });

    const postServices = postDispatchPlanRes.body?.plan?.selectedServices || [];
    const p1InPlan = postServices.find((s) => s.providerId === provider1Id);
    const p2InPlan = postServices.find((s) => s.providerId === provider2Id);

    assert(
      postDispatchPlanRes.status === 200 &&
        postServices.length === 2 &&
        p1InPlan?.hasActiveBooking === true &&
        p1InPlan?.bookingStatus === 'PENDING' &&
        p2InPlan?.hasActiveBooking === true &&
        p2InPlan?.bookingStatus === 'PENDING',
      'Shortlist retention verified: providers remain visible in Event Plan with live status PENDING',
      `P1 active: ${p1InPlan?.hasActiveBooking} (${p1InPlan?.bookingStatus}), P2 active: ${p2InPlan?.hasActiveBooking} (${p2InPlan?.bookingStatus})`
    );

    // -------------------------------------------------------------
    // Test 7: Duplicate Booking Dispatch Protection
    // -------------------------------------------------------------
    const secondaryDispatchRes = await makeRequest('POST', `/api/events/${eventId}/bookings`, {}, {
      Authorization: `Bearer ${customerToken}`,
    });

    assert(
      secondaryDispatchRes.status === 201 &&
        secondaryDispatchRes.body?.newlyCreatedBookings?.length === 0 &&
        secondaryDispatchRes.body?.alreadyRequestedProviders?.length === 2,
      'Duplicate dispatch protection: secondary dispatch cleanly identifies already-requested providers',
      `Already requested count: ${secondaryDispatchRes.body?.alreadyRequestedProviders?.length}`
    );

    // -------------------------------------------------------------
    // Test 8: Customer My Bookings Visibility & Contact Protection
    // -------------------------------------------------------------
    const myBookingsRes = await makeRequest('GET', '/api/bookings/my', null, {
      Authorization: `Bearer ${customerToken}`,
    });

    const customerBookings = myBookingsRes.body?.bookings || [];
    const firstBooking = customerBookings[0];

    assert(
      myBookingsRes.status === 200 &&
        customerBookings.length === 2 &&
        firstBooking.status === 'PENDING' &&
        firstBooking.providerContact === null &&
        firstBooking.isContactUnlocked === false,
      'Customer My Bookings returns dispatched bookings with provider contact details protected (masked)',
      `Total bookings: ${customerBookings.length}, Provider contact masked: ${firstBooking?.providerContact === null}`
    );

    // -------------------------------------------------------------
    // Test 9: Provider Booking Inbox & Status Acceptance
    // -------------------------------------------------------------
    const p1InboxRes = await makeRequest('GET', '/api/bookings/provider', null, {
      Authorization: `Bearer ${provider1Token}`,
    });

    const p1Bookings = p1InboxRes.body?.bookings || [];
    const p1Booking = p1Bookings.find((b) => b.eventId === eventId);
    const booking1Id = p1Booking?.id;

    assert(
      p1InboxRes.status === 200 &&
        p1Bookings.length >= 1 &&
        p1Booking &&
        p1Booking.status === 'PENDING' &&
        p1Booking.customerContact === null,
      'Provider sees incoming inquiry with customer contact details protected (masked)',
      `Provider1 bookingId: ${booking1Id}, Customer contact masked: ${p1Booking?.customerContact === null}`
    );

    // Provider 1 accepts the booking (PATCH /api/bookings/:id/status)
    const acceptRes = await makeRequest(
      'PATCH',
      `/api/bookings/${booking1Id}/status`,
      { status: 'ACCEPTED' },
      { Authorization: `Bearer ${provider1Token}` }
    );

    assert(
      acceptRes.status === 200 && acceptRes.body?.booking?.status === 'ACCEPTED',
      'Provider updates booking status to ACCEPTED via PATCH /api/bookings/:id/status',
      `New status: ${acceptRes.body?.booking?.status}`
    );

    // -------------------------------------------------------------
    // Test 10: Contact Unlocking & Event Plan Live Reflection Post-Acceptance
    // -------------------------------------------------------------
    // Customer checks booking details
    const updatedCustBookingRes = await makeRequest('GET', `/api/bookings/${booking1Id}`, null, {
      Authorization: `Bearer ${customerToken}`,
    });

    const unlockedCustomerView = updatedCustBookingRes.body?.booking;
    const isContactUnlockedForCustomer =
      unlockedCustomerView?.isContactUnlocked === true &&
      unlockedCustomerView?.providerContact?.phone !== null;

    // Check Event Plan DTO
    const finalPlanRes = await makeRequest('GET', `/api/events/${eventId}/plan`, null, {
      Authorization: `Bearer ${customerToken}`,
    });

    const finalServices = finalPlanRes.body?.plan?.selectedServices || [];
    const p1Final = finalServices.find((s) => s.providerId === provider1Id);
    const finalBudget = finalPlanRes.body?.plan?.budgetOverview;

    assert(
      updatedCustBookingRes.status === 200 &&
        isContactUnlockedForCustomer &&
        p1Final?.hasActiveBooking === true &&
        p1Final?.bookingStatus === 'ACCEPTED' &&
        finalBudget?.committedCost === 60000 &&
        finalBudget?.pendingCost === 200000,
      'Post-acceptance verification: contact unlocked and Event Plan reflects ACCEPTED status with committed budget',
      `Provider Phone: ${unlockedCustomerView?.providerContact?.phone}, Committed: ₹${finalBudget?.committedCost}, Pending: ₹${finalBudget?.pendingCost}`
    );
  } finally {
    // -------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------
    console.log('\n[CLEANUP] Cleaning up test records...');
    try {
      if (createdBookingIds.length > 0) {
        await admin.from('bookings').delete().in('id', createdBookingIds);
      }
      if (createdEventIds.length > 0) {
        await admin.from('cart_items').delete().in('event_id', createdEventIds);
        await admin.from('events').delete().in('id', createdEventIds);
      }
      if (createdProviderIds.length > 0) {
        await admin.from('services').delete().in('provider_id', createdProviderIds);
        await admin.from('providers').delete().in('id', createdProviderIds);
      }
      if (createdCustomerIds.length > 0) {
        await admin.from('users').delete().in('id', [...createdCustomerIds, ...createdProviderIds]);
      }
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr.message);
    }

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  }

  console.log('\n================================================================');
  console.log(`   Step 4 Integration Results: ${passedCount} / ${totalTests} PASSED`);
  console.log('================================================================\n');

  if (passedCount !== totalTests) {
    process.exit(1);
  }
  process.exit(0);
};

runStep4Tests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

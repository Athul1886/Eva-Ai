/**
 * Phase 5 — Step 5: Event Plan Integration Test Suite
 *
 * Verifies all 10 required integration test scenarios:
 * Test 1: Event creation with budget & customer ownership
 * Test 2: Add provider to event shortlist by providerId (auto-resolves active service)
 * Test 3: Add provider with explicit serviceId to event shortlist
 * Test 4: Remove provider from shortlist by providerId
 * Test 5: Authoritative live budget calculation (totalBudget, estimatedCost, remainingBudget, over-budget flag)
 * Test 6: Event Plan DTO reflects whole-day provider date availability
 * Test 7: Multi-provider booking dispatch (POST /api/events/:id/bookings) creates individual PENDING bookings with EVA-BOOK references
 * Test 8: Shortlist retention with live booking status (hasActiveBooking: true, bookingStatus: 'PENDING') in Event Plan DTO
 * Test 9: Provider accepts booking -> Event Plan DTO updates to hasActiveBooking: true, bookingStatus: 'ACCEPTED'
 * Test 10: Unavailable provider excluded during dispatch & duplicate identified + full Phase 5 regression (42/42 passing)
 */

import { getSupabaseAdmin } from './config/supabase.js';
import * as authService from './services/auth.service.js';
import * as eventService from './services/event.service.js';
import * as providerService from './services/provider.service.js';
import * as serviceService from './services/service.service.js';
import * as bookingService from './services/booking.service.js';
import { FRONTEND_STATUS } from './utils/booking.dto.js';
import { execSync } from 'child_process';

const runStep5Tests = async () => {
  console.log('================================================================');
  console.log('   Eva-Ai Phase 5 — Step 5: Event Plan Integration Test Suite');
  console.log('================================================================\n');

  const adminClient = getSupabaseAdmin();
  const sfx = Date.now().toString(36);

  const results = [];
  const recordTest = (num, name, passed, details = '') => {
    results.push({ num, name, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[${mark}] Test ${num}: ${name}`);
    if (details) console.log(`       Details: ${details}`);
  };

  const createdBookingIds = [];
  const createdEventIds = [];
  const createdServiceIds = [];

  try {
    // -------------------------------------------------------------------------
    // SETUP: Provision Customer, Customer 2 (for isolation), Provider 1, Provider 2, Provider 3
    // -------------------------------------------------------------------------
    console.log('[SETUP] Provisioning test actors...');

    // Customer 1
    const cust1Auth = await authService.registerCustomer({
      fullName: 'Tara Krishnan',
      email: `tara.${sfx}@gmail.com`,
      phone: '+91 98471 44556',
      password: 'Password123!',
      location: 'Kochi',
    });
    const customer1 = cust1Auth.user;

    // Customer 2 (for security / boundary tests)
    const cust2Auth = await authService.registerCustomer({
      fullName: 'Vivek Pillai',
      email: `vivek.${sfx}@gmail.com`,
      phone: '+91 98471 66778',
      password: 'Password123!',
      location: 'Kochi',
    });
    const customer2 = cust2Auth.user;

    // Provider 1 (Photographer)
    const prov1Auth = await authService.registerProvider({
      name: 'Rahul Nair',
      businessName: `Lumina Lens Studios ${sfx}`,
      email: `rahul.${sfx}@gmail.com`,
      phone: '+91 94470 22331',
      password: 'Password123!',
      location: 'Kochi',
      category: 'Photographer',
      startingPrice: 50000,
      experienceYears: 8,
    });
    const providerUser1 = prov1Auth.user;

    // Provider 2 (Venue)
    const prov2Auth = await authService.registerProvider({
      name: 'Madhavan Varma',
      businessName: `The Grand Palm Resort ${sfx}`,
      email: `madhavan.${sfx}@gmail.com`,
      phone: '+91 98471 33221',
      password: 'Password123!',
      location: 'Kochi',
      category: 'Venue',
      startingPrice: 200000,
      experienceYears: 12,
    });
    const providerUser2 = prov2Auth.user;

    // Provider 3 (Catering)
    const prov3Auth = await authService.registerProvider({
      name: 'Chef Anjali',
      businessName: `Malabar Spice Feast ${sfx}`,
      email: `anjali.${sfx}@gmail.com`,
      phone: '+91 98471 11990',
      password: 'Password123!',
      location: 'Kochi',
      category: 'Catering',
      startingPrice: 80000,
      experienceYears: 7,
    });
    const providerUser3 = prov3Auth.user;

    // Approve all providers
    await adminClient
      .from('provider_profiles')
      .update({ approval_status: 'approved' })
      .in('user_id', [providerUser1.id, providerUser2.id, providerUser3.id]);

    const provProfile1 = await providerService.getProviderProfileByUserId(providerUser1.id);
    const provProfile2 = await providerService.getProviderProfileByUserId(providerUser2.id);
    const provProfile3 = await providerService.getProviderProfileByUserId(providerUser3.id);

    // Create explicit custom package for Provider 2 (Venue)
    const venuePackage = await serviceService.createService(providerUser2.id, {
      title: 'Lakeside Lawn & Banquet Hall Full Day',
      description: 'Exclusive lawn and banquet hall for 500 guests',
      price: 220000,
      pricing_model: 'fixed',
    });
    createdServiceIds.push(venuePackage.id);

    console.log('[SETUP] Completed. Running tests...\n');

    // -------------------------------------------------------------------------
    // TEST 1: Event creation with budget & customer ownership
    // -------------------------------------------------------------------------
    const eventDate = '2027-08-20';
    const totalBudget = 500000;
    const event = await eventService.createEvent(customer1.id, {
      title: 'Tara & Arun Grand Wedding',
      eventType: 'wedding',
      eventDate,
      location: 'Kochi',
      budget: totalBudget,
      guestCount: 450,
      preferences: { style: 'luxury', indoorOutdoor: 'indoor' },
      additionalNotes: 'Need best cinematography and traditional banquet',
    });
    createdEventIds.push(event.id);

    const pass1 =
      event &&
      event.id &&
      event.customerId === customer1.id &&
      event.budget === totalBudget &&
      event.guestCount === 450 &&
      event.eventDate === eventDate;

    recordTest(
      1,
      'Event creation with budget & customer ownership',
      pass1,
      `Event ID: ${event.id}, Budget: ₹${event.budget}, CustomerId: ${event.customerId}`
    );

    // -------------------------------------------------------------------------
    // TEST 2: Add provider to event shortlist by providerId (auto-resolves active service)
    // -------------------------------------------------------------------------
    // Add Provider 1 (Photographer) by passing ONLY providerId
    const item1 = await eventService.addServiceToEvent(event.id, customer1.id, {
      providerId: provProfile1.id,
      notes: 'Full day candid photo + cinematic teaser',
    });

    const pass2 =
      item1 &&
      item1.providerId === provProfile1.id &&
      item1.serviceId &&
      item1.price === 50000 &&
      item1.providerName.includes('Lumina Lens Studios');

    recordTest(
      2,
      'Add provider to event shortlist by providerId (auto-resolves active service)',
      pass2,
      `CartItemId: ${item1?.id}, ServiceId: ${item1?.serviceId}, Price: ₹${item1?.price}`
    );

    // -------------------------------------------------------------------------
    // TEST 3: Add provider with explicit serviceId to event shortlist
    // -------------------------------------------------------------------------
    // Add Provider 2 (Venue) by passing explicit serviceId
    const item2 = await eventService.addServiceToEvent(event.id, customer1.id, {
      serviceId: venuePackage.id,
      notes: 'Setup starting at 7:00 AM',
    });

    const pass3 =
      item2 &&
      item2.providerId === provProfile2.id &&
      item2.serviceId === venuePackage.id &&
      item2.price === 220000;

    recordTest(
      3,
      'Add provider with explicit serviceId to event shortlist',
      pass3,
      `CartItemId: ${item2?.id}, Package: ${item2?.package}, Price: ₹${item2?.price}`
    );

    // Also add Provider 3 (Catering) by providerId for multi-provider testing
    const item3 = await eventService.addServiceToEvent(event.id, customer1.id, {
      providerId: provProfile3.id,
      notes: 'Traditional Sadya feast for 450 guests',
    });

    // -------------------------------------------------------------------------
    // TEST 4: Remove provider from shortlist by providerId
    // -------------------------------------------------------------------------
    // Add a temporary service and remove it
    const tempProvAuth = await authService.registerProvider({
      name: 'Temp DJ',
      businessName: `Temp DJ Beats ${sfx}`,
      email: `tempdj.${sfx}@gmail.com`,
      phone: '+91 98471 00001',
      password: 'Password123!',
      location: 'Kochi',
      category: 'DJ',
      startingPrice: 30000,
    });
    await adminClient.from('provider_profiles').update({ approval_status: 'approved' }).eq('user_id', tempProvAuth.user.id);
    const tempProvProfile = await providerService.getProviderProfileByUserId(tempProvAuth.user.id);

    await eventService.addServiceToEvent(event.id, customer1.id, {
      providerId: tempProvProfile.id,
    });

    // Remove by providerId
    const removeResult = await eventService.removeServiceFromEvent(event.id, customer1.id, tempProvProfile.id);

    // Verify it is no longer in the shortlist
    const currentServices = await eventService.getEventServices(event.id, { id: customer1.id, role: 'customer' });
    const isTempPresent = currentServices.some((s) => s.providerId === tempProvProfile.id);

    const pass4 = removeResult.success && !isTempPresent;
    recordTest(
      4,
      'Remove provider from shortlist by providerId',
      pass4,
      `Removed success: ${removeResult.success}, Temp provider still present: ${isTempPresent}`
    );

    // -------------------------------------------------------------------------
    // TEST 5: Authoritative live budget calculation
    // -------------------------------------------------------------------------
    // Shortlisted items:
    // Item 1 (Photography): ₹50,000
    // Item 2 (Venue): ₹220,000
    // Item 3 (Catering): ₹80,000
    // Expected estimatedCost = 50,000 + 220,000 + 80,000 = ₹350,000
    // Total budget = ₹500,000
    // Expected remainingBudget = 500,000 - 350,000 = ₹150,000
    // Expected budgetUsagePercentage = (350000 / 500000) * 100 = 70%
    // Expected isOverBudget = false
    const planDto = await eventService.getEventPlan(event.id, { id: customer1.id, role: 'customer' });

    const pass5 =
      planDto &&
      planDto.budgetOverview.totalBudget === 500000 &&
      planDto.budgetOverview.estimatedCost === 350000 &&
      planDto.budgetOverview.remainingBudget === 150000 &&
      planDto.budgetOverview.budgetUsagePercentage === 70 &&
      planDto.budgetOverview.isOverBudget === false &&
      planDto.selectedCount === 3;

    recordTest(
      5,
      'Authoritative live budget calculation (estimatedCost, remainingBudget, usage %)',
      pass5,
      `Total: ₹${planDto?.budgetOverview?.totalBudget}, Estimated: ₹${planDto?.budgetOverview?.estimatedCost}, Remaining: ₹${planDto?.budgetOverview?.remainingBudget}, Usage: ${planDto?.budgetOverview?.budgetUsagePercentage}%, OverBudget: ${planDto?.budgetOverview?.isOverBudget}`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Event Plan DTO reflects whole-day provider date availability
    // -------------------------------------------------------------------------
    // Mark Provider 3 (Catering) as unavailable on eventDate
    await adminClient.from('provider_availability').insert({
      provider_id: provProfile3.id,
      date: eventDate,
      is_available: false,
      reason: 'Fully booked offline for family function',
    });

    const planWithAvail = await eventService.getEventPlan(event.id, { id: customer1.id, role: 'customer' });
    const p1Item = planWithAvail.selectedServices.find((s) => s.providerId === provProfile1.id);
    const p3Item = planWithAvail.selectedServices.find((s) => s.providerId === provProfile3.id);

    const pass6 =
      p1Item?.isAvailable === true &&
      p3Item?.isAvailable === false &&
      p3Item?.unavailableReason?.includes(eventDate) &&
      planWithAvail.unavailableCount === 1;

    recordTest(
      6,
      'Event Plan DTO reflects whole-day provider date availability',
      pass6,
      `Provider 1 available: ${p1Item?.isAvailable}, Provider 3 available: ${p3Item?.isAvailable} (${p3Item?.unavailableReason})`
    );

    // -------------------------------------------------------------------------
    // TEST 7: Multi-provider booking dispatch creates individual PENDING bookings
    // -------------------------------------------------------------------------
    // Dispatch booking requests for all shortlisted providers
    // Provider 1 (available) -> booking created (PENDING, EVA-BOOK-XXXXXX)
    // Provider 2 (available) -> booking created (PENDING, EVA-BOOK-XXXXXX)
    // Provider 3 (unavailable) -> excluded with reason
    const dispatchResult = await eventService.dispatchBookingRequests(event.id, customer1.id);

    const bList = dispatchResult.newlyCreatedBookings || [];
    bList.forEach((b) => createdBookingIds.push(b.id));

    const p1Booking = bList.find((b) => b.providerId === provProfile1.id);
    const p2Booking = bList.find((b) => b.providerId === provProfile2.id);

    const pass7 =
      dispatchResult.success === true &&
      bList.length === 2 &&
      p1Booking &&
      p1Booking.status === FRONTEND_STATUS.PENDING &&
      p1Booking.bookingReference.startsWith('EVA-BOOK-') &&
      p2Booking &&
      p2Booking.status === FRONTEND_STATUS.PENDING &&
      p2Booking.bookingReference.startsWith('EVA-BOOK-') &&
      dispatchResult.unavailableProviders.some((u) => u.providerId === provProfile3.id);

    recordTest(
      7,
      'Multi-provider booking dispatch (POST /api/events/:id/bookings) creates individual PENDING bookings',
      pass7,
      `Created count: ${bList.length}, P1 Ref: ${p1Booking?.bookingReference}, P2 Ref: ${p2Booking?.bookingReference}, Excluded count: ${dispatchResult.unavailableProviders?.length}`
    );

    // -------------------------------------------------------------------------
    // TEST 8: Shortlist retention with live booking status in Event Plan DTO
    // -------------------------------------------------------------------------
    // Verify that after dispatch, the providers remain in the Event Plan and show hasActiveBooking: true, bookingStatus: 'PENDING'
    const planAfterDispatch = await eventService.getEventPlan(event.id, { id: customer1.id, role: 'customer' });
    const p1Shortlist = planAfterDispatch.selectedServices.find((s) => s.providerId === provProfile1.id);
    const p2Shortlist = planAfterDispatch.selectedServices.find((s) => s.providerId === provProfile2.id);
    const p3Shortlist = planAfterDispatch.selectedServices.find((s) => s.providerId === provProfile3.id);

    const pass8 =
      planAfterDispatch.selectedCount === 3 &&
      p1Shortlist?.hasActiveBooking === true &&
      p1Shortlist?.bookingStatus === FRONTEND_STATUS.PENDING &&
      p1Shortlist?.bookingReference === p1Booking.bookingReference &&
      p2Shortlist?.hasActiveBooking === true &&
      p2Shortlist?.bookingStatus === FRONTEND_STATUS.PENDING &&
      p3Shortlist?.hasActiveBooking === false; // Provider 3 was excluded so no booking was created

    recordTest(
      8,
      'Shortlist retention with live booking status (hasActiveBooking: true, bookingStatus: PENDING)',
      pass8,
      `P1: active=${p1Shortlist?.hasActiveBooking} status=${p1Shortlist?.bookingStatus} ref=${p1Shortlist?.bookingReference} | P3: active=${p3Shortlist?.hasActiveBooking}`
    );

    // -------------------------------------------------------------------------
    // TEST 9: Provider accepts booking -> Event Plan DTO updates to ACCEPTED
    // -------------------------------------------------------------------------
    // Provider 1 accepts their booking
    await bookingService.updateBookingStatus(
      p1Booking.id,
      { id: providerUser1.id, role: 'provider' },
      FRONTEND_STATUS.ACCEPTED
    );

    const planAfterAccept = await eventService.getEventPlan(event.id, { id: customer1.id, role: 'customer' });
    const p1Updated = planAfterAccept.selectedServices.find((s) => s.providerId === provProfile1.id);
    const p2Updated = planAfterAccept.selectedServices.find((s) => s.providerId === provProfile2.id);

    const pass9 =
      p1Updated?.hasActiveBooking === true &&
      p1Updated?.bookingStatus === FRONTEND_STATUS.ACCEPTED &&
      p2Updated?.hasActiveBooking === true &&
      p2Updated?.bookingStatus === FRONTEND_STATUS.PENDING &&
      planAfterAccept.budgetOverview.committedCost === 50000;

    recordTest(
      9,
      'Provider accepts booking -> Event Plan DTO updates to hasActiveBooking: true, bookingStatus: ACCEPTED',
      pass9,
      `P1 status: ${p1Updated?.bookingStatus}, P2 status: ${p2Updated?.bookingStatus}, Committed cost: ₹${planAfterAccept?.budgetOverview?.committedCost}`
    );

    // -------------------------------------------------------------------------
    // TEST 10: Duplicate identified + full regression suite (42/42 passing)
    // -------------------------------------------------------------------------
    try {
      // Re-dispatching to the same event plan should now identify Provider 1 and 2 as already requested
      const secondDispatch = await eventService.dispatchBookingRequests(event.id, customer1.id);
      const duplicateIdentified =
        secondDispatch.alreadyRequestedProviders.some((a) => a.providerId === provProfile1.id) &&
        secondDispatch.alreadyRequestedProviders.some((a) => a.providerId === provProfile2.id) &&
        secondDispatch.newlyCreatedBookings.length === 0;

      // Cross-customer access to event plan blocked with 403
      let crossCustomerBlocked = false;
      try {
        await eventService.getEventPlan(event.id, { id: customer2.id, role: 'customer' });
      } catch (err) {
        crossCustomerBlocked = err.statusCode === 403;
      }

      console.log('\n[REGRESSION] Running regression suites across Steps 1, 2, 3, 4...');

      const fOut = execSync('node src/test_foundation.js', { encoding: 'utf8' });
      const fPass = fOut.includes('Foundation Suite Results: 9 / 9 PASSED');

      const lOut = execSync('node src/test_lifecycle.js', { encoding: 'utf8' });
      const lPass = lOut.includes('Lifecycle Suite Results: 13 / 13 PASSED');

      const s3Out = execSync('node src/test_step3.js', { encoding: 'utf8' });
      const s3Pass = s3Out.includes('Step 3 Hardening Suite Results: 10 / 10 PASSED');

      const s4Out = execSync('node src/test_step4.js', { encoding: 'utf8' });
      const s4Pass = s4Out.includes('Step 4 Contact Protection Results: 10 / 10 PASSED');

      const pass10 = duplicateIdentified && crossCustomerBlocked && fPass && lPass && s3Pass && s4Pass;

      recordTest(
        10,
        'Duplicate identified & cross-customer blocked (403) + full Phase 5 regression (42/42)',
        pass10,
        `Duplicate identified: ${duplicateIdentified}, 403 blocked: ${crossCustomerBlocked}, Step1: ${fPass ? '9/9' : 'FAIL'}, Step2: ${lPass ? '13/13' : 'FAIL'}, Step3: ${s3Pass ? '10/10' : 'FAIL'}, Step4: ${s4Pass ? '10/10' : 'FAIL'}`
      );
    } catch (err) {
      recordTest(10, 'Duplicate identified & regression suites', false, err.message);
    }

    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log('\n[CLEANUP] Cleaning up test records...');
    for (const bId of createdBookingIds) {
      await adminClient.from('bookings').delete().eq('id', bId);
    }
    for (const eId of createdEventIds) {
      await adminClient.from('cart_items').delete().eq('event_id', eId);
      await adminClient.from('events').delete().eq('id', eId);
    }
    for (const sId of createdServiceIds) {
      await adminClient.from('services').delete().eq('id', sId);
    }
    console.log('[CLEANUP] Completed.');
  } catch (fatal) {
    console.error('[FATAL STEP 5 ERROR]', fatal);
  }

  console.log('\n================================================================');
  const passCount = results.filter((r) => r.passed).length;
  console.log(`   Step 5 Event Plan Results: ${passCount} / ${results.length} PASSED`);
  console.log('================================================================\n');

  return passCount === results.length;
};

runStep5Tests().then((allPassed) => {
  process.exit(allPassed ? 0 : 1);
});

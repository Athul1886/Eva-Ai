/**
 * Phase 5 — Step 3: Availability & Booking Validation Hardening Test Suite
 *
 * Verifies all 10 required test scenarios:
 * Test 1: Provider available -> booking succeeds -> PENDING
 * Test 2: Provider unavailable -> booking rejected (409)
 * Test 3: Same customer + same event + same provider + PENDING booking -> duplicate rejected (409)
 * Test 4: Same customer + same event + same provider + ACCEPTED booking -> duplicate rejected (409)
 * Test 5: Existing REJECTED booking -> new booking allowed
 * Test 6: Existing CANCELLED booking -> new booking allowed
 * Test 7: Customer attempts booking using another customer's event -> 403
 * Test 8: Invalid provider/service relationship -> rejected (400)
 * Test 9: Booking date different from event date -> rejected (400)
 * Test 10: Verify existing Phase 5 Step 2 lifecycle tests still pass
 */

import { getSupabaseAdmin } from './config/supabase.js';
import * as authService from './services/auth.service.js';
import * as eventService from './services/event.service.js';
import * as providerService from './services/provider.service.js';
import * as serviceService from './services/service.service.js';
import * as bookingService from './services/booking.service.js';
import { FRONTEND_STATUS } from './utils/booking.dto.js';

const runStep3Tests = async () => {
  console.log('================================================================');
  console.log('   Eva-Ai Phase 5 — Step 3: Validation Hardening Test Suite');
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

  try {
    // -------------------------------------------------------------------------
    // SETUP: Provision Customer 1, Customer 2, Provider 1, Provider 2
    // -------------------------------------------------------------------------
    console.log('[SETUP] Provisioning test actors...');

    // Customer 1
    const cust1Auth = await authService.registerCustomer({
      fullName: 'Meera Nambiar',
      email: `meera.${sfx}@gmail.com`,
      phone: '+91 98471 22334',
      password: 'Password123!',
      location: 'Kochi',
    });
    const customer1 = cust1Auth.user;

    // Customer 2
    const cust2Auth = await authService.registerCustomer({
      fullName: 'Kiran Pillai',
      email: `kiran.${sfx}@gmail.com`,
      phone: '+91 98471 77889',
      password: 'Password123!',
      location: 'Kochi',
    });
    const customer2 = cust2Auth.user;

    // Provider 1
    const prov1Auth = await authService.registerProvider({
      name: 'Ashwin Nair',
      businessName: `Cinematic Memories ${sfx}`,
      email: `ashwin.${sfx}@gmail.com`,
      phone: '+91 94470 55667',
      password: 'Password123!',
      location: 'Palakkad',
      category: 'Photographer',
      startingPrice: 50000,
      experienceYears: 9,
    });
    const providerUser1 = prov1Auth.user;

    // Provider 2
    const prov2Auth = await authService.registerProvider({
      name: 'Deepak Varma',
      businessName: `Royal Orchid Palace ${sfx}`,
      email: `deepak.${sfx}@gmail.com`,
      phone: '+91 98471 33445',
      password: 'Password123!',
      location: 'Thrissur',
      category: 'Venue',
      startingPrice: 180000,
      experienceYears: 15,
    });
    const providerUser2 = prov2Auth.user;

    // Approve both providers
    await adminClient
      .from('provider_profiles')
      .update({ approval_status: 'approved' })
      .in('user_id', [providerUser1.id, providerUser2.id]);

    const provProfile1 = await providerService.getProviderProfileByUserId(providerUser1.id);
    const provProfile2 = await providerService.getProviderProfileByUserId(providerUser2.id);

    // Create a specific service for Provider 2 (to test cross-provider service tampering in Test 8)
    const srvProv2 = await serviceService.createService(providerUser2.id, {
      title: 'Grand Ballroom Full Day Rental',
      description: 'Air conditioned palace ballroom for 1000 guests',
      price: 180000,
      pricing_model: 'fixed',
    });

    // Event 1 for Customer 1 (Date: 2026-11-25)
    const eventDate1 = '2026-11-25';
    const event1 = await eventService.createEvent(customer1.id, {
      title: 'Meera Royal Wedding',
      eventType: 'wedding',
      eventDate: eventDate1,
      location: 'Kochi',
      budget: 1800000,
      guestCount: 650,
    });
    createdEventIds.push(event1.id);

    // Event 2 for Customer 2 (to test cross-customer event tampering in Test 7)
    const eventDate2 = '2026-12-05';
    const event2 = await eventService.createEvent(customer2.id, {
      title: 'Kiran Engagement',
      eventType: 'engagement',
      eventDate: eventDate2,
      location: 'Kochi',
      budget: 500000,
      guestCount: 200,
    });
    createdEventIds.push(event2.id);

    console.log('[SETUP] Completed. Running tests...\n');

    // -------------------------------------------------------------------------
    // TEST 1: Provider available -> booking succeeds -> PENDING
    // -------------------------------------------------------------------------
    let booking1 = null;
    try {
      booking1 = await bookingService.createBooking(customer1.id, {
        eventId: event1.id,
        providerId: provProfile1.id,
        bookingDate: eventDate1,
        notes: 'Wedding ceremony coverage',
      });
      createdBookingIds.push(booking1.id);

      const pass1 =
        booking1 &&
        booking1.status === FRONTEND_STATUS.PENDING &&
        booking1.eventDate === eventDate1 &&
        booking1.providerId === provProfile1.id;

      recordTest(
        1,
        'Provider available -> booking succeeds -> PENDING',
        pass1,
        `Booking ID: ${booking1.bookingId}, Status: ${booking1.status}, Date: ${booking1.eventDate}`
      );
    } catch (err) {
      recordTest(1, 'Provider available -> booking succeeds', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 2: Provider unavailable -> booking rejected (409)
    // -------------------------------------------------------------------------
    try {
      // Mark Provider 2 unavailable on eventDate1
      await adminClient.from('provider_availability').insert({
        provider_id: provProfile2.id,
        date: eventDate1,
        is_available: false,
        reason: 'Maintenance & Renovations',
      });

      await bookingService.createBooking(customer1.id, {
        eventId: event1.id,
        providerId: provProfile2.id,
        bookingDate: eventDate1,
      });

      recordTest(2, 'Provider unavailable -> booking rejected', false, 'Allowed booking on unavailable date!');
    } catch (err) {
      const pass2 = err.statusCode === 409 && err.message.includes('not available');
      recordTest(
        2,
        'Provider unavailable -> booking rejected (409 Conflict)',
        pass2,
        `Caught expected error (HTTP 409): ${err.message}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 3: Same customer + same event + same provider + PENDING booking -> duplicate rejected
    // -------------------------------------------------------------------------
    try {
      // booking1 is currently PENDING for customer1 + event1 + provProfile1
      await bookingService.createBooking(customer1.id, {
        eventId: event1.id,
        providerId: provProfile1.id,
        bookingDate: eventDate1,
      });

      recordTest(3, 'Duplicate active booking (PENDING) rejected', false, 'Allowed duplicate!');
    } catch (err) {
      const pass3 = err.statusCode === 409 && err.message.includes('already exists');
      recordTest(
        3,
        'Same customer + same event + same provider + PENDING booking -> duplicate rejected (409)',
        pass3,
        `Caught expected error: ${err.message}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 4: Same customer + same event + same provider + ACCEPTED booking -> duplicate rejected
    // -------------------------------------------------------------------------
    try {
      // Provider 1 accepts booking1 -> status becomes ACCEPTED
      await bookingService.updateBookingStatus(
        booking1.id,
        { id: providerUser1.id, role: 'provider' },
        FRONTEND_STATUS.ACCEPTED
      );

      // Customer 1 tries to create another booking for the same event and provider
      await bookingService.createBooking(customer1.id, {
        eventId: event1.id,
        providerId: provProfile1.id,
        bookingDate: eventDate1,
      });

      recordTest(4, 'Duplicate active booking (ACCEPTED) rejected', false, 'Allowed duplicate!');
    } catch (err) {
      const pass4 = err.statusCode === 409 && err.message.includes('already exists');
      recordTest(
        4,
        'Same customer + same event + same provider + ACCEPTED booking -> duplicate rejected (409)',
        pass4,
        `Caught expected error: ${err.message}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 5: Existing REJECTED booking -> new booking allowed
    // -------------------------------------------------------------------------
    try {
      // Create Event 3 for customer 1 on a fresh date
      const eventDate3 = '2027-01-20';
      const event3 = await eventService.createEvent(customer1.id, {
        title: 'Post-Wedding Reception',
        eventType: 'reception',
        eventDate: eventDate3,
        location: 'Kochi',
        budget: 600000,
        guestCount: 300,
      });
      createdEventIds.push(event3.id);

      // Create a booking and have provider REJECT it
      const bToReject = await bookingService.createBooking(customer1.id, {
        eventId: event3.id,
        providerId: provProfile1.id,
        bookingDate: eventDate3,
      });
      createdBookingIds.push(bToReject.id);

      await bookingService.updateBookingStatus(
        bToReject.id,
        { id: providerUser1.id, role: 'provider' },
        FRONTEND_STATUS.REJECTED
      );

      // Customer creates a NEW booking for the same event and provider
      const bNewAfterReject = await bookingService.createBooking(customer1.id, {
        eventId: event3.id,
        providerId: provProfile1.id,
        bookingDate: eventDate3,
      });
      createdBookingIds.push(bNewAfterReject.id);

      const pass5 = bNewAfterReject && bNewAfterReject.status === FRONTEND_STATUS.PENDING;
      recordTest(
        5,
        'Existing REJECTED booking -> new booking allowed -> PENDING',
        pass5,
        `New booking reference: ${bNewAfterReject?.bookingReference}, Status: ${bNewAfterReject?.status}`
      );
    } catch (err) {
      recordTest(5, 'Existing REJECTED booking -> new booking allowed', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 6: Existing CANCELLED booking -> new booking allowed
    // -------------------------------------------------------------------------
    try {
      // Create Event 4 for customer 1
      const eventDate4 = '2027-02-10';
      const event4 = await eventService.createEvent(customer1.id, {
        title: 'Engagement Banquet',
        eventType: 'engagement',
        eventDate: eventDate4,
        location: 'Kochi',
        budget: 400000,
        guestCount: 200,
      });
      createdEventIds.push(event4.id);

      // Create a booking and customer CANCELS it
      const bToCancel = await bookingService.createBooking(customer1.id, {
        eventId: event4.id,
        providerId: provProfile1.id,
        bookingDate: eventDate4,
      });
      createdBookingIds.push(bToCancel.id);

      await bookingService.updateBookingStatus(
        bToCancel.id,
        { id: customer1.id, role: 'customer' },
        FRONTEND_STATUS.CANCELLED
      );

      // Customer creates a NEW booking for the same event and provider
      const bNewAfterCancel = await bookingService.createBooking(customer1.id, {
        eventId: event4.id,
        providerId: provProfile1.id,
        bookingDate: eventDate4,
      });
      createdBookingIds.push(bNewAfterCancel.id);

      const pass6 = bNewAfterCancel && bNewAfterCancel.status === FRONTEND_STATUS.PENDING;
      recordTest(
        6,
        'Existing CANCELLED booking -> new booking allowed -> PENDING',
        pass6,
        `New booking reference: ${bNewAfterCancel?.bookingReference}, Status: ${bNewAfterCancel?.status}`
      );
    } catch (err) {
      recordTest(6, 'Existing CANCELLED booking -> new booking allowed', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 7: Customer attempts booking using another customer's event -> 403
    // -------------------------------------------------------------------------
    try {
      // Customer 1 tries to create booking referencing Event 2 (which belongs to Customer 2)
      await bookingService.createBooking(customer1.id, {
        eventId: event2.id, // Owned by customer 2!
        providerId: provProfile1.id,
        bookingDate: eventDate2,
      });

      recordTest(7, 'Booking using another customer\'s event -> 403', false, 'Allowed unauthorized event booking!');
    } catch (err) {
      const pass7 = err.statusCode === 403 && err.message.includes('own events');
      recordTest(
        7,
        'Customer attempts booking using another customer\'s event -> 403 Forbidden',
        pass7,
        `Caught expected error (HTTP 403): ${err.message}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 8: Invalid provider/service relationship -> rejected (400)
    // -------------------------------------------------------------------------
    try {
      // Customer 1 tries to book Provider 1, but specifies service belonging to Provider 2
      await bookingService.createBooking(customer1.id, {
        eventId: event1.id,
        providerId: provProfile1.id, // Provider 1
        serviceId: srvProv2.id,      // Belongs to Provider 2!
        bookingDate: eventDate1,
      });

      recordTest(8, 'Invalid provider/service relationship -> rejected', false, 'Allowed mismatched service!');
    } catch (err) {
      const pass8 = err.statusCode === 400 && err.message.includes('does not belong to this provider');
      recordTest(
        8,
        'Invalid provider/service relationship -> rejected (400 BadRequest)',
        pass8,
        `Caught expected error (HTTP 400): ${err.message}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 9: Booking date different from event date -> rejected (400)
    // -------------------------------------------------------------------------
    try {
      // event1 date is 2026-11-25; client passes 2026-11-30
      await bookingService.createBooking(customer1.id, {
        eventId: event1.id,
        providerId: provProfile1.id,
        bookingDate: '2026-11-30', // Mismatched date!
      });

      recordTest(9, 'Booking date different from event date -> rejected', false, 'Allowed mismatched booking date!');
    } catch (err) {
      const pass9 = err.statusCode === 400 && err.message.includes('must match your event date');
      recordTest(
        9,
        'Booking date different from event date -> rejected (400 BadRequest)',
        pass9,
        `Caught expected error (HTTP 400): ${err.message}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 10: Verify existing Phase 5 Step 2 lifecycle tests still pass
    // -------------------------------------------------------------------------
    try {
      // Verify complete lifecycle: create, accept, complete, ensure contact revealed
      const testEvt = await eventService.createEvent(customer1.id, {
        title: 'Anniversary Dinner',
        eventType: 'anniversary',
        eventDate: '2027-03-20',
        location: 'Kochi',
        budget: 300000,
        guestCount: 100,
      });
      createdEventIds.push(testEvt.id);

      const bLife = await bookingService.createBooking(customer1.id, {
        eventId: testEvt.id,
        providerId: provProfile1.id,
        bookingDate: '2027-03-20',
      });
      createdBookingIds.push(bLife.id);

      // Accept
      const accepted = await bookingService.updateBookingStatus(
        bLife.id,
        { id: providerUser1.id, role: 'provider' },
        FRONTEND_STATUS.ACCEPTED
      );

      // Complete
      const completed = await bookingService.updateBookingStatus(
        bLife.id,
        { id: providerUser1.id, role: 'provider' },
        FRONTEND_STATUS.COMPLETED
      );

      // Verify customer view of completed booking has contact unlocked
      const custView = await bookingService.getBookingById(bLife.id, { id: customer1.id, role: 'customer' });
      const contactRevealed = custView.providerContact !== null && custView.providerContact.phone === '+91 94470 55667';

      const pass10 =
        accepted.status === FRONTEND_STATUS.ACCEPTED &&
        completed.status === FRONTEND_STATUS.COMPLETED &&
        contactRevealed;

      recordTest(
        10,
        'Verify existing Phase 5 Step 2 lifecycle tests still pass (ACCEPTED -> COMPLETED -> contact unlocked)',
        pass10,
        `Final status: ${completed?.status}, Contact unlocked: ${contactRevealed}`
      );
    } catch (err) {
      recordTest(10, 'Lifecycle verification', false, err.message);
    }

    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log('\n[CLEANUP] Cleaning up test records...');
    for (const bId of createdBookingIds) {
      await adminClient.from('bookings').delete().eq('id', bId);
    }
    for (const eId of createdEventIds) {
      await adminClient.from('events').delete().eq('id', eId);
    }
    if (srvProv2?.id) {
      await adminClient.from('services').delete().eq('id', srvProv2.id);
    }
    console.log('[CLEANUP] Completed.');
  } catch (fatal) {
    console.error('[FATAL STEP 3 ERROR]', fatal);
  }

  console.log('\n================================================================');
  const passCount = results.filter((r) => r.passed).length;
  console.log(`   Step 3 Hardening Suite Results: ${passCount} / ${results.length} PASSED`);
  console.log('================================================================\n');

  return passCount === results.length;
};

runStep3Tests().then((allPassed) => {
  process.exit(allPassed ? 0 : 1);
});

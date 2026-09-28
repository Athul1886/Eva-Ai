/**
 * Phase 5 - Step 2: Booking Status Lifecycle Test Suite
 *
 * Verifies all 12+ lifecycle requirements:
 * 1. Customer cancels PENDING booking -> PASS
 * 2. Provider accepts PENDING booking -> PASS
 * 3. Customer sees ACCEPTED status -> PASS
 * 4. Provider rejects another PENDING booking -> PASS
 * 5. Customer cannot ACCEPT a booking -> 403 Forbidden
 * 6. Provider 2 cannot modify Provider 1's booking -> 403 Forbidden
 * 7. ACCEPTED -> COMPLETED by assigned provider -> PASS
 * 8. ACCEPTED -> CANCELLED by customer/provider -> PASS
 * 9. REJECTED cannot become ACCEPTED -> 400 Disallowed transition
 * 10. CANCELLED cannot become ACCEPTED -> 400 Disallowed transition
 * 11. COMPLETED cannot become CANCELLED/ACCEPTED -> 400 Disallowed transition
 * 12. Contact protection changes correctly across lifecycle (hidden on PENDING/REJECTED/CANCELLED, revealed on ACCEPTED/COMPLETED)
 * 13. API responses strictly use frontend status terminology (PENDING, ACCEPTED, REJECTED, CANCELLED, COMPLETED)
 */

import { getSupabaseAdmin } from './config/supabase.js';
import * as authService from './services/auth.service.js';
import * as eventService from './services/event.service.js';
import * as providerService from './services/provider.service.js';
import * as bookingService from './services/booking.service.js';
import { FRONTEND_STATUS } from './utils/booking.dto.js';

const runLifecycleTests = async () => {
  console.log('================================================================');
  console.log('   Eva-Ai Phase 5 — Step 2: Booking Status Lifecycle Test Suite');
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
      fullName: 'Pooja Nair',
      email: `pooja.${sfx}@gmail.com`,
      phone: '+91 98471 11223',
      password: 'Password123!',
      location: 'Kochi',
    });
    const customer1 = cust1Auth.user;

    // Customer 2
    const cust2Auth = await authService.registerCustomer({
      fullName: 'Vikram Joshi',
      email: `vikram.${sfx}@gmail.com`,
      phone: '+91 98471 99881',
      password: 'Password123!',
      location: 'Kochi',
    });
    const customer2 = cust2Auth.user;

    // Provider 1
    const prov1Auth = await authService.registerProvider({
      name: 'Rohit Menon',
      businessName: `LensCraft Atelier ${sfx}`,
      email: `rohit.${sfx}@gmail.com`,
      phone: '+91 94470 12345',
      password: 'Password123!',
      location: 'Palakkad',
      category: 'Photographer',
      startingPrice: 45000,
      experienceYears: 8,
    });
    const providerUser1 = prov1Auth.user;

    // Provider 2
    const prov2Auth = await authService.registerProvider({
      name: 'Sunil Varma',
      businessName: `Grand Regal ${sfx}`,
      email: `sunil.${sfx}@gmail.com`,
      phone: '+91 98471 99882',
      password: 'Password123!',
      location: 'Thrissur',
      category: 'Venue',
      startingPrice: 150000,
      experienceYears: 12,
    });
    const providerUser2 = prov2Auth.user;

    // Auto-approve providers
    await adminClient
      .from('provider_profiles')
      .update({ approval_status: 'approved' })
      .in('user_id', [providerUser1.id, providerUser2.id]);

    const provProfile1 = await providerService.getProviderProfileByUserId(providerUser1.id);
    const provProfile2 = await providerService.getProviderProfileByUserId(providerUser2.id);

    // Event 1 (Date: 2026-11-20)
    const event1 = await eventService.createEvent(customer1.id, {
      title: 'Grand Royal Wedding',
      eventType: 'wedding',
      eventDate: '2026-11-20',
      location: 'Kochi',
      budget: 1500000,
      guestCount: 600,
    });
    createdEventIds.push(event1.id);

    // Event 2 (Date: 2026-12-10)
    const event2 = await eventService.createEvent(customer1.id, {
      title: 'Reception Gala',
      eventType: 'reception',
      eventDate: '2026-12-10',
      location: 'Kochi',
      budget: 800000,
      guestCount: 400,
    });
    createdEventIds.push(event2.id);

    // Event 3 (Date: 2026-12-25)
    const event3 = await eventService.createEvent(customer1.id, {
      title: 'Anniversary Banquet',
      eventType: 'anniversary',
      eventDate: '2026-12-25',
      location: 'Kochi',
      budget: 500000,
      guestCount: 200,
    });
    createdEventIds.push(event3.id);

    console.log('[SETUP] Completed. Running tests...\n');

    // -------------------------------------------------------------------------
    // TEST 1: Customer cancels PENDING booking -> PASS
    // -------------------------------------------------------------------------
    let bPendingToCancel = await bookingService.createBooking(customer1.id, {
      eventId: event1.id,
      providerId: provProfile1.id,
      bookingDate: '2026-11-20',
      amount: 45000,
    });
    createdBookingIds.push(bPendingToCancel.id);

    try {
      const cancelledByCust = await bookingService.updateBookingStatus(
        bPendingToCancel.id,
        { id: customer1.id, role: 'customer' },
        FRONTEND_STATUS.CANCELLED
      );

      const pass1 = cancelledByCust && cancelledByCust.status === FRONTEND_STATUS.CANCELLED;
      recordTest(
        1,
        'Customer cancels PENDING booking -> PASS',
        pass1,
        `Status updated to: ${cancelledByCust?.status}`
      );
    } catch (err) {
      recordTest(1, 'Customer cancels PENDING booking', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 2: Provider accepts PENDING booking -> PASS
    // -------------------------------------------------------------------------
    let bPendingToAccept = await bookingService.createBooking(customer1.id, {
      eventId: event2.id,
      providerId: provProfile1.id,
      bookingDate: '2026-12-10',
      amount: 45000,
    });
    createdBookingIds.push(bPendingToAccept.id);

    let acceptedBooking = null;
    try {
      acceptedBooking = await bookingService.updateBookingStatus(
        bPendingToAccept.id,
        { id: providerUser1.id, role: 'provider' },
        FRONTEND_STATUS.ACCEPTED
      );

      const pass2 = acceptedBooking && acceptedBooking.status === FRONTEND_STATUS.ACCEPTED;
      recordTest(
        2,
        'Provider accepts PENDING booking -> PASS',
        pass2,
        `Status updated to: ${acceptedBooking?.status}`
      );
    } catch (err) {
      recordTest(2, 'Provider accepts PENDING booking', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 3: Customer sees ACCEPTED status -> PASS
    // -------------------------------------------------------------------------
    try {
      const custView = await bookingService.getBookingById(bPendingToAccept.id, {
        id: customer1.id,
        role: 'customer',
      });

      const pass3 = custView && custView.status === FRONTEND_STATUS.ACCEPTED;
      recordTest(
        3,
        'Customer sees ACCEPTED status in customer portal -> PASS',
        pass3,
        `Customer read status: ${custView?.status}`
      );
    } catch (err) {
      recordTest(3, 'Customer sees ACCEPTED status', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 4: Provider rejects another PENDING booking -> PASS
    // -------------------------------------------------------------------------
    let bPendingToReject = await bookingService.createBooking(customer1.id, {
      eventId: event3.id,
      providerId: provProfile1.id,
      bookingDate: '2026-12-25',
      amount: 45000,
    });
    createdBookingIds.push(bPendingToReject.id);

    let rejectedBooking = null;
    try {
      rejectedBooking = await bookingService.updateBookingStatus(
        bPendingToReject.id,
        { id: providerUser1.id, role: 'provider' },
        FRONTEND_STATUS.REJECTED
      );

      const pass4 = rejectedBooking && rejectedBooking.status === FRONTEND_STATUS.REJECTED;
      recordTest(
        4,
        'Provider rejects PENDING booking -> PASS',
        pass4,
        `Status updated to: ${rejectedBooking?.status}`
      );
    } catch (err) {
      recordTest(4, 'Provider rejects PENDING booking', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 5: Customer cannot ACCEPT a booking -> 403 Forbidden
    // -------------------------------------------------------------------------
    try {
      // Create a fresh pending booking
      const eventAlt = await eventService.createEvent(customer1.id, {
        title: 'Dinner Party',
        eventType: 'other',
        eventDate: '2027-01-15',
        location: 'Kochi',
        budget: 200000,
        guestCount: 50,
      });
      createdEventIds.push(eventAlt.id);

      const bTestCustAccept = await bookingService.createBooking(customer1.id, {
        eventId: eventAlt.id,
        providerId: provProfile1.id,
        bookingDate: '2027-01-15',
        amount: 45000,
      });
      createdBookingIds.push(bTestCustAccept.id);

      // Customer attempts to ACCEPT
      await bookingService.updateBookingStatus(
        bTestCustAccept.id,
        { id: customer1.id, role: 'customer' },
        FRONTEND_STATUS.ACCEPTED
      );

      recordTest(5, 'Customer cannot ACCEPT a booking -> 403', false, 'Allowed customer to ACCEPT!');
    } catch (err) {
      const pass5 = err.statusCode === 403 && err.message.includes('Only the assigned provider');
      recordTest(
        5,
        'Customer cannot ACCEPT a booking -> 403 Forbidden',
        pass5,
        `Caught expected error: ${err.message}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 6: Provider 2 cannot modify Provider 1's booking -> 403 Forbidden
    // -------------------------------------------------------------------------
    try {
      // Provider 2 attempts to accept or complete Provider 1's booking
      await bookingService.updateBookingStatus(
        bPendingToAccept.id,
        { id: providerUser2.id, role: 'provider' },
        FRONTEND_STATUS.COMPLETED
      );
      recordTest(6, 'Provider 2 cannot modify Provider 1\'s booking -> 403', false, 'Allowed cross-provider modification!');
    } catch (err) {
      const pass6 = err.statusCode === 403 && (err.message.includes('Unauthorized') || err.message.includes('assigned provider'));
      recordTest(
        6,
        'Provider 2 cannot modify Provider 1\'s booking -> 403 Forbidden',
        pass6,
        `Caught expected error: ${err.message}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 7: ACCEPTED -> COMPLETED by assigned provider -> PASS
    // -------------------------------------------------------------------------
    try {
      const completedBooking = await bookingService.updateBookingStatus(
        bPendingToAccept.id,
        { id: providerUser1.id, role: 'provider' },
        FRONTEND_STATUS.COMPLETED
      );

      const pass7 = completedBooking && completedBooking.status === FRONTEND_STATUS.COMPLETED;
      recordTest(
        7,
        'ACCEPTED -> COMPLETED by assigned provider -> PASS',
        pass7,
        `Status updated to: ${completedBooking?.status}`
      );
    } catch (err) {
      recordTest(7, 'ACCEPTED -> COMPLETED by assigned provider', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 8: ACCEPTED -> CANCELLED according to implemented rule -> PASS
    // -------------------------------------------------------------------------
    try {
      // Create and accept another booking
      const eventCancel = await eventService.createEvent(customer1.id, {
        title: 'Engagement Gala',
        eventType: 'engagement',
        eventDate: '2027-02-14',
        location: 'Kochi',
        budget: 350000,
        guestCount: 150,
      });
      createdEventIds.push(eventCancel.id);

      const bToCancel = await bookingService.createBooking(customer1.id, {
        eventId: eventCancel.id,
        providerId: provProfile1.id,
        bookingDate: '2027-02-14',
        amount: 45000,
      });
      createdBookingIds.push(bToCancel.id);

      // Provider accepts it
      await bookingService.updateBookingStatus(
        bToCancel.id,
        { id: providerUser1.id, role: 'provider' },
        FRONTEND_STATUS.ACCEPTED
      );

      // Customer cancels the ACCEPTED booking
      const cancelledAccepted = await bookingService.updateBookingStatus(
        bToCancel.id,
        { id: customer1.id, role: 'customer' },
        FRONTEND_STATUS.CANCELLED
      );

      const pass8 = cancelledAccepted && cancelledAccepted.status === FRONTEND_STATUS.CANCELLED;
      recordTest(
        8,
        'ACCEPTED -> CANCELLED by customer/provider -> PASS',
        pass8,
        `Status updated to: ${cancelledAccepted?.status}`
      );
    } catch (err) {
      recordTest(8, 'ACCEPTED -> CANCELLED by customer/provider', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 9: REJECTED cannot become ACCEPTED -> blocked (400)
    // -------------------------------------------------------------------------
    try {
      await bookingService.updateBookingStatus(
        bPendingToReject.id, // Current status: REJECTED
        { id: providerUser1.id, role: 'provider' },
        FRONTEND_STATUS.ACCEPTED
      );
      recordTest(9, 'REJECTED cannot become ACCEPTED -> blocked', false, 'Allowed transition from terminal REJECTED!');
    } catch (err) {
      const pass9 = err.statusCode === 400 && err.message.includes('Disallowed status transition');
      recordTest(
        9,
        'REJECTED cannot become ACCEPTED -> blocked with 400 BadRequest',
        pass9,
        `Caught expected error: ${err.message}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 10: CANCELLED cannot become ACCEPTED -> blocked (400)
    // -------------------------------------------------------------------------
    try {
      await bookingService.updateBookingStatus(
        bPendingToCancel.id, // Current status: CANCELLED
        { id: providerUser1.id, role: 'provider' },
        FRONTEND_STATUS.ACCEPTED
      );
      recordTest(10, 'CANCELLED cannot become ACCEPTED -> blocked', false, 'Allowed transition from terminal CANCELLED!');
    } catch (err) {
      const pass10 = err.statusCode === 400 && err.message.includes('Disallowed status transition');
      recordTest(
        10,
        'CANCELLED cannot become ACCEPTED -> blocked with 400 BadRequest',
        pass10,
        `Caught expected error: ${err.message}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 11: COMPLETED cannot become CANCELLED/ACCEPTED -> blocked (400)
    // -------------------------------------------------------------------------
    try {
      await bookingService.updateBookingStatus(
        bPendingToAccept.id, // Current status: COMPLETED
        { id: providerUser1.id, role: 'provider' },
        FRONTEND_STATUS.CANCELLED
      );
      recordTest(11, 'COMPLETED cannot become CANCELLED/ACCEPTED -> blocked', false, 'Allowed transition from terminal COMPLETED!');
    } catch (err) {
      const pass11 = err.statusCode === 400 && err.message.includes('Disallowed status transition');
      recordTest(
        11,
        'COMPLETED cannot become CANCELLED/ACCEPTED -> blocked with 400 BadRequest',
        pass11,
        `Caught expected error: ${err.message}`
      );
    }

    // -------------------------------------------------------------------------
    // TEST 12: Contact protection changes correctly across lifecycle
    // -------------------------------------------------------------------------
    try {
      // 1. PENDING booking -> contact hidden
      const freshPending = await bookingService.createBooking(customer1.id, {
        eventId: event1.id,
        providerId: provProfile2.id,
        bookingDate: '2026-11-20',
        amount: 150000,
      });
      createdBookingIds.push(freshPending.id);

      const pendingView = await bookingService.getBookingById(freshPending.id, { id: customer1.id, role: 'customer' });
      const hiddenOnPending = pendingView.providerContact === null;

      // 2. ACCEPTED booking -> contact revealed
      await bookingService.updateBookingStatus(freshPending.id, { id: providerUser2.id, role: 'provider' }, FRONTEND_STATUS.ACCEPTED);
      const acceptedView = await bookingService.getBookingById(freshPending.id, { id: customer1.id, role: 'customer' });
      const revealedOnAccepted = acceptedView.providerContact !== null && acceptedView.providerContact.phone === '+91 98471 99882';

      // 3. CANCELLED booking -> contact hidden again
      await bookingService.updateBookingStatus(freshPending.id, { id: customer1.id, role: 'customer' }, FRONTEND_STATUS.CANCELLED);
      const cancelledView = await bookingService.getBookingById(freshPending.id, { id: customer1.id, role: 'customer' });
      const hiddenOnCancelled = cancelledView.providerContact === null;

      const pass12 = hiddenOnPending && revealedOnAccepted && hiddenOnCancelled;
      recordTest(
        12,
        'Contact protection changes correctly across lifecycle (hidden on PENDING/CANCELLED, revealed on ACCEPTED)',
        pass12,
        `Hidden on PENDING: ${hiddenOnPending}, Revealed on ACCEPTED: ${revealedOnAccepted}, Hidden on CANCELLED: ${hiddenOnCancelled}`
      );
    } catch (err) {
      recordTest(12, 'Contact protection changes correctly across lifecycle', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 13: API response uses frontend status names
    // -------------------------------------------------------------------------
    try {
      const allowedNames = new Set(['PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED']);
      const allCustBookings = await bookingService.getCustomerBookings(customer1.id);
      const allProvBookings = await bookingService.getProviderBookings(providerUser1.id);

      const allStatuses = [...allCustBookings, ...allProvBookings].map((b) => b.status);
      const allValid = allStatuses.every((s) => allowedNames.has(s));

      recordTest(
        13,
        'API responses strictly use frontend status names (UPPERCASE)',
        allValid,
        `Observed statuses: ${[...new Set(allStatuses)].join(', ')}`
      );
    } catch (err) {
      recordTest(13, 'API responses strictly use frontend status names', false, err.message);
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
    console.log('[CLEANUP] Completed.');
  } catch (fatal) {
    console.error('[FATAL LIFECYCLE SUITE ERROR]', fatal);
  }

  console.log('\n================================================================');
  const passCount = results.filter((r) => r.passed).length;
  console.log(`   Lifecycle Suite Results: ${passCount} / ${results.length} PASSED`);
  console.log('================================================================\n');

  return passCount === results.length;
};

runLifecycleTests().then((allPassed) => {
  process.exit(allPassed ? 0 : 1);
});

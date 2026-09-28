/**
 * Phase 5 — Step 4: Contact Protection & Communication Isolation Test Suite
 *
 * Verifies all required test scenarios:
 * Test 1: Customer GET booking while PENDING -> provider contact hidden
 * Test 2: Customer GET booking while ACCEPTED -> manager/name + phone + email visible
 * Test 3: Customer GET booking while CANCELLED -> provider contact hidden
 * Test 4: Customer GET booking while COMPLETED -> provider contact visible
 * Test 5: Provider GET PENDING booking -> customer's private contact remains protected
 * Test 6: Provider GET ACCEPTED booking assigned to them -> customer name + phone + email visible
 * Test 7: Provider cannot access another provider's booking/contact information (403 & inbox isolated)
 * Test 8: Customer cannot access another customer's booking/contact information (403 & list isolated)
 * Test 9: Verify direct GET /api/bookings/:id follows the same contact protection rules
 * Test 10: Run the existing Phase 5 regression suites (test_foundation, test_lifecycle, test_step3)
 */

import { getSupabaseAdmin } from './config/supabase.js';
import * as authService from './services/auth.service.js';
import * as eventService from './services/event.service.js';
import * as providerService from './services/provider.service.js';
import * as bookingService from './services/booking.service.js';
import { FRONTEND_STATUS } from './utils/booking.dto.js';
import { execSync } from 'child_process';

const runStep4Tests = async () => {
  console.log('================================================================');
  console.log('   Eva-Ai Phase 5 — Step 4: Contact Protection Test Suite');
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

    const cust1Email = `ananya.${sfx}@gmail.com`;
    const cust1Phone = '+91 98471 99112';
    const cust1Auth = await authService.registerCustomer({
      fullName: 'Ananya Sharma',
      email: cust1Email,
      phone: cust1Phone,
      password: 'Password123!',
      location: 'Kochi',
    });
    const customer1 = cust1Auth.user;

    const cust2Auth = await authService.registerCustomer({
      fullName: 'Rohan George',
      email: `rohan.${sfx}@gmail.com`,
      phone: '+91 98471 88223',
      password: 'Password123!',
      location: 'Kochi',
    });
    const customer2 = cust2Auth.user;

    const prov1Email = `vikram.${sfx}@gmail.com`;
    const prov1Phone = '+91 94470 11998';
    const prov1Auth = await authService.registerProvider({
      name: 'Vikram Menon',
      businessName: `Grand Palette Studios ${sfx}`,
      email: prov1Email,
      phone: prov1Phone,
      password: 'Password123!',
      location: 'Kochi',
      category: 'Photographer',
      startingPrice: 60000,
      experienceYears: 10,
    });
    const providerUser1 = prov1Auth.user;

    const prov2Auth = await authService.registerProvider({
      name: 'Suresh Kumar',
      businessName: `Elite Sounds DJ ${sfx}`,
      email: `suresh.${sfx}@gmail.com`,
      phone: '+91 98471 55443',
      password: 'Password123!',
      location: 'Thrissur',
      category: 'DJ',
      startingPrice: 35000,
      experienceYears: 6,
    });
    const providerUser2 = prov2Auth.user;

    // Approve both providers
    await adminClient
      .from('provider_profiles')
      .update({ approval_status: 'approved' })
      .in('user_id', [providerUser1.id, providerUser2.id]);

    const provProfile1 = await providerService.getProviderProfileByUserId(providerUser1.id);
    const provProfile2 = await providerService.getProviderProfileByUserId(providerUser2.id);

    // Event 1 for Customer 1
    const eventDate1 = '2027-04-15';
    const event1 = await eventService.createEvent(customer1.id, {
      title: 'Ananya Sangeet Night',
      eventType: 'wedding',
      eventDate: eventDate1,
      location: 'Kochi',
      budget: 800000,
      guestCount: 250,
    });
    createdEventIds.push(event1.id);

    // Event 2 for Customer 2 (for cross-customer isolation test)
    const eventDate2 = '2027-04-20';
    const event2 = await eventService.createEvent(customer2.id, {
      title: 'Rohan Birthday Bash',
      eventType: 'birthday',
      eventDate: eventDate2,
      location: 'Kochi',
      budget: 150000,
      guestCount: 80,
    });
    createdEventIds.push(event2.id);

    console.log('[SETUP] Completed. Running tests...\n');

    // Create Booking 1 (Customer 1 books Provider 1) -> starts PENDING
    const booking1 = await bookingService.createBooking(customer1.id, {
      eventId: event1.id,
      providerId: provProfile1.id,
      bookingDate: eventDate1,
      notes: 'Sangeet photo & video coverage',
    });
    createdBookingIds.push(booking1.id);

    // -------------------------------------------------------------------------
    // TEST 1: Customer GET booking while PENDING -> provider contact hidden
    // -------------------------------------------------------------------------
    try {
      const myBookings = await bookingService.getCustomerBookings(customer1.id);
      const bPending = myBookings.find((b) => b.id === booking1.id);

      const pass1 =
        bPending &&
        bPending.status === FRONTEND_STATUS.PENDING &&
        bPending.providerContact === null &&
        bPending.isContactUnlocked === false;

      recordTest(
        1,
        'Customer GET booking while PENDING -> provider contact hidden',
        pass1,
        `Status: ${bPending?.status}, providerContact: ${bPending?.providerContact}, isContactUnlocked: ${bPending?.isContactUnlocked}`
      );
    } catch (err) {
      recordTest(1, 'Customer GET booking while PENDING', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 5: Provider GET PENDING booking -> customer's private contact remains protected
    // -------------------------------------------------------------------------
    try {
      const provBookings = await bookingService.getProviderBookings(providerUser1.id);
      const bPendingProv = provBookings.find((b) => b.id === booking1.id);

      const pass5 =
        bPendingProv &&
        bPendingProv.status === FRONTEND_STATUS.PENDING &&
        bPendingProv.customerName === 'Ananya Sharma' &&
        bPendingProv.customerPhone === null &&
        bPendingProv.customerEmail === null &&
        bPendingProv.customerContact === null &&
        bPendingProv.isContactUnlocked === false;

      recordTest(
        5,
        'Provider GET PENDING booking -> customer\'s private contact remains protected',
        pass5,
        `Status: ${bPendingProv?.status}, client: ${bPendingProv?.customerName}, phone: ${bPendingProv?.customerPhone}, email: ${bPendingProv?.customerEmail}, contact: ${bPendingProv?.customerContact}`
      );
    } catch (err) {
      recordTest(5, 'Provider GET PENDING booking', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TRANSITION: Provider 1 ACCEPTS Booking 1
    // -------------------------------------------------------------------------
    await bookingService.updateBookingStatus(
      booking1.id,
      { id: providerUser1.id, role: 'provider' },
      FRONTEND_STATUS.ACCEPTED
    );

    // -------------------------------------------------------------------------
    // TEST 2: Customer GET booking while ACCEPTED -> manager/name + phone + email visible
    // -------------------------------------------------------------------------
    try {
      const myBookings = await bookingService.getCustomerBookings(customer1.id);
      const bAccepted = myBookings.find((b) => b.id === booking1.id);

      const pass2 =
        bAccepted &&
        bAccepted.status === FRONTEND_STATUS.ACCEPTED &&
        bAccepted.isContactUnlocked === true &&
        bAccepted.providerContact !== null &&
        (bAccepted.providerContact.manager || bAccepted.providerContact.name) &&
        bAccepted.providerContact.phone === prov1Phone &&
        bAccepted.providerContact.email === prov1Email;

      recordTest(
        2,
        'Customer GET booking while ACCEPTED -> manager/name + phone + email visible',
        pass2,
        `Status: ${bAccepted?.status}, Manager: ${bAccepted?.providerContact?.manager || bAccepted?.providerContact?.name}, Phone: ${bAccepted?.providerContact?.phone}, Email: ${bAccepted?.providerContact?.email}`
      );
    } catch (err) {
      recordTest(2, 'Customer GET booking while ACCEPTED', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 6: Provider GET ACCEPTED booking assigned to them -> customer name + phone + email visible
    // -------------------------------------------------------------------------
    try {
      const provBookings = await bookingService.getProviderBookings(providerUser1.id);
      const bAcceptedProv = provBookings.find((b) => b.id === booking1.id);

      const pass6 =
        bAcceptedProv &&
        bAcceptedProv.status === FRONTEND_STATUS.ACCEPTED &&
        bAcceptedProv.isContactUnlocked === true &&
        bAcceptedProv.customerName === 'Ananya Sharma' &&
        bAcceptedProv.customerPhone === cust1Phone &&
        bAcceptedProv.customerEmail === cust1Email &&
        bAcceptedProv.customerContact !== null &&
        bAcceptedProv.customerContact.phone === cust1Phone;

      recordTest(
        6,
        'Provider GET ACCEPTED booking assigned to them -> customer name + phone + email visible',
        pass6,
        `Status: ${bAcceptedProv?.status}, Name: ${bAcceptedProv?.customerName}, Phone: ${bAcceptedProv?.customerPhone}, Email: ${bAcceptedProv?.customerEmail}`
      );
    } catch (err) {
      recordTest(6, 'Provider GET ACCEPTED booking', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 3: Customer GET booking while CANCELLED -> provider contact hidden
    // -------------------------------------------------------------------------
    try {
      // Create Event 3 and Booking 2 for Customer 1
      const eventDate3 = '2027-05-10';
      const event3 = await eventService.createEvent(customer1.id, {
        title: 'Ananya Mehendi Party',
        eventType: 'reception',
        eventDate: eventDate3,
        location: 'Kochi',
        budget: 300000,
        guestCount: 120,
      });
      createdEventIds.push(event3.id);

      const booking2 = await bookingService.createBooking(customer1.id, {
        eventId: event3.id,
        providerId: provProfile1.id,
        bookingDate: eventDate3,
      });
      createdBookingIds.push(booking2.id);

      // Customer cancels Booking 2 -> status becomes CANCELLED
      await bookingService.updateBookingStatus(
        booking2.id,
        { id: customer1.id, role: 'customer' },
        FRONTEND_STATUS.CANCELLED
      );

      const myBookings = await bookingService.getCustomerBookings(customer1.id);
      const bCancelled = myBookings.find((b) => b.id === booking2.id);

      const pass3 =
        bCancelled &&
        bCancelled.status === FRONTEND_STATUS.CANCELLED &&
        bCancelled.providerContact === null &&
        bCancelled.isContactUnlocked === false;

      recordTest(
        3,
        'Customer GET booking while CANCELLED -> provider contact hidden',
        pass3,
        `Status: ${bCancelled?.status}, providerContact: ${bCancelled?.providerContact}, isContactUnlocked: ${bCancelled?.isContactUnlocked}`
      );
    } catch (err) {
      recordTest(3, 'Customer GET booking while CANCELLED', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 4: Customer GET booking while COMPLETED -> provider contact visible
    // -------------------------------------------------------------------------
    try {
      // Provider completes Booking 1 (which was ACCEPTED)
      await bookingService.updateBookingStatus(
        booking1.id,
        { id: providerUser1.id, role: 'provider' },
        FRONTEND_STATUS.COMPLETED
      );

      const myBookings = await bookingService.getCustomerBookings(customer1.id);
      const bCompleted = myBookings.find((b) => b.id === booking1.id);

      const pass4 =
        bCompleted &&
        bCompleted.status === FRONTEND_STATUS.COMPLETED &&
        bCompleted.isContactUnlocked === true &&
        bCompleted.providerContact !== null &&
        bCompleted.providerContact.phone === prov1Phone &&
        bCompleted.providerContact.email === prov1Email;

      recordTest(
        4,
        'Customer GET booking while COMPLETED -> provider contact visible',
        pass4,
        `Status: ${bCompleted?.status}, Phone: ${bCompleted?.providerContact?.phone}, Email: ${bCompleted?.providerContact?.email}`
      );
    } catch (err) {
      recordTest(4, 'Customer GET booking while COMPLETED', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 7: Provider cannot access another provider's booking/contact information
    // -------------------------------------------------------------------------
    try {
      // Provider 2 tries to GET Booking 1 (assigned to Provider 1) via getBookingById
      let directAccessBlocked = false;
      try {
        await bookingService.getBookingById(booking1.id, { id: providerUser2.id, role: 'provider' });
      } catch (err) {
        directAccessBlocked = err.statusCode === 403;
      }

      // Provider 2 queries their inbox -> Booking 1 must NOT appear
      const prov2Inbox = await bookingService.getProviderBookings(providerUser2.id);
      const leakedInInbox = prov2Inbox.some((b) => b.id === booking1.id);

      const pass7 = directAccessBlocked && !leakedInInbox;
      recordTest(
        7,
        'Provider cannot access another provider\'s booking/contact information',
        pass7,
        `Direct access blocked (403): ${directAccessBlocked}, Leaked in inbox: ${leakedInInbox}`
      );
    } catch (err) {
      recordTest(7, 'Provider cannot access another provider\'s booking', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 8: Customer cannot access another customer's booking/contact information
    // -------------------------------------------------------------------------
    try {
      // Customer 2 tries to GET Booking 1 (owned by Customer 1) via getBookingById
      let directAccessBlocked = false;
      try {
        await bookingService.getBookingById(booking1.id, { id: customer2.id, role: 'customer' });
      } catch (err) {
        directAccessBlocked = err.statusCode === 403;
      }

      // Customer 2 queries my-bookings -> Booking 1 must NOT appear
      const cust2List = await bookingService.getCustomerBookings(customer2.id);
      const leakedInList = cust2List.some((b) => b.id === booking1.id);

      const pass8 = directAccessBlocked && !leakedInList;
      recordTest(
        8,
        'Customer cannot access another customer\'s booking/contact information',
        pass8,
        `Direct access blocked (403): ${directAccessBlocked}, Leaked in list: ${leakedInList}`
      );
    } catch (err) {
      recordTest(8, 'Customer cannot access another customer\'s booking', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 9: Verify direct GET /api/bookings/:id follows the same contact protection rules
    // -------------------------------------------------------------------------
    try {
      // 1. Customer 1 directly fetches Booking 1 (COMPLETED) -> provider contact visible
      const custDetail = await bookingService.getBookingById(booking1.id, {
        id: customer1.id,
        role: 'customer',
      });
      const custHasContact =
        custDetail.providerContact !== null && custDetail.providerContact.phone === prov1Phone;

      // 2. Provider 1 directly fetches Booking 1 (COMPLETED) -> customer contact visible
      const provDetail = await bookingService.getBookingById(booking1.id, {
        id: providerUser1.id,
        role: 'provider',
      });
      const provHasContact =
        provDetail.customerPhone === cust1Phone &&
        provDetail.customerEmail === cust1Email &&
        provDetail.customerContact !== null;

      // 3. Create a fresh PENDING booking and verify direct getBookingById hides contact for both
      const eventDate4 = '2027-06-15';
      const event4 = await eventService.createEvent(customer1.id, {
        title: 'Fresh Test Event',
        eventType: 'reception',
        eventDate: eventDate4,
        location: 'Kochi',
        budget: 200000,
        guestCount: 100,
      });
      createdEventIds.push(event4.id);

      const bFresh = await bookingService.createBooking(customer1.id, {
        eventId: event4.id,
        providerId: provProfile1.id,
        bookingDate: eventDate4,
      });
      createdBookingIds.push(bFresh.id);

      const custPendingDetail = await bookingService.getBookingById(bFresh.id, {
        id: customer1.id,
        role: 'customer',
      });
      const provPendingDetail = await bookingService.getBookingById(bFresh.id, {
        id: providerUser1.id,
        role: 'provider',
      });

      const custPendingProtected =
        custPendingDetail.providerContact === null && custPendingDetail.isContactUnlocked === false;
      const provPendingProtected =
        provPendingDetail.customerPhone === null &&
        provPendingDetail.customerEmail === null &&
        provPendingDetail.customerContact === null &&
        provPendingDetail.isContactUnlocked === false;

      const pass9 =
        custHasContact &&
        provHasContact &&
        custPendingProtected &&
        provPendingProtected;

      recordTest(
        9,
        'Verify direct GET /api/bookings/:id follows the same contact protection rules',
        pass9,
        `Completed view (Cust: ${custHasContact}, Prov: ${provHasContact}) | Pending view (Cust protected: ${custPendingProtected}, Prov protected: ${provPendingProtected})`
      );
    } catch (err) {
      recordTest(9, 'Direct GET /api/bookings/:id contact protection rules', false, err.message);
    }

    // -------------------------------------------------------------------------
    // TEST 10: Run the existing Phase 5 regression suites
    // -------------------------------------------------------------------------
    try {
      console.log('\n[REGRESSION] Running test_foundation.js, test_lifecycle.js, test_step3.js...');

      const fOut = execSync('node src/test_foundation.js', { encoding: 'utf8' });
      const fPass = fOut.includes('Foundation Suite Results: 9 / 9 PASSED');

      const lOut = execSync('node src/test_lifecycle.js', { encoding: 'utf8' });
      const lPass = lOut.includes('Lifecycle Suite Results: 13 / 13 PASSED');

      const s3Out = execSync('node src/test_step3.js', { encoding: 'utf8' });
      const s3Pass = s3Out.includes('Step 3 Hardening Suite Results: 10 / 10 PASSED');

      const pass10 = fPass && lPass && s3Pass;
      recordTest(
        10,
        'Run existing Phase 5 regression suites (foundation 9/9, lifecycle 13/13, step3 10/10)',
        pass10,
        `Foundation: ${fPass ? '9/9 PASS' : 'FAIL'}, Lifecycle: ${lPass ? '13/13 PASS' : 'FAIL'}, Step 3: ${s3Pass ? '10/10 PASS' : 'FAIL'}`
      );
    } catch (err) {
      recordTest(10, 'Existing Phase 5 regression suites', false, err.message);
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
    console.error('[FATAL STEP 4 ERROR]', fatal);
  }

  console.log('\n================================================================');
  const passCount = results.filter((r) => r.passed).length;
  console.log(`   Step 4 Contact Protection Results: ${passCount} / ${results.length} PASSED`);
  console.log('================================================================\n');

  return passCount === results.length;
};

runStep4Tests().then((allPassed) => {
  process.exit(allPassed ? 0 : 1);
});

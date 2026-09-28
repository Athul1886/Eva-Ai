/**
 * Phase 5 Booking System Verification Suite
 *
 * Validates all 12 acceptance criteria defined in Phase 5:
 * 1. Customer creates booking
 * 2. Duplicate booking is rejected
 * 3. Unavailable provider/date is rejected
 * 4. Provider receives the booking
 * 5. Provider accepts booking
 * 6. Customer sees ACCEPTED
 * 7. Customer receives provider contact only after ACCEPTED
 * 8. Provider can reject a PENDING booking
 * 9. Invalid status transitions are rejected
 * 10. Customer cannot modify another customer's booking
 * 11. Provider cannot modify another provider's booking
 * 12. Unauthorized requests are rejected
 */

import { getSupabaseAdmin } from './config/supabase.js';
import * as authService from './services/auth.service.js';
import * as eventService from './services/event.service.js';
import * as providerService from './services/provider.service.js';
import * as bookingService from './services/booking.service.js';
import * as availabilityService from './services/availability.service.js';
import { FRONTEND_STATUS } from './utils/booking.dto.js';

const runTests = async () => {
  console.log('========================================================');
  console.log('   Eva-Ai Phase 5: Booking System Test Suite');
  console.log('========================================================\n');

  const adminClient = getSupabaseAdmin();
  const timestamp = Date.now();

  const results = [];
  const recordTest = (num, name, passed, details = '') => {
    results.push({ num, name, passed, details });
    const mark = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`[${mark}] Test ${num}: ${name}`);
    if (details) console.log(`       Details: ${details}`);
  };

  try {
    // -------------------------------------------------------------
    // SETUP: Create Customers, Providers, and Events
    // -------------------------------------------------------------
    console.log('[SETUP] Initializing test entities in Supabase...');

    // Customer 1
    const sfx = Date.now().toString(36);
    const cust1Email = `eva.cust1.${sfx}@gmail.com`;
    const cust1Reg = await authService.registerCustomer({
      fullName: 'Ananya Nair',
      email: cust1Email,
      phone: '+91 98470 11223',
      password: 'Password123!',
      location: 'Kochi',
    });
    const customer1 = cust1Reg.user;

    // Customer 2 (for authorization isolation testing)
    const cust2Email = `eva.cust2.${sfx}@gmail.com`;
    const cust2Reg = await authService.registerCustomer({
      fullName: 'Rahul Sharma',
      email: cust2Email,
      phone: '+91 98470 55667',
      password: 'Password123!',
      location: 'Kochi',
    });
    const customer2 = cust2Reg.user;

    // Provider 1
    const prov1Email = `eva.prov1.${sfx}@gmail.com`;
    const prov1Reg = await authService.registerProvider({
      name: 'Rohit Menon',
      businessName: `LensCraft Studio ${sfx}`,
      email: prov1Email,
      phone: '+91 94470 12345',
      password: 'Password123!',
      location: 'Palakkad',
      category: 'Photographer',
      startingPrice: 45000,
      experienceYears: 8,
    });
    const providerUser1 = prov1Reg.user;

    // Provider 2 (for provider isolation testing)
    const prov2Email = `eva.prov2.${sfx}@gmail.com`;
    const prov2Reg = await authService.registerProvider({
      name: 'Sunil Varma',
      businessName: `Grand Regal ${sfx}`,
      email: prov2Email,
      phone: '+91 98471 99882',
      password: 'Password123!',
      location: 'Thrissur',
      category: 'Venue',
      startingPrice: 150000,
      experienceYears: 12,
    });
    const providerUser2 = prov2Reg.user;

    // Auto-approve both providers for test eligibility
    await adminClient
      .from('provider_profiles')
      .update({ approval_status: 'approved' })
      .in('user_id', [providerUser1.id, providerUser2.id]);

    const provProfile1 = await providerService.getProviderProfileByUserId(providerUser1.id);
    const provProfile2 = await providerService.getProviderProfileByUserId(providerUser2.id);

    // Create Event for Customer 1
    const eventDate = '2026-11-20';
    const event1 = await eventService.createEvent(customer1.id, {
      title: 'Grand Royal Wedding',
      eventType: 'wedding',
      eventDate,
      location: 'Kochi',
      budget: 1500000,
      guestCount: 600,
    });

    console.log('[SETUP] Completed. Entities ready for execution.\n');

    // -------------------------------------------------------------
    // TEST 1: Customer creates booking
    // -------------------------------------------------------------
    let booking1 = null;
    try {
      booking1 = await bookingService.createBooking(customer1.id, {
        eventId: event1.id,
        providerId: provProfile1.id,
        bookingDate: eventDate,
        amount: 45000,
        notes: 'Full day candid wedding cinematography',
      });

      const pass1 =
        booking1 &&
        booking1.status === FRONTEND_STATUS.PENDING &&
        booking1.bookingReference.startsWith('EVA-BOOK-') &&
        booking1.providerId === provProfile1.id;

      recordTest(1, 'Customer creates booking with PENDING status & EVA-BOOK reference', pass1, `Ref: ${booking1.bookingReference}, Status: ${booking1.status}`);
    } catch (err) {
      recordTest(1, 'Customer creates booking with PENDING status & EVA-BOOK reference', false, err.message);
    }

    // -------------------------------------------------------------
    // TEST 2: Duplicate booking is rejected
    // -------------------------------------------------------------
    try {
      await bookingService.createBooking(customer1.id, {
        eventId: event1.id,
        providerId: provProfile1.id,
        bookingDate: eventDate,
        amount: 45000,
      });
      recordTest(2, 'Duplicate active booking is rejected', false, 'Expected 409 Conflict, but succeeded');
    } catch (err) {
      const pass2 = err.statusCode === 409 || err.message.includes('already exists');
      recordTest(2, 'Duplicate active booking is rejected', pass2, `Caught expected error: ${err.message}`);
    }

    // -------------------------------------------------------------
    // TEST 3: Unavailable provider/date is rejected
    // -------------------------------------------------------------
    try {
      // Mark provider 2 unavailable on eventDate
      await adminClient.from('provider_availability').insert({
        provider_id: provProfile2.id,
        date: eventDate,
        is_available: false,
        reason: 'Booked externally',
      });

      await bookingService.createBooking(customer1.id, {
        eventId: event1.id,
        providerId: provProfile2.id,
        bookingDate: eventDate,
        amount: 150000,
      });
      recordTest(3, 'Unavailable provider/date is rejected', false, 'Expected 409 Conflict, but succeeded');
    } catch (err) {
      const pass3 = err.statusCode === 409 || err.message.toLowerCase().includes('not available');
      recordTest(3, 'Unavailable provider/date is rejected', pass3, `Caught expected error: ${err.message}`);
    }

    // -------------------------------------------------------------
    // TEST 4: Provider receives the booking
    // -------------------------------------------------------------
    try {
      const providerBookings = await bookingService.getProviderBookings(providerUser1.id);
      const found = providerBookings.find((b) => b.id === booking1.id);
      const pass4 = found && found.customerName === 'Ananya Nair' && found.status === FRONTEND_STATUS.PENDING;
      recordTest(4, 'Provider receives the booking in their inbox', pass4, `Found booking with client: ${found?.customerName}`);
    } catch (err) {
      recordTest(4, 'Provider receives the booking in their inbox', false, err.message);
    }

    // -------------------------------------------------------------
    // TEST 5: Provider accepts booking
    // -------------------------------------------------------------
    let acceptedBooking = null;
    try {
      acceptedBooking = await bookingService.updateBookingStatus(
        booking1.id,
        { id: providerUser1.id, role: 'provider' },
        FRONTEND_STATUS.ACCEPTED
      );
      const pass5 = acceptedBooking && acceptedBooking.status === FRONTEND_STATUS.ACCEPTED;
      recordTest(5, 'Provider accepts booking (PENDING -> ACCEPTED)', pass5, `New status: ${acceptedBooking?.status}`);
    } catch (err) {
      recordTest(5, 'Provider accepts booking (PENDING -> ACCEPTED)', false, err.message);
    }

    // -------------------------------------------------------------
    // TEST 6: Customer sees ACCEPTED
    // -------------------------------------------------------------
    try {
      const custBookings = await bookingService.getCustomerBookings(customer1.id);
      const target = custBookings.find((b) => b.id === booking1.id);
      const pass6 = target && target.status === FRONTEND_STATUS.ACCEPTED;
      recordTest(6, 'Customer sees ACCEPTED status in customer portal', pass6, `Customer view status: ${target?.status}`);
    } catch (err) {
      recordTest(6, 'Customer sees ACCEPTED status in customer portal', false, err.message);
    }

    // -------------------------------------------------------------
    // TEST 7: Customer receives provider contact only after ACCEPTED
    // -------------------------------------------------------------
    try {
      const custBookings = await bookingService.getCustomerBookings(customer1.id);
      const target = custBookings.find((b) => b.id === booking1.id);
      const hasContact = target && target.providerContact && target.providerContact.phone === '+91 94470 12345';

      recordTest(7, 'Customer receives provider direct contact only after ACCEPTED', Boolean(hasContact), `Contact: ${JSON.stringify(target?.providerContact)}`);
    } catch (err) {
      recordTest(7, 'Customer receives provider direct contact only after ACCEPTED', false, err.message);
    }

    // -------------------------------------------------------------
    // TEST 8: Provider can reject a PENDING booking
    // -------------------------------------------------------------
    let bookingToReject = null;
    try {
      // Create a new event and booking for Provider 1 on another date
      const altDate = '2026-12-15';
      const eventAlt = await eventService.createEvent(customer1.id, {
        title: 'Engagement Party',
        eventType: 'engagement',
        eventDate: altDate,
        location: 'Palakkad',
        budget: 300000,
        guestCount: 150,
      });

      bookingToReject = await bookingService.createBooking(customer1.id, {
        eventId: eventAlt.id,
        providerId: provProfile1.id,
        bookingDate: altDate,
        amount: 35000,
      });

      // Verify contact was hidden when PENDING
      const pendingCheck = await bookingService.getBookingById(bookingToReject.id, { id: customer1.id, role: 'customer' });
      const contactHiddenWhenPending = pendingCheck.providerContact === null;

      // Provider rejects
      const rejected = await bookingService.updateBookingStatus(
        bookingToReject.id,
        { id: providerUser1.id, role: 'provider' },
        FRONTEND_STATUS.REJECTED
      );

      const pass8 = rejected && rejected.status === FRONTEND_STATUS.REJECTED && contactHiddenWhenPending;
      recordTest(8, 'Provider can reject a PENDING booking (contact protected while PENDING)', pass8, `Status: ${rejected?.status}, Contact hidden while pending: ${contactHiddenWhenPending}`);
    } catch (err) {
      recordTest(8, 'Provider can reject a PENDING booking', false, err.message);
    }

    // -------------------------------------------------------------
    // TEST 9: Invalid status transitions are rejected
    // -------------------------------------------------------------
    try {
      // Terminal state REJECTED cannot transition to ACCEPTED
      await bookingService.updateBookingStatus(
        bookingToReject.id,
        { id: providerUser1.id, role: 'provider' },
        FRONTEND_STATUS.ACCEPTED
      );
      recordTest(9, 'Invalid status transitions are rejected (REJECTED -> ACCEPTED blocked)', false, 'Expected transition failure, but succeeded');
    } catch (err) {
      const pass9 = err.statusCode === 400 || err.message.includes('Disallowed status transition');
      recordTest(9, 'Invalid status transitions are rejected (REJECTED -> ACCEPTED blocked)', pass9, `Caught error: ${err.message}`);
    }

    // -------------------------------------------------------------
    // TEST 10: Customer cannot modify another customer's booking
    // -------------------------------------------------------------
    try {
      // Customer 2 attempts to cancel Customer 1's booking
      await bookingService.updateBookingStatus(
        booking1.id,
        { id: customer2.id, role: 'customer' },
        FRONTEND_STATUS.CANCELLED
      );
      recordTest(10, 'Customer cannot modify another customer\'s booking', false, 'Expected 403 Forbidden, but succeeded');
    } catch (err) {
      const pass10 = err.statusCode === 403 || err.message.includes('Unauthorized');
      recordTest(10, 'Customer cannot modify another customer\'s booking', pass10, `Caught expected error: ${err.message}`);
    }

    // -------------------------------------------------------------
    // TEST 11: Provider cannot modify another provider's booking
    // -------------------------------------------------------------
    try {
      // Provider 2 attempts to complete or accept Provider 1's booking
      await bookingService.updateBookingStatus(
        booking1.id,
        { id: providerUser2.id, role: 'provider' },
        FRONTEND_STATUS.COMPLETED
      );
      recordTest(11, 'Provider cannot modify another provider\'s booking', false, 'Expected 403 Forbidden, but succeeded');
    } catch (err) {
      const pass11 = err.statusCode === 403 || err.message.includes('Unauthorized');
      recordTest(11, 'Provider cannot modify another provider\'s booking', pass11, `Caught expected error: ${err.message}`);
    }

    // -------------------------------------------------------------
    // TEST 12: Unauthorized requests are rejected
    // -------------------------------------------------------------
    try {
      // An unrelated third user attempts to view booking1 details
      const stranger = { id: '00000000-0000-0000-0000-000000000999', role: 'customer' };
      await bookingService.getBookingById(booking1.id, stranger);
      recordTest(12, 'Unauthorized requests are rejected with 403', false, 'Expected 403 Forbidden, but succeeded');
    } catch (err) {
      const pass12 = err.statusCode === 403 || err.message.includes('permission');
      recordTest(12, 'Unauthorized requests are rejected with 403', pass12, `Caught expected error: ${err.message}`);
    }

    // -------------------------------------------------------------
    // CLEANUP TEST DATA
    // -------------------------------------------------------------
    console.log('\n[CLEANUP] Removing test bookings and events...');
    if (booking1?.id) await adminClient.from('bookings').delete().eq('id', booking1.id);
    if (bookingToReject?.id) await adminClient.from('bookings').delete().eq('id', bookingToReject.id);
    if (event1?.id) await adminClient.from('events').delete().eq('id', event1.id);
    console.log('[CLEANUP] Completed.');

  } catch (fatalErr) {
    console.error('[FATAL SUITE ERROR]', fatalErr);
  }

  console.log('\n========================================================');
  const passCount = results.filter((r) => r.passed).length;
  console.log(`   Phase 5 Test Suite Summary: ${passCount} / ${results.length} PASSED`);
  console.log('========================================================\n');
  return passCount === results.length;
};

runTests().then((allPassed) => {
  process.exit(allPassed ? 0 : 1);
});

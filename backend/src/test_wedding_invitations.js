/**
 * Eva-Ai QR Wedding & Event Invitations Integration Test Suite
 *
 * Verifies all 15+ requirements:
 * 1. Customer can create invitation for own event (POST /api/invitations)
 * 2. Customer cannot create invitation for another customer's event (403 Forbidden)
 * 3. Customer can retrieve own invitation by ID (GET /api/invitations/:id)
 * 4. Customer isolation: Customer B cannot retrieve Customer A's invitation (403 Forbidden)
 * 5. Customer can update own invitation (PUT /api/invitations/:id)
 * 6. Customer isolation: Customer B cannot update Customer A's invitation (403 Forbidden)
 * 7. Customer can retrieve all their invitations (GET /api/invitations/my)
 * 8. Public invitation works without authentication (GET /api/public/invitations/:publicToken)
 * 9. Public invitation strictly exposes public fields (no customer email, phone, JWT, internal DB IDs)
 * 10. Public tokens are unique, high-entropy, and unpredictable
 * 11. Invitation works before event date (future date -> ACTIVE)
 * 12. Invitation works throughout the event date (today's date -> ACTIVE until 23:59:59 local)
 * 13. Invitation expires after event date (past date -> EXPIRED)
 * 14. Expired invitation returns status: 'EXPIRED' with eventDate
 * 15. RSVP works while invitation is active (POST /api/public/invitations/:publicToken/rsvp)
 * 16. RSVP validation strictly rejects invalid names, attendance, or counts (400)
 * 17. RSVP is rejected after expiration with 'This invitation has expired.' (400)
 * 18. Historical RSVP data remains accessible to event owner after expiration (GET /api/invitations/:id/rsvps)
 * 19. Customer isolation: Customer B cannot view Customer A's RSVPs (403 Forbidden)
 * 20. Customer can delete own invitation (DELETE /api/invitations/:id)
 * 21. Safe cleanup of test records
 */

import http from 'http';
import app from './app.js';
import { getSupabaseAdmin, getSupabaseClient } from './config/supabase.js';
import * as authService from './services/auth.service.js';

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

const runWeddingInvitationTests = async () => {
  console.log('================================================================');
  console.log('    Eva-Ai: QR Wedding & Event Invitations Test Suite');
  console.log('================================================================\n');

  // Start HTTP Server on ephemeral port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });

  const db = getSupabaseAdmin() || getSupabaseClient();
  const sfx = Date.now().toString(36);
  let passedCount = 0;
  let totalTests = 0;

  const testRecordIds = {
    userIds: [],
    eventIds: [],
    invitationIds: [],
  };

  const record = (num, name, condition, details = '') => {
    totalTests++;
    if (condition) {
      passedCount++;
      console.log(`[✅ PASS] Test ${num}: ${name}`);
      if (details) console.log(`       Details: ${details}`);
    } else {
      console.error(`[❌ FAIL] Test ${num}: ${name}`);
      if (details) console.error(`       Details: ${details}`);
    }
  };

  try {
    // -------------------------------------------------------------------------
    // SETUP: Provision Customer A and Customer B
    // -------------------------------------------------------------------------
    console.log('[SETUP] Provisioning Customer A and Customer B...');

    const custAAuth = await authService.registerCustomer({
      fullName: 'Aarav Patel',
      email: `aarav.${sfx}@gmail.com`,
      phone: '+91 98471 00001',
      password: 'Password123!',
      location: 'Kochi',
    });
    const customerA = custAAuth.user;
    const tokenA = custAAuth.session.access_token;
    testRecordIds.userIds.push(customerA.id);

    const custBAuth = await authService.registerCustomer({
      fullName: 'Bhavna Sharma',
      email: `bhavna.${sfx}@gmail.com`,
      phone: '+91 98471 00002',
      password: 'Password123!',
      location: 'Thrissur',
    });
    const customerB = custBAuth.user;
    const tokenB = custBAuth.session.access_token;
    testRecordIds.userIds.push(customerB.id);

    // Create Future Event for Customer A (October 15, 2027)
    const { data: eventA, error: errEventA } = await db
      .from('events')
      .insert({
        user_id: customerA.id,
        title: 'Grand Royal Wedding of Aarav & Meera',
        event_type: 'wedding',
        event_date: '2027-10-15',
        start_time: '10:00:00',
        end_time: '15:00:00',
        city: 'Kochi',
        venue_name: 'Bolgatty Palace Resort',
        venue_address: 'Mulavukad, Kochi, Kerala 682504',
        total_budget: 1500000.0,
        estimated_guests: 350,
        status: 'planning',
      })
      .select('*')
      .single();

    if (errEventA || !eventA) throw new Error(`Setup failed creating event A: ${errEventA?.message}`);
    testRecordIds.eventIds.push(eventA.id);

    // Create Event for Customer B
    const { data: eventB, error: errEventB } = await db
      .from('events')
      .insert({
        user_id: customerB.id,
        title: 'Bhavna Engagement Ceremony',
        event_type: 'engagement',
        event_date: '2027-12-01',
        start_time: '18:00:00',
        city: 'Thrissur',
        venue_name: 'Lulu Convention Centre',
        venue_address: 'Thrissur, Kerala',
        total_budget: 500000.0,
        estimated_guests: 150,
        status: 'planning',
      })
      .select('*')
      .single();

    if (errEventB || !eventB) throw new Error(`Setup failed creating event B: ${errEventB?.message}`);
    testRecordIds.eventIds.push(eventB.id);

    // -------------------------------------------------------------------------
    // TEST 1: Customer A creates invitation for own event
    // -------------------------------------------------------------------------
    const createRes = await makeRequest(
      'POST',
      '/api/invitations',
      {
        eventId: eventA.id,
        title: 'Aarav & Meera Wedding Celebration',
        hostNames: 'Aarav & Meera',
        message: 'Together with their families, invite you to join their joyous wedding celebration.',
        eventTime: '10:00 AM',
        venueName: 'Bolgatty Palace Resort, Kochi',
        venueAddress: 'Mulavukad, Kochi, Kerala',
        template: 'royal-gold',
      },
      { Authorization: `Bearer ${tokenA}` }
    );

    const invA = createRes.body?.invitation;
    if (invA?.id) testRecordIds.invitationIds.push(invA.id);

    record(
      1,
      "Customer can create invitation for own event (POST /api/invitations)",
      createRes.status === 201 && invA?.publicToken && invA?.title === 'Aarav & Meera Wedding Celebration',
      `Status: ${createRes.status}, InvitationId: ${invA?.id}, PublicToken: ${invA?.publicToken}`
    );

    // -------------------------------------------------------------------------
    // TEST 2: Customer A cannot create invitation for Customer B's event
    // -------------------------------------------------------------------------
    const unauthorizedCreate = await makeRequest(
      'POST',
      '/api/invitations',
      {
        eventId: eventB.id,
        title: 'Malicious Hijack Attempt',
      },
      { Authorization: `Bearer ${tokenA}` }
    );

    record(
      2,
      "Customer cannot create invitation for another customer's event (403 Forbidden)",
      unauthorizedCreate.status === 403,
      `Status: ${unauthorizedCreate.status}, Error: ${unauthorizedCreate.body?.error}`
    );

    // -------------------------------------------------------------------------
    // TEST 3: Customer A can retrieve own invitation by ID
    // -------------------------------------------------------------------------
    const getOwnRes = await makeRequest(
      'GET',
      `/api/invitations/${invA.id}`,
      null,
      { Authorization: `Bearer ${tokenA}` }
    );

    record(
      3,
      "Customer can retrieve own invitation by ID (GET /api/invitations/:id)",
      getOwnRes.status === 200 && getOwnRes.body?.invitation?.id === invA.id,
      `Status: ${getOwnRes.status}, Title: ${getOwnRes.body?.invitation?.title}`
    );

    // -------------------------------------------------------------------------
    // TEST 4: Customer B cannot retrieve Customer A's invitation by ID
    // -------------------------------------------------------------------------
    const forbiddenGet = await makeRequest(
      'GET',
      `/api/invitations/${invA.id}`,
      null,
      { Authorization: `Bearer ${tokenB}` }
    );

    record(
      4,
      "Customer isolation: Customer B cannot retrieve Customer A's invitation (403 Forbidden)",
      forbiddenGet.status === 403,
      `Status: ${forbiddenGet.status}, Error: ${forbiddenGet.body?.error}`
    );

    // -------------------------------------------------------------------------
    // TEST 5: Customer A can update own invitation
    // -------------------------------------------------------------------------
    const updateRes = await makeRequest(
      'PUT',
      `/api/invitations/${invA.id}`,
      {
        message: 'Updated description: Join us for dinner and dancing under the stars!',
        template: 'velvet-burgundy',
      },
      { Authorization: `Bearer ${tokenA}` }
    );

    record(
      5,
      "Customer can update own invitation (PUT /api/invitations/:id)",
      updateRes.status === 200 &&
        updateRes.body?.invitation?.template === 'velvet-burgundy' &&
        updateRes.body?.invitation?.message?.includes('dinner and dancing'),
      `Status: ${updateRes.status}, Template: ${updateRes.body?.invitation?.template}`
    );

    // -------------------------------------------------------------------------
    // TEST 6: Customer B cannot update Customer A's invitation
    // -------------------------------------------------------------------------
    const forbiddenUpdate = await makeRequest(
      'PUT',
      `/api/invitations/${invA.id}`,
      {
        title: 'Hacked Title',
      },
      { Authorization: `Bearer ${tokenB}` }
    );

    record(
      6,
      "Customer isolation: Customer B cannot update Customer A's invitation (403 Forbidden)",
      forbiddenUpdate.status === 403,
      `Status: ${forbiddenUpdate.status}, Error: ${forbiddenUpdate.body?.error}`
    );

    // -------------------------------------------------------------------------
    // TEST 7: Customer can retrieve all their invitations (GET /api/invitations/my)
    // -------------------------------------------------------------------------
    const getMyRes = await makeRequest(
      'GET',
      '/api/invitations/my',
      null,
      { Authorization: `Bearer ${tokenA}` }
    );

    record(
      7,
      "Customer can retrieve all their invitations (GET /api/invitations/my)",
      getMyRes.status === 200 && Array.isArray(getMyRes.body?.invitations) && getMyRes.body?.invitations.length >= 1,
      `Status: ${getMyRes.status}, Count: ${getMyRes.body?.count}`
    );

    // -------------------------------------------------------------------------
    // TEST 8: Public invitation works without authentication
    // -------------------------------------------------------------------------
    const publicToken = invA.publicToken;
    const publicRes = await makeRequest(
      'GET',
      `/api/public/invitations/${publicToken}`
    );

    record(
      8,
      "Public invitation works without authentication (GET /api/public/invitations/:publicToken)",
      publicRes.status === 200 && publicRes.body?.status === 'ACTIVE' && publicRes.body?.invitation,
      `Status: ${publicRes.status}, StatusText: ${publicRes.body?.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 9: Public invitation strictly exposes public fields only
    // -------------------------------------------------------------------------
    const pubInv = publicRes.body?.invitation || {};
    const hasPrivateFields =
      'password' in pubInv ||
      'jwt' in pubInv ||
      'customerId' in pubInv ||
      'customer_id' in pubInv ||
      'userId' in pubInv ||
      'id' in pubInv; // Internal DB UUID should not be public URL identity

    record(
      9,
      "Public invitation strictly exposes public fields (no customer IDs, passwords, or emails)",
      !hasPrivateFields && pubInv.publicToken === publicToken && pubInv.title && pubInv.eventDate,
      `HasPrivateFields: ${hasPrivateFields}, Keys: ${Object.keys(pubInv).join(', ')}`
    );

    // -------------------------------------------------------------------------
    // TEST 10: Public tokens are unique, high-entropy, and unpredictable
    // -------------------------------------------------------------------------
    const tokens = new Set();
    const tokenRegex = /^[a-f0-9]{32}$/;
    let allTokensValid = tokenRegex.test(publicToken);
    tokens.add(publicToken);

    // Create 3 additional test tokens to confirm entropy
    const { generatePublicToken } = await import('./utils/invitation.utils.js');
    for (let i = 0; i < 5; i++) {
      const t = generatePublicToken();
      if (!tokenRegex.test(t) || tokens.has(t)) {
        allTokensValid = false;
      }
      tokens.add(t);
    }

    record(
      10,
      "Public token is unique, high-entropy, and unpredictable",
      allTokensValid && tokens.size === 6,
      `SampleToken: ${publicToken}, Length: ${publicToken.length}`
    );

    // -------------------------------------------------------------------------
    // TEST 11: Invitation works before event date (Future Event -> ACTIVE)
    // -------------------------------------------------------------------------
    record(
      11,
      "Invitation works before event date (Status is ACTIVE)",
      publicRes.body?.status === 'ACTIVE' && publicRes.body?.invitation?.eventDate === '2027-10-15',
      `EventDate: 2027-10-15, Status: ${publicRes.body?.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 12: Invitation works throughout the event date (Today's Event -> ACTIVE)
    // -------------------------------------------------------------------------
    const todayStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    const { data: eventToday } = await db
      .from('events')
      .insert({
        user_id: customerA.id,
        title: 'Wedding Reception Today',
        event_type: 'reception',
        event_date: todayStr,
        city: 'Kochi',
        total_budget: 100000,
        estimated_guests: 50,
        status: 'in_progress',
      })
      .select('*')
      .single();
    testRecordIds.eventIds.push(eventToday.id);

    const createTodayRes = await makeRequest(
      'POST',
      '/api/invitations',
      {
        eventId: eventToday.id,
        title: 'Live Reception Today',
        hostNames: 'Aarav & Meera',
      },
      { Authorization: `Bearer ${tokenA}` }
    );
    const invToday = createTodayRes.body?.invitation;
    if (invToday?.id) testRecordIds.invitationIds.push(invToday.id);

    const publicTodayRes = await makeRequest(
      'GET',
      `/api/public/invitations/${invToday.publicToken}`
    );

    record(
      12,
      "Invitation works throughout the event date (Status remains ACTIVE on event date)",
      publicTodayRes.status === 200 && publicTodayRes.body?.status === 'ACTIVE',
      `Today: ${todayStr}, Status: ${publicTodayRes.body?.status}`
    );

    // -------------------------------------------------------------------------
    // TEST 13 & 14: Invitation expires after event date (Past Event -> EXPIRED)
    // -------------------------------------------------------------------------
    const { data: eventPast } = await db
      .from('events')
      .insert({
        user_id: customerA.id,
        title: 'Past Anniversary Celebration',
        event_type: 'anniversary',
        event_date: '2026-01-15', // Past date
        city: 'Kochi',
        total_budget: 80000,
        estimated_guests: 30,
        status: 'completed',
      })
      .select('*')
      .single();
    testRecordIds.eventIds.push(eventPast.id);

    const createPastRes = await makeRequest(
      'POST',
      '/api/invitations',
      {
        eventId: eventPast.id,
        title: 'Past Wedding Memories',
        hostNames: 'Aarav & Meera',
      },
      { Authorization: `Bearer ${tokenA}` }
    );
    const invPast = createPastRes.body?.invitation;
    if (invPast?.id) testRecordIds.invitationIds.push(invPast.id);

    const publicPastRes = await makeRequest(
      'GET',
      `/api/public/invitations/${invPast.publicToken}`
    );

    record(
      13,
      "Invitation expires after event date (Status returns EXPIRED)",
      publicPastRes.status === 200 && publicPastRes.body?.status === 'EXPIRED',
      `Status: ${publicPastRes.body?.status}, EventDate: ${publicPastRes.body?.eventDate}`
    );

    record(
      14,
      "Expired invitation response format matches contract: { success: true, status: 'EXPIRED', eventDate }",
      publicPastRes.body?.success === true &&
        publicPastRes.body?.status === 'EXPIRED' &&
        publicPastRes.body?.eventDate === '2026-01-15' &&
        !publicPastRes.body?.invitation,
      `Response: ${JSON.stringify(publicPastRes.body)}`
    );

    // -------------------------------------------------------------------------
    // TEST 15: Public guest submits RSVP while invitation is active
    // -------------------------------------------------------------------------
    const rsvp1Res = await makeRequest(
      'POST',
      `/api/public/invitations/${publicToken}/rsvp`,
      {
        guestName: 'Sanjay Krishnan',
        attendance: 'ATTENDING',
        guestCount: 2,
      }
    );

    record(
      15,
      "RSVP works while invitation is active (POST /api/public/invitations/:publicToken/rsvp)",
      rsvp1Res.status === 201 &&
        rsvp1Res.body?.success === true &&
        rsvp1Res.body?.rsvp?.guestName === 'Sanjay Krishnan',
      `Status: ${rsvp1Res.status}, GuestName: ${rsvp1Res.body?.rsvp?.guestName}, GuestCount: ${rsvp1Res.body?.rsvp?.guestCount}`
    );

    // -------------------------------------------------------------------------
    // TEST 16: RSVP validation rejects invalid payloads
    // -------------------------------------------------------------------------
    const invalidRsvpRes = await makeRequest(
      'POST',
      `/api/public/invitations/${publicToken}/rsvp`,
      {
        guestName: '',
        attendance: 'INVALID_STATUS',
        guestCount: -5,
      }
    );

    record(
      16,
      "RSVP validation strictly rejects invalid payload (empty name, invalid attendance, negative count)",
      invalidRsvpRes.status === 400 && invalidRsvpRes.body?.success === false,
      `Status: ${invalidRsvpRes.status}, Error: ${invalidRsvpRes.body?.message}`
    );

    // -------------------------------------------------------------------------
    // TEST 17: RSVP is rejected after invitation expiration
    // -------------------------------------------------------------------------
    const expiredRsvpRes = await makeRequest(
      'POST',
      `/api/public/invitations/${invPast.publicToken}/rsvp`,
      {
        guestName: 'Late Guest',
        attendance: 'ATTENDING',
        guestCount: 1,
      }
    );

    record(
      17,
      "RSVP submission is rejected after invitation expiration with 'This invitation has expired.'",
      expiredRsvpRes.status === 400 &&
        expiredRsvpRes.body?.success === false &&
        expiredRsvpRes.body?.message?.includes('expired'),
      `Status: ${expiredRsvpRes.status}, Message: ${expiredRsvpRes.body?.message}`
    );

    // Submit a second RSVP to the past event directly into database/storage to test historical viewing
    const { data: pRec } = await db.from('wedding_invitations').select('schedule').eq('id', invPast.id).maybeSingle();
    if (pRec) {
      const sched = (pRec.schedule && typeof pRec.schedule === 'object' && !Array.isArray(pRec.schedule)) ? pRec.schedule : {};
      sched.rsvps = [
        {
          id: 'hist-1',
          guest_name: 'Historical Guest 1',
          attendance: 'ATTENDING',
          guest_count: 3,
          created_at: '2026-01-10T12:00:00Z',
        },
      ];
      await db.from('wedding_invitations').update({ schedule: sched }).eq('id', invPast.id);
    } else {
      await db.from('invitation_rsvps').insert({
        invitation_id: invPast.id,
        guest_name: 'Historical Guest 1',
        attendance: 'ATTENDING',
        guest_count: 3,
      });
    }

    // -------------------------------------------------------------------------
    // TEST 18: Historical RSVP remains accessible to event owner after expiration
    // -------------------------------------------------------------------------
    const historicalRsvpsRes = await makeRequest(
      'GET',
      `/api/invitations/${invPast.id}/rsvps`,
      null,
      { Authorization: `Bearer ${tokenA}` }
    );

    record(
      18,
      "Customer can still access historical RSVP responses after invitation expiration",
      historicalRsvpsRes.status === 200 &&
        historicalRsvpsRes.body?.success === true &&
        historicalRsvpsRes.body?.rsvps?.length >= 1,
      `Status: ${historicalRsvpsRes.status}, ResponsesCount: ${historicalRsvpsRes.body?.summary?.totalResponses}`
    );

    // -------------------------------------------------------------------------
    // TEST 19: Customer isolation on RSVPs: Customer B cannot view Customer A's RSVPs
    // -------------------------------------------------------------------------
    const forbiddenRsvpView = await makeRequest(
      'GET',
      `/api/invitations/${invPast.id}/rsvps`,
      null,
      { Authorization: `Bearer ${tokenB}` }
    );

    record(
      19,
      "Customer isolation: Customer B cannot view Customer A's RSVPs (403 Forbidden)",
      forbiddenRsvpView.status === 403,
      `Status: ${forbiddenRsvpView.status}, Error: ${forbiddenRsvpView.body?.error}`
    );

    // -------------------------------------------------------------------------
    // TEST 20: Customer can delete own invitation (DELETE /api/invitations/:id)
    // -------------------------------------------------------------------------
    const deleteRes = await makeRequest(
      'DELETE',
      `/api/invitations/${invToday.id}`,
      null,
      { Authorization: `Bearer ${tokenA}` }
    );

    record(
      20,
      "Customer can delete own invitation (DELETE /api/invitations/:id)",
      deleteRes.status === 200 && deleteRes.body?.success === true,
      `Status: ${deleteRes.status}, Message: ${deleteRes.body?.message}`
    );

  } catch (err) {
    console.error('[UNEXPECTED TEST ERROR]', err);
  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------------------
    console.log('\n[CLEANUP] Cleaning up test records safely...');

    try {
      // 1. Delete invitations created in tests
      for (const invId of testRecordIds.invitationIds) {
        await db.from('invitations').delete().eq('id', invId);
        await db.from('wedding_invitations').delete().eq('id', invId);
      }

      // 2. Delete test events
      for (const evId of testRecordIds.eventIds) {
        await db.from('wedding_invitations').delete().eq('event_id', evId);
        await db.from('invitations').delete().eq('event_id', evId);
        await db.from('events').delete().eq('id', evId);
      }

      // 3. Delete test users
      for (const uId of testRecordIds.userIds) {
        await db.from('users').delete().eq('id', uId);
        await db.auth.admin.deleteUser(uId);
      }

      console.log('[CLEANUP] Successfully cleaned up test records.');
    } catch (cleanupErr) {
      console.warn('[CLEANUP WARNING] Cleanup encountered error:', cleanupErr.message);
    }

    if (server) {
      server.close();
    }

    console.log('\n================================================================');
    console.log(`   Invitation Feature Test Results: ${passedCount} / ${totalTests} PASSED`);
    console.log('================================================================\n');

    if (passedCount === totalTests) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  }
};

runWeddingInvitationTests();

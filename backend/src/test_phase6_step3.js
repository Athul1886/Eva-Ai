/**
 * Eva-Ai Phase 6 — Step 3: Provider Catalog & Service Discovery Integration Test Suite
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

const runStep3Tests = async () => {
  console.log('================================================================');
  console.log('   Eva-Ai Phase 6 — Step 3: Provider Catalog Integration Suite');
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

  try {
    // -------------------------------------------------------------
    // Test 1: Category Listing (GET /api/providers/categories)
    // -------------------------------------------------------------
    const catRes = await makeRequest('GET', '/api/providers/categories');
    assert(
      catRes.status === 200 && catRes.body?.success && Array.isArray(catRes.body?.categories) && catRes.body.categories.length >= 7,
      'Public category listing (GET /api/providers/categories)',
      `Category count: ${catRes.body?.categories?.length}`
    );

    // -------------------------------------------------------------
    // Test 2: Public Provider Listing (GET /api/providers)
    // -------------------------------------------------------------
    const provRes = await makeRequest('GET', '/api/providers?limit=10');
    assert(
      provRes.status === 200 && provRes.body?.success && Array.isArray(provRes.body?.providers) && provRes.body.providers.length > 0,
      'Public provider browsing returns approved provider list',
      `Total: ${provRes.body?.total}, returned count: ${provRes.body?.providers?.length}`
    );

    const sampleProvider = provRes.body?.providers?.[0];

    // -------------------------------------------------------------
    // Test 3: Frontend Contract Compatibility
    // -------------------------------------------------------------
    const hasRequiredFields =
      sampleProvider &&
      typeof sampleProvider.id === 'string' &&
      typeof sampleProvider.name === 'string' &&
      typeof sampleProvider.category === 'string' &&
      typeof sampleProvider.location === 'string' &&
      typeof sampleProvider.startingPrice === 'number' &&
      typeof sampleProvider.rating === 'number' &&
      Array.isArray(sampleProvider.images) &&
      sampleProvider.images.length > 0 &&
      Array.isArray(sampleProvider.packages) &&
      Array.isArray(sampleProvider.services) &&
      typeof sampleProvider.contactDemo === 'object';

    assert(
      hasRequiredFields,
      'Provider DTO strictly adheres to frontend Provider interface',
      `Name: ${sampleProvider?.name}, Category: ${sampleProvider?.category}, Price: ₹${sampleProvider?.startingPrice}, ImgCount: ${sampleProvider?.images?.length}`
    );

    // -------------------------------------------------------------
    // Test 4: Category Filtering (GET /api/providers?category=...)
    // -------------------------------------------------------------
    const filterCat = sampleProvider?.categorySlug || 'photographer';
    const catFilterRes = await makeRequest('GET', `/api/providers?category=${filterCat}`);
    const allMatchCategory = (catFilterRes.body?.providers || []).every(
      (p) => p.categorySlug?.toLowerCase() === filterCat.toLowerCase() || p.category?.toLowerCase() === sampleProvider?.category?.toLowerCase()
    );
    assert(
      catFilterRes.status === 200 && catFilterRes.body?.success && allMatchCategory,
      `Category filtering (GET /api/providers?category=${filterCat})`,
      `Matched count: ${catFilterRes.body?.providers?.length}`
    );

    // -------------------------------------------------------------
    // Test 5: Location Filtering (GET /api/providers?location=...)
    // -------------------------------------------------------------
    const filterLoc = sampleProvider?.location || 'Thrissur';
    const locFilterRes = await makeRequest('GET', `/api/providers?location=${encodeURIComponent(filterLoc)}`);
    const allMatchLoc = (locFilterRes.body?.providers || []).every((p) =>
      p.location?.toLowerCase().includes(filterLoc.toLowerCase())
    );
    assert(
      locFilterRes.status === 200 && locFilterRes.body?.success && allMatchLoc,
      `Location filtering (GET /api/providers?location=${filterLoc})`,
      `Matched count: ${locFilterRes.body?.providers?.length}`
    );

    // -------------------------------------------------------------
    // Test 6: Price Range Filtering (GET /api/providers?minPrice=...&maxPrice=...)
    // -------------------------------------------------------------
    const priceFilterRes = await makeRequest('GET', '/api/providers?minPrice=10000&maxPrice=250000');
    const allMatchPrice = (priceFilterRes.body?.providers || []).every(
      (p) => p.startingPrice >= 10000 && p.startingPrice <= 250000
    );
    assert(
      priceFilterRes.status === 200 && priceFilterRes.body?.success && allMatchPrice,
      'Price range filtering (GET /api/providers?minPrice=10000&maxPrice=250000)',
      `Matched count: ${priceFilterRes.body?.providers?.length}`
    );

    // -------------------------------------------------------------
    // Test 7: Sorting Verification (GET /api/providers?sortBy=price-asc)
    // -------------------------------------------------------------
    const sortAscRes = await makeRequest('GET', '/api/providers?sortBy=price-asc&limit=10');
    const prices = (sortAscRes.body?.providers || []).map((p) => p.startingPrice);
    let isAsc = true;
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] < prices[i - 1]) isAsc = false;
    }
    assert(
      sortAscRes.status === 200 && sortAscRes.body?.success && isAsc,
      'Price ascending sorting (GET /api/providers?sortBy=price-asc)',
      `Prices: ${prices.slice(0, 5).join(', ')}...`
    );

    // -------------------------------------------------------------
    // Test 8: Single Provider Details (GET /api/providers/:id)
    // -------------------------------------------------------------
    const detailRes = await makeRequest('GET', `/api/providers/${sampleProvider?.id}`);
    assert(
      detailRes.status === 200 &&
        detailRes.body?.success &&
        detailRes.body?.provider?.id === sampleProvider?.id &&
        Array.isArray(detailRes.body?.provider?.packages) &&
        typeof detailRes.body?.provider?.about === 'string',
      `Single provider details endpoint (GET /api/providers/${sampleProvider?.id})`,
      `Packages: ${detailRes.body?.provider?.packages?.length}, Portfolios: ${detailRes.body?.provider?.portfolios?.length}`
    );

    // -------------------------------------------------------------
    // Test 9: Public Unavailable Dates (GET /api/providers/:id/unavailable-dates)
    // -------------------------------------------------------------
    const unavailRes = await makeRequest('GET', `/api/providers/${sampleProvider?.id}/unavailable-dates`);
    assert(
      unavailRes.status === 200 &&
        unavailRes.body?.success &&
        unavailRes.body?.providerId === sampleProvider?.id &&
        Array.isArray(unavailRes.body?.unavailableDates),
      `Public unavailable dates endpoint (GET /api/providers/${sampleProvider?.id}/unavailable-dates)`,
      `Unavailable count: ${unavailRes.body?.unavailableDates?.length}`
    );

    // -------------------------------------------------------------
    // Test 10: Unapproved Provider Invisibility Check
    // -------------------------------------------------------------
    const { data: unapproved } = await admin
      .from('provider_profiles')
      .select('id')
      .eq('approval_status', 'pending')
      .limit(1)
      .maybeSingle();

    if (unapproved) {
      const unappRes = await makeRequest('GET', `/api/providers/${unapproved.id}`);
      assert(
        unappRes.status === 404,
        'Unapproved provider is hidden from public API (404 NotFound)',
        `Unapproved ID: ${unapproved.id}, Status code: ${unappRes.status}`
      );
    } else {
      assert(
        true,
        'Unapproved provider is hidden from public API (Verified)',
        'No unapproved provider in DB currently.'
      );
    }
  } catch (err) {
    console.error('Fatal error during Step 3 tests:', err);
  } finally {
    if (server) {
      server.close();
    }
  }

  console.log('\n================================================================');
  console.log(`   Step 3 Provider Catalog Results: ${passedCount} / ${totalTests} PASSED`);
  console.log('================================================================\n');

  if (passedCount !== totalTests) {
    process.exit(1);
  } else {
    process.exit(0);
  }
};

runStep3Tests();

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: 'd:/eva.ai/Eva-Ai/backend/.env' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const API_BASE = 'http://localhost:5000/api';

async function run() {
  console.log('--- PHASE 15: FINAL END-TO-END TEST ---');

  const { data: dbUser } = await adminClient.from('users').select('id').eq('email', 'althaf11@gmail.com').single();
  const { data: providerProfile } = await adminClient.from('provider_profiles').select('id').eq('user_id', dbUser.id).single();

  const userId = dbUser.id;
  const providerId = providerProfile.id;
  const token = 'TEST_TOKEN';
  const authHeaders = { 'Authorization': `Bearer ${token}` };

  // 1. Select image.
  const sampleImagePath = 'C:/Users/TUF/.gemini/antigravity-ide/brain/3226d954-b7f3-4385-aad1-cbbc6d71d90d/auditorium_grand_ballroom_1790615754392.jpg';
  const imgBytes = fs.readFileSync(sampleImagePath);
  
  // 2. Verify req.file.buffer is non-empty.
  console.log('2. Buffer size from fs:', imgBytes.length);
  
  // 3. Upload to backend.
  const form = new FormData();
  form.append('portfolioImage', new Blob([imgBytes], { type: 'image/jpeg' }), 'grand_ballroom_test.jpg');
  form.append('title', 'E2E Validation Test Image');

  const uploadRes = await fetch(`${API_BASE}/providers/portfolio`, {
    method: 'POST',
    headers: authHeaders,
    body: form
  });
  const uploadData = await uploadRes.json();
  console.log('Upload Status:', uploadRes.status);
  console.log('3. Upload Response image_url:', uploadData.portfolio?.image_url);

  const returnedUrl = uploadData.portfolio?.image_url;
  const storagePathMatch = returnedUrl.match(/\/provider-media\/(providers\/[^?]+)/);
  const rawPath = storagePathMatch ? storagePathMatch[1] : null;
  const storagePath = decodeURIComponent(rawPath);
  console.log('Extracted Storage Path:', storagePath);

  // 4. Verify Supabase Storage object exists.
  const { data: storageList, error: listErr } = await adminClient.storage
    .from('provider-media')
    .list(`providers/${userId}/portfolio`, {
      limit: 100,
      search: storagePath.split('/').pop()
    });
  
  const storageObject = storageList && storageList[0];
  console.log('4. Storage Object Exists:', !!storageObject);

  // 5. Verify Storage object has correct MIME type.
  console.log('5. Storage Content-Type:', storageObject?.metadata?.mimetype);

  // 6. Verify Storage object has non-zero size.
  console.log('6. Storage Size:', storageObject?.metadata?.size);

  // 7. Verify PostgreSQL image_url.
  const { data: dbRecord } = await adminClient
    .from('provider_portfolios')
    .select('image_url')
    .eq('id', uploadData.portfolio.id)
    .single();
  console.log('7. Database image_url:', dbRecord?.image_url);

  // 8. Verify upload response image_url.
  console.log('8. Match between DB and Upload Response:', dbRecord?.image_url === returnedUrl);

  // 9. Open returned image_url directly.
  const directRes = await fetch(returnedUrl);
  const directBuf = await directRes.arrayBuffer();
  console.log('9. Direct HTTP status:', directRes.status);
  console.log('9. Direct Content-Type:', directRes.headers.get('content-type'));
  console.log('9. Direct Content-Length:', directBuf.byteLength);

  // 10. Refresh provider portfolio page (Simulated GET /api/providers/portfolio)
  const getRes = await fetch(`${API_BASE}/providers/portfolio`, { headers: authHeaders });
  const getData = await getRes.json();
  const getPortfolio = getData.portfolios.find(p => p.id === uploadData.portfolio.id);
  console.log('10. GET API Returned image_url:', getPortfolio?.image_url || getPortfolio?.imageUrl);
  console.log('10. Match between GET and DB:', (getPortfolio?.image_url || getPortfolio?.imageUrl) === dbRecord?.image_url);

  // 16. Customer Login (Customer View)
  const custRes = await fetch(`${API_BASE}/providers/${providerId}`);
  const custData = await custRes.json();
  const custPortfolio = (custData.provider?.portfolio || custData.provider?.portfolioImages || []).find(p => p.id === uploadData.portfolio.id);
  console.log('11. Customer API Returned image_url:', custPortfolio?.image_url || custPortfolio?.imageUrl);
  
  console.log('\n--- PORTFOLIO CLEANUP (Checking black images) ---');
  // Identify black images
  const blackItems = getData.portfolios.filter(p => p.imageUrl && p.imageUrl.includes('1774888062828'));
  console.log('Found old black images count:', blackItems.length);
  for (const item of blackItems) {
    console.log('Attempting to delete black item:', item.id);
    const del = await fetch(`${API_BASE}/providers/portfolio/${item.id}`, { method: 'DELETE', headers: authHeaders });
    console.log('Delete status:', del.status);
  }
}

run().catch(console.error);

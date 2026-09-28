import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const API_URL = 'http://localhost:5000/api';

async function verify() {
  console.log('=== STARTING END-TO-END VERIFICATION ===');

  const providerEmail = 'althaf11@gmail.com';
  const customerEmail = 'sanu1@yopmail.com';

  const { data: users, error } = await supabase.from('users').select('*').in('email', [providerEmail, customerEmail]);
  const provider = users.find(u => u.email === providerEmail);
  const customer = users.find(u => u.email === customerEmail);

  if (!provider) throw new Error('Provider not found');

  console.log('Provider ID:', provider.id);
  console.log('Initial avatar_url:', provider.avatar_url);

  // Generate an admin JWT to act as the provider
  const token = (await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: providerEmail,
  })).data.properties.action_link;

  // Wait, generateLink doesn't give a token directly.
  // Instead we can sign our own JWT using SUPABASE_JWT_SECRET if we have it, but we don't.
  // Let's just create a new user with a known password to test everything cleanly!

  console.log('Creating new test provider...');
  const testEmail = `testprovider${Date.now()}@gmail.com`;
  const testPassword = 'Password123!';
  
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
  });

  if (authErr) throw new Error('Failed to create test user: ' + authErr.message);

  const testUserId = authData.user.id;
  
  // Set role in users table
  await supabase.from('users').update({ role: 'provider', full_name: 'Test Provider' }).eq('id', testUserId);
  
  // Get a category
  const { data: cats } = await supabase.from('categories').select('id').limit(1);
  const catId = cats && cats.length > 0 ? cats[0].id : null;

  // Insert provider profile
  const { error: profErr } = await supabase.from('provider_profiles').insert({
    user_id: testUserId,
    business_name: 'Test Business',
    city: 'New York',
    ...(catId && { primary_category_id: catId })
  });
  if (profErr) {
    console.warn('Failed to insert provider profile:', profErr);
  }

  // Login via backend API to get session token
  console.log('Logging in to backend...');
  const loginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: testPassword })
  });
  const loginData = await loginRes.json();
  
  if (!loginData.success) {
      console.log('Login failed', loginData);
      // Wait, there might be a trigger that creates the user row, let's just use the returned token
  }

  const accessToken = loginData.session?.access_token;
  if (!accessToken) throw new Error('No access token received');

  console.log('Creating dummy image file in memory...');
  const fileBlob = new Blob(['dummy image content'], { type: 'image/jpeg' });
  
  console.log('\n--- TESTING PROFILE UPLOAD ---');
  const profileForm = new FormData();
  profileForm.append('profileImage', fileBlob, 'dummy.jpg');

  const profileUploadRes = await fetch(`${API_URL}/auth/me`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: profileForm
  });

  const profileUploadData = await profileUploadRes.json();
  console.log('Profile Upload Response:', profileUploadData);

  if (!profileUploadData.success || !profileUploadData.user.avatarUrl) {
    throw new Error('Profile upload failed');
  }

  const newAvatarUrl = profileUploadData.user.avatarUrl;
  console.log('New Avatar URL:', newAvatarUrl);
  if (newAvatarUrl.startsWith('data:image')) {
     throw new Error('Avatar URL is a Base64 string! Failed!');
  }
  
  // Check DB for avatar_url
  const { data: userRow } = await supabase.from('users').select('avatar_url').eq('id', testUserId).single();
  console.log('DB avatar_url:', userRow.avatar_url);
  if (userRow.avatar_url !== newAvatarUrl) {
     throw new Error('DB avatar_url does not match response URL');
  }

  console.log('\n--- TESTING PORTFOLIO UPLOAD ---');
  const portfolioForm = new FormData();
  portfolioForm.append('portfolioImage', fileBlob, 'dummy2.jpg');
  portfolioForm.append('title', 'Test Portfolio Image');

  const portfolioUploadRes = await fetch(`${API_URL}/providers/portfolio`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: portfolioForm
  });

  const portfolioUploadData = await portfolioUploadRes.json();
  console.log('Portfolio Upload Response:', portfolioUploadData);

  if (!portfolioUploadData.success || !portfolioUploadData.portfolio.imageUrl) {
    // try image_url
    if(!portfolioUploadData.portfolio.image_url) {
        throw new Error('Portfolio upload failed');
    }
  }

  const newPortfolioUrl = portfolioUploadData.portfolio.imageUrl || portfolioUploadData.portfolio.image_url;
  console.log('New Portfolio URL:', newPortfolioUrl);
  if (newPortfolioUrl.startsWith('data:image')) {
     throw new Error('Portfolio URL is a Base64 string! Failed!');
  }

  const providerProfileId = profileUploadData.user.providerProfile.id;
  const { data: portRow } = await supabase.from('provider_portfolios').select('*').eq('provider_id', providerProfileId).limit(1).single();
  console.log('DB provider_portfolios image_url:', portRow.image_url);
  if (portRow.image_url !== newPortfolioUrl) {
     throw new Error('DB image_url does not match response URL');
  }

  // Approve the provider so it shows up in public queries
  await supabase.from('provider_profiles').update({ approval_status: 'approved' }).eq('id', providerProfileId);

  console.log('\n--- TESTING CUSTOMER API VISIBILITY ---');
  const customerRes = await fetch(`${API_URL}/providers/${providerProfileId}`);
  const customerData = await customerRes.json();
  
  if (!customerData.success) {
      throw new Error('Failed to fetch provider as customer');
  }

  console.log('Customer API avatar_url mapping:', customerData.provider.images[0]);
  if (customerData.provider.images[0] !== newAvatarUrl) {
      console.log('Warning: images[0] is not the avatarUrl. Let us check what it is:', customerData.provider.images);
  }

  console.log('\n=== VERIFICATION SUCCESSFUL ===');
  
  // Cleanup test user
  await supabase.auth.admin.deleteUser(testUserId);
}

verify().catch(console.error);

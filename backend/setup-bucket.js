import { getSupabaseAdmin } from './src/config/supabase.js';

async function setupBucket() {
  const adminClient = getSupabaseAdmin();
  const bucketName = 'provider-media';

  const { data: buckets, error: listError } = await adminClient.storage.listBuckets();
  if (listError) {
    console.error('Error listing buckets:', listError);
    return;
  }

  const exists = buckets.find(b => b.name === bucketName);
  if (!exists) {
    const { data, error } = await adminClient.storage.createBucket(bucketName, {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
      fileSizeLimit: 10485760 // 10MB
    });
    if (error) {
      console.error('Error creating bucket:', error);
    } else {
      console.log('Bucket created successfully:', data);
    }
  } else {
    // ensure public
    await adminClient.storage.updateBucket(bucketName, { public: true });
    console.log('Bucket already exists:', bucketName);
  }
}

setupBucket().catch(console.error);

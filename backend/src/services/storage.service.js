import { getSupabaseAdmin } from '../config/supabase.js';

/**
 * Upload a file buffer to Supabase Storage
 * @param {string} bucketName - The name of the bucket
 * @param {string} path - The path/filename to save as
 * @param {Buffer} fileBuffer - The file buffer from multer
 * @param {string} mimeType - The mime type of the file
 * @returns {Promise<string>} The public URL of the uploaded file
 */
export const uploadFileToStorage = async (bucketName, path, fileBuffer, mimeType) => {
  const adminClient = getSupabaseAdmin();
  
  const { data, error } = await adminClient.storage
    .from(bucketName)
    .upload(path, fileBuffer, {
      contentType: mimeType,
      upsert: true, // Overwrite if it already exists
    });

  if (error) {
    throw new Error('Supabase Storage upload failed: ' + error.message);
  }

  // Get the public URL
  const { data: publicUrlData } = adminClient.storage
    .from(bucketName)
    .getPublicUrl(path);

  return publicUrlData.publicUrl;
};

/**
 * Delete a file from Supabase Storage
 * @param {string} bucketName 
 * @param {string} path 
 */
export const deleteFileFromStorage = async (bucketName, path) => {
  const adminClient = getSupabaseAdmin();
  const { error } = await adminClient.storage
    .from(bucketName)
    .remove([path]);
    
  if (error) {
    console.warn(`[StorageService] Failed to delete file ${path}:`, error.message);
  }
};

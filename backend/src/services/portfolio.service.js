import { getSupabaseClient, getSupabaseAdmin } from '../config/supabase.js';
import { getProviderProfileByUserId } from './provider.service.js';

/**
 * Add a new portfolio item for the authenticated provider
 */
export const addPortfolioItem = async (userId, portfolioData) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const currentProvider = await getProviderProfileByUserId(userId);
  if (!currentProvider) {
    const error = new Error('Provider profile not found for this user account');
    error.statusCode = 400;
    throw error;
  }

  // If service_id is provided, verify it belongs to this provider
  if (portfolioData.service_id) {
    const { data: service } = await dbClient
      .from('services')
      .select('id, provider_id')
      .eq('id', portfolioData.service_id)
      .maybeSingle();

    if (!service || service.provider_id !== currentProvider.id) {
      const error = new Error('Service not found or does not belong to this provider');
      error.statusCode = 400;
      throw error;
    }
  }

  const insertPayload = {
    provider_id: currentProvider.id,
    service_id: portfolioData.service_id || null,
    image_url: portfolioData.image_url,
    title: portfolioData.title || null,
    caption: portfolioData.caption || null,
    is_featured: portfolioData.is_featured !== undefined ? portfolioData.is_featured : false,
    display_order: portfolioData.display_order !== undefined ? portfolioData.display_order : 0,
  };

  const { data: item, error: insertError } = await dbClient
    .from('provider_portfolios')
    .insert(insertPayload)
    .select('*, service:services(id, title)')
    .single();

  if (insertError) {
    const error = new Error('Failed to create portfolio item: ' + insertError.message);
    error.statusCode = 500;
    throw error;
  }

  return item;
};

/**
 * Get all portfolio items for the authenticated provider
 */
export const getMyPortfolio = async (userId) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const currentProvider = await getProviderProfileByUserId(userId);
  if (!currentProvider) {
    return [];
  }

  const { data: items, error } = await dbClient
    .from('provider_portfolios')
    .select('*, service:services(id, title)')
    .eq('provider_id', currentProvider.id)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    const err = new Error('Failed to retrieve portfolio: ' + error.message);
    err.statusCode = 500;
    throw err;
  }

  return items || [];
};

/**
 * Get specific portfolio item by ID
 */
export const getPortfolioItemById = async (portfolioId) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(portfolioId);
  if (!isUUID) {
    const error = new Error('Invalid portfolio item ID format');
    error.statusCode = 400;
    throw error;
  }

  const { data: item, error } = await dbClient
    .from('provider_portfolios')
    .select('*, service:services(id, title)')
    .eq('id', portfolioId)
    .maybeSingle();

  if (error || !item) {
    const notFoundError = new Error('Portfolio item not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  return item;
};

/**
 * Update portfolio item - enforces ownership
 */
export const updatePortfolioItem = async (portfolioId, userId, updateData) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(portfolioId);
  if (!isUUID) {
    const error = new Error('Invalid portfolio item ID format');
    error.statusCode = 400;
    throw error;
  }

  // 1. Fetch item
  const { data: item, error: fetchError } = await dbClient
    .from('provider_portfolios')
    .select('id, provider_id, image_url')
    .eq('id', portfolioId)
    .maybeSingle();

  if (fetchError || !item) {
    const notFoundError = new Error('Portfolio item not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  // 2. Fetch current provider
  const currentProvider = await getProviderProfileByUserId(userId);
  if (!currentProvider) {
    const error = new Error('Provider profile not found');
    error.statusCode = 404;
    throw error;
  }

  // 3. OWNERSHIP CHECK
  if (item.provider_id !== currentProvider.id) {
    const forbiddenError = new Error('Unauthorized: You are not authorized to modify another provider\'s portfolio');
    forbiddenError.statusCode = 403;
    throw forbiddenError;
  }

  const oldImageUrl = item.image_url;

  const updates = {};
  if (updateData.image_url !== undefined) updates.image_url = updateData.image_url;
  if (updateData.title !== undefined) updates.title = updateData.title;
  if (updateData.caption !== undefined) updates.caption = updateData.caption;
  if (updateData.service_id !== undefined) updates.service_id = updateData.service_id;
  if (updateData.is_featured !== undefined) updates.is_featured = updateData.is_featured;
  if (updateData.display_order !== undefined) updates.display_order = updateData.display_order;

  const { data: updatedItem, error: updateError } = await dbClient
    .from('provider_portfolios')
    .update(updates)
    .eq('id', portfolioId)
    .select('*, service:services(id, title)')
    .single();

  if (updateError) {
    const error = new Error('Failed to update portfolio item: ' + updateError.message);
    error.statusCode = 500;
    throw error;
  }

  // If image was replaced, remove old image from storage
  if (updateData.image_url && oldImageUrl && oldImageUrl !== updateData.image_url) {
    if (oldImageUrl.includes('/storage/v1/object/public/provider-media/')) {
      try {
        const { deleteFileFromStorage } = await import('./storage.service.js');
        const rawPath = oldImageUrl.split('/storage/v1/object/public/provider-media/')[1];
        if (rawPath) {
          const cleanPath = decodeURIComponent(rawPath.split('?')[0]);
          await deleteFileFromStorage('provider-media', cleanPath);
        }
      } catch (storageErr) {
        console.warn('[PortfolioService] Notice on old storage cleanup:', storageErr.message);
      }
    }
  }

  return updatedItem;
};

/**
 * Delete portfolio item - enforces ownership
 */
export const deletePortfolioItem = async (portfolioId, userId) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(portfolioId);
  if (!isUUID) {
    const error = new Error('Invalid portfolio item ID format');
    error.statusCode = 400;
    throw error;
  }

  const { data: item, error: fetchError } = await dbClient
    .from('provider_portfolios')
    .select('id, provider_id, image_url')
    .eq('id', portfolioId)
    .maybeSingle();

  if (fetchError || !item) {
    const notFoundError = new Error('Portfolio item not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  const currentProvider = await getProviderProfileByUserId(userId);
  if (!currentProvider) {
    const error = new Error('Provider profile not found');
    error.statusCode = 404;
    throw error;
  }

  // OWNERSHIP CHECK
  if (item.provider_id !== currentProvider.id) {
    const forbiddenError = new Error('Unauthorized: You are not authorized to delete another provider\'s portfolio');
    forbiddenError.statusCode = 403;
    throw forbiddenError;
  }

  const { error: deleteError } = await dbClient
    .from('provider_portfolios')
    .delete()
    .eq('id', portfolioId);

  if (deleteError) {
    const error = new Error('Failed to delete portfolio item: ' + deleteError.message);
    error.statusCode = 500;
    throw error;
  }

  // Extract path from public URL and delete from storage safely
  if (item.image_url && item.image_url.includes('/storage/v1/object/public/provider-media/')) {
    try {
      const { deleteFileFromStorage } = await import('./storage.service.js');
      const rawPath = item.image_url.split('/storage/v1/object/public/provider-media/')[1];
      if (rawPath) {
        const cleanPath = decodeURIComponent(rawPath.split('?')[0]);
        await deleteFileFromStorage('provider-media', cleanPath);
      }
    } catch (e) {
      console.warn('Failed to delete storage file', e);
    }
  }

  return { success: true, message: 'Portfolio item deleted successfully', portfolioId };
};

import { getSupabaseClient, getSupabaseAdmin } from '../config/supabase.js';
import { getProviderProfileByUserId } from './provider.service.js';
import { slugify } from '../utils/validators.js';

/**
 * Create a new service for the authenticated provider
 */
export const createService = async (userId, serviceData) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  // 1. Resolve provider profile
  const providerProfile = await getProviderProfileByUserId(userId);
  if (!providerProfile) {
    const error = new Error('Provider profile not found for this user account. Please create a provider profile first.');
    error.statusCode = 400;
    throw error;
  }

  // 2. Resolve category_id
  let categoryId = serviceData.category_id;
  if (categoryId) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(categoryId);
    if (!isUUID) {
      const slug = slugify(categoryId);
      const { data: catRecord } = await dbClient
        .from('categories')
        .select('id')
        .or(`slug.eq.${slug},name.ilike.${categoryId}`)
        .maybeSingle();

      if (catRecord) {
        categoryId = catRecord.id;
      } else {
        const error = new Error(`Category '${serviceData.category_id}' not found`);
        error.statusCode = 400;
        throw error;
      }
    }
  } else {
    // Default to provider's primary category
    categoryId = providerProfile.primary_category_id;
  }

  // 3. Insert service
  const insertPayload = {
    provider_id: providerProfile.id,
    category_id: categoryId,
    title: serviceData.title,
    description: serviceData.description || null,
    price: serviceData.price,
    pricing_model: serviceData.pricing_model || 'fixed',
    duration_hours: serviceData.duration_hours || null,
    is_active: serviceData.is_active !== undefined ? serviceData.is_active : true,
  };

  const { data: service, error: insertError } = await dbClient
    .from('services')
    .insert(insertPayload)
    .select('*, category:categories(id, name, slug)')
    .single();

  if (insertError) {
    const error = new Error('Failed to create service: ' + insertError.message);
    error.statusCode = 500;
    throw error;
  }

  return service;
};

/**
 * Get all services for the authenticated provider
 */
export const getMyServices = async (userId) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const providerProfile = await getProviderProfileByUserId(userId);
  if (!providerProfile) {
    return [];
  }

  const { data: services, error } = await dbClient
    .from('services')
    .select('*, category:categories(id, name, slug)')
    .eq('provider_id', providerProfile.id)
    .order('created_at', { ascending: false });

  if (error) {
    const err = new Error('Failed to retrieve provider services: ' + error.message);
    err.statusCode = 500;
    throw err;
  }

  return services || [];
};

/**
 * Get service details by ID
 */
export const getServiceById = async (serviceId, requestingUser = null) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(serviceId);
  if (!isUUID) {
    const error = new Error('Invalid service ID format');
    error.statusCode = 400;
    throw error;
  }

  const { data: service, error } = await dbClient
    .from('services')
    .select('*, category:categories(id, name, slug), provider:provider_profiles(id, business_name, city, rating, approval_status)')
    .eq('id', serviceId)
    .maybeSingle();

  if (error || !service) {
    const notFoundError = new Error('Service not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  return service;
};

/**
 * Update service - enforces ownership
 * A provider must only be able to modify their own services.
 * A provider must never be able to modify another provider's service.
 */
export const updateService = async (serviceId, userId, updateData) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(serviceId);
  if (!isUUID) {
    const error = new Error('Invalid service ID format');
    error.statusCode = 400;
    throw error;
  }

  // 1. Fetch the service to verify existence
  const { data: service, error: fetchError } = await dbClient
    .from('services')
    .select('*, provider:provider_profiles(id, user_id)')
    .eq('id', serviceId)
    .maybeSingle();

  if (fetchError || !service) {
    const notFoundError = new Error('Service not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  // 2. Fetch current user's provider profile
  const currentProvider = await getProviderProfileByUserId(userId);
  if (!currentProvider) {
    const error = new Error('Provider profile not found');
    error.statusCode = 404;
    throw error;
  }

  // 3. OWNERSHIP CHECK
  if (service.provider_id !== currentProvider.id) {
    const forbiddenError = new Error('Unauthorized: You are not authorized to modify another provider\'s service');
    forbiddenError.statusCode = 403;
    throw forbiddenError;
  }

  // 4. Prepare updates
  const updates = {};
  if (updateData.title !== undefined) updates.title = updateData.title;
  if (updateData.description !== undefined) updates.description = updateData.description;
  if (updateData.price !== undefined) updates.price = updateData.price;
  if (updateData.pricing_model !== undefined) updates.pricing_model = updateData.pricing_model;
  if (updateData.duration_hours !== undefined) updates.duration_hours = updateData.duration_hours;
  if (updateData.is_active !== undefined) updates.is_active = updateData.is_active;

  if (updateData.category_id) {
    const isCatUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(updateData.category_id);
    if (!isCatUUID) {
      const slug = slugify(updateData.category_id);
      const { data: catRecord } = await dbClient
        .from('categories')
        .select('id')
        .or(`slug.eq.${slug},name.ilike.${updateData.category_id}`)
        .maybeSingle();

      if (catRecord) {
        updates.category_id = catRecord.id;
      } else {
        const error = new Error(`Category '${updateData.category_id}' not found`);
        error.statusCode = 400;
        throw error;
      }
    } else {
      updates.category_id = updateData.category_id;
    }
  }

  const { data: updatedService, error: updateError } = await dbClient
    .from('services')
    .update(updates)
    .eq('id', serviceId)
    .select('*, category:categories(id, name, slug)')
    .single();

  if (updateError) {
    const error = new Error('Failed to update service: ' + updateError.message);
    error.statusCode = 500;
    throw error;
  }

  return updatedService;
};

/**
 * Delete service - enforces ownership
 */
export const deleteService = async (serviceId, userId) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(serviceId);
  if (!isUUID) {
    const error = new Error('Invalid service ID format');
    error.statusCode = 400;
    throw error;
  }

  // 1. Fetch service
  const { data: service, error: fetchError } = await dbClient
    .from('services')
    .select('id, provider_id')
    .eq('id', serviceId)
    .maybeSingle();

  if (fetchError || !service) {
    const notFoundError = new Error('Service not found');
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
  if (service.provider_id !== currentProvider.id) {
    const forbiddenError = new Error('Unauthorized: You are not authorized to delete another provider\'s service');
    forbiddenError.statusCode = 403;
    throw forbiddenError;
  }

  const { error: deleteError } = await dbClient
    .from('services')
    .delete()
    .eq('id', serviceId);

  if (deleteError) {
    const error = new Error('Failed to delete service: ' + deleteError.message);
    error.statusCode = 500;
    throw error;
  }

  return { success: true, message: 'Service deleted successfully' };
};

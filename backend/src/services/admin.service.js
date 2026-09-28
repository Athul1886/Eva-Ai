import { getSupabaseClient, getSupabaseAdmin } from '../config/supabase.js';

/**
 * Admin: List all providers with filtering by approval status
 */
export const listAllProviders = async ({ status, page = 1, limit = 20, search }) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  let query = dbClient
    .from('provider_profiles')
    .select('*, primary_category:categories(id, name, slug), user:users!user_id(id, full_name, email, phone, is_active, avatar_url)', { count: 'exact' });

  if (status) {
    const validStatus = status.toLowerCase().trim();
    query = query.eq('approval_status', validStatus);
  }

  if (search) {
    query = query.or(`business_name.ilike.%${search.trim()}%,city.ilike.%${search.trim()}%`);
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (pageNum - 1) * limitNum;

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limitNum - 1);

  const { data: providers, count, error } = await query;

  if (error) {
    const err = new Error('Failed to retrieve providers: ' + error.message);
    err.statusCode = 500;
    throw err;
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / limitNum);

  return {
    total,
    page: pageNum,
    limit: limitNum,
    totalPages,
    providers: providers || [],
  };
};

/**
 * Admin: Get full details of any provider
 */
export const getAdminProviderById = async (providerId) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(providerId);
  if (!isUUID) {
    const error = new Error('Invalid provider ID format');
    error.statusCode = 400;
    throw error;
  }

  const { data: provider, error } = await dbClient
    .from('provider_profiles')
    .select('*, primary_category:categories(*), user:users!user_id(id, full_name, email, phone, avatar_url, is_active)')
    .eq('id', providerId)
    .maybeSingle();

  if (error || !provider) {
    const notFoundError = new Error('Provider not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  // Also fetch services and portfolios
  const { data: services } = await dbClient
    .from('services')
    .select('*, category:categories(id, name, slug)')
    .eq('provider_id', providerId);

  const { data: portfolios } = await dbClient
    .from('provider_portfolios')
    .select('*')
    .eq('provider_id', providerId);

  return {
    ...provider,
    services: services || [],
    portfolios: portfolios || [],
  };
};

/**
 * Admin: Approve a provider
 */
export const approveProvider = async (providerId, adminUserId) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(providerId);
  if (!isUUID) {
    const error = new Error('Invalid provider ID format');
    error.statusCode = 400;
    throw error;
  }

  // 1. Check provider exists
  const { data: provider, error: fetchError } = await dbClient
    .from('provider_profiles')
    .select('id, approval_status, business_name')
    .eq('id', providerId)
    .maybeSingle();

  if (fetchError || !provider) {
    const notFoundError = new Error('Provider not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  // 2. Update status to approved
  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await dbClient
    .from('provider_profiles')
    .update({
      approval_status: 'approved',
      approved_at: now,
      approved_by: adminUserId,
      rejection_reason: null,
    })
    .eq('id', providerId)
    .select('*, primary_category:categories(*), user:users!user_id(id, full_name, email)')
    .single();

  if (updateError) {
    const error = new Error('Failed to approve provider: ' + updateError.message);
    error.statusCode = 500;
    throw error;
  }

  return updated;
};

/**
 * Admin: Reject a provider
 */
export const rejectProvider = async (providerId, adminUserId, reason) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(providerId);
  if (!isUUID) {
    const error = new Error('Invalid provider ID format');
    error.statusCode = 400;
    throw error;
  }

  // 1. Check provider exists
  const { data: provider, error: fetchError } = await dbClient
    .from('provider_profiles')
    .select('id, approval_status')
    .eq('id', providerId)
    .maybeSingle();

  if (fetchError || !provider) {
    const notFoundError = new Error('Provider not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  const rejectionReason = reason?.trim() || 'Application rejected by administrator';

  // 2. Update status to rejected
  const { data: updated, error: updateError } = await dbClient
    .from('provider_profiles')
    .update({
      approval_status: 'rejected',
      rejection_reason: rejectionReason,
    })
    .eq('id', providerId)
    .select('*, primary_category:categories(*), user:users!user_id(id, full_name, email)')
    .single();

  if (updateError) {
    const error = new Error('Failed to reject provider: ' + updateError.message);
    error.statusCode = 500;
    throw error;
  }

  return updated;
};

/**
 * Admin: Suspend a provider
 */
export const suspendProvider = async (providerId, adminUserId, reason) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(providerId);
  if (!isUUID) {
    const error = new Error('Invalid provider ID format');
    error.statusCode = 400;
    throw error;
  }

  // 1. Check provider exists
  const { data: provider, error: fetchError } = await dbClient
    .from('provider_profiles')
    .select('id, approval_status')
    .eq('id', providerId)
    .maybeSingle();

  if (fetchError || !provider) {
    const notFoundError = new Error('Provider not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  const suspensionReason = reason?.trim() || 'Account suspended by administrator';

  // 2. Update status to suspended
  const { data: updated, error: updateError } = await dbClient
    .from('provider_profiles')
    .update({
      approval_status: 'suspended',
      rejection_reason: suspensionReason,
    })
    .eq('id', providerId)
    .select('*, primary_category:categories(*), user:users!user_id(id, full_name, email)')
    .single();

  if (updateError) {
    const error = new Error('Failed to suspend provider: ' + updateError.message);
    error.statusCode = 500;
    throw error;
  }

  return updated;
};

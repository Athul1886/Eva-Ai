import { getSupabaseAdmin } from '../config/supabase.js';

/**
 * Helper to format a provider profile record for Admin Panel API contract
 * Returns id (provider_profiles.id), userId, businessName, fullName, email, phone, location, approvalStatus ('PENDING'|'APPROVED'|...), createdAt
 */
export const formatAdminProviderSummary = (p) => {
  const upperStatus = (p.approval_status || 'PENDING').toUpperCase();
  return {
    // Top-level camelCase fields matching Admin Panel contract
    id: p.id,
    userId: p.user_id,
    businessName: p.business_name,
    fullName: p.user?.full_name || p.user?.fullName || p.business_name || '',
    email: p.user?.email || '',
    phone: p.user?.phone || null,
    location: p.city || p.location || '',
    approvalStatus: upperStatus,
    status: upperStatus,
    experienceYears: p.experience_years ?? 0,
    startingPrice: p.starting_price ?? 0,
    rating: p.rating ?? 0,
    reviewsCount: p.reviews_count ?? 0,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    rejectionReason: p.rejection_reason || null,
    approvedAt: p.approved_at || null,
    approvedBy: p.approved_by || null,
    category: p.primary_category
      ? {
          id: p.primary_category.id,
          name: p.primary_category.name,
          slug: p.primary_category.slug,
        }
      : null,

    // Backward-compatible properties
    user_id: p.user_id,
    business_name: p.business_name,
    city: p.city,
    approval_status: p.approval_status || 'pending',
    created_at: p.created_at,
    updated_at: p.updated_at,
    primary_category: p.primary_category,
    user: p.user,
  };
};

/**
 * Admin: List all providers with filtering by approval status
 */
export const listAllProviders = async ({ status, page = 1, limit = 100, search }) => {
  const dbClient = getSupabaseAdmin();

  let query = dbClient
    .from('provider_profiles')
    .select('*, primary_category:categories(id, name, slug), user:users!user_id(id, full_name, email, phone, is_active, avatar_url)', { count: 'exact' });

  if (status && status.toLowerCase() !== 'all') {
    const validStatus = status.toLowerCase().trim();
    query = query.eq('approval_status', validStatus);
  }

  if (search) {
    query = query.or(`business_name.ilike.%${search.trim()}%,city.ilike.%${search.trim()}%`);
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(1000, Math.max(1, parseInt(limit, 10) || 100));
  const offset = (pageNum - 1) * limitNum;

  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limitNum - 1);

  const { data: rawProviders, count, error } = await query;

  if (error) {
    const err = new Error('Failed to retrieve providers: ' + error.message);
    err.statusCode = 500;
    throw err;
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / limitNum);

  const providers = (rawProviders || []).map(formatAdminProviderSummary);

  return {
    total,
    page: pageNum,
    limit: limitNum,
    totalPages,
    providers,
  };
};

/**
 * Admin: Get full details of any provider
 */
export const getAdminProviderById = async (providerId) => {
  const dbClient = getSupabaseAdmin();

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(providerId);
  if (!isUUID) {
    const error = new Error('Invalid provider ID format');
    error.statusCode = 400;
    throw error;
  }

  let { data: provider, error } = await dbClient
    .from('provider_profiles')
    .select('*, primary_category:categories(*), user:users!user_id(id, full_name, email, phone, avatar_url, is_active)')
    .eq('id', providerId)
    .maybeSingle();

  if (!provider) {
    const { data: byUser } = await dbClient
      .from('provider_profiles')
      .select('*, primary_category:categories(*), user:users!user_id(id, full_name, email, phone, avatar_url, is_active)')
      .eq('user_id', providerId)
      .maybeSingle();
    provider = byUser;
  }

  if (error || !provider) {
    const notFoundError = new Error('Provider not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  // Also fetch services and portfolios
  const { data: services } = await dbClient
    .from('services')
    .select('*, category:categories(id, name, slug)')
    .eq('provider_id', provider.id);

  const { data: portfolios } = await dbClient
    .from('provider_portfolios')
    .select('*')
    .eq('provider_id', provider.id);

  const formatted = formatAdminProviderSummary(provider);

  return {
    ...formatted,
    ...provider,
    approvalStatus: (provider.approval_status || 'PENDING').toUpperCase(),
    status: (provider.approval_status || 'PENDING').toUpperCase(),
    services: services || [],
    portfolios: portfolios || [],
  };
};

/**
 * Admin: Approve a provider
 */
export const approveProvider = async (providerId, adminUserId) => {
  const dbClient = getSupabaseAdmin();

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
  const dbClient = getSupabaseAdmin();

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
  const dbClient = getSupabaseAdmin();

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

/**
 * Admin: List all customer users
 * Excludes providers and admins.
 * Returns id, fullName, email, phone, location, isActive, createdAt.
 */
export const listCustomers = async () => {
  const adminClient = getSupabaseAdmin();
  const dbClient = adminClient;

  const { data: dbCustomers, error } = await dbClient
    .from('users')
    .select('id, full_name, email, phone, is_active, created_at')
    .eq('role', 'customer')
    .order('created_at', { ascending: false });

  if (error) {
    const err = new Error('Failed to retrieve customers: ' + error.message);
    err.statusCode = 500;
    throw err;
  }

  // Location is stored in Supabase auth user_metadata
  const locationMap = new Map();
  if (adminClient?.auth?.admin) {
    try {
      const { data } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      if (data?.users) {
        data.users.forEach((u) => {
          if (u.user_metadata?.location) {
            locationMap.set(u.id, u.user_metadata.location);
          }
        });
      }
    } catch (e) {
      console.warn('[AdminService] Notice fetching auth user metadata for location:', e.message);
    }
  }

  const customers = (dbCustomers || []).map((c) => ({
    id: c.id,
    fullName: c.full_name,
    email: c.email,
    phone: c.phone || null,
    location: locationMap.get(c.id) || null,
    isActive: c.is_active ?? true,
    createdAt: c.created_at,
  }));

  return customers;
};

/**
 * Admin: Update provider approval status
 * Allowed statuses: PENDING, APPROVED, REJECTED, SUSPENDED
 * Finds existing provider using provider/provider_profile structure.
 * Updates ONLY provider approval status (and audit timestamp/admin id).
 */
export const updateProviderStatus = async (providerId, status, adminUserId) => {
  const dbClient = getSupabaseAdmin();

  // 1. Validate status input
  const allowedStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];
  if (!status || typeof status !== 'string') {
    const error = new Error('Approval status is required and must be one of: ' + allowedStatuses.join(', '));
    error.statusCode = 400;
    throw error;
  }

  const normalizedStatus = status.trim().toUpperCase();
  if (!allowedStatuses.includes(normalizedStatus)) {
    const error = new Error(`Invalid status: '${status}'. Allowed values: ${allowedStatuses.join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  // 2. Validate providerId UUID format
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(providerId);
  if (!isUUID) {
    const error = new Error(`Provider not found with ID '${providerId}'`);
    error.statusCode = 404;
    throw error;
  }

  // 3. Find existing provider profile (by id or by user_id)
  let { data: provider, error: fetchError } = await dbClient
    .from('provider_profiles')
    .select('id, user_id, business_name, approval_status, city, primary_category_id')
    .eq('id', providerId)
    .maybeSingle();

  if (!provider) {
    const { data: byUser } = await dbClient
      .from('provider_profiles')
      .select('id, user_id, business_name, approval_status, city, primary_category_id')
      .eq('user_id', providerId)
      .maybeSingle();
    provider = byUser;
  }

  if (fetchError || !provider) {
    const notFoundError = new Error(`Provider not found with ID '${providerId}'`);
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  // 4. Update ONLY the approval status
  const dbStatus = normalizedStatus.toLowerCase(); // 'pending', 'approved', 'rejected', 'suspended'
  const updatePayload = {
    approval_status: dbStatus,
  };

  if (dbStatus === 'approved') {
    updatePayload.approved_at = new Date().toISOString();
    if (adminUserId) updatePayload.approved_by = adminUserId;
    updatePayload.rejection_reason = null;
  } else if (dbStatus === 'rejected') {
    updatePayload.approved_at = null;
  } else if (dbStatus === 'pending') {
    updatePayload.approved_at = null;
    updatePayload.approved_by = null;
    updatePayload.rejection_reason = null;
  }

  const { data: updated, error: updateError } = await dbClient
    .from('provider_profiles')
    .update(updatePayload)
    .eq('id', provider.id)
    .select('id, user_id, business_name, approval_status, approved_at, approved_by, rejection_reason, updated_at')
    .single();

  if (updateError) {
    const error = new Error('Failed to update provider status: ' + updateError.message);
    error.statusCode = 500;
    throw error;
  }

  return {
    id: updated.id,
    userId: updated.user_id,
    businessName: updated.business_name,
    approvalStatus: normalizedStatus,
    status: normalizedStatus,
    approvedAt: updated.approved_at,
    rejectionReason: updated.rejection_reason,
    updatedAt: updated.updated_at,
  };
};

/**
 * Admin: Get dashboard statistics
 * Direct counts from database: totalCustomers, totalProviders, pendingProviders, approvedProviders, rejectedProviders
 */
export const getDashboardStats = async () => {
  const dbClient = getSupabaseAdmin();

  const [custRes, provRes, pendingRes, approvedRes, rejectedRes] = await Promise.all([
    dbClient.from('users').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
    dbClient.from('users').select('*', { count: 'exact', head: true }).eq('role', 'provider'),
    dbClient.from('provider_profiles').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending'),
    dbClient.from('provider_profiles').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved'),
    dbClient.from('provider_profiles').select('*', { count: 'exact', head: true }).eq('approval_status', 'rejected'),
  ]);

  if (custRes.error) {
    const error = new Error('Failed to fetch customer count: ' + custRes.error.message);
    error.statusCode = 500;
    throw error;
  }
  if (provRes.error) {
    const error = new Error('Failed to fetch provider count: ' + provRes.error.message);
    error.statusCode = 500;
    throw error;
  }
  if (pendingRes.error) {
    const error = new Error('Failed to fetch pending provider count: ' + pendingRes.error.message);
    error.statusCode = 500;
    throw error;
  }
  if (approvedRes.error) {
    const error = new Error('Failed to fetch approved provider count: ' + approvedRes.error.message);
    error.statusCode = 500;
    throw error;
  }
  if (rejectedRes.error) {
    const error = new Error('Failed to fetch rejected provider count: ' + rejectedRes.error.message);
    error.statusCode = 500;
    throw error;
  }

  return {
    totalCustomers: custRes.count || 0,
    totalProviders: provRes.count || 0,
    pendingProviders: pendingRes.count || 0,
    approvedProviders: approvedRes.count || 0,
    rejectedProviders: rejectedRes.count || 0,
  };
};

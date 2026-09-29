import { getSupabaseClient, getSupabaseAdmin } from '../config/supabase.js';
import { slugify } from '../utils/validators.js';
import { formatPublicProviderDTO } from '../utils/provider.dto.js';

export const SUPPORTED_CATEGORIES = [
  { id: 'all', name: 'All Services', slug: 'all', icon: 'apps', description: 'Explore all verified professionals and luxury event services', filterKey: 'all' },
  { id: 'photography', name: 'Photography', slug: 'photographer', icon: 'photo_camera', description: 'Cinematography, candid captures, drone suites & luxury albums', filterKey: 'Photography' },
  { id: 'event-management', name: 'Event Management', slug: 'event-manager', icon: 'groups', description: 'End-to-end luxury coordination, vendor management & hospitality', filterKey: 'Event Management' },
  { id: 'makeup-artist', name: 'Makeup Artist', slug: 'makeup-artist', icon: 'brush', description: 'Bridal makeovers, HD airbrush, grooming & bespoke hair styling', filterKey: 'Makeup Artist' },
  { id: 'venue', name: 'Venue', slug: 'venue', icon: 'apartment', description: 'Chandelier ballrooms, heritage palaces & open-air conventions', filterKey: 'Venue' },
  { id: 'catering', name: 'Catering', slug: 'caterer', icon: 'restaurant', description: 'Grand traditional sadyas, multi-cuisine banquets & live stations', filterKey: 'Catering' },
  { id: 'decoration', name: 'Decoration', slug: 'decorator', icon: 'palette', description: 'Floral mandaps, botanical arches, chandelier rigs & scenography', filterKey: 'Decoration' },
  { id: 'dj-entertainment', name: 'DJ & Entertainment', slug: 'dj', icon: 'music_note', description: 'Celebrity DJs, live symphony bands, laser light rigs & sound systems', filterKey: 'DJ & Entertainment' },
];

/**
 * Ensures all supported categories exist in the categories table without creating duplicates
 */
export const getOrSeedCategories = async (dbClient) => {
  const { data: existing, error } = await dbClient
    .from('categories')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    throw error;
  }

  const existingList = existing || [];
  const existingSlugs = new Set(existingList.map((c) => c.slug.toLowerCase()));
  const missing = SUPPORTED_CATEGORIES.filter((c) => c.slug !== 'all' && !existingSlugs.has(c.slug.toLowerCase()));

  if (missing.length > 0) {
    const toInsert = missing.map((c, idx) => ({
      name: c.name,
      slug: c.slug,
      description: c.description,
      display_order: existingList.length + idx + 1,
    }));

    const { data: inserted, error: insertError } = await dbClient
      .from('categories')
      .insert(toInsert)
      .select('*');

    if (!insertError && inserted) {
      return [...existingList, ...inserted];
    }
  }

  return existingList;
};

/**
 * Helper to fetch a provider's profile by their user_id
 */
export const getProviderProfileByUserId = async (userId) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const { data, error } = await dbClient
    .from('provider_profiles')
    .select('*, primary_category:categories(*), user:users!user_id(id, full_name, email, phone, avatar_url)')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
};

/**
 * Get authenticated provider's own profile
 */
export const getMyProfile = async (userId) => {
  const profile = await getProviderProfileByUserId(userId);
  if (!profile) {
    const error = new Error('Provider profile not found for this user account');
    error.statusCode = 404;
    throw error;
  }
  return profile;
};

/**
 * Update authenticated provider's own profile
 * Providers CANNOT approve themselves or modify approval status.
 */
export const updateMyProfile = async (userId, updateData) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const existingProfile = await getProviderProfileByUserId(userId);
  if (!existingProfile) {
    const error = new Error('Provider profile not found');
    error.statusCode = 404;
    throw error;
  }

  const updates = {};

  if (updateData.business_name !== undefined) updates.business_name = updateData.business_name;
  if (updateData.bio !== undefined) updates.bio = updateData.bio;
  if (updateData.city !== undefined) updates.city = updateData.city;
  if (updateData.address !== undefined) updates.address = updateData.address;
  if (updateData.experience_years !== undefined) updates.experience_years = updateData.experience_years;
  if (updateData.starting_price !== undefined) updates.starting_price = updateData.starting_price;
  if (updateData.social_links !== undefined) updates.social_links = updateData.social_links;

  // Resolve category if provided
  if (updateData.category) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(updateData.category);
    let categoryRecord = null;
    if (isUUID) {
      const { data } = await dbClient.from('categories').select('id').eq('id', updateData.category).maybeSingle();
      categoryRecord = data;
    } else {
      const slug = slugify(updateData.category);
      const { data } = await dbClient.from('categories').select('id').or(`slug.eq.${slug},name.ilike.${updateData.category}`).maybeSingle();
      categoryRecord = data;
    }

    if (categoryRecord) {
      updates.primary_category_id = categoryRecord.id;
    } else {
      const error = new Error(`Category '${updateData.category}' not found`);
      error.statusCode = 400;
      throw error;
    }
  }

  // Update avatar_url in public.users if provided
  if (updateData.avatar_url !== undefined) {
    await dbClient
      .from('users')
      .update({ avatar_url: updateData.avatar_url })
      .eq('id', userId);
  }

  // Apply updates to provider_profiles
  const { data: updatedProfile, error: updateError } = await dbClient
    .from('provider_profiles')
    .update(updates)
    .eq('id', existingProfile.id)
    .select('*, primary_category:categories(*), user:users!user_id(id, full_name, email, phone, avatar_url)')
    .single();

  if (updateError) {
    const error = new Error('Failed to update provider profile: ' + updateError.message);
    error.statusCode = 500;
    throw error;
  }

  return updatedProfile;
};

/**
 * Public browsing: list all APPROVED providers with filtering
 */
export const getPublicProviders = async ({
  category,
  city,
  location,
  minPrice,
  maxPrice,
  search,
  sortBy = 'recommended',
  page = 1,
  limit = 24,
}) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  // Base query: ONLY APPROVED providers are visible to public
  let query = dbClient
    .from('provider_profiles')
    .select('id, user_id, business_name, bio, city, address, experience_years, starting_price, rating, reviews_count, approval_status, social_links, created_at, primary_category:categories(id, name, slug, description, icon_url), user:users!user_id(id, full_name, avatar_url)', { count: 'exact' })
    .eq('approval_status', 'approved');

  // Filter by category (slug, name, or id; ignore 'all' or empty)
  if (category && category.toLowerCase() !== 'all' && category.toLowerCase() !== 'all services') {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(category);
    if (isUUID) {
      query = query.eq('primary_category_id', category);
    } else {
      const slug = slugify(category);
      const { data: catRecord } = await dbClient
        .from('categories')
        .select('id')
        .or(`slug.eq.${slug},name.ilike.${category}`)
        .maybeSingle();

      if (catRecord) {
        query = query.eq('primary_category_id', catRecord.id);
      } else {
        // If non-existent category queried, return empty result
        return {
          total: 0,
          page: Number(page),
          limit: Number(limit),
          totalPages: 0,
          providers: [],
        };
      }
    }
  }

  // Filter by city / location (ignore 'all locations' or empty)
  const cityFilter = city || location;
  if (cityFilter && cityFilter.toLowerCase() !== 'all locations' && cityFilter.toLowerCase() !== 'all') {
    query = query.ilike('city', `%${cityFilter.trim()}%`);
  }

  // Filter by price range
  if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
    const min = parseFloat(minPrice);
    if (!isNaN(min)) {
      query = query.gte('starting_price', min);
    }
  }

  if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
    const max = parseFloat(maxPrice);
    if (!isNaN(max)) {
      query = query.lte('starting_price', max);
    }
  }

  // Search keyword in business_name or bio
  if (search && search.trim()) {
    query = query.or(`business_name.ilike.%${search.trim()}%,bio.ilike.%${search.trim()}%`);
  }

  // Sorting and pagination
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 24));
  const offset = (pageNum - 1) * limitNum;

  if (sortBy === 'price-asc') {
    query = query.order('starting_price', { ascending: true });
  } else if (sortBy === 'price-desc') {
    query = query.order('starting_price', { ascending: false });
  } else if (sortBy === 'rating') {
    query = query.order('rating', { ascending: false }).order('reviews_count', { ascending: false });
  } else {
    // Default 'recommended'
    query = query
      .order('rating', { ascending: false })
      .order('reviews_count', { ascending: false })
      .order('created_at', { ascending: false });
  }

  query = query.range(offset, offset + limitNum - 1);

  const { data: rawProviders, count, error } = await query;

  if (error) {
    const err = new Error('Failed to retrieve providers: ' + error.message);
    err.statusCode = 500;
    throw err;
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / limitNum);
  const providersList = rawProviders || [];

  // Batch-fetch services and portfolios to enrich provider DTOs
  const providerIds = providersList.map((p) => p.id);
  const servicesMap = new Map();
  const portfoliosMap = new Map();

  if (providerIds.length > 0) {
    const { data: allServices } = await dbClient
      .from('services')
      .select('id, provider_id, title, description, price, pricing_model, duration_hours')
      .in('provider_id', providerIds)
      .eq('is_active', true);

    (allServices || []).forEach((s) => {
      if (!servicesMap.has(s.provider_id)) servicesMap.set(s.provider_id, []);
      servicesMap.get(s.provider_id).push(s);
    });

    const { data: allPortfolios } = await dbClient
      .from('provider_portfolios')
      .select('id, provider_id, image_url, title, caption, is_featured, display_order')
      .in('provider_id', providerIds)
      .order('display_order', { ascending: true });

    (allPortfolios || []).forEach((p) => {
      if (!portfoliosMap.has(p.provider_id)) portfoliosMap.set(p.provider_id, []);
      portfoliosMap.get(p.provider_id).push(p);
    });
  }

  const formattedProviders = providersList.map((p) =>
    formatPublicProviderDTO(p, servicesMap.get(p.id) || [], portfoliosMap.get(p.id) || [])
  );

  return {
    total,
    page: pageNum,
    limit: limitNum,
    totalPages,
    providers: formattedProviders,
  };
};

/**
 * Public details for a specific provider by ID.
 * Returns provider profile, active services, and portfolio items.
 * If provider is unapproved, only the provider themselves or an admin can view.
 */
export const getPublicProviderById = async (providerId, requestingUser = null) => {
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
    .select('*, primary_category:categories(*), user:users!user_id(id, full_name, avatar_url)')
    .or(`id.eq.${providerId},user_id.eq.${providerId}`)
    .maybeSingle();

  if (error || !provider) {
    const notFoundError = new Error('Provider not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  // Approval status check:
  // If not approved, only the provider themselves or an admin may view it
  const isOwner = requestingUser && requestingUser.id === provider.user_id;
  const isAdmin = requestingUser && requestingUser.role === 'admin';

  if (provider.approval_status !== 'approved' && !isOwner && !isAdmin) {
    const notFoundError = new Error('Provider not found or not approved');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  // Fetch active services
  const { data: services } = await dbClient
    .from('services')
    .select('id, title, description, price, pricing_model, duration_hours, is_active, category:categories(id, name, slug)')
    .eq('provider_id', provider.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  // Fetch portfolio items
  const { data: portfolios } = await dbClient
    .from('provider_portfolios')
    .select('id, image_url, title, caption, is_featured, display_order, created_at')
    .eq('provider_id', provider.id)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  // Fetch blackout dates
  const { data: availabilities } = await dbClient
    .from('provider_availability')
    .select('date')
    .eq('provider_id', provider.id)
    .eq('is_available', false);

  const unavailableDates = (availabilities || []).map((a) => a.date);

  return formatPublicProviderDTO(provider, services || [], portfolios || [], unavailableDates);
};

/**
 * Public portfolio listing for an approved provider
 */
export const getProviderPortfolioPublic = async (providerId) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(providerId);
  if (!isUUID) {
    const error = new Error('Invalid provider ID format');
    error.statusCode = 400;
    throw error;
  }

  // Verify provider exists and is approved, resolving by either provider_profiles.id or user_id
  const { data: provider } = await dbClient
    .from('provider_profiles')
    .select('id, approval_status')
    .or(`id.eq.${providerId},user_id.eq.${providerId}`)
    .maybeSingle();

  if (!provider || provider.approval_status !== 'approved') {
    const error = new Error('Provider not found or not approved');
    error.statusCode = 404;
    throw error;
  }

  const { data: portfolios, error } = await dbClient
    .from('provider_portfolios')
    .select('*')
    .eq('provider_id', provider.id)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    const err = new Error('Failed to retrieve portfolio: ' + error.message);
    err.statusCode = 500;
    throw err;
  }

  return portfolios || [];
};

/**
 * Public availability schedule for an approved provider
 */
export const getProviderAvailabilityPublic = async (providerId, { startDate, endDate }) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(providerId);
  if (!isUUID) {
    const error = new Error('Invalid provider ID format');
    error.statusCode = 400;
    throw error;
  }

  const { data: provider } = await dbClient
    .from('provider_profiles')
    .select('id, approval_status')
    .or(`id.eq.${providerId},user_id.eq.${providerId}`)
    .maybeSingle();

  if (!provider || provider.approval_status !== 'approved') {
    const error = new Error('Provider not found or not approved');
    error.statusCode = 404;
    throw error;
  }

  let query = dbClient
    .from('provider_availability')
    .select('id, date, start_time, end_time, is_available, reason')
    .eq('provider_id', provider.id);

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  query = query.order('date', { ascending: true }).order('start_time', { ascending: true });

  const { data: availability, error } = await query;

  if (error) {
    const err = new Error('Failed to retrieve availability: ' + error.message);
    err.statusCode = 500;
    throw err;
  }

  return availability || [];
};

import { getSupabaseClient, getSupabaseAdmin } from '../config/supabase.js';
import { slugify } from '../utils/validators.js';

/**
 * Register a new customer
 */
export const registerCustomer = async ({ fullName, email, phone, password, location }) => {
  const anonClient = getSupabaseClient();
  const adminClient = getSupabaseAdmin();
  const dbClient = adminClient || anonClient;

  const cleanEmail = email.toLowerCase().trim();
  const cleanFullName = fullName.trim();
  const cleanPhone = phone.trim();
  const cleanLocation = location.trim();

  // 1. Check if email is already registered in public.users
  const { data: existingUser, error: checkError } = await dbClient
    .from('users')
    .select('id, email')
    .eq('email', cleanEmail)
    .maybeSingle();

  if (existingUser) {
    const error = new Error('Email is already registered. Please login or use a different email.');
    error.statusCode = 409;
    throw error;
  }

  // 2. Register user with Supabase Auth
  let authUser = null;
  let authSession = null;

  if (adminClient?.auth?.admin) {
    const { data: adminData, error: adminErr } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: cleanFullName,
        role: 'customer',
        phone: cleanPhone,
        location: cleanLocation,
      },
    });

    if (!adminErr && adminData?.user) {
      authUser = adminData.user;
    } else if (adminErr && (adminErr.message?.includes('already registered') || adminErr.status === 422)) {
      const error = new Error('Email is already registered. Please login or use a different email.');
      error.statusCode = 409;
      throw error;
    }
  }

  if (!authUser) {
    const { data: authData, error: authError } = await anonClient.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanFullName,
          role: 'customer',
          phone: cleanPhone,
          location: cleanLocation,
        },
      },
    });

    if (authError) {
      if (
        authError.message?.toLowerCase().includes('already registered') ||
        authError.message?.toLowerCase().includes('user already exists') ||
        authError.status === 422
      ) {
        const error = new Error('Email is already registered. Please login or use a different email.');
        error.statusCode = 409;
        throw error;
      }
      const error = new Error(authError.message);
      error.statusCode = authError.status || 400;
      throw error;
    }

    authUser = authData.user;
    authSession = authData.session;
  }
  if (!authUser) {
    const error = new Error('Failed to create customer authentication record.');
    error.statusCode = 500;
    throw error;
  }

  // Supabase returns an empty identities array if user already existed and email confirm is on
  if (authUser.identities && authUser.identities.length === 0) {
    const error = new Error('Email is already registered. Please login or use a different email.');
    error.statusCode = 409;
    throw error;
  }

  // 3. Ensure public.users record exists and has phone updated
  // The PostgreSQL trigger on_auth_user_created populates id, email, full_name, role.
  // We perform an upsert to guarantee phone and location metadata are synced.
  try {
    await dbClient
      .from('users')
      .upsert({
        id: authUser.id,
        email: cleanEmail,
        full_name: cleanFullName,
        phone: cleanPhone,
        role: 'customer',
        is_active: true,
      }, { onConflict: 'id' });
  } catch (syncErr) {
    console.warn('[AuthService] Notice on public.users sync:', syncErr.message);
  }

  // 4. Session resolution
  let session = authSession;

  // If email confirmation is enabled in Supabase and service role key is present,
  // auto-confirm user to allow immediate testing and session generation
  if (!session && process.env.SUPABASE_SERVICE_ROLE_KEY && adminClient?.auth?.admin) {
    try {
      await adminClient.auth.admin.updateUserById(authUser.id, { email_confirm: true });
      const { data: loginData } = await anonClient.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (loginData?.session) {
        session = loginData.session;
      }
    } catch (adminErr) {
      console.warn('[AuthService] Could not auto-confirm user:', adminErr.message);
    }
  }

  return {
    success: true,
    message: session
      ? 'Customer registered successfully'
      : 'Customer registered successfully. Please verify your email to log in.',
    token: session?.access_token || null,
    session: session
      ? {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          expires_in: session.expires_in,
          token_type: session.token_type,
        }
      : null,
    user: {
      id: authUser.id,
      email: cleanEmail,
      fullName: cleanFullName,
      phone: cleanPhone,
      role: 'customer',
      location: cleanLocation,
      isActive: true,
      createdAt: authUser.created_at,
    },
  };
};

/**
 * Register a new provider
 */
export const registerProvider = async ({
  name,
  businessName,
  email,
  phone,
  password,
  location,
  category,
  address,
  bio,
  experienceYears,
  startingPrice,
}) => {
  const anonClient = getSupabaseClient();
  const adminClient = getSupabaseAdmin();
  const dbClient = adminClient || anonClient;

  const cleanEmail = email.toLowerCase().trim();
  const cleanName = name.trim();
  const cleanBusinessName = businessName.trim();
  const cleanPhone = phone.trim();
  const cleanLocation = location.trim();
  const cleanAddress = (address || cleanLocation).trim();
  const categoryInput = category.trim();

  // 1. Check if email is already registered in public.users
  const { data: existingUser } = await dbClient
    .from('users')
    .select('id, email')
    .eq('email', cleanEmail)
    .maybeSingle();

  if (existingUser) {
    const error = new Error('Email is already registered. Please login or use a different email.');
    error.statusCode = 409;
    throw error;
  }

  // 2. Resolve category from public.categories
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(categoryInput);

  let categoryRecord = null;
  if (isUUID) {
    const { data } = await dbClient
      .from('categories')
      .select('id, name, slug')
      .eq('id', categoryInput)
      .maybeSingle();
    categoryRecord = data;
  } else {
    const categorySlug = slugify(categoryInput);
    const { data } = await dbClient
      .from('categories')
      .select('id, name, slug')
      .or(`slug.eq.${categorySlug},name.ilike.${categoryInput}`)
      .maybeSingle();
    categoryRecord = data;
  }

  // If category not found, check if we can insert it or return available categories
  if (!categoryRecord) {
    if (adminClient) {
      const categorySlug = slugify(categoryInput) || 'general-provider';
      const { data: newCat, error: insertCatErr } = await adminClient
        .from('categories')
        .insert({
          name: categoryInput,
          slug: categorySlug,
          description: `Category for ${categoryInput}`,
        })
        .select('id, name, slug')
        .maybeSingle();

      if (!insertCatErr && newCat) {
        categoryRecord = newCat;
      }
    }

    if (!categoryRecord) {
      const { data: availableCats } = await dbClient
        .from('categories')
        .select('name, slug')
        .limit(10);
      const catList = (availableCats || []).map((c) => c.name).join(', ');
      const msg = catList
        ? `Provider category '${categoryInput}' not found. Available categories: ${catList}`
        : `Provider category '${categoryInput}' not found. Please populate public.categories table first.`;
      const error = new Error(msg);
      error.statusCode = 400;
      throw error;
    }
  }

  // 3. Register user with Supabase Auth
  let authUser = null;
  let authSession = null;

  if (adminClient?.auth?.admin) {
    const { data: adminData, error: adminErr } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: cleanName,
        role: 'provider',
        phone: cleanPhone,
        location: cleanLocation,
        business_name: cleanBusinessName,
      },
    });

    if (!adminErr && adminData?.user) {
      authUser = adminData.user;
    } else if (adminErr && (adminErr.message?.includes('already registered') || adminErr.status === 422)) {
      const error = new Error('Email is already registered. Please login or use a different email.');
      error.statusCode = 409;
      throw error;
    }
  }

  if (!authUser) {
    const { data: authData, error: authError } = await anonClient.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName,
          role: 'provider',
          phone: cleanPhone,
          location: cleanLocation,
          business_name: cleanBusinessName,
        },
      },
    });

    if (authError) {
      if (
        authError.message?.toLowerCase().includes('already registered') ||
        authError.message?.toLowerCase().includes('user already exists') ||
        authError.status === 422
      ) {
        const error = new Error('Email is already registered. Please login or use a different email.');
        error.statusCode = 409;
        throw error;
      }
      const error = new Error(authError.message);
      error.statusCode = authError.status || 400;
      throw error;
    }

    authUser = authData.user;
    authSession = authData.session;
  }
  if (!authUser) {
    const error = new Error('Failed to create provider authentication record.');
    error.statusCode = 500;
    throw error;
  }

  if (authUser.identities && authUser.identities.length === 0) {
    const error = new Error('Email is already registered. Please login or use a different email.');
    error.statusCode = 409;
    throw error;
  }

  // 4. Ensure public.users has role 'provider' and phone
  try {
    await dbClient
      .from('users')
      .upsert({
        id: authUser.id,
        email: cleanEmail,
        full_name: cleanName,
        phone: cleanPhone,
        role: 'provider',
        is_active: true,
      }, { onConflict: 'id' });
  } catch (syncErr) {
    console.warn('[AuthService] Notice on public.users sync:', syncErr.message);
  }

  // 5. Create provider profile in public.provider_profiles
  const { data: providerProfile, error: profileErr } = await dbClient
    .from('provider_profiles')
    .upsert({
      user_id: authUser.id,
      primary_category_id: categoryRecord.id,
      business_name: cleanBusinessName,
      city: cleanLocation,
      address: cleanAddress,
      bio: bio || null,
      experience_years: experienceYears ? parseInt(experienceYears, 10) : 0,
      starting_price: startingPrice ? parseFloat(startingPrice) : 0.0,
      approval_status: 'pending',
    }, { onConflict: 'user_id' })
    .select('*, primary_category:categories(*)')
    .single();

  if (profileErr) {
    console.error('[AuthService] Error creating provider profile:', profileErr);
    const error = new Error('Failed to create provider profile: ' + profileErr.message);
    error.statusCode = 500;
    throw error;
  }

  // 6. Session resolution
  let session = authSession;

  if (!session && process.env.SUPABASE_SERVICE_ROLE_KEY && adminClient?.auth?.admin) {
    try {
      await adminClient.auth.admin.updateUserById(authUser.id, { email_confirm: true });
      const { data: loginData } = await anonClient.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });
      if (loginData?.session) {
        session = loginData.session;
      }
    } catch (adminErr) {
      console.warn('[AuthService] Could not auto-confirm provider:', adminErr.message);
    }
  }

  return {
    success: true,
    message: session
      ? 'Provider registered successfully'
      : 'Provider registered successfully. Please verify your email to log in.',
    token: session?.access_token || null,
    session: session
      ? {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          expires_in: session.expires_in,
          token_type: session.token_type,
        }
      : null,
    user: {
      id: authUser.id,
      email: cleanEmail,
      fullName: cleanName,
      phone: cleanPhone,
      role: 'provider',
      location: cleanLocation,
      isActive: true,
      createdAt: authUser.created_at,
      providerProfile: {
        id: providerProfile.id,
        businessName: providerProfile.business_name,
        city: providerProfile.city,
        address: providerProfile.address,
        approvalStatus: providerProfile.approval_status,
        experienceYears: providerProfile.experience_years,
        startingPrice: providerProfile.starting_price,
        rating: providerProfile.rating,
        reviewsCount: providerProfile.reviews_count,
        category: {
          id: categoryRecord.id,
          name: categoryRecord.name,
          slug: categoryRecord.slug,
        },
      },
    },
  };
};

/**
 * Login user (Customer, Provider, or Admin)
 */
export const login = async ({ email, password }) => {
  const anonClient = getSupabaseClient();
  const adminClient = getSupabaseAdmin();
  const dbClient = adminClient || anonClient;

  const cleanEmail = (email || '').toLowerCase().trim();

  if (!cleanEmail || !password) {
    const error = new Error('Email and password are required');
    error.statusCode = 400;
    throw error;
  }

  // 1. Authenticate with Supabase Auth
  const { data: authData, error: authError } = await anonClient.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (authError) {
    console.error('[Login Debug] Supabase Auth Error:', {
      email: cleanEmail,
      status: authError.status,
      code: authError.code,
      message: authError.message
    });
    if (authError.message?.toLowerCase().includes('email not confirmed')) {
      const error = new Error('Email is not confirmed. Please verify your email before logging in.');
      error.statusCode = 401;
      throw error;
    }
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const session = authData.session;
  const authUser = authData.user;

  if (!session || !authUser) {
    const error = new Error('Authentication session could not be established.');
    error.statusCode = 500;
    throw error;
  }

  // 2. Fetch user profile from public.users
  let { data: userProfile } = await dbClient
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  // If user profile is not in public.users, create it from auth metadata
  if (!userProfile) {
    const { data: createdProfile } = await dbClient
      .from('users')
      .insert({
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
        role: authUser.user_metadata?.role || 'customer',
        phone: authUser.user_metadata?.phone || null,
        is_active: true,
      })
      .select('*')
      .maybeSingle();
    userProfile = createdProfile;
  }

  // 3. Verify user is active
  if (userProfile && userProfile.is_active === false) {
    const error = new Error('User account is deactivated. Please contact support.');
    error.statusCode = 403;
    throw error;
  }

  // 4. If provider, fetch provider profile details
  let providerProfile = null;
  if (userProfile?.role === 'provider') {
    const { data: pProfile } = await dbClient
      .from('provider_profiles')
      .select('*, primary_category:categories(*)')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (pProfile) {
      providerProfile = {
        id: pProfile.id,
        businessName: pProfile.business_name,
        city: pProfile.city,
        address: pProfile.address,
        approvalStatus: pProfile.approval_status,
        experienceYears: pProfile.experience_years,
        startingPrice: pProfile.starting_price,
        rating: pProfile.rating,
        reviewsCount: pProfile.reviews_count,
        category: pProfile.primary_category
          ? {
              id: pProfile.primary_category.id,
              name: pProfile.primary_category.name,
              slug: pProfile.primary_category.slug,
            }
          : null,
      };
    }
  }

  return {
    success: true,
    message: 'Login successful',
    token: session.access_token,
    session: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      token_type: session.token_type,
    },
    user: {
      id: userProfile?.id || authUser.id,
      email: userProfile?.email || authUser.email,
      fullName: userProfile?.full_name || authUser.user_metadata?.full_name || '',
      phone: userProfile?.phone || authUser.user_metadata?.phone || null,
      role: userProfile?.role || authUser.user_metadata?.role || 'customer',
      avatarUrl: userProfile?.avatar_url || null,
      location: authUser.user_metadata?.location || (providerProfile ? providerProfile.city : null),
      isActive: userProfile?.is_active ?? true,
      createdAt: userProfile?.created_at || authUser.created_at,
      providerProfile,
    },
  };
};

/**
 * Logout current session
 */
export const logout = async (token = null) => {
  try {
    const anonClient = getSupabaseClient();
    if (anonClient && token) {
      await anonClient.auth.signOut();
    }
  } catch (err) {
    // If Supabase client not initialized or token expired, ignore
  }
  return {
    success: true,
    message: 'Logged out successfully',
  };
};

/**
 * Get profile for authenticated user
 */
export const getUserProfile = async (userId, authUser = null) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const { data: userProfile, error } = await dbClient
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error || !userProfile) {
    const notFoundError = new Error('User profile not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  let providerProfile = null;
  if (userProfile.role === 'provider') {
    const { data: pProfile } = await dbClient
      .from('provider_profiles')
      .select('*, primary_category:categories(*)')
      .eq('user_id', userId)
      .maybeSingle();

    if (pProfile) {
      providerProfile = {
        id: pProfile.id,
        businessName: pProfile.business_name,
        city: pProfile.city,
        address: pProfile.address,
        approvalStatus: pProfile.approval_status,
        experienceYears: pProfile.experience_years,
        startingPrice: pProfile.starting_price,
        rating: pProfile.rating,
        reviewsCount: pProfile.reviews_count,
        category: pProfile.primary_category
          ? {
              id: pProfile.primary_category.id,
              name: pProfile.primary_category.name,
              slug: pProfile.primary_category.slug,
            }
          : null,
      };
    }
  }

  return {
    id: userProfile.id,
    email: userProfile.email,
    fullName: userProfile.full_name,
    phone: userProfile.phone,
    role: userProfile.role,
    avatarUrl: userProfile.avatar_url,
    location: authUser?.user_metadata?.location || (providerProfile ? providerProfile.city : null),
    isActive: userProfile.is_active,
    createdAt: userProfile.created_at,
    updatedAt: userProfile.updated_at,
    providerProfile,
  };
};

/**
 * Update authenticated user profile (Customer or Provider)
 */
export const updateUserProfile = async (userId, updateData, authUser = null) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  // 1. Build db update payload for public.users
  const dbPayload = {};
  if (updateData.fullName !== undefined) {
    const cleanName = String(updateData.fullName).trim();
    if (cleanName.length > 0) dbPayload.full_name = cleanName;
  }
  if (updateData.phone !== undefined) {
    dbPayload.phone = String(updateData.phone).trim();
  }
  if (updateData.avatarUrl !== undefined) {
    dbPayload.avatar_url = updateData.avatarUrl;
  }

  if (Object.keys(dbPayload).length > 0) {
    dbPayload.updated_at = new Date().toISOString();
    const { error: dbError } = await dbClient
      .from('users')
      .update(dbPayload)
      .eq('id', userId);

    if (dbError) {
      const err = new Error('Failed to update user profile: ' + dbError.message);
      err.statusCode = 500;
      throw err;
    }
  }

  // 2. Synchronize user metadata in Supabase Auth if admin client is available
  const authMetadata = {};
  if (updateData.fullName !== undefined) authMetadata.full_name = String(updateData.fullName).trim();
  if (updateData.phone !== undefined) authMetadata.phone = String(updateData.phone).trim();
  if (updateData.location !== undefined) authMetadata.location = String(updateData.location).trim();

  if (adminClient && Object.keys(authMetadata).length > 0) {
    try {
      await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: authMetadata,
      });
    } catch (e) {
      // Non-fatal
    }
  }

  // 3. Return updated profile
  return getUserProfile(userId, {
    ...authUser,
    user_metadata: {
      ...(authUser?.user_metadata || {}),
      ...authMetadata,
    },
  });
};

/**
 * Refresh user session using refresh token
 */
export const refreshSession = async (refreshToken) => {
  if (!refreshToken || typeof refreshToken !== 'string') {
    const error = new Error('Refresh token is required');
    error.statusCode = 400;
    throw error;
  }

  const anonClient = getSupabaseClient();
  if (!anonClient) {
    const error = new Error('Supabase client not initialized');
    error.statusCode = 500;
    throw error;
  }

  const { data, error } = await anonClient.auth.refreshSession({
    refresh_token: refreshToken.trim(),
  });

  if (error || !data?.session || !data?.user) {
    const err = new Error(error?.message || 'Invalid or expired refresh token');
    err.statusCode = 401;
    throw err;
  }

  const session = data.session;
  const authUser = data.user;
  const userProfile = await getUserProfile(authUser.id, authUser);

  return {
    success: true,
    message: 'Session refreshed successfully',
    token: session.access_token,
    session: {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
      token_type: session.token_type,
    },
    user: userProfile,
  };
};

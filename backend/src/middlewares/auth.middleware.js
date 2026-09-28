import { getSupabaseClient, getSupabaseAdmin } from '../config/supabase.js';

/**
 * Middleware to authenticate requests using Supabase Auth JWT
 * Extracts Bearer token, validates it against Supabase, and attaches user to req.user
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required. Authorization header is missing.',
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid token format. Expected format: Bearer <token>',
      });
    }

    const token = parts[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'JWT token is missing.',
      });
    }

    let anonClient;
    try {
      anonClient = getSupabaseClient();
    } catch (cfgErr) {
      return res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: cfgErr.message,
      });
    }

    // Validate JWT using Supabase Auth
    const { data: authData, error: authError } = await anonClient.auth.getUser(token);

    if (authError || !authData?.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired JWT token',
      });
    }

    const authUser = authData.user;
    const dbClient = getSupabaseAdmin() || anonClient;

    // Fetch user profile from public.users table
    let { data: userProfile, error: profileError } = await dbClient
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    // Auto-heal if trigger hasn't completed or was delayed
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

    if (!userProfile) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User profile not found in public.users',
      });
    }

    // Check if user is active
    if (userProfile.is_active === false) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'User account is deactivated. Please contact support.',
      });
    }

    // If role is provider, attach provider profile
    let providerProfile = null;
    if (userProfile.role === 'provider') {
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

    // Attach user information to request
    req.user = {
      id: userProfile.id,
      email: userProfile.email,
      fullName: userProfile.full_name,
      phone: userProfile.phone,
      role: userProfile.role,
      avatarUrl: userProfile.avatar_url,
      location: authUser.user_metadata?.location || (providerProfile ? providerProfile.city : null),
      isActive: userProfile.is_active,
      createdAt: userProfile.created_at,
      updatedAt: userProfile.updated_at,
      providerProfile,
    };
    req.authUser = authUser;
    req.token = token;

    next();
  } catch (error) {
    console.error('[AuthMiddleware] Error during authentication:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'Authentication error',
    });
  }
};

/**
 * Reusable role-checking middleware factory
 * @param  {...string} allowedRoles - 'customer', 'provider', 'admin'
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required. User not identified.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: `Unauthorized access: Role '${req.user.role}' is not authorized to access this resource. Required role(s): ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};

// Aliases and convenience shortcuts
export const requireRole = authorizeRoles;
export const requireCustomer = authorizeRoles('customer');
export const requireProvider = authorizeRoles('provider');
export const requireAdmin = authorizeRoles('admin');

/**
 * Optional authentication middleware:
 * Attaches req.user if valid token provided; continues as guest if no token provided.
 */
export const authenticateOptional = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next();
    }

    const anonClient = getSupabaseClient();
    const { data: authData, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !authData?.user) {
      return next();
    }

    const dbClient = getSupabaseAdmin() || anonClient;
    const { data: userProfile } = await dbClient
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (userProfile && userProfile.is_active !== false) {
      let providerProfile = null;
      if (userProfile.role === 'provider') {
        const { data: pProfile } = await dbClient
          .from('provider_profiles')
          .select('id, business_name, approval_status')
          .eq('user_id', authData.user.id)
          .maybeSingle();
        providerProfile = pProfile;
      }

      req.user = {
        id: userProfile.id,
        email: userProfile.email,
        fullName: userProfile.full_name,
        role: userProfile.role,
        isActive: userProfile.is_active,
        providerProfile,
      };
      req.authUser = authData.user;
      req.token = token;
    }

    next();
  } catch (err) {
    // Silently continue as unauthenticated guest if optional auth encounters error
    next();
  }
};


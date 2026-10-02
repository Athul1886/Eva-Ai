import { getSupabaseClient, getSupabaseAdmin } from '../config/supabase.js';
import * as eventService from './event.service.js';

/**
 * Category synonym mapping to map common colloquial or alternate terms
 * to known category slugs in database.
 */
export const CATEGORY_SYNONYMS = {
  photography: ['photography', 'photographer', 'photographers', 'photo', 'camera', 'videographer', 'videographers', 'videography', 'cinematography', 'photos'],
  venue: ['venue', 'venues', 'hall', 'halls', 'auditorium', 'auditoriums', 'palace', 'palaces', 'resort', 'resorts', 'convention', 'ballroom', 'venue-auditorium', 'venue / auditorium'],
  catering: ['catering', 'caterer', 'caterers', 'food', 'sadya', 'buffet', 'feast', 'dinner', 'lunch', 'meals'],
  decoration: ['decoration', 'decorations', 'decor', 'decorator', 'decorators', 'stage', 'floral', 'flowers', 'mandap'],
  'makeup-artist': ['makeup', 'make up', 'makeup artist', 'beautician', 'beauticians', 'bridal makeover', 'grooming', 'hair styling', 'hair', 'beauty'],
  dj: ['dj', 'djs', 'entertainment', 'music', 'band', 'sound', 'orchestra', 'dj & entertainment', 'dj / entertainment', 'dj-entertainment'],
  'event-manager': ['event management', 'event manager', 'event managers', 'planner', 'planners', 'coordinator', 'planning', 'management'],
};

/**
 * Normalizes DB / alternate category labels to standard display category names
 */
export const normalizeCategoryDisplayName = (categoryName, fallback = 'General Service') => {
  if (!categoryName) return fallback;
  const lower = categoryName.toLowerCase();
  if (lower.includes('photo')) return 'Photography';
  if (lower.includes('venue') || lower.includes('auditorium') || lower.includes('hall')) return 'Venue / Auditorium';
  if (lower.includes('cater')) return 'Catering';
  if (lower.includes('decor')) return 'Decoration';
  if (lower.includes('makeup')) return 'Makeup Artist';
  if (lower.includes('dj') || lower.includes('entertain')) return 'DJ / Entertainment';
  if (lower.includes('event') || lower.includes('plan')) return 'Event Management';
  return categoryName;
};

/**
 * Resolves a category search string or synonym into matching category IDs from DB.
 */
export const resolveCategoryIds = async (dbClient, categoryTerm) => {
  if (!categoryTerm || typeof categoryTerm !== 'string') return [];
  const term = categoryTerm.trim().toLowerCase();
  if (term === 'all' || term === 'all services') return [];

  // Check if it's already a UUID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(term);
  if (isUUID) {
    const { data } = await dbClient.from('categories').select('id').eq('id', term).maybeSingle();
    return data ? [data.id] : [];
  }

  // Find synonym canonical keys
  const searchTerms = [term];
  for (const [canonical, synonyms] of Object.entries(CATEGORY_SYNONYMS)) {
    if (synonyms.some((syn) => term.includes(syn) || syn.includes(term))) {
      searchTerms.push(canonical);
      searchTerms.push(...synonyms);
    }
  }

  const { data: allCategories, error } = await dbClient
    .from('categories')
    .select('id, name, slug');

  if (error || !allCategories) return [];

  const matched = new Set();
  for (const cat of allCategories) {
    const catName = (cat.name || '').toLowerCase();
    const catSlug = (cat.slug || '').toLowerCase();

    for (const st of searchTerms) {
      const s = st.toLowerCase();
      if (catName.includes(s) || catSlug.includes(s) || s.includes(catName) || s.includes(catSlug)) {
        matched.add(cat.id);
      }
    }
  }

  return Array.from(matched);
};

/**
 * Reusable recommendation query function
 * Strictly returns REAL providers and services from Supabase.
 * Strictly enforces approval_status === 'approved'.
 */
export const getRecommendations = async ({
  eventId,
  category,
  categoryId,
  location,
  city,
  maxPrice,
  budget,
  minPrice,
  minRating,
  minExperience,
  guestCount,
  limit = 10,
  user = null,
  returnAllPackages = false,
} = {}) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  let eventContext = null;

  // 1. If eventId is provided, validate event existence and customer ownership
  if (eventId) {
    eventContext = await eventService.getEventById(eventId, user);
  }

  // Determine effective search parameters, falling back to event context if available
  const effectiveCity = (city || location || (eventContext ? eventContext.location || eventContext.city : '') || '').trim();
  const effectiveCategoryTerm = (category || categoryId || '').trim();
  const effectiveMaxPrice = maxPrice !== undefined && maxPrice !== null && maxPrice !== ''
    ? parseFloat(maxPrice)
    : (budget !== undefined && budget !== null && budget !== '' ? parseFloat(budget) : (eventContext && eventContext.budget ? parseFloat(eventContext.budget) : null));
  const effectiveMinPrice = minPrice !== undefined && minPrice !== null && minPrice !== '' ? parseFloat(minPrice) : null;
  const effectiveMinRating = minRating !== undefined && minRating !== null && minRating !== '' ? parseFloat(minRating) : null;
  const effectiveMinExperience = minExperience !== undefined && minExperience !== null && minExperience !== '' ? parseInt(minExperience, 10) : null;
  const limitNum = Math.min(20, Math.max(1, parseInt(limit, 10) || 10));

  // 2. Resolve category IDs if category is queried
  let matchedCategoryIds = [];
  if (effectiveCategoryTerm && effectiveCategoryTerm.toLowerCase() !== 'all') {
    matchedCategoryIds = await resolveCategoryIds(dbClient, effectiveCategoryTerm);
    if (matchedCategoryIds.length === 0) {
      // If user queried a specific category that does not exist in DB, return empty safely (NO hallucination)
      return {
        success: true,
        total: 0,
        recommendations: [],
        eventContext: eventContext
          ? {
              id: eventContext.id,
              eventType: eventContext.eventType,
              location: eventContext.location,
              budget: eventContext.budget,
              guestCount: eventContext.guestCount,
            }
          : null,
      };
    }
  }

  // 3. Build Query for provider_profiles
  // MANDATORY: ONLY APPROVED and ACTIVE providers are ever recommended!
  let query = dbClient
    .from('provider_profiles')
    .select(`
      id,
      user_id,
      business_name,
      bio,
      city,
      address,
      experience_years,
      starting_price,
      rating,
      reviews_count,
      approval_status,
      primary_category_id,
      primary_category:categories(id, name, slug),
      user:users!user_id(id, is_active)
    `)
    .eq('approval_status', 'approved');

  // Filter by category if resolved
  if (matchedCategoryIds.length > 0) {
    query = query.in('primary_category_id', matchedCategoryIds);
  }

  // Filter by location / city (case-insensitive substring match)
  if (effectiveCity && effectiveCity.toLowerCase() !== 'all' && effectiveCity.toLowerCase() !== 'all locations') {
    query = query.ilike('city', `%${effectiveCity}%`);
  }

  // Filter by experience
  if (effectiveMinExperience !== null && !isNaN(effectiveMinExperience) && effectiveMinExperience > 0) {
    query = query.gte('experience_years', effectiveMinExperience);
  }

  // Filter by rating
  if (effectiveMinRating !== null && !isNaN(effectiveMinRating) && effectiveMinRating > 0) {
    query = query.gte('rating', effectiveMinRating);
  }

  // Filter by starting_price
  if (effectiveMinPrice !== null && !isNaN(effectiveMinPrice)) {
    query = query.gte('starting_price', effectiveMinPrice);
  }
  if (effectiveMaxPrice !== null && !isNaN(effectiveMaxPrice)) {
    query = query.lte('starting_price', effectiveMaxPrice);
  }

  // Sort by rating desc, reviews_count desc, starting_price asc
  query = query
    .order('rating', { ascending: false })
    .order('reviews_count', { ascending: false })
    .order('starting_price', { ascending: true })
    .limit(limitNum * 2);

  const { data: rawProviders, error: providerError } = await query;

  if (providerError) {
    const err = new Error('Failed to query provider recommendations: ' + providerError.message);
    err.statusCode = 500;
    throw err;
  }

  const providers = rawProviders || [];
  if (providers.length === 0) {
    return {
      success: true,
      total: 0,
      recommendations: [],
      eventContext: eventContext
        ? {
            id: eventContext.id,
            eventType: eventContext.eventType,
            location: eventContext.location,
            budget: eventContext.budget,
            guestCount: eventContext.guestCount,
          }
        : null,
    };
  }

  // 4. Batch-fetch active services for these providers
  const providerIds = providers.map((p) => p.id);
  const { data: allServices, error: servicesError } = await dbClient
    .from('services')
    .select('id, provider_id, category_id, title, description, price, pricing_model, duration_hours, is_active')
    .in('provider_id', providerIds)
    .eq('is_active', true);

  if (servicesError) {
    console.error('[RecommendationService] Error loading services:', servicesError);
  }

  const servicesMap = new Map();
  (allServices || []).forEach((s) => {
    if (!servicesMap.has(s.provider_id)) servicesMap.set(s.provider_id, []);
    servicesMap.get(s.provider_id).push(s);
  });

  // 5. Structure recommendations ensuring real providerId and real serviceId
  const recommendations = [];

  for (const provider of providers) {
    // Only include active provider accounts
    if (provider.user && provider.user.is_active === false) {
      continue;
    }

    let provServices = servicesMap.get(provider.id) || [];

    // If provider has no active services in DB yet, auto-provision standard service so serviceId is valid
    if (provServices.length === 0) {
      try {
        const { data: createdService } = await dbClient
          .from('services')
          .insert({
            provider_id: provider.id,
            category_id: provider.primary_category_id,
            title: 'Standard Service Package',
            price: provider.starting_price || 0,
            is_active: true,
          })
          .select('id, provider_id, category_id, title, description, price, pricing_model, duration_hours, is_active')
          .single();

        if (createdService) {
          provServices = [createdService];
          servicesMap.set(provider.id, provServices);
        }
      } catch (insertErr) {
        // Non-fatal
      }
    }

    // Choose best matching service
    let selectedService = null;

    if (provServices.length > 0) {
      if (effectiveMaxPrice !== null && !isNaN(effectiveMaxPrice)) {
        selectedService = provServices.find((s) => parseFloat(s.price) <= effectiveMaxPrice);
        if (!selectedService && parseFloat(provider.starting_price) <= effectiveMaxPrice) {
          selectedService = provServices[0];
        }
      } else {
        selectedService = provServices[0];
      }
    }

    const displayCity = provider.city
      ? (provider.city.toLowerCase().includes('palakkad') ? 'Palakkad' : provider.city)
      : (effectiveCity || 'Kerala');

    const providerRating = parseFloat(provider.rating) || 0;
    const providerExp = parseInt(provider.experience_years, 10) || 0;
    const providerReviews = parseInt(provider.reviews_count, 10) || 0;
    const qualityScore = (providerRating * 20) + Math.min(providerReviews, 50) * 0.5 + Math.min(providerExp, 20) * 1.0;

    // If returnAllPackages requested, push all packages offered by provider
    if (returnAllPackages && provServices.length > 0) {
      for (const s of provServices) {
        const sPrice = parseFloat(s.price !== undefined ? s.price : provider.starting_price) || 0;
        if (effectiveMaxPrice === null || sPrice <= effectiveMaxPrice) {
          recommendations.push({
            providerId: provider.id,
            serviceId: s.id,
            providerName: provider.business_name,
            serviceName: s.title || 'Standard Service Package',
            category: normalizeCategoryDisplayName(provider.primary_category?.name || effectiveCategoryTerm),
            location: displayCity,
            startingPrice: sPrice,
            rating: providerRating,
            experience: providerExp,
            reviewsCount: providerReviews,
            qualityScore,
          });
        }
      }
    } else if (selectedService) {
      const priceVal = parseFloat(selectedService.price !== undefined ? selectedService.price : provider.starting_price) || 0;

      // If budget specified, ensure price does not violate maxPrice
      if (effectiveMaxPrice === null || priceVal <= effectiveMaxPrice) {
        recommendations.push({
          providerId: provider.id,
          serviceId: selectedService.id,
          providerName: provider.business_name,
          serviceName: selectedService.title || 'Standard Service Package',
          category: normalizeCategoryDisplayName(provider.primary_category?.name || effectiveCategoryTerm),
          location: displayCity,
          startingPrice: priceVal,
          rating: providerRating,
          experience: providerExp,
          reviewsCount: providerReviews,
          qualityScore,
        });
      }
    }

    if (!returnAllPackages && recommendations.length >= limitNum) {
      break;
    }
  }

  return {
    success: true,
    total: recommendations.length,
    recommendations,
    eventContext: eventContext
      ? {
          id: eventContext.id,
          title: eventContext.title,
          eventType: eventContext.eventType,
          location: eventContext.location,
          budget: eventContext.budget,
          guestCount: eventContext.guestCount,
          eventDate: eventContext.eventDate,
          requiredServices: eventContext.requiredServices,
        }
      : null,
  };
};

/**
 * Selects an optimal multi-category combination such that:
 * 1. Exactly one provider/package is selected per category.
 * 2. Total Plan Cost = sum(startingPrice) <= totalBudget.
 * 3. Quality score (rating, reviews, experience) is maximized.
 * 4. If no combination fits, computes minimum required budget, deficit, and costliest services.
 */
export const selectBestPlanCombination = (categoryCandidatesMap, totalBudget) => {
  const categories = Object.keys(categoryCandidatesMap).filter(
    (cat) => Array.isArray(categoryCandidatesMap[cat]) && categoryCandidatesMap[cat].length > 0
  );

  if (categories.length === 0) {
    return {
      selectedPlan: [],
      totalPlanCost: 0,
      remainingBudget: totalBudget || 0,
      isWithinBudget: true,
      budgetDeficit: 0,
      minimumRequiredBudget: 0,
      costliestServices: [],
    };
  }

  // Calculate the absolute minimum possible cost for the plan (cheapest package in each category)
  let minTotalCost = 0;
  const cheapestOptions = {};
  for (const cat of categories) {
    const sortedByPrice = [...categoryCandidatesMap[cat]].sort((a, b) => a.startingPrice - b.startingPrice);
    cheapestOptions[cat] = sortedByPrice[0];
    minTotalCost += sortedByPrice[0].startingPrice;
  }

  // If even the cheapest combination exceeds the total budget:
  if (totalBudget !== null && totalBudget > 0 && minTotalCost > totalBudget) {
    const deficit = minTotalCost - totalBudget;
    const costliestServices = categories
      .map((cat) => cheapestOptions[cat])
      .sort((a, b) => b.startingPrice - a.startingPrice);

    return {
      selectedPlan: Object.values(cheapestOptions),
      totalPlanCost: minTotalCost,
      remainingBudget: 0,
      isWithinBudget: false,
      budgetDeficit: deficit,
      minimumRequiredBudget: minTotalCost,
      costliestServices,
    };
  }

  // Find the optimal combination that fits within totalBudget and maximizes quality score
  let bestCombination = null;
  let bestScore = -1;

  const backtrack = (catIndex, currentCombination, currentCost, currentScore) => {
    if (catIndex === categories.length) {
      if (totalBudget === null || currentCost <= totalBudget) {
        if (currentScore > bestScore) {
          bestScore = currentScore;
          bestCombination = [...currentCombination];
        }
      }
      return;
    }

    const cat = categories[catIndex];
    const candidates = categoryCandidatesMap[cat];

    for (const candidate of candidates) {
      const newCost = currentCost + candidate.startingPrice;
      // Prune combinations that exceed total budget
      if (totalBudget !== null && newCost > totalBudget) {
        continue;
      }
      currentCombination.push(candidate);
      backtrack(catIndex + 1, currentCombination, newCost, currentScore + (candidate.qualityScore || 0));
      currentCombination.pop();
    }
  };

  backtrack(0, [], 0, 0);

  // Fallback to cheapest options if backtracking didn't find a solution
  if (!bestCombination) {
    bestCombination = Object.values(cheapestOptions);
  }

  const totalPlanCost = bestCombination.reduce((sum, item) => sum + item.startingPrice, 0);
  const remainingBudget = totalBudget !== null ? Math.max(0, totalBudget - totalPlanCost) : 0;

  return {
    selectedPlan: bestCombination,
    totalPlanCost,
    remainingBudget,
    isWithinBudget: totalBudget === null || totalPlanCost <= totalBudget,
    budgetDeficit: totalBudget !== null && totalPlanCost > totalBudget ? totalPlanCost - totalBudget : 0,
    minimumRequiredBudget: minTotalCost,
    costliestServices: [],
  };
};

/**
 * Searches multiple categories independently, grouping results by category.
 * Each category is queried separately against the real database.
 * Selects an optimal multi-category combination that strictly satisfies total event budget.
 */
export const getMultiCategoryRecommendations = async ({
  categories = [],
  location,
  city,
  maxPrice,
  budget,
  minPrice,
  minRating,
  minExperience,
  guestCount,
  limitPerCategory = 3,
  user = null,
  eventId = null,
} = {}) => {
  // Deduplicate requested categories
  const seenNorm = new Set();
  const targetCategories = (Array.isArray(categories) ? categories : [])
    .filter(Boolean)
    .filter((c) => {
      const norm = c.trim().toLowerCase();
      if (seenNorm.has(norm)) return false;
      seenNorm.add(norm);
      return true;
    });

  // If no specific categories requested, fall back to general recommendation search
  if (targetCategories.length === 0) {
    const singleResult = await getRecommendations({
      location,
      city,
      maxPrice,
      budget,
      minPrice,
      minRating,
      minExperience,
      guestCount,
      limit: limitPerCategory * 3,
      user,
      eventId,
    });
    return {
      success: true,
      total: singleResult.total,
      recommendations: singleResult.recommendations,
      selectedPlan: singleResult.recommendations,
      allRecommendations: singleResult.recommendations,
      totalPlanCost: singleResult.recommendations.reduce((sum, r) => sum + r.startingPrice, 0),
      remainingBudget: 0,
      totalBudget: maxPrice || budget || null,
      isWithinBudget: true,
      budgetDeficit: 0,
      minimumRequiredBudget: 0,
      costliestServices: [],
      foundCategories: Array.from(new Set(singleResult.recommendations.map((r) => r.category))),
      missingCategories: [],
      categoryBreakdown: {},
      eventContext: singleResult.eventContext,
    };
  }

  const allRecommendations = [];
  const foundCategories = [];
  const missingCategories = [];
  const categoryBreakdown = {};
  let eventContextResult = null;

  for (const cat of targetCategories) {
    const normalizedCatLabel = normalizeCategoryDisplayName(cat);

    const res = await getRecommendations({
      category: cat,
      location,
      city,
      maxPrice,
      budget,
      minPrice,
      minRating,
      minExperience,
      guestCount,
      limit: limitPerCategory,
      user,
      eventId,
      returnAllPackages: true,
    });

    if (res.eventContext && !eventContextResult) {
      eventContextResult = res.eventContext;
    }

    const recs = res.recommendations || [];
    categoryBreakdown[normalizedCatLabel] = recs;

    if (recs.length > 0) {
      if (!foundCategories.includes(normalizedCatLabel)) {
        foundCategories.push(normalizedCatLabel);
      }
      allRecommendations.push(...recs);
    } else {
      if (!missingCategories.includes(normalizedCatLabel)) {
        missingCategories.push(normalizedCatLabel);
      }
    }
  }

  // Determine effective total budget
  const effectiveTotalBudget = maxPrice !== undefined && maxPrice !== null && !isNaN(maxPrice)
    ? parseFloat(maxPrice)
    : (budget !== undefined && budget !== null && !isNaN(budget)
      ? parseFloat(budget)
      : (eventContextResult && eventContextResult.budget ? parseFloat(eventContextResult.budget) : null));

  // Select optimal multi-category combination validating total budget
  const planResult = selectBestPlanCombination(categoryBreakdown, effectiveTotalBudget);

  // If multiple categories were requested, return the selected plan (1 provider/package per category)
  // For single category search, return all candidate options
  const finalRecommendations = targetCategories.length > 1
    ? (planResult.selectedPlan.length > 0 ? planResult.selectedPlan : allRecommendations)
    : allRecommendations;

  return {
    success: true,
    total: finalRecommendations.length,
    recommendations: finalRecommendations,
    selectedPlan: planResult.selectedPlan,
    allRecommendations,
    totalPlanCost: planResult.totalPlanCost,
    remainingBudget: planResult.remainingBudget,
    totalBudget: effectiveTotalBudget,
    isWithinBudget: planResult.isWithinBudget,
    budgetDeficit: planResult.budgetDeficit,
    minimumRequiredBudget: planResult.minimumRequiredBudget,
    costliestServices: planResult.costliestServices,
    foundCategories,
    missingCategories,
    categoryBreakdown,
    eventContext: eventContextResult,
  };
};


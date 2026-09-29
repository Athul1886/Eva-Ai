/**
 * Provider DTO formatters for Eva-Ai
 * Formats database records from provider_profiles, services, and provider_portfolios
 * to strictly match the frontend Provider and Category interfaces.
 */

export const DEFAULT_CATEGORY_IMAGES = {
  photographer: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
  photography: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
  venue: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80',
  caterer: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1200&q=80',
  catering: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1200&q=80',
  'makeup-artist': 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80',
  'event-manager': 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80',
  'event-management': 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80',
  decorator: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=80',
  decoration: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=80',
  dj: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
  'dj-entertainment': 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
};

export const getDefaultCategoryImage = (slug) => {
  if (!slug) return DEFAULT_CATEGORY_IMAGES.photographer;
  const clean = slug.toLowerCase().trim();
  return DEFAULT_CATEGORY_IMAGES[clean] || DEFAULT_CATEGORY_IMAGES.photographer;
};

/**
 * Format a single portfolio item ensuring both camelCase and snake_case properties
 */
export const formatPortfolioItemDTO = (item) => {
  if (!item) return null;
  return {
    id: item.id,
    providerId: item.provider_id || item.providerId,
    provider_id: item.provider_id || item.providerId,
    serviceId: item.service_id || item.serviceId || null,
    service_id: item.service_id || item.serviceId || null,
    imageUrl: item.image_url || item.imageUrl,
    image_url: item.image_url || item.imageUrl,
    title: item.title || null,
    caption: item.caption || null,
    isFeatured: item.is_featured ?? item.isFeatured ?? false,
    is_featured: item.is_featured ?? item.isFeatured ?? false,
    displayOrder: item.display_order ?? item.displayOrder ?? 0,
    display_order: item.display_order ?? item.displayOrder ?? 0,
    createdAt: item.created_at || item.createdAt,
    created_at: item.created_at || item.createdAt,
    service: item.service || null,
  };
};

/**
 * Format a single provider for public consumption
 */
export const formatPublicProviderDTO = (
  provider,
  services = [],
  portfolios = [],
  unavailableDates = []
) => {
  if (!provider) return null;

  const categoryName = provider.primary_category?.name || provider.primaryCategory?.name || 'Service Partner';
  const categorySlug = provider.primary_category?.slug || provider.primaryCategory?.slug || 'service-partner';
  const businessName = provider.business_name || provider.businessName || provider.user?.full_name || provider.user?.fullName || 'Event Partner';
  const city = provider.city || provider.location || 'Kerala';
  const rawStartingPrice = parseFloat(provider.starting_price ?? provider.startingPrice);

  // Compute starting price from services if not explicitly set
  let startingPrice = !isNaN(rawStartingPrice) && rawStartingPrice > 0 ? rawStartingPrice : 25000;
  if (services && services.length > 0) {
    const validPrices = services.map((s) => parseFloat(s.price)).filter((p) => !isNaN(p) && p > 0);
    if (validPrices.length > 0) {
      startingPrice = Math.min(...validPrices);
    }
  }

  // Format portfolio images
  // Format portfolio images strictly from provider_portfolios (NO Unsplash or mock fallbacks)
  const portfolioImageUrls = (portfolios || [])
    .map((p) => p.image_url || p.imageUrl || p.url)
    .filter(Boolean);

  const formattedPortfolios = (portfolios || []).map(formatPortfolioItemDTO);

  // Format packages from active services
  const packages = (services || []).map((s, idx) => ({
    id: s.id || `pkg-${idx + 1}`,
    name: s.title || `Package ${idx + 1}`,
    price: parseFloat(s.price) || startingPrice,
    description: s.description || `${s.title || 'Service'} package by ${businessName}`,
    features: s.features || [
      'Consultation & Custom Planning',
      'Professional Execution & Staff',
      'Quality Assurance & Guarantee',
    ],
  }));

  if (packages.length === 0) {
    packages.push({
      id: `pkg-${provider.id}-1`,
      name: 'Essential Service Package',
      price: startingPrice,
      description: `Core professional ${categoryName} services by ${businessName}`,
      features: [
        'Dedicated Initial Consultation',
        'Standard Event Execution',
        'Eva-Ai Verified Delivery',
      ],
    });
  }

  const serviceTitles = services && services.length > 0
    ? services.map((s) => s.title)
    : [categoryName, 'Event Coordination'];

  const rating = parseFloat(provider.rating) || 5.0;
  const reviewsCount = parseInt(provider.reviews_count || provider.reviewsCount || 1, 10);
  const experienceYears = parseInt(provider.experience_years || provider.experienceYears || 3, 10);
  const description = provider.bio || provider.description || `${businessName} provides premium, verified ${categoryName} services across ${city}.`;

  return {
    id: provider.id,
    name: businessName,
    businessName,
    fullName: provider.user?.full_name || provider.user?.fullName || businessName,
    category: categoryName,
    categorySlug,
    location: city,
    city,
    address: provider.address || `${city}, Kerala`,
    rating,
    reviewCount: reviewsCount,
    reviewsCount,
    startingPrice,
    yearsExperience: experienceYears,
    experienceYears,
    description,
    about: description,
    bio: description,
    services: serviceTitles,
    tags: [categoryName, city, 'Verified Partner'],
    images: portfolioImageUrls,
    priceRange: `₹${startingPrice.toLocaleString('en-IN')}+`,
    available: true,
    featured: rating >= 4.8,
    approvalStatus: provider.approval_status || provider.approvalStatus || 'approved',
    packages,
    portfolios: formattedPortfolios,
    unavailableDates: Array.isArray(unavailableDates) ? unavailableDates : [],
    reviews: [
      {
        author: 'Verified Customer',
        rating: 5,
        date: 'Recent Event',
        comment: `Excellent experience with ${businessName}. Highly professional team and flawless execution.`,
      },
    ],
    contactDemo: {
      manager: provider.user?.full_name || provider.user?.fullName || businessName,
      phone: null, // Protected: direct phone access unlocked only upon accepted booking
      email: null, // Protected: direct email access unlocked only upon accepted booking
      address: provider.address ? `${provider.address}, ${city}, Kerala` : `${city}, Kerala`,
      hours: 'Mon - Sun: 9:00 AM - 8:00 PM',
    },
    categoryData: {
      servicesOffered: serviceTitles,
      portfolioImages: portfolioImageUrls,
      packageInfo: packages,
    },
    user: {
      id: provider.user_id || provider.user?.id,
      fullName: provider.user?.full_name || provider.user?.fullName || businessName,
      avatarUrl: provider.user?.avatar_url || provider.user?.avatarUrl || portfolioImageUrls[0],
    },
    createdAt: provider.created_at || provider.createdAt || new Date().toISOString(),
  };
};

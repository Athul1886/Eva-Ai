/**
 * Input validation utilities for Eva-Ai Authentication and Provider Management
 */

export const isValidEmail = (email) => {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export const isValidPassword = (password) => {
  if (typeof password !== 'string') return false;
  return password.length >= 6;
};

export const slugify = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

export const isValidDateString = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateStr)) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
};

export const isValidTimeString = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return false;
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/;
  return timeRegex.test(timeStr);
};

export const PRICING_MODELS = ['fixed', 'per_hour', 'per_day', 'per_plate', 'per_guest'];
export const PROVIDER_APPROVAL_STATUSES = ['pending', 'approved', 'rejected', 'suspended'];

/**
 * Validates customer registration payload
 */
export const validateCustomerPayload = (data = {}) => {
  const missingFields = [];

  const fullName = (data.fullName || data.name || '').trim();
  const email = (data.email || '').trim();
  const phone = (data.phone || '').trim();
  const password = data.password || '';
  const location = (data.location || '').trim();

  if (!fullName) missingFields.push('fullName');
  if (!email) missingFields.push('email');
  if (!phone) missingFields.push('phone');
  if (!password) missingFields.push('password');
  if (!location) missingFields.push('location');

  if (missingFields.length > 0) {
    return {
      isValid: false,
      errorType: 'missing_fields',
      message: `Missing required fields: ${missingFields.join(', ')}`,
      missingFields,
    };
  }

  if (!isValidEmail(email)) {
    return {
      isValid: false,
      errorType: 'invalid_format',
      message: 'Invalid email address format',
      missingFields: [],
    };
  }

  if (!isValidPassword(password)) {
    return {
      isValid: false,
      errorType: 'invalid_password',
      message: 'Password must be at least 6 characters long',
      missingFields: [],
    };
  }

  return {
    isValid: true,
    data: {
      fullName,
      email,
      phone,
      password,
      location,
    },
  };
};

/**
 * Validates provider registration payload
 */
export const validateProviderPayload = (data = {}) => {
  const missingFields = [];

  const name = (data.name || data.fullName || '').trim();
  const businessName = (data.businessName || data.business_name || '').trim();
  const email = (data.email || '').trim();
  const phone = (data.phone || '').trim();
  const password = data.password || '';
  const location = (data.location || data.city || '').trim();
  const category = (data.category || data.providerCategory || data.categoryId || data.categoryName || '').trim();

  if (!name) missingFields.push('name');
  if (!businessName) missingFields.push('businessName');
  if (!email) missingFields.push('email');
  if (!phone) missingFields.push('phone');
  if (!password) missingFields.push('password');
  if (!location) missingFields.push('location');
  if (!category) missingFields.push('category');

  if (missingFields.length > 0) {
    return {
      isValid: false,
      errorType: 'missing_fields',
      message: `Missing required fields: ${missingFields.join(', ')}`,
      missingFields,
    };
  }

  if (!isValidEmail(email)) {
    return {
      isValid: false,
      errorType: 'invalid_format',
      message: 'Invalid email address format',
      missingFields: [],
    };
  }

  if (!isValidPassword(password)) {
    return {
      isValid: false,
      errorType: 'invalid_password',
      message: 'Password must be at least 6 characters long',
      missingFields: [],
    };
  }

  return {
    isValid: true,
    data: {
      name,
      businessName,
      email,
      phone,
      password,
      location,
      category,
      address: (data.address || location).trim(),
      bio: (data.bio || '').trim(),
      experienceYears: data.experienceYears !== undefined ? data.experienceYears : 0,
      startingPrice: data.startingPrice !== undefined ? data.startingPrice : 0,
    },
  };
};

/**
 * Validates provider profile update
 * Providers CANNOT approve themselves or modify approval status.
 */
export const validateProviderProfileUpdate = (data = {}) => {
  const sanitized = {};

  if (data.businessName !== undefined || data.business_name !== undefined) {
    const val = (data.businessName || data.business_name || '').trim();
    if (!val) {
      return { isValid: false, message: 'Business name cannot be empty' };
    }
    sanitized.business_name = val;
  }

  if (data.bio !== undefined || data.description !== undefined) {
    sanitized.bio = (data.bio ?? data.description ?? '').trim();
  }

  if (data.city !== undefined || data.location !== undefined) {
    const val = (data.city || data.location || '').trim();
    if (!val) {
      return { isValid: false, message: 'City/location cannot be empty' };
    }
    sanitized.city = val;
  }

  if (data.address !== undefined) {
    sanitized.address = (data.address || '').trim();
  }

  if (data.experienceYears !== undefined || data.experience_years !== undefined) {
    const exp = parseInt(data.experienceYears ?? data.experience_years, 10);
    if (isNaN(exp) || exp < 0) {
      return { isValid: false, message: 'Experience years must be a non-negative integer' };
    }
    sanitized.experience_years = exp;
  }

  if (data.startingPrice !== undefined || data.starting_price !== undefined) {
    const price = parseFloat(data.startingPrice ?? data.starting_price);
    if (isNaN(price) || price < 0) {
      return { isValid: false, message: 'Starting price must be a non-negative number' };
    }
    sanitized.starting_price = price;
  }

  if (data.socialLinks !== undefined || data.social_links !== undefined) {
    const links = data.socialLinks ?? data.social_links;
    if (typeof links !== 'object' || links === null || Array.isArray(links)) {
      return { isValid: false, message: 'Social links must be an object' };
    }
    sanitized.social_links = links;
  }

  if (data.primaryCategoryId !== undefined || data.primary_category_id !== undefined || data.category !== undefined) {
    const cat = (data.primaryCategoryId || data.primary_category_id || data.category || '').trim();
    if (cat) {
      sanitized.category = cat;
    }
  }

  if (data.avatarUrl !== undefined || data.avatar_url !== undefined) {
    sanitized.avatar_url = (data.avatarUrl ?? data.avatar_url ?? '').trim();
  }

  return {
    isValid: true,
    data: sanitized,
  };
};

/**
 * Validates service creation / update payload
 */
export const validateServicePayload = (data = {}, isUpdate = false) => {
  const missingFields = [];

  const title = (data.title || data.name || data.serviceName || '').trim();
  const priceRaw = data.price;
  const pricingModel = (data.pricing_model || data.pricingModel || 'fixed').toLowerCase().trim();
  const categoryId = (data.category_id || data.categoryId || data.category || '').trim();
  const description = (data.description || '').trim();
  const durationHoursRaw = data.duration_hours ?? data.durationHours;
  const isActive = data.is_active !== undefined ? Boolean(data.is_active) : (data.isActive !== undefined ? Boolean(data.isActive) : true);

  if (!isUpdate) {
    if (!title) missingFields.push('title');
    if (priceRaw === undefined || priceRaw === null || priceRaw === '') missingFields.push('price');

    if (missingFields.length > 0) {
      return {
        isValid: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields,
      };
    }
  }

  let price = undefined;
  if (priceRaw !== undefined && priceRaw !== null && priceRaw !== '') {
    price = parseFloat(priceRaw);
    if (isNaN(price) || price < 0) {
      return { isValid: false, message: 'Price must be a non-negative number' };
    }
  }

  if (pricingModel && !PRICING_MODELS.includes(pricingModel)) {
    return {
      isValid: false,
      message: `Invalid pricing model. Must be one of: ${PRICING_MODELS.join(', ')}`,
    };
  }

  let durationHours = null;
  if (durationHoursRaw !== undefined && durationHoursRaw !== null && durationHoursRaw !== '') {
    durationHours = parseFloat(durationHoursRaw);
    if (isNaN(durationHours) || durationHours <= 0) {
      return { isValid: false, message: 'Duration hours must be greater than 0' };
    }
  }

  return {
    isValid: true,
    data: {
      title: title || undefined,
      description,
      price,
      pricing_model: pricingModel || 'fixed',
      category_id: categoryId || undefined,
      duration_hours: durationHours,
      is_active: isActive,
    },
  };
};

/**
 * Validates portfolio payload
 */
export const validatePortfolioPayload = (data = {}, isUpdate = false) => {
  const imageUrl = (data.image_url || data.imageUrl || '').trim();
  const title = (data.title || '').trim();
  const caption = (data.caption || '').trim();
  const serviceId = (data.service_id || data.serviceId || '').trim() || null;
  const isFeatured = data.is_featured !== undefined ? Boolean(data.is_featured) : (data.isFeatured !== undefined ? Boolean(data.isFeatured) : false);
  const displayOrderRaw = data.display_order ?? data.displayOrder;
  const displayOrder = displayOrderRaw !== undefined ? parseInt(displayOrderRaw, 10) : 0;

  if (!isUpdate && !imageUrl) {
    return {
      isValid: false,
      message: 'Missing required field: image_url is required',
      missingFields: ['image_url'],
    };
  }

  if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://') && !imageUrl.startsWith('/') && imageUrl !== 'temp-url') {
    return {
      isValid: false,
      message: 'Invalid image_url format. Must be a valid URL or path',
    };
  }

  return {
    isValid: true,
    data: {
      image_url: imageUrl || undefined,
      title: title || null,
      caption: caption || null,
      service_id: serviceId,
      is_featured: isFeatured,
      display_order: isNaN(displayOrder) ? 0 : displayOrder,
    },
  };
};

/**
 * Validates availability payload
 */
export const validateAvailabilityPayload = (data = {}, isUpdate = false) => {
  const missingFields = [];
  const date = (data.date || '').trim();
  const startTime = (data.start_time || data.startTime || '').trim() || null;
  const endTime = (data.end_time || data.endTime || '').trim() || null;
  const isAvailable = data.is_available !== undefined ? Boolean(data.is_available) : (data.isAvailable !== undefined ? Boolean(data.isAvailable) : true);
  const reason = (data.reason || '').trim() || null;

  if (!isUpdate) {
    if (!date) missingFields.push('date');
    if (missingFields.length > 0) {
      return {
        isValid: false,
        message: `Missing required field: ${missingFields.join(', ')}`,
        missingFields,
      };
    }
  }

  if (date && !isValidDateString(date)) {
    return {
      isValid: false,
      message: 'Invalid date format. Expected YYYY-MM-DD',
    };
  }

  if (startTime && !isValidTimeString(startTime)) {
    return {
      isValid: false,
      message: 'Invalid start_time format. Expected HH:MM or HH:MM:SS',
    };
  }

  if (endTime && !isValidTimeString(endTime)) {
    return {
      isValid: false,
      message: 'Invalid end_time format. Expected HH:MM or HH:MM:SS',
    };
  }

  if (startTime && endTime) {
    if (startTime >= endTime) {
      return {
        isValid: false,
        message: 'end_time must be strictly after start_time',
      };
    }
  }

  return {
    isValid: true,
    data: {
      date: date || undefined,
      start_time: startTime,
      end_time: endTime,
      is_available: isAvailable,
      reason,
    },
  };
};

export const EVENT_TYPES = ['wedding', 'reception', 'engagement', 'birthday', 'corporate', 'anniversary', 'other'];
export const EVENT_STATUSES = ['draft', 'planning', 'booked', 'in_progress', 'completed', 'cancelled'];

/**
 * Validates customer event creation and update payload
 */
export const validateEventPayload = (data = {}, isUpdate = false) => {
  const missingFields = [];

  const rawEventType = data.eventType || data.event_type;
  const eventType = rawEventType ? rawEventType.toString().toLowerCase().trim() : (isUpdate ? undefined : 'wedding');
  const eventDate = (data.eventDate || data.event_date || '').toString().trim();
  const location = (data.location || data.city || '').toString().trim();
  const rawGuests = data.guestCount ?? data.estimated_guests ?? data.guests;
  const rawBudget = data.budget ?? data.total_budget;
  const title = (data.title || '').toString().trim();
  const preferences = data.preferences !== undefined ? data.preferences : undefined;
  const additionalNotes = (data.additionalNotes || data.additional_notes || data.notes || '').toString().trim();
  const status = (data.status || '').toString().toLowerCase().trim();

  if (!isUpdate) {
    if (!eventDate) missingFields.push('eventDate');
    if (!location) missingFields.push('location');
    if (rawGuests === undefined || rawGuests === null || rawGuests === '') missingFields.push('guestCount');
    if (rawBudget === undefined || rawBudget === null || rawBudget === '') missingFields.push('budget');

    if (missingFields.length > 0) {
      return {
        isValid: false,
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields,
      };
    }
  }

  if (eventType && !EVENT_TYPES.includes(eventType)) {
    return {
      isValid: false,
      message: `Invalid eventType. Must be one of: ${EVENT_TYPES.join(', ')}`,
    };
  }

  if (eventDate) {
    if (!isValidDateString(eventDate)) {
      return {
        isValid: false,
        message: 'Invalid eventDate format. Expected YYYY-MM-DD',
      };
    }
    const parsedDate = new Date(eventDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsedDate < today) {
      return {
        isValid: false,
        message: 'eventDate must be in the future',
      };
    }
  }

  let guestCount = undefined;
  if (rawGuests !== undefined && rawGuests !== null && rawGuests !== '') {
    guestCount = parseInt(rawGuests, 10);
    if (isNaN(guestCount) || guestCount <= 0) {
      return {
        isValid: false,
        message: 'guestCount must be a positive integer greater than 0',
      };
    }
  }

  let budget = undefined;
  if (rawBudget !== undefined && rawBudget !== null && rawBudget !== '') {
    budget = parseFloat(rawBudget);
    if (isNaN(budget) || budget < 0) {
      return {
        isValid: false,
        message: 'budget must be a non-negative number',
      };
    }
  }

  if (status && !EVENT_STATUSES.includes(status)) {
    return {
      isValid: false,
      message: `Invalid status. Must be one of: ${EVENT_STATUSES.join(', ')}`,
    };
  }

  return {
    isValid: true,
    data: {
      title: title || undefined,
      eventType: eventType || undefined,
      eventDate: eventDate || undefined,
      location: location || undefined,
      guestCount,
      budget,
      status: status || undefined,
      preferences: preferences !== undefined ? preferences : undefined,
      additionalNotes: additionalNotes || undefined,
      startTime: data.startTime || data.start_time || undefined,
      endTime: data.endTime || data.end_time || undefined,
      venueName: data.venueName || data.venue_name || undefined,
      venueAddress: data.venueAddress || data.venue_address || undefined,
      services: data.services || undefined,
      requiredServices: data.requiredServices || undefined,
    },
  };
};

/**
 * Validates adding a service/package to an event
 */
export const validateEventServicePayload = (data = {}) => {
  const serviceId = (data.serviceId || data.service_id || '').toString().trim();
  const providerId = (data.providerId || data.provider_id || '').toString().trim();

  const isServiceUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(serviceId);
  const isProviderUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(providerId);

  if (!serviceId && !providerId) {
    return {
      isValid: false,
      message: 'Either serviceId or providerId is required',
      missingFields: ['serviceId', 'providerId'],
    };
  }

  if (serviceId && !isServiceUUID) {
    return {
      isValid: false,
      message: 'Invalid serviceId format. Expected valid UUID',
    };
  }

  if (providerId && !isProviderUUID) {
    return {
      isValid: false,
      message: 'Invalid providerId format. Expected valid UUID',
    };
  }

  const rawQty = data.quantity;
  let quantity = 1;
  if (rawQty !== undefined && rawQty !== null && rawQty !== '') {
    quantity = parseInt(rawQty, 10);
    if (isNaN(quantity) || quantity <= 0) {
      return {
        isValid: false,
        message: 'quantity must be an integer greater than 0',
      };
    }
  }

  const bookingDate = (data.bookingDate || data.booking_date || '').toString().trim();
  if (bookingDate && !isValidDateString(bookingDate)) {
    return {
      isValid: false,
      message: 'Invalid bookingDate format. Expected YYYY-MM-DD',
    };
  }

  const notes = (data.notes || '').toString().trim();

  return {
    isValid: true,
    data: {
      serviceId: serviceId || undefined,
      providerId: providerId || undefined,
      quantity,
      bookingDate: bookingDate || undefined,
      notes: notes || null,
    },
  };
};

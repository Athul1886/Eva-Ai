import { getSupabaseClient, getSupabaseAdmin } from '../config/supabase.js';
import { isProviderAvailableOnDate } from './availability.service.js';
import { formatEventPlanDTO } from '../utils/eventPlan.dto.js';
import { createBooking } from './booking.service.js';
import { toFrontendStatus } from '../utils/booking.dto.js';

/**
 * Transforms a raw database event row and its associated cart_items
 * into the frontend-compatible DTO format.
 */
export const formatEventDTO = (
  event,
  cartItems = [],
  requirementCategoryNames = [],
  reqPreferences = null,
  reqAdditionalNotes = ''
) => {
  if (!event) return null;

  const formattedServices = (cartItems || []).map((item) => ({
    id: item.id,
    eventId: item.event_id,
    serviceId: item.service_id,
    providerId: item.provider_id,
    providerName: item.provider?.business_name || null,
    providerCity: item.provider?.city || null,
    providerRating: item.provider?.rating || null,
    category: item.service?.category?.name || null,
    categorySlug: item.service?.category?.slug || null,
    package: item.service?.title || null,
    serviceTitle: item.service?.title || null,
    serviceName: item.service?.title || null,
    serviceDescription: item.service?.description || null,
    pricingModel: item.service?.pricing_model || 'fixed',
    durationHours: item.service?.duration_hours || null,
    price: parseFloat(item.unit_price) || 0,
    quantity: item.quantity || 1,
    bookingDate: item.booking_date,
    notes: item.notes || null,
    createdAt: item.created_at,
  }));

  // Resolve required services from preferences or joined event_requirements
  let requiredServices = [];
  if (Array.isArray(requirementCategoryNames) && requirementCategoryNames.length > 0) {
    requiredServices = requirementCategoryNames;
  } else if (Array.isArray(event.preferences?.requiredServices) && event.preferences.requiredServices.length > 0) {
    requiredServices = event.preferences.requiredServices;
  } else if (Array.isArray(event.preferences?.services) && event.preferences.services.length > 0) {
    requiredServices = event.preferences.services;
  } else if (Array.isArray(event.required_services)) {
    requiredServices = event.required_services;
  }

  // Resolve preferences cleanly (array or object)
  let preferences = [];
  if (reqPreferences !== null && reqPreferences !== undefined) {
    preferences = reqPreferences;
  } else if (Array.isArray(event.preferences)) {
    preferences = event.preferences;
  } else if (Array.isArray(event.preferences?.preferences)) {
    preferences = event.preferences.preferences;
  } else if (Array.isArray(event.preferences?.stylePreferences)) {
    preferences = event.preferences.stylePreferences;
  } else if (typeof event.preferences === 'object' && event.preferences !== null) {
    preferences = event.preferences;
  }

  // Resolve additional notes
  const additionalNotes = reqAdditionalNotes || event.additional_notes || event.additionalNotes || '';

  return {
    id: event.id,
    customerId: event.user_id,
    userId: event.user_id,
    title: event.title,
    eventType: event.event_type,
    eventDate: event.event_date,
    startTime: event.start_time || null,
    endTime: event.end_time || null,
    location: event.city,
    city: event.city,
    venueName: event.venue_name || null,
    venueAddress: event.venue_address || null,
    guestCount: event.estimated_guests,
    budget: parseFloat(event.total_budget) || 0,
    status: event.status,
    preferences,
    additionalNotes,
    services: formattedServices,
    requiredServices,
    servicesCount: formattedServices.length,
    createdAt: event.created_at,
    updatedAt: event.updated_at,
  };
};

/**
 * Helper to fetch cart items for an event with joined service and provider details
 */
export const getCartItemsForEvent = async (dbClient, eventId) => {
  const { data: items, error } = await dbClient
    .from('cart_items')
    .select(`
      id,
      event_id,
      user_id,
      provider_id,
      service_id,
      booking_date,
      quantity,
      unit_price,
      notes,
      created_at,
      service:services(id, title, description, price, pricing_model, duration_hours, category:categories(id, name, slug)),
      provider:provider_profiles!cart_items_provider_id_fkey(id, business_name, city, rating, approval_status)
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (error) {
    // If foreign key syntax error, fallback to unaliased provider_profiles
    const { data: fallbackItems } = await dbClient
      .from('cart_items')
      .select(`
        id,
        event_id,
        user_id,
        provider_id,
        service_id,
        booking_date,
        quantity,
        unit_price,
        notes,
        created_at,
        service:services(id, title, description, price, pricing_model, duration_hours, category:categories(id, name, slug)),
        provider:provider_profiles(id, business_name, city, rating, approval_status)
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });
    return fallbackItems || [];
  }

  return items || [];
};

/**
 * Create a new event for the authenticated customer
 */
export const createEvent = async (userId, eventData) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const defaultTitle = eventData.title || `${eventData.eventType.charAt(0).toUpperCase() + eventData.eventType.slice(1)} in ${eventData.location}`;

  const insertPayload = {
    user_id: userId,
    title: defaultTitle,
    event_type: eventData.eventType || 'wedding',
    event_date: eventData.eventDate,
    city: eventData.location,
    venue_name: eventData.venueName || null,
    venue_address: eventData.venueAddress || null,
    start_time: eventData.startTime || null,
    end_time: eventData.endTime || null,
    total_budget: eventData.budget,
    estimated_guests: eventData.guestCount,
    status: eventData.status || 'draft',
  };

  // Handle preferences and required services safely without mutual overwrite
  let prefsPayload = {};
  if (Array.isArray(eventData.preferences)) {
    prefsPayload.preferences = eventData.preferences;
    prefsPayload.stylePreferences = eventData.preferences;
  } else if (typeof eventData.preferences === 'object' && eventData.preferences !== null) {
    prefsPayload = { ...eventData.preferences };
  }

  const reqServicesList = Array.isArray(eventData.requiredServices)
    ? eventData.requiredServices
    : (Array.isArray(eventData.services) && typeof eventData.services[0] === 'string' ? eventData.services : null);

  if (reqServicesList && reqServicesList.length > 0) {
    prefsPayload.requiredServices = reqServicesList;
    prefsPayload.services = reqServicesList;
  }

  insertPayload.preferences = prefsPayload;

  let eventRecord = null;
  const { data: createdEvent, error: insertError } = await dbClient
    .from('events')
    .insert(insertPayload)
    .select('*')
    .single();

  if (insertError) {
    // If error is due to preferences/additional_notes column not existing yet, retry without them
    if (insertError.message?.includes('column') && (insertError.message?.includes('preferences') || insertError.message?.includes('additional_notes'))) {
      delete insertPayload.preferences;
      delete insertPayload.additional_notes;
      const { data: retryEvent, error: retryError } = await dbClient
        .from('events')
        .insert(insertPayload)
        .select('*')
        .single();

      if (retryError) {
        const err = new Error('Failed to create event: ' + retryError.message);
        err.statusCode = 500;
        throw err;
      }
      eventRecord = retryEvent;
    } else {
      const err = new Error('Failed to create event: ' + insertError.message);
      err.statusCode = 500;
      throw err;
    }
  } else {
    eventRecord = createdEvent;
  }

  // Save category requirements and event preferences into public.event_requirements
  const reqServices = eventData.requiredServices || (Array.isArray(eventData.services) && typeof eventData.services[0] === 'string' ? eventData.services : null);
  try {
    const { data: allCategories } = await dbClient.from('categories').select('id, name, slug');
    if (allCategories && allCategories.length > 0) {
      const catMap = new Map();
      allCategories.forEach(c => {
        catMap.set(c.id, c.id);
        catMap.set(c.slug.toLowerCase(), c.id);
        catMap.set(c.name.toLowerCase(), c.id);
      });

      // Add common category synonyms
      allCategories.forEach(c => {
        const slug = c.slug.toLowerCase();
        const name = c.name.toLowerCase();
        if (slug.includes('decor') || name.includes('decor')) {
          catMap.set('decoration', c.id);
          catMap.set('decor', c.id);
          catMap.set('decorators', c.id);
        }
        if (slug.includes('makeup') || name.includes('makeup')) {
          catMap.set('makeup', c.id);
          catMap.set('make-up', c.id);
          catMap.set('make up', c.id);
          catMap.set('makeup artist', c.id);
          catMap.set('makeup artists', c.id);
        }
        if (slug.includes('photo') || name.includes('photo')) {
          catMap.set('photography', c.id);
          catMap.set('photographer', c.id);
          catMap.set('photographers', c.id);
        }
        if (slug.includes('venue') || name.includes('venue') || slug.includes('auditorium')) {
          catMap.set('venue', c.id);
          catMap.set('venues', c.id);
          catMap.set('venue / auditorium', c.id);
        }
        if (slug.includes('cater') || name.includes('cater')) {
          catMap.set('catering', c.id);
          catMap.set('caterer', c.id);
          catMap.set('caterers', c.id);
        }
        if (slug.includes('dj') || name.includes('dj')) {
          catMap.set('dj', c.id);
          catMap.set('dj & entertainment', c.id);
          catMap.set('dj / entertainment', c.id);
        }
      });

      const servicesToProcess = (Array.isArray(reqServices) && reqServices.length > 0)
        ? reqServices
        : (allCategories.length > 0 ? [allCategories[0].name] : []);

      const reqInserts = [];
      for (const reqItem of servicesToProcess) {
        const catId = typeof reqItem === 'string'
          ? catMap.get(reqItem.toLowerCase())
          : (catMap.get(reqItem.categoryId) || catMap.get(reqItem.category?.toLowerCase()));

        if (catId) {
          reqInserts.push({
            event_id: eventRecord.id,
            category_id: catId,
            allocated_budget: typeof reqItem === 'object' && reqItem.budget ? reqItem.budget : 0,
            preferences: {
              preferences: eventData.preferences || [],
              additionalNotes: eventData.additionalNotes || '',
              ...(typeof reqItem === 'object' && reqItem.preferences ? reqItem.preferences : {})
            },
            status: 'needed'
          });
        }
      }

      if (reqInserts.length > 0) {
        await dbClient.from('event_requirements').upsert(reqInserts, { onConflict: 'event_id,category_id' });
      }
    }
  } catch (reqErr) {
    // Non-fatal
  }

  // Handle any pre-selected service items
  if (Array.isArray(eventData.services)) {
    for (const svc of eventData.services) {
      if (typeof svc === 'object' && svc !== null && (svc.serviceId || svc.providerId)) {
        try {
          await addServiceToEvent(eventRecord.id, userId, svc);
        } catch (e) {
          // ignore or log
        }
      }
    }
  }

  const finalItems = await getCartItemsForEvent(dbClient, eventRecord.id);
  return formatEventDTO(eventRecord, finalItems);
};

/**
 * Get all events for the authenticated customer
 */
export const getMyEvents = async (userId) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const { data: events, error } = await dbClient
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .order('event_date', { ascending: true });

  if (error) {
    const err = new Error('Failed to retrieve events: ' + error.message);
    err.statusCode = 500;
    throw err;
  }

  if (!events || events.length === 0) {
    return [];
  }

  // Load cart items for all events in parallel
  const formattedEvents = await Promise.all(
    events.map(async (event) => {
      const items = await getCartItemsForEvent(dbClient, event.id);
      return formatEventDTO(event, items);
    })
  );

  return formattedEvents;
};

/**
 * Get an individual event by ID, strictly enforcing customer ownership
 */
export const getEventById = async (eventId, requestingUser) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId);
  if (!isUUID) {
    const error = new Error('Invalid event ID format');
    error.statusCode = 400;
    throw error;
  }

  const { data: event, error } = await dbClient
    .from('events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle();

  if (error || !event) {
    const notFoundError = new Error('Event not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  // Enforce customer ownership (Admin may bypass for review)
  const isOwner = requestingUser && requestingUser.id === event.user_id;
  const isAdmin = requestingUser && requestingUser.role === 'admin';

  if (!isOwner && !isAdmin) {
    const forbiddenError = new Error('Unauthorized: You do not have access to another customer\'s event');
    forbiddenError.statusCode = 403;
    throw forbiddenError;
  }

  const cartItems = await getCartItemsForEvent(dbClient, event.id);

  // Fetch requirement categories, preferences, and additional notes from public.event_requirements
  let reqCategoryNames = [];
  let reqPreferences = null;
  let reqAdditionalNotes = '';

  try {
    const { data: reqItems } = await dbClient
      .from('event_requirements')
      .select('id, category_id, preferences, category:categories(name)')
      .eq('event_id', event.id);

    if (reqItems && reqItems.length > 0) {
      reqCategoryNames = reqItems.map((r) => r.category?.name).filter(Boolean);
      for (const item of reqItems) {
        if (item.preferences && typeof item.preferences === 'object') {
          if (item.preferences.preferences && (!reqPreferences || reqPreferences.length === 0)) {
            reqPreferences = item.preferences.preferences;
          }
          if (item.preferences.additionalNotes && !reqAdditionalNotes) {
            reqAdditionalNotes = item.preferences.additionalNotes;
          }
        }
      }
    }
  } catch (reqErr) {
    // Non-fatal
  }

  return formatEventDTO(event, cartItems, reqCategoryNames, reqPreferences, reqAdditionalNotes);
};

/**
 * Update an event, strictly enforcing customer ownership
 */
export const updateEvent = async (eventId, userId, updateData) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId);
  if (!isUUID) {
    const error = new Error('Invalid event ID format');
    error.statusCode = 400;
    throw error;
  }

  // 1. Check event existence
  const { data: existingEvent, error: fetchError } = await dbClient
    .from('events')
    .select('id, user_id')
    .eq('id', eventId)
    .maybeSingle();

  if (fetchError || !existingEvent) {
    const notFoundError = new Error('Event not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  // 2. Enforce customer ownership
  if (existingEvent.user_id !== userId) {
    const forbiddenError = new Error('Unauthorized: You are not authorized to update another customer\'s event');
    forbiddenError.statusCode = 403;
    throw forbiddenError;
  }

  // 3. Prepare updates
  const updates = {};
  if (updateData.title !== undefined) updates.title = updateData.title;
  if (updateData.eventType !== undefined) updates.event_type = updateData.eventType;
  if (updateData.eventDate !== undefined) updates.event_date = updateData.eventDate;
  if (updateData.location !== undefined) updates.city = updateData.location;
  if (updateData.budget !== undefined) updates.total_budget = updateData.budget;
  if (updateData.guestCount !== undefined) updates.estimated_guests = updateData.guestCount;
  if (updateData.status !== undefined) updates.status = updateData.status;
  if (updateData.venueName !== undefined) updates.venue_name = updateData.venueName;
  if (updateData.venueAddress !== undefined) updates.venue_address = updateData.venueAddress;
  if (updateData.startTime !== undefined) updates.start_time = updateData.startTime;
  if (updateData.endTime !== undefined) updates.end_time = updateData.endTime;
  if (updateData.preferences !== undefined) updates.preferences = updateData.preferences;
  if (updateData.additionalNotes !== undefined) updates.additional_notes = updateData.additionalNotes;

  let updatedRecord = null;
  const { data: updatedEvent, error: updateError } = await dbClient
    .from('events')
    .update(updates)
    .eq('id', eventId)
    .select('*')
    .single();

  if (updateError) {
    // If error is due to preferences/additional_notes column, retry without them
    if (updateError.message?.includes('column') && (updateError.message?.includes('preferences') || updateError.message?.includes('additional_notes'))) {
      delete updates.preferences;
      delete updates.additional_notes;
      const { data: retryEvent, error: retryError } = await dbClient
        .from('events')
        .update(updates)
        .eq('id', eventId)
        .select('*')
        .single();

      if (retryError) {
        const err = new Error('Failed to update event: ' + retryError.message);
        err.statusCode = 500;
        throw err;
      }
      updatedRecord = retryEvent;
    } else {
      const err = new Error('Failed to update event: ' + updateError.message);
      err.statusCode = 500;
      throw err;
    }
  } else {
    updatedRecord = updatedEvent;
  }

  const cartItems = await getCartItemsForEvent(dbClient, eventId);
  return formatEventDTO(updatedRecord, cartItems);
};

/**
 * Delete an event, strictly enforcing customer ownership
 */
export const deleteEvent = async (eventId, userId) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId);
  if (!isUUID) {
    const error = new Error('Invalid event ID format');
    error.statusCode = 400;
    throw error;
  }

  const { data: existingEvent, error: fetchError } = await dbClient
    .from('events')
    .select('id, user_id')
    .eq('id', eventId)
    .maybeSingle();

  if (fetchError || !existingEvent) {
    const notFoundError = new Error('Event not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  if (existingEvent.user_id !== userId) {
    const forbiddenError = new Error('Unauthorized: You are not authorized to delete another customer\'s event');
    forbiddenError.statusCode = 403;
    throw forbiddenError;
  }

  const { error: deleteError } = await dbClient
    .from('events')
    .delete()
    .eq('id', eventId);

  if (deleteError) {
    const err = new Error('Failed to delete event: ' + deleteError.message);
    err.statusCode = 500;
    throw err;
  }

  return {
    success: true,
    message: 'Event deleted successfully',
  };
};

/**
 * Get all selected services for an event
 */
export const getEventServices = async (eventId, requestingUser) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  // Verify customer ownership of the event
  await getEventById(eventId, requestingUser);

  const cartItems = await getCartItemsForEvent(dbClient, eventId);

  return cartItems.map((item) => ({
    id: item.id,
    eventId: item.event_id,
    serviceId: item.service_id,
    providerId: item.provider_id,
    providerName: item.provider?.business_name || null,
    providerCity: item.provider?.city || null,
    providerRating: item.provider?.rating || null,
    category: item.service?.category?.name || null,
    package: item.service?.title || null,
    serviceTitle: item.service?.title || null,
    serviceName: item.service?.title || null,
    serviceDescription: item.service?.description || null,
    pricingModel: item.service?.pricing_model || 'fixed',
    durationHours: item.service?.duration_hours || null,
    price: parseFloat(item.unit_price) || 0,
    quantity: item.quantity || 1,
    bookingDate: item.booking_date,
    notes: item.notes || null,
    createdAt: item.created_at,
  }));
};

/**
 * Add a service/package from a provider to the customer's event
 * Supports specifying either serviceId or providerId (auto-resolves provider's active service)
 */
export const addServiceToEvent = async (
  eventId,
  userId,
  { serviceId, providerId, quantity = 1, bookingDate, notes }
) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  // 1. Verify customer owns event
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId);
  if (!isUUID) {
    const error = new Error('Invalid event ID format');
    error.statusCode = 400;
    throw error;
  }

  const { data: event, error: eventError } = await dbClient
    .from('events')
    .select('id, user_id, event_date')
    .eq('id', eventId)
    .maybeSingle();

  if (eventError || !event) {
    const notFoundError = new Error('Event not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  if (event.user_id !== userId) {
    const forbiddenError = new Error('Unauthorized: You cannot add services to another customer\'s event');
    forbiddenError.statusCode = 403;
    throw forbiddenError;
  }

  // 2. Resolve service and provider
  let resolvedServiceId = serviceId;
  let resolvedProviderId = providerId;

  if (!resolvedServiceId) {
    if (!resolvedProviderId) {
      const error = new Error('Either serviceId or providerId is required to add a service to an event');
      error.statusCode = 400;
      throw error;
    }

    // Look up an existing active service for this provider
    const { data: existingSrv } = await dbClient
      .from('services')
      .select('id, provider_id, title, price, is_active')
      .eq('provider_id', resolvedProviderId)
      .eq('is_active', true)
      .order('price', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (existingSrv) {
      resolvedServiceId = existingSrv.id;
    } else {
      // Look up provider starting price and category to auto-create standard service tier
      const { data: provInfo } = await dbClient
        .from('provider_profiles')
        .select('id, business_name, starting_price, primary_category_id, approval_status')
        .eq('id', resolvedProviderId)
        .maybeSingle();

      if (!provInfo) {
        const error = new Error('Provider not found');
        error.statusCode = 404;
        throw error;
      }

      const { data: newSrv } = await dbClient
        .from('services')
        .insert({
          provider_id: resolvedProviderId,
          category_id: provInfo.primary_category_id,
          title: 'Standard Service Package',
          description: `${provInfo.business_name} Core Event Service`,
          price: provInfo.starting_price || 0,
          pricing_model: 'fixed',
          is_active: true,
        })
        .select('id, provider_id, title, price')
        .single();

      if (newSrv) {
        resolvedServiceId = newSrv.id;
      }
    }
  }

  const { data: service, error: serviceError } = await dbClient
    .from('services')
    .select('id, provider_id, title, description, price, pricing_model, duration_hours, is_active, category:categories(id, name, slug)')
    .eq('id', resolvedServiceId)
    .maybeSingle();

  if (serviceError || !service) {
    const notFoundError = new Error('Service not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  if (!service.is_active) {
    const error = new Error('This service is currently unavailable');
    error.statusCode = 400;
    throw error;
  }

  resolvedProviderId = service.provider_id;

  // 3. Verify provider exists and is approved
  const { data: provider, error: providerError } = await dbClient
    .from('provider_profiles')
    .select('id, business_name, city, rating, approval_status')
    .eq('id', service.provider_id)
    .maybeSingle();

  if (providerError || !provider || provider.approval_status !== 'approved') {
    const error = new Error('This provider is not currently approved for bookings');
    error.statusCode = 400;
    throw error;
  }

  // 4. Resolve date: default to event date if not provided
  const targetDate = bookingDate || event.event_date;

  // 5. Prevent duplicate addition: check if this service is already added for this date
  const { data: existingItem } = await dbClient
    .from('cart_items')
    .select('id, quantity')
    .eq('event_id', eventId)
    .eq('service_id', serviceId)
    .eq('booking_date', targetDate)
    .maybeSingle();

  if (existingItem) {
    // Update quantity instead of duplicate insert
    const newQty = existingItem.quantity + quantity;
    const { data: updatedItem, error: updateError } = await dbClient
      .from('cart_items')
      .update({ quantity: newQty, notes: notes || undefined })
      .eq('id', existingItem.id)
      .select('*')
      .single();

    if (updateError) {
      const err = new Error('Failed to update cart item: ' + updateError.message);
      err.statusCode = 500;
      throw err;
    }

    return {
      id: updatedItem.id,
      eventId: updatedItem.event_id,
      serviceId: updatedItem.service_id,
      providerId: updatedItem.provider_id,
      providerName: provider.business_name,
      category: service.category?.name || null,
      package: service.title,
      price: parseFloat(updatedItem.unit_price) || 0,
      quantity: updatedItem.quantity,
      bookingDate: updatedItem.booking_date,
      notes: updatedItem.notes,
      createdAt: updatedItem.created_at,
    };
  }

  // 6. Insert new cart item
  const insertPayload = {
    user_id: userId,
    event_id: eventId,
    provider_id: provider.id,
    service_id: service.id,
    booking_date: targetDate,
    quantity,
    unit_price: service.price,
    notes: notes || null,
  };

  const { data: insertedItem, error: insertError } = await dbClient
    .from('cart_items')
    .insert(insertPayload)
    .select('*')
    .single();

  if (insertError) {
    const err = new Error('Failed to add service to event: ' + insertError.message);
    err.statusCode = 500;
    throw err;
  }

  return {
    id: insertedItem.id,
    eventId: insertedItem.event_id,
    serviceId: insertedItem.service_id,
    providerId: insertedItem.provider_id,
    providerName: provider.business_name,
    category: service.category?.name || null,
    package: service.title,
    price: parseFloat(insertedItem.unit_price) || 0,
    quantity: insertedItem.quantity,
    bookingDate: insertedItem.booking_date,
    notes: insertedItem.notes,
    createdAt: insertedItem.created_at,
  };
};

/**
 * Remove a selected service from an event
 */
export const removeServiceFromEvent = async (eventId, userId, serviceOrItemId) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  // 1. Verify customer owns event
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId);
  if (!isUUID) {
    const error = new Error('Invalid event ID format');
    error.statusCode = 400;
    throw error;
  }

  const { data: event, error: eventError } = await dbClient
    .from('events')
    .select('id, user_id')
    .eq('id', eventId)
    .maybeSingle();

  if (eventError || !event) {
    const notFoundError = new Error('Event not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  if (event.user_id !== userId) {
    const forbiddenError = new Error('Unauthorized: You cannot modify another customer\'s event');
    forbiddenError.statusCode = 403;
    throw forbiddenError;
  }

  // 2. Delete item matching id, service_id, or provider_id
  const { error: deleteError } = await dbClient
    .from('cart_items')
    .delete()
    .eq('event_id', eventId)
    .or(`id.eq.${serviceOrItemId},service_id.eq.${serviceOrItemId},provider_id.eq.${serviceOrItemId}`);

  if (deleteError) {
    const err = new Error('Failed to remove service from event: ' + deleteError.message);
    err.statusCode = 500;
    throw err;
  }

  return {
    success: true,
    message: 'Service removed from event successfully',
  };
};

/**
 * Update a selected service in an event (e.g. quantity or notes)
 */
export const updateEventService = async (eventId, userId, cartItemId, { quantity, notes }) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  // Verify event ownership
  const { data: event } = await dbClient
    .from('events')
    .select('id, user_id')
    .eq('id', eventId)
    .maybeSingle();

  if (!event || event.user_id !== userId) {
    const forbiddenError = new Error('Unauthorized: You cannot modify another customer\'s event');
    forbiddenError.statusCode = 403;
    throw forbiddenError;
  }

  const updates = {};
  if (quantity !== undefined) {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      const error = new Error('Quantity must be greater than 0');
      error.statusCode = 400;
      throw error;
    }
    updates.quantity = qty;
  }
  if (notes !== undefined) {
    updates.notes = notes;
  }

  const { data: updated, error: updateError } = await dbClient
    .from('cart_items')
    .update(updates)
    .eq('id', cartItemId)
    .eq('event_id', eventId)
    .select('*')
    .maybeSingle();

  if (updateError || !updated) {
    const notFoundError = new Error('Cart item not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  return {
    id: updated.id,
    eventId: updated.event_id,
    serviceId: updated.service_id,
    providerId: updated.provider_id,
    price: parseFloat(updated.unit_price) || 0,
    quantity: updated.quantity,
    bookingDate: updated.booking_date,
    notes: updated.notes,
  };
};

/**
 * GET COMPLETE EVENT PLAN FOR CUSTOMER
 * Returns event details, shortlisted services with live booking status and availability,
 * and authoritative financial/budget calculations.
 */
export const getEventPlan = async (eventId, requestingUser) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId);
  if (!isUUID) {
    const error = new Error('Invalid event ID format');
    error.statusCode = 400;
    throw error;
  }

  // 1. Fetch event
  const { data: event, error: eventError } = await dbClient
    .from('events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle();

  if (eventError || !event) {
    const notFoundError = new Error('Event not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  // 2. Enforce customer ownership
  const isOwner = requestingUser && requestingUser.id === event.user_id;
  const isAdmin = requestingUser && requestingUser.role === 'admin';

  if (!isOwner && !isAdmin) {
    const forbiddenError = new Error('Unauthorized: You do not have access to another customer\'s event');
    forbiddenError.statusCode = 403;
    throw forbiddenError;
  }

  // 3. Fetch shortlisted cart items
  const cartItems = await getCartItemsForEvent(dbClient, eventId);

  // 4. Fetch all bookings associated with this event
  const { data: bookings } = await dbClient
    .from('bookings')
    .select('id, booking_reference, customer_id, provider_id, service_id, booking_date, total_amount, status, created_at, updated_at')
    .eq('event_id', eventId);

  // 5. Query provider availability on the event date for each shortlisted provider
  const availabilityMap = new Map();
  for (const item of cartItems) {
    if (item.provider_id) {
      const isAvailable = await isProviderAvailableOnDate(item.provider_id, event.event_date);
      availabilityMap.set(item.provider_id, isAvailable);
    }
  }

  // 6. Return consolidated Event Plan DTO
  return formatEventPlanDTO(event, cartItems, bookings || [], availabilityMap);
};

/**
 * DISPATCH INDIVIDUAL BOOKING REQUESTS FOR AN EVENT PLAN
 * Creates individual bookings in public.bookings for each eligible shortlisted provider.
 * Does NOT delete the providers from the event plan, allowing the frontend to retain them
 * and reflect live booking statuses (e.g. Request Pending, Request Accepted).
 *
 * @param {string} eventId
 * @param {string} customerId
 * @param {Object} payload Optional { providerIds, notes }
 */
export const dispatchBookingRequests = async (eventId, customerId, payload = {}) => {
  const adminClient = getSupabaseAdmin();
  const anonClient = getSupabaseClient();
  const dbClient = adminClient || anonClient;

  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(eventId);
  if (!isUUID) {
    const error = new Error('Invalid event ID format');
    error.statusCode = 400;
    throw error;
  }

  // 1. Verify Event ownership
  const { data: event, error: eventError } = await dbClient
    .from('events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle();

  if (eventError || !event) {
    const notFoundError = new Error('Event not found');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  if (event.user_id !== customerId) {
    const forbiddenError = new Error('Unauthorized: You can only create bookings for your own events');
    forbiddenError.statusCode = 403;
    throw forbiddenError;
  }

  // 2. Fetch shortlisted services
  let cartItems = await getCartItemsForEvent(dbClient, eventId);

  if (Array.isArray(payload.providerIds) && payload.providerIds.length > 0) {
    const targetSet = new Set(payload.providerIds);
    cartItems = cartItems.filter((item) => targetSet.has(item.provider_id));
  }

  if (cartItems.length === 0) {
    const error = new Error('No eligible services shortlisted in event plan to request bookings for');
    error.statusCode = 400;
    throw error;
  }

  // 3. Process each provider individually
  const newlyCreatedBookings = [];
  const alreadyRequestedProviders = [];
  const unavailableProviders = [];

  for (const item of cartItems) {
    const providerId = item.provider_id;
    const providerName = item.provider?.business_name || 'Service Partner';

    // A. Check for existing active booking for this event (PENDING or ACCEPTED)
    const { data: existingActive } = await dbClient
      .from('bookings')
      .select('id, booking_reference, status')
      .eq('customer_id', customerId)
      .eq('event_id', eventId)
      .eq('provider_id', providerId)
      .in('status', ['pending', 'confirmed'])
      .maybeSingle();

    if (existingActive) {
      alreadyRequestedProviders.push({
        providerId,
        providerName,
        status: toFrontendStatus(existingActive.status),
        bookingReference: existingActive.booking_reference,
      });
      continue;
    }

    // B. Availability check on event date
    const isAvailable = await isProviderAvailableOnDate(providerId, event.event_date);
    if (!isAvailable) {
      unavailableProviders.push({
        providerId,
        providerName,
        reason: `Provider is unavailable on ${event.event_date}`,
      });
      continue;
    }

    // C. Create individual booking record via createBooking
    try {
      const booking = await createBooking(customerId, {
        eventId,
        providerId,
        serviceId: item.service_id,
        bookingDate: event.event_date,
        notes: payload.notes || item.notes || '',
      });
      newlyCreatedBookings.push(booking);
    } catch (bookingErr) {
      console.warn(`[dispatchBookingRequests] Failed to create booking for provider ${providerId}:`, bookingErr.message);
      if (bookingErr.statusCode === 409) {
        if (bookingErr.message.includes('not available')) {
          unavailableProviders.push({ providerId, providerName, reason: bookingErr.message });
        } else {
          alreadyRequestedProviders.push({ providerId, providerName, reason: bookingErr.message });
        }
      } else {
        throw bookingErr;
      }
    }
  }

  return {
    success: true,
    eventId,
    count: newlyCreatedBookings.length,
    newlyCreatedBookings,
    alreadyRequestedProviders,
    unavailableProviders,
    message:
      newlyCreatedBookings.length > 0
        ? `Successfully sent ${newlyCreatedBookings.length} booking request(s)`
        : alreadyRequestedProviders.length > 0
        ? 'All eligible providers have already been requested'
        : 'No bookings could be created (providers unavailable)',
  };
};

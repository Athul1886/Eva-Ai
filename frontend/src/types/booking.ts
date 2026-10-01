import { ProviderPackage } from './service';

export type BookingStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED';

export interface Booking {
  bookingId: string;
  providerId: string;
  providerName: string;
  category: string;
  serviceId?: string;
  packageName?: string;
  packageDetails?: ProviderPackage | Record<string, any>;
  price?: number;
  eventId?: string;
  eventType?: string;
  eventDate?: string;
  location?: string;
  guestCount?: number | '';
  startingPrice?: number;
  status: BookingStatus;
  createdAt: string;
  notes?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  providerPhone?: string;
  providerEmail?: string;
  providerLocation?: string;
  providerImage?: string;
  providerManager?: string;
  updatedAt?: string;
}

/**
 * Normalizes backend booking records into frontend Booking model.
 */
export function normalizeBackendBooking(b: any): Booking {
  if (!b || typeof b !== 'object') {
    return {
      bookingId: `booking-${Date.now()}`,
      providerId: '',
      providerName: 'Service Provider',
      category: 'General',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
  }

  const rawStatus = (b.status || 'PENDING').toString().toUpperCase();
  const validStatus: BookingStatus =
    rawStatus === 'ACCEPTED' ||
    rawStatus === 'REJECTED' ||
    rawStatus === 'CANCELLED' ||
    rawStatus === 'COMPLETED'
      ? rawStatus
      : 'PENDING';

  const rawNotes = b.notes || b.additionalNotes || b.additional_notes;
  let notesPackageName: string | undefined = undefined;
  if (typeof rawNotes === 'string' && rawNotes.trim().toLowerCase().startsWith('package:')) {
    const extracted = rawNotes.trim().replace(/^package:\s*/i, '').trim();
    if (extracted) {
      notesPackageName = extracted;
    }
  }

  const packageName =
    b.packageName ||
    b.package_name ||
    b.serviceTitle ||
    b.service_title ||
    b.serviceName ||
    b.service_name ||
    b.package?.name ||
    b.packageDetails?.name ||
    b.package_details?.name ||
    notesPackageName ||
    undefined;

  const packageDetails =
    b.packageDetails ||
    b.package_details ||
    b.package ||
    (notesPackageName ? { name: notesPackageName } : undefined);

  const serviceId =
    b.serviceId ||
    b.service_id ||
    b.package?.id ||
    b.packageDetails?.id ||
    b.package_details?.id ||
    undefined;

  const rawCandidatePrices = [
    b.amount,
    b.totalAmount,
    b.total_amount,
    b.price,
    b.packageDetails?.price,
    b.package_details?.price,
    b.package?.price,
    b.startingPrice,
    b.starting_price,
  ];

  let resolvedPrice: number | undefined = undefined;
  for (const p of rawCandidatePrices) {
    if (p !== undefined && p !== null && p !== '' && !isNaN(Number(p))) {
      resolvedPrice = Number(p);
      break;
    }
  }

  const finalPrice =
    resolvedPrice !== undefined
      ? resolvedPrice
      : Number(b.provider?.startingPrice || 0) || 0;

  // Provider contact information resolution (strictly preserved for ACCEPTED and COMPLETED bookings)
  let resolvedProviderPhone: string | undefined = undefined;
  let resolvedProviderEmail: string | undefined = undefined;
  let resolvedProviderLocation: string | undefined = undefined;
  let resolvedProviderManager: string | undefined = undefined;

  if (validStatus === 'ACCEPTED' || validStatus === 'COMPLETED') {

    const candidatePhones = [
      b.providerPhone,
      b.provider_phone,
      b.provider?.phone,
      b.provider?.phoneNumber,
      b.provider?.phone_number,
      b.provider?.contactPhone,
      b.provider?.contact_phone,
      b.provider?.businessPhone,
      b.provider?.business_phone,
      b.provider?.user?.phone,
      b.provider?.user?.phoneNumber,
      b.provider?.user?.phone_number,
      b.providerUser?.phone,
      b.providerUser?.phoneNumber,
      b.providerUser?.phone_number,
      b.provider_user?.phone,
      b.provider_user?.phone_number,
      b.providerProfile?.phone,
      b.providerProfile?.contactPhone,
      b.provider_profile?.phone,
      b.providerProfile?.user?.phone,
      b.contact?.phone,
      b.contact?.contactPhone,
      b.contact?.phoneNumber,
      b.contactPhone,
      b.contact_phone,
      b.service?.provider?.phone,
      b.service?.provider?.user?.phone,
      b.service?.providerPhone,
      b.service?.user?.phone,
      b.user?.phone,
    ];

    for (const phone of candidatePhones) {
      if (typeof phone === 'string' && phone.trim()) {
        resolvedProviderPhone = phone.trim();
        break;
      }
    }

    const candidateEmails = [
      b.providerEmail,
      b.provider_email,
      b.provider?.email,
      b.provider?.contactEmail,
      b.provider?.contact_email,
      b.provider?.businessEmail,
      b.provider?.business_email,
      b.provider?.user?.email,
      b.providerUser?.email,
      b.provider_user?.email,
      b.providerProfile?.email,
      b.providerProfile?.contactEmail,
      b.provider_profile?.email,
      b.providerProfile?.user?.email,
      b.contact?.email,
      b.contact?.contactEmail,
      b.contactEmail,
      b.contact_email,
      b.service?.provider?.email,
      b.service?.provider?.user?.email,
      b.service?.providerEmail,
      b.service?.user?.email,
      b.user?.email,
    ];

    for (const email of candidateEmails) {
      if (typeof email === 'string' && email.trim()) {
        resolvedProviderEmail = email.trim();
        break;
      }
    }
  }

  const candidateLocations = [
    b.providerLocation,
    b.provider_location,
    b.provider?.location,
    b.provider?.address,
    b.provider?.city,
    b.providerProfile?.location,
    b.provider_profile?.location,
    b.contact?.address,
    b.contact?.location,
  ];

  for (const loc of candidateLocations) {
    if (typeof loc === 'string' && loc.trim()) {
      resolvedProviderLocation = loc.trim();
      break;
    }
  }

  const candidateManagers = [
    b.providerManager,
    b.provider_manager,
    b.provider?.fullName,
    b.provider?.managerName,
    b.provider?.manager_name,
    b.provider?.contactName,
    b.provider?.contact_name,
    b.provider?.businessName,
    b.provider?.business_name,
    b.provider?.name,
    b.providerProfile?.managerName,
    b.providerProfile?.fullName,
    b.contact?.manager,
    b.contact?.name,
  ];

  for (const mgr of candidateManagers) {
    if (typeof mgr === 'string' && mgr.trim()) {
      resolvedProviderManager = mgr.trim();
      break;
    }
  }

  return {
    bookingId: b.id || b.bookingId || b._id || '',
    providerId: b.providerId || b.provider_id || b.provider?.id || '',
    providerName:
      b.providerName ||
      b.provider?.name ||
      b.provider?.fullName ||
      b.service?.name ||
      b.provider?.businessName ||
      '',
    category:
      b.category ||
      b.provider?.category ||
      b.service?.category ||
      '',
    serviceId,
    packageName,
    packageDetails,
    price: finalPrice,
    eventId: b.eventId || b.event_id || b.event?.id,
    eventType: b.eventType || b.event_type || b.event?.eventType,
    eventDate: b.eventDate || b.event_date || b.event?.eventDate,
    location: b.location || b.provider?.location || b.event?.location,
    guestCount:
      b.guestCount !== undefined && b.guestCount !== null
        ? b.guestCount
        : b.guest_count !== undefined && b.guest_count !== null
        ? b.guest_count
        : b.event?.guestCount,
    startingPrice: finalPrice,
    status: validStatus,
    createdAt: b.createdAt || b.created_at || new Date().toISOString(),
    updatedAt: b.updatedAt || b.updated_at,
    notes: rawNotes,
    customerId: b.customerId || b.customer_id || b.customer?.id || b.user?.id,
    customerName:
      b.customerName ||
      b.customer?.fullName ||
      b.customer?.name ||
      b.user?.fullName ||
      b.user?.name ||
      b.event?.customer?.fullName ||
      b.event?.customer?.name,
    customerPhone:
      b.customerPhone ||
      b.customer?.phone ||
      b.user?.phone ||
      b.event?.customer?.phone,
    customerEmail:
      b.customerEmail ||
      b.customer?.email ||
      b.user?.email ||
      b.event?.customer?.email,
    providerPhone: resolvedProviderPhone,
    providerEmail: resolvedProviderEmail,
    providerLocation: resolvedProviderLocation,
    providerImage:
      b.providerImage ||
      b.provider_image ||
      b.provider?.profileImage ||
      b.provider?.avatar ||
      b.provider?.images?.[0],
    providerManager: resolvedProviderManager,
  };
}


/**
 * Safely extracts and normalizes a list of bookings from various API response shapes.
 */
export function normalizeBackendBookings(rawList: any): Booking[] {
  if (!rawList) return [];
  const list = Array.isArray(rawList)
    ? rawList
    : Array.isArray(rawList?.bookings)
    ? rawList.bookings
    : Array.isArray(rawList?.data)
    ? rawList.data
    : Array.isArray(rawList?.data?.bookings)
    ? rawList.data.bookings
    : [];

  return list.map(normalizeBackendBooking);
}

/**
 * Retrieves and normalizes cached bookings belonging to the active customer session.
 * Ensures customer isolation: returns only bookings belonging to the current session or untagged drafts,
 * and excludes bookings explicitly belonging to a different customer.
 */
export function getCachedCustomerBookings(): Booking[] {
  try {
    const bookingsJson = localStorage.getItem('eva_ai_bookings');
    if (!bookingsJson) return [];
    const parsed = JSON.parse(bookingsJson);
    if (!Array.isArray(parsed)) return [];

    let sessionCustId: string | undefined = undefined;
    let sessionUserId: string | undefined = undefined;
    let sessionEmail: string | undefined = undefined;

    try {
      const sessionRaw = localStorage.getItem('eva_ai_customer_session');
      if (sessionRaw) {
        const session = JSON.parse(sessionRaw);
        sessionCustId = session?.customerId;
        sessionUserId = session?.userId;
        sessionEmail = session?.email?.toLowerCase();
      }
    } catch {
      // Ignore session parse error
    }

    const filtered = parsed.filter((b: any) => {
      if (!b || typeof b !== 'object') return false;
      const bCustId = b.customerId || b.customer_id;
      const bCustEmail = (b.customerEmail || b.customer_email || '')?.toLowerCase();

      // If session is active
      if (sessionCustId || sessionEmail) {
        // If booking matches customer ID or user ID
        if (sessionCustId && bCustId && (bCustId === sessionCustId || bCustId === sessionUserId)) {
          return true;
        }
        // If booking matches customer email
        if (sessionEmail && bCustEmail && bCustEmail === sessionEmail) {
          return true;
        }
        // If booking has NO customer ID and NO customer email (anonymous local draft)
        if (!bCustId && !bCustEmail) {
          return true;
        }
        // Explicitly belongs to another customer
        return false;
      }

      // No active session: only return untagged
      return !bCustId && !bCustEmail;
    });

    return filtered.map(normalizeBackendBooking);
  } catch (e) {
    console.warn('Failed to parse cached bookings from localStorage:', e);
    return [];
  }
}


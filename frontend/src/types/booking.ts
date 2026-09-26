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
    startingPrice:
      typeof b.startingPrice === 'number'
        ? b.startingPrice
        : typeof b.price === 'number'
        ? b.price
        : typeof b.amount === 'number'
        ? b.amount
        : Number(b.startingPrice || b.price || b.provider?.startingPrice || 0) || 0,
    status: validStatus,
    createdAt: b.createdAt || b.created_at || new Date().toISOString(),
    updatedAt: b.updatedAt || b.updated_at,
    notes: b.notes,
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

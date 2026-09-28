export type BookingStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED';

export interface ProviderContactDetails {
  name?: string;
  manager?: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  hours?: string;
}

export interface Booking {
  id?: string;
  bookingId: string;
  bookingReference?: string;
  providerId: string;
  providerName: string;
  category: string;
  serviceId?: string | null;
  serviceTitle?: string | null;
  eventId?: string;
  eventType?: string;
  eventDate?: string;
  location?: string;
  guestCount?: number | '';
  startingPrice?: number;
  amount?: number;
  status: BookingStatus;
  createdAt: string;
  notes?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  updatedAt?: string;
  providerContact?: ProviderContactDetails | null;
  isContactUnlocked?: boolean;
}

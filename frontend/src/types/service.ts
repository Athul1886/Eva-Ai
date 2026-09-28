export type ServiceCategoryName =
  | 'All Services'
  | 'Photography'
  | 'Event Management'
  | 'Makeup Artist'
  | 'Venue'
  | 'Catering'
  | 'Decoration'
  | 'DJ & Entertainment';

export interface ProviderPackage {
  name: string;
  price: number;
  description: string;
  features: string[];
}

export interface ProviderReview {
  author: string;
  rating: number;
  date: string;
  comment: string;
}

export interface Provider {
  id: string;
  name: string;
  category: string;
  location: string;
  rating: number;
  reviewCount: number;
  startingPrice: number;
  yearsExperience: number;
  description: string;
  about: string;
  services: string[];
  tags: string[];
  images: string[];
  priceRange: string;
  available: boolean;
  featured?: boolean;
  packages: ProviderPackage[];
  reviews?: ProviderReview[];
  contactDemo: {
    manager: string;
    phone: string | null;
    email: string | null;
    address: string;
    hours: string;
  };
  portfolios?: Array<{
    id: string;
    imageUrl?: string;
    image_url?: string;
    title?: string;
    caption?: string;
    isFeatured?: boolean;
    displayOrder?: number;
  }>;
  categoryData?: {
    servicesOffered?: string[];
    portfolioImages?: string[];
    packageInfo?: any[];
    [key: string]: any;
  };
}

export interface CategoryInfo {
  id: string;
  name: ServiceCategoryName;
  icon: string;
  description: string;
  filterKey: string;
}

export interface SelectedServiceItem {
  id?: string;
  cartItemId?: string;
  providerId: string;
  providerName: string;
  category: string;
  location: string;
  startingPrice: number;
  price?: number;
  selectedAt: string;
  imageUrl?: string;
  rating?: number | null;
  serviceId?: string;
  serviceTitle?: string;
  hasActiveBooking?: boolean;
  activeBookingStatus?: string | null;
  bookingStatus?: string | null;
  bookingReference?: string | null;
  bookingId?: string | null;
  isAvailable?: boolean;
  unavailableReason?: string | null;
}

export interface ServiceFilterState {
  searchQuery: string;
  category: string;
  location: string;
  priceRange: string;
  minRating: number;
  sortBy: 'recommended' | 'price-asc' | 'price-desc' | 'rating';
}

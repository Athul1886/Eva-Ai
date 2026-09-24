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
    phone: string;
    email: string;
    address: string;
    hours: string;
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
  providerId: string;
  providerName: string;
  category: string;
  location: string;
  startingPrice: number;
  selectedAt: string;
  imageUrl?: string;
}

export interface ServiceFilterState {
  searchQuery: string;
  category: string;
  location: string;
  priceRange: string;
  minRating: number;
  sortBy: 'recommended' | 'price-asc' | 'price-desc' | 'rating';
}

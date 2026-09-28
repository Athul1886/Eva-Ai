export type ProviderCategoryType =
  | 'Photographer'
  | 'Event Manager'
  | 'Makeup Artist'
  | 'Venue / Auditorium'
  | 'Caterer'
  | 'Decorator'
  | 'DJ / Entertainment';

export interface CategorySpecificData {
  // Photographer
  photographyStyles?: string[];
  equipment?: string;

  // Event Manager
  eventTypesHandled?: string[];
  previousExperience?: string;

  // Makeup Artist
  makeupTypes?: string[];

  // Venue
  capacity?: number | '';
  hasAC?: boolean;
  hasParking?: boolean;
  hasStage?: boolean;
  hasDining?: boolean;
  roomsCount?: number | '';
  otherFacilities?: string;

  // Caterer
  cuisineTypes?: string[];
  pricePerPerson?: number | '';
  minGuests?: number | '';
  maxGuests?: number | '';

  // Decorator
  decorStyles?: string[];

  // DJ
  djEquipment?: string;
  entertainmentTypes?: string[];

  // Common
  servicesOffered?: string[];
  portfolioImages?: string[];
  packageInfo?: {
    id?: string;
    name: string;
    price: number;
    description: string;
    features?: string[];
  }[];
}

export interface ProviderAccount {
  id: string;
  fullName: string;
  businessName: string;
  email: string;
  phone: string;
  location: string;
  description: string;
  yearsExperience: number | '';
  startingPrice: number | '';
  category: ProviderCategoryType;
  profileImage?: string;
  passwordHash?: string;
  categoryData: CategorySpecificData;
  createdAt: string;
}

export interface ProviderSession {
  providerId: string;
  businessName: string;
  fullName: string;
  email: string;
  category: string;
  profileImage?: string;
  loginAt: string;
}

export interface ProviderAvailability {
  providerId: string;
  unavailableDates: string[]; // List of YYYY-MM-DD
}

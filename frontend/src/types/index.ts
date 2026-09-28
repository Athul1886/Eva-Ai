export type ServiceCategory = 'all' | 'venue' | 'photo' | 'catering' | 'decor';

export interface ServiceItem {
  id: string;
  category: 'venue' | 'photo' | 'catering' | 'decor';
  title: string;
  guild: string;
  rating: number;
  description: string;
  priceLabel: string;
  priceValue: string;
  badge: string;
  badgeStyle?: string;
  icon: string;
  imageUrl: string;
  details: {
    title: string;
    category: string;
    price: string;
    description: string;
  };
}

export interface PackageItem {
  id: string;
  title: string;
  subtitle: string;
  cost: number;
  checked: boolean;
  prefix?: string;
}

export type InvitationTheme = 'royal-gold' | 'velvet-burgundy' | 'botanical-glass' | 'minimal-noir';

export interface ModalState {
  planWizard: boolean;
  dualPortal: boolean;
  portalTab: 'user' | 'provider';
  serviceDetail: boolean;
  selectedService: {
    category: string;
    title: string;
    price: string;
    description: string;
  } | null;
  bookingPreview: boolean;
}

export * from './booking';

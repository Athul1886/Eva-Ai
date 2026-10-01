export interface PriceRangeOption {
  id: string;
  label: string;
  min: number;
  max: number;
}

export const PRICE_RANGES: PriceRangeOption[] = [
  { id: 'all', label: 'All Price Ranges', min: 0, max: Infinity },
  { id: 'under-25k', label: 'Under ₹25,000', min: 0, max: 25000 },
  { id: '25k-50k', label: '₹25,000 – ₹50,000', min: 25000, max: 50000 },
  { id: '50k-100k', label: '₹50,000 – ₹1,00,000', min: 50000, max: 100000 },
  { id: 'above-100k', label: 'Above ₹1,00,000', min: 100000, max: Infinity },
];

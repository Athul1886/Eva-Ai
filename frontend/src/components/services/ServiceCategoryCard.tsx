import React from 'react';
import Icon from '../common/Icon';
import { CategoryInfo } from '../../types/service';

interface ServiceCategoryCardProps {
  category: CategoryInfo;
  isSelected: boolean;
  providerCount: number;
  onSelect: (filterKey: string) => void;
}

export const ServiceCategoryCard: React.FC<ServiceCategoryCardProps> = ({
  category,
  isSelected,
  providerCount,
  onSelect,
}) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(category.filterKey)}
      className={`group relative flex flex-col items-start p-4 rounded-2xl text-left transition-all duration-300 w-full ${
        isSelected
          ? 'bg-gradient-to-b from-primary/20 via-surface-container-high to-surface-container border-2 border-primary shadow-[0_0_25px_rgba(242,202,80,0.25)] translate-y-[-2px]'
          : 'bg-surface-container-high/60 hover:bg-surface-container-high/90 border border-surface-container-highest/60 hover:border-primary/40 hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]'
      }`}
    >
      {/* Top row: Icon and Count Badge */}
      <div className="flex items-center justify-between w-full mb-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
            isSelected
              ? 'bg-primary text-on-primary shadow-[0_0_12px_rgba(242,202,80,0.4)]'
              : 'bg-surface-container text-primary group-hover:bg-primary/15'
          }`}
        >
          <Icon name={category.icon} className="text-[20px]" />
        </div>

        <span
          className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors ${
            isSelected
              ? 'bg-primary/25 text-primary border border-primary/40'
              : 'bg-surface-container-lowest/80 text-on-surface-variant/80 border border-surface-container-highest/50 group-hover:text-primary'
          }`}
        >
          {providerCount} {providerCount === 1 ? 'Expert' : 'Experts'}
        </span>
      </div>

      {/* Category Name */}
      <h3
        className={`font-title-md text-sm sm:text-base font-semibold transition-colors leading-snug line-clamp-1 ${
          isSelected ? 'text-primary' : 'text-on-surface group-hover:text-primary'
        }`}
      >
        {category.name}
      </h3>

      {/* Small Description */}
      <p className="text-[12px] text-on-surface-variant line-clamp-2 mt-1 leading-relaxed opacity-85 group-hover:opacity-100">
        {category.description}
      </p>

      {/* Subtle bottom active pill indicator */}
      {isSelected && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full shadow-[0_0_8px_#f2ca50]" />
      )}
    </button>
  );
};

export default ServiceCategoryCard;

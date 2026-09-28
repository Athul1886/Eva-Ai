import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import Icon from './Icon';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  showLabel = true,
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-200 border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary ${
        isDark
          ? 'bg-surface-container/80 hover:bg-surface-container-high border-surface-container-highest/60 text-on-surface-variant hover:text-primary hover:border-primary/40 shadow-sm'
          : 'bg-surface-container hover:bg-surface-container-high border-surface-container-highest text-on-surface hover:text-primary hover:border-primary/50 shadow-sm'
      } ${className}`}
      title={isDark ? 'Switch to Light theme' : 'Switch to Dark theme'}
      aria-label={isDark ? 'Switch to Light theme' : 'Switch to Dark theme'}
    >
      <Icon
        name={isDark ? 'dark_mode' : 'light_mode'}
        className="text-[16px] text-primary transition-transform duration-300"
      />
      {showLabel && (
        <span className="hidden sm:inline">
          {isDark ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
};

export default ThemeToggle;

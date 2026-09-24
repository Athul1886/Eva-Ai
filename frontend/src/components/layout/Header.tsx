import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from '../common/Icon';
import ThemeToggle from '../common/ThemeToggle';

export const Header: React.FC = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface/70 backdrop-blur-2xl transition-all duration-300 shadow-[0_4px_30px_rgba(0,0,0,0.5)] border-b border-surface-container/40">
      <div className="h-20 max-w-[1440px] mx-auto px-margin-mobile md:px-margin flex items-center justify-between">
        <div className="flex items-center gap-12">
          {/* Eva-Ai Brand Logo */}
          <Link className="flex items-center gap-space-sm group" to="/">
            <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center shadow-[inset_0_1px_1px_rgba(242,202,80,0.3)] transition-transform group-hover:scale-105">
              <Icon name="auto_awesome" className="text-primary text-[20px]" />
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm font-semibold tracking-wider text-primary uppercase">
                EVA-AI
              </span>
              <span className="font-label-sm text-label-sm uppercase text-on-surface-variant -mt-1 tracking-widest">
                AI Event Platform
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-space-lg">
            <Link
              className={`transition-colors font-title-md text-title-md ${
                isHome ? 'text-primary font-semibold' : 'text-on-surface-variant hover:text-primary'
              }`}
              to="/"
            >
              Home
            </Link>
            <a
              className="font-title-md text-title-md text-on-surface-variant hover:text-primary transition-colors"
              href={isHome ? '#how-it-works' : '/#how-it-works'}
            >
              How It Works
            </a>
            <a
              className="font-title-md text-title-md text-on-surface-variant hover:text-primary transition-colors"
              href={isHome ? '#services' : '/#services'}
            >
              Services
            </a>
            <a
              className="font-title-md text-title-md text-on-surface-variant hover:text-primary transition-colors"
              href={isHome ? '#for-providers' : '/#for-providers'}
            >
              For Providers
            </a>
          </nav>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-space-md">
          <ThemeToggle />
          <Link
            className="inline-flex items-center justify-center px-space-md py-space-sm rounded-lg font-title-md text-title-md text-on-surface hover:text-primary transition-colors"
            to="/login"
          >
            Sign In
          </Link>
          <Link
            className="inline-flex items-center justify-center px-3 sm:px-space-lg py-space-sm rounded-lg bg-primary hover:bg-tertiary text-on-primary font-title-md text-title-md font-semibold transition-all shadow-[0_0_20px_rgba(242,202,80,0.25)] hover:shadow-[0_0_28px_rgba(242,202,80,0.4)]"
            to="/signup"
          >
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;

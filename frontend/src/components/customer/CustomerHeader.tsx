import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../common/Icon';
import ThemeToggle from '../common/ThemeToggle';
import { CustomerSession, clearCustomerSession, getCustomerSession } from '../../utils/customerAuth';

interface CustomerHeaderProps {
  session?: CustomerSession | null;
}

export const CustomerHeader: React.FC<CustomerHeaderProps> = ({ session: initialSession }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [session, setSession] = useState<CustomerSession | null>(initialSession || getCustomerSession());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setSession(getCustomerSession());
    };
    window.addEventListener('eva_ai_customer_session_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('eva_ai_customer_session_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setDropdownOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    clearCustomerSession();
    navigate('/login');
  };

  const navLinks = [
    {
      to: '/customer/dashboard',
      label: 'Dashboard',
      icon: 'space_dashboard',
      isActive: location.pathname === '/customer/dashboard',
    },
    {
      to: '/customer/services',
      label: 'Explore Services',
      icon: 'explore',
      isActive: location.pathname.startsWith('/customer/services'),
    },
    {
      to: '/customer/event-plan',
      label: 'My Event Plan',
      icon: 'assignment',
      isActive: location.pathname === '/customer/event-plan',
    },
    {
      to: '/customer/bookings',
      label: 'My Bookings',
      icon: 'receipt_long',
      isActive: location.pathname === '/customer/bookings',
    },
  ];

  const displayName = session?.fullName || 'Event Host';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface/85 backdrop-blur-2xl transition-all border-b border-surface-container/60 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="h-20 max-w-[1440px] mx-auto px-margin-mobile md:px-margin flex items-center justify-between">
        {/* Left: Brand Logo & Portal Tag */}
        <div className="flex items-center gap-8 lg:gap-12">
          <Link className="flex items-center gap-space-sm group" to="/customer/dashboard">
            <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center shadow-[inset_0_1px_1px_rgba(242,202,80,0.3)] transition-transform group-hover:scale-105">
              <Icon name="auto_awesome" className="text-primary text-[20px]" />
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm font-semibold tracking-wider text-primary uppercase">
                EVA-AI
              </span>
              <span className="font-label-sm text-label-sm uppercase text-on-surface-variant -mt-1 tracking-widest">
                Customer Portal
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                  link.isActive
                    ? 'bg-primary/15 text-primary border border-primary/30 shadow-[0_0_15px_rgba(242,202,80,0.15)]'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60'
                }`}
              >
                <Icon name={link.icon} className="text-[18px]" />
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: User Menu & Mobile Hamburger */}
        <div className="flex items-center gap-3">
          {/* Theme Switcher */}
          <ThemeToggle />

          {/* User Profile Dropdown (Desktop) */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 pl-3 py-1.5 pr-2 rounded-full bg-surface-container-high/70 border border-surface-container-highest hover:border-primary/40 transition-colors group"
            >
              <div className="text-left hidden sm:block">
                <span className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors block leading-tight truncate max-w-[130px]">
                  {displayName}
                </span>
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block">
                  Event Host
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center border border-primary/30 shadow-inner">
                {initial}
              </div>
              <Icon
                name={dropdownOpen ? 'expand_less' : 'expand_more'}
                className="text-on-surface-variant group-hover:text-primary text-[18px] transition-transform"
              />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-surface-container-high/95 backdrop-blur-2xl border border-surface-container-highest shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-3 border-b border-surface-container-highest/60">
                  <p className="text-xs font-bold text-on-surface truncate">{displayName}</p>
                  <p className="text-[11px] text-on-surface-variant truncate">{session?.email || 'Customer Account'}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-wider">
                    Customer
                  </span>
                </div>

                <div className="py-1">
                  <Link
                    to="/customer/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-on-surface hover:text-primary hover:bg-surface-bright/50 transition-colors"
                  >
                    <Icon name="person" className="text-[18px] text-primary" />
                    <span>My Profile</span>
                  </Link>

                  <Link
                    to="/customer/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-on-surface hover:text-primary hover:bg-surface-bright/50 transition-colors"
                  >
                    <Icon name="space_dashboard" className="text-[18px] text-primary" />
                    <span>Dashboard</span>
                  </Link>

                  <Link
                    to="/customer/services"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-on-surface hover:text-primary hover:bg-surface-bright/50 transition-colors"
                  >
                    <Icon name="explore" className="text-[18px] text-primary" />
                    <span>Explore Services</span>
                  </Link>

                  <Link
                    to="/customer/event-plan"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-on-surface hover:text-primary hover:bg-surface-bright/50 transition-colors"
                  >
                    <Icon name="assignment" className="text-[18px] text-primary" />
                    <span>My Event Plan</span>
                  </Link>

                  <Link
                    to="/customer/bookings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-on-surface hover:text-primary hover:bg-surface-bright/50 transition-colors"
                  >
                    <Icon name="receipt_long" className="text-[18px] text-primary" />
                    <span>My Bookings</span>
                  </Link>
                </div>

                <div className="pt-1 border-t border-surface-container-highest/60">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-error hover:bg-error/10 transition-colors text-left"
                  >
                    <Icon name="logout" className="text-[18px]" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors border border-surface-container-highest"
            aria-label="Toggle Navigation Menu"
          >
            <Icon name={mobileMenuOpen ? 'close' : 'menu'} className="text-[22px]" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-surface-container-high/95 backdrop-blur-2xl border-b border-surface-container-highest px-4 py-4 space-y-2">
          {/* User info */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container border border-surface-container-highest mb-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 text-primary font-bold text-sm flex items-center justify-center border border-primary/30">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-on-surface truncate">{displayName}</p>
              <p className="text-xs text-on-surface-variant truncate">{session?.email}</p>
            </div>
          </div>

          {/* Links */}
          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  link.isActive
                    ? 'bg-primary text-on-primary font-bold'
                    : 'text-on-surface hover:bg-surface-bright/50'
                }`}
              >
                <Icon name={link.icon} className="text-[20px]" />
                <span>{link.label}</span>
              </Link>
            ))}

            <Link
              to="/customer/profile"
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-on-surface hover:bg-surface-bright/50 transition-colors"
            >
              <Icon name="person" className="text-[20px] text-primary" />
              <span>Profile</span>
            </Link>

            <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-surface-container/70 border border-surface-container-highest/50 my-1">
              <span className="text-xs font-semibold text-on-surface">Theme</span>
              <ThemeToggle showLabel={true} />
            </div>
          </div>

          <div className="pt-2 border-t border-surface-container-highest/60">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-error hover:bg-error/10 transition-colors"
            >
              <Icon name="logout" className="text-[20px]" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default CustomerHeader;

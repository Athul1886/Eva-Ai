import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from '../common/Icon';
import ThemeToggle from '../common/ThemeToggle';
import {
  AdminSession,
  getAdminSession,
  logoutAdmin,
} from '../../utils/adminAuth';

interface AdminHeaderProps {
  session?: AdminSession | null;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ session: initialSession }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [session, setSession] = useState<AdminSession | null>(initialSession || getAdminSession());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleUpdate = () => {
      setSession(getAdminSession());
    };
    window.addEventListener('eva_ai_admin_session_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('eva_ai_admin_session_updated', handleUpdate);
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

  const handleLogout = async () => {
    try {
      await logoutAdmin();
    } finally {
      navigate('/admin/login');
    }
  };

  const navLinks = [
    {
      to: '/admin/dashboard',
      label: 'Dashboard',
      icon: 'dashboard',
      isActive: location.pathname === '/admin/dashboard',
    },
    {
      to: '/admin/users',
      label: 'Users',
      icon: 'people',
      isActive: location.pathname.startsWith('/admin/users'),
    },
    {
      to: '/admin/providers',
      label: 'Providers',
      icon: 'storefront',
      isActive: location.pathname.startsWith('/admin/providers'),
    },
  ];

  const displayName = session?.fullName || session?.email?.split('@')[0] || 'Administrator';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-2xl transition-all border-b border-surface-container/60 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="h-20 max-w-[1440px] mx-auto px-margin-mobile md:px-margin flex items-center justify-between">
        {/* Left: Brand Logo & Admin Badge */}
        <div className="flex items-center gap-6 lg:gap-10">
          <Link className="flex items-center gap-space-sm group" to="/admin/dashboard">
            <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center shadow-[inset_0_1px_1px_rgba(242,202,80,0.3)] transition-transform group-hover:scale-105">
              <Icon name="shield" className="text-primary text-[20px]" />
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-title-lg tracking-tight font-bold text-on-surface">
                Eva<span className="text-primary italic font-normal">.Ai</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-primary/80 -mt-1">
                Admin Atelier
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-surface-container-low/60 p-1.5 rounded-full border border-surface-container-highest/40 backdrop-blur-md">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-body-sm font-semibold transition-all duration-200 ${
                  link.isActive
                    ? 'bg-primary text-on-primary shadow-[0_0_15px_rgba(242,202,80,0.3)] font-bold'
                    : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60'
                }`}
              >
                <Icon name={link.icon} className="text-[18px]" />
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: Theme Toggle & Admin Profile Dropdown */}
        <div className="flex items-center gap-3 md:gap-4">
          <ThemeToggle />

          {/* Desktop Profile Pill */}
          <div className="relative hidden sm:block" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-3 p-1.5 pr-3 rounded-full bg-surface-container-low hover:bg-surface-container-high border border-surface-container-highest/60 transition-all text-left group"
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary/30 to-primary/80 flex items-center justify-center text-on-primary font-bold text-sm shadow-inner">
                {initial}
              </div>
              <div className="flex flex-col">
                <span className="text-body-sm font-semibold text-on-surface leading-tight max-w-[140px] truncate">
                  {displayName}
                </span>
                <span className="text-[10px] font-bold text-primary tracking-wider uppercase">
                  Master Admin
                </span>
              </div>
              <Icon
                name="expand_more"
                className={`text-[18px] text-on-surface-variant transition-transform duration-200 ${
                  dropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-surface-container-high/95 backdrop-blur-2xl border border-surface-container-highest shadow-2xl p-2 z-50 animate-in fade-in duration-200">
                <div className="p-3 border-b border-surface-container-highest/60 mb-1">
                  <p className="text-body-sm font-bold text-on-surface truncate">{displayName}</p>
                  <p className="text-label-sm text-on-surface-variant truncate">{session?.email}</p>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold tracking-wider uppercase">
                    <Icon name="verified_user" className="text-[12px]" />
                    <span>Admin Authorization</span>
                  </div>
                </div>

                <Link
                  to="/admin/dashboard"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-body-sm text-on-surface hover:bg-surface-container transition-colors"
                >
                  <Icon name="dashboard" className="text-[18px] text-primary" />
                  <span>Admin Dashboard</span>
                </Link>

                <Link
                  to="/admin/users"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-body-sm text-on-surface hover:bg-surface-container transition-colors"
                >
                  <Icon name="people" className="text-[18px] text-primary" />
                  <span>Customer Directory</span>
                </Link>

                <Link
                  to="/admin/providers"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-body-sm text-on-surface hover:bg-surface-container transition-colors"
                >
                  <Icon name="storefront" className="text-[18px] text-primary" />
                  <span>Provider Network</span>
                </Link>

                <div className="my-1 border-t border-surface-container-highest/40" />

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-body-sm text-error hover:bg-error/10 transition-colors text-left font-semibold"
                >
                  <Icon name="logout" className="text-[18px]" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Logout button on desktop */}
          <button
            onClick={handleLogout}
            className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface-container-low hover:bg-error/10 hover:text-error text-on-surface-variant text-body-sm font-semibold border border-surface-container-highest/40 transition-colors"
            title="Sign Out"
          >
            <Icon name="logout" className="text-[18px]" />
            <span className="hidden xl:inline">Logout</span>
          </button>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-surface-container-low border border-surface-container-highest/60 text-on-surface"
            aria-label="Toggle Navigation Menu"
          >
            <Icon name={mobileMenuOpen ? 'close' : 'menu'} className="text-[24px]" />
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-surface-container-high/95 backdrop-blur-2xl border-b border-surface-container-highest px-margin-mobile py-5 space-y-4 shadow-2xl animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container border border-surface-container-highest/50">
            <div className="w-10 h-10 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-base">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-body-sm font-bold text-on-surface truncate">{displayName}</p>
              <p className="text-label-sm text-on-surface-variant truncate">{session?.email}</p>
            </div>
          </div>

          <div className="space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-body-md font-semibold transition-colors ${
                  link.isActive
                    ? 'bg-primary text-on-primary font-bold'
                    : 'text-on-surface hover:bg-surface-container'
                }`}
              >
                <Icon name={link.icon} className="text-[20px]" />
                <span>{link.label}</span>
              </Link>
            ))}
          </div>

          <div className="pt-2 border-t border-surface-container-highest/50">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-error/10 text-error font-title-md font-semibold hover:bg-error/20 transition-colors"
            >
              <Icon name="logout" className="text-[20px]" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default AdminHeader;

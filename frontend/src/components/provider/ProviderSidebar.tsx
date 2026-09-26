import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Icon from '../common/Icon';
import { logoutProvider, getProviderBookings } from '../../utils/providerAuth';
import { ProviderSession } from '../../types/provider';

interface ProviderSidebarProps {
  session: ProviderSession | null;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const ProviderSidebar: React.FC<ProviderSidebarProps> = ({ session, isOpenMobile, onCloseMobile }) => {
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    const updateCount = () => {
      if (session?.providerId) {
        const bookings = getProviderBookings(session.providerId);
        const pending = bookings.filter((b) => b.status === 'PENDING').length;
        setPendingCount(pending);
      }
    };

    updateCount();
    window.addEventListener('eva_ai_bookings_updated', updateCount);
    window.addEventListener('storage', updateCount);

    return () => {
      window.removeEventListener('eva_ai_bookings_updated', updateCount);
      window.removeEventListener('storage', updateCount);
    };
  }, [session?.providerId]);

  const handleLogout = async () => {
    await logoutProvider();
    navigate('/login');
  };

  const navItems = [
    {
      to: '/provider/dashboard',
      label: 'Dashboard',
      icon: 'space_dashboard',
      badge: null,
    },
    {
      to: '/provider/bookings',
      label: 'Booking Requests',
      icon: 'receipt_long',
      badge: pendingCount > 0 ? pendingCount : null,
    },
    {
      to: '/provider/schedule',
      label: 'Update Schedule',
      icon: 'event_available',
      badge: null,
    },
    {
      to: '/provider/profile',
      label: 'Profile / Services',
      icon: 'badge',
      badge: null,
    },
    {
      to: '/provider/portfolio',
      label: 'Portfolio & Tiers',
      icon: 'photo_library',
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-20 bottom-0 left-0 z-40 w-64 bg-surface-container-low/95 lg:bg-surface-container-low/60 backdrop-blur-2xl border-r border-surface-container/60 flex flex-col justify-between py-6 px-4 transition-transform duration-300 lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6">
          {/* Section Label */}
          <div className="px-3">
            <span className="font-label-sm text-[11px] uppercase tracking-widest text-outline font-bold">
              Provider Atelier Management
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/provider/dashboard'}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-primary/20 to-primary/5 text-primary border border-primary/30 shadow-[0_0_15px_rgba(242,202,80,0.15)] font-bold'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/60 border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        name={item.icon}
                        className={`text-[20px] transition-transform group-hover:scale-110 ${
                          isActive ? 'text-primary' : 'text-outline group-hover:text-primary'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== null && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-secondary text-on-secondary-fixed shadow-[0_0_8px_rgba(255,178,190,0.4)]">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Bottom Card & Logout */}
        <div className="pt-6 space-y-4 border-t border-surface-container/60">
          {/* Verified Atelier Card */}
          <div className="p-3.5 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-secondary/15 flex items-center justify-center text-secondary">
                <Icon name="verified" className="text-[18px]" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-on-surface">Verified Atelier</span>
                <span className="text-[10px] text-on-surface-variant">Eva-Ai Curated Guild</span>
              </div>
            </div>
          </div>

          {/* Logout Action */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container hover:bg-error/15 text-xs font-semibold text-on-surface-variant hover:text-error transition-all border border-surface-container-highest/40 group"
          >
            <Icon name="logout" className="text-[16px] group-hover:-translate-x-0.5 transition-transform" />
            <span>Sign Out Provider</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default ProviderSidebar;

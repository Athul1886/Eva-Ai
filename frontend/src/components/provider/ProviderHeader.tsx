import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../common/Icon';
import ThemeToggle from '../common/ThemeToggle';
import { ProviderSession } from '../../types/provider';
import { logoutProvider, getProviderProfile, getProviderSession } from '../../utils/providerAuth';

interface ProviderHeaderProps {
  session: ProviderSession | null;
  onToggleSidebar?: () => void;
}

export const ProviderHeader: React.FC<ProviderHeaderProps> = ({ session, onToggleSidebar }) => {
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState<string | undefined>(session?.profileImage);

  const syncAvatar = () => {
    if (session?.providerId) {
      const p = getProviderProfile(session.providerId);
      const s = getProviderSession();
      setCurrentAvatar(p?.profileImage || s?.profileImage);
    }
  };

  useEffect(() => {
    syncAvatar();
    const handleUpdate = () => syncAvatar();
    window.addEventListener('eva_ai_provider_session_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('eva_ai_provider_session_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [session?.providerId, session?.profileImage]);

  const handleLogout = async () => {
    await logoutProvider();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-surface/80 backdrop-blur-2xl border-b border-surface-container/60 shadow-[0_4px_30px_rgba(0,0,0,0.5)] w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2">
        {/* Left: Mobile hamburger & Logo & Atelier Tag */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-xl bg-surface-container text-on-surface-variant hover:text-primary transition-colors shrink-0"
              aria-label="Toggle menu"
            >
              <Icon name="menu" className="text-[20px] sm:text-[22px]" />
            </button>
          )}

          <Link to="/provider/dashboard" className="flex items-center gap-2 sm:gap-3 group min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-surface-container-high flex items-center justify-center shadow-[inset_0_1px_1px_rgba(242,202,80,0.3)] transition-transform group-hover:scale-105 shrink-0">
              <Icon name="auto_awesome" className="text-primary text-[18px] sm:text-[22px]" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-headline-sm text-base sm:text-lg font-bold tracking-wider text-primary uppercase">
                  EVA-AI
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest bg-secondary-container/30 text-secondary border border-secondary/30">
                  Provider
                </span>
              </div>
              <span className="hidden sm:inline-block text-[11px] font-medium uppercase tracking-widest text-on-surface-variant -mt-0.5">
                Atelier Portal
              </span>
            </div>
          </Link>
        </div>

        {/* Center / Right: ThemeToggle, Notifications, Profile, Logout */}
        <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
          <ThemeToggle />

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 sm:p-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors border border-surface-container-highest/40 shrink-0"
              aria-label="Notifications"
            >
              <Icon name="notifications" className="text-[18px] sm:text-[20px]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-secondary rounded-full ring-2 ring-surface animate-pulse" />
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] max-w-xs sm:w-80 rounded-2xl bg-surface-container-high/95 backdrop-blur-xl border border-surface-container-highest shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-surface-container">
                  <span className="font-semibold text-sm text-on-surface">Recent Alerts</span>
                  <span className="text-[11px] font-medium text-secondary">1 New</span>
                </div>
                <div className="py-3 space-y-2.5">
                  <div className="p-2.5 rounded-xl bg-surface-container border border-surface-container-highest/40 text-xs">
                    <div className="flex items-center gap-2 text-primary font-medium mb-1">
                      <Icon name="event" className="text-[14px]" />
                      <span>New Booking Request Received</span>
                    </div>
                    <p className="text-on-surface-variant leading-relaxed">
                      A client submitted an inquiry for their upcoming celebration.
                    </p>
                  </div>
                </div>
                <Link
                  to="/provider/bookings"
                  onClick={() => setNotificationsOpen(false)}
                  className="block text-center pt-2 text-xs font-semibold text-primary hover:underline"
                >
                  View all booking requests
                </Link>
              </div>
            )}
          </div>

          {/* Provider Pill & Profile Dropdown */}
          {session && (
            <div className="flex items-center gap-1.5 sm:gap-3 pl-1.5 sm:pl-3 border-l border-surface-container-highest/50">
              <Link
                to="/provider/profile"
                className="flex items-center gap-2 p-0.5 sm:p-1 rounded-xl hover:bg-surface-container transition-colors group shrink-0"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-primary font-bold text-xs sm:text-sm border border-primary/30 group-hover:border-primary transition-colors overflow-hidden shrink-0">
                  {currentAvatar ? (
                    <img src={currentAvatar} alt={session.businessName} className="w-full h-full object-cover" />
                  ) : (
                    session.businessName ? session.businessName.charAt(0).toUpperCase() : 'P'
                  )}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors max-w-[140px] truncate">
                    {session.businessName}
                  </span>
                  <span className="text-[10px] text-secondary font-medium uppercase tracking-wider">
                    {session.category || 'Partner'}
                  </span>
                </div>
              </Link>

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 rounded-xl bg-surface-container hover:bg-error/20 text-on-surface-variant hover:text-error transition-all border border-surface-container-highest/40 group shrink-0"
                title="Log Out of Atelier Portal"
              >
                <Icon name="logout" className="text-[16px] sm:text-[18px] group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default ProviderHeader;

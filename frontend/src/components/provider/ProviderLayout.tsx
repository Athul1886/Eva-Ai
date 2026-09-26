import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import ProviderHeader from './ProviderHeader';
import ProviderSidebar from './ProviderSidebar';
import { getProviderSession, verifyProviderSession } from '../../utils/providerAuth';
import { ProviderSession } from '../../types/provider';
import { getStoredAccessToken, getStoredRefreshToken } from '../../api/api';

export const ProviderLayout: React.FC = () => {
  const location = useLocation();
  const [session, setSession] = useState<ProviderSession | null>(getProviderSession());
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Determine if we need to verify session on initial mount
  const hasTokens = Boolean(getStoredAccessToken() || getStoredRefreshToken());
  const [isVerifying, setIsVerifying] = useState<boolean>(hasTokens);

  // 1. Verify and rehydrate backend session once on mount if tokens exist
  useEffect(() => {
    let isMounted = true;
    const token = getStoredAccessToken();
    const refreshToken = getStoredRefreshToken();

    if (token || refreshToken) {
      verifyProviderSession().then((result) => {
        if (!isMounted) return;
        if (!result.valid) {
          setSession(null);
        } else {
          setSession(getProviderSession());
        }
        setIsVerifying(false);
      });
    } else {
      setIsVerifying(false);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Sync local session on storage and internal session events
  useEffect(() => {
    const handleUpdate = () => {
      setSession(getProviderSession());
    };
    window.addEventListener('eva_ai_provider_session_updated', handleUpdate);
    return () => {
      window.removeEventListener('eva_ai_provider_session_updated', handleUpdate);
    };
  }, []);

  // 3. Re-check session on location change
  useEffect(() => {
    setSession(getProviderSession());
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  // Loading state during initial verification to avoid flash of content
  if (isVerifying) {
    return (
      <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-secondary/30 border-t-secondary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Route protection: If no active provider session, redirect to /login/provider
  if (!session) {
    return <Navigate to="/login/provider" state={{ from: location.pathname }} replace />;
  }

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary overflow-x-hidden w-full max-w-full">
      {/* Provider Sticky Header */}
      <ProviderHeader session={session} onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />

      <div className="flex-1 flex max-w-[1600px] w-full mx-auto min-w-0">
        {/* Navigation Sidebar */}
        <ProviderSidebar
          session={session}
          isOpenMobile={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 lg:pl-64 min-w-0 flex flex-col relative overflow-hidden w-full max-w-full">
          {/* Ambient atmospheric glows */}
          <div className="absolute top-10 right-10 w-[600px] h-[300px] bg-primary/8 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute bottom-20 left-10 w-[500px] h-[300px] bg-secondary-container/10 rounded-full blur-[140px] pointer-events-none" />

          <div className="flex-1 p-3.5 sm:p-6 lg:p-8 relative z-10 w-full min-w-0 max-w-full">
            <Outlet context={{ session }} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default ProviderLayout;

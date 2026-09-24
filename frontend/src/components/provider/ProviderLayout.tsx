import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import ProviderHeader from './ProviderHeader';
import ProviderSidebar from './ProviderSidebar';
import { getProviderSession } from '../../utils/providerAuth';
import { ProviderSession } from '../../types/provider';

export const ProviderLayout: React.FC = () => {
  const [session, setSession] = useState<ProviderSession | null>(getProviderSession());
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Re-check session on location change
    setSession(getProviderSession());
    setMobileSidebarOpen(false);
  }, [location.pathname]);

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

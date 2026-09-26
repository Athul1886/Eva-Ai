import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import CustomerHeader from './CustomerHeader';
import {
  getCustomerSession,
  verifyCustomerSession,
  CustomerSession,
} from '../../utils/customerAuth';
import { getStoredAccessToken, getStoredRefreshToken } from '../../api/api';

export const CustomerLayout: React.FC = () => {
  const location = useLocation();
  const [session, setSession] = useState<CustomerSession | null>(getCustomerSession());

  // Determine if we need to verify session on initial mount
  const hasTokens = Boolean(getStoredAccessToken() || getStoredRefreshToken());
  const [isVerifying, setIsVerifying] = useState<boolean>(hasTokens);

  // 1. Verify and rehydrate backend session once on mount if tokens exist
  useEffect(() => {
    let isMounted = true;
    const token = getStoredAccessToken();
    const refreshToken = getStoredRefreshToken();

    if (token || refreshToken) {
      verifyCustomerSession().then((result) => {
        if (!isMounted) return;
        if (!result.valid) {
          setSession(null);
        } else {
          setSession(getCustomerSession());
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

  // 2. Sync local session on storage and internal events
  useEffect(() => {
    const handleUpdate = () => {
      setSession(getCustomerSession());
    };
    window.addEventListener('eva_ai_customer_session_updated', handleUpdate);
    return () => {
      window.removeEventListener('eva_ai_customer_session_updated', handleUpdate);
    };
  }, []);

  // 3. Sync session state on route changes
  useEffect(() => {
    setSession(getCustomerSession());
  }, [location.pathname]);

  // Loading state during initial verification to avoid flash of content
  if (isVerifying) {
    return (
      <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Route protection: If no active customer session, redirect to /login/customer
  if (!session) {
    return <Navigate to="/login/customer" state={{ from: location.pathname }} replace />;
  }

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary">
      {/* Shared Customer Logged-in Header */}
      <CustomerHeader session={session} />

      {/* Main Outlet */}
      <div className="flex-1 flex flex-col">
        <Outlet context={{ session }} />
      </div>
    </div>
  );
};

export default CustomerLayout;

import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import CustomerHeader from './CustomerHeader';
import { getCustomerSession } from '../../utils/customerAuth';
import { CustomerSession } from '../../utils/customerAuth';

export const CustomerLayout: React.FC = () => {
  const [session, setSession] = useState<CustomerSession | null>(getCustomerSession());
  const [sessionExpired, setSessionExpired] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Re-verify session on route change
    setSession(getCustomerSession());

    const handleSessionChange = () => {
      setSession(getCustomerSession());
    };

    const handleExpired = () => {
      setSession(null);
      setSessionExpired(true);
    };

    window.addEventListener('eva_ai_customer_session_updated', handleSessionChange);
    window.addEventListener('eva_ai_session_expired', handleExpired);
    window.addEventListener('storage', handleSessionChange);

    return () => {
      window.removeEventListener('eva_ai_customer_session_updated', handleSessionChange);
      window.removeEventListener('eva_ai_session_expired', handleExpired);
      window.removeEventListener('storage', handleSessionChange);
    };
  }, [location.pathname]);

  // Route protection: If no active customer session, redirect to /login/customer
  if (!session) {
    return (
      <Navigate
        to="/login/customer"
        state={{ from: location.pathname, reason: sessionExpired ? 'expired' : undefined }}
        replace
      />
    );
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

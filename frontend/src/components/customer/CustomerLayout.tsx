import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import CustomerHeader from './CustomerHeader';
import { getCustomerSession } from '../../utils/customerAuth';
import { CustomerSession } from '../../utils/customerAuth';

export const CustomerLayout: React.FC = () => {
  const [session, setSession] = useState<CustomerSession | null>(getCustomerSession());
  const location = useLocation();

  useEffect(() => {
    // Re-verify session on route change
    setSession(getCustomerSession());
  }, [location.pathname]);

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

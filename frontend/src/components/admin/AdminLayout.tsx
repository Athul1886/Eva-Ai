import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import AdminHeader from './AdminHeader';
import {
  getAdminSession,
  verifyAdminSession,
  AdminSession,
  clearAdminSession,
} from '../../utils/adminAuth';
import { getStoredAccessToken, getStoredRefreshToken } from '../../api/api';

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const initialSession = getAdminSession();
  const [session, setSession] = useState<AdminSession | null>(initialSession);

  // We should verify session on cold start or when tokens exist
  const hasTokens = Boolean(getStoredAccessToken() || getStoredRefreshToken());
  const [isVerifying, setIsVerifying] = useState<boolean>(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);

  // 1. Authoritative Backend Session Verification on Mount
  useEffect(() => {
    let isMounted = true;
    const token = getStoredAccessToken();
    const refreshToken = getStoredRefreshToken();

    if (token || refreshToken) {
      verifyAdminSession().then((result) => {
        if (!isMounted) return;
        if (result.valid) {
          const current = getAdminSession();
          if (current && current.role === 'admin') {
            setSession(current);
            setIsAuthorized(true);
          } else {
            clearAdminSession();
            setSession(null);
            setIsAuthorized(false);
          }
        } else {
          clearAdminSession();
          setSession(null);
          setIsAuthorized(false);
        }
        setIsVerifying(false);
      });
    } else {
      setIsVerifying(false);
      setIsAuthorized(false);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Sync local session on internal updates
  useEffect(() => {
    const handleUpdate = () => {
      const current = getAdminSession();
      if (current && current.role === 'admin') {
        setSession(current);
        setIsAuthorized(true);
      } else {
        setSession(null);
        setIsAuthorized(false);
      }
    };
    window.addEventListener('eva_ai_admin_session_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('eva_ai_admin_session_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // 3. Sync session state on route changes
  useEffect(() => {
    const current = getAdminSession();
    if (current && current.role === 'admin') {
      setSession(current);
    }
  }, [location.pathname]);

  // Loading state during auth verification
  if (isVerifying) {
    return (
      <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-body-sm text-on-surface-variant font-medium">Verifying administrator authorization...</p>
        </div>
      </div>
    );
  }

  // Route protection: If no verified admin session, redirect to /admin/login
  if (!isAuthorized || !session || session.role !== 'admin') {
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary">
      {/* Shared Admin Header */}
      <AdminHeader session={session} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col pt-20">
        <Outlet context={{ session }} />
      </main>
    </div>
  );
};

export default AdminLayout;

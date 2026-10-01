import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import SignupPage from './pages/SignupPage';
import CustomerSignupPage from './pages/CustomerSignupPage';
import ProviderSignupPage from './pages/ProviderSignupPage';
import LoginPage from './pages/LoginPage';
import CustomerLoginPage from './pages/CustomerLoginPage';
import ProviderLoginPage from './pages/ProviderLoginPage';
import EventOnboardingPage from './pages/EventOnboardingPage';

// Customer Protected Experience
import CustomerLayout from './components/customer/CustomerLayout';
import CustomerDashboardPage from './pages/CustomerDashboardPage';
import ServiceDiscoveryPage from './pages/ServiceDiscoveryPage';
import ProviderDetailsPage from './pages/ProviderDetailsPage';
import EventPlanPage from './pages/EventPlanPage';
import MyBookingsPage from './pages/MyBookingsPage';
import CustomerProfilePage from './pages/CustomerProfilePage';
import CustomerInvitationPage from './pages/CustomerInvitationPage';
import PublicInvitationPage from './pages/PublicInvitationPage';

// Provider Protected Experience
import ProviderLayout from './components/provider/ProviderLayout';
import ProviderDashboardPage from './pages/ProviderDashboardPage';
import ProviderBookingsPage from './pages/ProviderBookingsPage';
import ProviderSchedulePage from './pages/ProviderSchedulePage';
import ProviderProfilePage from './pages/ProviderProfilePage';
import ProviderPortfolioPage from './pages/ProviderPortfolioPage';

// Admin Protected Experience & Auth
import AdminLayout from './components/admin/AdminLayout';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminProvidersPage from './pages/AdminProvidersPage';
import AdminProviderDetailPage from './pages/AdminProviderDetailPage';

import { ThemeProvider } from './context/ThemeContext';

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
    } else {
      const element = document.getElementById(hash.replace('#', ''));
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [pathname, hash]);

  return null;
}

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
        {/* Public Marketing & Role Selection Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/signup/customer" element={<CustomerSignupPage />} />
        <Route path="/signup/provider" element={<ProviderSignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login/customer" element={<CustomerLoginPage />} />
        <Route path="/login/provider" element={<ProviderLoginPage />} />

        {/* Admin Authentication */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Event Planning Onboarding Workflow */}
        <Route path="/onboarding/event" element={<EventOnboardingPage />} />

        {/* Customer Portal (Protected by CustomerLayout) */}
        <Route path="/customer" element={<CustomerLayout />}>
          <Route index element={<Navigate to="/customer/dashboard" replace />} />
          <Route path="dashboard" element={<CustomerDashboardPage />} />
          <Route path="services" element={<ServiceDiscoveryPage />} />
          <Route path="services/:providerId" element={<ProviderDetailsPage />} />
          <Route path="provider/:providerId" element={<ProviderDetailsPage />} />
          <Route path="event-plan" element={<EventPlanPage />} />
          <Route path="invitation" element={<CustomerInvitationPage />} />
          <Route path="bookings" element={<MyBookingsPage />} />
          <Route path="profile" element={<CustomerProfilePage />} />
        </Route>

        {/* Public Digital Guest Invitation & RSVP Pass */}
        <Route path="/invitation/:publicToken" element={<PublicInvitationPage />} />

        {/* Provider Atelier Management Portal (Protected by ProviderLayout) */}
        <Route path="/provider" element={<ProviderLayout />}>
          <Route index element={<Navigate to="/provider/dashboard" replace />} />
          <Route path="dashboard" element={<ProviderDashboardPage />} />
          <Route path="bookings" element={<ProviderBookingsPage />} />
          <Route path="schedule" element={<ProviderSchedulePage />} />
          <Route path="profile" element={<ProviderProfilePage />} />
          <Route path="portfolio" element={<ProviderPortfolioPage />} />
        </Route>

        {/* Admin Atelier Control Center (Protected by AdminLayout) */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="providers" element={<AdminProvidersPage />} />
          <Route path="providers/:id" element={<AdminProviderDetailPage />} />
        </Route>

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </ThemeProvider>
  );
}

export default App;

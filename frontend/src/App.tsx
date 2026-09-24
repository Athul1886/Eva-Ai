import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate, Link } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import SignupPage from './pages/SignupPage';
import CustomerSignupPage from './pages/CustomerSignupPage';
import ProviderSignupPage from './pages/ProviderSignupPage';
import LoginPage from './pages/LoginPage';
import EventOnboardingPage from './pages/EventOnboardingPage';
import CustomerDashboardPage from './pages/CustomerDashboardPage';
import ServiceDiscoveryPage from './pages/ServiceDiscoveryPage';
import ProviderDetailsPage from './pages/ProviderDetailsPage';
import EventPlanPage from './pages/EventPlanPage';
import MyBookingsPage from './pages/MyBookingsPage';

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
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/signup/customer" element={<CustomerSignupPage />} />
        <Route path="/signup/provider" element={<ProviderSignupPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Event Planning Onboarding Workflow */}
        <Route path="/onboarding/event" element={<EventOnboardingPage />} />

        {/* Customer Dashboard Portal */}
        <Route path="/customer/dashboard" element={<CustomerDashboardPage />} />

        {/* Customer Event Plan */}
        <Route path="/customer/event-plan" element={<EventPlanPage />} />

        {/* Customer Service Discovery Experience */}
        <Route path="/customer/services" element={<ServiceDiscoveryPage />} />
        <Route path="/customer/services/:providerId" element={<ProviderDetailsPage />} />

        {/* Customer Bookings */}
        <Route path="/customer/bookings" element={<MyBookingsPage />} />

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

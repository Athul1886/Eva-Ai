import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/common/ErrorBoundary';

// Public Auth & Onboarding Routes (Lazy Loaded)
const SignupPage = lazy(() => import('./pages/SignupPage'));
const CustomerSignupPage = lazy(() => import('./pages/CustomerSignupPage'));
const ProviderSignupPage = lazy(() => import('./pages/ProviderSignupPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const CustomerLoginPage = lazy(() => import('./pages/CustomerLoginPage'));
const ProviderLoginPage = lazy(() => import('./pages/ProviderLoginPage'));
const EventOnboardingPage = lazy(() => import('./pages/EventOnboardingPage'));

// Customer Protected Experience (Lazy Loaded)
import CustomerLayout from './components/customer/CustomerLayout';
const CustomerDashboardPage = lazy(() => import('./pages/CustomerDashboardPage'));
const ServiceDiscoveryPage = lazy(() => import('./pages/ServiceDiscoveryPage'));
const ProviderDetailsPage = lazy(() => import('./pages/ProviderDetailsPage'));
const EventPlanPage = lazy(() => import('./pages/EventPlanPage'));
const MyBookingsPage = lazy(() => import('./pages/MyBookingsPage'));
const CustomerProfilePage = lazy(() => import('./pages/CustomerProfilePage'));

// Provider Protected Experience (Lazy Loaded)
import ProviderLayout from './components/provider/ProviderLayout';
const ProviderDashboardPage = lazy(() => import('./pages/ProviderDashboardPage'));
const ProviderBookingsPage = lazy(() => import('./pages/ProviderBookingsPage'));
const ProviderSchedulePage = lazy(() => import('./pages/ProviderSchedulePage'));
const ProviderProfilePage = lazy(() => import('./pages/ProviderProfilePage'));
const ProviderPortfolioPage = lazy(() => import('./pages/ProviderPortfolioPage'));

function PageLoadingFallback() {
  return (
    <div className="bg-surface min-h-[60vh] flex flex-col items-center justify-center text-on-surface p-8">
      <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      <span className="text-xs uppercase tracking-widest text-primary font-bold mt-4">
        Loading...
      </span>
    </div>
  );
}

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
        <ErrorBoundary>
          <Suspense fallback={<PageLoadingFallback />}>
            <Routes>
              {/* Public Marketing & Role Selection Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/signup/customer" element={<CustomerSignupPage />} />
              <Route path="/signup/provider" element={<ProviderSignupPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/login/customer" element={<CustomerLoginPage />} />
              <Route path="/login/provider" element={<ProviderLoginPage />} />

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
                <Route path="bookings" element={<MyBookingsPage />} />
                <Route path="profile" element={<CustomerProfilePage />} />
              </Route>

              {/* Provider Atelier Management Portal (Protected by ProviderLayout) */}
              <Route path="/provider" element={<ProviderLayout />}>
                <Route index element={<Navigate to="/provider/dashboard" replace />} />
                <Route path="dashboard" element={<ProviderDashboardPage />} />
                <Route path="bookings" element={<ProviderBookingsPage />} />
                <Route path="schedule" element={<ProviderSchedulePage />} />
                <Route path="profile" element={<ProviderProfilePage />} />
                <Route path="portfolio" element={<ProviderPortfolioPage />} />
              </Route>

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;

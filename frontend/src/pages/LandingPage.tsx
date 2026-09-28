import React from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import HeroSection from '../components/sections/HeroSection';
import HowItWorksSection from '../components/sections/HowItWorksSection';
import ServicesSection from '../components/sections/ServicesSection';
import AiFeatureSection from '../components/sections/AiFeatureSection';
import ProviderSection from '../components/sections/ProviderSection';
import CtaBannerSection from '../components/sections/CtaBannerSection';

export const LandingPage: React.FC = () => {
  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary">
      {/* 1. NAVBAR */}
      <Header />

      {/* MAIN MARKETING CONTENT */}
      <main className="w-full pt-20 bg-surface flex-1">
        <div className="flex flex-col w-full text-on-surface bg-surface">
          {/* 2. HERO */}
          <HeroSection />

          {/* 3. HOW IT WORKS */}
          <HowItWorksSection />

          {/* 4. SERVICES */}
          <ServicesSection />

          {/* 5. AI FEATURE */}
          <AiFeatureSection />

          {/* 6. PROVIDER CTA */}
          <ProviderSection />

          {/* 7. FINAL CTA */}
          <CtaBannerSection />
        </div>
      </main>

      {/* 8. FOOTER */}
      <Footer />
    </div>
  );
};

export default LandingPage;

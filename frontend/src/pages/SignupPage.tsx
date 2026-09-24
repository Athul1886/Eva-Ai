import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Icon from '../components/common/Icon';

export const SignupPage: React.FC = () => {
  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary">
      <Header />

      <main className="flex-1 pt-28 pb-20 flex items-center justify-center relative overflow-hidden">
        {/* Ambient atmospheric glows */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-primary/10 rounded-full blur-[140px] pointer-events-none"></div>
        <div className="absolute -bottom-20 right-0 w-96 h-96 bg-secondary-container/15 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-[1100px] w-full mx-auto px-margin-mobile md:px-margin relative z-10">
          {/* Header Title */}
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary px-3.5 py-1 rounded-full bg-primary/10">
              Account Registration
            </span>
            <h1 className="font-display-hero text-display-hero-mobile md:text-headline-lg font-normal text-on-surface mt-3">
              Create your <span className="italic text-primary">Eva-Ai</span> account
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-3">
              Choose how you want to use Eva-Ai.
            </p>
          </div>

          {/* Role Selection Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Card 1: Customer */}
            <div className="group relative rounded-3xl bg-surface-container-high/60 backdrop-blur-xl p-8 sm:p-10 shadow-2xl border border-surface-container-highest/60 hover:border-primary/50 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1.5">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors shadow-inner mb-6">
                  <Icon name="celebration" className="text-[28px]" />
                </div>
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold block mb-1">
                  For Event Hosts &amp; Planners
                </span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface mb-3">
                  Customer
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  Plan your event, discover services and manage bookings.
                </p>
              </div>

              <div className="pt-8">
                <Link
                  className="w-full py-4 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-title-md text-title-md font-bold transition-all shadow-[0_0_20px_rgba(242,202,80,0.25)] hover:shadow-[0_0_30px_rgba(242,202,80,0.45)] flex items-center justify-center gap-2"
                  to="/signup/customer"
                >
                  <span>Continue as Customer</span>
                  <Icon name="arrow_forward" className="text-[18px]" />
                </Link>
              </div>
            </div>

            {/* Card 2: Service Provider */}
            <div className="group relative rounded-3xl bg-surface-container-high/60 backdrop-blur-xl p-8 sm:p-10 shadow-2xl border border-surface-container-highest/60 hover:border-secondary/50 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1.5">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-on-secondary-fixed transition-colors shadow-inner mb-6">
                  <Icon name="storefront" className="text-[28px]" />
                </div>
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary font-bold block mb-1">
                  For Vendors &amp; Curators
                </span>
                <h2 className="font-headline-sm text-headline-sm text-on-surface mb-3">
                  Service Provider
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  List your services, manage requests and grow your business.
                </p>
              </div>

              <div className="pt-8">
                <Link
                  className="w-full py-4 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface hover:text-secondary font-title-md text-title-md font-bold transition-all border border-surface-container-highest flex items-center justify-center gap-2"
                  to="/signup/provider"
                >
                  <span>Join as Provider</span>
                  <Icon name="arrow_forward" className="text-[18px]" />
                </Link>
              </div>
            </div>
          </div>

          {/* Already have an account link */}
          <div className="text-center mt-12">
            <p className="font-body-md text-body-md text-on-surface-variant">
              Already have an account?{' '}
              <Link className="text-primary font-semibold hover:underline transition-colors" to="/login">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SignupPage;

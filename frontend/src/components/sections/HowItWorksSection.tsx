import React from 'react';
import Icon from '../common/Icon';

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      num: '01',
      icon: 'stylus_note',
      title: 'Tell us about your event',
      desc: 'Share your event type, location, guest expectations, and target budget in a few quick taps.',
    },
    {
      num: '02',
      icon: 'psychology',
      title: 'Get personalized recommendations',
      desc: 'Eva-Ai curates verified venues and service specialists best suited to your style and financial plan.',
    },
    {
      num: '03',
      icon: 'tune',
      title: 'Build your event plan',
      desc: 'Select your preferred partners, compare options, and organize your complete celebration with clarity.',
    },
  ];

  return (
    <section className="w-full py-24 relative bg-surface" id="how-it-works">
      <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin">
        {/* Section Header */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-16">
          <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary px-3.5 py-1 rounded-full bg-primary/10">
            How It Works
          </span>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-medium text-on-surface mt-3">
            Plan Effortlessly in <span className="italic text-primary">Three Simple Steps</span>
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-3">
            Say goodbye to scattered phone calls and chaotic spreadsheets. Eva-Ai makes planning straightforward and stress-free.
          </p>
        </div>

        {/* 3 Step Flow Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {steps.map((step) => (
            <div
              key={step.num}
              className="group relative rounded-2xl bg-surface-container/70 hover:bg-surface-container p-8 transition-all duration-300 flex flex-col justify-between shadow-lg hover:-translate-y-1 border border-surface-container-high/40"
            >
              <div>
                <div className="flex items-center justify-between mb-8">
                  <span className="font-headline-lg text-headline-lg font-bold text-outline-variant group-hover:text-primary transition-colors">
                    {step.num}
                  </span>
                  <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                    <Icon name={step.icon} className="text-[24px]" />
                  </div>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface mb-3">
                  {step.title}
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;

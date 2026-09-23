import React from 'react';
import Icon from '../common/Icon';

export const MetricsSection: React.FC = () => {
  return (
    <section className="w-full py-10 bg-surface-container-low shadow-inner">
      <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          <div className="flex flex-col items-center text-center">
            <span className="font-headline-lg text-headline-lg font-bold text-transparent bg-clip-text bg-gradient-to-b from-on-surface to-primary">
              500+
            </span>
            <span className="font-title-md text-title-md text-on-surface font-semibold mt-1">
              Verified Curators
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Audited for royal standards
            </span>
          </div>

          <div className="flex flex-col items-center text-center">
            <span className="font-headline-lg text-headline-lg font-bold text-transparent bg-clip-text bg-gradient-to-b from-on-surface to-primary">
              1,200+
            </span>
            <span className="font-title-md text-title-md text-on-surface font-semibold mt-1">
              Opulent Galas
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Orchestrated seamlessly
            </span>
          </div>

          <div className="flex flex-col items-center text-center">
            <span className="font-headline-lg text-headline-lg font-bold text-transparent bg-clip-text bg-gradient-to-b from-on-surface to-primary">
              50+
            </span>
            <span className="font-title-md text-title-md text-on-surface font-semibold mt-1">
              Heritage Hubs
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Metropolitan &amp; destination hubs
            </span>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-1">
              <span className="font-headline-lg text-headline-lg font-bold text-transparent bg-clip-text bg-gradient-to-b from-on-surface to-primary">
                4.97
              </span>
              <Icon name="star" className="text-primary text-[24px]" />
            </div>
            <span className="font-title-md text-title-md text-on-surface font-semibold mt-1">
              Client Rating
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Validated guest satisfaction
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MetricsSection;

import React from 'react';
import Icon from '../common/Icon';

export const TestimonialsSection: React.FC = () => {
  const testimonials = [
    {
      id: '1',
      quote:
        'We had exactly 2 Lakhs budgeted for our heritage reception in Palakkad. EVENTORA\'s AI allocated the venue, the top photographer in town, and a 250-plate banquet for ₹1.95L with zero stress. Not one rupee overspent.',
      name: 'Rohit & Ananya',
      meta: 'Winter Wedding • 250 Guests',
      initials: 'R&A',
      avatarClass: 'bg-primary/20 text-primary',
    },
    {
      id: '2',
      quote:
        'As a luxury boutique photographer, having verified clients who respect our artistry and pay milestone escrows on time has revolutionized how we run our bookings calendar.',
      name: 'Karthik S.',
      meta: 'Cinematographer & Lead Partner',
      initials: 'KS',
      avatarClass: 'bg-secondary-container/50 text-secondary',
    },
    {
      id: '3',
      quote:
        'The digital invitation suite was sensational. Our 300 guests were blown away by the interactive RSVP microsite, dress code guide, and venue maps. Every event host needs this.',
      name: 'Meghna Varma',
      meta: 'Anniversary Gala Host',
      initials: 'MV',
      avatarClass: 'bg-primary/20 text-primary',
    },
  ];

  return (
    <section className="w-full py-28 bg-surface-container-lowest relative" id="about">
      <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin">
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-16">
          <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary px-3 py-1 rounded-full bg-primary/10">
            Reputation Of Excellence
          </span>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-medium text-on-surface mt-3">
            Curated Experiences, Flawlessly Realized
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">
            Read candid reflections from couples and corporate patrons who placed their flagship celebrations in our intelligent network.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t) => (
            <div
              key={t.id}
              className="p-8 rounded-2xl bg-surface-container flex flex-col justify-between shadow-xl relative"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-1 text-primary">
                  {[...Array(5)].map((_, i) => (
                    <Icon key={i} name="star" className="text-[18px]" />
                  ))}
                </div>
                <p className="font-body-md text-body-md text-on-surface italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>
              <div className="pt-6 mt-6 flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${t.avatarClass}`}
                >
                  {t.initials}
                </div>
                <div>
                  <div className="font-title-md text-title-md text-on-surface font-semibold">
                    {t.name}
                  </div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant">
                    {t.meta}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;

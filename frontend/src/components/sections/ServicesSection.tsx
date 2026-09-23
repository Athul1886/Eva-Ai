import React from 'react';
import Icon from '../common/Icon';

export const ServicesSection: React.FC = () => {
  const serviceCategories = [
    {
      id: 'venue',
      title: 'Venues',
      desc: 'Heritage palaces, chandeliered ballrooms, open-air lawns, and intimate glasshouses.',
      icon: 'castle',
      tag: 'Heritage & Contemporary',
      tagColor: 'text-secondary',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCziscXW21PunUmSBwtpYlOqqOVMyX3ZQg7gmOPYC5X1FhV4inpJ6RzNkuCrrWk1KpVsj4NhlNL8PC__ohH4ztr05ENbCrojM6MIEIvfPauu82bul3rDleKpRQHlHzjmJj34kYdmmckvgdAYsQ1xSDgGHhelcL-bucmdllZMPDAapsbkRCJ7JdXzqJVlz_STVp6eXVhQtLmf-V1849QDZvATk-i2CHfRNEV4DSDemYHvxJE6ssJ_I6z',
    },
    {
      id: 'photography',
      title: 'Photography & Cinema',
      desc: 'Candid wedding filmers, aerial drone cinematographers, and editorial portrait studios.',
      icon: 'photo_camera',
      tag: 'Cinematic & Candid',
      tagColor: 'text-primary',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuC2Pb1ifT6x0IcLjaWkzL2P4V8jz7Dl9SuVMG8W8v4zQHaWfy5UNKuN5aQ95XaY6W6FjovveWpgIU5tF3NMtV0URxolb5fGDxttdPSclOWsQIojAmWcMqK2kYYX5PBqE68LqvG2SYzwbZCaRFpjJzNk1yfMcvrKUjlOZ0OHt5Rw20HTDQLgjbBEI_jLUTa5Zw1ldrCSYgIGmMOIK47aB0ujJ5_paWbLD9JTljFygwXFSS1nnlly6bb4',
    },
    {
      id: 'catering',
      title: 'Royal Catering',
      desc: 'Multi-course regional feasts, bespoke global buffets, and live artisan dining bars.',
      icon: 'restaurant',
      tag: 'Gourmet Banquets',
      tagColor: 'text-tertiary',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuB0S86J_73OiELD8neour_nALn_tX212vbYgIB69TsdwbKsrDgppqIMZbcBNAnmP3XojP1JZwiSnoYCBFf37nJnflvhT1MvVlxl3j5WBMpxx4U_ioIE2Jkffu-EgYNvn0KNTeiD9GzWhK4VMp7MaKfd8fpqrSJiQ7aYk_qcI0pxfxI8iBYgSwgbq9gaWXFWw2fz5mqW36P9NVR_-4CFJSpA2Vfr2LlXh9c6xvUx2PlISN9h2GLaiZrC',
    },
    {
      id: 'decoration',
      title: 'Floral & Décor',
      desc: 'Living floral mandaps, ambient architectural lighting, and bespoke stage backdrops.',
      icon: 'local_florist',
      tag: 'Bespoke Scenography',
      tagColor: 'text-primary',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCQInZasVl61I9yACMQTXrnyBMTWPmxEmVfXxr0dmovrCMJD0_5C3yBrcWKvPj3XxqzZXtSfLvx-kYm1JH249aV1_H1bmI2fZQ1Qsc-4nOW6EovWtW77CUNUAtgj9DWSMGhAK6Cajea8jE-oe9yUQxTj5yHSBkyO_oOQG4YVzscfqADjBzbhcwPKXg5X0u262cIE4UnFeaLvAprAModSntuC3FBVCrptN6N3S2i6QcxHCnU-DeGgU5i',
    },
    {
      id: 'makeup',
      title: 'Makeup & Styling',
      desc: 'Master bridal stylists, luxury hair couturiers, and personalized grooming artists.',
      icon: 'brush',
      tag: 'Haute Aesthetics',
      tagColor: 'text-secondary',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBuzG1Hr162EIVJ-uN87UBrtaKa7uLfdR2G-7o471vK_zG-VCjfj_lpMEjxZxiFiNKlQh2cOb-Bm60kr604ZY-uNuZLaspUH9BK5XN7LWMvwdZabjeD-qjbPhV36DqScCYecRNtAZHj6vu8gOOzSHnJw6jNHbVfuS3ZUxXG8zTWxQlklk5VVzKLorbEpaLk81VxJcuzQicVcmLmIUPPuB4E8ZAhQ4gVUFiO2srPd7YzaLQwJuOrqPdY',
    },
    {
      id: 'entertainment',
      title: 'DJ & Entertainment',
      desc: 'Concert-grade acoustics, intelligent beam lights, and celebrated live performers.',
      icon: 'speaker',
      tag: 'Acoustics & Energy',
      tagColor: 'text-tertiary',
      imageUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuD6BBLOWUErytcWBurKTvoAD2D-HO5o1SOLZBrGebLRtZpYggFy4i-tN93gVAz7AOBDjYqRqziy2ayVrWvupQasNbjiQwQkKpPToueVf9wbPkpYb94surFAExAJgLSUDGvDcjrROIEkppJQlccmLlA90dBeR6J3698ZtibgDjZL-tMODdZafpVSGBiOSA0GgWkGIpmeCx1IGae6-LwRX_h3BMnrTEsXPwv8qrU8c8OcISIF6-6rrwj2',
    },
  ];

  return (
    <section className="w-full py-24 bg-surface-container-lowest relative" id="services">
      <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin">
        {/* Section Title */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-16">
          <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary px-3.5 py-1 rounded-full bg-primary/10">
            Curated Disciplines
          </span>
          <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-medium text-on-surface mt-3">
            Every Essential Service. <span className="italic text-primary">In One Place.</span>
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">
            Explore verified professionals and iconic venues ready to bring your celebration to reality.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {serviceCategories.map((service) => (
            <div
              key={service.id}
              className="group rounded-2xl bg-surface-container overflow-hidden shadow-xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between border border-surface-container-high/50"
            >
              <div>
                <div className="relative h-60 overflow-hidden">
                  <img
                    alt={service.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    src={service.imageUrl}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-container via-transparent to-transparent"></div>
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span
                      className={`px-3 py-1 rounded-full bg-surface-container-lowest/80 backdrop-blur-md font-label-sm text-label-sm uppercase ${service.tagColor}`}
                    >
                      {service.tag}
                    </span>
                  </div>
                  <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-surface-container-lowest/80 backdrop-blur-md flex items-center justify-center text-primary">
                    <Icon name={service.icon} className="text-[18px]" />
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors">
                    {service.title}
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-2 leading-relaxed">
                    {service.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;

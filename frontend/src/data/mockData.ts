import { PackageItem, ServiceItem } from '../types';

export const initialPackageItems: PackageItem[] = [
  {
    id: 'venue',
    title: 'Grand Palace Auditorium',
    subtitle: 'Venue & Banquet Halls',
    cost: 60000,
    checked: true,
  },
  {
    id: 'photo',
    title: 'XYZ Cinematic Photography',
    subtitle: 'Lead 4K Filmers + Drone Suite',
    cost: 40000,
    checked: true,
  },
  {
    id: 'catering',
    title: 'ABC Royal Feast Catering',
    subtitle: '250 Plated Banquets',
    cost: 70000,
    checked: true,
  },
  {
    id: 'decor',
    title: 'Dream Floral Mandap Décor',
    subtitle: 'Fresh Jasmine & Canopy Rig',
    cost: 25000,
    checked: true,
  },
  {
    id: 'coordinator',
    title: 'Dedicated Master On-Ground Coordinator',
    subtitle: 'Real-time timeline director & concierge',
    cost: 15000,
    checked: false,
    prefix: '+',
  },
];

export const servicesData: ServiceItem[] = [
  {
    id: 'srv-1',
    category: 'photo',
    title: 'Haute Cinematography & Drones',
    guild: 'Cinematography Guild',
    rating: 4.9,
    description:
      'Dual-frame cinematic captures, gimbal slow-motion reels, 4K master films, and same-day montage presentations.',
    priceLabel: 'Packages From',
    priceValue: '₹40,000',
    badge: 'Candid & Cinematic',
    badgeStyle: 'text-primary',
    icon: 'photo_camera',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC2Pb1ifT6x0IcLjaWkzL2P4V8jz7Dl9SuVMG8W8v4zQHaWfy5UNKuN5aQ95XaY6W6FjovveWpgIU5tF3NMtV0URxolb5fGDxttdPSclOWsQIojAmWcMqK2kYYX5PBqE68LqvG2SYzwbZCaRFpjJzNk1yfMcvrKUjlOZ0OHt5Rw20HTDQLgjbBEI_jLUTa5Zw1ldrCSYgIGmMOIK47aB0ujJ5_paWbLD9JTljFygwXFSS1nnlly6bb4',
    details: {
      category: 'Photography & Films',
      title: 'XYZ Cinematic Studio',
      price: '₹40,000',
      description:
        'Full-day coverage, 2 lead cinematographers, drone operator, 300+ retouched prints, 3-5 min 4K highlight teaser.',
    },
  },
  {
    id: 'srv-2',
    category: 'venue',
    title: 'Heritage Palaces & Grand Halls',
    guild: 'Palace & Halls',
    rating: 5.0,
    description:
      'Chandeliered ballroom halls, expansive royal lawns, and botanical glasshouse conservatory spaces for majestic galas.',
    priceLabel: 'Starting Day Rate',
    priceValue: '₹60,000',
    badge: 'Heritage & Royal',
    badgeStyle: 'text-secondary',
    icon: 'castle',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCziscXW21PunUmSBwtpYlOqqOVMyX3ZQg7gmOPYC5X1FhV4inpJ6RzNkuCrrWk1KpVsj4NhlNL8PC__ohH4ztr05ENbCrojM6MIEIvfPauu82bul3rDleKpRQHlHzjmJj34kYdmmckvgdAYsQ1xSDgGHhelcL-bucmdllZMPDAapsbkRCJ7JdXzqJVlz_STVp6eXVhQtLmf-V1849QDZvATk-i2CHfRNEV4DSDemYHvxJE6ssJ_I6z',
    details: {
      category: 'Heritage Palace & Grand Halls',
      title: 'Grand Palace Auditorium',
      price: '₹60,000',
      description:
        '250-600 guest ballroom capacity, climate-controlled bridal dressing suites, expansive parking matrix, valet service and backup generators.',
    },
  },
  {
    id: 'srv-3',
    category: 'catering',
    title: 'Haute Royal Catering & Live Buffets',
    guild: 'Culinary Artists',
    rating: 4.95,
    description:
      'Traditional Sadya courses, bespoke royal banquets, artisanal mocktail lounges, and customized multi-cuisine live dining stations.',
    priceLabel: 'Bespoke Platter',
    priceValue: '₹280 / guest',
    badge: 'Gourmet Banquets',
    badgeStyle: 'text-tertiary',
    icon: 'restaurant',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB0S86J_73OiELD8neour_nALn_tX212vbYgIB69TsdwbKsrDgppqIMZbcBNAnmP3XojP1JZwiSnoYCBFf37nJnflvhT1MvVlxl3j5WBMpxx4U_ioIE2Jkffu-EgYNvn0KNTeiD9GzWhK4VMp7MaKfd8fpqrSJiQ7aYk_qcI0pxfxI8iBYgSwgbq9gaWXFWw2fz5mqW36P9NVR_-4CFJSpA2Vfr2LlXh9c6xvUx2PlISN9h2GLaiZrC',
    details: {
      category: 'Gourmet Catering',
      title: 'ABC Royal Culinary Artisans',
      price: '₹70,000 (Base for 250 guests)',
      description:
        'Comprehensive royal menu, 18 specialty dishes, dessert fondue station, live tandoor and uniformed sommelier team.',
    },
  },
  {
    id: 'srv-4',
    category: 'decor',
    title: 'Bespoke Floral Mandaps & Canopies',
    guild: 'Botanical Architecture',
    rating: 4.88,
    description:
      'Living botanical backdrops, fragrant tuberose chandeliers, ambient fairy-light arches, and runway grand aisles.',
    priceLabel: 'Themes From',
    priceValue: '₹25,000',
    badge: 'Haute Scenography',
    badgeStyle: 'text-primary',
    icon: 'local_florist',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCQInZasVl61I9yACMQTXrnyBMTWPmxEmVfXxr0dmovrCMJD0_5C3yBrcWKvPj3XxqzZXtSfLvx-kYm1JH249aV1_H1bmI2fZQ1Qsc-4nOW6EovWtW77CUNUAtgj9DWSMGhAK6Cajea8jE-oe9yUQxTj5yHSBkyO_oOQG4YVzscfqADjBzbhcwPKXg5X0u262cIE4UnFeaLvAprAModSntuC3FBVCrptN6N3S2i6QcxHCnU-DeGgU5i',
    details: {
      category: 'Floral Architecture & Décor',
      title: 'Dream Scenography Atelier',
      price: '₹25,000',
      description:
        'Entrance archway, customized mandap/stage floral arrangements, aisle candles, table runner centerpieces, ambient lighting rig.',
    },
  },
  {
    id: 'srv-5',
    category: 'venue',
    title: 'Turnkey Event Direction & Escrow',
    guild: 'Master Producers',
    rating: 4.98,
    description:
      'Single-point master producers managing vendor timelines, security corridors, guest logistics, and live run-of-show.',
    priceLabel: 'Production Management',
    priceValue: '₹15,000',
    badge: 'Turnkey Execution',
    badgeStyle: 'text-on-surface',
    icon: 'hub',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBuzG1Hr162EIVJ-uN87UBrtaKa7uLfdR2G-7o471vK_zG-VCjfj_lpMEjxZxiFiNKlQh2cOb-Bm60kr604ZY-uNuZLaspUH9BK5XN7LWMvwdZabjeD-qjbPhV36DqScCYecRNtAZHj6vu8gOOzSHnJw6jNHbVfuS3ZUxXG8zTWxQlklk5VVzKLorbEpaLk81VxJcuzQicVcmLmIUPPuB4E8ZAhQ4gVUFiO2srPd7YzaLQwJuOrqPdY',
    details: {
      category: 'Turnkey Event Direction',
      title: 'EVENTORA Master Executive',
      price: '₹15,000',
      description:
        'Dedicated senior production manager, digital minute-by-minute timeline, crisis protocol officer, and full vendor escrow release oversight.',
    },
  },
  {
    id: 'srv-6',
    category: 'photo',
    title: 'Symphonic Sound & Intelligent Lighting',
    guild: 'Acoustic Engineering',
    rating: 4.91,
    description:
      'Precision line-arrays, warm architectural uplighting, sparkular pyrotechnics, and live classical or fusion artists.',
    priceLabel: 'Sound Packages',
    priceValue: '₹18,000',
    badge: 'Acoustic & Lights',
    badgeStyle: 'text-secondary',
    icon: 'speaker',
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuD6BBLOWUErytcWBurKTvoAD2D-HO5o1SOLZBrGebLRtZpYggFy4i-tN93gVAz7AOBDjYqRqziy2ayVrWvupQasNbjiQwQkKpPToueVf9wbPkpYb94surFAExAJgLSUDGvDcjrROIEkppJQlccmLlA90dBeR6J3698ZtibgDjZL-tMODdZafpVSGBiOSA0GgWkGIpmeCx1IGae6-LwRX_h3BMnrTEsXPwv8qrU8c8OcISIF6-6rrwj2',
    details: {
      category: 'Symphonic Sound & Lights',
      title: 'Aura Pulse Audio Visuals',
      price: '₹18,000',
      description:
        'Line array system for 400 guests, 16 wireless mics, intelligent beam profiles, smoke haze machines, sound engineer.',
    },
  },
];

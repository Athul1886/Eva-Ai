import { CategoryInfo, Provider } from '../types/service';

export const SERVICE_CATEGORIES: CategoryInfo[] = [
  {
    id: 'all',
    name: 'All Services',
    icon: 'apps',
    description: 'Explore all verified professionals and luxury event services',
    filterKey: 'all',
  },
  {
    id: 'photography',
    name: 'Photography',
    icon: 'photo_camera',
    description: 'Cinematography, candid captures, drone suites & luxury albums',
    filterKey: 'Photography',
  },
  {
    id: 'event-management',
    name: 'Event Management',
    icon: 'groups',
    description: 'End-to-end luxury coordination, vendor management & hospitality',
    filterKey: 'Event Management',
  },
  {
    id: 'makeup-artist',
    name: 'Makeup Artist',
    icon: 'brush',
    description: 'Bridal makeovers, HD airbrush, grooming & bespoke hair styling',
    filterKey: 'Makeup Artist',
  },
  {
    id: 'venue',
    name: 'Venue',
    icon: 'apartment',
    description: 'Chandelier ballrooms, heritage palaces & open-air conventions',
    filterKey: 'Venue',
  },
  {
    id: 'catering',
    name: 'Catering',
    icon: 'restaurant',
    description: 'Grand traditional sadyas, multi-cuisine banquets & live stations',
    filterKey: 'Catering',
  },
  {
    id: 'decoration',
    name: 'Decoration',
    icon: 'palette',
    description: 'Floral mandaps, botanical arches, chandelier rigs & scenography',
    filterKey: 'Decoration',
  },
  {
    id: 'dj-entertainment',
    name: 'DJ & Entertainment',
    icon: 'music_note',
    description: 'Celebrity DJs, live symphony bands, laser light rigs & sound systems',
    filterKey: 'DJ & Entertainment',
  },
];

export const MOCK_PROVIDERS: Provider[] = [
  // PHOTOGRAPHY
  {
    id: 'lenscraft-studio',
    name: 'LensCraft Studio',
    category: 'Photography',
    location: 'Palakkad',
    rating: 4.9,
    reviewCount: 142,
    startingPrice: 45000,
    yearsExperience: 8,
    description:
      'Premier visual storytellers capturing candid rituals, cinematic slow-motion highlights, and timeless heirloom photo albums.',
    about:
      'LensCraft Studio is a boutique visual arts team based in Palakkad, specializing in Kerala royal weddings and intimate destination engagements. With a signature balance of natural warm tones and high-fidelity lighting, their crew preserves emotions authentically.',
    services: [
      'Dual-camera 4K Cinematic Wedding Film',
      'Candid & Traditional Photography',
      'Drone Aerial Videography',
      'Custom Leather Bound Albums',
      'Pre-Wedding & Post-Wedding Shoots',
      'Same-Day Teaser Delivery',
    ],
    tags: ['Cinematic', 'Candid', 'Drone 4K', 'Heirloom Albums'],
    images: [
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80',
    ],
    priceRange: '₹45,000 – ₹1,20,000',
    available: true,
    featured: true,
    packages: [
      {
        name: 'Essential Gold',
        price: 45000,
        description: 'Single-day core coverage for ceremonies and rituals',
        features: [
          '1 Candid Photographer + 1 Traditional Videographer',
          '350+ Color graded digital images',
          'Full length traditional ceremony video (1080p)',
          'Online private gallery access',
        ],
      },
      {
        name: 'Royal Heirloom Platinum',
        price: 85000,
        description: 'Comprehensive 2-day multi-camera master wedding capture',
        features: [
          '2 Candid Photographers + 2 Cinematographers',
          'Licensed Drone Operator for aerial cinematic views',
          '3-5 minute 4K Teaser + 30-minute Wedding Highlights Film',
          'Premium 40-page flush mount velvet photo album',
          'Full raw footage archive on custom wooden USB',
        ],
      },
    ],
    reviews: [
      {
        author: 'Naveen & Anjali',
        rating: 5,
        date: 'January 2026',
        comment:
          'LensCraft captured every tear and smile at our Palakkad wedding without getting in the way. The cinematic teaser felt like a motion picture!',
      },
      {
        author: 'Dr. Rahul Varma',
        rating: 4.8,
        date: 'December 2025',
        comment:
          'Incredible professionalism and punctual delivery. Highly recommended for couples seeking timeless family keepsakes.',
      },
    ],
    contactDemo: {
      manager: 'Arjun Menon (Demo Representative)',
      phone: '+91 94470 12345 (Demo)',
      email: 'lenscraft.demo@eva-ai.internal',
      address: 'Near Fort Maidan, Robinson Road, Palakkad, Kerala',
      hours: 'Mon - Sun: 9:00 AM - 8:30 PM',
    },
  },
  {
    id: 'moments-by-arun',
    name: 'Moments by Arun',
    category: 'Photography',
    location: 'Kochi',
    rating: 4.95,
    reviewCount: 188,
    startingPrice: 55000,
    yearsExperience: 10,
    description:
      'Award-winning Kochi photo atelier recognized for candid bridal portraiture, moody luxury aesthetics, and drone cinema.',
    about:
      'Led by renowned portrait photographer Arun, this team brings a fine-art approach to South Indian celebrations. Their editorial style and attention to micro-moments have made them a top choice across Kerala and Bangalore.',
    services: [
      'Fine-Art Candid Photography',
      'Ultra-HD Slow-Motion Film',
      'Pre-Wedding Concept Film',
      'Artisan Handcrafted Coffee Table Book',
      'Bridal Editorial Session',
    ],
    tags: ['Award-Winning', 'Fine Art', 'Editorial', 'Kochi Portfolios'],
    images: [
      'https://images.unsplash.com/photo-1606800052052-a08af7148866?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1544078751-58fee2d8a03b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80',
    ],
    priceRange: '₹55,000 – ₹1,50,000',
    available: true,
    featured: true,
    packages: [
      {
        name: 'Signature Kochi Collection',
        price: 55000,
        description: 'Complete 1-day wedding & reception coverage',
        features: [
          'Lead photographer Arun + 1 Cinematographer',
          '400 Hand-retouched fine-art portraits',
          '4K Highlight Film (4-6 minutes)',
          'High-res digital download vault',
        ],
      },
    ],
    reviews: [
      {
        author: 'Reshma & Gokul',
        rating: 5,
        date: 'February 2026',
        comment:
          'Arun has a rare gift for lighting and capturing pure laughter. The coffee table book is breathtaking.',
      },
    ],
    contactDemo: {
      manager: 'Arun K. Nair (Demo Representative)',
      phone: '+91 98950 54321 (Demo)',
      email: 'moments.arun.demo@eva-ai.internal',
      address: 'Panampilly Nagar Main Avenue, Kochi, Kerala',
      hours: 'Mon - Sat: 10:00 AM - 8:00 PM',
    },
  },
  {
    id: 'pixelnest-photography',
    name: 'PixelNest Photography',
    category: 'Photography',
    location: 'Thrissur',
    rating: 4.82,
    reviewCount: 96,
    startingPrice: 38000,
    yearsExperience: 6,
    description:
      'Dynamic youth collective crafting vibrant festival-style wedding films, traditional ceremonies, and Instagram-ready reels.',
    about:
      'PixelNest combines state-of-the-art Sony cinema line cameras with youthful energy. Famous for quick turnaround times and viral wedding reels delivered within 24 hours of the ceremony.',
    services: [
      'Fast-Turnaround Viral Reels',
      'Traditional Mandap Coverage',
      '4K Gimbal Videography',
      'Live Video Streaming Setup',
      'Drone Aerial Angles',
    ],
    tags: ['Viral Reels', 'Speed Delivery', 'Budget-Friendly', '4K Drone'],
    images: [
      'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1591604466107-ec97de577aff?auto=format&fit=crop&w=1200&q=80',
    ],
    priceRange: '₹38,000 – ₹90,000',
    available: true,
    packages: [
      {
        name: 'Festive Classic',
        price: 38000,
        description: 'Complete ceremonial coverage with same-day reel',
        features: [
          '1 Lead Photographer + 1 Cinematographer',
          '3 Instagram Reels delivered within 24 hours',
          'Full event edits and high-res digital delivery',
        ],
      },
    ],
    contactDemo: {
      manager: 'Vivek S. (Demo Representative)',
      phone: '+91 97450 99887 (Demo)',
      email: 'pixelnest.demo@eva-ai.internal',
      address: 'Round West, Near Swaraj Round, Thrissur, Kerala',
      hours: 'Mon - Sun: 9:30 AM - 7:30 PM',
    },
  },

  // EVENT MANAGEMENT
  {
    id: 'elegant-events-kerala',
    name: 'Elegant Events Kerala',
    category: 'Event Management',
    location: 'Kochi',
    rating: 4.96,
    reviewCount: 165,
    startingPrice: 50000,
    yearsExperience: 12,
    description:
      'Full-service turnkey event production delivering seamless logistics, celebrity artist bookings, and VIP guest hospitality.',
    about:
      'With over a decade of luxury event management across Kerala, Elegant Events coordinates every moving part—from permissions and staging to airport transfers and run-of-show precision—allowing families to relax as honored guests.',
    services: [
      'End-to-End Timeline & Stage Direction',
      'Vendor Coordination & Escrow Mediation',
      'VIP Guest Hospitality & Transport Desks',
      'Crowd Control & Valet Logistics',
      'Crisis Management & Contingency Protocol',
    ],
    tags: ['Turnkey Logistics', 'VIP Hospitality', '12+ Years Experience', 'Luxury Galas'],
    images: [
      'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1505236858219-8359eb29e329?auto=format&fit=crop&w=1200&q=80',
    ],
    priceRange: '₹50,000 – ₹2,50,000',
    available: true,
    featured: true,
    packages: [
      {
        name: 'Day-Of Master Coordination',
        price: 50000,
        description: 'Dedicated team of 4 coordinators handling on-ground execution',
        features: [
          'Minute-by-minute live digital timeline',
          'Liaison with all external vendors and decorators',
          'Bridal assistant & family concierge desk',
          'Sound and lighting cue director',
        ],
      },
      {
        name: 'Full Symphony Production',
        price: 120000,
        description: 'Turnkey end-to-end planning from 6 months prior to event',
        features: [
          'Dedicated Senior Producer + 8 on-ground marshals',
          'Theme conceptualization & 3D floorplan design',
          'Guest transport matrix, RSVP tracker, and hotel check-in desk',
          'Full vendor procurement negotiation and financial audit',
        ],
      },
    ],
    reviews: [
      {
        author: 'Sanjay & Meera Kurup',
        rating: 5,
        date: 'January 2026',
        comment:
          'They managed our 700-guest wedding seamlessly at Kochi. No delays, zero chaos, pure perfection.',
      },
    ],
    contactDemo: {
      manager: 'Deepak Mohan (Demo Representative)',
      phone: '+91 98460 33445 (Demo)',
      email: 'elegantevents.demo@eva-ai.internal',
      address: 'Marine Drive Gateway Suites, Ernakulam, Kochi',
      hours: 'Mon - Sun: 9:00 AM - 9:00 PM',
    },
  },
  {
    id: 'dreamday-events',
    name: 'DreamDay Events',
    category: 'Event Management',
    location: 'Palakkad',
    rating: 4.88,
    reviewCount: 89,
    startingPrice: 35000,
    yearsExperience: 7,
    description:
      'Palakkad-based wedding planners specializing in authentic heritage customs, temple ceremonies, and vibrant receptions.',
    about:
      'DreamDay Events blends deep knowledge of traditional Kerala customs with modern hospitality workflows. They handle everything from pooja samagri procurement to buffet queue management with utmost warmth.',
    services: [
      'Temple & Mandap Coordination',
      'Traditional Music & Nadaswaram Troupe Booking',
      'Guest Reception & Welcome Desk',
      'Buffet Flow Management',
      'Return Gift Curation',
    ],
    tags: ['Traditional Heritage', 'Local Palakkad', 'Customs Expert', 'Stress-Free'],
    images: [
      'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
    ],
    priceRange: '₹35,000 – ₹1,10,000',
    available: true,
    packages: [
      {
        name: 'Heritage Celebration Plan',
        price: 35000,
        description: 'Complete coordination for traditional ceremony & sadya',
        features: [
          '3 On-ground senior coordinators',
          'Temple protocol & muhurtham timeline management',
          'Sadya dining table service supervision',
          'Guest welcome desk with traditional sandal paste & jasmine',
        ],
      },
    ],
    contactDemo: {
      manager: 'Kavitha Radhakrishnan (Demo Representative)',
      phone: '+91 94460 77889 (Demo)',
      email: 'dreamday.demo@eva-ai.internal',
      address: 'Chandranagar Colony, Palakkad, Kerala',
      hours: 'Mon - Sat: 9:30 AM - 8:00 PM',
    },
  },

  // MAKEUP ARTIST
  {
    id: 'glow-studio',
    name: 'Glow Studio',
    category: 'Makeup Artist',
    location: 'Calicut',
    rating: 4.93,
    reviewCount: 114,
    startingPrice: 22000,
    yearsExperience: 9,
    description:
      'Luxury bridal beauty atelier specializing in flawless HD glass skin, waterproof airbrush makeup, and traditional hair artistry.',
    about:
      'Glow Studio in Calicut is celebrated for natural, radiant brides who look breathtaking both in-person and under high-definition cinema lights. Uses only high-end international cosmetics including Charlotte Tilbury, MAC, and Dior.',
    services: [
      'High-Definition HD Airbrush Bridal Makeup',
      'Pre-Wedding Skin Prep & Consultation',
      'Intricate South Indian Floral Hair Styling',
      'Traditional Silk Saree Draping with Pleat Perfection',
      'Groom Grooming & Touch-Up Service',
    ],
    tags: ['HD Airbrush', 'Glass Skin', 'Saree Draping', 'Luxury Brands'],
    images: [
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80',
    ],
    priceRange: '₹22,000 – ₹65,000',
    available: true,
    packages: [
      {
        name: 'Bridal Radiance HD',
        price: 22000,
        description: 'Single-event complete bridal makeover',
        features: [
          'Airbrush HD Makeup with 16-hour sweat-proof lock',
          'Artisanal hair styling with fresh floral inserts',
          'Saree draping and jewelry pinning',
          'Touch-up kit for reception',
        ],
      },
    ],
    contactDemo: {
      manager: 'Fatima Nabeel (Demo Representative)',
      phone: '+91 98950 11223 (Demo)',
      email: 'glowstudio.demo@eva-ai.internal',
      address: 'Mavoor Road, Near Focus Mall, Calicut, Kerala',
      hours: 'Mon - Sun: 7:00 AM - 7:00 PM',
    },
  },
  {
    id: 'bridal-aura',
    name: 'Bridal Aura',
    category: 'Makeup Artist',
    location: 'Thrissur',
    rating: 4.89,
    reviewCount: 82,
    startingPrice: 18000,
    yearsExperience: 6,
    description:
      'Classic and contemporary bridal makeovers featuring custom contouring, temple jewelry pairing, and natural dewy finishes.',
    about:
      'Bridal Aura brings personalized salon services directly to your dressing suite. Known for keeping brides calm and looking radiant from morning muhurtham until the evening feast.',
    services: [
      'Customized Muhurtham & Reception Makeover',
      'Traditional Kasavu Saree Box Pleating',
      'Bridesmaid & Family Group Styling',
      'High-Grade Lashes & Lens Fitting',
    ],
    tags: ['Dewy Glow', 'Suite Visits', 'Kasavu Pleating', 'Affordable Luxury'],
    images: [
      'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1526045612212-70caf35c14df?auto=format&fit=crop&w=1200&q=80',
    ],
    priceRange: '₹18,000 – ₹50,000',
    available: true,
    packages: [
      {
        name: 'Bridal Classic',
        price: 18000,
        description: 'Full ceremony bridal makeover and saree setting',
        features: [
          'High-definition makeup with sweat resistance',
          'Traditional hair braids and floral crown setup',
          'Jewelry attachment and box pleating',
        ],
      },
    ],
    contactDemo: {
      manager: 'Sumi Haridas (Demo Representative)',
      phone: '+91 97470 44556 (Demo)',
      email: 'bridalaura.demo@eva-ai.internal',
      address: 'Mission Quarters Road, Thrissur, Kerala',
      hours: 'Mon - Sun: 6:00 AM - 6:00 PM',
    },
  },

  // VENUE
  {
    id: 'grand-palace-auditorium',
    name: 'Grand Palace Auditorium',
    category: 'Venue',
    location: 'Palakkad',
    rating: 4.94,
    reviewCount: 210,
    startingPrice: 65000,
    yearsExperience: 14,
    description:
      'State-of-the-art air-conditioned convention center featuring 1,200 guest seating capacity, lavish bridal suites, and sprawling parking.',
    about:
      'Grand Palace Auditorium is Palakkad’s landmark destination for grand celebrations. Equipped with Italian marble flooring, acoustic ceiling baffles, backup generators, and an expansive separate banquet dining hall accommodating 600 seated diners simultaneously.',
    services: [
      'Main AC Auditorium (Capacity: 1,200 theatre / 800 banquet)',
      'Separate Dining Hall for 600 diners',
      '2 Climate-Controlled Luxury Bridal Suites',
      'Parking matrix for 350+ cars with valet bay',
      '24/7 125kVA Soundless Generator Backup',
      'Stage with inbuilt LED screens & acoustic walling',
    ],
    tags: ['1,200 Capacity', 'Fully Air-Conditioned', 'Ample Parking', 'Bespoke Suites'],
    images: [
      'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1545232979-fbf656a735cf?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80',
    ],
    priceRange: '₹65,000 – ₹1,80,000 / day',
    available: true,
    featured: true,
    packages: [
      {
        name: 'Full Day Grand Hall Rental',
        price: 65000,
        description: 'Complete 24-hour access to main auditorium and dining hall',
        features: [
          'Full auditorium & dining hall air conditioning',
          '2 Luxury dressing suites with private restrooms',
          'Security team & car parking attendants included',
          'Sound and basic illumination rig included',
        ],
      },
    ],
    reviews: [
      {
        author: 'Krishnan Nair',
        rating: 5,
        date: 'January 2026',
        comment:
          'Excellent acoustics, clean dining facilities, and very courteous administration. Made our daughter’s wedding unforgettable.',
      },
    ],
    contactDemo: {
      manager: 'Ramesh P. (Demo Representative)',
      phone: '+91 94471 88990 (Demo)',
      email: 'grandpalace.demo@eva-ai.internal',
      address: 'Palakkad-Coimbatore Highway, Kanjikode, Palakkad',
      hours: 'Mon - Sun: 8:00 AM - 9:00 PM',
    },
  },
  {
    id: 'green-valley-convention',
    name: 'Green Valley Convention Centre',
    category: 'Venue',
    location: 'Thrissur',
    rating: 4.87,
    reviewCount: 145,
    startingPrice: 58000,
    yearsExperience: 8,
    description:
      'Eco-luxury convention facility combining expansive manicured garden lawns with modern chandeliered celebration ballrooms.',
    about:
      'Green Valley Convention Centre is situated amidst serene greenery near Thrissur. Offering both an indoor banquet hall and a starlit lawn ideal for open-air sangeet, reception evenings, and cocktail celebrations.',
    services: [
      'Indoor Glass Ballroom (800 Guests)',
      'Manicured Open Lawn (1,000 Guests)',
      'Eco-friendly waste management & water filtration',
      'Valet parking for 250 vehicles',
      'Modern modular stage setup',
    ],
    tags: ['Indoor + Lawn', 'Chandelier Hall', 'Eco-Luxury', 'Night Illuminations'],
    images: [
      'https://images.unsplash.com/photo-1505236858219-8359eb29e329?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80',
    ],
    priceRange: '₹58,000 – ₹1,40,000 / day',
    available: true,
    packages: [
      {
        name: 'Combined Lawn & Hall',
        price: 58000,
        description: 'Access to both banquet ballroom and outdoor lawn',
        features: [
          'Full hall air conditioning',
          'Outdoor lawn ambient fairy lighting setup',
          'Dressing suites & private green room',
          'Dedicated venue manager on site',
        ],
      },
    ],
    contactDemo: {
      manager: 'Mathew George (Demo Representative)',
      phone: '+91 98471 22334 (Demo)',
      email: 'greenvalley.demo@eva-ai.internal',
      address: 'Puzhakkal, Thrissur, Kerala',
      hours: 'Mon - Sun: 8:30 AM - 8:30 PM',
    },
  },

  // CATERING
  {
    id: 'royal-feast-caterers',
    name: 'Royal Feast Caterers',
    category: 'Catering',
    location: 'Kochi',
    rating: 4.97,
    reviewCount: 230,
    startingPrice: 55000,
    yearsExperience: 15,
    description:
      'Master culinary craftsmen celebrated for authentic 28-dish Travancore & Palakkad royal Sadyas and lavish multi-cuisine buffets.',
    about:
      'Royal Feast is revered throughout Kerala for exceptional taste, pristine hygiene, and royal hospitality. From organic banana leaves to hot live payasam counters and dessert lounges, their chefs guarantee an unforgettable feast.',
    services: [
      'Grand 28-Course Royal Sadya on Plantain Leaves',
      'Live Tandoor & Malabar Dum Biryani Stations',
      'Artisanal Payasam Tasting Bar (4 varieties)',
      'Uniformed Silver-Service Waitstaff',
      'Custom Mocktail Lounge with Fresh Tender Coconut Drinks',
    ],
    tags: ['28-Course Sadya', 'Pure Ghee Delicacies', 'Live Stations', '15+ Years Mastery'],
    images: [
      'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1576867757603-05b134ebc379?auto=format&fit=crop&w=1200&q=80',
    ],
    priceRange: '₹320 – ₹650 / plate (Starting ₹55,000 base)',
    available: true,
    featured: true,
    packages: [
      {
        name: 'Maharaja Royal Sadya (Base 200 Guests)',
        price: 55000,
        description: 'Traditional 28-course feast with 3 live payasam varieties',
        features: [
          'Full course feast served on fresh organic plantain leaves',
          'Palada Payasam, Parippu Payasam & Chakka Pradhaman',
          '35 Uniformed servers with traditional attire',
          'Table runners, drinking water dispensers, and fruit hampers',
        ],
      },
    ],
    reviews: [
      {
        author: 'Venugopal Menon',
        rating: 5,
        date: 'February 2026',
        comment:
          'Every guest talked about the Palada Payasam and the crisp Sharkara Upperi! Flawless service and timing.',
      },
    ],
    contactDemo: {
      manager: 'Chef Narayanan (Demo Representative)',
      phone: '+91 94472 66778 (Demo)',
      email: 'royalfeast.demo@eva-ai.internal',
      address: 'Kaloor-Kadavanthra Road, Kochi, Kerala',
      hours: 'Mon - Sun: 8:00 AM - 9:00 PM',
    },
  },
  {
    id: 'malabar-taste-catering',
    name: 'Malabar Taste Catering',
    category: 'Catering',
    location: 'Calicut',
    rating: 4.91,
    reviewCount: 178,
    startingPrice: 48000,
    yearsExperience: 11,
    description:
      'Legendary Calicut dum biryani, signature Malabar snack spreads, and contemporary fusion dining.',
    about:
      'Originating from the culinary heartland of Calicut, Malabar Taste brings wood-fired kaima rice biryanis, fresh pathiris, and seafood delicacies crafted with secret generational spice blends.',
    services: [
      'Wood-Fired Calicut Dum Biryani',
      'Traditional Malabar Evening Snacks & Sulaimani Bar',
      'Arabic Mezze & Barbecue Live Grills',
      'Dessert & Fresh Fruit Carving Display',
    ],
    tags: ['Calicut Dum Biryani', 'Sulaimani Bar', 'Live Grills', 'Authentic Malabar'],
    images: [
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80',
    ],
    priceRange: '₹280 – ₹550 / plate (Starting ₹48,000 base)',
    available: true,
    packages: [
      {
        name: 'Classic Malabar Banquet',
        price: 48000,
        description: 'Authentic Calicut feast with live grill and tea counter',
        features: [
          'Calicut Mutton or Chicken Dum Biryani with dates pickle',
          'Sulaimani & mint tea live bar',
          'Professional servers and chafing dishes',
        ],
      },
    ],
    contactDemo: {
      manager: 'Kabeer Master (Demo Representative)',
      phone: '+91 98461 44556 (Demo)',
      email: 'malabartaste.demo@eva-ai.internal',
      address: 'Beach Road, Calicut, Kerala',
      hours: 'Mon - Sun: 9:00 AM - 10:00 PM',
    },
  },

  // DECORATION
  {
    id: 'bloom-and-decor',
    name: 'Bloom & Decor',
    category: 'Decoration',
    location: 'Palakkad',
    rating: 4.92,
    reviewCount: 138,
    startingPrice: 35000,
    yearsExperience: 8,
    description:
      'Bespoke floral mandaps, fragrant tuberose canopies, candlelit aisle walkways, and contemporary stage architecture.',
    about:
      'Bloom & Decor transforms raw spaces into dreamy, romantic atmospheres. Specializing in fresh Bangalore and Ooty flower imports, brass uruli floral arrangements, and delicate ambient fairy light installations.',
    services: [
      'Living Floral Mandap & Stage Architecture',
      'Grand Entrance Arches & Walkway Tunnels',
      'Brass Vilakku & Uruli Floral Water Bowls',
      'Ambient LED Fairy Lights & Crystal Chandeliers',
      'Photobooth & Personalized Couple Monogram Stage',
    ],
    tags: ['Fresh Florals', 'Bespoke Mandaps', 'Fairy Lights', 'Custom Monograms'],
    images: [
      'https://images.unsplash.com/photo-1519225429980-715cb0215aed?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1478147427282-58a87a120781?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1200&q=80',
    ],
    priceRange: '₹35,000 – ₹1,80,000',
    available: true,
    featured: true,
    packages: [
      {
        name: 'Signature Floral Mandap',
        price: 35000,
        description: 'Complete ceremony stage and entrance archway setup',
        features: [
          'Fresh jasmine, marigold, and rose floral mandap canopy',
          'Grand entrance arch with brass lamps and floral urns',
          'Stage carpet, sofa set, and warm uplighting spots',
        ],
      },
      {
        name: 'Grand Royal Botanical',
        price: 75000,
        description: 'Turnkey venue styling including dining, walkways, and stage',
        features: [
          'Exotic imported orchids, lilies, and hydrangea arrangements',
          'Walkway floral pillars with overhead fairy light tunnel',
          'Custom couple monogram backlit backdrop',
          'Dining table floral runners and candle votives',
        ],
      },
    ],
    reviews: [
      {
        author: 'Pooja & Harish',
        rating: 5,
        date: 'January 2026',
        comment:
          'The mandap looked straight out of a royal fairy tale. The aroma of fresh jasmine filled the entire hall.',
      },
    ],
    contactDemo: {
      manager: 'Asha Rajesh (Demo Representative)',
      phone: '+91 94473 11224 (Demo)',
      email: 'bloomdecor.demo@eva-ai.internal',
      address: 'Sultanpet, Palakkad, Kerala',
      hours: 'Mon - Sun: 9:00 AM - 8:00 PM',
    },
  },
  {
    id: 'dream-decor-kerala',
    name: 'Dream Decor Kerala',
    category: 'Decoration',
    location: 'Coimbatore',
    rating: 4.86,
    reviewCount: 94,
    startingPrice: 40000,
    yearsExperience: 9,
    description:
      'Contemporary theme designers creating minimalist luxury setups, glass pavilions, and enchanted evening lighting.',
    about:
      'Dream Decor serves the Coimbatore-Palakkad border corridor with cutting-edge sceneries. From bohemian pastel pampas grass backdrops to modern geometric gold trusses, they set the mood with flair.',
    services: [
      'Modern Geometric Gold Trusses & Drapery',
      'Pastel Bohemian Floral & Pampas Stages',
      'Glass Mandap on Floating Platforms',
      'Smoke & Cold Pyro Special Effects',
    ],
    tags: ['Modern Themes', 'Geometric Trusses', 'Boho Pastel', 'Special Effects'],
    images: [
      'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=80',
    ],
    priceRange: '₹40,000 – ₹1,30,000',
    available: true,
    packages: [
      {
        name: 'Contemporary Chic',
        price: 40000,
        description: 'Modern gold truss backdrop with floral clusters',
        features: [
          'Fabric draping in champagne gold and ivory tones',
          'Central floral halo with warm Edison bulb chandeliers',
          'Couple lounge set with gold accent tables',
        ],
      },
    ],
    contactDemo: {
      manager: 'Senthil Kumar (Demo Representative)',
      phone: '+91 98940 88776 (Demo)',
      email: 'dreamdecor.demo@eva-ai.internal',
      address: 'Race Course Road, Coimbatore, Tamil Nadu',
      hours: 'Mon - Sat: 9:30 AM - 8:30 PM',
    },
  },

  // DJ & ENTERTAINMENT
  {
    id: 'rhythm-beats',
    name: 'Rhythm Beats',
    category: 'DJ & Entertainment',
    location: 'Kochi',
    rating: 4.95,
    reviewCount: 156,
    startingPrice: 28000,
    yearsExperience: 10,
    description:
      'High-energy celebrity DJs, precision line-array audio systems, intelligent laser moving heads, and live fusion instrumentalists.',
    about:
      'Rhythm Beats is the pulse behind South India’s most energetic sangeet and cocktail parties. Blending Malayalam, Tamil, Bollywood, and EDM hits with live dhol beats and synchronized sparkular pyrotechnics.',
    services: [
      'Top-Tier Wedding DJ & Interactive Emcee / Host',
      'Line-Array Sound System (Up to 1,500 Guests)',
      'Intelligent Moving Beam Lighting & Laser Show',
      'Cold Sparkular Pyrotechnics & Low-Lying Fog Machine',
      'Live Punjabi Dhol Players & Saxophonist',
    ],
    tags: ['Celebrity DJ', 'Interactive Emcee', 'Cold Pyro', 'Line Array Audio'],
    images: [
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
    ],
    priceRange: '₹28,000 – ₹95,000',
    available: true,
    featured: true,
    packages: [
      {
        name: 'Sangeet Party Blast',
        price: 28000,
        description: 'Complete sound, DJ, and dance floor lighting for 4 hours',
        features: [
          'Pro DJ + bilingual energetic party anchor',
          'JBL line array sound system for up to 500 guests',
          '8 Intelligent moving beam lights + strobe effects',
          'Low-lying dry ice fog for couple first dance',
        ],
      },
    ],
    reviews: [
      {
        author: 'Akhil & Divya',
        rating: 5,
        date: 'January 2026',
        comment:
          'They kept all 300 guests dancing till midnight! The sound quality was crisp without hurting ears. Best decision ever!',
      },
    ],
    contactDemo: {
      manager: 'DJ Roshan (Demo Representative)',
      phone: '+91 98460 77112 (Demo)',
      email: 'rhythmbeats.demo@eva-ai.internal',
      address: 'MG Road, Ravipuram, Kochi, Kerala',
      hours: 'Mon - Sun: 11:00 AM - 11:00 PM',
    },
  },
  {
    id: 'dj-nova-events',
    name: 'DJ Nova Events',
    category: 'DJ & Entertainment',
    location: 'Calicut',
    rating: 4.88,
    reviewCount: 92,
    startingPrice: 24000,
    yearsExperience: 7,
    description:
      'Club-style wedding entertainment featuring live percussionists, visual LED video walls, and customized romantic soundtracks.',
    about:
      'DJ Nova delivers a concert-grade experience with crystal clear acoustics, curated nostalgic tracks for elders, and high-octane bass drops for the afterparty.',
    services: [
      'Pro DJ Performance & Custom Playlist Curation',
      'P3 LED Video Backdrop Screen for Visuals & Family Montages',
      'Smoke Machine & CO2 Jet Blasters',
      'Acoustic Live Violin or Flute Pre-Event Ambiance',
    ],
    tags: ['LED Video Wall', 'CO2 Jets', 'Custom Playlists', 'Live Flute'],
    images: [
      'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80',
    ],
    priceRange: '₹24,000 – ₹70,000',
    available: true,
    packages: [
      {
        name: 'Electro Gala Package',
        price: 24000,
        description: 'Complete DJ setup with LED video backdrop',
        features: [
          'Lead DJ Nova + audio engineer',
          'Dual subwoofer system with digital sound console',
          'Ambient wash lights and 4 moving spots',
        ],
      },
    ],
    contactDemo: {
      manager: 'Naveen Nova (Demo Representative)',
      phone: '+91 97451 33221 (Demo)',
      email: 'djnova.demo@eva-ai.internal',
      address: 'Wayanad Road, East Hill, Calicut, Kerala',
      hours: 'Mon - Sun: 10:00 AM - 10:00 PM',
    },
  },
];

export const MOCK_LOCATIONS = [
  'All Locations',
  'Palakkad',
  'Kochi',
  'Thrissur',
  'Calicut',
  'Coimbatore',
];

export const PRICE_RANGES = [
  { id: 'all', label: 'All Price Ranges', min: 0, max: Infinity },
  { id: 'under-25k', label: 'Under ₹25,000', min: 0, max: 25000 },
  { id: '25k-50k', label: '₹25,000 – ₹50,000', min: 25000, max: 50000 },
  { id: '50k-100k', label: '₹50,000 – ₹1,00,000', min: 50000, max: 100000 },
  { id: 'above-100k', label: 'Above ₹1,00,000', min: 100000, max: Infinity },
];

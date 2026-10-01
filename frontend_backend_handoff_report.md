# Eva-Ai: Complete Frontend Architecture & Backend Handoff Specification

> **Document Version:** 1.0.0 (Production Architecture)  
> **Target Audience:** Backend Developers, API Engineers, Database Architects  
> **Source Workspace:** `frontend/` (Vite + React 19 + TypeScript + TailwindCSS)  
> **Authoritative Basis:** Real inspected frontend implementation code, API contracts, TypeScript types, and routing definitions.

---

## Table of Contents
1. [Project Structure & Technology Stack](#1-project-structure--technology-stack)
2. [Application Routes & Access Control](#2-application-routes--access-control)
3. [Authentication Architecture & Session Lifecycle](#3-authentication-architecture--session-lifecycle)
4. [Central API Client (`src/api/api.ts`)](#4-central-api-client-srcapiapits)
5. [Customer Journey System](#5-customer-journey-system)
6. [Customer Event Blueprint Model](#6-customer-event-blueprint-model)
7. [AI Event Planning & Chatbot (`/api/ai/chat`)](#7-ai-event-planning--chatbot-apiaichat)
8. [Service Discovery & Provider Filtering](#8-service-discovery--provider-filtering)
9. [Provider Details & Package Selection](#9-provider-details--package-selection)
10. [Provider Portfolio & Gallery Engine](#10-provider-portfolio--gallery-engine)
11. [Provider Atelier Portal & Availability Sync](#11-provider-atelier-portal--availability-sync)
12. [Provider Category Canonical Normalization](#12-provider-category-canonical-normalization)
13. [Booking Lifecycle & Status State Machine](#13-booking-lifecycle--status-state-machine)
14. [Contact Privacy & Communication Rules](#14-contact-privacy--communication-rules)
15. [Digital QR Invitation Suite](#15-digital-qr-invitation-suite)
16. [Invitation Theme & Aesthetic System](#16-invitation-theme--aesthetic-system)
17. [Public Guest RSVP Engine](#17-public-guest-rsvp-engine)
18. [Invitation Expiration & Access Semantics](#18-invitation-expiration--access-semantics)
19. [Admin Atelier Control Center](#19-admin-atelier-control-center)
20. [Data Normalization & DTO Resilience Layers](#20-data-normalization--dto-resilience-layers)
21. [Client Storage Inventory (`localStorage`)](#21-client-storage-inventory-localstorage)
22. [Tenant & User Data Isolation](#22-tenant--user-data-isolation)
23. [Error Handling & Envelope Specifications](#23-error-handling--envelope-specifications)
24. [State Rehydration, Background Refreshes & Skeletons](#24-state-rehydration-background-refreshes--skeletons)
25. [What the Backend Developer Must Know (Domain Requirements)](#25-what-the-backend-developer-must-know)
26. [Master API Contract Table](#26-master-api-contract-table)
27. [Database Relationship & Entity Expectations](#27-database-relationship--entity-expectations)
28. [Frontend-to-Backend End-to-End Data Flow Diagrams](#28-frontend-to-backend-end-to-end-data-flow-diagrams)
29. [Known Frontend Assumptions & Integration Risks](#29-known-frontend-assumptions--integration-risks)
30. [Current Test Suite & Build Verification](#30-current-test-suite--build-verification)
31. [Final Executive Summary](#31-final-executive-summary)

---

## 1. Project Structure & Technology Stack

### 1.1 Core Stack
- **Framework:** React 19 (`react@^19.0.0`, `react-dom@^19.0.0`)
- **Language:** TypeScript 5.7 (`typescript@^5.7.2`)
- **Build Tool & Dev Server:** Vite 6 (`vite@^6.0.7`, `@vitejs/plugin-react@^4.3.4`)
- **Routing:** React Router DOM v7 (`react-router-dom@^7.18.4`)
- **Styling:** Tailwind CSS 3.4 (`tailwindcss@^3.4.17`, `postcss`, `autoprefixer`)
- **QR Code Engine:** `qrcode@^1.5.4`
- **Package Manager:** npm
- **Target Environments:** Modern Web Browsers (Chrome, Edge, Safari, Firefox, Mobile Safari/Chrome)

### 1.2 Actual Directory Tree
```
frontend/
├── .env                              # VITE_API_URL, VITE_APP_URL
├── package.json                      # React 19, Vite, Tailwind, QRCode
├── tailwind.config.js                # Theme tokens, custom luxury colors, fonts
├── tsconfig.json                     # Strict TypeScript configurations
├── vite.config.ts                    # Build & proxy definitions
└── src/
    ├── main.tsx                      # App bootstrap
    ├── App.tsx                       # Central router & protected layout boundaries
    ├── index.css                     # Global design tokens, dark/light theme CSS variables
    ├── api/
    │   └── api.ts                    # Central API client, interceptors, tokens, endpoints
    ├── constants/
    │   └── filters.ts                # Category filter lists & service defaults
    ├── context/
    │   └── ThemeContext.tsx          # Dark/Light mode theme provider
    ├── data/
    │   └── mockData.ts               # Demo data fallback utilities
    ├── types/
    │   ├── index.ts                  # Central type exports
    │   ├── event.ts                  # EventPlanData, extractEventData, string extractors
    │   ├── service.ts                # Provider, ProviderPackage, SelectedServiceItem
    │   ├── booking.ts                # Booking, BookingStatus, normalizeBackendBooking
    │   ├── provider.ts               # ProviderAccount, ProviderCategoryType, CategoryData
    │   └── invitation.ts             # InvitationData, InvitationTheme, normalizeInvitationTheme
    ├── utils/
    │   ├── customerAuth.ts           # Customer session, JWT storage, verification, logout
    │   ├── providerAuth.ts           # Provider session, category normalizer, availability
    │   └── adminAuth.ts              # Admin session, token verification, admin logout
    ├── components/
    │   ├── admin/
    │   │   ├── AdminHeader.tsx       # Admin top navigation & profile
    │   │   └── AdminLayout.tsx       # Admin route guard & session rehydrator
    │   ├── bookings/
    │   │   ├── BookingCard.tsx       # Customer/Provider booking card with contact display
    │   │   ├── BookingFilters.tsx    # Filter by PENDING, ACCEPTED, REJECTED, COMPLETED
    │   │   ├── BookingStatusBadge.tsx# Status indicator badge
    │   │   ├── BookingSummary.tsx    # Total bookings & financial metrics
    │   │   └── ContactProviderCard.tsx # Direct phone/email actions
    │   ├── common/
    │   │   ├── Icon.tsx              # Google Material Symbols wrapper
    │   │   └── ThemeToggle.tsx       # Dark/Light mode toggle switch
    │   ├── customer/
    │   │   ├── CustomerHeader.tsx    # Customer portal navigation, blueprint badge
    │   │   └── CustomerLayout.tsx    # Customer route guard & session rehydrator
    │   ├── event-plan/
    │   │   ├── BookingRequestConfirmation.tsx # Final booking request success modal
    │   │   ├── BudgetOverview.tsx    # Real-time budget progress bar & remaining calculator
    │   │   ├── EventPlanEventSummary.tsx      # Blueprint info header on Plan page
    │   │   ├── EventPlanHeader.tsx            # Header actions
    │   │   └── SelectedServiceCard.tsx        # Selected service in plan with remove/price
    │   ├── invitation/
    │   │   ├── InvitationCard.tsx    # Luxury dynamic card (Gold, Burgundy, Glass, Noir)
    │   │   ├── QRCodeCard.tsx        # QR code canvas renderer & PNG downloader
    │   │   ├── RSVPDashboard.tsx     # (Archived tracker component)
    │   │   └── RSVPForm.tsx          # Public guest RSVP submission form
    │   ├── layout/
    │   │   ├── Header.tsx            # Public marketing header
    │   │   └── Footer.tsx            # Public footer
    │   ├── modals/
    │   │   ├── BookingPreviewModal.tsx # Booking confirmation modal
    │   │   ├── DualPortalModal.tsx     # Role selector modal (Customer vs Provider)
    │   │   ├── PlanWizardModal.tsx     # Onboarding assistant modal
    │   │   └── ServiceDetailModal.tsx  # Quick preview modal
    │   ├── onboarding/
    │   │   ├── EventTypeStep.tsx     # Step 1: Event type selection
    │   │   ├── EventDetailsStep.tsx  # Step 2: Date, location
    │   │   ├── EventScaleStep.tsx    # Step 3: Guest count & total budget
    │   │   ├── ServicesStep.tsx      # Step 4: Required service checkboxes
    │   │   ├── PreferencesStep.tsx   # Step 5: Cultural/aesthetic preferences & notes
    │   │   ├── ReviewStep.tsx        # Step 6: Final blueprint review & backend POST
    │   │   └── OnboardingProgress.tsx# Step indicator bar
    │   ├── provider/
    │   │   ├── ProviderHeader.tsx    # Provider portal top navigation & category indicator
    │   │   ├── ProviderLayout.tsx    # Provider route guard & profile sync
    │   │   └── ProviderSidebar.tsx   # Navigation sidebar (Dashboard, Bookings, Schedule, Profile)
    │   ├── sections/
    │   │   ├── HeroSection.tsx, ServicesSection.tsx, HowItWorksSection.tsx, etc.
    │   └── services/
    │       ├── EvaAiAssistant.tsx    # Floating AI assistant & "Build My Plan" orchestrator
    │       ├── EventPlanSummary.tsx  # Blueprint widget
    │       ├── EventSummaryCard.tsx  # Sticky blueprint bar with "Build My Plan" CTA
    │       ├── ProviderCard.tsx      # Discovery catalog card
    │       ├── ProviderFilters.tsx   # Category, price, rating, location filters
    │       └── ServiceCategoryCard.tsx # Category pill card
    └── pages/
        ├── LandingPage.tsx           # Public homepage
        ├── SignupPage.tsx            # Public role selection for signup
        ├── CustomerSignupPage.tsx    # Customer registration
        ├── ProviderSignupPage.tsx    # Provider multi-step registration
        ├── LoginPage.tsx             # Public role selection for login
        ├── CustomerLoginPage.tsx     # Customer authentication
        ├── ProviderLoginPage.tsx     # Provider authentication
        ├── AdminLoginPage.tsx        # Admin authentication
        ├── EventOnboardingPage.tsx   # 6-step event blueprint creation wizard
        ├── CustomerDashboardPage.tsx # Customer home: active event, quick actions, AI
        ├── ServiceDiscoveryPage.tsx  # Explore services catalog & provider filters
        ├── ProviderDetailsPage.tsx   # Deep provider profile, gallery, package selection
        ├── EventPlanPage.tsx         # Cart review, budget validation, multi-booking checkout
        ├── MyBookingsPage.tsx        # Customer booking tracking & status
        ├── CustomerProfilePage.tsx   # Customer profile editing
        ├── CustomerInvitationPage.tsx# Digital Invitation Studio & QR pass generator
        ├── PublicInvitationPage.tsx  # Standalone public guest invitation & RSVP page
        ├── ProviderDashboardPage.tsx # Provider atelier overview & booking stats
        ├── ProviderBookingsPage.tsx  # Provider booking request approval/rejection
        ├── ProviderSchedulePage.tsx  # Interactive unavailable dates calendar & sync
        ├── ProviderProfilePage.tsx   # Provider business details, pricing, bio
        ├── ProviderPortfolioPage.tsx # Portfolio image gallery upload & delete
        ├── AdminDashboardPage.tsx    # System stats (users, providers, approvals)
        ├── AdminUsersPage.tsx        # Customer account directory
        ├── AdminProvidersPage.tsx    # Provider directory with status filtering
        └── AdminProviderDetailPage.tsx # Admin provider inspection & approve/reject
```

---

## 2. Application Routes & Access Control

### 2.1 Route Map Table

| Route | Component | Guard / Access | Purpose | Primary Backend APIs |
|---|---|---|---|---|
| `/` | `LandingPage` | Public | Marketing landing page | None |
| `/signup` | `SignupPage` | Public | Role selection (Customer vs Provider) | None |
| `/signup/customer` | `CustomerSignupPage` | Public | Customer account registration | `POST /auth/register` |
| `/signup/provider` | `ProviderSignupPage` | Public | Provider account registration & profile setup | `POST /auth/register`, `POST /providers` |
| `/login` | `LoginPage` | Public | Role selection (Customer vs Provider) | None |
| `/login/customer` | `CustomerLoginPage` | Public | Customer login form | `POST /auth/login`, `GET /auth/me` |
| `/login/provider` | `ProviderLoginPage` | Public | Provider login form | `POST /auth/login`, `GET /auth/me`, `GET /providers/profile` |
| `/admin/login` | `AdminLoginPage` | Public / Admin | Admin credentials login | `POST /auth/login`, `GET /auth/me` |
| `/onboarding/event` | `EventOnboardingPage` | Public / Customer | 6-step Event Blueprint creation wizard | `POST /events`, `GET /events` |
| `/customer/dashboard` | `CustomerDashboardPage` | Customer Auth | Overview: active event, quick stats, AI assistant | `GET /events`, `GET /bookings/my`, `GET /invitations` |
| `/customer/services` | `ServiceDiscoveryPage` | Customer Auth | Service catalog, category filters, provider cards | `GET /providers`, `GET /providers/categories`, `GET /events` |
| `/customer/services/:providerId` | `ProviderDetailsPage` | Customer Auth | Provider portfolio, pricing packages, contact | `GET /providers/:id`, `GET /providers/:id/unavailable-dates` |
| `/customer/provider/:providerId` | `ProviderDetailsPage` | Customer Auth | Alias to provider details | `GET /providers/:id` |
| `/customer/event-plan` | `EventPlanPage` | Customer Auth | Cart review, budget validation, checkout | `GET /events/:id`, `POST /events/:id/bookings`, `POST /bookings` |
| `/customer/invitation` | `CustomerInvitationPage` | Customer Auth | Invitation Studio, theme selector, QR pass | `GET /invitations`, `POST /invitations`, `PUT /invitations/:id` |
| `/customer/bookings` | `MyBookingsPage` | Customer Auth | Customer booking management & status tracking | `GET /bookings/my`, `PATCH /bookings/:id/status` |
| `/customer/profile` | `CustomerProfilePage` | Customer Auth | Customer profile & contact update | `GET /auth/me`, `PUT /auth/me` |
| `/invitation/:publicToken` | `PublicInvitationPage` | **Public Guest (No Auth)** | Digital invitation view & RSVP submission | `GET /public/invitations/:publicToken`, `POST /public/invitations/:publicToken/rsvp` |
| `/provider/dashboard` | `ProviderDashboardPage` | Provider Auth | Provider overview: stats, recent bookings, schedule | `GET /providers/profile`, `GET /bookings/provider` |
| `/provider/bookings` | `ProviderBookingsPage` | Provider Auth | Accept/reject customer booking requests | `GET /bookings/provider`, `PATCH /bookings/:id/status` |
| `/provider/schedule` | `ProviderSchedulePage` | Provider Auth | Calendar unavailable dates management | `GET /providers/availability`, `PUT /providers/availability/sync` |
| `/provider/profile` | `ProviderProfilePage` | Provider Auth | Business profile, experience, starting price | `GET /providers/profile`, `PUT /providers/profile` |
| `/provider/portfolio` | `ProviderPortfolioPage` | Provider Auth | Portfolio image management & upload | `GET /providers/portfolio`, `POST /providers/portfolio` |
| `/admin/dashboard` | `AdminDashboardPage` | Admin Auth | Metric cards: total users, pending providers | `GET /admin/dashboard/stats`, `GET /admin/providers/pending` |
| `/admin/users` | `AdminUsersPage` | Admin Auth | Customer directory list | `GET /admin/users` |
| `/admin/providers` | `AdminProvidersPage` | Admin Auth | All providers with status filters | `GET /providers`, `GET /admin/providers/pending` |
| `/admin/providers/:id` | `AdminProviderDetailPage` | Admin Auth | Review provider details & Approve/Reject | `GET /providers/:id`, `PATCH /admin/providers/:id/status` |

### 2.2 Route Protection Mechanism
Each portal route hierarchy is wrapped by a dedicated Layout component:
1. **Customer Guard (`CustomerLayout.tsx`):**
   - Checks `getCustomerSession()` and `getStoredAccessToken()`.
   - Executes background validation via `verifyCustomerSession()` calling `GET /auth/me`.
   - If missing or role is not `'customer'`, redirects immediately to `/login/customer?redirect=<path>`.
2. **Provider Guard (`ProviderLayout.tsx`):**
   - Checks `getProviderSession()` and `getStoredAccessToken()`.
   - Executes background validation via `verifyProviderSession()` calling `GET /auth/me` and `GET /providers/profile`.
   - If missing or role is not `'provider'`, redirects immediately to `/login/provider?redirect=<path>`.
3. **Admin Guard (`AdminLayout.tsx`):**
   - Checks `getAdminSession()` and `getStoredAccessToken()`.
   - Executes background validation via `verifyAdminSession()` calling `GET /auth/me`.
   - If missing or `role !== 'admin'`, redirects immediately to `/admin/login`.

---

## 3. Authentication Architecture & Session Lifecycle

### 3.1 Token Strategy
- **Access Token:** Bearer JWT stored in `localStorage` (`eva_ai_auth_token` or inside session objects). Sent in `Authorization: Bearer <access_token>`.
- **Refresh Token:** Stored in `localStorage` (`eva_ai_refresh_token`).
- **Automatic 401 Refresh Flow:**
  1. API request receives HTTP `401 Unauthorized`.
  2. If a refresh token is present, `apiRequest` invokes `getOrStartTokenRefresh(refreshToken)`.
  3. Deduplication: Concurrent requests share a single `activeRefreshPromise`.
  4. Calls `POST /auth/refresh` with `{ refreshToken: "..." }`.
  5. On 200 OK, saves new `access_token` and retries the original request exactly once (`_retry: true`).
  6. On failure, invokes `handleAuthFailure()`, purges session tokens, and emits window session update events.

### 3.2 Customer Authentication
- **Signup (`POST /auth/register`):**
  - Payload: `{ fullName, email, password, phone, location, role: "customer" }`
  - Expected Response: `{ success: true, token, session: { access_token, refresh_token }, user: { id, email, fullName, role: "customer" } }`
- **Login (`POST /auth/login`):**
  - Payload: `{ email, password }`
  - Expected Response: Returns JWT tokens and user record.
- **Verification (`GET /auth/me`):**
  - Validates active JWT and rehydrates customer session.

### 3.3 Provider Authentication
- **Signup (`POST /auth/register` + `POST /providers`):**
  - Registers base user (`role: "provider"`), then creates provider business profile.
  - Category, pricing, and business metadata sent to backend.
- **Login (`POST /auth/login`):**
  - Returns provider tokens and fetches `GET /providers/profile`.

### 3.4 Admin Authentication
- **Login (`POST /auth/login`):**
  - Authenticates admin credentials.
  - Expects `user.role === 'admin'`.

---

## 4. Central API Client (`src/api/api.ts`)

### 4.1 Configuration
- `VITE_API_URL`: Absolute backend base URL (e.g. `https://epa-drama-calibration-sit.trycloudflare.com/api`).
- `VITE_APP_URL`: Authoritative frontend public origin (used for QR codes and public invitation URLs).

### 4.2 Error Model (`ApiError`)
All non-2xx responses or `{ success: false }` envelopes throw an instance of `ApiError`:
```ts
export class ApiError extends Error {
  status: number;          // HTTP status code (0 for network failure)
  errorKey?: string;       // e.g. "INVALID_CREDENTIALS", "NOT_FOUND"
  missingFields?: string[];// Backend validation field errors
  responseBody?: any;      // Full raw JSON response
}
```

---

## 5. Customer Journey System

```
[ Signup / Login ]
       ↓
[ Event Onboarding Wizard (/onboarding/event) ] ──> POST /events
       ↓
[ Customer Dashboard (/customer/dashboard) ] ──> GET /events, GET /bookings/my
       ↓
[ AI Assistant & "Build My Plan" (/customer/services) ] ──> POST /api/ai/chat
       ↓
[ Explore Services & Provider Filters ] ──> GET /providers?category=...
       ↓
[ Provider Details & Package Selection ] ──> GET /providers/:id
       ↓
[ Event Plan Cart Review (/customer/event-plan) ] ──> GET /events/:id, POST /events/:id/bookings
       ↓
[ Booking Status Tracking (/customer/bookings) ] ──> GET /bookings/my
       ↓
[ Digital QR Invitation Studio (/customer/invitation) ] ──> POST/PUT /invitations
```

---

## 6. Customer Event Blueprint Model

### 6.1 Field Specification
The frontend represents and parses the Event Blueprint via `EventPlanData`:

| Field Name | Type | Allowed Values / Format | Required? | Description |
|---|---|---|---|---|
| `id` | `string` | UUID or alphanumeric | Yes | Event unique identifier |
| `customerId` / `userId` | `string` | UUID | Yes | Owner customer identifier |
| `eventType` | `string` | `Wedding`, `Corporate`, `Birthday`, `Anniversary`, etc. | Yes | Type of celebration |
| `eventDate` | `string` | `YYYY-MM-DD` | Yes | Target event date |
| `location` | `string` | City / Venue address (e.g. `Kochi, Kerala`) | Yes | Event location |
| `guestCount` | `number` | Positive integer (e.g. `250`) | Yes | Expected guest count |
| `budget` | `number` | Numeric amount in INR (e.g. `2500000`) | Yes | Total allocated budget |
| `services` | `string[]` | Array of category names | Yes | Required services |
| `preferences` | `string[]` | Array of style/atmosphere tags | No | Aesthetic preferences |
| `additionalNotes` | `string` | Text string | No | Custom requirements |
| `status` | `string` | `draft`, `active`, `completed` | No | Blueprint status |

### 6.2 DTO Resilience (`extractEventData`)
The frontend parser automatically accepts and normalizes any of the following backend response shapes:
- Nested services: `services`, `requiredServices`, `required_services`, `requestedServices`, `eventRequirements`, `eventPlan.services`
- Nested preferences: `preferences`, `stylePreferences`, `style_preferences`, `atmospherePreferences`, `eventPlan.preferences`

---

## 7. AI Event Planning & Chatbot (`/api/ai/chat`)

### 7.1 Request Structure (`POST /api/ai/chat`)
```json
{
  "message": "Build a complete event plan for my Wedding in Udaipur on 2026-12-15 for 200 guests with a total budget of ₹50,00,000. Required services: Photography, Venue, Catering, Decoration...",
  "conversationId": "conv_1790872800000_abc123",
  "eventId": "fb427e6b-0d76-4fdd-8dae-47a335e18523"
}
```

### 7.2 Expected Response Structure
```json
{
  "success": true,
  "message": "Here is your curated wedding plan within your ₹50,00,000 budget...",
  "recommendations": [
    {
      "providerId": "prov-photo-01",
      "serviceId": "srv-photo-gold",
      "providerName": "Thevarkad Photography",
      "serviceName": "Royal Wedding Package",
      "category": "Photographer",
      "location": "Udaipur",
      "startingPrice": 150000,
      "rating": 4.9,
      "experience": 8
    }
  ],
  "actions": [
    {
      "type": "VIEW_PROVIDER",
      "providerId": "prov-photo-01"
    }
  ]
}
```

### 7.3 Frontend Behavioral Expectations
- **Recommendation Cards:** Rendered directly inside chat with category pill, rating, price, and "Add to Plan" CTA.
- **Direct Add to Cart:** Clicking "Add to Plan" in chat adds the recommended provider directly to `eva_ai_selected_services` and synchronizes with `POST /events/:eventId/services`.

---

## 8. Service Discovery & Provider Filtering

### 8.1 Querying Providers (`GET /providers`)
Supported Query Parameters:
- `category`: Filter by category string (e.g. `Photographer`, `Caterer`, `Venue / Auditorium`)
- `location`: Substring location search
- `minRating`: Numeric minimum rating (e.g. `4.5`)
- `priceRange`: `budget`, `mid`, `premium`, `luxury`
- `search`: Keyword search over name, bio, tags

### 8.2 Provider Normalization (`normalizeBackendProvider`)
- Only providers with `approvalStatus === 'APPROVED'` or without explicit rejection are displayed to customers.
- Starting price is extracted across: `startingPrice`, `starting_price`, `minPrice`, `pricing.starting`, or `packages[0].price`.

---

## 9. Provider Details & Package Selection

### 9.1 Data Model
`GET /providers/:id` returns the provider profile including package tiers:
```json
{
  "id": "prov-123",
  "name": "Lumière Wedding Photography",
  "category": "Photographer",
  "location": "Kochi, Kerala",
  "rating": 4.9,
  "reviewCount": 48,
  "yearsExperience": 7,
  "startingPrice": 75000,
  "description": "Candid wedding photography & cinematic films.",
  "images": [
    "https://images.unsplash.com/photo-wedding-1.jpg",
    "https://images.unsplash.com/photo-wedding-2.jpg"
  ],
  "packages": [
    {
      "id": "pkg-1",
      "name": "Essential Coverage",
      "price": 75000,
      "description": "1 Day Traditional & Candid Photography",
      "features": ["1 Lead Photographer", "300 Edited Photos", "Online Gallery"]
    },
    {
      "id": "pkg-2",
      "name": "Royal Cinematic Suite",
      "price": 150000,
      "description": "Full 2-Day Coverage with Cinematic Teaser",
      "features": ["2 Photographers + 2 Cinematographers", "Teaser + Full Film", "Drone Coverage", "Luxury Album"]
    }
  ],
  "contactDemo": {
    "phone": "+91 98765 43210",
    "email": "contact@lumiere.com"
  }
}
```

---

## 10. Provider Portfolio & Gallery Engine

### 10.1 Gallery State Stability
- **Image Normalization:** Resolves string URLs, object shapes `{ url, imageUrl, secure_url, src }`, and deduplicates gallery lists.
- **Active Thumbnail Tracking:** The first image is selected by default (`selectedImageIndex = 0`). Selecting a thumbnail sets the main view deterministically.
- **Upload API (`POST /providers/portfolio`):** Accepts `FormData` (or base64 JSON) and appends image URLs to provider gallery.
- **Delete API (`DELETE /providers/portfolio/:id`):** Removes an image record.

---

## 11. Provider Atelier Portal & Availability Sync

### 11.1 Schedule Management (`/provider/schedule`)
- **Unavailable Dates (`GET /providers/availability`):** Returns array of date strings in `YYYY-MM-DD` format.
- **Sync API (`PUT /providers/availability/sync`):**
  - Payload: `{ dates: ["2026-11-20", "2026-11-21", "2026-12-15"] }`
  - Replaces or updates the manual unavailable dates in backend database.
- **Automatic Booking Date Locking:** When a booking is marked `ACCEPTED`, the booking's `eventDate` is automatically treated as unavailable.

---

## 12. Provider Category Canonical Normalization

The single source of truth is [`normalizeProviderCategory()`](file:///c:/Users/athul/Documents/EVA-AI/Eva-Ai/frontend/src/utils/providerAuth.ts#L192).

### Supported Canonical Categories & Mappings:
1. **`Photographer`**: Matches `photography`, `photo`, `cinematography`, `videography`, `album`, `film`.
2. **`Makeup Artist`**: Matches `makeup`, `make-up`, `bridal makeup`, `beauty`, `salon`, `mehendi`, `henna`.
3. **`Venue / Auditorium`**: Matches `venue`, `auditorium`, `hall`, `convention`, `ballroom`, `resort`, `palace`.
4. **`Caterer`**: Matches `caterer`, `catering`, `food`, `sadya`, `culinary`, `dining`, `chef`.
5. **`Decorator`**: Matches `decorator`, `decoration`, `decor`, `mandap`, `florist`, `floral`, `stage decor`.
6. **`DJ / Entertainment`**: Matches `dj`, `entertainment`, `artist`, `music`, `sound`, `band`, `singer`, `orchestra`.
7. **`Event Manager`**: Matches `event manager`, `event management`, `planner`, `coordinator`, `organizer`.

> **Note on Fallbacks:** The frontend **NEVER** defaults an unknown category to `Event Manager`. If a category is unrecognized, it preserves the original category name to avoid misrepresenting providers.

---

## 13. Booking Lifecycle & Status State Machine

```
               [ Customer Creates Booking ]
                            ↓
                    status: "PENDING"
                      /           \
     [ Provider Accepts ]       [ Provider Rejects / Customer Cancels ]
            ↓                                     ↓
    status: "ACCEPTED"             status: "REJECTED" / "CANCELLED"
            ↓
   [ Service Completed ]
            ↓
   status: "COMPLETED"
```

### 13.1 Role Capabilities
- **Customer:** Can create (`POST /bookings`), cancel (`PATCH /bookings/:id/status` with `CANCELLED`).
- **Provider:** Can accept (`ACCEPTED`), reject (`REJECTED`), complete (`COMPLETED`).
- **Admin:** Can inspect all bookings across customers and providers.

---

## 14. Contact Privacy & Communication Rules

Customer and Provider contact information (Phone, Email) is displayed selectively based on booking state:

| Booking Status | Customer Contact Visible to Provider? | Provider Contact Visible to Customer? | Reason |
|---|---|---|---|
| `PENDING` | Name & Event Date only (Phone/Email hidden or masked) | Business Name & Location only | Privacy protection prior to mutual commitment |
| `ACCEPTED` | **Full Phone & Email Unlocked** | **Full Direct Phone & Email Unlocked** | Collaboration, logistics coordination |
| `REJECTED` | Hidden | Hidden | Inactive request |
| `CANCELLED`| Hidden | Hidden | Inactive request |
| `COMPLETED`| Available for invoice/history | Available for invoice/history | Historical record |

---

## 15. Digital QR Invitation Suite

### 15.1 Core Architecture
1. Customer designs invitation in **Invitation Studio** (`/customer/invitation`).
2. Frontend calls `POST /invitations` (or `PUT /invitations/:id`).
3. Backend creates record with unique cryptographic `publicToken` (e.g. `a1f219045d567d59de479a41ae24c1e8`).
4. Frontend generates QR code encoding the **Public Frontend URL**:
   `https://<frontend-public-origin>/invitation/<publicToken>`
5. **The QR code contains ONLY the URL**, not raw payload data.
6. When scanned, guest device opens public frontend page, which queries `GET /api/public/invitations/:publicToken`.

---

## 16. Invitation Theme & Aesthetic System

### 16.1 Canonical Themes (`template` Column)
The backend database stores and returns the aesthetic template in the **`template`** field.

| Canonical Theme ID | Display Name | Visual Palette / Background | Border & Accent |
|---|---|---|---|
| `royal-gold` | Traditional Royal Gold (Default) | `bg-gradient-to-b from-[#1E1A11] via-[#121317] to-[#121317]` | `border-primary/40`, Gold `#f2ca50` |
| `velvet-burgundy` | Burgundy Imperial | `bg-gradient-to-b from-[#2A0E15] via-[#170C0F] to-[#121317]` | `border-[#ff5277]/30`, Rose `#ff5277` |
| `botanical-glass` | Botanical Conservatory | `bg-gradient-to-b from-[#0F1E19] via-[#121715] to-[#121317]` | `border-emerald-500/30`, Emerald `#10b981` |
| `minimal-noir` | Modern Minimalist Noir | `bg-[#18191E]` | `border-white/20`, Pure White/Zinc |

### 16.2 Theme Resolution Flow
```
Customer selects Theme in Studio
             ↓
Payload sends { template: "velvet-burgundy", theme: "velvet-burgundy" }
             ↓
Backend stores in invitation.template
             ↓
GET /api/public/invitations/:publicToken returns { template: "velvet-burgundy" }
             ↓
PublicInvitationPage normalizes via normalizeInvitationTheme()
             ↓
InvitationCard renders exact Burgundy Luxury styling in public/incognito
```

---

## 17. Public Guest RSVP Engine

### 17.1 Public RSVP Endpoint (`POST /api/public/invitations/:publicToken/rsvp`)
- **Authentication:** None (Public guest endpoint).
- **Request Payload:**
```json
{
  "name": "Deepak & Priya Varma",
  "attending": true,
  "guestCount": 2,
  "notes": "Looking forward to celebrating with you! (Vegetarian meals preferred)"
}
```
- **Expected Response:**
```json
{
  "success": true,
  "message": "RSVP recorded successfully"
}
```

---

## 18. Invitation Expiration & Access Semantics

- **Status Enum:** `'ACTIVE'` | `'EXPIRED'`
- **Authoritative Determination:** Backend evaluates event date / expiration timestamp.
- **Behavior when `EXPIRED`:**
  - `PublicInvitationPage` displays an "Expired Invitation" badge.
  - `RSVPForm` is disabled / hidden for guests.
  - Invitation card details remain readable as a historical keepsake.

---

## 19. Admin Atelier Control Center

### 19.1 Admin Capabilities & Endpoints
1. **Stats Overview (`GET /admin/dashboard/stats`):**
   - Returns `{ totalCustomers, totalProviders, pendingProviders, approvedProviders, rejectedProviders }`.
2. **User Management (`GET /admin/users`):**
   - Returns list of registered customer accounts.
3. **Provider Moderation (`GET /admin/providers/pending`, `PATCH /admin/providers/:id/status`):**
   - Status transitions: `PENDING` → `APPROVED` | `REJECTED` | `SUSPENDED`.

---

## 20. Data Normalization & DTO Resilience Layers

| Domain | Frontend Normalizer Function | Purpose & Tolerances |
|---|---|---|
| **Events** | `extractEventData()` in `event.ts` | Handles flat/nested event objects, requirement lists, and alias variations |
| **Providers** | `normalizeProviderCategory()` in `providerAuth.ts` | Resolves 7 canonical provider categories without incorrect fallbacks |
| **Bookings** | `normalizeBackendBooking()` in `booking.ts` | Normalizes package names, numeric prices, status enums, and contact details |
| **Invitations** | `normalizeInvitationTheme()` in `invitation.ts` | Maps legacy/variant theme strings (`gold`, `burgundy`, `emerald`, `noir`) to canonical IDs |

---

## 21. Client Storage Inventory (`localStorage`)

| Key | Purpose | Data Type / Model | Backend Authoritative? | Cleanup on Logout |
|---|---|---|---|---|
| `eva_ai_auth_token` | Primary JWT access token | `string` (JWT) | Yes | Cleared |
| `eva_ai_refresh_token` | Refresh token | `string` | Yes | Cleared |
| `eva_ai_customer_session` | Active customer profile & auth state | `CustomerSession` JSON | Yes (`GET /auth/me`) | Cleared |
| `eva_ai_provider_session` | Active provider profile & auth state | `ProviderSession` JSON | Yes (`GET /auth/me`) | Cleared |
| `eva_ai_admin_session` | Active admin session | `AdminSession` JSON | Yes (`GET /auth/me`) | Cleared |
| `eva_ai_event` | Active customer event blueprint cache | `EventPlanData` JSON | Yes (`GET /events`) | Cleared |
| `eva_ai_selected_services` | Selected service cart items | `SelectedServiceItem[]` JSON | Yes (`GET /events/:id/plan`) | Cleared |
| `eva_ai_bookings` | Cached user bookings | `Booking[]` JSON | Yes (`GET /bookings/my`) | Cleared |
| `eva_ai_invitation` | Cached customer invitation | `InvitationData` JSON | Yes (`GET /invitations`) | Cleared |
| `eva_ai_theme` | UI Dark/Light mode preference | `'dark' \| 'light'` | No (Client preference) | **Preserved** |
| `eva_ai_chat_conversation_id` | AI Chatbot session ID | `string` | No (Chat session) | Preserved / Session |

---

## 22. Tenant & User Data Isolation

1. **Owner-Scoped Cache Checking:** Every cached object in `localStorage` (`eva_ai_event`, `eva_ai_invitation`, `eva_ai_bookings`) verifies `customerId === activeSession.customerId`. If ownership does not match, the stale cache is immediately purged.
2. **Provider Separation:** Provider portal components strictly use `providerSession.providerId` and call `/bookings/provider` rather than `/bookings/my`.
3. **Session Purge:** Logging out one account strictly cleans all personal business records before the next login.

---

## 23. Error Handling & Envelope Specifications

### Expected Standard Error Envelope:
```json
{
  "success": false,
  "error": "BAD_REQUEST",
  "message": "Missing required fields: phone, location",
  "missingFields": ["phone", "location"]
}
```
HTTP Status Mapping:
- `400 Bad Request`: Form validation errors (triggers inline UI warnings).
- `401 Unauthorized`: Token refresh attempted once; triggers redirect to login on failure.
- `403 Forbidden`: Role permission mismatch.
- `404 Not Found`: Displays empty/not-found fallback cards.
- `409 Conflict`: Duplicate email/resource conflicts.

---

## 24. State Rehydration, Background Refreshes & Skeletons

- **Optimistic Stale-While-Revalidate:** The frontend renders instantly using cached `localStorage` data while dispatching asynchronous background fetch requests to the backend (`GET /events`, `GET /bookings/my`, `GET /invitations`).
- **Seamless Merge:** When the authoritative backend data arrives, the React state merges and updates the UI smoothly without layout shifts.

---

## 25. What the Backend Developer Must Know

### 25.1 Authentication Requirements
- Support JWT access tokens (`exp: 1h`) and refresh tokens.
- Return user profile in login/register responses: `{ id, email, fullName, role, phone, location }`.
- Provide `GET /auth/me` to validate tokens and return current user details.

### 25.2 Event Blueprint Requirements
- `POST /events` must accept `eventType`, `eventDate`, `location`, `guestCount`, `budget`, `services`, `preferences`, `additionalNotes`.
- `GET /events` must return all events owned by the authenticated customer.

### 25.3 Provider Requirements
- Category must be one of the 7 canonical categories: `Photographer`, `Event Manager`, `Makeup Artist`, `Venue / Auditorium`, `Caterer`, `Decorator`, `DJ / Entertainment`.
- Packages should be stored and returned as an array of `{ id, name, price, description, features }`.

### 25.4 Invitation & Theme Requirements
- `POST /invitations` and `PUT /invitations/:id` must persist the selected theme under the column/field **`template`** (e.g. `royal-gold`, `velvet-burgundy`, `botanical-glass`, `minimal-noir`).
- `GET /api/public/invitations/:publicToken` must expose the `template` field so public guest views can render the correct theme.

---

## 26. Master API Contract Table

| # | Module | Method | Endpoint | Auth | Role | Request Payload | Response Data Shape | Frontend Consumer |
|---|---|---|---|---|---|---|---|---|
| 1 | Auth | `POST` | `/auth/register` | No | Public | `{ fullName, email, password, phone, location, role }` | `{ success, token, user, session }` | Customer/Provider Signup |
| 2 | Auth | `POST` | `/auth/login` | No | Public | `{ email, password }` | `{ success, token, user, session }` | Customer/Provider/Admin Login |
| 3 | Auth | `GET` | `/auth/me` | Bearer | Any | None | `{ success, user: { id, email, fullName, role, ... } }` | Session rehydration |
| 4 | Auth | `PUT` | `/auth/me` | Bearer | Any | `{ fullName, phone, location, ... }` | `{ success, user }` | Customer Profile Page |
| 5 | Auth | `POST` | `/auth/refresh` | No | Any | `{ refreshToken }` | `{ success, token, session }` | Central API Interceptor |
| 6 | Auth | `POST` | `/auth/logout` | Bearer | Any | None | `{ success: true }` | Logout actions |
| 7 | Providers | `GET` | `/providers` | Optional | Public/Cust | Query: `?category=&location=&minRating=` | `{ success, data: Provider[] }` | Service Discovery Catalog |
| 8 | Providers | `GET` | `/providers/:id` | Optional | Public/Cust | None | `{ success, data: Provider }` | Provider Details Page |
| 9 | Providers | `GET` | `/providers/categories` | No | Public | None | `{ success, data: string[] }` | Category Filters |
| 10 | Providers | `GET` | `/providers/:id/unavailable-dates` | Optional | Public/Cust | None | `{ success, data: string[] }` | Date Picker in Booking |
| 11 | Providers | `GET` | `/providers/profile` | Bearer | Provider | None | `{ success, data: ProviderAccount }` | Provider Portal |
| 12 | Providers | `PUT` | `/providers/profile` | Bearer | Provider | Partial ProviderAccount DTO | `{ success, data: ProviderAccount }` | Provider Profile Edit |
| 13 | Providers | `GET` | `/providers/availability` | Bearer | Provider | None | `{ success, data: string[] }` | Provider Schedule Page |
| 14 | Providers | `PUT` | `/providers/availability/sync` | Bearer | Provider | `{ dates: string[] }` | `{ success: true }` | Schedule Calendar Sync |
| 15 | Providers | `GET` | `/providers/portfolio` | Bearer | Provider | None | `{ success, data: ImageItem[] }` | Provider Portfolio Page |
| 16 | Providers | `POST` | `/providers/portfolio` | Bearer | Provider | `FormData` or `{ images: string[] }` | `{ success, data }` | Portfolio Image Upload |
| 17 | Providers | `DELETE` | `/providers/portfolio/:id` | Bearer | Provider | None | `{ success: true }` | Delete Portfolio Image |
| 18 | Events | `POST` | `/events` | Bearer | Customer | Event Blueprint DTO | `{ success, event: EventPlanData }` | Event Onboarding Wizard |
| 19 | Events | `GET` | `/events` | Bearer | Customer | None | `{ success, events: EventPlanData[] }` | Customer Dashboard |
| 20 | Events | `GET` | `/events/:id` | Bearer | Customer | None | `{ success, event: EventPlanData }` | Event Plan Page |
| 21 | Events | `PUT` | `/events/:id` | Bearer | Customer | Partial EventPlanData DTO | `{ success, event: EventPlanData }` | Blueprint Update |
| 22 | Events | `POST` | `/events/:id/services` | Bearer | Customer | `{ providerId, serviceId, packageName, price }` | `{ success, data }` | Add Service to Plan |
| 23 | Events | `DELETE`| `/events/:id/services/:serviceId`| Bearer | Customer | None | `{ success: true }` | Remove Service from Plan |
| 24 | Events | `GET` | `/events/:id/plan` | Bearer | Customer | None | `{ success, plan: { budget, estimatedCost, ... } }` | Budget Overview |
| 25 | Events | `POST` | `/events/:id/bookings` | Bearer | Customer | `{ notes?: string }` | `{ success, bookings: Booking[] }` | Multi-booking Checkout |
| 26 | Bookings | `POST` | `/bookings` | Bearer | Customer | Single Booking DTO | `{ success, booking: Booking }` | Direct Provider Booking |
| 27 | Bookings | `GET` | `/bookings/my` | Bearer | Customer | None | `{ success, bookings: Booking[] }` | My Bookings Page |
| 28 | Bookings | `GET` | `/bookings/provider` | Bearer | Provider | None | `{ success, bookings: Booking[] }` | Provider Bookings Page |
| 29 | Bookings | `PATCH`| `/bookings/:id/status` | Bearer | Both | `{ status: "ACCEPTED" \| "REJECTED" \| "CANCELLED" \| "COMPLETED" }` | `{ success, booking: Booking }` | Booking Action Buttons |
| 30 | AI | `POST` | `/ai/chat` | Bearer | Customer | `{ message, eventId, conversationId }` | `{ success, message, recommendations, actions }` | Eva AI Assistant Chatbot |
| 31 | AI | `POST` | `/recommendations` | Bearer | Customer | `AIRecommendationRequest` DTO | `{ success, recommendations: [...] }` | Algorithmic Recommender |
| 32 | Invitations | `POST` | `/invitations` | Bearer | Customer | `{ eventId, hostNames, title, message, venueName, template, ... }` | `{ success, invitation: { id, publicToken, template, ... } }` | Invitation Studio Save |
| 33 | Invitations | `GET` | `/invitations` | Bearer | Customer | None | `{ success, invitations: InvitationData[] }` | Invitation Studio Load |
| 34 | Invitations | `GET` | `/invitations/:id` | Bearer | Customer | None | `{ success, invitation: InvitationData }` | Invitation Studio Sync |
| 35 | Invitations | `PUT` | `/invitations/:id` | Bearer | Customer | `{ title, message, venueName, template, ... }` | `{ success, invitation: InvitationData }` | Invitation Studio Update |
| 36 | Invitations | `GET` | `/public/invitations/:publicToken` | **None** | Public | None | `{ success, invitation: { publicToken, title, template, ... } }` | Public Guest Page |
| 37 | Invitations | `POST` | `/public/invitations/:publicToken/rsvp` | **None** | Public | `{ name, attending, guestCount, notes }` | `{ success: true, message }` | Guest RSVP Form Submit |
| 38 | Admin | `GET` | `/admin/dashboard/stats` | Bearer | Admin | None | `{ totalCustomers, totalProviders, pendingProviders, ... }` | Admin Dashboard |
| 39 | Admin | `GET` | `/admin/users` | Bearer | Admin | None | `{ customers: AdminCustomerUser[] }` | Admin Users Directory |
| 40 | Admin | `GET` | `/admin/providers/pending` | Bearer | Admin | None | `{ providers: ProviderAccount[] }` | Admin Moderation List |
| 41 | Admin | `PATCH`| `/admin/providers/:id/status` | Bearer | Admin | `{ status: "APPROVED" \| "REJECTED" \| "SUSPENDED" }` | `{ success: true }` | Admin Provider Actions |

---

## 27. Database Relationship & Entity Expectations

```
┌─────────────────────────┐
│          Users          │
│  (id, email, role, ...) │
└────────────┬────────────┘
             │ 1:1
     ┌───────┴────────┐
     │                │
┌────▼───────┐   ┌────▼────────┐
│ Customers  │   │  Providers  │
└────┬───────┘   └────┬────────┘
     │ 1:N            │ 1:N
┌────▼───────┐   ┌────▼────────┐
│   Events   │   │  Services / │
│            │   │  Packages   │
└────┬───────┘   └────┬────────┘
     │ 1:N            │
     ├────────────────┴────────┐
     │ 1:N                     │
┌────▼───────┐           ┌─────▼────────┐
│  Bookings  │           │ Availability │
└────────────┘           └──────────────┘
     │ 1:1
┌────▼─────────────┐
│   Invitations    │
│  (publicToken,   │
│   template)      │
└────┬─────────────┘
     │ 1:N
┌────▼─────────────┐
│  RSVP Responses  │
└──────────────────┘
```

---

## 28. Frontend-to-Backend End-to-End Data Flow Diagrams

### Flow 1: Customer Event Creation & Multi-Service Checkout
```
Customer completes Onboarding Wizard
           ↓
POST /events ──> Returns eventId
           ↓
Customer browses Services / Uses AI Assistant
           ↓
POST /events/:eventId/services ──> Adds items to event cart
           ↓
Customer clicks "Request All Bookings"
           ↓
POST /events/:eventId/bookings ──> Creates individual Booking records (status: "PENDING")
           ↓
Providers view requests in /provider/bookings & click "Accept"
           ↓
PATCH /bookings/:id/status ("ACCEPTED") ──> Unlocks customer & provider contact details
```

### Flow 2: QR Wedding Invitation & Guest RSVP
```
Customer customizes Theme in Invitation Studio (e.g. "Burgundy Imperial")
           ↓
POST /invitations { template: "velvet-burgundy", title: "...", venueName: "..." }
           ↓
Backend generates record with publicToken: "a1f219045d..." & template: "velvet-burgundy"
           ↓
Frontend renders QR containing "https://<app-origin>/invitation/a1f219045d..."
           ↓
Guest scans QR on smartphone (no login required)
           ↓
Browser opens /invitation/a1f219045d...
           ↓
GET /api/public/invitations/a1f219045d... ──> Returns invitation + template
           ↓
Public page renders Luxury Velvet Burgundy Card + RSVP Form
           ↓
Guest submits RSVP ──> POST /api/public/invitations/a1f219045d.../rsvp
           ↓
Backend stores RSVP response linked to invitation record
```

---

## 29. Known Frontend Assumptions & Integration Risks

1. **Invitation Template Field:** The backend **must** use the key `template` in both the invitation database table and the public API response (`GET /api/public/invitations/:publicToken`).
2. **Provider Categories:** Providers **must** use the 7 exact canonical category strings. Custom categories should not override core category filters.
3. **Contact Information Gating:** Contact phone/email should be sanitized on `PENDING` bookings and revealed once `ACCEPTED` or `COMPLETED`.
4. **Public Origin Resolution:** The frontend uses `VITE_APP_URL` or active `window.location.origin` for QR codes to ensure scanned QR passes always point to the public domain rather than internal dev servers.

---

## 30. Current Test Suite & Build Verification

### 30.1 Test Execution Matrix
- `src/test_all_themes.cjs`: Verified all 4 themes (`royal-gold`, `velvet-burgundy`, `botanical-glass`, `minimal-noir`) across real API persistence and browser incognito rendering.
- `src/test_theme_full_flow.cjs`: Verified full customer login, event blueprint creation, invitation publishing, and public QR rendering.
- `src/test_availability_sync.cjs`: Verified schedule synchronization between provider calendar and customer booking date pickers.
- `src/test_bookings_rehydration.cjs`: Verified booking persistence across hard refreshes and role switches.

### 30.2 Build Verification
- **Command:** `npm run build` (`tsc -b && vite build`)
- **Status:** **0 TypeScript Errors, 0 Vite Warnings/Errors (Exit Code 0)**.

---

## 31. Final Executive Summary

The Eva-Ai frontend is a **production-ready, responsive, luxury event management platform** built with React 19 and TypeScript. It includes:
1. Complete customer onboarding and Event Blueprint management.
2. AI-driven event planning with structured provider recommendation cards.
3. Catalog discovery with dynamic filtering across 7 canonical provider categories.
4. Provider atelier portal with portfolio uploads, schedule calendar locking, and booking request handling.
5. Admin moderation center for user directory and provider approval workflows.
6. A digital QR Wedding & Event Invitation Suite featuring 4 dynamic themes (`royal-gold`, `velvet-burgundy`, `botanical-glass`, `minimal-noir`) and public guest RSVP submission.

**Backend Implementation Rule of Thumb:** Implement and satisfy the 41 REST endpoints specified in the [Master API Contract Table](#26-master-api-contract-table) with the expected JSON payload envelopes, and the entire frontend ecosystem will function seamlessly.

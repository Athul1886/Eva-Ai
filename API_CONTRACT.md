# Eva-Ai: Unified REST API Contract (Phase 6 Final Integration)

> **Single Source of Truth for Frontend Integration**  
> **Base URL (Local)**: `http://localhost:5000/api`  
> **Base URL (LAN / Wi-Fi)**: `http://<MY-LAN-IP>:5000/api` (e.g. `http://192.168.1.2:5000/api`)  
> **Health Check Endpoints**: `GET /health` and `GET /api/health`

---

## Table of Contents
1. [Core Business & Architecture Rules](#1-core-business--architecture-rules)
2. [Authentication Headers & Response Standards](#2-authentication-headers--response-standards)
3. [Customer Authentication](#3-customer-authentication)
4. [Provider Authentication & Profile](#4-provider-authentication--profile)
5. [Public Provider Catalog & Discovery](#5-public-provider-catalog--discovery)
6. [Customer Event Management](#6-customer-event-management)
7. [Event Shortlist & Cart](#7-event-shortlist--cart)
8. [Consolidated Event Plan & Authoritative Budget](#8-consolidated-event-plan--authoritative-budget)
9. [Booking System & State Machine](#9-booking-system--state-machine)
10. [Provider Availability & Blackout Sync](#10-provider-availability--blackout-sync)
11. [Provider Services & Packages Management](#11-provider-services--packages-management)
12. [Provider Portfolio Management](#12-provider-portfolio-management)

---

## 1. Core Business & Architecture Rules

1. **PostgreSQL as Single Source of Truth**:
   - The backend Supabase PostgreSQL database is the only authoritative source of truth for user profiles, events, shortlists, bookings, availability, and financial metrics.
   - Frontend `localStorage` is used solely as a temporary cache or optimistic UI fallback; all views must rehydrate from backend API responses.
2. **Provider Approval Lifecycle**:
   - Newly registered providers are created with `approval_status = 'pending'`.
   - Pending providers are **strictly hidden** from the public catalog (`GET /api/providers` and `GET /api/providers/:id`). Only `approval_status = 'approved'` providers appear publicly.
   - No Admin dashboard is exposed in Phase 6; for development/testing, test providers are set to `approved` directly in Supabase.
3. **Contact Protection & Security**:
   - In public provider discovery and provider profile details, personal contact details (phone, email) are suppressed (`null`).
   - In booking transactions, customer contact details (`customerPhone`, `customerEmail`) and provider contact details (`providerContact.phone`, `providerContact.email`) remain locked (`null`, `isContactUnlocked: false`) while the booking status is `PENDING`, `REJECTED`, or `CANCELLED`.
   - Contact details are unlocked (`isContactUnlocked: true`) **strictly** when the booking is `ACCEPTED` or `COMPLETED`.
4. **Booking Lifecycle State Machine**:
   - Dispatched bookings start in the `PENDING` state with unique reference IDs (e.g. `EVA-BOOK-A7C92F`).
   - Allowed transitions:
     - `PENDING` &rarr; `ACCEPTED`, `REJECTED`, `CANCELLED`
     - `ACCEPTED` &rarr; `COMPLETED`, `CANCELLED`
     - `REJECTED`, `CANCELLED`, `COMPLETED` are terminal states.
5. **Authoritative Event Plan Budget**:
   - The Event Plan (`GET /api/events/:id/plan`) computes financial metrics on the backend:
     - `totalBudget`: Customer's declared event budget.
     - `estimatedCost`: Sum of unit prices of all shortlisted items.
     - `committedCost`: Sum of amounts from `ACCEPTED` and `COMPLETED` bookings.
     - `pendingCost`: Sum of amounts from `PENDING` booking requests.
     - `remainingBudget`: `totalBudget - estimatedCost`.
     - `isOverBudget`: Boolean indicating whether estimated costs exceed total budget.

---

## 2. Authentication Headers & Response Standards

### Request Headers
Protected endpoints require an `Authorization` header containing the Supabase JWT access token:
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Standard Success Response Format
```json
{
  "success": true,
  "data": { ... }
}
```

### Standard Error Response Format
```json
{
  "success": false,
  "error": "BadRequest | Unauthorized | Forbidden | NotFound | Conflict | InternalServerError",
  "message": "Human readable error description",
  "missingFields": []
}
```

---

## 3. Customer Authentication

### 3.1 Register Customer
Create a new customer account.

- **HTTP Method**: `POST`
- **Path**: `/api/auth/register` (or `/api/auth/register/customer`)
- **Authentication**: None (Public)
- **Required Role**: None
- **Headers**: `Content-Type: application/json`
- **Request JSON**:
  ```json
  {
    "fullName": "Priya Nair",
    "email": "priya.nair@example.com",
    "password": "Password123!",
    "phone": "+91 98471 23456",
    "location": "Kochi",
    "role": "customer"
  }
  ```
- **Success Response** (`201 Created`):
  ```json
  {
    "success": true,
    "message": "Customer registered successfully",
    "token": "eyJhbGciOi...",
    "session": {
      "access_token": "eyJhbGciOi...",
      "refresh_token": "f1d8c...",
      "expires_at": 1790400000,
      "expires_in": 3600,
      "token_type": "bearer"
    },
    "user": {
      "id": "e2f18375-4c07-4e6a-bf0f-7f7f329fa9c1",
      "email": "priya.nair@example.com",
      "fullName": "Priya Nair",
      "phone": "+91 98471 23456",
      "role": "customer",
      "location": "Kochi",
      "isActive": true,
      "createdAt": "2026-09-25T15:00:00.000Z"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Missing `fullName`, `email`, or `password` (min 6 chars).
  - `409 Conflict`: Email is already registered.

---

### 3.2 Login (Customer or Provider)
Authenticate an existing user with email and password.

- **HTTP Method**: `POST`
- **Path**: `/api/auth/login`
- **Authentication**: None (Public)
- **Required Role**: None
- **Headers**: `Content-Type: application/json`
- **Request JSON**:
  ```json
  {
    "email": "priya.nair@example.com",
    "password": "Password123!"
  }
  ```
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Login successful",
    "token": "eyJhbGciOi...",
    "session": {
      "access_token": "eyJhbGciOi...",
      "refresh_token": "f1d8c...",
      "expires_at": 1790400000,
      "expires_in": 3600,
      "token_type": "bearer"
    },
    "user": {
      "id": "e2f18375-4c07-4e6a-bf0f-7f7f329fa9c1",
      "email": "priya.nair@example.com",
      "fullName": "Priya Nair",
      "phone": "+91 98471 23456",
      "role": "customer",
      "location": "Kochi",
      "avatarUrl": null,
      "isActive": true,
      "createdAt": "2026-09-25T15:00:00.000Z",
      "providerProfile": null
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Missing `email` or `password`.
  - `401 Unauthorized`: Invalid credentials.
  - `403 Forbidden`: Account is deactivated.

---

### 3.3 Get Current User Profile
Fetch profile for the currently authenticated user.

- **HTTP Method**: `GET`
- **Path**: `/api/auth/me` (or `/api/auth/profile`, `/api/users/me`)
- **Authentication**: Bearer Token
- **Required Role**: Any authenticated user
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**: None
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "user": {
      "id": "e2f18375-4c07-4e6a-bf0f-7f7f329fa9c1",
      "email": "priya.nair@example.com",
      "fullName": "Priya Nair",
      "phone": "+91 98471 23456",
      "role": "customer",
      "avatarUrl": null,
      "location": "Kochi",
      "isActive": true,
      "createdAt": "2026-09-25T15:00:00.000Z",
      "providerProfile": null
    }
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: Missing, invalid, or expired Bearer token.
  - `404 Not Found`: User profile record not found.

---

### 3.4 Update User Profile
Update personal information for the authenticated user.

- **HTTP Method**: `PUT`
- **Path**: `/api/auth/me` (or `/api/auth/profile`, `/api/users/me`)
- **Authentication**: Bearer Token
- **Required Role**: Any authenticated user
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request JSON**:
  ```json
  {
    "fullName": "Priya M. Nair",
    "phone": "+91 98471 99999",
    "location": "Ernakulam, Kochi",
    "avatarUrl": "https://example.com/avatar.jpg"
  }
  ```
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Profile updated successfully",
    "user": {
      "id": "e2f18375-4c07-4e6a-bf0f-7f7f329fa9c1",
      "email": "priya.nair@example.com",
      "fullName": "Priya M. Nair",
      "phone": "+91 98471 99999",
      "role": "customer",
      "avatarUrl": "https://example.com/avatar.jpg",
      "location": "Ernakulam, Kochi",
      "isActive": true
    }
  }
  ```

---

### 3.5 Refresh Session Token
Exchange a valid refresh token for a fresh access token.

- **HTTP Method**: `POST`
- **Path**: `/api/auth/refresh`
- **Authentication**: None (Public)
- **Headers**: `Content-Type: application/json`
- **Request JSON**:
  ```json
  {
    "refreshToken": "f1d8c..."
  }
  ```
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Session refreshed successfully",
    "token": "eyJhbGciOi...",
    "session": {
      "access_token": "eyJhbGciOi...",
      "refresh_token": "a93be...",
      "expires_at": 1790403600,
      "expires_in": 3600,
      "token_type": "bearer"
    },
    "user": { ... }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Missing `refreshToken`.
  - `401 Unauthorized`: Invalid or expired refresh token.

---

### 3.6 Logout
Invalidates the current session.

- **HTTP Method**: `POST`
- **Path**: `/api/auth/logout`
- **Authentication**: Bearer Token (Optional)
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

---

## 4. Provider Authentication & Profile

### 4.1 Register Provider
Registers a service provider account and creates a linked `provider_profiles` record.

- **HTTP Method**: `POST`
- **Path**: `/api/auth/register` (or `/api/auth/register/provider`)
- **Authentication**: None (Public)
- **Required Role**: None
- **Headers**: `Content-Type: application/json`
- **Request JSON**:
  ```json
  {
    "role": "provider",
    "name": "Rahul Verma",
    "businessName": "Verma Heritage Cinecraft",
    "email": "verma.cinecraft@example.com",
    "password": "Password123!",
    "phone": "+91 94470 11223",
    "location": "Kochi",
    "category": "photographer",
    "address": "MG Road, Kochi",
    "bio": "Luxury wedding photography and 4K aerial cinematography",
    "experienceYears": 8,
    "startingPrice": 60000
  }
  ```
- **Success Response** (`201 Created`):
  ```json
  {
    "success": true,
    "message": "Provider registered successfully",
    "token": "eyJhbGciOi...",
    "session": { ... },
    "user": {
      "id": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
      "email": "verma.cinecraft@example.com",
      "fullName": "Rahul Verma",
      "phone": "+91 94470 11223",
      "role": "provider",
      "location": "Kochi",
      "isActive": true,
      "createdAt": "2026-09-25T15:00:00.000Z",
      "providerProfile": {
        "id": "8f3e2b1a-9c4d-4e5f-8a7b-6c5d4e3f2a1b",
        "businessName": "Verma Heritage Cinecraft",
        "city": "Kochi",
        "address": "MG Road, Kochi",
        "approvalStatus": "pending",
        "experienceYears": 8,
        "startingPrice": 60000,
        "rating": 5.0,
        "reviewsCount": 0,
        "category": {
          "id": "c56a4180-65aa-42ec-a945-5fd21dec0538",
          "name": "Photography",
          "slug": "photographer"
        }
      }
    }
  }
  ```
- **Key Business Rule**: Newly registered providers have `approvalStatus: "pending"`. They cannot be discovered publicly until an administrator updates `approval_status = 'approved'` in PostgreSQL.

---

### 4.2 Get Authenticated Provider Profile
- **HTTP Method**: `GET`
- **Path**: `/api/providers/profile` (or `/api/providers/me`)
- **Authentication**: Bearer Token
- **Required Role**: `provider`
- **Headers**: `Authorization: Bearer <token>`
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "profile": {
      "id": "8f3e2b1a-9c4d-4e5f-8a7b-6c5d4e3f2a1b",
      "userId": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
      "businessName": "Verma Heritage Cinecraft",
      "bio": "Luxury wedding photography and 4K aerial cinematography",
      "city": "Kochi",
      "address": "MG Road, Kochi",
      "experienceYears": 8,
      "startingPrice": 60000,
      "rating": 5.0,
      "reviewsCount": 12,
      "approvalStatus": "approved",
      "category": {
        "id": "c56a4180-65aa-42ec-a945-5fd21dec0538",
        "name": "Photography",
        "slug": "photographer"
      }
    }
  }
  ```

---

### 4.3 Update Authenticated Provider Profile
- **HTTP Method**: `PUT`
- **Path**: `/api/providers/profile` (or `/api/providers/me`)
- **Authentication**: Bearer Token
- **Required Role**: `provider`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request JSON**:
  ```json
  {
    "businessName": "Verma Heritage Cinecraft & Studios",
    "bio": "Updated bio with full drone suites and album design",
    "city": "Kochi",
    "address": "Panampilly Nagar, Kochi",
    "experienceYears": 9,
    "startingPrice": 65000
  }
  ```
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Profile updated successfully",
    "profile": { ... }
  }
  ```

---

## 5. Public Provider Catalog & Discovery

### 5.1 List Provider Categories
Returns all supported event service categories with display metadata.

- **HTTP Method**: `GET`
- **Path**: `/api/providers/categories`
- **Authentication**: None (Public)
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "categories": [
      {
        "id": "c56a4180-65aa-42ec-a945-5fd21dec0538",
        "name": "Photography",
        "slug": "photographer",
        "icon": "photo_camera",
        "description": "Cinematography, candid captures, drone suites & luxury albums",
        "filterKey": "Photography"
      },
      {
        "id": "d1234567-89ab-cdef-0123-456789abcdef",
        "name": "Catering",
        "slug": "caterer",
        "icon": "restaurant",
        "description": "Grand traditional sadyas, multi-cuisine banquets & live stations",
        "filterKey": "Catering"
      }
    ]
  }
  ```

---

### 5.2 Browse Public Providers
Searches and filters active, approved service providers.

- **HTTP Method**: `GET`
- **Path**: `/api/providers`
- **Authentication**: None (Public)
- **Query Parameters**:
  - `category` (optional, string): Category slug (e.g. `photographer`, `caterer`) or category UUID
  - `city` (optional, string): Location filter (e.g. `Kochi`, `Trivandrum`)
  - `minPrice` (optional, number): Minimum starting price
  - `maxPrice` (optional, number): Maximum starting price
  - `search` (optional, string): Search query matching business name or bio
  - `sortBy` (optional, string): `rating` | `price_asc` | `price_desc` | `reviews`
  - `page` (optional, number, default: 1)
  - `limit` (optional, number, default: 10, max: 50)
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1,
    "providers": [
      {
        "id": "8f3e2b1a-9c4d-4e5f-8a7b-6c5d4e3f2a1b",
        "name": "Verma Heritage Cinecraft",
        "businessName": "Verma Heritage Cinecraft",
        "category": "Photography",
        "categorySlug": "photographer",
        "location": "Kochi",
        "city": "Kochi",
        "rating": 5.0,
        "reviewCount": 12,
        "reviewsCount": 12,
        "startingPrice": 60000,
        "priceRange": "₹60,000+",
        "yearsExperience": 8,
        "experienceYears": 8,
        "description": "Luxury wedding photography and 4K aerial cinematography",
        "services": ["Standard Photography Package", "Drone Cinematography"],
        "images": ["https://images.unsplash.com/..."],
        "available": true,
        "featured": true,
        "approvalStatus": "approved",
        "packages": [
          {
            "id": "pkg-1",
            "name": "Standard Service Package",
            "price": 60000,
            "description": "Core professional Photography services",
            "features": ["Consultation & Custom Planning", "Professional Execution & Staff"]
          }
        ],
        "contactDemo": {
          "manager": "Rahul Verma",
          "phone": null,
          "email": null,
          "address": "MG Road, Kochi, Kerala",
          "hours": "Mon - Sun: 9:00 AM - 8:00 PM"
        }
      }
    ]
  }
  ```
- **Security Rule**: `contactDemo.phone` and `contactDemo.email` are strictly `null`. Only APPROVED providers are returned.

---

### 5.3 Get Public Provider Details
Fetch comprehensive details for an individual approved provider.

- **HTTP Method**: `GET`
- **Path**: `/api/providers/:id`
- **Authentication**: Optional Bearer Token (Owners and Admins can view even if pending)
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "provider": {
      "id": "8f3e2b1a-9c4d-4e5f-8a7b-6c5d4e3f2a1b",
      "name": "Verma Heritage Cinecraft",
      "businessName": "Verma Heritage Cinecraft",
      "category": "Photography",
      "categorySlug": "photographer",
      "location": "Kochi",
      "city": "Kochi",
      "address": "MG Road, Kochi, Kerala",
      "rating": 5.0,
      "reviewCount": 12,
      "startingPrice": 60000,
      "packages": [ ... ],
      "portfolios": [ ... ],
      "unavailableDates": ["2027-11-20", "2027-12-25"],
      "contactDemo": {
        "manager": "Rahul Verma",
        "phone": null,
        "email": null,
        "address": "MG Road, Kochi, Kerala",
        "hours": "Mon - Sun: 9:00 AM - 8:00 PM"
      }
    }
  }
  ```
- **Error Responses**:
  - `404 Not Found`: Provider does not exist or is not approved.

---

### 5.4 Get Public Provider Unavailable Dates
Returns a fast array of blackout dates for whole-day calendar checking.

- **HTTP Method**: `GET`
- **Path**: `/api/providers/:id/unavailable-dates`
- **Authentication**: None (Public)
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "providerId": "8f3e2b1a-9c4d-4e5f-8a7b-6c5d4e3f2a1b",
    "unavailableDates": [
      "2027-11-20",
      "2027-12-25"
    ]
  }
  ```

---

## 6. Customer Event Management

### 6.1 Create Event
Creates an event record with budget and metadata.

- **HTTP Method**: `POST`
- **Path**: `/api/events`
- **Authentication**: Bearer Token
- **Required Role**: `customer`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request JSON**:
  ```json
  {
    "title": "Arjun & Sneha Luxury Wedding",
    "eventType": "wedding",
    "eventDate": "2027-12-15",
    "city": "Kochi",
    "budget": 600000,
    "estimatedGuests": 350,
    "preferences": {
      "theme": "Heritage Kerala Traditional",
      "services": ["photographer", "caterer", "decorator"]
    },
    "additionalNotes": "Requires prompt early morning setup"
  }
  ```
- **Success Response** (`201 Created`):
  ```json
  {
    "success": true,
    "message": "Event created successfully",
    "event": {
      "id": "5b4fa396-8b71-4d3d-a56e-2adf676d1dc9",
      "customerId": "e2f18375-4c07-4e6a-bf0f-7f7f329fa9c1",
      "title": "Arjun & Sneha Luxury Wedding",
      "eventType": "wedding",
      "eventDate": "2027-12-15",
      "location": "Kochi",
      "city": "Kochi",
      "guestCount": 350,
      "budget": 600000,
      "status": "draft",
      "preferences": { ... },
      "services": [],
      "servicesCount": 0,
      "createdAt": "2026-09-25T15:30:00.000Z"
    }
  }
  ```

---

### 6.2 Get Customer Events
List all events owned by the authenticated customer.

- **HTTP Method**: `GET`
- **Path**: `/api/events` (or `/api/events/my`)
- **Authentication**: Bearer Token
- **Required Role**: `customer`
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "count": 1,
    "events": [
      {
        "id": "5b4fa396-8b71-4d3d-a56e-2adf676d1dc9",
        "title": "Arjun & Sneha Luxury Wedding",
        "eventType": "wedding",
        "eventDate": "2027-12-15",
        "city": "Kochi",
        "budget": 600000,
        "servicesCount": 2,
        "status": "draft"
      }
    ]
  }
  ```

---

### 6.3 Get Event by ID
Retrieves event details and shortlisted services (ownership verified).

- **HTTP Method**: `GET`
- **Path**: `/api/events/:id`
- **Authentication**: Bearer Token
- **Required Role**: Owner or Admin
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "event": {
      "id": "5b4fa396-8b71-4d3d-a56e-2adf676d1dc9",
      "customerId": "e2f18375-4c07-4e6a-bf0f-7f7f329fa9c1",
      "title": "Arjun & Sneha Luxury Wedding",
      "eventDate": "2027-12-15",
      "budget": 600000,
      "services": [ ... ]
    }
  }
  ```

---

### 6.4 Update Event
- **HTTP Method**: `PUT`
- **Path**: `/api/events/:id`
- **Authentication**: Bearer Token
- **Required Role**: `customer` (owner)
- **Request JSON**:
  ```json
  {
    "budget": 650000,
    "estimatedGuests": 400
  }
  ```
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Event updated successfully",
    "event": { ... }
  }
  ```

---

### 6.5 Delete Event
- **HTTP Method**: `DELETE`
- **Path**: `/api/events/:id`
- **Authentication**: Bearer Token
- **Required Role**: `customer` (owner)
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Event deleted successfully"
  }
  ```

---

## 7. Event Shortlist & Cart

### 7.1 Add Service/Provider to Event Shortlist
Add a service package or provider starting package to an event cart.

- **HTTP Method**: `POST`
- **Path**: `/api/events/:id/services`
- **Authentication**: Bearer Token
- **Required Role**: `customer` (owner)
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request JSON**:
  ```json
  {
    "providerId": "8f3e2b1a-9c4d-4e5f-8a7b-6c5d4e3f2a1b",
    "serviceId": "a05101d8-f534-4a8b-9452-a0855a00af80",
    "quantity": 1,
    "bookingDate": "2027-12-15",
    "notes": "Include drone coverage for evening reception"
  }
  ```
  *(Note: Either `serviceId` or `providerId` is required. If only `providerId` is passed, the backend automatically resolves or provisions a standard service package).*
- **Success Response** (`201 Created`):
  ```json
  {
    "success": true,
    "message": "Service added to event successfully",
    "service": {
      "id": "268de8d0-c102-4843-b90f-a761506185f0",
      "eventId": "5b4fa396-8b71-4d3d-a56e-2adf676d1dc9",
      "serviceId": "a05101d8-f534-4a8b-9452-a0855a00af80",
      "providerId": "8f3e2b1a-9c4d-4e5f-8a7b-6c5d4e3f2a1b",
      "providerName": "Verma Heritage Cinecraft",
      "category": "Photography",
      "package": "Standard Service Package",
      "price": 60000,
      "quantity": 1,
      "bookingDate": "2027-12-15",
      "notes": "Include drone coverage for evening reception",
      "createdAt": "2026-09-25T15:35:00.000Z"
    }
  }
  ```

---

### 7.2 Remove Service from Event Shortlist
Removes an item from the event shortlist. The path parameter can be the `cartItemId`, `serviceId`, or `providerId`.

- **HTTP Method**: `DELETE`
- **Path**: `/api/events/:id/services/:serviceId` (or `.../services/:providerId`)
- **Authentication**: Bearer Token
- **Required Role**: `customer` (owner)
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Service removed from event successfully"
  }
  ```

---

### 7.3 Update Shortlisted Service Item
- **HTTP Method**: `PUT`
- **Path**: `/api/events/:id/services/:cartItemId`
- **Authentication**: Bearer Token
- **Required Role**: `customer` (owner)
- **Request JSON**:
  ```json
  {
    "quantity": 2,
    "notes": "Updated instructions"
  }
  ```
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Event service updated successfully",
    "service": { ... }
  }
  ```

---

## 8. Consolidated Event Plan & Authoritative Budget

### 8.1 Get Consolidated Event Plan
Returns the complete event plan for `/customer/event-plan`, containing event summary, shortlisted services with live booking status and availability, and authoritative budget metrics calculated by PostgreSQL.

- **HTTP Method**: `GET`
- **Path**: `/api/events/:id/plan`
- **Authentication**: Bearer Token
- **Required Role**: `customer` (owner) or Admin
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**: None
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "event": {
      "id": "5b4fa396-8b71-4d3d-a56e-2adf676d1dc9",
      "customerId": "e2f18375-4c07-4e6a-bf0f-7f7f329fa9c1",
      "title": "Arjun & Sneha Luxury Wedding",
      "eventType": "wedding",
      "eventDate": "2027-12-15",
      "location": "Kochi",
      "city": "Kochi",
      "guestCount": 350,
      "budget": 600000,
      "status": "draft"
    },
    "selectedServices": [
      {
        "id": "268de8d0-c102-4843-b90f-a761506185f0",
        "cartItemId": "268de8d0-c102-4843-b90f-a761506185f0",
        "eventId": "5b4fa396-8b71-4d3d-a56e-2adf676d1dc9",
        "providerId": "8f3e2b1a-9c4d-4e5f-8a7b-6c5d4e3f2a1b",
        "providerName": "Verma Heritage Cinecraft",
        "category": "Photography",
        "location": "Kochi",
        "startingPrice": 60000,
        "price": 60000,
        "quantity": 1,
        "serviceId": "a05101d8-f534-4a8b-9452-a0855a00af80",
        "serviceTitle": "Standard Photography Package",
        "notes": "Evening coverage",
        "hasActiveBooking": true,
        "activeBookingStatus": "ACCEPTED",
        "bookingStatus": "ACCEPTED",
        "bookingReference": "EVA-BOOK-1219B7",
        "bookingId": "ecc8d9b6-9bbd-4014-8c35-4449052f55df",
        "isAvailable": true,
        "unavailableReason": null,
        "selectedAt": "2026-09-25T15:35:00.000Z"
      }
    ],
    "selectedCount": 1,
    "unavailableCount": 0,
    "budgetOverview": {
      "totalBudget": 600000,
      "hasValidBudget": true,
      "estimatedCost": 60000,
      "committedCost": 60000,
      "pendingCost": 0,
      "remainingBudget": 540000,
      "budgetUsagePercentage": 10,
      "isOverBudget": false,
      "currency": "INR"
    },
    "bookingsCount": 1,
    "activeBookingsCount": 1
  }
  ```

---

## 9. Booking System & State Machine

### 9.1 Multi-Provider Booking Dispatch (from Event Plan)
Dispatches individual booking requests for all eligible shortlisted providers in the event plan.

- **HTTP Method**: `POST`
- **Path**: `/api/events/:id/bookings`
- **Authentication**: Bearer Token
- **Required Role**: `customer` (owner)
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request JSON** (optional body):
  ```json
  {
    "providerIds": ["8f3e2b1a-9c4d-4e5f-8a7b-6c5d4e3f2a1b"]
  }
  ```
  *(If `providerIds` is omitted, the endpoint automatically dispatches for all shortlisted providers in the cart).*
- **Success Response** (`201 Created` or `200 OK` if already requested):
  ```json
  {
    "success": true,
    "message": "Dispatched 1 booking request(s)",
    "count": 1,
    "newlyCreatedBookings": [
      {
        "id": "ecc8d9b6-9bbd-4014-8c35-4449052f55df",
        "bookingReference": "EVA-BOOK-1219B7",
        "providerId": "8f3e2b1a-9c4d-4e5f-8a7b-6c5d4e3f2a1b",
        "serviceId": "a05101d8-f534-4a8b-9452-a0855a00af80",
        "eventId": "5b4fa396-8b71-4d3d-a56e-2adf676d1dc9",
        "status": "PENDING",
        "totalAmount": 60000,
        "bookingDate": "2027-12-15"
      }
    ],
    "alreadyRequestedProviders": [],
    "unavailableProviders": []
  }
  ```
- **Duplicate Prevention**: If a booking request already exists for a provider in this event, the backend safely skips duplicate creation and returns their IDs in `alreadyRequestedProviders`.

---

### 9.2 Create Single Direct Booking
- **HTTP Method**: `POST`
- **Path**: `/api/bookings`
- **Authentication**: Bearer Token
- **Required Role**: `customer`
- **Request JSON**:
  ```json
  {
    "eventId": "5b4fa396-8b71-4d3d-a56e-2adf676d1dc9",
    "providerId": "8f3e2b1a-9c4d-4e5f-8a7b-6c5d4e3f2a1b",
    "serviceId": "a05101d8-f534-4a8b-9452-a0855a00af80",
    "bookingDate": "2027-12-15",
    "totalAmount": 60000,
    "specialInstructions": "Direct booking request"
  }
  ```
- **Success Response** (`201 Created`): Returns formatted Customer Booking DTO.

---

### 9.3 Get Customer Bookings (My Bookings)
Fetches all booking requests initiated by the authenticated customer.

- **HTTP Method**: `GET`
- **Path**: `/api/bookings/my` (or `/api/bookings`)
- **Authentication**: Bearer Token
- **Required Role**: `customer`
- **Headers**: `Authorization: Bearer <token>`
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "count": 1,
    "bookings": [
      {
        "id": "ecc8d9b6-9bbd-4014-8c35-4449052f55df",
        "bookingId": "EVA-BOOK-1219B7",
        "bookingReference": "EVA-BOOK-1219B7",
        "providerId": "8f3e2b1a-9c4d-4e5f-8a7b-6c5d4e3f2a1b",
        "providerName": "Verma Heritage Cinecraft",
        "category": "Photography",
        "serviceId": "a05101d8-f534-4a8b-9452-a0855a00af80",
        "serviceTitle": "Standard Photography Package",
        "eventId": "5b4fa396-8b71-4d3d-a56e-2adf676d1dc9",
        "eventType": "wedding",
        "eventDate": "2027-12-15",
        "location": "Kochi",
        "amount": 60000,
        "status": "ACCEPTED",
        "paymentStatus": "unpaid",
        "notes": "Evening coverage",
        "isContactUnlocked": true,
        "providerContact": {
          "name": "Rahul Verma",
          "manager": "Rahul Verma",
          "phone": "+91 94470 11223",
          "email": "verma.cinecraft@example.com",
          "address": "MG Road, Kochi"
        },
        "createdAt": "2026-09-25T15:40:00.000Z"
      }
    ]
  }
  ```
- **Contact Protection Rule**:
  - When `status` is `PENDING`, `REJECTED`, or `CANCELLED`: `isContactUnlocked: false`, and `providerContact: null`.
  - When `status` is `ACCEPTED` or `COMPLETED`: `isContactUnlocked: true`, and `providerContact` contains real phone and email.

---

### 9.4 Get Provider Bookings (Incoming Requests)
Fetches incoming booking requests for the authenticated provider.

- **HTTP Method**: `GET`
- **Path**: `/api/bookings/provider`
- **Authentication**: Bearer Token
- **Required Role**: `provider`
- **Headers**: `Authorization: Bearer <token>`
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "count": 1,
    "bookings": [
      {
        "id": "ecc8d9b6-9bbd-4014-8c35-4449052f55df",
        "bookingId": "EVA-BOOK-1219B7",
        "bookingReference": "EVA-BOOK-1219B7",
        "providerId": "8f3e2b1a-9c4d-4e5f-8a7b-6c5d4e3f2a1b",
        "serviceId": "a05101d8-f534-4a8b-9452-a0855a00af80",
        "serviceTitle": "Standard Photography Package",
        "eventId": "5b4fa396-8b71-4d3d-a56e-2adf676d1dc9",
        "eventType": "wedding",
        "eventDate": "2027-12-15",
        "location": "Kochi",
        "guestCount": 350,
        "amount": 60000,
        "status": "ACCEPTED",
        "paymentStatus": "unpaid",
        "notes": "Evening coverage",
        "customerId": "e2f18375-4c07-4e6a-bf0f-7f7f329fa9c1",
        "customerName": "Priya Nair",
        "isContactUnlocked": true,
        "customerPhone": "+91 98471 23456",
        "customerEmail": "priya.nair@example.com",
        "customerContact": {
          "name": "Priya Nair",
          "phone": "+91 98471 23456",
          "email": "priya.nair@example.com"
        },
        "createdAt": "2026-09-25T15:40:00.000Z"
      }
    ]
  }
  ```
- **Contact Protection Rule**:
  - When `status` is `PENDING`: `customerContact`, `customerPhone`, and `customerEmail` are `null`.
  - When `status` is `ACCEPTED` or `COMPLETED`: customer contact details are unlocked for fulfillment.

---

### 9.5 Update Booking Status (State Machine)
Transition a booking to a new state.

- **HTTP Method**: `PATCH` (or `PUT`)
- **Path**: `/api/bookings/:id/status`
- **Authentication**: Bearer Token
- **Required Role**:
  - Provider can perform: `ACCEPTED`, `REJECTED`, `COMPLETED`
  - Customer can perform: `CANCELLED`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request JSON**:
  ```json
  {
    "status": "ACCEPTED"
  }
  ```
  *(Accepts both uppercase frontend status: `'ACCEPTED'`, `'REJECTED'`, `'CANCELLED'`, `'COMPLETED'` or lowercase DB status).*
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Booking status updated to ACCEPTED successfully",
    "booking": {
      "id": "ecc8d9b6-9bbd-4014-8c35-4449052f55df",
      "bookingReference": "EVA-BOOK-1219B7",
      "status": "ACCEPTED",
      "isContactUnlocked": true,
      "providerContact": { ... }
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Invalid transition (e.g. attempting to accept a CANCELLED booking).
  - `403 Forbidden`: Unauthorized user attempting transition.
  - `404 Not Found`: Booking not found.

---

## 10. Provider Availability & Blackout Sync

### 10.1 Sync Unavailable Dates (Schedule Calendar)
Bulk synchronizes a provider's blackout dates from their schedule page.

- **HTTP Method**: `PUT`
- **Path**: `/api/providers/availability/sync`
- **Authentication**: Bearer Token
- **Required Role**: `provider`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request JSON**:
  ```json
  {
    "unavailableDates": [
      "2027-11-20",
      "2027-12-25",
      "2028-01-01"
    ]
  }
  ```
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Availability dates synchronized successfully",
    "count": 3,
    "unavailableDates": [
      "2027-11-20",
      "2027-12-25",
      "2028-01-01"
    ]
  }
  ```

---

### 10.2 Create Availability Slot
- **HTTP Method**: `POST`
- **Path**: `/api/providers/availability`
- **Authentication**: Bearer Token
- **Required Role**: `provider`
- **Request JSON**:
  ```json
  {
    "date": "2027-11-20",
    "isAvailable": false,
    "reason": "Booked for Private Heritage Event"
  }
  ```
- **Success Response** (`201 Created`): Returns created slot.

---

### 10.3 Get Provider Availability Slots
- **HTTP Method**: `GET`
- **Path**: `/api/providers/availability`
- **Authentication**: Bearer Token
- **Required Role**: `provider`
- **Query Parameters**: `startDate` (optional), `endDate` (optional)
- **Success Response** (`200 OK`): Returns array of slots.

---

### 10.4 Delete Availability Slot
- **HTTP Method**: `DELETE`
- **Path**: `/api/providers/availability/:id`
- **Authentication**: Bearer Token
- **Required Role**: `provider` (owner)
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Availability slot deleted successfully"
  }
  ```

---

## 11. Provider Services & Packages Management

### 11.1 Create Service Package
- **HTTP Method**: `POST`
- **Path**: `/api/services`
- **Authentication**: Bearer Token
- **Required Role**: `provider`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request JSON**:
  ```json
  {
    "title": "Grand Luxury Wedding Photography Suite",
    "description": "2 days candid photography, drone cinematography, and two luxury albums",
    "price": 120000,
    "pricingModel": "fixed",
    "durationHours": 16,
    "features": [
      "2 Traditional Photographers",
      "2 Candid Specialists",
      "4K Drone Cinematography Suite",
      "2 Premium Leather Photobooks"
    ]
  }
  ```
- **Success Response** (`201 Created`):
  ```json
  {
    "success": true,
    "message": "Service created successfully",
    "service": {
      "id": "a05101d8-f534-4a8b-9452-a0855a00af80",
      "providerId": "8f3e2b1a-9c4d-4e5f-8a7b-6c5d4e3f2a1b",
      "title": "Grand Luxury Wedding Photography Suite",
      "price": 120000,
      "pricingModel": "fixed",
      "isActive": true
    }
  }
  ```

---

### 11.2 Get My Services
- **HTTP Method**: `GET`
- **Path**: `/api/services/my`
- **Authentication**: Bearer Token
- **Required Role**: `provider`
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "count": 2,
    "services": [ ... ]
  }
  ```

---

### 11.3 Update Service
- **HTTP Method**: `PUT`
- **Path**: `/api/services/:id`
- **Authentication**: Bearer Token
- **Required Role**: `provider` (owner)
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Service updated successfully",
    "service": { ... }
  }
  ```

---

### 11.4 Delete Service
- **HTTP Method**: `DELETE`
- **Path**: `/api/services/:id`
- **Authentication**: Bearer Token
- **Required Role**: `provider` (owner)
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Service deleted successfully"
  }
  ```

---

## 12. Provider Portfolio Management

### 12.1 Add Portfolio Item
- **HTTP Method**: `POST`
- **Path**: `/api/providers/portfolio`
- **Authentication**: Bearer Token
- **Required Role**: `provider`
- **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
- **Request JSON**:
  ```json
  {
    "title": "Grand Bolgatty Palace Reception",
    "description": "Candid wedding coverage at Bolgatty Palace, Kochi",
    "imageUrl": "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
    "mediaType": "image",
    "displayOrder": 1
  }
  ```
- **Success Response** (`201 Created`):
  ```json
  {
    "success": true,
    "message": "Portfolio item added successfully",
    "portfolio": {
      "id": "7d6c5b4a-3e2f-1a0b-9c8d-7e6f5a4b3c2d",
      "providerId": "8f3e2b1a-9c4d-4e5f-8a7b-6c5d4e3f2a1b",
      "title": "Grand Bolgatty Palace Reception",
      "imageUrl": "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80",
      "displayOrder": 1
    }
  }
  ```

---

### 12.2 Get My Portfolio
- **HTTP Method**: `GET`
- **Path**: `/api/providers/portfolio`
- **Authentication**: Bearer Token
- **Required Role**: `provider`
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "portfolios": [ ... ]
  }
  ```

---

### 12.3 Update Portfolio Item
- **HTTP Method**: `PUT`
- **Path**: `/api/providers/portfolio/:id`
- **Authentication**: Bearer Token
- **Required Role**: `provider` (owner)
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Portfolio item updated successfully",
    "portfolio": { ... }
  }
  ```

---

### 12.4 Delete Portfolio Item
- **HTTP Method**: `DELETE`
- **Path**: `/api/providers/portfolio/:id`
- **Authentication**: Bearer Token
- **Required Role**: `provider` (owner)
- **Success Response** (`200 OK`):
  ```json
  {
    "success": true,
    "message": "Portfolio item deleted successfully"
  }
  ```

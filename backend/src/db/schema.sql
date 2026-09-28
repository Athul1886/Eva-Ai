-- ==============================================================================
-- Eva-Ai: Supabase PostgreSQL Initial Database Schema (Idempotent / Rerun-Safe)
-- Version: 1.0.1
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. CUSTOM ENUM TYPES (Safe against duplicate creation)
-- ==============================================================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('customer', 'provider', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE provider_approval_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE pricing_model AS ENUM ('fixed', 'per_hour', 'per_day', 'per_plate', 'per_guest');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE event_type AS ENUM ('wedding', 'reception', 'engagement', 'birthday', 'corporate', 'anniversary', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE event_status AS ENUM ('draft', 'planning', 'booked', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE requirement_status AS ENUM ('needed', 'recommended', 'shortlisted', 'booked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('unpaid', 'partially_paid', 'paid', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 3. UTILITY FUNCTIONS (Automatic updated_at timestamps)
-- ==============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 4. CORE TABLES & TRIGGERS (Idempotent: IF NOT EXISTS + DROP TRIGGER IF EXISTS)
-- ==============================================================================

-- A. USERS (Public Profiles & Roles linked with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role user_role NOT NULL DEFAULT 'customer',
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- B. CATEGORIES (Provider Categories: Photographer, Venue, Caterer, etc.)
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon_url TEXT,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- C. PROVIDER PROFILES (Service Provider Details & Admin Approval Status)
CREATE TABLE IF NOT EXISTS public.provider_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    primary_category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    business_name TEXT NOT NULL,
    bio TEXT,
    city TEXT NOT NULL,
    address TEXT,
    location_coordinates JSONB,
    experience_years INT NOT NULL DEFAULT 0 CHECK (experience_years >= 0),
    starting_price NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (starting_price >= 0),
    rating NUMERIC(3,2) NOT NULL DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
    reviews_count INT NOT NULL DEFAULT 0 CHECK (reviews_count >= 0),
    approval_status provider_approval_status NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    social_links JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_provider_profiles_updated_at ON public.provider_profiles;
CREATE TRIGGER update_provider_profiles_updated_at
    BEFORE UPDATE ON public.provider_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- D. SERVICES (Service Catalog & Pricing)
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
    pricing_model pricing_model NOT NULL DEFAULT 'fixed',
    duration_hours NUMERIC(5,2) CHECK (duration_hours IS NULL OR duration_hours > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_services_updated_at ON public.services;
CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON public.services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- E. PROVIDER PORTFOLIOS (Images & Gallery assets in Supabase Storage)
CREATE TABLE IF NOT EXISTS public.provider_portfolios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    image_url TEXT NOT NULL,
    title TEXT,
    caption TEXT,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- F. PROVIDER AVAILABILITY (Schedule & Slot Reservation)
CREATE TABLE IF NOT EXISTS public.provider_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    is_available BOOLEAN NOT NULL DEFAULT true,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_provider_availability_slot UNIQUE (provider_id, date, start_time, end_time)
);

-- G. EVENTS (Customer Events / Weddings)
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    event_type event_type NOT NULL DEFAULT 'wedding',
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    city TEXT NOT NULL,
    venue_name TEXT,
    venue_address TEXT,
    total_budget NUMERIC(14,2) NOT NULL CHECK (total_budget >= 0),
    estimated_guests INT NOT NULL CHECK (estimated_guests > 0),
    preferences JSONB NOT NULL DEFAULT '[]'::jsonb,
    additional_notes TEXT,
    status event_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS additional_notes TEXT;

DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- H. EVENT REQUIREMENTS (Rule-Based AI Recommendation Input)
CREATE TABLE IF NOT EXISTS public.event_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    allocated_budget NUMERIC(12,2) NOT NULL CHECK (allocated_budget >= 0),
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    status requirement_status NOT NULL DEFAULT 'needed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_event_category_requirement UNIQUE (event_id, category_id)
);

DROP TRIGGER IF EXISTS update_event_requirements_updated_at ON public.event_requirements;
CREATE TRIGGER update_event_requirements_updated_at
    BEFORE UPDATE ON public.event_requirements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- I. CART ITEMS (Event Service Cart)
CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_cart_service_schedule UNIQUE (event_id, service_id, booking_date)
);

-- J. BOOKINGS (Confirmed Bookings & Reservations)
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_reference TEXT NOT NULL UNIQUE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    provider_id UUID NOT NULL REFERENCES public.provider_profiles(id) ON DELETE RESTRICT,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    booking_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
    status booking_status NOT NULL DEFAULT 'pending',
    payment_status payment_status NOT NULL DEFAULT 'unpaid',
    special_instructions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- K. WEDDING INVITATIONS (PDF Generation & QR-Code Verification)
CREATE TABLE IF NOT EXISTS public.wedding_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID UNIQUE NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    bride_name TEXT NOT NULL,
    groom_name TEXT NOT NULL,
    couple_title TEXT,
    template_id TEXT NOT NULL DEFAULT 'classic-gold',
    story TEXT,
    schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
    venue_name TEXT NOT NULL,
    venue_address TEXT NOT NULL,
    venue_map_link TEXT,
    rsvp_deadline DATE,
    rsvp_contact_phone TEXT,
    pdf_url TEXT,
    qr_code_url TEXT,
    qr_code_secret TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_wedding_invitations_updated_at ON public.wedding_invitations;
CREATE TRIGGER update_wedding_invitations_updated_at
    BEFORE UPDATE ON public.wedding_invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 5. PERFORMANCE INDEXES (Safe against duplicate creation)
-- ==============================================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Categories
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);

-- Provider Profiles
CREATE INDEX IF NOT EXISTS idx_provider_profiles_status_city ON public.provider_profiles(approval_status, city);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_category ON public.provider_profiles(primary_category_id);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_rating ON public.provider_profiles(rating DESC);

-- Services
CREATE INDEX IF NOT EXISTS idx_services_provider ON public.services(provider_id);
CREATE INDEX IF NOT EXISTS idx_services_category ON public.services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_price ON public.services(price);

-- Portfolios
CREATE INDEX IF NOT EXISTS idx_portfolios_provider ON public.provider_portfolios(provider_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_featured ON public.provider_portfolios(provider_id, is_featured);

-- Availability
CREATE INDEX IF NOT EXISTS idx_availability_provider_date ON public.provider_availability(provider_id, date);

-- Events
CREATE INDEX IF NOT EXISTS idx_events_user ON public.events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);

-- Event Requirements
CREATE INDEX IF NOT EXISTS idx_requirements_event ON public.event_requirements(event_id);

-- Cart
CREATE INDEX IF NOT EXISTS idx_cart_user_event ON public.cart_items(user_id, event_id);

-- Bookings
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider ON public.bookings(provider_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON public.bookings(booking_reference);

-- Invitations
CREATE INDEX IF NOT EXISTS idx_invitations_event ON public.wedding_invitations(event_id);
CREATE INDEX IF NOT EXISTS idx_invitations_qr_secret ON public.wedding_invitations(qr_code_secret);

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES (Safe against duplicate creation)
-- ==============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_invitations ENABLE ROW LEVEL SECURITY;

-- Users: Users can read their own profile, or active public profiles
DROP POLICY IF EXISTS "Users can view own or active profiles" ON public.users;
CREATE POLICY "Users can view own or active profiles"
    ON public.users FOR SELECT
    USING (auth.uid() = id OR is_active = true);

-- Users: Users can insert their own matching profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Users: Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- Categories: Publicly readable
DROP POLICY IF EXISTS "Categories are readable by everyone" ON public.categories;
CREATE POLICY "Categories are readable by everyone"
    ON public.categories FOR SELECT USING (true);

-- Provider Profiles: Approved profiles are readable by everyone
DROP POLICY IF EXISTS "Approved providers readable by all" ON public.provider_profiles;
CREATE POLICY "Approved providers readable by all"
    ON public.provider_profiles FOR SELECT
    USING (approval_status = 'approved' OR auth.uid() = user_id);

-- Provider Profiles: Providers can update their own profile
DROP POLICY IF EXISTS "Providers can update own profile" ON public.provider_profiles;
CREATE POLICY "Providers can update own profile"
    ON public.provider_profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- Services: Active services of approved providers readable by all
DROP POLICY IF EXISTS "Active services readable by all" ON public.services;
CREATE POLICY "Active services readable by all"
    ON public.services FOR SELECT
    USING (is_active = true OR EXISTS (
        SELECT 1 FROM public.provider_profiles p WHERE p.id = services.provider_id AND p.user_id = auth.uid()
    ));

-- Events: Users can only see and manage their own events
DROP POLICY IF EXISTS "Users can manage own events" ON public.events;
CREATE POLICY "Users can manage own events"
    ON public.events FOR ALL
    USING (auth.uid() = user_id);

-- Cart: Users can manage their own cart
DROP POLICY IF EXISTS "Users can manage own cart" ON public.cart_items;
CREATE POLICY "Users can manage own cart"
    ON public.cart_items FOR ALL
    USING (auth.uid() = user_id);

-- Bookings: Customers and Providers can view their respective bookings
DROP POLICY IF EXISTS "Customers can view their bookings" ON public.bookings;
CREATE POLICY "Customers can view their bookings"
    ON public.bookings FOR SELECT
    USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Providers can view their bookings" ON public.bookings;
CREATE POLICY "Providers can view their bookings"
    ON public.bookings FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.provider_profiles p WHERE p.id = bookings.provider_id AND p.user_id = auth.uid()
    ));

-- ==============================================================================
-- 7. SUPABASE AUTH SYNC TRIGGER
-- Automatically copies signed-up users from auth.users to public.users
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'customer'::public.user_role)
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, users.full_name),
        role = COALESCE(EXCLUDED.role, users.role);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

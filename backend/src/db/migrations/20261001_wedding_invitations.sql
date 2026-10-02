-- ==============================================================================
-- Eva-Ai: QR Wedding & Event Invitations Migration (Idempotent / Rerun-Safe)
-- Date: 2026-10-01
-- ==============================================================================

-- 1. INVITATIONS TABLE
CREATE TABLE IF NOT EXISTS public.invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID UNIQUE NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    public_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    title TEXT NOT NULL,
    host_names TEXT,
    message TEXT,
    event_time TEXT,
    venue_name TEXT,
    venue_address TEXT,
    template TEXT NOT NULL DEFAULT 'classic',
    cover_image_url TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_public_token ON public.invitations(public_token);
CREATE INDEX IF NOT EXISTS idx_invitations_event_id ON public.invitations(event_id);
CREATE INDEX IF NOT EXISTS idx_invitations_customer_id ON public.invitations(customer_id);

-- Automatic updated_at trigger
DROP TRIGGER IF EXISTS update_invitations_updated_at ON public.invitations;
CREATE TRIGGER update_invitations_updated_at
    BEFORE UPDATE ON public.invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers can manage own invitations" ON public.invitations;
CREATE POLICY "Customers can manage own invitations"
    ON public.invitations FOR ALL
    USING (auth.uid() = customer_id);

DROP POLICY IF EXISTS "Public invitations are viewable by anyone" ON public.invitations;
CREATE POLICY "Public invitations are viewable by anyone"
    ON public.invitations FOR SELECT
    USING (true);


-- 2. INVITATION RSVPS TABLE
CREATE TABLE IF NOT EXISTS public.invitation_rsvps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invitation_id UUID NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL,
    attendance TEXT NOT NULL CHECK (attendance IN ('ATTENDING', 'NOT_ATTENDING', 'MAYBE')),
    guest_count INT NOT NULL DEFAULT 1 CHECK (guest_count >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_rsvps_invitation_id ON public.invitation_rsvps(invitation_id);

-- Automatic updated_at trigger
DROP TRIGGER IF EXISTS update_invitation_rsvps_updated_at ON public.invitation_rsvps;
CREATE TRIGGER update_invitation_rsvps_updated_at
    BEFORE UPDATE ON public.invitation_rsvps
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE public.invitation_rsvps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can submit RSVPs" ON public.invitation_rsvps;
CREATE POLICY "Public can submit RSVPs"
    ON public.invitation_rsvps FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Customers can view RSVPs for own invitations" ON public.invitation_rsvps;
CREATE POLICY "Customers can view RSVPs for own invitations"
    ON public.invitation_rsvps FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.invitations i
        WHERE i.id = invitation_rsvps.invitation_id
        AND i.customer_id = auth.uid()
    ));

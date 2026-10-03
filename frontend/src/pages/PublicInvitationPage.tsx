import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Icon from '../components/common/Icon';
import InvitationCard from '../components/invitation/InvitationCard';
import { InvitationData, normalizeInvitationTheme } from '../types/invitation';
import { invitationsApi, ApiError } from '../api/api';

export const PublicInvitationPage: React.FC = () => {
  const { publicToken } = useParams<{ publicToken: string }>();

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!publicToken) {
      setErrorStatus(404);
      setErrorMessage('Invalid invitation link.');
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchPublicInvitation() {
      setIsLoading(true);
      setErrorStatus(null);
      setErrorMessage(null);

      try {
        const res = await invitationsApi.getPublicByToken(publicToken as string);
        const data = res?.data?.invitation || res?.data || res?.invitation || res;

        if (data && typeof data === 'object' && (data.id || data.publicToken || data.eventType || data.hostNames || data.coupleNames)) {
          const resolvedTheme = normalizeInvitationTheme(
            data.theme || data.template || data.designTheme || data.templateName || data.invitationTheme
          );
          const normalizedData: InvitationData = {
            ...data,
            theme: resolvedTheme,
            template: resolvedTheme,
          };
          if (isMounted) {
            setInvitation(normalizedData);
          }
        } else {
          if (isMounted) {
            setErrorStatus(404);
            setErrorMessage('Invitation not found or has been removed.');
          }
        }
      } catch (err: any) {
        console.error('Failed to load public invitation from API:', err);
        if (isMounted) {
          if (err instanceof ApiError) {
            setErrorStatus(err.status || 500);
            setErrorMessage(err.message || 'Unable to load invitation.');
          } else {
            setErrorStatus(500);
            setErrorMessage('Failed to connect to the invitation service. Please check your connection.');
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchPublicInvitation();

    return () => {
      isMounted = false;
    };
  }, [publicToken]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#121317] flex flex-col items-center justify-center p-4 text-center">
        <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs uppercase tracking-widest text-primary font-bold">
          Opening Digital Invitation...
        </span>
      </div>
    );
  }

  if (errorStatus === 404 || (!invitation && !isLoading)) {
    return (
      <div className="min-h-screen bg-[#121317] flex items-center justify-center p-4 text-center">
        <div className="max-w-md w-full rounded-3xl bg-surface-container-high/70 backdrop-blur-2xl p-8 sm:p-10 border border-surface-container-highest shadow-2xl space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-surface-container-highest text-on-surface-variant mx-auto flex items-center justify-center">
            <Icon name="search_off" className="text-[32px]" />
          </div>
          <div className="space-y-2">
            <h1 className="font-headline-sm text-2xl text-on-surface font-semibold">
              Invitation Not Found
            </h1>
            <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
              The invitation you are looking for may have been removed or the link is incorrect.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-bright text-primary font-title-md text-xs font-semibold transition-colors border border-surface-container-highest"
            >
              <Icon name="home" className="text-[16px]" />
              <span>Visit Eva-Ai Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (errorStatus && errorStatus !== 404) {
    return (
      <div className="min-h-screen bg-[#121317] flex items-center justify-center p-4 text-center">
        <div className="max-w-md w-full rounded-3xl bg-surface-container-high/70 backdrop-blur-2xl p-8 sm:p-10 border border-surface-container-highest shadow-2xl space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-error/15 text-error mx-auto flex items-center justify-center">
            <Icon name="cloud_off" className="text-[32px]" />
          </div>
          <div className="space-y-2">
            <h1 className="font-headline-sm text-xl text-on-surface font-semibold">
              Connection Error
            </h1>
            <p className="font-body-sm text-xs text-on-surface-variant">
              {errorMessage || 'Unable to retrieve the invitation at this moment.'}
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-title-md text-xs font-bold transition-all shadow-[0_0_20px_rgba(242,202,80,0.25)]"
            >
              <Icon name="refresh" className="text-[16px]" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!invitation) return null;

  return (
    <div className="min-h-screen bg-[#121317] text-on-surface py-12 px-4 relative overflow-hidden flex flex-col justify-between selection:bg-primary-container selection:text-on-primary">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-80 h-80 bg-[#ff5277]/10 rounded-full blur-[120px] pointer-events-none" />

      <main className="max-w-4xl mx-auto w-full relative z-10 space-y-10">
        {/* Top Minimal Brand Bar */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center shadow-[inset_0_1px_1px_rgba(242,202,80,0.3)]">
            <Icon name="auto_awesome" className="text-primary text-[16px]" />
          </div>
          <span className="font-headline-sm text-xs font-bold tracking-widest text-primary uppercase">
            EVA-AI CELEBRATION SUITE
          </span>
        </div>

        {/* The Luxury Invitation Card */}
        <InvitationCard
          invitation={invitation}
          isPreview={false}
        />
      </main>

      {/* Public Footer */}
      <footer className="mt-12 text-center text-[11px] text-on-surface-variant relative z-10">
        <span>Powered by </span>
        <span className="text-primary font-semibold">Eva-Ai</span>
        <span> &bull; Luxury Event Planning &amp; Guest Management</span>
      </footer>
    </div>
  );
};

export default PublicInvitationPage;

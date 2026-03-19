import { AppProvider } from '@/lib/store';
import { AuthProvider, useAuth } from '@/lib/auth';
import { LandingPage } from '@/components/LandingPage';
import { DashboardShell } from '@/components/DashboardShell';
import { AuthScreen } from '@/components/AuthScreen';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const LOADING_DOTS_CSS = `
  @keyframes dominionDotBounce {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.35; }
    40% { transform: translateY(-7px); opacity: 1; }
  }
  .d-dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #3B82F6;
    margin: 0 3px;
    animation: dominionDotBounce 1.3s ease-in-out infinite;
  }
  .d-dot:nth-child(1) { animation-delay: 0s; }
  .d-dot:nth-child(2) { animation-delay: 0.22s; }
  .d-dot:nth-child(3) { animation-delay: 0.44s; }
`;

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  google_denied: 'Google sign-in was cancelled.',
  microsoft_denied: 'Microsoft sign-in was cancelled.',
  token_exchange_failed: 'Authentication failed. Please try again.',
  not_configured: 'OAuth is not yet configured. Please try again later.',
  server_error: 'Something went wrong. Please try again.',
  no_email: 'Could not retrieve your email address. Please try again.',
};

function OAuthNotice({ notice }: { notice: { type: 'success' | 'error'; message: string } }) {
  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, padding: '12px 20px', borderRadius: '10px', fontSize: '14px',
      fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      background: notice.type === 'success' ? '#F0FDF4' : '#FEF2F2',
      color: notice.type === 'success' ? '#15803D' : '#DC2626',
      border: `1px solid ${notice.type === 'success' ? '#BBF7D0' : '#FECACA'}`,
      maxWidth: '480px', textAlign: 'center', whiteSpace: 'pre-wrap',
    }}>
      {notice.message}
    </div>
  );
}

/** Inner component that reads auth state after AuthProvider is mounted */
function AppInner() {
  const { user, isLoading, addEmailConnection } = useAuth();
  const [mode, setMode] = useState<'landing' | 'auth' | 'reset'>('landing');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [oauthNotice, setOauthNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [dashboardInitialView, setDashboardInitialView] = useState<'inbox' | 'settings'>('inbox');

  // Track pending OAuth connection — we may need to apply it once user is loaded
  const pendingOAuthRef = useRef<{ provider: 'gmail' | 'outlook'; email: string; label: string } | null>(null);
  const oauthProcessedRef = useRef(false);

  // Detect Supabase password recovery token in URL hash (#type=recovery&access_token=...)
  // This must run before auth state is resolved so we intercept before the dashboard renders.
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setMode('reset');
      // Don't clean up the hash yet — Supabase needs it to establish the recovery session
    }
  }, []);

  // Listen for Supabase PASSWORD_RECOVERY event — fires when the recovery token is consumed
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset');
        // Clean up the hash now that Supabase has consumed the token
        window.history.replaceState({}, '', window.location.pathname);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Parse OAuth params on mount — store them for processing once auth state is ready
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthSuccess = params.get('oauth_success');
    const oauthError = params.get('oauth_error');
    const email = params.get('email');

    if (oauthSuccess && email) {
      const provider = oauthSuccess === 'google' ? 'gmail' : 'outlook';
      const label = oauthSuccess === 'google' ? 'Gmail' : 'Outlook';
      pendingOAuthRef.current = { provider, email, label };
      // Clean up URL params immediately so they don't persist on refresh
      window.history.replaceState({}, '', window.location.pathname);
    } else if (oauthError) {
      setOauthNotice({
        type: 'error',
        message: OAUTH_ERROR_MESSAGES[oauthError] || 'Authentication failed. Please try again.',
      });
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => setOauthNotice(null), 6000);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply pending OAuth connection once user is available and loading is done
  useEffect(() => {
    if (isLoading) return;
    if (!pendingOAuthRef.current) return;
    if (oauthProcessedRef.current) return;

    const { provider, email, label } = pendingOAuthRef.current;
    oauthProcessedRef.current = true;
    pendingOAuthRef.current = null;

    if (user) {
      // User is logged in — save the connection and navigate to Settings
      addEmailConnection({
        provider,
        email,
        connectedAt: new Date().toISOString(),
        status: 'active',
      });
      setDashboardInitialView('settings');
      setOauthNotice({
        type: 'success',
        message: `✓ ${label} connected — ${email}\nWe're scanning your inbox for financial documents now.`,
      });
      setTimeout(() => setOauthNotice(null), 7000);
    } else {
      // User is not logged in — show sign-in screen with a notice
      setOauthNotice({
        type: 'success',
        message: `✓ ${label} (${email}) authorized — please sign in to complete the connection.`,
      });
      setAuthMode('signin');
      setMode('auth');
      setTimeout(() => setOauthNotice(null), 10000);
    }
  }, [isLoading, user, addEmailConnection]);

  // While restoring session from Supabase, show loading screen
  if (isLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#0A0F1E',
      }}>
        <div style={{ textAlign: 'center' }}>
          {/* Logo — matches landing page navbar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '20px' }}>
            <img
              src="/dominion-logo-transparent.png"
              alt="Dominion"
              style={{ width: 44, height: 44, objectFit: 'contain' }}
            />
            <span style={{ fontSize: '26px', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>Dominion</span>
          </div>
          <style dangerouslySetInnerHTML={{ __html: LOADING_DOTS_CSS }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
            <span style={{ color: '#3B82F6', fontSize: '13px', marginRight: '8px' }}>Loading</span>
            <span className="d-dot" />
            <span className="d-dot" />
            <span className="d-dot" />
          </div>
        </div>
      </div>
    );
  }

  // Password reset mode — always show reset form regardless of login state
  if (mode === 'reset') {
    return (
      <>
        {oauthNotice && <OAuthNotice notice={oauthNotice} />}
        <AuthScreen
          initialMode="reset"
          onSuccess={() => {
            setMode('landing');
          }}
          onBack={() => setMode('landing')}
        />
      </>
    );
  }

  // If user is logged in, show the dashboard
  if (user) {
    return (
      <AppProvider userId={user.id}>
        {oauthNotice && <OAuthNotice notice={oauthNotice} />}
        <DashboardShell initialView={dashboardInitialView} />
      </AppProvider>
    );
  }

  // Auth screen (sign in / sign up)
  if (mode === 'auth') {
    return (
      <>
        {oauthNotice && <OAuthNotice notice={oauthNotice} />}
        <AuthScreen
          initialMode={authMode}
          onSuccess={() => { /* auth state update triggers re-render automatically */ }}
          onBack={() => setMode('landing')}
        />
      </>
    );
  }

  // Landing page
  return (
    <>
      {oauthNotice && <OAuthNotice notice={oauthNotice} />}
      <LandingPage
        onEnterApp={() => { setAuthMode('signup'); setMode('auth'); }}
        onSignIn={() => { setAuthMode('signin'); setMode('auth'); }}
      />
    </>
  );
}

export function AppRoot() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

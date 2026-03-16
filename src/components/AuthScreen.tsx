import { useState } from 'react';
import { useAuth } from '@/lib/auth';

type Mode = 'signin' | 'signup';

interface AuthScreenProps {
  onSuccess: () => void;
  onBack?: () => void;
  initialMode?: Mode;
}

export function AuthScreen({ onSuccess, onBack, initialMode = 'signup' }: AuthScreenProps) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let result: { error?: string };
      if (mode === 'signup') {
        if (!name.trim()) { setError('Please enter your name.'); setLoading(false); return; }
        if (!company.trim()) { setError('Please enter your company name.'); setLoading(false); return; }
        result = await signUp(email, password, name, company);
      } else {
        result = await signIn(email, password);
      }
      if (result.error) {
        setError(result.error);
      } else {
        onSuccess();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0A0F1E',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
    }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            position: 'absolute', top: '20px', left: '20px',
            background: 'none', border: 'none', color: '#64748B',
            fontSize: '14px', cursor: 'pointer', display: 'flex',
            alignItems: 'center', gap: '6px',
          }}
        >
          ← Back
        </button>
      )}
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
        <img src="/dominion-logo-transparent.png" alt="Dominion" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
        <span style={{ color: '#fff', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px' }}>Dominion</span>
      </div>

      {/* Card */}
      <div style={{
        background: '#111827',
        border: '1px solid #1E293B',
        borderRadius: '16px',
        padding: '36px',
        width: '100%',
        maxWidth: '420px',
      }}>
        <h1 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, marginBottom: '6px', textAlign: 'center' }}>
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </h1>
        <p style={{ color: '#64748B', fontSize: '14px', textAlign: 'center', marginBottom: '28px' }}>
          {mode === 'signup'
            ? 'Start your free beta — no credit card required'
            : 'Sign in to your Dominion dashboard'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {mode === 'signup' && (
            <>
              <Field
                label="Full Name"
                type="text"
                value={name}
                onChange={setName}
                placeholder="Jane Smith"
                autoComplete="name"
              />
              <Field
                label="Company Name"
                type="text"
                value={company}
                onChange={setCompany}
                placeholder="Acme Corp"
                autoComplete="organization"
              />
            </>
          )}
          <Field
            label="Work Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="jane@company.com"
            autoComplete="email"
          />
          <Field
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />

          {error && (
            <div style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#DC2626',
              fontSize: '13px',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading ? '#1D4ED8' : '#3B82F6',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '13px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '4px',
              opacity: loading ? 0.8 : 1,
              transition: 'background 0.15s',
            }}
          >
            {loading
              ? (mode === 'signup' ? 'Creating account…' : 'Signing in…')
              : (mode === 'signup' ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        {/* Toggle */}
        <p style={{ color: '#64748B', fontSize: '13px', textAlign: 'center', marginTop: '20px' }}>
          {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
          <button
            onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); }}
            style={{
              background: 'none',
              border: 'none',
              color: '#3B82F6',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              padding: 0,
            }}
          >
            {mode === 'signup' ? 'Sign in' : 'Sign up free'}
          </button>
        </p>
      </div>

      <p style={{ color: '#334155', fontSize: '12px', marginTop: '24px', textAlign: 'center' }}>
        Free during beta · No credit card · Cancel anytime
      </p>
    </div>
  );
}

function Field({
  label, type, value, onChange, placeholder, autoComplete
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{ display: 'block', color: '#94A3B8', fontSize: '12px', fontWeight: 500, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        required
        style={{
          width: '100%',
          background: '#0F172A',
          border: `1px solid ${focused ? '#3B82F6' : '#1E293B'}`,
          borderRadius: '8px',
          padding: '11px 14px',
          color: '#F1F5F9',
          fontSize: '14px',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color 0.15s',
        }}
      />
    </div>
  );
}

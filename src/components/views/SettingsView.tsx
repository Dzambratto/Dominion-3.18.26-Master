import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import type { EmailConnection } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'connected' | 'disconnected' | 'error';
}

const INTEGRATIONS: Integration[] = [
  { id: 'quickbooks', name: 'QuickBooks Online', description: 'Sync invoices, vendors, and payments', icon: '📊', status: 'disconnected' },
  { id: 'plaid', name: 'Plaid (Bank Feed)', description: 'Real-time bank transaction monitoring', icon: '🏦', status: 'disconnected' },
];

const APP_URL = (import.meta as { env: Record<string, string> }).env.VITE_APP_URL || window.location.origin;

function getOAuthUrl(provider: 'google' | 'microsoft', userId: string): string {
  return `${APP_URL}/api/auth/${provider}?userId=${encodeURIComponent(userId)}`;
}

export function SettingsView() {
  const { user, addEmailConnection, removeEmailConnection } = useAuth();
  const [confidenceThreshold, setConfidenceThreshold] = useState(92);
  const [autoRespond, setAutoRespond] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [urgentAlerts, setUrgentAlerts] = useState(true);
  const [disconnecting, setDisconnecting] = useState<'gmail' | 'outlook' | null>(null);
  const [connectingManual, setConnectingManual] = useState<'gmail' | 'outlook' | null>(null);
  const [manualEmail, setManualEmail] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const gmailConnection = user?.emailConnections.find(c => c.provider === 'gmail');
  const outlookConnection = user?.emailConnections.find(c => c.provider === 'outlook');

  const isLocalDev = APP_URL.includes('localhost') || APP_URL.includes('127.0.0.1');

  const showNotice = (type: 'success' | 'error', message: string) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 5000);
  };

  const handleConnect = (provider: 'gmail' | 'outlook') => {
    if (!user) return;
    if (isLocalDev) {
      setConnectingManual(provider);
      setManualEmail('');
    } else {
      const oauthProvider = provider === 'gmail' ? 'google' : 'microsoft';
      window.location.href = getOAuthUrl(oauthProvider, user.id);
    }
  };

  const handleManualSubmit = () => {
    if (!connectingManual || !manualEmail.trim() || !manualEmail.includes('@')) return;
    const connection: EmailConnection = {
      provider: connectingManual,
      email: manualEmail.trim(),
      connectedAt: new Date().toISOString(),
      status: 'active',
    };
    addEmailConnection(connection);
    const label = connectingManual === 'gmail' ? 'Gmail' : 'Outlook';
    setConnectingManual(null);
    setManualEmail('');
    showNotice('success', `${label} connected — ${connection.email}`);
  };

  const handleDisconnect = async (provider: 'gmail' | 'outlook') => {
    setDisconnecting(provider);
    try {
      // Attempt server-side token revocation
      if (user && !isLocalDev) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          await fetch(`${APP_URL}/api/auth/${provider === 'gmail' ? 'google' : 'microsoft'}/disconnect`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            credentials: 'include',
            body: JSON.stringify({ userId: user.id }),
          });
        } catch {
          // Ignore — still remove locally even if server-side revocation fails
        }
      }
      removeEmailConnection(provider);
      const label = provider === 'gmail' ? 'Gmail' : 'Outlook';
      showNotice('success', `${label} disconnected successfully`);
    } finally {
      setDisconnecting(null);
    }
  };

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {/* Notice banner */}
      {notice && (
        <div className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border',
          notice.type === 'success'
            ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]'
            : 'bg-[#FEF2F2] border-[#FECACA] text-[#DC2626]'
        )}>
          <span>{notice.type === 'success' ? '✓' : '⚠'}</span>
          {notice.message}
        </div>
      )}

      {/* Company Profile */}
      <Section title="Company Profile" icon="🏢">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Company Name" value={user?.company ?? '—'} />
          <Field label="Account Email" value={user?.email ?? '—'} />
          <Field label="Plan" value="Dominion Beta" badge="Active" badgeColor="#10B981" />
          <Field label="Name" value={user?.name ?? '—'} />
        </div>
      </Section>

      {/* Email Inbox Connections */}
      <Section title="Email Inbox Connections" icon="📧">
        <p className="text-xs text-[#64748B] mb-4">
          Connect your email inbox so Dominion can automatically read and process invoices, contracts, and insurance documents. Read-only access — we never send emails or modify your inbox.
        </p>
        <div className="space-y-3">
          <EmailConnectionRow
            provider="gmail"
            label="Gmail"
            sublabel="Google Workspace or personal Gmail"
            icon="📧"
            iconBg="#EA4335"
            connection={gmailConnection}
            isDisconnecting={disconnecting === 'gmail'}
            isConnectingManual={connectingManual === 'gmail'}
            manualEmail={manualEmail}
            setManualEmail={setManualEmail}
            onConnect={() => handleConnect('gmail')}
            onDisconnect={() => handleDisconnect('gmail')}
            onManualSubmit={handleManualSubmit}
            onManualCancel={() => { setConnectingManual(null); setManualEmail(''); }}
          />
          <EmailConnectionRow
            provider="outlook"
            label="Outlook / Microsoft 365"
            sublabel="Outlook.com or Microsoft 365 account"
            icon="📨"
            iconBg="#0078D4"
            connection={outlookConnection}
            isDisconnecting={disconnecting === 'outlook'}
            isConnectingManual={connectingManual === 'outlook'}
            manualEmail={manualEmail}
            setManualEmail={setManualEmail}
            onConnect={() => handleConnect('outlook')}
            onDisconnect={() => handleDisconnect('outlook')}
            onManualSubmit={handleManualSubmit}
            onManualCancel={() => { setConnectingManual(null); setManualEmail(''); }}
          />
        </div>
      </Section>

      {/* Other Integrations */}
      <Section title="Other Integrations" icon="🔌">
        <div className="space-y-3">
          {INTEGRATIONS.map(integration => (
            <IntegrationRow key={integration.id} integration={integration} />
          ))}
        </div>
      </Section>

      {/* AI Behavior */}
      <Section title="AI Behavior" icon="🤖">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-medium text-[#0F172A]">Extraction Confidence Threshold</div>
                <div className="text-xs text-[#64748B]">Invoices below this score require manual review</div>
              </div>
              <span className="text-sm font-bold text-[#3B82F6]">{confidenceThreshold}%</span>
            </div>
            <input
              type="range"
              min={70}
              max={99}
              value={confidenceThreshold}
              onChange={e => setConfidenceThreshold(Number(e.target.value))}
              className="w-full accent-[#3B82F6]"
            />
            <div className="flex justify-between text-[10px] text-[#94A3B8] mt-1">
              <span>70% (More automation)</span>
              <span>99% (More review)</span>
            </div>
          </div>
          <Toggle
            label="Auto-respond to incomplete invoices"
            description="Automatically email vendors requesting missing details"
            checked={autoRespond}
            onChange={setAutoRespond}
          />
        </div>
      </Section>

      {/* Notifications */}
      <Section title="Notifications" icon="🔔">
        <div className="space-y-3">
          <Toggle label="Email notifications" description="Receive alerts via email" checked={emailNotifications} onChange={setEmailNotifications} />
          <Toggle label="Daily digest" description="Morning summary of pending actions" checked={dailyDigest} onChange={setDailyDigest} />
          <Toggle label="Urgent alerts" description="Immediate notification for high-priority items" checked={urgentAlerts} onChange={setUrgentAlerts} />
        </div>
      </Section>

      {/* Roadmap */}
      <Section title="Coming in Phase 2" icon="🚀">
        <div className="space-y-2">
          {[
            'QuickBooks automated payment execution',
            'Insurance quote automation & carrier API',
            'Contract renegotiation engine',
            'Vendor benchmarking database',
            'Financial anomaly trend reports',
          ].map(item => (
            <div key={item} className="flex items-center gap-2 text-sm text-[#64748B]">
              <span className="text-[#94A3B8]">○</span>
              {item}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ─── Email Connection Row ─────────────────────────────────────────────────────

function EmailConnectionRow({
  provider,
  label,
  sublabel,
  icon,
  iconBg,
  connection,
  isDisconnecting,
  isConnectingManual,
  manualEmail,
  setManualEmail,
  onConnect,
  onDisconnect,
  onManualSubmit,
  onManualCancel,
}: {
  provider: 'gmail' | 'outlook';
  label: string;
  sublabel: string;
  icon: string;
  iconBg: string;
  connection?: EmailConnection;
  isDisconnecting: boolean;
  isConnectingManual: boolean;
  manualEmail: string;
  setManualEmail: (v: string) => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onManualSubmit: () => void;
  onManualCancel: () => void;
}) {
  const isConnected = !!connection;

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden transition-all',
      isConnected ? 'border-[#10B981] bg-[#F0FDF4]' : 'border-[#E2E8F0] bg-[#F8FAFC]'
    )}>
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: icon + info */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
            style={{ backgroundColor: iconBg + '18' }}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-[#0F172A]">{label}</span>
              {isConnected && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#10B981]/10 text-[#10B981]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] inline-block" />
                  Active
                </span>
              )}
            </div>
            <div className="text-xs text-[#64748B] mt-0.5 truncate">
              {isConnected ? connection!.email : sublabel}
            </div>
            {isConnected && connection!.connectedAt && (
              <div className="text-[10px] text-[#94A3B8] mt-0.5">
                Connected {new Date(connection!.connectedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            )}
          </div>
        </div>

        {/* Right: action button */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {isConnected ? (
            <button
              onClick={onDisconnect}
              disabled={isDisconnecting}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                'text-[#EF4444] bg-white border-[#FECACA] hover:bg-[#FEF2F2]',
                isDisconnecting && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
            </button>
          ) : (
            <button
              onClick={onConnect}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#3B82F6] hover:bg-[#2563EB] transition-colors"
            >
              Connect
            </button>
          )}
        </div>
      </div>

      {/* Manual email form (dev / local mode) */}
      {isConnectingManual && !isConnected && (
        <div className="border-t border-[#E2E8F0] px-4 py-3 bg-white">
          <div className="text-xs text-[#64748B] mb-2">Enter the email address to connect:</div>
          <div className="flex gap-2">
            <input
              type="email"
              value={manualEmail}
              onChange={e => setManualEmail(e.target.value)}
              placeholder={provider === 'gmail' ? 'you@gmail.com' : 'you@company.com'}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && onManualSubmit()}
              className="flex-1 border border-[#CBD5E1] rounded-lg px-3 py-2 text-sm text-[#0F172A] outline-none focus:border-[#3B82F6] bg-white"
            />
            <button
              onClick={onManualSubmit}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-[#3B82F6] hover:bg-[#2563EB] transition-colors"
            >
              Save
            </button>
            <button
              onClick={onManualCancel}
              className="px-3 py-2 rounded-lg text-xs font-medium text-[#64748B] border border-[#E2E8F0] hover:bg-[#F1F5F9] transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center gap-2">
        <span>{icon}</span>
        <h3 className="text-sm font-semibold text-[#0F172A]">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({ label, value, badge, badgeColor }: { label: string; value: string; badge?: string; badgeColor?: string }) {
  return (
    <div>
      <div className="text-xs text-[#94A3B8] uppercase tracking-wider mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-[#0F172A]">{value}</span>
        {badge && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: (badgeColor ?? '#10B981') + '15', color: badgeColor ?? '#10B981' }}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Integration Row ──────────────────────────────────────────────────────────

function IntegrationRow({ integration }: { integration: Integration }) {
  const statusConfig = {
    connected: { color: '#10B981', label: 'Connected' },
    disconnected: { color: '#94A3B8', label: 'Not connected' },
    error: { color: '#EF4444', label: 'Error' },
  };
  const cfg = statusConfig[integration.status];
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
      <div className="flex items-center gap-3">
        <span className="text-xl">{integration.icon}</span>
        <div>
          <div className="text-sm font-medium text-[#0F172A]">{integration.name}</div>
          <div className="text-xs text-[#64748B]">{integration.description}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
        <button className={cn(
          'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
          integration.status === 'connected'
            ? 'text-[#64748B] bg-white border border-[#E2E8F0] hover:bg-[#F1F5F9]'
            : 'text-white bg-[#3B82F6] hover:bg-blue-600'
        )}>
          {integration.status === 'connected' ? 'Manage' : 'Connect'}
        </button>
      </div>
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium text-[#0F172A]">{label}</div>
        <div className="text-xs text-[#64748B]">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          checked ? 'bg-[#3B82F6]' : 'bg-[#E2E8F0]'
        )}
      >
        <span className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )} />
      </button>
    </div>
  );
}

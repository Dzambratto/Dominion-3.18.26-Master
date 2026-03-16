
import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'connected' | 'disconnected' | 'error';
}

const INTEGRATIONS: Integration[] = [
  { id: 'gmail', name: 'Gmail', description: 'Invoice ingestion from Gmail inbox', icon: '📧', status: 'connected' },
  { id: 'outlook', name: 'Outlook', description: 'Invoice ingestion from Outlook inbox', icon: '📨', status: 'connected' },
  { id: 'quickbooks', name: 'QuickBooks Online', description: 'Sync invoices, vendors, and payments', icon: '📊', status: 'connected' },
  { id: 'plaid', name: 'Plaid (Bank Feed)', description: 'Real-time bank transaction monitoring', icon: '🏦', status: 'disconnected' },
];

export function SettingsView() {
  const [confidenceThreshold, setConfidenceThreshold] = useState(92);
  const [autoRespond, setAutoRespond] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [urgentAlerts, setUrgentAlerts] = useState(true);

  return (
    <div className="p-6 max-w-3xl space-y-6">
      {/* Company Profile */}
      <Section title="Company Profile" icon="🏢">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Company Name" value="Acme Corp" />
          <Field label="Industry" value="Professional Services" />
          <Field label="Plan" value="Dominion Pro" badge="Active" badgeColor="#10B981" />
          <Field label="AI Scans" value="47 today · 1,240 this month" />
        </div>
      </Section>

      {/* Integrations */}
      <Section title="Integrations" icon="🔌">
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

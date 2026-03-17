import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { Sidebar } from './Sidebar';
import { InboxView } from './views/InboxView';
import { InvoicesView } from './views/InvoicesView';
import { ContractsView } from './views/ContractsView';
import { InsuranceView } from './views/InsuranceView';
import { PaymentsView } from './views/PaymentsView';
import { SettingsView } from './views/SettingsView';
import { InvoiceDetailModal } from './modals/InvoiceDetailModal';
import { ContractDetailModal } from './modals/ContractDetailModal';
import { PolicyDetailModal } from './modals/PolicyDetailModal';
import { OrdersView } from './views/OrdersView';
import { OrderDetailModal } from './modals/OrderDetailModal';
import IntelligenceView from './views/IntelligenceView';
import { UploadModal } from './UploadModal';
import type { UploadDocType } from './UploadModal';

// FIX (Claude audit): Removed isLocalDev bypass. OAuth now works in all environments.
// For local dev, ensure VITE_APP_URL=http://localhost:5173 and add localhost redirect URI to Google/Microsoft consoles.
const APP_URL = (import.meta as { env: Record<string, string> }).env.VITE_APP_URL || 'https://getdominiontech.com';

export type ViewId = 'inbox' | 'invoices' | 'contracts' | 'insurance' | 'orders' | 'payments' | 'intelligence' | 'settings';

export function DashboardShell() {
  const { state } = useAppStore();
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<ViewId>('inbox');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const selectedInvoice = selectedInvoiceId ? state.invoices.find(i => i.id === selectedInvoiceId) ?? null : null;
  const selectedContract = selectedContractId ? state.contracts.find(c => c.id === selectedContractId) ?? null : null;
  const selectedPolicy = selectedPolicyId ? state.policies.find(p => p.id === selectedPolicyId) ?? null : null;
  const activeAlerts = state.alerts.filter(a => !a.dismissed);

  const handleUploadProcessed = (docType: UploadDocType, _fileName: string) => {
    // After upload, navigate to the relevant tab
    const tabMap: Record<UploadDocType, ViewId> = {
      invoice: 'invoices',
      contract: 'contracts',
      insurance: 'insurance',
      order: 'orders',
      auto: 'inbox',
    };
    setActiveView(tabMap[docType]);
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        alertCount={activeAlerts.length}
        summary={state.summary}
      />
      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <TopBar
          activeView={activeView}
          isScanning={state.isScanning}
          onUpload={() => setShowUpload(true)}
          onNavigateSettings={() => setActiveView('settings')}
        />
        {/* View content */}
        <div className="flex-1 overflow-y-auto">
          {activeView === 'inbox' && (
            <InboxView
              onViewInvoice={setSelectedInvoiceId}
              onViewPolicy={setSelectedPolicyId}
              onViewContract={setSelectedContractId}
              onUpload={() => setShowUpload(true)}
              onConnectEmail={() => {
                const userId = user?.id ?? '';
                window.location.href = `${APP_URL}/api/auth/google?userId=${encodeURIComponent(userId)}`;
              }}
            />
          )}
          {activeView === 'invoices' && (
            <InvoicesView
              onViewInvoice={setSelectedInvoiceId}
              onUpload={() => setShowUpload(true)}
            />
          )}
          {activeView === 'contracts' && (
            <ContractsView
              onViewContract={setSelectedContractId}
              onUpload={() => setShowUpload(true)}
            />
          )}
          {activeView === 'insurance' && (
            <InsuranceView
              onViewPolicy={setSelectedPolicyId}
              onUpload={() => setShowUpload(true)}
            />
          )}
          {activeView === 'orders' && (
            <OrdersView
              onViewOrder={setSelectedOrderId}
              onUpload={() => setShowUpload(true)}
            />
          )}
          {activeView === 'payments' && <PaymentsView />}
          {activeView === 'intelligence' && <IntelligenceView />}
          {activeView === 'settings' && <SettingsView />}
        </div>
      </main>

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onProcessed={handleUploadProcessed}
        />
      )}

      {/* Modals */}
      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          contract={selectedInvoice.contractId ? state.contracts.find(c => c.id === selectedInvoice.contractId) ?? null : null}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}
      {selectedContract && (
        <ContractDetailModal
          contract={selectedContract}
          invoices={state.invoices.filter(i => selectedContract.linkedInvoiceIds.includes(i.id))}
          onClose={() => setSelectedContractId(null)}
          onViewInvoice={setSelectedInvoiceId}
        />
      )}
      {selectedPolicy && (
        <PolicyDetailModal
          policy={selectedPolicy}
          onClose={() => setSelectedPolicyId(null)}
        />
      )}
      {selectedOrderId && (
        <OrderDetailModal
          orderId={selectedOrderId}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </div>
  );
}

function TopBar({
  activeView,
  isScanning,
  onUpload,
  onNavigateSettings,
}: {
  activeView: ViewId;
  isScanning: boolean;
  onUpload: () => void;
  onNavigateSettings: () => void;
}) {
  const { triggerScan } = useAppStore();
  const { user, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const hasEmailConnected = user && user.emailConnections && user.emailConnections.length > 0;

  const titles: Record<ViewId, string> = {
    inbox: 'Inbox',
    invoices: 'Invoices',
    contracts: 'Contracts',
    insurance: 'Insurance Intelligence',
    orders: 'Order Automation',
    payments: 'Payment Preparation',
    intelligence: 'AI Operational Intelligence',
    settings: 'Settings',
  };

  const initials = user
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <div className="h-14 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6 flex-shrink-0">
      <h1 className="text-base font-semibold text-[#0F172A]">{titles[activeView]}</h1>
      <div className="flex items-center gap-3">
        {/* Connect Email CTA — shown when no email is linked */}
        {!hasEmailConnected && (
          <button
            onClick={() => { setShowUserMenu(false); onNavigateSettings(); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#FFF7ED] text-[#EA580C] hover:bg-[#FFEDD5] transition-colors border border-[#FED7AA]"
          >
            📧 Link Email
          </button>
        )}
        {/* Upload button */}
        <button
          onClick={onUpload}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#F0FDF4] text-[#16A34A] hover:bg-[#DCFCE7] transition-colors"
        >
          ↑ Upload Document
        </button>
        {/* AI Scan button */}
        <button
          onClick={triggerScan}
          disabled={isScanning}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#EFF6FF] text-[#3B82F6] hover:bg-[#DBEAFE] transition-colors disabled:opacity-60"
        >
          <span className={isScanning ? 'animate-spin inline-block' : ''}>⟳</span>
          {isScanning ? 'Scanning…' : 'Run AI Scan'}
        </button>
        {/* User avatar with dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-8 h-8 rounded-full bg-[#1A2744] flex items-center justify-center text-white text-xs font-bold hover:bg-[#243558] transition-colors"
            title={user?.name ?? 'User'}
          >
            {initials}
          </button>
          {showUserMenu && (
            <div
              style={{
                position: 'absolute', top: '40px', right: 0,
                background: '#fff', border: '1px solid #E2E8F0',
                borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                minWidth: '200px', zIndex: 100, overflow: 'hidden',
              }}
            >
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9' }}>
                <div style={{ color: '#0F172A', fontSize: '13px', fontWeight: 600 }}>{user?.name}</div>
                <div style={{ color: '#94A3B8', fontSize: '12px', marginTop: '2px' }}>{user?.email}</div>
                {user?.company && (
                  <div style={{ color: '#64748B', fontSize: '12px', marginTop: '2px' }}>{user.company}</div>
                )}
              </div>
              <button
                onClick={() => { setShowUserMenu(false); onNavigateSettings(); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 16px', background: 'none', border: 'none',
                  color: '#3B82F6', fontSize: '13px', cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#EFF6FF')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                📧 {hasEmailConnected ? 'Manage Email Links' : 'Link Email Inbox'}
              </button>
              <button
                onClick={() => { setShowUserMenu(false); signOut(); }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 16px', background: 'none', border: 'none',
                  color: '#EF4444', fontSize: '13px', cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

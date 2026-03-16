
import React, { useState } from 'react';
import { useAppStore } from '@/lib/store';
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

export type ViewId = 'inbox' | 'invoices' | 'contracts' | 'insurance' | 'orders' | 'payments' | 'intelligence' | 'settings';

export function DashboardShell() {
  const { state } = useAppStore();
  const [activeView, setActiveView] = useState<ViewId>('inbox');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const selectedInvoice = selectedInvoiceId ? state.invoices.find(i => i.id === selectedInvoiceId) ?? null : null;
  const selectedContract = selectedContractId ? state.contracts.find(c => c.id === selectedContractId) ?? null : null;
  const selectedPolicy = selectedPolicyId ? state.policies.find(p => p.id === selectedPolicyId) ?? null : null;

  const activeAlerts = state.alerts.filter(a => !a.dismissed);

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
        <TopBar activeView={activeView} isScanning={state.isScanning} />

        {/* View content */}
        <div className="flex-1 overflow-y-auto">
          {activeView === 'inbox' && (
            <InboxView
              onViewInvoice={setSelectedInvoiceId}
              onViewPolicy={setSelectedPolicyId}
              onViewContract={setSelectedContractId}
            />
          )}
          {activeView === 'invoices' && (
            <InvoicesView onViewInvoice={setSelectedInvoiceId} />
          )}
          {activeView === 'contracts' && (
            <ContractsView onViewContract={setSelectedContractId} />
          )}
          {activeView === 'insurance' && (
            <InsuranceView onViewPolicy={setSelectedPolicyId} />
          )}
          {activeView === 'orders' && (
            <OrdersView onViewOrder={setSelectedOrderId} />
          )}
          {activeView === 'payments' && <PaymentsView />}
          {activeView === 'intelligence' && <IntelligenceView />}
          {activeView === 'settings' && <SettingsView />}
        </div>
      </main>

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

function TopBar({ activeView, isScanning }: { activeView: ViewId; isScanning: boolean }) {
  const { triggerScan } = useAppStore();

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

  return (
    <div className="h-14 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-6 flex-shrink-0">
      <h1 className="text-base font-semibold text-[#0F172A]">{titles[activeView]}</h1>
      <div className="flex items-center gap-3">
        <button
          onClick={triggerScan}
          disabled={isScanning}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#EFF6FF] text-[#3B82F6] hover:bg-[#DBEAFE] transition-colors disabled:opacity-60"
        >
          <span className={isScanning ? 'animate-spin inline-block' : ''}>⟳</span>
          {isScanning ? 'Scanning…' : 'Run AI Scan'}
        </button>
        <div className="w-8 h-8 rounded-full bg-[#1A2744] flex items-center justify-center text-white text-xs font-bold">
          JD
        </div>
      </div>
    </div>
  );
}

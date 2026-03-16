
import React from 'react';
import { useAppStore } from '@/lib/store';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { Contract } from '@/lib/types';

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  service:     { label: 'Service',     color: '#3B82F6', icon: '🔧' },
  saas:        { label: 'SaaS',        color: '#8B5CF6', icon: '☁️' },
  maintenance: { label: 'Maintenance', color: '#F59E0B', icon: '🏗️' },
  insurance:   { label: 'Insurance',   color: '#10B981', icon: '🛡️' },
  lease:       { label: 'Lease',       color: '#64748B', icon: '🏢' },
  vendor:      { label: 'Vendor',      color: '#EF4444', icon: '📦' },
};

export function ContractsView({ onViewContract }: { onViewContract: (id: string) => void }) {
  const { state } = useAppStore();

  const totalAnnualValue = state.contracts.reduce((sum, c) => {
    const annual = c.billingFrequency === 'annual' ? c.totalContractValue :
                   c.billingFrequency === 'monthly' ? c.totalContractValue :
                   c.totalContractValue;
    return sum + annual;
  }, 0);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">Contracts & Agreements</h2>
          <p className="text-sm text-[#64748B]">
            {state.contracts.length} active contracts · {formatCurrency(totalAnnualValue)} total annual value
          </p>
        </div>
        <button className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#3B82F6] hover:bg-blue-600 transition-colors">
          + Add Contract
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Contracts" value={state.contracts.length} icon="📋" />
        <StatCard label="Auto-Renewing" value={state.contracts.filter(c => c.autoRenews).length} icon="🔄" />
        <StatCard label="Expiring Soon" value={state.contracts.filter(c => (c.daysUntilExpiration ?? 999) <= 30).length} icon="⏰" color="#EF4444" />
        <StatCard label="Service Verified" value={state.contracts.filter(c => c.requiresServiceVerification).length} icon="✅" color="#10B981" />
      </div>

      {/* Contract Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {state.contracts.map(contract => (
          <ContractCard key={contract.id} contract={contract} onClick={() => onViewContract(contract.id)} />
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-[#E2E8F0]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-2xl font-bold" style={{ color: color ?? '#0F172A' }}>{value}</span>
      </div>
      <div className="text-xs text-[#64748B]">{label}</div>
    </div>
  );
}

function ContractCard({ contract, onClick }: { contract: Contract; onClick: () => void }) {
  const cfg = TYPE_CONFIG[contract.contractType] ?? TYPE_CONFIG.vendor;
  const isExpiringSoon = (contract.daysUntilExpiration ?? 999) <= 30;
  const yoy = contract.yearOverYear;
  const latestYear = yoy[yoy.length - 1];
  const prevYear = yoy[yoy.length - 2];
  const yoyChange = latestYear && prevYear
    ? ((latestYear.totalSpend - prevYear.totalSpend) / prevYear.totalSpend) * 100
    : null;

  return (
    <div
      className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {isExpiringSoon && (
        <div className="h-1 bg-[#EF4444]" />
      )}
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">{cfg.icon}</span>
            <div>
              <div className="font-semibold text-sm text-[#0F172A]">{contract.vendorName}</div>
              <div className="text-xs text-[#64748B]">{contract.description}</div>
            </div>
          </div>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: cfg.color + '15', color: cfg.color }}
          >
            {cfg.label}
          </span>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <div className="text-[10px] text-[#94A3B8] uppercase tracking-wider mb-0.5">Value</div>
            <div className="text-sm font-bold text-[#0F172A]">{formatCurrency(contract.totalContractValue)}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#94A3B8] uppercase tracking-wider mb-0.5">Billing</div>
            <div className="text-sm font-medium text-[#0F172A] capitalize">{contract.billingFrequency.replace('_', ' ')}</div>
          </div>
          <div>
            <div className="text-[10px] text-[#94A3B8] uppercase tracking-wider mb-0.5">Expires</div>
            <div className={cn('text-sm font-medium', isExpiringSoon ? 'text-[#EF4444]' : 'text-[#0F172A]')}>
              {contract.daysUntilExpiration != null ? `${contract.daysUntilExpiration}d` : formatDate(contract.endDate)}
            </div>
          </div>
        </div>

        {/* YoY */}
        {yoyChange !== null && (
          <div className="flex items-center gap-2 mb-3 p-2.5 rounded-lg bg-[#F8FAFC]">
            <span className="text-xs text-[#64748B]">YoY spend:</span>
            <span className={cn('text-xs font-bold', yoyChange > 5 ? 'text-[#EF4444]' : 'text-[#10B981]')}>
              {yoyChange > 0 ? '+' : ''}{yoyChange.toFixed(1)}%
            </span>
            <span className="text-xs text-[#94A3B8]">vs last year</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {contract.autoRenews && (
              <span className="text-[10px] text-[#3B82F6] bg-blue-50 px-1.5 py-0.5 rounded font-medium">Auto-renews</span>
            )}
            {contract.requiresServiceVerification && (
              <span className="text-[10px] text-[#10B981] bg-green-50 px-1.5 py-0.5 rounded font-medium">Verified</span>
            )}
            <span className="text-[10px] text-[#94A3B8]">{contract.linkedInvoiceIds.length} invoices</span>
          </div>
          <button className="text-xs text-[#3B82F6] hover:underline font-medium">View →</button>
        </div>
      </div>
    </div>
  );
}


import React from 'react';
import { useAppStore } from '@/lib/store';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { InsurancePolicy } from '@/lib/types';

const POLICY_TYPE_LABELS: Record<string, string> = {
  general_liability: 'General Liability',
  professional: 'Professional Liability',
  cyber: 'Cyber',
  workers_comp: "Workers' Comp",
  umbrella: 'Umbrella',
  property: 'Property',
  auto: 'Commercial Auto',
};

export function InsuranceView({ onViewPolicy }: { onViewPolicy: (id: string) => void }) {
  const { state } = useAppStore();

  const totalPremium = state.policies.reduce((sum, p) => sum + p.premium, 0);
  const expiringSoon = state.policies.filter(p => p.daysUntilExpiration <= 60).length;
  const gaps = state.policies.flatMap(p => p.gapsDetected);

  // Coverage gap detection
  const coveredTypes = new Set(state.policies.map(p => p.policyType));
  const requiredTypes = ['general_liability', 'cyber', 'professional', 'workers_comp'];
  const missingTypes = requiredTypes.filter(t => !coveredTypes.has(t as any));

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">Insurance Intelligence</h2>
          <p className="text-sm text-[#64748B]">
            {state.policies.length} policies · {formatCurrency(totalPremium)}/yr total premium
          </p>
        </div>
        <button className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#3B82F6] hover:bg-blue-600 transition-colors">
          + Add Policy
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Active Policies" value={state.policies.length} icon="🛡️" />
        <StatCard label="Expiring Soon" value={expiringSoon} icon="⏰" color={expiringSoon > 0 ? '#EF4444' : undefined} />
        <StatCard label="Coverage Gaps" value={gaps.length + missingTypes.length} icon="⚠️" color={gaps.length > 0 ? '#EF4444' : undefined} />
        <StatCard label="Annual Premium" value={formatCurrency(totalPremium)} icon="💰" isText />
      </div>

      {/* Coverage Gaps Banner */}
      {missingTypes.length > 0 && (
        <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200">
          <div className="flex items-center gap-2 mb-2">
            <span>⚠️</span>
            <span className="text-sm font-semibold text-red-700">Coverage Gaps Detected</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {missingTypes.map(t => (
              <span key={t} className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                Missing: {POLICY_TYPE_LABELS[t] ?? t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Policy Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {state.policies.map(policy => (
          <PolicyCard key={policy.id} policy={policy} onClick={() => onViewPolicy(policy.id)} />
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, isText }: { label: string; value: number | string; icon: string; color?: string; isText?: boolean }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-[#E2E8F0]">
      <div className="flex items-center justify-between mb-1">
        <span className="text-lg">{icon}</span>
        <span className={cn('font-bold', isText ? 'text-base' : 'text-2xl')} style={{ color: color ?? '#0F172A' }}>{value}</span>
      </div>
      <div className="text-xs text-[#64748B]">{label}</div>
    </div>
  );
}

function PolicyCard({ policy, onClick }: { policy: InsurancePolicy; onClick: () => void }) {
  const isExpiringSoon = policy.daysUntilExpiration <= 60;
  const isExpired = policy.status === 'expired';
  const statusColor = isExpired ? '#EF4444' : isExpiringSoon ? '#F59E0B' : '#10B981';
  const statusLabel = isExpired ? 'Expired' : isExpiringSoon ? `Expires in ${policy.daysUntilExpiration}d` : 'Active';

  const yoy = policy.yearOverYearPremiums;
  const latestPremium = yoy[yoy.length - 1];
  const prevPremium = yoy[yoy.length - 2];
  const yoyChange = latestPremium && prevPremium
    ? ((latestPremium.premium - prevPremium.premium) / prevPremium.premium) * 100
    : null;

  return (
    <div
      className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="h-1" style={{ backgroundColor: statusColor }} />
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="font-semibold text-sm text-[#0F172A]">{policy.carrier}</div>
            <div className="text-xs text-[#64748B]">{POLICY_TYPE_LABELS[policy.policyType] ?? policy.policyType}</div>
          </div>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: statusColor + '15', color: statusColor }}
          >
            {statusLabel}
          </span>
        </div>

        {/* Premium */}
        <div className="mb-3">
          <div className="text-2xl font-bold text-[#0F172A]">{formatCurrency(policy.premium)}</div>
          <div className="text-xs text-[#64748B]">/{policy.billingFrequency}</div>
        </div>

        {/* YoY */}
        {yoyChange !== null && (
          <div className="flex items-center gap-1.5 mb-3 text-xs">
            <span className="text-[#64748B]">YoY:</span>
            <span className={cn('font-bold', yoyChange > 5 ? 'text-[#EF4444]' : 'text-[#10B981]')}>
              {yoyChange > 0 ? '+' : ''}{yoyChange.toFixed(1)}%
            </span>
          </div>
        )}

        {/* Coverage count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#64748B]">{policy.coverageItems.length} coverage items</span>
            {policy.gapsDetected.length > 0 && (
              <span className="text-[10px] text-[#EF4444] bg-red-50 px-1.5 py-0.5 rounded font-medium">
                {policy.gapsDetected.length} gap{policy.gapsDetected.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {policy.alternativeQuotes && policy.alternativeQuotes.length > 0 && (
            <span className="text-[10px] text-[#10B981] bg-green-50 px-1.5 py-0.5 rounded font-medium">
              Quotes available
            </span>
          )}
        </div>

        {/* AI Summary snippet */}
        <p className="mt-3 text-xs text-[#64748B] line-clamp-2 leading-relaxed border-t border-[#E2E8F0] pt-3">
          🤖 {policy.aiSummary.substring(0, 100)}…
        </p>
      </div>
    </div>
  );
}


import React from 'react';
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

interface Props {
  policy: InsurancePolicy;
  onClose: () => void;
}

export function PolicyDetailModal({ policy, onClose }: Props) {
  const isExpiringSoon = policy.daysUntilExpiration <= 60;
  const statusColor = policy.status === 'expired' ? '#EF4444' : isExpiringSoon ? '#F59E0B' : '#10B981';

  const yoy = policy.yearOverYearPremiums;
  const latestPremium = yoy[yoy.length - 1];
  const prevPremium = yoy[yoy.length - 2];
  const yoyChange = latestPremium && prevPremium
    ? ((latestPremium.premium - prevPremium.premium) / prevPremium.premium) * 100
    : null;

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex flex-col h-full max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#E2E8F0] flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-[#0F172A]">{policy.carrier}</h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: statusColor + '15', color: statusColor }}>
                {policy.status === 'expiring_soon' ? `Expires in ${policy.daysUntilExpiration}d` : policy.status}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-[#64748B]">
              <span>{POLICY_TYPE_LABELS[policy.policyType] ?? policy.policyType}</span>
              <span>·</span>
              <span className="font-mono">{policy.policyNumber}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#0F172A] text-xl font-light p-1">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Key metrics */}
          <div className="grid grid-cols-4 gap-4">
            <MetricCard label="Annual Premium" value={formatCurrency(policy.premium)} highlight />
            <MetricCard label="Effective" value={formatDate(policy.effectiveDate)} />
            <MetricCard label="Expires" value={formatDate(policy.expirationDate)} valueColor={isExpiringSoon ? '#EF4444' : undefined} />
            <MetricCard label="Billing" value={policy.billingFrequency} />
          </div>

          {/* Expiry alert */}
          {isExpiringSoon && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <div className="text-sm font-semibold text-amber-800">⏰ Renewal Action Required</div>
              <div className="text-xs text-amber-700 mt-1">
                This policy expires in {policy.daysUntilExpiration} days. {policy.alternativeQuotes?.length ? `${policy.alternativeQuotes.length} alternative quotes available.` : 'Request quotes now to avoid a coverage gap.'}
              </div>
            </div>
          )}

          {/* AI Summary */}
          <div className="p-4 rounded-xl bg-[#1A2744]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">🤖</span>
              <span className="text-xs font-bold text-[#3B82F6] uppercase tracking-wider">AI Policy Summary</span>
            </div>
            <p className="text-sm text-white/80 leading-relaxed">{policy.aiSummary}</p>
          </div>

          {/* Coverage Gaps */}
          {policy.gapsDetected.length > 0 && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
              <div className="text-sm font-semibold text-red-700 mb-2">⚠️ Coverage Gaps</div>
              <div className="space-y-1">
                {policy.gapsDetected.map((gap, i) => (
                  <div key={i} className="text-xs text-red-600 flex items-center gap-1.5">
                    <span>•</span>{gap}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Coverage Items */}
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A] mb-3">🛡️ Coverage Details</h3>
            <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748B] uppercase">Coverage Type</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#64748B] uppercase">Limit</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#64748B] uppercase">Deductible</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748B] uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {policy.coverageItems.map((item, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 font-medium text-[#0F172A]">{item.type}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[#0F172A]">
                        {item.limit > 0 ? formatCurrency(item.limit) : 'Statutory'}
                      </td>
                      <td className="px-4 py-3 text-right text-[#64748B]">
                        {item.deductible > 0 ? formatCurrency(item.deductible) : '—'}
                      </td>
                      <td className="px-4 py-3 text-[#64748B]">{item.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Year-over-Year Premiums */}
          {yoy.length > 1 && (
            <div>
              <h3 className="text-sm font-semibold text-[#0F172A] mb-3">📈 Premium History</h3>
              <div className="flex items-end gap-3">
                {yoy.map((entry, i) => {
                  const maxPremium = Math.max(...yoy.map(y => y.premium));
                  const height = (entry.premium / maxPremium) * 80;
                  const isLatest = i === yoy.length - 1;
                  return (
                    <div key={entry.year} className="flex flex-col items-center gap-1 flex-1">
                      <span className="text-xs font-bold text-[#0F172A]">{formatCurrency(entry.premium)}</span>
                      <div
                        className="w-full rounded-t-md transition-all"
                        style={{ height: `${height}px`, backgroundColor: isLatest ? '#3B82F6' : '#E2E8F0' }}
                      />
                      <span className="text-xs text-[#64748B]">{entry.year}</span>
                    </div>
                  );
                })}
              </div>
              {yoyChange !== null && (
                <div className="mt-2 text-sm text-center">
                  <span className="text-[#64748B]">YoY change: </span>
                  <span className={cn('font-bold', yoyChange > 5 ? 'text-[#EF4444]' : 'text-[#10B981]')}>
                    {yoyChange > 0 ? '+' : ''}{yoyChange.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Alternative Quotes */}
          {policy.alternativeQuotes && policy.alternativeQuotes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#0F172A] mb-3">💡 Alternative Quotes</h3>
              <div className="space-y-3">
                {policy.alternativeQuotes.map((quote, i) => (
                  <div key={i} className="p-4 rounded-xl bg-green-50 border border-green-200">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold text-sm text-[#0F172A]">{quote.carrier}</div>
                        <div className="text-xs text-[#64748B]">Rating: {quote.rating} · {quote.coverageMatch}% coverage match</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-[#0F172A]">{formatCurrency(quote.premium)}/yr</div>
                        <div className="text-xs font-semibold text-[#10B981]">Save {formatCurrency(quote.savings)}/yr</div>
                      </div>
                    </div>
                    <p className="text-xs text-[#64748B] mb-3">{quote.notes}</p>
                    <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#10B981] hover:bg-green-600 transition-colors">
                      {policy.switchPaperworkReady ? '📄 View Switch Paperwork' : 'Request Switch'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalOverlay>
  );
}

function MetricCard({ label, value, highlight, valueColor }: { label: string; value: React.ReactNode; highlight?: boolean; valueColor?: string }) {
  return (
    <div className={cn('rounded-xl p-4 border', highlight ? 'bg-[#1A2744] border-transparent' : 'bg-[#F8FAFC] border-[#E2E8F0]')}>
      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: highlight ? 'rgba(255,255,255,0.5)' : '#94A3B8' }}>{label}</div>
      <div className={cn('text-base font-bold capitalize', highlight ? 'text-white' : '')} style={!highlight && valueColor ? { color: valueColor } : {}}>
        {value}
      </div>
    </div>
  );
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

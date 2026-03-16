
import React from 'react';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { StatusBadge } from '@/components/ui';
import type { Contract, Invoice } from '@/lib/types';

interface Props {
  contract: Contract;
  invoices: Invoice[];
  onClose: () => void;
  onViewInvoice: (id: string) => void;
}

export function ContractDetailModal({ contract, invoices, onClose, onViewInvoice }: Props) {
  const yoy = contract.yearOverYear;

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex flex-col h-full max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#E2E8F0] flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-[#0F172A] mb-1">{contract.vendorName}</h2>
            <p className="text-sm text-[#64748B]">{contract.description}</p>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#0F172A] text-xl font-light p-1">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Key metrics */}
          <div className="grid grid-cols-4 gap-4">
            <MetricCard label="Total Value" value={formatCurrency(contract.totalContractValue)} highlight />
            <MetricCard label="Billing" value={contract.billingFrequency.replace('_', ' ')} />
            <MetricCard label="Expires" value={contract.daysUntilExpiration != null ? `${contract.daysUntilExpiration} days` : formatDate(contract.endDate)} valueColor={(contract.daysUntilExpiration ?? 999) <= 30 ? '#EF4444' : undefined} />
            <MetricCard label="Auto-Renews" value={contract.autoRenews ? 'Yes' : 'No'} valueColor={contract.autoRenews ? '#F59E0B' : '#10B981'} />
          </div>

          {/* Expiry warning */}
          {(contract.daysUntilExpiration ?? 999) <= 30 && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
              <div className="text-sm font-semibold text-red-700">⏰ Contract Expires Soon</div>
              <div className="text-xs text-red-600 mt-1">
                Expires {formatDate(contract.endDate)} — {contract.autoRenews ? `Auto-renews (${contract.renewalNoticeDays}-day notice required)` : 'Manual renewal required'}
              </div>
            </div>
          )}

          {/* Line Items / Rate Card */}
          <div>
            <h3 className="text-sm font-semibold text-[#0F172A] mb-3">📋 Contract Rate Card</h3>
            <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748B] uppercase">Item</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748B] uppercase">Unit</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#64748B] uppercase">Rate</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#64748B] uppercase">Max Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {contract.lineItems.map((item, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 text-[#0F172A]">{item.description}</td>
                      <td className="px-4 py-3 text-[#64748B]">{item.unit}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[#0F172A]">{formatCurrency(item.unitPrice)}</td>
                      <td className="px-4 py-3 text-right text-[#64748B]">{item.maxQuantity ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Service Verification */}
          {contract.requiresServiceVerification && (
            <div className="p-4 rounded-xl bg-green-50 border border-green-200">
              <div className="text-sm font-semibold text-green-800 mb-1">✅ Service Delivery Verification Active</div>
              <div className="text-xs text-green-700">
                Dominion automatically verifies {contract.serviceVerificationType?.replace(/_/g, ' ')} claims against third-party data sources before approving invoices.
              </div>
            </div>
          )}

          {/* Year-over-Year */}
          {yoy.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#0F172A] mb-3">📈 Year-over-Year Spend</h3>
              <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748B] uppercase">Year</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#64748B] uppercase">Total Spend</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#64748B] uppercase">Invoices</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#64748B] uppercase">Avg Invoice</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#64748B] uppercase">YoY Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {yoy.map((entry, i) => {
                      const prev = yoy[i - 1];
                      const change = prev ? ((entry.totalSpend - prev.totalSpend) / prev.totalSpend) * 100 : null;
                      return (
                        <tr key={entry.year} className={i === yoy.length - 1 ? 'bg-blue-50/30' : ''}>
                          <td className="px-4 py-3 font-medium text-[#0F172A]">{entry.year}{i === yoy.length - 1 ? ' (current)' : ''}</td>
                          <td className="px-4 py-3 text-right font-semibold text-[#0F172A]">{formatCurrency(entry.totalSpend)}</td>
                          <td className="px-4 py-3 text-right text-[#64748B]">{entry.invoiceCount}</td>
                          <td className="px-4 py-3 text-right text-[#64748B]">{formatCurrency(entry.avgInvoiceAmount)}</td>
                          <td className="px-4 py-3 text-right">
                            {change !== null ? (
                              <span className={cn('font-bold text-sm', change > 5 ? 'text-[#EF4444]' : 'text-[#10B981]')}>
                                {change > 0 ? '+' : ''}{change.toFixed(1)}%
                              </span>
                            ) : <span className="text-[#94A3B8]">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Linked Invoices */}
          {invoices.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#0F172A] mb-3">🔗 Linked Invoices ({invoices.length})</h3>
              <div className="space-y-2">
                {invoices.map(inv => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] cursor-pointer hover:bg-[#F1F5F9] transition-colors"
                    onClick={() => { onViewInvoice(inv.id); onClose(); }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-[#64748B]">{inv.invoiceNumber}</span>
                      <span className="text-sm text-[#0F172A]">{formatDate(inv.receivedDate)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={inv.status} />
                      <span className="text-sm font-semibold text-[#0F172A]">{formatCurrency(inv.amount)}</span>
                    </div>
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

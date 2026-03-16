
import React from 'react';
import { useAppStore } from '@/lib/store';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { StatusBadge, ConfidenceBadge, AnomalyCard } from '@/components/ui';
import type { Invoice, Contract } from '@/lib/types';

interface Props {
  invoice: Invoice;
  contract: Contract | null;
  onClose: () => void;
}

export function InvoiceDetailModal({ invoice, contract, onClose }: Props) {
  const { approveInvoice, flagInvoice } = useAppStore();

  const handleApprove = () => {
    approveInvoice(invoice.id);
    onClose();
  };

  const handleFlag = () => {
    flagInvoice(invoice.id);
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="flex flex-col h-full max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#E2E8F0] flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-[#0F172A]">{invoice.vendorName}</h2>
              <StatusBadge status={invoice.status} />
            </div>
            <div className="flex items-center gap-3 text-sm text-[#64748B]">
              <span className="font-mono">{invoice.invoiceNumber}</span>
              <span>·</span>
              <span>Received {formatDate(invoice.receivedDate)}</span>
              <span>·</span>
              <span>via {invoice.source}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#0F172A] text-xl font-light p-1">✕</button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Key metrics */}
          <div className="grid grid-cols-4 gap-4">
            <MetricCard label="Invoice Amount" value={invoice.amount > 0 ? formatCurrency(invoice.amount) : '—'} highlight />
            <MetricCard label="Due Date" value={formatDate(invoice.dueDate)} />
            <MetricCard label="AI Confidence" value={<ConfidenceBadge score={invoice.extractionConfidence} />} />
            <MetricCard label="Anomalies" value={invoice.anomalies.length > 0 ? `${invoice.anomalies.length} detected` : 'None'} valueColor={invoice.anomalies.length > 0 ? '#EF4444' : '#10B981'} />
          </div>

          {/* Anomalies */}
          {invoice.anomalies.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#0F172A] mb-3">⚠️ Anomalies Detected</h3>
              <div className="space-y-3">
                {invoice.anomalies.map(a => <AnomalyCard key={a.id} anomaly={a} />)}
              </div>
            </div>
          )}

          {/* Line Items */}
          {invoice.lineItems.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#0F172A] mb-3">📋 Extracted Line Items</h3>
              <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748B] uppercase">Description</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#64748B] uppercase">Qty</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#64748B] uppercase">Unit Price</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#64748B] uppercase">Total</th>
                      {contract && <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#64748B] uppercase">Contract Rate</th>}
                      {contract && <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#64748B] uppercase">Variance</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {invoice.lineItems.map((item, i) => (
                      <tr key={i} className={cn(item.variance && item.variance > 0 ? 'bg-red-50/50' : '')}>
                        <td className="px-4 py-3 text-[#0F172A]">{item.description}</td>
                        <td className="px-4 py-3 text-right text-[#64748B]">{item.quantity ?? '—'}</td>
                        <td className="px-4 py-3 text-right text-[#64748B]">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-right font-semibold text-[#0F172A]">{formatCurrency(item.total)}</td>
                        {contract && <td className="px-4 py-3 text-right text-[#64748B]">{item.contractedPrice != null ? formatCurrency(item.contractedPrice) : '—'}</td>}
                        {contract && (
                          <td className="px-4 py-3 text-right">
                            {item.variance != null && item.variance !== 0 ? (
                              <span className="text-[#EF4444] font-semibold">+{formatCurrency(item.variance)}</span>
                            ) : (
                              <span className="text-[#10B981]">✓</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#F8FAFC] border-t border-[#E2E8F0]">
                      <td colSpan={contract ? 3 : 3} className="px-4 py-3 text-sm font-semibold text-[#0F172A]">Total</td>
                      <td className="px-4 py-3 text-right font-bold text-[#0F172A]">{formatCurrency(invoice.amount)}</td>
                      {contract && <td />}
                      {contract && <td />}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Missing fields */}
          {invoice.missingFields && invoice.missingFields.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <div className="text-sm font-semibold text-amber-800 mb-2">📭 Incomplete Invoice</div>
              <div className="flex flex-wrap gap-2 mb-3">
                {invoice.missingFields.map(f => (
                  <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                    Missing: {f.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
              <button className="text-xs font-medium text-amber-700 hover:underline">
                📧 Resend auto-response request →
              </button>
            </div>
          )}

          {/* Contract match */}
          {contract && (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
              <div className="text-sm font-semibold text-blue-800 mb-1">📋 Matched Contract: {contract.vendorName}</div>
              <div className="text-xs text-blue-700">{contract.description} · {formatCurrency(contract.totalContractValue)} total value</div>
            </div>
          )}
        </div>

        {/* Actions */}
        {(invoice.status === 'pending' || invoice.status === 'flagged') && (
          <div className="flex items-center gap-3 p-6 border-t border-[#E2E8F0] flex-shrink-0">
            <button
              onClick={handleApprove}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#10B981] hover:bg-green-600 transition-colors"
            >
              ✓ Approve Invoice
            </button>
            <button
              onClick={handleFlag}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-[#EF4444] bg-red-50 hover:bg-red-100 transition-colors"
            >
              ⚑ Flag for Review
            </button>
            <button onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-medium text-[#64748B] bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-colors">
              Cancel
            </button>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}

function MetricCard({ label, value, highlight, valueColor }: { label: string; value: React.ReactNode; highlight?: boolean; valueColor?: string }) {
  return (
    <div className={cn('rounded-xl p-4 border', highlight ? 'bg-[#1A2744] border-transparent' : 'bg-[#F8FAFC] border-[#E2E8F0]')}>
      <div className="text-[10px] uppercase tracking-wider mb-1" style={{ color: highlight ? 'rgba(255,255,255,0.5)' : '#94A3B8' }}>{label}</div>
      <div className={cn('text-base font-bold', highlight ? 'text-white' : '')} style={!highlight && valueColor ? { color: valueColor } : {}}>
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

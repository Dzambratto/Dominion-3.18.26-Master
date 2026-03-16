
import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { formatCurrency, formatDate, statusColor, statusLabel } from '@/lib/utils';
import { StatusBadge, ConfidenceBadge } from '@/components/ui';
import type { Invoice, InvoiceStatus } from '@/lib/types';

const FILTERS: { label: string; value: InvoiceStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Flagged', value: 'flagged' },
  { label: 'Incomplete', value: 'incomplete' },
  { label: 'Approved', value: 'approved' },
  { label: 'Paid', value: 'paid' },
];

export function InvoicesView({ onViewInvoice }: { onViewInvoice: (id: string) => void }) {
  const { state } = useAppStore();
  const [filter, setFilter] = useState<InvoiceStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return state.invoices.filter(inv => {
      const matchesFilter = filter === 'all' || inv.status === filter;
      const matchesSearch = !search || inv.vendorName.toLowerCase().includes(search.toLowerCase()) ||
        inv.invoiceNumber.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [state.invoices, filter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: state.invoices.length };
    state.invoices.forEach(inv => { c[inv.status] = (c[inv.status] ?? 0) + 1; });
    return c;
  }, [state.invoices]);

  return (
    <div className="p-6">
      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">All Invoices</h2>
          <p className="text-sm text-[#64748B]">{state.invoices.length} invoices · AI-extracted and verified</p>
        </div>
        <button className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#3B82F6] hover:bg-blue-600 transition-colors">
          + Upload Invoice
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search vendor or invoice #"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20 focus:border-[#3B82F6]"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-[#F1F5F9] rounded-lg p-1">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filter === f.value
                  ? 'bg-white text-[#0F172A] shadow-sm'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              {f.label}
              {counts[f.value] != null && (
                <span className="ml-1 text-[10px] text-[#94A3B8]">({counts[f.value]})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Vendor</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Invoice #</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Amount</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Due Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">AI Confidence</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Anomalies</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {filtered.map(inv => (
              <InvoiceRow key={inv.id} invoice={inv} onClick={() => onViewInvoice(inv.id)} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-[#64748B]">No invoices match your filters.</div>
        )}
      </div>
    </div>
  );
}

function InvoiceRow({ invoice, onClick }: { invoice: Invoice; onClick: () => void }) {
  return (
    <tr
      className="hover:bg-[#F8FAFC] cursor-pointer transition-colors"
      onClick={onClick}
    >
      <td className="px-4 py-3">
        <div className="font-medium text-sm text-[#0F172A]">{invoice.vendorName}</div>
        <div className="text-xs text-[#94A3B8]">{invoice.source}</div>
      </td>
      <td className="px-4 py-3 text-sm text-[#64748B] font-mono">{invoice.invoiceNumber || '—'}</td>
      <td className="px-4 py-3 text-right">
        <span className="text-sm font-semibold text-[#0F172A]">
          {invoice.amount > 0 ? formatCurrency(invoice.amount) : '—'}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-[#64748B]">{formatDate(invoice.dueDate)}</td>
      <td className="px-4 py-3">
        <StatusBadge status={invoice.status} />
      </td>
      <td className="px-4 py-3">
        <ConfidenceBadge score={invoice.extractionConfidence} />
      </td>
      <td className="px-4 py-3">
        {invoice.anomalies.length > 0 ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600">
            ⚠️ {invoice.anomalies.length}
          </span>
        ) : (
          <span className="text-[11px] text-[#10B981] font-medium">✓ Clean</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <button className="text-xs text-[#3B82F6] hover:underline font-medium">Review →</button>
      </td>
    </tr>
  );
}

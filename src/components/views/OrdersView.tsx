
import React, { useState, useMemo } from 'react';
import { MOCK_ORDERS } from '@/lib/mock-data';
import type { DeliveryOrder, OrderStatus } from '@/lib/types';

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  new:              { label: 'New',            color: '#3B82F6', bg: '#EFF6FF' },
  pending_approval: { label: 'Needs Approval', color: '#F59E0B', bg: '#FFFBEB' },
  confirmed:        { label: 'Confirmed',      color: '#10B981', bg: '#ECFDF5' },
  dispatched:       { label: 'Dispatched',     color: '#6366F1', bg: '#EEF2FF' },
  delivered:        { label: 'Delivered',      color: '#10B981', bg: '#ECFDF5' },
  flagged:          { label: 'Flagged',        color: '#EF4444', bg: '#FEF2F2' },
  incomplete:       { label: 'Incomplete',     color: '#64748B', bg: '#F8FAFC' },
};

const FILTERS: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Needs Approval', value: 'pending_approval' },
  { label: 'Flagged', value: 'flagged' },
  { label: 'New', value: 'new' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Dispatched', value: 'dispatched' },
  { label: 'Delivered', value: 'delivered' },
];

function formatDT(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.95 ? '#10B981' : score >= 0.85 ? '#F59E0B' : '#EF4444';
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color }}>
      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: color }} />
      {pct}%
    </span>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

function OrderRow({ order, onClick }: { order: DeliveryOrder; onClick: () => void }) {
  const openAnomalies = order.anomalies.filter(a => !a.resolved).length;
  const hasHigh = order.anomalies.some(a => a.severity === 'high' && !a.resolved);

  return (
    <tr
      className="hover:bg-[#F8FAFC] cursor-pointer transition-colors"
      onClick={onClick}
      style={hasHigh ? { borderLeft: '3px solid #EF4444' } : {}}
    >
      {/* Route */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div>
            <div className="font-semibold text-sm text-[#0F172A]">
              {order.shipper.city}, {order.shipper.state}
            </div>
            <div className="text-xs text-[#94A3B8] truncate max-w-[140px]">{order.shipper.name}</div>
          </div>
          <span className="text-[#3B82F6] text-sm font-bold">→</span>
          <div>
            <div className="font-semibold text-sm text-[#0F172A]">
              {order.consignee.city}, {order.consignee.state}
            </div>
            <div className="text-xs text-[#94A3B8] truncate max-w-[140px]">{order.consignee.name}</div>
          </div>
        </div>
      </td>
      {/* BOL */}
      <td className="px-4 py-3">
        <span className="text-sm font-mono text-[#64748B]">{order.bolNumber}</span>
      </td>
      {/* Cargo */}
      <td className="px-4 py-3">
        <div className="text-sm text-[#0F172A] font-medium">{order.totalPieces} pcs · {order.totalWeightLbs.toLocaleString()} lbs</div>
        <div className="text-xs text-[#94A3B8] truncate max-w-[160px]">{order.cargoItems[0]?.description}</div>
      </td>
      {/* Rate */}
      <td className="px-4 py-3 text-right">
        {order.quotedRate ? (
          <span className="text-sm font-semibold text-[#10B981]">${order.quotedRate.toLocaleString()}</span>
        ) : (
          <span className="text-sm font-semibold text-[#EF4444]">No Rate</span>
        )}
      </td>
      {/* Pickup */}
      <td className="px-4 py-3">
        <div className="text-xs text-[#64748B]">{formatDT(order.pickupReady)}</div>
        <div className="text-xs text-[#94A3B8]">Close: {new Date(order.pickupClose).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</div>
      </td>
      {/* Status */}
      <td className="px-4 py-3">
        <StatusBadge status={order.status} />
      </td>
      {/* Confidence */}
      <td className="px-4 py-3">
        <ConfidenceBadge score={order.extractionConfidence} />
      </td>
      {/* Anomalies */}
      <td className="px-4 py-3">
        {openAnomalies > 0 ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600">
            ⚠️ {openAnomalies}
          </span>
        ) : (
          <span className="text-[11px] text-[#10B981] font-medium">✓ Clean</span>
        )}
      </td>
      {/* Action */}
      <td className="px-4 py-3 text-right">
        <button className="text-xs text-[#3B82F6] hover:underline font-medium">Review →</button>
      </td>
    </tr>
  );
}

export function OrdersView({ onViewOrder }: { onViewOrder: (id: string) => void }) {
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const orders = MOCK_ORDERS;

  const filtered = useMemo(() => {
    return orders.filter(o => {
      const matchesFilter = filter === 'all' || o.status === filter;
      const q = search.toLowerCase();
      const matchesSearch = !search ||
        o.bolNumber.toLowerCase().includes(q) ||
        o.shipper.name.toLowerCase().includes(q) ||
        o.consignee.name.toLowerCase().includes(q) ||
        o.cargoItems.some(c => c.description.toLowerCase().includes(q));
      return matchesFilter && matchesSearch;
    });
  }, [orders, filter, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    orders.forEach(o => { c[o.status] = (c[o.status] ?? 0) + 1; });
    return c;
  }, [orders]);

  const needsApproval = orders.filter(o => o.status === 'pending_approval').length;
  const flaggedCount = orders.filter(o => o.status === 'flagged').length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">Order Automation</h2>
          <p className="text-sm text-[#64748B]">
            {orders.length} orders · AI-extracted from email
            {needsApproval > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-600">
                {needsApproval} need approval
              </span>
            )}
            {flaggedCount > 0 && (
              <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600">
                {flaggedCount} flagged
              </span>
            )}
          </p>
        </div>
        <button className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#3B82F6] hover:bg-blue-600 transition-colors">
          + Upload Order
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'New Orders', value: counts['new'] ?? 0, color: '#3B82F6', bg: '#EFF6FF' },
          { label: 'Needs Approval', value: counts['pending_approval'] ?? 0, color: '#F59E0B', bg: '#FFFBEB' },
          { label: 'Flagged', value: counts['flagged'] ?? 0, color: '#EF4444', bg: '#FEF2F2' },
          { label: 'Dispatched', value: counts['dispatched'] ?? 0, color: '#6366F1', bg: '#EEF2FF' },
        ].map(card => (
          <div
            key={card.label}
            className="rounded-xl border p-4 cursor-pointer hover:shadow-sm transition-shadow"
            style={{ backgroundColor: card.bg, borderColor: card.color + '30' }}
          >
            <div className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</div>
            <div className="text-xs font-medium mt-1" style={{ color: card.color }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8] text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search BOL, shipper, consignee, cargo"
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

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Route</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">BOL #</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Cargo</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Rate</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Pickup</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">AI Conf.</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Issues</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {filtered.map(order => (
              <OrderRow key={order.id} order={order} onClick={() => onViewOrder(order.id)} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-[#64748B]">No orders match your filters.</div>
        )}
      </div>
    </div>
  );
}

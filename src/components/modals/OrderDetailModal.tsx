
import React, { useState } from 'react';
import { MOCK_ORDERS } from '@/lib/mock-data';
import type { OrderAnomaly, OrderAnomalyType, OrderParty } from '@/lib/types';

const ANOMALY_LABELS: Record<OrderAnomalyType, string> = {
  missing_rate:        'Missing Rate',
  duplicate_bol:       'Duplicate BOL',
  tight_window:        'Tight Pickup Window',
  third_party_billing: 'Third-Party Billing',
  missing_fields:      'Missing Fields',
  weight_mismatch:     'Weight Mismatch',
  address_unverified:  'Address Unverified',
};

function formatDT(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] mb-3 mt-5">
      {children}
    </div>
  );
}

function InfoRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between items-start py-2.5 border-b border-[#F1F5F9] last:border-0">
      <span className="text-sm text-[#64748B] font-medium">{label}</span>
      <span className={`text-sm font-semibold text-right max-w-[60%] ${valueClass ?? 'text-[#0F172A]'}`}>
        {value}
      </span>
    </div>
  );
}

function AnomalyCard({ anomaly }: { anomaly: OrderAnomaly }) {
  const colors = {
    high:   { border: '#EF4444', bg: '#FEF2F2', text: '#EF4444', badge: '#EF4444' },
    medium: { border: '#F59E0B', bg: '#FFFBEB', text: '#F59E0B', badge: '#F59E0B' },
    low:    { border: '#94A3B8', bg: '#F8FAFC', text: '#64748B', badge: '#94A3B8' },
  }[anomaly.severity];

  return (
    <div
      className="rounded-xl p-4 mb-3 border"
      style={{ backgroundColor: colors.bg, borderColor: colors.border }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-sm font-bold" style={{ color: colors.text }}>
          ⚠️ {ANOMALY_LABELS[anomaly.type]}
        </span>
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white ml-auto"
          style={{ backgroundColor: colors.badge }}
        >
          {anomaly.severity.toUpperCase()}
        </span>
      </div>
      <p className="text-sm text-[#374151] leading-relaxed">{anomaly.description}</p>
    </div>
  );
}

function PartyBlock({ title, party }: { title: string; party: OrderParty }) {
  return (
    <div className="bg-[#F8FAFC] rounded-xl p-4 border border-[#E2E8F0]">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] mb-2">{title}</div>
      <div className="font-semibold text-[#0F172A]">{party.name}</div>
      {party.locationCode && <div className="text-xs text-[#64748B] mt-0.5">Location: {party.locationCode}</div>}
      <div className="text-xs text-[#64748B] mt-1 leading-relaxed">
        {party.address}<br />
        {party.city}, {party.state} {party.zip} · {party.country}
      </div>
      {party.phone && <div className="text-xs text-[#3B82F6] mt-1 font-medium">{party.phone}</div>}
      {party.email && <div className="text-xs text-[#3B82F6] font-medium">{party.email}</div>}
    </div>
  );
}

export function OrderDetailModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const order = MOCK_ORDERS.find(o => o.id === orderId);
  const [confirmed, setConfirmed] = useState(false);
  const [rateSent, setRateSent] = useState(false);

  if (!order) return null;

  const openAnomalies = order.anomalies.filter(a => !a.resolved);
  const hasHighAnomaly = openAnomalies.some(a => a.severity === 'high');
  const confPct = Math.round(order.extractionConfidence * 100);
  const confColor = order.extractionConfidence >= 0.95 ? '#10B981' : order.extractionConfidence >= 0.85 ? '#F59E0B' : '#EF4444';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-[#0F172A]">BOL {order.bolNumber}</span>
              <span
                className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
                style={{
                  backgroundColor: order.status === 'flagged' ? '#FEF2F2' : order.status === 'pending_approval' ? '#FFFBEB' : '#ECFDF5',
                  color: order.status === 'flagged' ? '#EF4444' : order.status === 'pending_approval' ? '#F59E0B' : '#10B981',
                }}
              >
                {order.status === 'pending_approval' ? 'Needs Approval' : order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
            </div>
            <div className="text-xs text-[#64748B] mt-0.5">
              Received {formatDT(order.receivedDate)} · via {order.source}
              {order.rawEmailSubject && <span className="ml-1">· "{order.rawEmailSubject}"</span>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#64748B] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 px-6 pb-6">

          {/* AI Confidence */}
          <div className="flex items-center justify-between bg-[#F8FAFC] rounded-xl p-4 mt-5 border border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: confColor }} />
              <span className="text-sm font-semibold text-[#0F172A]">AI Extraction Confidence</span>
            </div>
            <span className="text-2xl font-bold" style={{ color: confColor }}>{confPct}%</span>
          </div>

          {/* Anomalies */}
          {openAnomalies.length > 0 && (
            <>
              <SectionLabel>{openAnomalies.length} Issue{openAnomalies.length > 1 ? 's' : ''} Detected</SectionLabel>
              {openAnomalies.map(a => <AnomalyCard key={a.id} anomaly={a} />)}
            </>
          )}

          {/* Auto-response */}
          {order.autoResponseSent && (
            <div className="flex items-start gap-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4 mt-4">
              <span className="text-lg">📧</span>
              <div className="flex-1">
                <div className="text-sm font-bold text-[#1E40AF]">Auto-Response Sent</div>
                <div className="text-xs text-[#3B82F6] mt-0.5">
                  Requested: {order.missingFields?.join(', ')}
                </div>
              </div>
              <button
                onClick={() => alert('Follow-up request sent to carrier.')}
                className="px-3 py-1.5 bg-[#3B82F6] text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition-colors"
              >
                Resend
              </button>
            </div>
          )}

          {/* Route */}
          <SectionLabel>Route</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <PartyBlock title="Pickup From" party={order.shipper} />
            <PartyBlock title="Deliver To" party={order.consignee} />
          </div>
          {order.thirdPartyBillTo && (
            <div className="mt-3">
              <PartyBlock title="Third-Party Bill To" party={order.thirdPartyBillTo} />
            </div>
          )}

          {/* Schedule */}
          <SectionLabel>Schedule</SectionLabel>
          <div className="bg-white rounded-xl border border-[#E2E8F0] px-4 divide-y divide-[#F1F5F9]">
            <InfoRow label="Pickup Ready" value={formatDT(order.pickupReady)} />
            <InfoRow label="Pickup Close" value={formatDT(order.pickupClose)} />
            <InfoRow label="Projected Delivery" value={formatDT(order.projectedDelivery)} valueClass="text-[#10B981]" />
          </div>

          {/* Cargo */}
          <SectionLabel>Cargo</SectionLabel>
          <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Description</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Pcs</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Weight</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Class</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Hazmat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {order.cargoItems.map((item, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 text-sm font-medium text-[#0F172A]">{item.description}</td>
                    <td className="px-4 py-3 text-sm text-right text-[#64748B]">{item.pieces}</td>
                    <td className="px-4 py-3 text-sm text-right text-[#64748B]">
                      {item.weightLbs.toLocaleString()} lbs
                      {item.weightKg && <span className="text-[#94A3B8]"> / {item.weightKg} kg</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-[#64748B]">{item.freightClass ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      {item.hazmat
                        ? <span className="text-red-600 font-bold">YES</span>
                        : <span className="text-[#10B981]">No</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financials */}
          <SectionLabel>Financials</SectionLabel>
          <div className="bg-white rounded-xl border border-[#E2E8F0] px-4 divide-y divide-[#F1F5F9]">
            <InfoRow
              label="Quoted Rate"
              value={order.quotedRate ? `$${order.quotedRate.toLocaleString()} ${order.currency ?? 'USD'}` : 'NOT CONFIRMED'}
              valueClass={order.quotedRate ? 'text-[#10B981]' : 'text-[#EF4444]'}
            />
            {order.carrierQuoteRef && <InfoRow label="Quote Reference" value={order.carrierQuoteRef} />}
            {order.billingPortal && <InfoRow label="Billing Portal" value={order.billingPortal} />}
          </div>

          {/* References */}
          <SectionLabel>References</SectionLabel>
          <div className="bg-white rounded-xl border border-[#E2E8F0] px-4 divide-y divide-[#F1F5F9]">
            {order.references.map((ref, i) => (
              <InfoRow key={i} label={ref.label} value={ref.value} />
            ))}
          </div>

          {/* Carrier Contact */}
          {order.carrierContact && (
            <>
              <SectionLabel>Carrier Contact</SectionLabel>
              <div className="bg-white rounded-xl border border-[#E2E8F0] px-4 divide-y divide-[#F1F5F9]">
                <InfoRow label="Name" value={order.carrierContact.name} />
                <InfoRow label="Email" value={order.carrierContact.email} valueClass="text-[#3B82F6]" />
                <InfoRow label="Phone" value={order.carrierContact.phone} valueClass="text-[#3B82F6]" />
              </div>
            </>
          )}

          {/* AI Notes */}
          {order.aiNotes && (
            <>
              <SectionLabel>AI Analysis</SectionLabel>
              <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4 flex gap-3">
                <span className="text-lg">✨</span>
                <p className="text-sm text-[#1E40AF] leading-relaxed">{order.aiNotes}</p>
              </div>
            </>
          )}
        </div>

        {/* Action Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex-shrink-0">
          {!order.quotedRate && !rateSent && (
            <button
              onClick={() => { setRateSent(true); alert('Rate request sent to carrier.'); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#3B82F6] text-[#3B82F6] hover:bg-[#EFF6FF] transition-colors"
            >
              📧 Request Rate
            </button>
          )}
          {rateSent && (
            <span className="text-sm text-[#3B82F6] font-medium">✓ Rate request sent</span>
          )}
          <button
            onClick={() => alert('Order flagged for review.')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#EF4444] text-[#EF4444] hover:bg-red-50 transition-colors"
          >
            🚩 Flag Issue
          </button>
          <div className="flex-1" />
          {!confirmed ? (
            <button
              onClick={() => {
                if (hasHighAnomaly) {
                  alert('Resolve all high-severity issues before confirming this order.');
                  return;
                }
                setConfirmed(true);
                alert('Order confirmed. Carrier has been notified.');
              }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-colors ${
                hasHighAnomaly
                  ? 'bg-[#94A3B8] cursor-not-allowed'
                  : 'bg-[#3B82F6] hover:bg-blue-600'
              }`}
            >
              ✓ {hasHighAnomaly ? 'Resolve Issues First' : 'Confirm & Dispatch'}
            </button>
          ) : (
            <div className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#ECFDF5] border border-[#10B981]">
              <span className="text-[#10B981] text-sm font-bold">✓ Order Confirmed — Carrier Notified</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

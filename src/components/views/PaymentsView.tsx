
import React from 'react';
import { useAppStore } from '@/lib/store';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import type { Payment } from '@/lib/types';

export function PaymentsView() {
  const { state, approvePayment } = useAppStore();

  const pending = state.payments.filter(p => p.status === 'pending_approval');
  const approved = state.payments.filter(p => p.status === 'approved' || p.status === 'scheduled' || p.status === 'sent');
  const totalPending = pending.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="p-6 max-w-4xl">
      {/* Trust Banner */}
      <div className="mb-5 p-4 rounded-xl bg-[#1A2744] flex items-center gap-3">
        <span className="text-2xl">🔒</span>
        <div>
          <div className="text-white font-semibold text-sm">Human Approval Required</div>
          <div className="text-white/60 text-xs">Dominion prepares payment instructions — no autonomous payments. Every payment requires your explicit approval.</div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">Payment Queue</h2>
          <p className="text-sm text-[#64748B]">
            {pending.length} pending approval · {formatCurrency(totalPending)} total
          </p>
        </div>
      </div>

      {/* Pending Approvals */}
      {pending.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold tracking-widest uppercase text-[#F59E0B]">Pending Approval</span>
            <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white bg-[#F59E0B]">{pending.length}</span>
          </div>
          <div className="space-y-3">
            {pending.map(payment => (
              <PaymentCard key={payment.id} payment={payment} onApprove={() => approvePayment(payment.id)} />
            ))}
          </div>
        </div>
      )}

      {/* Approved / Sent */}
      {approved.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold tracking-widest uppercase text-[#10B981]">Approved / Sent</span>
          </div>
          <div className="space-y-3">
            {approved.map(payment => (
              <PaymentCard key={payment.id} payment={payment} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentCard({ payment, onApprove }: { payment: Payment; onApprove?: () => void }) {
  const isPending = payment.status === 'pending_approval';
  const qbColor = payment.quickbooksStatus === 'synced' ? '#10B981' : payment.quickbooksStatus === 'error' ? '#EF4444' : '#F59E0B';
  const methodIcons: Record<string, string> = { ach: '🏦', check: '📝', wire: '⚡', credit_card: '💳' };

  return (
    <div className={cn(
      'bg-white rounded-xl border overflow-hidden',
      isPending ? 'border-[#F59E0B]/40' : 'border-[#E2E8F0]'
    )}>
      {isPending && <div className="h-0.5 bg-[#F59E0B]" />}
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm text-[#0F172A]">{payment.vendorName}</span>
              <span className="text-xs text-[#94A3B8] font-mono">{payment.invoiceNumber}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#64748B]">
              <span>{methodIcons[payment.paymentMethod]} {payment.paymentMethod.replace('_', ' ').toUpperCase()}</span>
              {payment.bankAccount && <span>Account {payment.bankAccount}</span>}
              <span>Due {formatDate(payment.dueDate)}</span>
            </div>
            {payment.notes && (
              <p className="mt-2 text-xs text-[#64748B] bg-[#F8FAFC] rounded-lg px-3 py-2">{payment.notes}</p>
            )}
          </div>
          <div className="text-right ml-4">
            <div className="text-xl font-bold text-[#0F172A]">{formatCurrency(payment.amount)}</div>
            <div className="flex items-center gap-1.5 justify-end mt-1">
              <span className="text-[10px] font-medium" style={{ color: qbColor }}>
                QB: {payment.quickbooksStatus}
              </span>
            </div>
          </div>
        </div>

        {isPending && onApprove && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#E2E8F0]">
            <button
              onClick={onApprove}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#10B981] hover:bg-green-600 transition-colors"
            >
              ✓ Approve Payment
            </button>
            <button className="px-4 py-2 rounded-lg text-sm font-medium text-[#64748B] bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-colors">
              Hold
            </button>
            <button className="px-4 py-2 rounded-lg text-sm font-medium text-[#EF4444] bg-red-50 hover:bg-red-100 transition-colors">
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

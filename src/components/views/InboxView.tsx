
import React from 'react';
import { useAppStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import type { InboxAlert } from '@/lib/types';

interface InboxViewProps {
  onViewInvoice: (id: string) => void;
  onViewPolicy: (id: string) => void;
  onViewContract: (id: string) => void;
  onUpload?: () => void;
  onConnectEmail?: () => void;
}

const PRIORITY_CONFIG = {
  urgent: { color: '#EF4444', bg: '#FEF2F2', border: '#FECACA', label: 'URGENT' },
  review: { color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', label: 'REVIEW' },
  info:   { color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', label: 'INFO' },
};

export function InboxView({ onViewInvoice, onViewPolicy, onViewContract, onUpload, onConnectEmail }: InboxViewProps) {
  const { state, dismissAlert, triggerScan } = useAppStore();
  const s = state.summary;

  const activeAlerts = state.alerts.filter(a => !a.dismissed);
  const urgent = activeAlerts.filter(a => a.priority === 'urgent');
  const review = activeAlerts.filter(a => a.priority === 'review');
  const info   = activeAlerts.filter(a => a.priority === 'info');

  const handleAlertAction = (alert: InboxAlert) => {
    if (alert.invoiceId) onViewInvoice(alert.invoiceId);
    else if (alert.policyId) onViewPolicy(alert.policyId);
    else if (alert.contractId) onViewContract(alert.contractId);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <SummaryCard icon="📄" label="Pending Approvals" value={s.pendingApprovals} color="#F59E0B" />
        <SummaryCard icon="⚡" label="Anomalies Detected" value={s.anomaliesDetected} color="#EF4444" />
        <SummaryCard icon="🔄" label="Renewals Due Soon" value={s.renewalsDueSoon} color="#3B82F6" />
        <SummaryCard icon="🛡️" label="Coverage Gaps" value={s.coverageGaps} color="#8B5CF6" />
      </div>

      {/* AI Scan Banner */}
      <div className="rounded-2xl bg-[#1A2744] p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-[11px] font-bold text-[#10B981] tracking-widest uppercase">AI Scan Complete</span>
            <span className="text-white/40 text-xs">{s.aiScansToday} scans today</span>
          </div>
          <button
            onClick={triggerScan}
            disabled={state.isScanning}
            className="text-xs text-[#3B82F6] hover:text-blue-400 font-medium disabled:opacity-50"
          >
            {state.isScanning ? 'Scanning…' : '↻ Rescan'}
          </button>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {s.pendingApprovals > 0 && (
            <span className="text-white text-sm">{s.pendingApprovals} invoice{s.pendingApprovals > 1 ? 's' : ''} ready for approval</span>
          )}
          {s.anomaliesDetected > 0 && (
            <span className="text-[#EF4444] text-sm font-medium">{s.anomaliesDetected} anomalie{s.anomaliesDetected > 1 ? 's' : ''} detected</span>
          )}
          {s.renewalsDueSoon > 0 && (
            <span className="text-[#F59E0B] text-sm">{s.renewalsDueSoon} renewal{s.renewalsDueSoon > 1 ? 's' : ''} due soon</span>
          )}
          {s.coverageGaps > 0 && (
            <span className="text-[#8B5CF6] text-sm">{s.coverageGaps} coverage gap{s.coverageGaps > 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="mt-2 text-white/50 text-sm">
          {formatCurrency(s.totalPayableThisWeek)} payable this week · {formatCurrency(s.monthlySavingsIdentified)} savings identified this month
        </div>
      </div>

      {/* Alert Sections */}
      {activeAlerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-4">🚀</div>
          <div className="text-xl font-bold text-[#0F172A] mb-3">Welcome to Dominion</div>
          <div className="text-sm text-[#64748B] max-w-md mb-8 leading-relaxed">
            Your AI financial controller is ready. Upload your first document or connect your email inbox to get started.
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {onUpload && (
              <button
                onClick={onUpload}
                className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-[#3B82F6] hover:bg-blue-600 transition-colors"
              >
                ↑ Upload a Document
              </button>
            )}
            <button
              onClick={onConnectEmail}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-[#0F172A] bg-[#F1F5F9] border border-[#E2E8F0] hover:bg-[#E2E8F0] transition-colors"
            >
              📧 Connect Email
            </button>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-4 max-w-lg">
            {[
              { icon: '📄', label: 'Upload invoices', desc: 'AI extracts vendor, amount, due date' },
              { icon: '📋', label: 'Upload contracts', desc: 'AI tracks terms, renewals, compliance' },
              { icon: '🛡️', label: 'Upload policies', desc: 'AI monitors coverage gaps & renewals' },
            ].map(item => (
              <div key={item.label} className="bg-white rounded-xl p-4 border border-[#E2E8F0] text-center">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-xs font-semibold text-[#0F172A] mb-1">{item.label}</div>
                <div className="text-[11px] text-[#94A3B8] leading-relaxed">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {urgent.length > 0 && (
            <AlertSection title="URGENT ACTION REQUIRED" count={urgent.length} color="#EF4444" alerts={urgent} onAction={handleAlertAction} onDismiss={dismissAlert} />
          )}
          {review.length > 0 && (
            <AlertSection title="NEEDS REVIEW" count={review.length} color="#F59E0B" alerts={review} onAction={handleAlertAction} onDismiss={dismissAlert} />
          )}
          {info.length > 0 && (
            <AlertSection title="FOR YOUR AWARENESS" count={info.length} color="#3B82F6" alerts={info} onAction={handleAlertAction} onDismiss={dismissAlert} />
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-[#E2E8F0]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-2xl font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="text-xs text-[#64748B] font-medium">{label}</div>
    </div>
  );
}

function AlertSection({ title, count, color, alerts, onAction, onDismiss }: {
  title: string; count: number; color: string;
  alerts: InboxAlert[];
  onAction: (alert: InboxAlert) => void;
  onDismiss: (id: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-bold tracking-widest uppercase" style={{ color }}>{title}</span>
        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: color }}>
          {count}
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {alerts.map(alert => (
          <AlertCard key={alert.id} alert={alert} onAction={onAction} onDismiss={onDismiss} />
        ))}
      </div>
    </div>
  );
}

function AlertCard({ alert, onAction, onDismiss }: {
  alert: InboxAlert;
  onAction: (alert: InboxAlert) => void;
  onDismiss: (id: string) => void;
}) {
  const cfg = PRIORITY_CONFIG[alert.priority];

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-1" style={{ backgroundColor: cfg.color }} />
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <span
            className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full"
            style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
          >
            {cfg.label}
          </span>
          {alert.amount != null && (
            <span className="text-sm font-bold text-[#0F172A]">{formatCurrency(alert.amount)}</span>
          )}
        </div>
        <h3 className="text-sm font-semibold text-[#0F172A] mb-1 leading-snug">{alert.title}</h3>
        <p className="text-xs text-[#64748B] mb-3 leading-relaxed">{alert.subtitle}</p>
        <div className="flex items-center gap-2">
          {(alert.invoiceId || alert.policyId || alert.contractId) && (
            <button
              onClick={() => onAction(alert)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#3B82F6] hover:bg-blue-600 transition-colors"
            >
              {alert.actionLabel}
            </button>
          )}
          {alert.secondaryActionLabel && (
            <button
              onClick={() => onDismiss(alert.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#64748B] bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-colors"
            >
              {alert.secondaryActionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

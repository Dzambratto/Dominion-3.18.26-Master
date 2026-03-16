
import React from 'react';
import { cn, statusColor, statusLabel } from '@/lib/utils';

export function Badge({ label, color, size = 'sm' }: { label: string; color: string; size?: 'xs' | 'sm' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-full',
        size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'
      )}
      style={{ backgroundColor: color + '18', color }}
    >
      {label}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge label={statusLabel(status)} color={statusColor(status)} />;
}

export function ConfidenceBadge({ score }: { score: number }) {
  const color = score >= 0.92 ? '#10B981' : score >= 0.75 ? '#F59E0B' : '#EF4444';
  const label = score >= 0.92 ? 'High' : score >= 0.75 ? 'Medium' : 'Low';
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: color + '18', color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {Math.round(score * 100)}% {label}
    </span>
  );
}

export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="text-base font-semibold text-[#0F172A]">{title}</h2>
        {subtitle && <p className="text-sm text-[#64748B] mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <div className="text-base font-semibold text-[#0F172A] mb-1">{title}</div>
      <div className="text-sm text-[#64748B] max-w-xs">{subtitle}</div>
    </div>
  );
}

export function AnomalyCard({ anomaly }: { anomaly: { type: string; severity: string; description: string; expectedValue?: number; actualValue?: number; percentageVariance?: number; recommendation: string } }) {
  const severityColor = anomaly.severity === 'high' ? '#EF4444' : anomaly.severity === 'medium' ? '#F59E0B' : '#3B82F6';
  const icons: Record<string, string> = {
    price_increase: '📈',
    duplicate: '⚠️',
    contract_mismatch: '⚡',
    incomplete: '📭',
    service_mismatch: '❄️',
    overpayment: '💸',
  };

  return (
    <div
      className="rounded-xl p-4 border"
      style={{ backgroundColor: severityColor + '08', borderColor: severityColor + '30' }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span>{icons[anomaly.type] ?? '⚠️'}</span>
        <span className="text-xs font-bold tracking-wider uppercase" style={{ color: severityColor }}>
          {anomaly.type.replace(/_/g, ' ')}
        </span>
        <span
          className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase"
          style={{ backgroundColor: severityColor + '20', color: severityColor }}
        >
          {anomaly.severity}
        </span>
      </div>
      <p className="text-sm text-[#0F172A] mb-2">{anomaly.description}</p>
      {anomaly.expectedValue != null && anomaly.actualValue != null && (
        <div className="flex items-center gap-3 mb-2">
          <div className="text-center">
            <div className="text-[10px] text-[#64748B] uppercase">Expected</div>
            <div className="text-sm font-bold text-[#10B981]">${anomaly.expectedValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>
          <div className="text-[#94A3B8]">→</div>
          <div className="text-center">
            <div className="text-[10px] text-[#64748B] uppercase">Billed</div>
            <div className="text-sm font-bold text-[#EF4444]">${anomaly.actualValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>
          {anomaly.percentageVariance != null && (
            <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
              +{anomaly.percentageVariance}%
            </span>
          )}
        </div>
      )}
      <div className="flex items-start gap-1.5 mt-2 p-2.5 rounded-lg bg-white/60">
        <span className="text-xs">💡</span>
        <p className="text-xs text-[#64748B]">{anomaly.recommendation}</p>
      </div>
    </div>
  );
}

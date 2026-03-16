
import React from 'react';

import { cn, formatCurrency } from '@/lib/utils';
import type { ViewId } from './DashboardShell';
import type { AppSummary } from '@/lib/types';

interface NavItem {
  id: ViewId;
  label: string;
  icon: string;
  badge?: number;
}

interface SidebarProps {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
  alertCount: number;
  summary: AppSummary;
}

export function Sidebar({ activeView, onNavigate, alertCount, summary }: SidebarProps) {
  const navItems: NavItem[] = [
    { id: 'inbox', label: 'Inbox', icon: '⚡', badge: alertCount },
    { id: 'invoices', label: 'Invoices', icon: '📄', badge: summary.anomaliesDetected > 0 ? summary.anomaliesDetected : undefined },
    { id: 'contracts', label: 'Contracts', icon: '📋' },
    { id: 'insurance', label: 'Insurance', icon: '🛡️', badge: summary.coverageGaps > 0 ? summary.coverageGaps : undefined },
    { id: 'orders', label: 'Orders', icon: '📦', badge: 1 },
    { id: 'payments', label: 'Payments', icon: '💳', badge: summary.pendingApprovals > 0 ? summary.pendingApprovals : undefined },
    { id: 'intelligence', label: 'AI Intelligence', icon: '🧠' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <aside className="w-60 bg-[#1A2744] flex flex-col flex-shrink-0 h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 flex-shrink-0">
            <img src="/dominion-logo-transparent.png" alt="Dominion" width={40} height={40} className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-white font-bold text-base leading-tight">Dominion</div>
            <div className="text-white/40 text-[10px] leading-tight tracking-wider uppercase">AI Financial Ops</div>
          </div>
        </div>
      </div>

      {/* AI Status Banner */}
      <div className="mx-3 mt-3 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10">
        <div className="flex items-center gap-1.5 mb-1">
          <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
          <span className="text-[10px] font-semibold text-[#10B981] tracking-wider uppercase">AI Active</span>
        </div>
        <div className="text-white/60 text-[11px]">{summary.aiScansToday} scans today</div>
        <div className="text-[#10B981] text-[11px] font-medium mt-0.5">
          {formatCurrency(summary.monthlySavingsIdentified)} identified this month
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
              activeView === item.id
                ? 'bg-[#3B82F6] text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'
            )}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </div>
            {item.badge != null && item.badge > 0 && (
              <span className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                activeView === item.id
                  ? 'bg-white/20 text-white'
                  : 'bg-[#EF4444] text-white'
              )}>
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Bottom summary */}
      <div className="px-3 pb-4 space-y-1.5">
        <div className="px-3 py-2.5 rounded-lg bg-white/5 border border-white/10">
          <div className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Payable This Week</div>
          <div className="text-white font-bold text-lg">{formatCurrency(summary.totalPayableThisWeek)}</div>
          <div className="text-white/50 text-[11px] mt-0.5">{summary.pendingApprovals} awaiting approval</div>
        </div>
        <div className="px-3 py-2 rounded-lg bg-white/5 text-center">
          <div className="text-white/30 text-[10px]">Acme Corp · Pro Plan</div>
        </div>
      </div>
    </aside>
  );
}

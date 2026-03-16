import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function daysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function confidenceColor(score: number): string {
  if (score >= 0.92) return '#10B981';
  if (score >= 0.75) return '#F59E0B';
  return '#EF4444';
}

export function confidenceLabel(score: number): string {
  if (score >= 0.92) return 'High';
  if (score >= 0.75) return 'Medium';
  return 'Low';
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    pending: '#F59E0B',
    approved: '#10B981',
    flagged: '#EF4444',
    incomplete: '#94A3B8',
    paid: '#3B82F6',
    duplicate: '#EF4444',
    active: '#10B981',
    expiring_soon: '#F59E0B',
    expired: '#EF4444',
    pending_approval: '#F59E0B',
    scheduled: '#3B82F6',
    sent: '#10B981',
    synced: '#10B981',
    error: '#EF4444',
    action_required: '#EF4444',
    upcoming: '#F59E0B',
    renewed: '#10B981',
  };
  return map[status] ?? '#94A3B8';
}

export function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

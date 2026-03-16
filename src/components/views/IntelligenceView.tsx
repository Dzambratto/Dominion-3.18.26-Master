
import { useState, useMemo } from 'react';
import {
  Brain, AlertTriangle, TrendingUp, Building2, Users, DollarSign,
  ChevronRight, Shield, Repeat, BarChart3, Zap, CheckCircle,
  Clock, X, ArrowUpRight, Filter, RefreshCw
} from 'lucide-react';
import { runPatternEngine, buildVendorProfiles, buildPropertyProfiles, invoiceToEvent } from '@/lib/pattern-engine';
import { generateMonthlyReport } from '@/lib/pattern-engine';
import { PatternAlert, PatternAlertType, PatternAlertSeverity, VendorProfile, PropertyProfile } from '@/lib/pattern-types';
import { PATTERN_INVOICES, PROPERTY_MAP, SAVINGS_FROM_ANOMALIES } from '@/lib/pattern-mock-data';
import { MOCK_RENEWALS, MOCK_CONTRACTS } from '@/lib/mock-data';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const ALERT_ICONS: Record<PatternAlertType, React.ElementType> = {
  repeated_service: Repeat,
  vendor_quality: Users,
  cost_spike: TrendingUp,
  contract_mismatch: Shield,
  duplicate_invoice: AlertTriangle,
  vendor_price_increase: ArrowUpRight,
  property_risk: Building2,
  renewal_risk: Clock,
  missing_info: AlertTriangle,
  vendor_billing_anomaly: BarChart3,
};

const ALERT_COLORS: Record<PatternAlertSeverity, { bg: string; border: string; badge: string; text: string; icon: string }> = {
  critical: {
    bg: 'bg-red-950/40',
    border: 'border-red-500/40',
    badge: 'bg-red-500/20 text-red-400 border border-red-500/30',
    text: 'text-red-400',
    icon: 'text-red-400',
  },
  high: {
    bg: 'bg-orange-950/30',
    border: 'border-orange-500/30',
    badge: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    text: 'text-orange-400',
    icon: 'text-orange-400',
  },
  medium: {
    bg: 'bg-yellow-950/20',
    border: 'border-yellow-500/20',
    badge: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    text: 'text-yellow-400',
    icon: 'text-yellow-400',
  },
  low: {
    bg: 'bg-blue-950/20',
    border: 'border-blue-500/20',
    badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    text: 'text-blue-400',
    icon: 'text-blue-400',
  },
};

const ALERT_TYPE_LABELS: Record<PatternAlertType, string> = {
  repeated_service: 'Repeated Service',
  vendor_quality: 'Vendor Quality',
  cost_spike: 'Cost Spike',
  contract_mismatch: 'Contract Mismatch',
  duplicate_invoice: 'Duplicate Invoice',
  vendor_price_increase: 'Price Increase',
  property_risk: 'Property Risk',
  renewal_risk: 'Renewal Risk',
  missing_info: 'Missing Info',
  vendor_billing_anomaly: 'Billing Anomaly',
};

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ─── Alert Card ───────────────────────────────────────────────────────────────
function AlertCard({ alert, onDismiss }: { alert: PatternAlert; onDismiss: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const colors = ALERT_COLORS[alert.severity];
  const Icon = ALERT_ICONS[alert.type];

  return (
    <div className={`rounded-xl border p-4 transition-all ${colors.bg} ${colors.border}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 p-2 rounded-lg bg-white/5 ${colors.icon}`}>
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
                {alert.severity.toUpperCase()}
              </span>
              <span className="text-xs text-slate-500">{ALERT_TYPE_LABELS[alert.type]}</span>
            </div>
            <button
              onClick={() => onDismiss(alert.id)}
              className="text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
          <p className="text-sm font-semibold text-white mb-1">{alert.title}</p>
          <p className="text-xs text-slate-400 leading-relaxed">{alert.description}</p>

          {alert.estimatedSavings && alert.estimatedSavings > 0 && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
              <DollarSign size={11} />
              <span>${fmt(alert.estimatedSavings)} at risk / recoverable</span>
            </div>
          )}

          {expanded && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-xs text-slate-300 font-medium mb-1">Recommended Action</p>
              <p className="text-xs text-slate-400 leading-relaxed">{alert.recommendation}</p>
              {(alert.property || alert.vendorName) && (
                <div className="mt-2 flex gap-3 flex-wrap">
                  {alert.property && (
                    <span className="text-xs text-slate-500">
                      <span className="text-slate-400">Property:</span> {alert.property}
                    </span>
                  )}
                  {alert.vendorName && (
                    <span className="text-xs text-slate-500">
                      <span className="text-slate-400">Vendor:</span> {alert.vendorName}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
          >
            {expanded ? 'Show less' : 'View recommendation'}
            <ChevronRight size={12} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Savings Widget ───────────────────────────────────────────────────────────
function SavingsWidget({ totalSavings, duplicates, mismatches, priceIncreases }: {
  totalSavings: number;
  duplicates: number;
  mismatches: number;
  priceIncreases: number;
}) {
  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/60 to-slate-900/80 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-emerald-500/20">
          <DollarSign size={18} className="text-emerald-400" />
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider">Savings Detected This Month</p>
          <p className="text-2xl font-bold text-emerald-400">${fmt(totalSavings)}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-2 rounded-lg bg-white/5">
          <p className="text-lg font-bold text-white">{duplicates}</p>
          <p className="text-xs text-slate-500 mt-0.5">Duplicates<br />Prevented</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/5">
          <p className="text-lg font-bold text-white">{mismatches}</p>
          <p className="text-xs text-slate-500 mt-0.5">Contract<br />Mismatches</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/5">
          <p className="text-lg font-bold text-white">{priceIncreases}</p>
          <p className="text-xs text-slate-500 mt-0.5">Price<br />Increases</p>
        </div>
      </div>
    </div>
  );
}

// ─── Vendor Reputation Panel ──────────────────────────────────────────────────
function VendorReputationPanel({ vendors }: { vendors: VendorProfile[] }) {
  const sorted = [...vendors].sort((a, b) => b.revisitRate - a.revisitRate).slice(0, 6);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Users size={16} className="text-blue-400" />
        <h3 className="text-sm font-semibold text-white">Vendor Reputation</h3>
        <span className="ml-auto text-xs text-slate-500">Revisit Rate vs. Portfolio Avg</span>
      </div>
      <div className="space-y-3">
        {sorted.map(vendor => {
          const rate = Math.round(vendor.revisitRate * 100);
          const avg = Math.round(vendor.portfolioAvgRevisitRate * 100);
          const isAbove = vendor.revisitRate > vendor.portfolioAvgRevisitRate * 1.5;
          const barWidth = Math.min(100, rate * 2);

          return (
            <div key={vendor.vendorId} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300 truncate max-w-[160px]">{vendor.vendorName}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${isAbove ? 'text-orange-400' : 'text-emerald-400'}`}>
                    {rate}%
                  </span>
                  <span className="text-xs text-slate-600">avg {avg}%</span>
                </div>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isAbove ? 'bg-orange-500' : 'bg-emerald-500'}`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Property Intelligence Panel ─────────────────────────────────────────────
function PropertyIntelligencePanel({ properties }: { properties: PropertyProfile[] }) {
  const sorted = [...properties].sort((a, b) => b.riskScore - a.riskScore).slice(0, 5);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Building2 size={16} className="text-purple-400" />
        <h3 className="text-sm font-semibold text-white">Property Intelligence</h3>
        <span className="ml-auto text-xs text-slate-500">Risk Score</span>
      </div>
      <div className="space-y-3">
        {sorted.map(property => {
          const riskColor =
            property.riskScore >= 70 ? 'text-red-400 bg-red-500/10 border-red-500/20' :
            property.riskScore >= 40 ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' :
            'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

          return (
            <div key={property.propertyId} className="flex items-center justify-between p-2.5 rounded-lg bg-white/5">
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-200 truncate">{property.propertyName}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {property.totalServiceEvents} events · ${fmt(property.totalMaintenanceSpend)} spend
                </p>
              </div>
              <div className={`ml-3 flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full border ${riskColor}`}>
                {property.riskScore}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Portfolio Health Card ────────────────────────────────────────────────────
function PortfolioHealthCard({ health, totalAlerts, critical, high }: {
  health: string;
  totalAlerts: number;
  critical: number;
  high: number;
}) {
  const healthConfig = {
    excellent: { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Excellent', icon: CheckCircle },
    good: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', label: 'Good', icon: CheckCircle },
    needs_attention: { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', label: 'Needs Attention', icon: AlertTriangle },
    at_risk: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', label: 'At Risk', icon: AlertTriangle },
  };
  const config = healthConfig[health as keyof typeof healthConfig] || healthConfig.good;
  const HealthIcon = config.icon;

  return (
    <div className={`rounded-2xl border p-4 ${config.bg}`}>
      <div className="flex items-center gap-2 mb-3">
        <HealthIcon size={16} className={config.color} />
        <span className="text-xs text-slate-400 uppercase tracking-wider">Portfolio Health</span>
        <span className={`ml-auto text-sm font-bold ${config.color}`}>{config.label}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xl font-bold text-white">{totalAlerts}</p>
          <p className="text-xs text-slate-500">Total Alerts</p>
        </div>
        <div>
          <p className="text-xl font-bold text-red-400">{critical}</p>
          <p className="text-xs text-slate-500">Critical</p>
        </div>
        <div>
          <p className="text-xl font-bold text-orange-400">{high}</p>
          <p className="text-xs text-slate-500">High</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Intelligence View ───────────────────────────────────────────────────
export default function IntelligenceView() {
  const [activeFilter, setActiveFilter] = useState<PatternAlertType | 'all'>('all');
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'alerts' | 'vendors' | 'properties' | 'report'>('alerts');

  // Run pattern engine on demo data
  const intelligence = useMemo(() => {
    return runPatternEngine(
      PATTERN_INVOICES,
      MOCK_CONTRACTS || [],
      [],
      MOCK_RENEWALS || [],
      PROPERTY_MAP
    );
  }, []);

  const report = useMemo(() => generateMonthlyReport(PATTERN_INVOICES, intelligence), [intelligence]);

  const events = useMemo(() =>
    PATTERN_INVOICES.map(inv => invoiceToEvent(inv, PROPERTY_MAP[inv.id])),
    []
  );

  const vendorProfiles = useMemo(() => buildVendorProfiles(events), [events]);
  const propertyProfiles = useMemo(() => buildPropertyProfiles(events, intelligence.alerts), [events, intelligence.alerts]);

  const visibleAlerts = useMemo(() =>
    intelligence.alerts.filter(a =>
      !dismissedIds.has(a.id) &&
      (activeFilter === 'all' || a.type === activeFilter)
    ),
    [intelligence.alerts, dismissedIds, activeFilter]
  );

  const totalSavings = intelligence.totalSavingsIdentified + SAVINGS_FROM_ANOMALIES.totalSavingsDetected;

  const filterTypes: Array<{ value: PatternAlertType | 'all'; label: string; count: number }> = [
    { value: 'all', label: 'All', count: intelligence.alerts.filter(a => !dismissedIds.has(a.id)).length },
    { value: 'repeated_service', label: 'Repeated Service', count: intelligence.alerts.filter(a => a.type === 'repeated_service').length },
    { value: 'vendor_price_increase', label: 'Price Increases', count: intelligence.alerts.filter(a => a.type === 'vendor_price_increase').length },
    { value: 'property_risk', label: 'Property Risk', count: intelligence.alerts.filter(a => a.type === 'property_risk').length },
    { value: 'vendor_quality', label: 'Vendor Quality', count: intelligence.alerts.filter(a => a.type === 'vendor_quality').length },
    { value: 'renewal_risk', label: 'Renewals', count: intelligence.alerts.filter(a => a.type === 'renewal_risk').length },
    { value: 'cost_spike', label: 'Cost Spikes', count: intelligence.alerts.filter(a => a.type === 'cost_spike').length },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-500/20 border border-violet-500/30">
            <Brain size={22} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">AI Intelligence</h1>
            <p className="text-xs text-slate-500 mt-0.5">Historical pattern detection · Operational oversight</p>
          </div>
        </div>
        <button className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500">
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-500 mb-1">Active Alerts</p>
          <p className="text-2xl font-bold text-white">{visibleAlerts.length}</p>
          <p className="text-xs text-red-400 mt-1">{intelligence.criticalAlerts} critical</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-500 mb-1">Savings Identified</p>
          <p className="text-2xl font-bold text-emerald-400">${fmt(totalSavings)}</p>
          <p className="text-xs text-slate-500 mt-1">this month</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-500 mb-1">Vendor Anomalies</p>
          <p className="text-2xl font-bold text-orange-400">{intelligence.vendorAnomalies}</p>
          <p className="text-xs text-slate-500 mt-1">price or quality issues</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs text-slate-500 mb-1">Properties Monitored</p>
          <p className="text-2xl font-bold text-blue-400">{propertyProfiles.length}</p>
          <p className="text-xs text-slate-500 mt-1">{intelligence.propertyRisks} at risk</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900/60 border border-slate-800 rounded-xl p-1">
        {[
          { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
          { id: 'vendors', label: 'Vendor Intelligence', icon: Users },
          { id: 'properties', label: 'Property Intelligence', icon: Building2 },
          { id: 'report', label: 'Monthly Report', icon: BarChart3 },
        ].map(tab => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <TabIcon size={13} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alert Feed */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filter Pills */}
            <div className="flex gap-2 flex-wrap">
              <Filter size={14} className="text-slate-500 mt-1.5" />
              {filterTypes.map(f => (
                <button
                  key={f.value}
                  onClick={() => setActiveFilter(f.value)}
                  className={`text-xs px-3 py-1 rounded-full border transition-all ${
                    activeFilter === f.value
                      ? 'bg-violet-600 border-violet-500 text-white'
                      : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
                  }`}
                >
                  {f.label} {f.count > 0 && <span className="opacity-70">({f.count})</span>}
                </button>
              ))}
            </div>

            {/* Alert Cards */}
            <div className="space-y-3">
              {visibleAlerts.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <CheckCircle size={32} className="mx-auto mb-3 text-emerald-500/50" />
                  <p className="text-sm">No active alerts in this category</p>
                </div>
              ) : (
                visibleAlerts.map(alert => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onDismiss={(id) => setDismissedIds(prev => new Set([...prev, id]))}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            <SavingsWidget
              totalSavings={totalSavings}
              duplicates={intelligence.duplicatesPrevented + SAVINGS_FROM_ANOMALIES.duplicatesPrevented}
              mismatches={intelligence.contractMismatches + SAVINGS_FROM_ANOMALIES.contractMismatchesCaught}
              priceIncreases={intelligence.alerts.filter(a => a.type === 'vendor_price_increase').length + SAVINGS_FROM_ANOMALIES.priceIncreasesChallenged}
            />
            <PortfolioHealthCard
              health={report.portfolioHealth}
              totalAlerts={intelligence.totalAlerts}
              critical={intelligence.criticalAlerts}
              high={intelligence.highAlerts}
            />
          </div>
        </div>
      )}

      {/* Vendor Intelligence Tab */}
      {activeTab === 'vendors' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <VendorReputationPanel vendors={vendorProfiles} />
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Zap size={14} className="text-yellow-400" />
              Vendor Spend Summary
            </h3>
            {vendorProfiles.slice(0, 8).map(vendor => (
              <div key={vendor.vendorId} className="flex items-center justify-between p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{vendor.vendorName}</p>
                  <p className="text-xs text-slate-500 mt-0.5 capitalize">{vendor.category.replace('_', ' ')} · {vendor.totalInvoices} invoices</p>
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <p className="text-sm font-semibold text-white">${fmt(vendor.totalSpend)}</p>
                  {vendor.priceIncreaseDetected && (
                    <p className="text-xs text-orange-400 mt-0.5">↑ Price increase</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Property Intelligence Tab */}
      {activeTab === 'properties' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PropertyIntelligencePanel properties={propertyProfiles} />
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <BarChart3 size={14} className="text-purple-400" />
              Property Spend Breakdown
            </h3>
            {propertyProfiles.map(property => (
              <div key={property.propertyId} className="p-3 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-200">{property.propertyName}</p>
                  <p className="text-sm font-semibold text-white">${fmt(property.totalMaintenanceSpend)}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {property.topCategories.slice(0, 3).map(cat => (
                    <span key={cat.category} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400 capitalize">
                      {cat.category.replace('_', ' ')} (${fmt(cat.spend)})
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Report Tab */}
      {activeTab === 'report' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-white">Operator Monthly Report</h2>
                <p className="text-sm text-slate-500">{report.month}</p>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                report.portfolioHealth === 'excellent' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                report.portfolioHealth === 'good' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' :
                report.portfolioHealth === 'needs_attention' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' :
                'text-red-400 bg-red-500/10 border-red-500/20'
              }`}>
                {report.portfolioHealth.replace('_', ' ').toUpperCase()}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Invoices Processed', value: report.totalInvoicesProcessed, color: 'text-white' },
                { label: 'Total Spend', value: `$${fmt(report.totalSpend)}`, color: 'text-white' },
                { label: 'Savings Detected', value: `$${fmt(report.savingsDetected + SAVINGS_FROM_ANOMALIES.totalSavingsDetected)}`, color: 'text-emerald-400' },
                { label: 'Duplicates Prevented', value: report.duplicatesPrevented + SAVINGS_FROM_ANOMALIES.duplicatesPrevented, color: 'text-blue-400' },
              ].map(stat => (
                <div key={stat.label} className="text-center p-3 rounded-xl bg-white/5">
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Contract Mismatches', value: report.contractMismatchesFound + SAVINGS_FROM_ANOMALIES.contractMismatchesCaught, color: 'text-orange-400' },
                { label: 'Repeated Service Events', value: report.repeatedServiceEvents, color: 'text-red-400' },
                { label: 'Vendor Price Increases', value: report.vendorPriceIncreases + SAVINGS_FROM_ANOMALIES.priceIncreasesChallenged, color: 'text-yellow-400' },
                { label: 'Renewals Approaching', value: report.renewalsApproaching, color: 'text-purple-400' },
              ].map(stat => (
                <div key={stat.label} className="text-center p-3 rounded-xl bg-white/5">
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Top Alerts This Month</h3>
              <div className="space-y-2">
                {report.topAlerts.map(alert => {
                  const colors = ALERT_COLORS[alert.severity];
                  const Icon = ALERT_ICONS[alert.type];
                  return (
                    <div key={alert.id} className={`flex items-center gap-3 p-3 rounded-lg border ${colors.bg} ${colors.border}`}>
                      <Icon size={14} className={colors.icon} />
                      <p className="text-xs text-slate-300 flex-1">{alert.title}</p>
                      {alert.estimatedSavings && (
                        <span className="text-xs text-emerald-400 font-semibold">${fmt(alert.estimatedSavings)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Dominion Pattern Detection Engine ───────────────────────────────────────
// Normalizes invoices into ServiceEvents and runs pattern rules to generate
// intelligent alerts across all 10 alert types.

import {
  ServiceEvent,
  ServiceCategory,
  PatternAlert,
  PatternAlertType,
  VendorProfile,
  PropertyProfile,
  PortfolioIntelligence,
  MonthlyReport,
} from './pattern-types';
import { Invoice, Contract, InsurancePolicy, Renewal } from './types';

// ─── Category Detection ───────────────────────────────────────────────────────
const CATEGORY_KEYWORDS: Record<ServiceCategory, string[]> = {
  plumbing: ['plumb', 'pipe', 'drain', 'leak', 'sewer', 'water', 'faucet', 'toilet'],
  hvac: ['hvac', 'heat', 'cool', 'air condition', 'furnace', 'boiler', 'duct', 'refriger'],
  electrical: ['electric', 'wiring', 'panel', 'circuit', 'outlet', 'lighting'],
  roofing: ['roof', 'gutter', 'shingle', 'flashing', 'skylight'],
  landscaping: ['landscap', 'lawn', 'mow', 'trim', 'garden', 'tree', 'shrub', 'mulch'],
  snow_removal: ['snow', 'ice', 'salt', 'plow', 'deice', 'winter'],
  janitorial: ['clean', 'janitor', 'sanit', 'custod', 'maid', 'housekeep'],
  pest_control: ['pest', 'exterminator', 'rodent', 'insect', 'termite', 'bug'],
  security: ['security', 'alarm', 'camera', 'surveillance', 'access control', 'guard'],
  it_support: ['it support', 'managed it', 'tech support', 'helpdesk', 'network', 'server', 'software'],
  maintenance: ['maintenance', 'repair', 'fix', 'service call', 'handyman', 'general'],
  logistics: ['freight', 'shipping', 'delivery', 'transport', 'carrier', 'logistics', 'bol'],
  legal: ['legal', 'attorney', 'counsel', 'law firm', 'litigation'],
  accounting: ['accounting', 'bookkeep', 'cpa', 'audit', 'tax'],
  saas: ['subscription', 'saas', 'software license', 'annual plan', 'monthly plan'],
  insurance: ['insurance', 'premium', 'policy', 'coverage'],
  utilities: ['electric bill', 'gas bill', 'water bill', 'utility', 'utilities'],
  other: [],
};

export function detectCategory(vendorName: string, description: string): ServiceCategory {
  const text = `${vendorName} ${description}`.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      return category as ServiceCategory;
    }
  }
  return 'other';
}

export function normalizeKey(str: string): string {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_');
}

// ─── Invoice → ServiceEvent ───────────────────────────────────────────────────
export function invoiceToEvent(invoice: Invoice, propertyOverride?: string): ServiceEvent {
  const description = invoice.lineItems.map(li => li.description).join(' ');
  const category = detectCategory(invoice.vendorName, description);
  const property = propertyOverride || invoice.notes?.match(/property:\s*([^\n,]+)/i)?.[1] || 'General Operations';

  return {
    id: `evt-${invoice.id}`,
    invoiceId: invoice.id,
    vendorName: invoice.vendorName,
    vendorId: normalizeKey(invoice.vendorName),
    property,
    propertyId: normalizeKey(property),
    category,
    issueDescription: description.slice(0, 120),
    date: invoice.receivedDate,
    amount: invoice.amount,
    contractId: invoice.contractId,
    contractedAmount: invoice.previousAmount,
    notes: invoice.notes,
  };
}

// ─── Day Difference ───────────────────────────────────────────────────────────
function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  return Math.abs(Math.round((a - b) / (1000 * 60 * 60 * 24)));
}

function generateId(): string {
  return `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Rule 1: Repeated Service Alert ──────────────────────────────────────────
function detectRepeatedService(events: ServiceEvent[], windowDays = 35): PatternAlert[] {
  const alerts: PatternAlert[] = [];
  const sorted = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (let i = 0; i < sorted.length; i++) {
    const base = sorted[i];
    const repeats = sorted.filter((e, j) =>
      j !== i &&
      e.vendorId === base.vendorId &&
      e.propertyId === base.propertyId &&
      e.category === base.category &&
      daysBetween(e.date, base.date) <= windowDays &&
      new Date(e.date) > new Date(base.date)
    );

    if (repeats.length > 0) {
      const alreadyFlagged = alerts.some(a =>
        a.relatedEventIds.includes(base.id) || repeats.some(r => a.relatedEventIds.includes(r.id))
      );
      if (!alreadyFlagged) {
        const totalAmount = [base, ...repeats].reduce((sum, e) => sum + e.amount, 0);
        alerts.push({
          id: generateId(),
          type: 'repeated_service',
          severity: repeats.length >= 2 ? 'critical' : 'high',
          title: `Repeated ${base.category.replace('_', ' ')} issue at ${base.property}`,
          description: `${base.vendorName} visited ${base.property} for ${base.category.replace('_', ' ')} ${repeats.length + 1} times within ${windowDays} days. Total spend: $${totalAmount.toLocaleString()}.`,
          recommendation: `Review original repair quality. Consider whether root cause was resolved. Evaluate vendor competence or escalate to a different contractor.`,
          estimatedSavings: totalAmount * 0.4,
          property: base.property,
          vendorName: base.vendorName,
          category: base.category,
          relatedEventIds: [base.id, ...repeats.map(r => r.id)],
          relatedInvoiceIds: [base.invoiceId, ...repeats.map(r => r.invoiceId)],
          detectedAt: new Date().toISOString(),
          dismissed: false,
        });
      }
    }
  }
  return alerts;
}

// ─── Rule 2: Vendor Quality Alert ────────────────────────────────────────────
function detectVendorQuality(events: ServiceEvent[]): PatternAlert[] {
  const alerts: PatternAlert[] = [];
  const vendorMap = new Map<string, ServiceEvent[]>();

  events.forEach(e => {
    if (!vendorMap.has(e.vendorId)) vendorMap.set(e.vendorId, []);
    vendorMap.get(e.vendorId)!.push(e);
  });

  // Calculate portfolio average revisit rate
  let totalRevisits = 0;
  let totalVendorEvents = 0;
  vendorMap.forEach(vendorEvents => {
    const propertyVisits = new Map<string, number>();
    vendorEvents.forEach(e => propertyVisits.set(e.propertyId, (propertyVisits.get(e.propertyId) || 0) + 1));
    const revisits = [...propertyVisits.values()].filter(v => v > 1).reduce((sum, v) => sum + (v - 1), 0);
    totalRevisits += revisits;
    totalVendorEvents += vendorEvents.length;
  });
  const portfolioAvgRate = totalVendorEvents > 0 ? totalRevisits / totalVendorEvents : 0.08;

  vendorMap.forEach((vendorEvents, vendorId) => {
    if (vendorEvents.length < 3) return;
    const propertyVisits = new Map<string, number>();
    vendorEvents.forEach(e => propertyVisits.set(e.propertyId, (propertyVisits.get(e.propertyId) || 0) + 1));
    const revisits = [...propertyVisits.values()].filter(v => v > 1).reduce((sum, v) => sum + (v - 1), 0);
    const revisitRate = revisits / vendorEvents.length;

    if (revisitRate > portfolioAvgRate * 2.5 && revisitRate > 0.2) {
      const vendor = vendorEvents[0];
      alerts.push({
        id: generateId(),
        type: 'vendor_quality',
        severity: revisitRate > 0.4 ? 'high' : 'medium',
        title: `Vendor quality concern: ${vendor.vendorName}`,
        description: `${vendor.vendorName} has a ${Math.round(revisitRate * 100)}% revisit rate across your portfolio — ${Math.round(revisitRate / portfolioAvgRate)}x above the portfolio average of ${Math.round(portfolioAvgRate * 100)}%.`,
        recommendation: `Review repair quality for ${vendor.vendorName}. Consider getting a second opinion on open issues or replacing with a higher-quality vendor.`,
        estimatedSavings: vendorEvents.reduce((sum, e) => sum + e.amount, 0) * 0.25,
        vendorName: vendor.vendorName,
        category: vendor.category,
        relatedEventIds: vendorEvents.map(e => e.id),
        relatedInvoiceIds: vendorEvents.map(e => e.invoiceId),
        detectedAt: new Date().toISOString(),
        dismissed: false,
      });
    }
  });
  return alerts;
}

// ─── Rule 3: Cost Spike Alert ─────────────────────────────────────────────────
function detectCostSpikes(events: ServiceEvent[]): PatternAlert[] {
  const alerts: PatternAlert[] = [];
  const propertyMap = new Map<string, ServiceEvent[]>();

  events.forEach(e => {
    if (!propertyMap.has(e.propertyId)) propertyMap.set(e.propertyId, []);
    propertyMap.get(e.propertyId)!.push(e);
  });

  propertyMap.forEach((propEvents, propertyId) => {
    if (propEvents.length < 4) return;
    const sorted = [...propEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Compare last 30 days vs prior 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recent = sorted.filter(e => new Date(e.date) >= thirtyDaysAgo);
    const prior = sorted.filter(e => new Date(e.date) >= sixtyDaysAgo && new Date(e.date) < thirtyDaysAgo);

    if (recent.length === 0 || prior.length === 0) return;

    const recentSpend = recent.reduce((sum, e) => sum + e.amount, 0);
    const priorSpend = prior.reduce((sum, e) => sum + e.amount, 0);
    const increasePercent = ((recentSpend - priorSpend) / priorSpend) * 100;

    if (increasePercent > 60) {
      const property = propEvents[0].property;
      alerts.push({
        id: generateId(),
        type: 'cost_spike',
        severity: increasePercent > 100 ? 'critical' : 'high',
        title: `Maintenance cost spike at ${property}`,
        description: `Maintenance spend at ${property} increased ${Math.round(increasePercent)}% month-over-month ($${priorSpend.toLocaleString()} → $${recentSpend.toLocaleString()}).`,
        recommendation: `Review recent service events at ${property}. Identify root cause of increased activity. Consider whether a capital improvement would reduce ongoing maintenance costs.`,
        estimatedSavings: recentSpend - priorSpend,
        property,
        relatedEventIds: recent.map(e => e.id),
        relatedInvoiceIds: recent.map(e => e.invoiceId),
        detectedAt: new Date().toISOString(),
        dismissed: false,
      });
    }
  });
  return alerts;
}

// ─── Rule 4: Vendor Price Increase Alert ─────────────────────────────────────
function detectVendorPriceIncreases(events: ServiceEvent[]): PatternAlert[] {
  const alerts: PatternAlert[] = [];
  const vendorMap = new Map<string, ServiceEvent[]>();

  events.forEach(e => {
    if (!vendorMap.has(e.vendorId)) vendorMap.set(e.vendorId, []);
    vendorMap.get(e.vendorId)!.push(e);
  });

  vendorMap.forEach((vendorEvents) => {
    if (vendorEvents.length < 3) return;
    const sorted = [...vendorEvents].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const recent = sorted[sorted.length - 1];
    const historical = sorted.slice(0, -1);
    const avgHistorical = historical.reduce((sum, e) => sum + e.amount, 0) / historical.length;
    const increasePercent = ((recent.amount - avgHistorical) / avgHistorical) * 100;

    if (increasePercent > 20) {
      alerts.push({
        id: generateId(),
        type: 'vendor_price_increase',
        severity: increasePercent > 40 ? 'high' : 'medium',
        title: `Price increase detected: ${recent.vendorName}`,
        description: `${recent.vendorName}'s latest invoice ($${recent.amount.toLocaleString()}) is ${Math.round(increasePercent)}% above their historical average ($${Math.round(avgHistorical).toLocaleString()}).`,
        recommendation: `Contact ${recent.vendorName} to confirm the reason for the increase. Request a credit memo if unjustified or renegotiate contract terms.`,
        estimatedSavings: recent.amount - avgHistorical,
        vendorName: recent.vendorName,
        category: recent.category,
        relatedEventIds: [recent.id],
        relatedInvoiceIds: [recent.invoiceId],
        detectedAt: new Date().toISOString(),
        dismissed: false,
      });
    }
  });
  return alerts;
}

// ─── Rule 5: Vendor Billing Anomaly ──────────────────────────────────────────
function detectBillingAnomalies(events: ServiceEvent[]): PatternAlert[] {
  const alerts: PatternAlert[] = [];
  const vendorMap = new Map<string, ServiceEvent[]>();

  events.forEach(e => {
    if (!vendorMap.has(e.vendorId)) vendorMap.set(e.vendorId, []);
    vendorMap.get(e.vendorId)!.push(e);
  });

  vendorMap.forEach((vendorEvents) => {
    if (vendorEvents.length < 4) return;
    const amounts = vendorEvents.map(e => e.amount);
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((sum, a) => sum + Math.pow(a - avg, 2), 0) / amounts.length);
    const latest = vendorEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (Math.abs(latest.amount - avg) > stdDev * 2.5 && latest.amount > avg * 1.5) {
      alerts.push({
        id: generateId(),
        type: 'vendor_billing_anomaly',
        severity: 'medium',
        title: `Unusual invoice amount: ${latest.vendorName}`,
        description: `${latest.vendorName}'s latest invoice ($${latest.amount.toLocaleString()}) is significantly outside their normal billing range (avg: $${Math.round(avg).toLocaleString()}).`,
        recommendation: `Request itemized breakdown from ${latest.vendorName}. Verify all line items against contract or prior invoices before approving payment.`,
        estimatedSavings: latest.amount - avg,
        vendorName: latest.vendorName,
        category: latest.category,
        relatedEventIds: [latest.id],
        relatedInvoiceIds: [latest.invoiceId],
        detectedAt: new Date().toISOString(),
        dismissed: false,
      });
    }
  });
  return alerts;
}

// ─── Rule 6: Property Risk Alert ─────────────────────────────────────────────
function detectPropertyRisk(events: ServiceEvent[]): PatternAlert[] {
  const alerts: PatternAlert[] = [];
  const propertyMap = new Map<string, ServiceEvent[]>();

  events.forEach(e => {
    if (e.property === 'General Operations') return;
    if (!propertyMap.has(e.propertyId)) propertyMap.set(e.propertyId, []);
    propertyMap.get(e.propertyId)!.push(e);
  });

  if (propertyMap.size < 2) return alerts;

  // Calculate portfolio average events per property in last 90 days
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  let totalEvents = 0;
  let totalProperties = 0;

  propertyMap.forEach((propEvents) => {
    const recent = propEvents.filter(e => new Date(e.date) >= ninetyDaysAgo);
    totalEvents += recent.length;
    totalProperties++;
  });

  const avgEventsPerProperty = totalProperties > 0 ? totalEvents / totalProperties : 2;

  propertyMap.forEach((propEvents, propertyId) => {
    const recent = propEvents.filter(e => new Date(e.date) >= ninetyDaysAgo);
    if (recent.length > avgEventsPerProperty * 2.5 && recent.length >= 4) {
      const property = propEvents[0].property;
      const totalSpend = recent.reduce((sum, e) => sum + e.amount, 0);
      alerts.push({
        id: generateId(),
        type: 'property_risk',
        severity: recent.length > avgEventsPerProperty * 4 ? 'critical' : 'high',
        title: `High maintenance activity: ${property}`,
        description: `${property} had ${recent.length} service events in the last 90 days — ${Math.round(recent.length / avgEventsPerProperty)}x above the portfolio average of ${Math.round(avgEventsPerProperty)}. Total spend: $${totalSpend.toLocaleString()}.`,
        recommendation: `Conduct a property assessment at ${property}. High service frequency may indicate aging systems, poor prior repairs, or tenant-caused damage requiring a capital solution.`,
        estimatedSavings: totalSpend * 0.3,
        property,
        relatedEventIds: recent.map(e => e.id),
        relatedInvoiceIds: recent.map(e => e.invoiceId),
        detectedAt: new Date().toISOString(),
        dismissed: false,
      });
    }
  });
  return alerts;
}

// ─── Build Vendor Profiles ────────────────────────────────────────────────────
export function buildVendorProfiles(events: ServiceEvent[]): VendorProfile[] {
  const vendorMap = new Map<string, ServiceEvent[]>();
  events.forEach(e => {
    if (!vendorMap.has(e.vendorId)) vendorMap.set(e.vendorId, []);
    vendorMap.get(e.vendorId)!.push(e);
  });

  // Portfolio average revisit rate
  let totalRevisits = 0;
  let totalEvents = 0;
  vendorMap.forEach(vendorEvents => {
    const propertyVisits = new Map<string, number>();
    vendorEvents.forEach(e => propertyVisits.set(e.propertyId, (propertyVisits.get(e.propertyId) || 0) + 1));
    const revisits = [...propertyVisits.values()].filter(v => v > 1).reduce((sum, v) => sum + (v - 1), 0);
    totalRevisits += revisits;
    totalEvents += vendorEvents.length;
  });
  const portfolioAvgRevisitRate = totalEvents > 0 ? totalRevisits / totalEvents : 0.08;

  const profiles: VendorProfile[] = [];
  vendorMap.forEach((vendorEvents, vendorId) => {
    const sorted = [...vendorEvents].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const amounts = vendorEvents.map(e => e.amount);
    const totalSpend = amounts.reduce((a, b) => a + b, 0);
    const avgAmount = totalSpend / amounts.length;

    const propertyVisits = new Map<string, number>();
    vendorEvents.forEach(e => propertyVisits.set(e.propertyId, (propertyVisits.get(e.propertyId) || 0) + 1));
    const revisitCount = [...propertyVisits.values()].filter(v => v > 1).reduce((sum, v) => sum + (v - 1), 0);
    const revisitRate = vendorEvents.length > 0 ? revisitCount / vendorEvents.length : 0;

    const historicalAmounts = amounts.slice(1);
    const historicalAvg = historicalAmounts.length > 0 ? historicalAmounts.reduce((a, b) => a + b, 0) / historicalAmounts.length : amounts[0];
    const priceIncreasePercent = amounts[0] > 0 ? ((amounts[0] - historicalAvg) / historicalAvg) * 100 : 0;

    profiles.push({
      vendorId,
      vendorName: vendorEvents[0].vendorName,
      category: vendorEvents[0].category,
      totalInvoices: vendorEvents.length,
      totalSpend,
      avgInvoiceAmount: avgAmount,
      lastInvoiceAmount: sorted[0]?.amount || 0,
      lastInvoiceDate: sorted[0]?.date || '',
      revisitCount,
      revisitRate,
      portfolioAvgRevisitRate,
      priceIncreaseDetected: priceIncreasePercent > 20,
      priceIncreasePercent: priceIncreasePercent > 0 ? priceIncreasePercent : undefined,
      events: vendorEvents,
    });
  });

  return profiles.sort((a, b) => b.totalSpend - a.totalSpend);
}

// ─── Build Property Profiles ──────────────────────────────────────────────────
export function buildPropertyProfiles(events: ServiceEvent[], alerts: PatternAlert[]): PropertyProfile[] {
  const propertyMap = new Map<string, ServiceEvent[]>();
  events.forEach(e => {
    if (!propertyMap.has(e.propertyId)) propertyMap.set(e.propertyId, []);
    propertyMap.get(e.propertyId)!.push(e);
  });

  // Portfolio average
  let totalFrequency = 0;
  propertyMap.forEach(propEvents => {
    const months = Math.max(1, daysBetween(
      propEvents.reduce((min, e) => e.date < min ? e.date : min, propEvents[0].date),
      propEvents.reduce((max, e) => e.date > max ? e.date : max, propEvents[0].date)
    ) / 30);
    totalFrequency += propEvents.length / months;
  });
  const portfolioAvgFrequency = propertyMap.size > 0 ? totalFrequency / propertyMap.size : 1;

  const profiles: PropertyProfile[] = [];
  propertyMap.forEach((propEvents, propertyId) => {
    const totalSpend = propEvents.reduce((sum, e) => sum + e.amount, 0);
    const dateRange = Math.max(1, daysBetween(
      propEvents.reduce((min, e) => e.date < min ? e.date : min, propEvents[0].date),
      propEvents.reduce((max, e) => e.date > max ? e.date : max, propEvents[0].date)
    ) / 30);
    const frequency = propEvents.length / dateRange;

    // Category breakdown
    const categoryMap = new Map<ServiceCategory, { count: number; spend: number }>();
    propEvents.forEach(e => {
      const existing = categoryMap.get(e.category) || { count: 0, spend: 0 };
      categoryMap.set(e.category, { count: existing.count + 1, spend: existing.spend + e.amount });
    });
    const topCategories = [...categoryMap.entries()]
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5);

    const propertyAlerts = alerts.filter(a => a.property === propEvents[0].property);
    const riskScore = Math.min(100, Math.round(
      (frequency / portfolioAvgFrequency) * 40 +
      (propertyAlerts.filter(a => a.severity === 'critical').length * 20) +
      (propertyAlerts.filter(a => a.severity === 'high').length * 10)
    ));

    profiles.push({
      propertyId,
      propertyName: propEvents[0].property,
      totalServiceEvents: propEvents.length,
      totalMaintenanceSpend: totalSpend,
      avgMonthlySpend: totalSpend / dateRange,
      maintenanceFrequency: frequency,
      portfolioAvgFrequency,
      riskScore,
      topCategories,
      recentEvents: [...propEvents].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5),
      alerts: propertyAlerts,
    });
  });

  return profiles.sort((a, b) => b.riskScore - a.riskScore);
}

// ─── Main Engine: Run All Pattern Rules ───────────────────────────────────────
export function runPatternEngine(
  invoices: Invoice[],
  contracts: Contract[],
  policies: InsurancePolicy[],
  renewals: Renewal[],
  propertyMap?: Record<string, string> // invoiceId → property name
): PortfolioIntelligence {
  // Normalize invoices to events
  const events: ServiceEvent[] = invoices.map(inv =>
    invoiceToEvent(inv, propertyMap?.[inv.id])
  );

  // Run all pattern rules
  const repeatedServiceAlerts = detectRepeatedService(events);
  const vendorQualityAlerts = detectVendorQuality(events);
  const costSpikeAlerts = detectCostSpikes(events);
  const priceIncreaseAlerts = detectVendorPriceIncreases(events);
  const billingAnomalyAlerts = detectBillingAnomalies(events);
  const propertyRiskAlerts = detectPropertyRisk(events);

  // Renewal risk alerts from existing renewal data
  const renewalAlerts: PatternAlert[] = renewals
    .filter(r => r.daysUntilRenewal <= 30 && r.status !== 'cancelled')
    .map(r => ({
      id: generateId(),
      type: 'renewal_risk' as const,
      severity: r.daysUntilRenewal <= 14 ? 'critical' as const : 'high' as const,
      title: `${r.type.charAt(0).toUpperCase() + r.type.slice(1)} renewal in ${r.daysUntilRenewal} days: ${r.vendorName}`,
      description: `${r.vendorName} ${r.type} renews in ${r.daysUntilRenewal} days. Current cost: $${r.currentCost.toLocaleString()}/yr.${r.potentialSavings ? ` Potential savings available: $${r.potentialSavings.toLocaleString()}.` : ''}`,
      recommendation: r.autoRenews
        ? `Auto-renewal is ON. Review terms and decide whether to cancel or renegotiate before the ${r.noticePeriodDays}-day notice deadline.`
        : `Renewal requires manual action. Review alternatives and confirm renewal or cancellation.`,
      estimatedSavings: r.potentialSavings,
      vendorName: r.vendorName,
      relatedEventIds: [],
      relatedInvoiceIds: [],
      detectedAt: new Date().toISOString(),
      dismissed: false,
    }));

  const allAlerts = [
    ...repeatedServiceAlerts,
    ...vendorQualityAlerts,
    ...costSpikeAlerts,
    ...priceIncreaseAlerts,
    ...billingAnomalyAlerts,
    ...propertyRiskAlerts,
    ...renewalAlerts,
  ].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  const totalSavings = allAlerts.reduce((sum, a) => sum + (a.estimatedSavings || 0), 0);
  const vendorProfiles = buildVendorProfiles(events);
  const propertyProfiles = buildPropertyProfiles(events, allAlerts);

  return {
    totalAlerts: allAlerts.length,
    criticalAlerts: allAlerts.filter(a => a.severity === 'critical').length,
    highAlerts: allAlerts.filter(a => a.severity === 'high').length,
    totalSavingsIdentified: totalSavings,
    duplicatesPrevented: invoices.filter(inv => inv.status === 'duplicate').length,
    contractMismatches: allAlerts.filter(a => a.type === 'contract_mismatch').length,
    repeatedServiceEvents: repeatedServiceAlerts.length,
    vendorAnomalies: vendorQualityAlerts.length + priceIncreaseAlerts.length + billingAnomalyAlerts.length,
    propertyRisks: propertyRiskAlerts.length,
    topRiskProperties: propertyProfiles.slice(0, 5),
    topProblematicVendors: vendorProfiles.filter(v => v.revisitRate > v.portfolioAvgRevisitRate * 2).slice(0, 5),
    alerts: allAlerts,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Monthly Report Generator ─────────────────────────────────────────────────
export function generateMonthlyReport(
  invoices: Invoice[],
  intelligence: PortfolioIntelligence
): MonthlyReport {
  const now = new Date();
  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });
  const totalSpend = invoices.reduce((sum, inv) => sum + inv.amount, 0);

  const health =
    intelligence.criticalAlerts > 3 ? 'at_risk' :
    intelligence.highAlerts > 5 ? 'needs_attention' :
    intelligence.totalAlerts > 3 ? 'good' : 'excellent';

  return {
    month: monthName,
    totalInvoicesProcessed: invoices.length,
    totalSpend,
    savingsDetected: intelligence.totalSavingsIdentified,
    duplicatesPrevented: intelligence.duplicatesPrevented,
    contractMismatchesFound: intelligence.contractMismatches,
    repeatedServiceEvents: intelligence.repeatedServiceEvents,
    vendorPriceIncreases: intelligence.alerts.filter(a => a.type === 'vendor_price_increase').length,
    renewalsApproaching: intelligence.alerts.filter(a => a.type === 'renewal_risk').length,
    topAlerts: intelligence.alerts.slice(0, 5),
    portfolioHealth: health,
    generatedAt: new Date().toISOString(),
  };
}

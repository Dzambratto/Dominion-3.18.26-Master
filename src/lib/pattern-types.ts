// ─── Historical Pattern Detection Engine ─────────────────────────────────────
// Every invoice is normalized into a ServiceEvent. The pattern engine
// runs rules against the event history to surface intelligent alerts.

export type ServiceCategory =
  | 'plumbing'
  | 'hvac'
  | 'electrical'
  | 'roofing'
  | 'landscaping'
  | 'snow_removal'
  | 'janitorial'
  | 'pest_control'
  | 'security'
  | 'it_support'
  | 'maintenance'
  | 'logistics'
  | 'legal'
  | 'accounting'
  | 'saas'
  | 'insurance'
  | 'utilities'
  | 'other';

export type PatternAlertType =
  | 'repeated_service'       // Same vendor + property + category within N days
  | 'vendor_quality'         // Vendor revisit rate above portfolio average
  | 'cost_spike'             // Spend spike vs. prior period
  | 'contract_mismatch'      // Invoice exceeds contract terms
  | 'duplicate_invoice'      // Same invoice submitted twice
  | 'vendor_price_increase'  // Vendor charging more than historical pattern
  | 'property_risk'          // Property maintenance frequency above portfolio average
  | 'renewal_risk'           // Contract or policy renewing soon with price increase
  | 'missing_info'           // Invoice missing required fields
  | 'vendor_billing_anomaly'; // Invoice outside normal billing range for this vendor

export type PatternAlertSeverity = 'critical' | 'high' | 'medium' | 'low';

// ─── Normalized Service Event ─────────────────────────────────────────────────
// Every invoice becomes a ServiceEvent for pattern analysis
export interface ServiceEvent {
  id: string;
  invoiceId: string;
  vendorName: string;
  vendorId: string;           // Normalized vendor key (lowercase, trimmed)
  property: string;           // Property address, location name, or 'general'
  propertyId: string;         // Normalized property key
  category: ServiceCategory;
  issueDescription: string;   // Normalized issue description for repeat detection
  date: string;               // ISO date string
  amount: number;
  contractId?: string;
  contractedAmount?: number;
  notes?: string;
}

// ─── Pattern Alert ────────────────────────────────────────────────────────────
export interface PatternAlert {
  id: string;
  type: PatternAlertType;
  severity: PatternAlertSeverity;
  title: string;
  description: string;
  recommendation: string;
  estimatedSavings?: number;  // Dollar amount saved/at risk
  property?: string;
  vendorName?: string;
  category?: ServiceCategory;
  relatedEventIds: string[];
  relatedInvoiceIds: string[];
  detectedAt: string;         // ISO date string
  dismissed: boolean;
  actionTaken?: string;
}

// ─── Vendor Profile ───────────────────────────────────────────────────────────
export interface VendorProfile {
  vendorId: string;
  vendorName: string;
  category: ServiceCategory;
  totalInvoices: number;
  totalSpend: number;
  avgInvoiceAmount: number;
  lastInvoiceAmount: number;
  lastInvoiceDate: string;
  revisitCount: number;       // Number of repeat visits to same property
  revisitRate: number;        // revisitCount / totalInvoices (0–1)
  portfolioAvgRevisitRate: number;
  priceIncreaseDetected: boolean;
  priceIncreasePercent?: number;
  events: ServiceEvent[];
}

// ─── Property Profile ─────────────────────────────────────────────────────────
export interface PropertyProfile {
  propertyId: string;
  propertyName: string;
  totalServiceEvents: number;
  totalMaintenanceSpend: number;
  avgMonthlySpend: number;
  maintenanceFrequency: number;   // Events per month
  portfolioAvgFrequency: number;
  riskScore: number;              // 0–100, higher = more at risk
  topCategories: { category: ServiceCategory; count: number; spend: number }[];
  recentEvents: ServiceEvent[];
  alerts: PatternAlert[];
}

// ─── Portfolio Intelligence ───────────────────────────────────────────────────
export interface PortfolioIntelligence {
  totalAlerts: number;
  criticalAlerts: number;
  highAlerts: number;
  totalSavingsIdentified: number;
  duplicatesPrevented: number;
  contractMismatches: number;
  repeatedServiceEvents: number;
  vendorAnomalies: number;
  propertyRisks: number;
  topRiskProperties: PropertyProfile[];
  topProblematicVendors: VendorProfile[];
  alerts: PatternAlert[];
  generatedAt: string;
}

// ─── Monthly Report ───────────────────────────────────────────────────────────
export interface MonthlyReport {
  month: string;              // e.g. "March 2026"
  totalInvoicesProcessed: number;
  totalSpend: number;
  savingsDetected: number;
  duplicatesPrevented: number;
  contractMismatchesFound: number;
  repeatedServiceEvents: number;
  vendorPriceIncreases: number;
  renewalsApproaching: number;
  topAlerts: PatternAlert[];
  portfolioHealth: 'excellent' | 'good' | 'needs_attention' | 'at_risk';
  generatedAt: string;
}

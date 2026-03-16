// ─── Core Types ───────────────────────────────────────────────────────────────

export type InvoiceStatus = 'pending' | 'approved' | 'flagged' | 'incomplete' | 'paid' | 'duplicate';
export type AnomalyType = 'price_increase' | 'duplicate' | 'contract_mismatch' | 'incomplete' | 'service_mismatch' | 'overpayment';
export type AnomalySeverity = 'high' | 'medium' | 'low';
export type ContractType = 'service' | 'saas' | 'maintenance' | 'insurance' | 'lease' | 'vendor';
export type PolicyType = 'general_liability' | 'professional' | 'cyber' | 'workers_comp' | 'umbrella' | 'property' | 'auto';
export type AlertPriority = 'urgent' | 'review' | 'info';

export interface LineItem {
  description: string;
  quantity?: number;
  unitPrice: number;
  total: number;
  contractedPrice?: number;
  variance?: number;
  confidence: number;
}

export interface Anomaly {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  description: string;
  expectedValue?: number;
  actualValue?: number;
  percentageVariance?: number;
  recommendation: string;
}

export interface Invoice {
  id: string;
  vendorName: string;
  vendorEmail: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  receivedDate: string;
  status: InvoiceStatus;
  source: 'gmail' | 'outlook' | 'manual';
  extractionConfidence: number;
  lineItems: LineItem[];
  anomalies: Anomaly[];
  contractId?: string;
  missingFields?: string[];
  previousAmount?: number;
  notes?: string;
  pdfUrl?: string;
}

export interface ContractLineItem {
  description: string;
  unit: string;
  unitPrice: number;
  maxQuantity?: number;
}

export interface YearOverYearEntry {
  year: number;
  totalSpend: number;
  invoiceCount: number;
  avgInvoiceAmount: number;
}

export interface Contract {
  id: string;
  vendorName: string;
  contractType: ContractType;
  description: string;
  startDate: string;
  endDate: string;
  autoRenews: boolean;
  renewalNoticeDays: number;
  totalContractValue: number;
  billingFrequency: 'monthly' | 'quarterly' | 'annual' | 'per_event';
  lineItems: ContractLineItem[];
  linkedInvoiceIds: string[];
  yearOverYear: YearOverYearEntry[];
  requiresServiceVerification: boolean;
  serviceVerificationType?: 'snowfall_inches' | 'hours_worked' | 'units_delivered';
  notes?: string;
  daysUntilExpiration?: number;
}

export interface CoverageItem {
  type: string;
  limit: number;
  deductible: number;
  description: string;
}

export interface InsuranceQuote {
  carrier: string;
  premium: number;
  coverageMatch: number;
  savings: number;
  rating: string;
  notes: string;
}

export interface InsurancePolicy {
  id: string;
  carrier: string;
  policyNumber: string;
  policyType: PolicyType;
  premium: number;
  billingFrequency: 'monthly' | 'annual';
  effectiveDate: string;
  expirationDate: string;
  coverageItems: CoverageItem[];
  status: 'active' | 'expiring_soon' | 'expired' | 'cancelled';
  daysUntilExpiration: number;
  aiSummary: string;
  gapsDetected: string[];
  yearOverYearPremiums: { year: number; premium: number }[];
  alternativeQuotes?: InsuranceQuote[];
  switchPaperworkReady?: boolean;
}

export interface Payment {
  id: string;
  vendorName: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  paymentMethod: 'ach' | 'check' | 'wire' | 'credit_card';
  bankAccount?: string;
  routingNumber?: string;
  status: 'pending_approval' | 'approved' | 'scheduled' | 'sent' | 'failed';
  quickbooksStatus: 'synced' | 'pending' | 'error' | 'not_connected';
  notes?: string;
}

export interface Renewal {
  id: string;
  vendorName: string;
  type: 'insurance' | 'saas' | 'contract' | 'maintenance';
  renewalDate: string;
  daysUntilRenewal: number;
  currentCost: number;
  autoRenews: boolean;
  noticePeriodDays: number;
  status: 'upcoming' | 'action_required' | 'cancelled' | 'renewed';
  notes?: string;
  policyId?: string;
  contractId?: string;
  alternativeAvailable?: boolean;
  potentialSavings?: number;
}

export interface InboxAlert {
  id: string;
  priority: AlertPriority;
  title: string;
  subtitle: string;
  amount?: number;
  actionLabel: string;
  secondaryActionLabel?: string;
  dismissed: boolean;
  createdAt: string;
  invoiceId?: string;
  policyId?: string;
  paymentId?: string;
  contractId?: string;
  renewalId?: string;
}

export interface AppSummary {
  pendingApprovals: number;
  anomaliesDetected: number;
  renewalsDueSoon: number;
  coverageGaps: number;
  totalPayableThisWeek: number;
  aiScansToday: number;
  monthlySavingsIdentified: number;
}

// ─── Order Automation ────────────────────────────────────────────────────────

export type OrderStatus =
  | 'new'
  | 'pending_approval'
  | 'confirmed'
  | 'dispatched'
  | 'delivered'
  | 'flagged'
  | 'incomplete';

export type OrderAnomalyType =
  | 'missing_rate'
  | 'duplicate_bol'
  | 'tight_window'
  | 'third_party_billing'
  | 'missing_fields'
  | 'weight_mismatch'
  | 'address_unverified';

export interface OrderAnomaly {
  id: string;
  type: OrderAnomalyType;
  severity: 'high' | 'medium' | 'low';
  description: string;
  resolved: boolean;
}

export interface OrderParty {
  name: string;
  locationCode?: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface CargoItem {
  description: string;
  pieces: number;
  weightLbs: number;
  weightKg?: number;
  freightClass?: string;
  hazmat?: boolean;
  specialInstructions?: string;
}

export interface OrderReference {
  label: string;
  value: string;
}

export interface CarrierContact {
  name: string;
  email: string;
  phone: string;
}

export interface DeliveryOrder {
  id: string;
  bolNumber: string;
  status: OrderStatus;
  source: 'gmail' | 'outlook' | 'manual';
  rawEmailSubject?: string;
  receivedDate: string;
  extractionConfidence: number;

  shipper: OrderParty;
  consignee: OrderParty;
  thirdPartyBillTo?: OrderParty;

  pickupReady: string;
  pickupClose: string;
  projectedDelivery: string;

  cargoItems: CargoItem[];
  totalPieces: number;
  totalWeightLbs: number;

  quotedRate?: number;
  currency?: string;
  carrierQuoteRef?: string;
  billingPortal?: string;

  references: OrderReference[];
  carrierContact?: CarrierContact;

  anomalies: OrderAnomaly[];
  missingFields?: string[];
  autoResponseSent?: boolean;
  aiNotes?: string;
}

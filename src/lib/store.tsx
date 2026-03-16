
import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { Invoice, Contract, InsurancePolicy, Payment, Renewal, InboxAlert, AppSummary } from './types';
import {
  MOCK_INVOICES, MOCK_CONTRACTS, MOCK_POLICIES,
  MOCK_PAYMENTS, MOCK_RENEWALS, MOCK_ALERTS, MOCK_SUMMARY,
} from './mock-data';

interface AppState {
  invoices: Invoice[];
  contracts: Contract[];
  policies: InsurancePolicy[];
  payments: Payment[];
  renewals: Renewal[];
  alerts: InboxAlert[];
  summary: AppSummary;
  isScanning: boolean;
  activeView: string;
}

type Action =
  | { type: 'DISMISS_ALERT'; id: string }
  | { type: 'APPROVE_INVOICE'; id: string }
  | { type: 'FLAG_INVOICE'; id: string }
  | { type: 'APPROVE_PAYMENT'; id: string }
  | { type: 'SET_SCANNING'; value: boolean }
  | { type: 'SET_VIEW'; view: string };

const initialState: AppState = {
  invoices: MOCK_INVOICES,
  contracts: MOCK_CONTRACTS,
  policies: MOCK_POLICIES,
  payments: MOCK_PAYMENTS,
  renewals: MOCK_RENEWALS,
  alerts: MOCK_ALERTS,
  summary: MOCK_SUMMARY,
  isScanning: false,
  activeView: 'inbox',
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'DISMISS_ALERT':
      return {
        ...state,
        alerts: state.alerts.map(a => a.id === action.id ? { ...a, dismissed: true } : a),
      };
    case 'APPROVE_INVOICE':
      return {
        ...state,
        invoices: state.invoices.map(inv =>
          inv.id === action.id ? { ...inv, status: 'approved' as const } : inv
        ),
        summary: { ...state.summary, pendingApprovals: Math.max(0, state.summary.pendingApprovals - 1) },
      };
    case 'FLAG_INVOICE':
      return {
        ...state,
        invoices: state.invoices.map(inv =>
          inv.id === action.id ? { ...inv, status: 'flagged' as const } : inv
        ),
      };
    case 'APPROVE_PAYMENT':
      return {
        ...state,
        payments: state.payments.map(p =>
          p.id === action.id ? { ...p, status: 'approved' as const } : p
        ),
        summary: { ...state.summary, pendingApprovals: Math.max(0, state.summary.pendingApprovals - 1) },
      };
    case 'SET_SCANNING':
      return { ...state, isScanning: action.value };
    case 'SET_VIEW':
      return { ...state, activeView: action.view };
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dismissAlert: (id: string) => void;
  approveInvoice: (id: string) => void;
  flagInvoice: (id: string) => void;
  approvePayment: (id: string) => void;
  triggerScan: () => void;
  setView: (view: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const dismissAlert = useCallback((id: string) => dispatch({ type: 'DISMISS_ALERT', id }), []);
  const approveInvoice = useCallback((id: string) => dispatch({ type: 'APPROVE_INVOICE', id }), []);
  const flagInvoice = useCallback((id: string) => dispatch({ type: 'FLAG_INVOICE', id }), []);
  const approvePayment = useCallback((id: string) => dispatch({ type: 'APPROVE_PAYMENT', id }), []);
  const setView = useCallback((view: string) => dispatch({ type: 'SET_VIEW', view }), []);

  const triggerScan = useCallback(() => {
    dispatch({ type: 'SET_SCANNING', value: true });
    setTimeout(() => dispatch({ type: 'SET_SCANNING', value: false }), 2500);
  }, []);

  return (
    <AppContext.Provider value={{ state, dismissAlert, approveInvoice, flagInvoice, approvePayment, triggerScan, setView }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppProvider');
  return ctx;
}

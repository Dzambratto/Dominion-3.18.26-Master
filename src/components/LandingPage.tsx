
import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Shield,
  Zap,
  TrendingDown,
  FileText,
  Mail,
  CheckCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  BarChart3,
  Lock,
  ArrowRight,
  ChevronDown,
  Star,
  Package,
  RefreshCw,
  Eye,
  X,
  Menu,
  Sparkles,
  Building2,
  Users,
  Globe,
} from 'lucide-react';

// ─── Logo ─────────────────────────────────────────────────────────────────────

function DominionLogo({ size = 36 }: { size?: number }) {
  return (
    <img
      src="/dominion-logo-transparent.png"
      alt="Dominion"
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  );
}

// ─── Animated Counter ─────────────────────────────────────────────────────────

function AnimatedCounter({ value, prefix = '', suffix = '', duration = 2000 }: {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const start = Date.now();
          const tick = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * value));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav({ onEnterApp, onSignIn }: { onEnterApp: () => void; onSignIn: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-[#0F1B33]/95 backdrop-blur-md shadow-xl shadow-black/20' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <DominionLogo size={44} />
          <span className="text-white font-bold text-2xl tracking-tight">Dominion</span>
        </div>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {['Platform', 'Features', 'Pricing', 'About'].map((item) => (
            <button
              key={item}
              onClick={() => scrollTo(item.toLowerCase())}
              className="text-slate-300 hover:text-white text-sm font-medium transition-colors"
            >
              {item}
            </button>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={onSignIn}
            className="text-slate-300 hover:text-white text-sm font-medium transition-colors px-4 py-2"
          >
            Sign In
          </button>
          <button
            onClick={onEnterApp}
            className="bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all hover:shadow-lg hover:shadow-blue-500/25 active:scale-95"
          >
            Sign Up
          </button>
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden text-white p-2"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0F1B33]/98 backdrop-blur-md border-t border-white/10 px-6 py-4 flex flex-col gap-4">
          {['Platform', 'Features', 'Pricing', 'About'].map((item) => (
            <button
              key={item}
              onClick={() => scrollTo(item.toLowerCase())}
              className="text-slate-300 hover:text-white text-sm font-medium text-left"
            >
              {item}
            </button>
          ))}
          <button
            onClick={onSignIn}
            className="text-slate-300 text-sm font-medium px-5 py-3 rounded-lg border border-white/10 mt-1"
          >
            Sign In
          </button>
          <button
            onClick={onEnterApp}
            className="bg-blue-500 text-white text-sm font-semibold px-5 py-3 rounded-lg mt-1"
          >
            Sign Up
          </button>
        </div>
      )}
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero({ onEnterApp, onSignIn }: { onEnterApp: () => void; onSignIn: () => void }) {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#080F1E]">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(59,130,246,0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.15) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] rounded-full bg-indigo-600/8 blur-[100px] pointer-events-none" />

      {/* Floating document cards */}
      <div className="absolute top-24 left-8 md:left-16 hidden lg:block animate-float-slow">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 w-52 shadow-2xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded bg-green-500/20 flex items-center justify-center">
              <CheckCircle size={12} className="text-green-400" />
            </div>
            <span className="text-white/70 text-xs font-medium">Invoice Matched</span>
          </div>
          <div className="text-white font-semibold text-sm">Acme Logistics</div>
          <div className="text-blue-400 font-bold text-lg mt-1">$12,450.00</div>
          <div className="text-white/40 text-xs mt-1">Contract rate verified ✓</div>
        </div>
      </div>

      <div className="absolute top-32 right-8 md:right-16 hidden lg:block animate-float-medium">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 w-52 shadow-2xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle size={12} className="text-amber-400" />
            </div>
            <span className="text-white/70 text-xs font-medium">Anomaly Detected</span>
          </div>
          <div className="text-white font-semibold text-sm">TechSoft SaaS</div>
          <div className="text-amber-400 font-bold text-lg mt-1">+18% rate increase</div>
          <div className="text-white/40 text-xs mt-1">Contract allows 5% max</div>
        </div>
      </div>

      <div className="absolute bottom-32 left-8 md:left-20 hidden lg:block animate-float-fast">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 w-52 shadow-2xl">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded bg-red-500/20 flex items-center justify-center">
              <Shield size={12} className="text-red-400" />
            </div>
            <span className="text-white/70 text-xs font-medium">Insurance Alert</span>
          </div>
          <div className="text-white font-semibold text-sm">General Liability</div>
          <div className="text-red-400 font-bold text-lg mt-1">Expires in 23 days</div>
          <div className="text-white/40 text-xs mt-1">3 quotes available</div>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto pt-24">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-8">
          <Sparkles size={13} className="text-blue-400" />
          <span className="text-blue-300 text-xs font-semibold tracking-wide uppercase">AI-First Financial Operations</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6">
          Your Business Finances,{' '}
          <span className="relative">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              Fully Automated
            </span>
            <svg className="absolute -bottom-2 left-0 w-full" height="6" viewBox="0 0 300 6" fill="none">
              <path d="M0 3 Q75 0 150 3 Q225 6 300 3" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            </svg>
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-slate-400 text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed mb-10">
          Dominion replaces your financial controller with AI — reading every invoice, contract, and insurance policy that lands in your inbox, catching overcharges before you pay them, and keeping your business protected around the clock.
        </p>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <button
            onClick={onEnterApp}
            className="group flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-bold text-base px-8 py-4 rounded-xl transition-all hover:shadow-2xl hover:shadow-blue-500/30 active:scale-95"
          >
            Start Free Beta
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={onSignIn}
            className="flex items-center gap-2 text-slate-300 hover:text-white font-medium text-base px-8 py-4 rounded-xl border border-white/10 hover:border-white/20 transition-all"
          >
            Sign In
          </button>
        </div>
        <div className="flex justify-center mb-10">
          <button
            onClick={() => document.getElementById('platform')?.scrollIntoView({ behavior: 'smooth' })}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors"
          >
            See How It Works
            <ChevronDown size={16} />
          </button>
        </div>

        {/* Social proof */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Lock size={14} className="text-slate-400" />
            <span>Bank-grade encryption</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-700" />
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-slate-400" />
            <span>No credit card required</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-700" />
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-slate-400" />
            <span>Live in under 5 minutes</span>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <ChevronDown size={24} className="text-slate-600" />
      </div>

      <style>{`
        @keyframes float-slow { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-12px); } }
        @keyframes float-medium { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes float-fast { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-16px); } }
        .animate-float-slow { animation: float-slow 6s ease-in-out infinite; }
        .animate-float-medium { animation: float-medium 4.5s ease-in-out infinite 1s; }
        .animate-float-fast { animation: float-fast 5s ease-in-out infinite 2s; }
      `}</style>
    </section>
  );
}

// ─── Stats Bar ────────────────────────────────────────────────────────────────

function StatsBar() {
  return (
    <section className="bg-[#0F1B33] border-y border-white/5 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: 95, suffix: '%+', label: 'Extraction Accuracy', prefix: '' },
            { value: 99, suffix: '%', label: 'Documents Processed Without Manual Entry', prefix: '' },
            { value: 2, suffix: ' min', label: 'Average Review Time', prefix: '<' },
            { value: 100, suffix: '%', label: 'Full Audit Trail', prefix: '' },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center">
              <div className="text-4xl md:text-5xl font-black text-white mb-2">
                <AnimatedCounter
                  value={stat.value}
                  prefix={stat.prefix}
                  suffix={stat.suffix}
                />
              </div>
              <div className="text-slate-400 text-sm font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Platform Section ─────────────────────────────────────────────────────────

function PlatformSection() {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    {
      icon: <FileText size={18} />,
      label: 'AP Automation',
      title: 'Every invoice, verified before you pay it',
      description: `When an invoice arrives in your inbox, Dominion reads it instantly — extracting the vendor, amount, line items, and due date with over 95% accuracy. It then cross-references every charge against your active contracts, flagging any rate that exceeds what you agreed to pay.

Duplicate invoices, inflated line items, and unauthorized rate increases are caught automatically. You only see what needs a human decision — everything else is handled.`,
      items: [
        'Automatic invoice extraction from email attachments',
        'Contract-to-invoice matching with rate verification',
        'Duplicate detection across all vendors',
        'Auto-response to incomplete or missing invoices',
        'One-click approval queue with full audit trail',
      ],
      color: 'blue',
    },
    {
      icon: <Shield size={18} />,
      label: 'Insurance Intelligence',
      title: 'Never miss a renewal. Never overpay for coverage.',
      description: `Insurance policies are dense, technical documents that most business owners never fully read. Dominion reads every policy for you — extracting coverage limits, deductibles, exclusions, and renewal dates, then summarizing what you're actually protected against in plain English.

When a policy is approaching expiration, Dominion alerts you with enough lead time to shop alternatives. It identifies coverage gaps before they become costly claims.`,
      items: [
        'Full policy reading with plain-English summaries',
        'Coverage gap detection and risk scoring',
        'Renewal alerts 90, 60, and 30 days out',
        'Auto-renew clause detection and flagging',
        'Side-by-side quote comparison',
      ],
      color: 'indigo',
    },
    {
      icon: <Package size={18} />,
      label: 'Order Automation',
      title: 'Every order document handled automatically, across any industry',
      description: `Whether you're managing freight and bills of lading, purchase orders from suppliers, work orders in construction or field services, or fulfillment documents in retail and distribution — Dominion reads them all. It extracts the critical data from any document format and flags discrepancies before they cause delays or cost you money.
Manufacturers, logistics operators, contractors, wholesalers, and service businesses all run on order documents. Dominion makes sure nothing slips through.`,
      items: [
        'Purchase orders, BOLs, work orders, and fulfillment docs',
        'Vendor, quantity, pricing, and delivery term extraction',
        'Rate and delivery window conflict detection',
        'Cross-reference against contracts and prior orders',
        'Approval workflow with full audit trail',
      ],
      color: 'violet',
    },
    {
      icon: <FileText size={18} />,
      label: 'Contract Tracking',
      title: 'Know exactly what every vendor can charge you',
      description: `Contracts get signed and forgotten — until a vendor quietly raises their rates. Dominion maintains a living rate card for every active vendor agreement, tracking year-over-year changes and alerting you when an invoice charges more than your contract allows.

When contracts approach renewal, Dominion flags them with enough notice to renegotiate or switch vendors before auto-renewal locks you in.`,
      items: [
        'Automatic contract extraction and rate card building',
        'Year-over-year rate change tracking',
        'Renewal and cancellation window alerts',
        'Auto-renewal clause detection',
        'Invoice-to-contract matching for every payment',
      ],
      color: 'cyan',
    },
    {
      icon: <Brain size={18} />,
      label: 'AI Intelligence',
      title: 'Operational intelligence that never sleeps',
       description: `Dominion's AI Operational Intelligence engine continuously monitors every pattern across your vendors, invoices, contracts, and payments — surfacing anomalies, trends, and risks before they become costly problems.

From cost spikes and duplicate invoices to vendor quality degradation and coverage gaps, the pattern detection engine runs 24/7 and delivers actionable alerts ranked by financial impact.

Every vendor you work with gets an automatically built profile. From the first invoice Dominion processes, it begins tracking total spend, job history, invoice accuracy, and response times — aggregating everything by month, quarter, and year. The more you use a vendor, the richer the profile becomes: a living record of every dollar spent, every job completed, and every time they fell short of their contract.`,
      items: [
        'Cost spike detection across all vendor categories',
        'Duplicate invoice and double-billing alerts',
        'Vendor quality score tracking over time',
        'Contract compliance monitoring and breach alerts',
        'Insurance coverage gap and renewal risk scoring',
        'Cash flow forecasting and payment timing optimization',
        'Seasonal spend pattern analysis',
        'Market rate benchmarking for all vendor categories',
      ],
      color: 'emerald',
    },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  };

  const active = tabs[activeTab];

  return (
    <section id="platform" className="py-24 bg-[#080F1E]">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-6">
            <Brain size={13} className="text-blue-400" />
            <span className="text-slate-300 text-xs font-semibold tracking-wide uppercase">The Platform</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Five modules. One command center.
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Dominion covers every document that flows through your business — from the invoice in your inbox to the insurance policy buried in your files.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-2 justify-center mb-12">
          {tabs.map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(i)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                activeTab === i
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div>
            <h3 className="text-3xl font-black text-white mb-5 leading-tight">
              {active.title}
            </h3>
            {active.description.split('\n\n').map((para, i) => (
              <p key={i} className="text-slate-400 text-base leading-relaxed mb-4">
                {para}
              </p>
            ))}
          </div>
          <div className="bg-white/3 border border-white/8 rounded-2xl p-8">
            <div className="text-slate-400 text-sm font-semibold uppercase tracking-wide mb-5">What it does</div>
            <div className="flex flex-col gap-3">
              {active.items.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <div className="mt-0.5 w-5 h-5 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                    <CheckCircle size={11} className="text-blue-400" />
                  </div>
                  <span className="text-slate-300 text-sm leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Features Grid ────────────────────────────────────────────────────────────

function FeaturesSection() {
  const features = [
    {
      icon: <Mail size={22} />,
      title: 'Email-Native Ingestion',
      description: 'Connect your Gmail or Outlook in one click. Dominion monitors your inbox in real time and processes every financial document the moment it arrives — no manual uploads, no forwarding rules.',
      color: 'blue',
    },
    {
      icon: <Brain size={22} />,
      title: 'Multimodal AI Extraction',
      description: 'Our AI reads PDFs, scanned documents, and email attachments with the same precision a trained accountant would — extracting every field, line item, and date with a documented confidence score.',
      color: 'indigo',
    },
    {
      icon: <TrendingDown size={22} />,
      title: 'Anomaly Detection Engine',
      description: 'Dominion compares every charge against your contracts, your history, and market norms. Price increases, duplicate invoices, and unauthorized fees are flagged before they reach your payment queue.',
      color: 'violet',
    },
    {
      icon: <Clock size={22} />,
      title: 'Two-Year Historical Backfill',
      description: 'Connect your email and Dominion immediately scans the past two years of your inbox — building a complete picture of your vendor relationships, payment history, and contract terms from day one.',
      color: 'cyan',
    },
    {
      icon: <DollarSign size={22} />,
      title: 'Human-Approval Payments',
      description: 'No payment is ever made without your explicit approval. Dominion prepares the payment, verifies the details, and presents it to you for a single tap of confirmation. Full control, zero busywork.',
      color: 'emerald',
    },
    {
      icon: <BarChart3 size={22} />,
      title: 'Vendor Intelligence Layer',
      description: 'The moment Dominion encounters a new vendor, it opens a profile. Every subsequent invoice, contract, or order enriches it — building a complete picture of total spend, jobs completed, payment history, and compliance rate, all broken down by month, quarter, and year. One click gives you an instant audit of every dollar that has ever moved between you and that vendor.',
      color: 'amber',
    },
    {
      icon: <RefreshCw size={22} />,
      title: 'QuickBooks Sync',
      description: 'Approved invoices and payments sync directly to QuickBooks, keeping your books current without double-entry. Your accountant will thank you.',
      color: 'blue',
    },
    {
      icon: <Eye size={22} />,
      title: 'Full Audit Trail',
      description: 'Every AI decision is logged with the source text, confidence score, and reasoning. You can trace exactly why any invoice was flagged, approved, or rejected — essential for compliance and disputes.',
      color: 'indigo',
    },
    {
      icon: <Lock size={22} />,
      title: 'Bank-Grade Security',
      description: 'All data is encrypted at rest and in transit. Row-level security ensures your financial data is completely isolated from other companies. SOC 2 compliance roadmap in progress.',
      color: 'slate',
    },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-400',
    indigo: 'bg-indigo-500/10 text-indigo-400',
    violet: 'bg-violet-500/10 text-violet-400',
    cyan: 'bg-cyan-500/10 text-cyan-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    slate: 'bg-slate-500/10 text-slate-400',
  };

  return (
    <section id="features" className="py-24 bg-[#0A1120]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-6">
            <Zap size={13} className="text-blue-400" />
            <span className="text-slate-300 text-xs font-semibold tracking-wide uppercase">Features</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Built for how real businesses operate
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Every feature in Dominion was designed around one question: what does a great financial controller actually do all day?
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group bg-white/3 hover:bg-white/6 border border-white/8 hover:border-white/15 rounded-2xl p-7 transition-all duration-300 cursor-default"
            >
              <div className={`w-11 h-11 rounded-xl ${colorMap[feature.color]} flex items-center justify-center mb-5`}>
                {feature.icon}
              </div>
              <h3 className="text-white font-bold text-lg mb-3">{feature.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── About / Mission ──────────────────────────────────────────────────────────

function AboutSection() {
  return (
    <section id="about" className="py-24 bg-[#080F1E]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Story */}
          <div>
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8">
              <Building2 size={13} className="text-blue-400" />
              <span className="text-slate-300 text-xs font-semibold tracking-wide uppercase">Our Mission</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-8 leading-tight">
              Built for businesses that can't afford to miss anything
            </h2>
            <div className="space-y-5 text-slate-400 text-base leading-relaxed">
              <p>
                Most businesses operate without dedicated financial oversight. Invoices get paid without verification. Contracts get signed and forgotten. Insurance lapses quietly. Vendors test the limits — because no one is watching closely enough.
              </p>
              <p>
                Dominion changes that. Our AI monitors every financial document that touches your business — reading, verifying, and flagging issues before they cost you. Not as a replacement for your judgment, but as the layer of scrutiny that makes your decisions more confident.
              </p>
              <p>
                When something reaches your desk, it genuinely needs your attention. Everything else is handled.
              </p>
            </div>
          </div>

          {/* Right: Values */}
          <div className="space-y-5">
            {[
              {
                icon: <Shield size={20} />,
                title: 'Protection First',
                desc: 'Every feature is designed to protect your business from overpayment, coverage gaps, and contract violations. We measure success by the money we save you, not the features we ship.',
              },
              {
                icon: <Eye size={20} />,
                title: 'Radical Transparency',
                desc: 'You should always know why Dominion flagged something. Every AI decision comes with a confidence score, source text, and plain-English explanation. No black boxes.',
              },
              {
                icon: <Users size={20} />,
                title: 'Human in the Loop',
                desc: 'AI handles the volume. Humans handle the judgment. Dominion never takes an action without your approval — it prepares, verifies, and presents. You decide.',
              },
              {
                icon: <Globe size={20} />,
                title: 'Built for the Real World',
                desc: 'We built Dominion by studying how actual SMBs operate — messy inboxes, inconsistent vendor formats, and contracts that get signed and forgotten. It works with reality, not against it.',
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-5 bg-white/3 border border-white/8 rounded-2xl p-6">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {item.icon}
                </div>
                <div>
                  <div className="text-white font-bold mb-1.5">{item.title}</div>
                  <div className="text-slate-400 text-sm leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

function PricingSection({ onEnterApp }: { onEnterApp: () => void }) {
  const plans = [
    {
      name: 'Starter',
      planId: 'starter',
      price: 149,
      description: 'For small businesses processing up to 50 invoices per month.',
      features: [
        'Up to 50 invoices/month',
        'Gmail & Outlook connection',
        'Invoice extraction & matching',
        'Basic anomaly detection',
        'Email alerts',
        '6-month email backfill',
      ],
      cta: 'Start Free Trial',
      highlight: false,
    },
    {
      name: 'Operator',
      planId: 'operator',
      price: 349,
      description: 'For growing businesses that need full AP automation and insurance tracking.',
      features: [
        'Up to 250 invoices/month',
        'Everything in Starter',
        'Insurance Intelligence module',
        'Contract tracking & rate cards',
        'QuickBooks sync',
        '2-year email backfill',
        'Priority support',
      ],
      cta: 'Start Free Trial',
      highlight: true,
      badge: 'Most Popular',
    },
    {
      name: 'Controller',
      planId: 'controller',
      price: 749,
      description: 'For established businesses that need the full platform with order automation.',
      features: [
        'Unlimited invoices',
        'Everything in Operator',
        'Order Automation (POs, BOLs, work orders)',
        'Advanced vendor intelligence',
        'Team collaboration & roles',
        'API access',
        'Dedicated onboarding',
      ],
      cta: 'Start Free Trial',
      highlight: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 bg-[#0A1120]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-6">
            <DollarSign size={13} className="text-blue-400" />
            <span className="text-slate-300 text-xs font-semibold tracking-wide uppercase">Pricing</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Straightforward pricing. No surprises.
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Start free during beta. When we launch, plans are priced for the businesses that need this most — not just the ones that can already afford a finance team.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-8 flex flex-col ${
                plan.highlight
                  ? 'bg-blue-500/10 border-2 border-blue-500/40 shadow-2xl shadow-blue-500/10'
                  : 'bg-white/3 border border-white/10'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-4 py-1 rounded-full">
                  {plan.badge}
                </div>
              )}
              <div className="mb-6">
                <div className="text-white font-bold text-xl mb-1">{plan.name}</div>
                <div className="flex items-baseline gap-1 mb-3">
                  <span className="text-5xl font-black text-white">${plan.price}</span>
                  <span className="text-slate-400 text-sm">/month</span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{plan.description}</p>
              </div>

              <div className="flex flex-col gap-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <CheckCircle size={14} className={plan.highlight ? 'text-blue-400' : 'text-slate-400'} />
                    <span className="text-slate-300 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => startCheckout((plan as any).planId)}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                  plan.highlight
                    ? 'bg-blue-500 hover:bg-blue-400 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-white/8 hover:bg-white/15 text-white border border-white/10'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-slate-500 text-sm mt-8">
          All plans include a 14-day free trial. No credit card required. Cancel anytime.
        </p>
      </div>
    </section>
  );
}

// ─── CTA Section ─────────────────────────────────────────────────────────────

function CTASection({ onEnterApp }: { onEnterApp: () => void }) {
  return (
    <section className="py-24 bg-[#080F1E] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-indigo-600/10 pointer-events-none" />
      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-8">
          <Star size={13} className="text-blue-400" />
          <span className="text-blue-300 text-xs font-semibold tracking-wide uppercase">Early Access Beta</span>
        </div>
        <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
          Stop paying for mistakes.<br />Start running with confidence.
        </h2>
        <p className="text-slate-400 text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
          Join the beta and connect your first email account in under five minutes. Dominion will scan your last two years of financial documents and show you exactly what it finds.
        </p>
        <button
          onClick={onEnterApp}
          className="group inline-flex items-center gap-3 bg-blue-500 hover:bg-blue-400 text-white font-bold text-lg px-10 py-5 rounded-xl transition-all hover:shadow-2xl hover:shadow-blue-500/30 active:scale-95"
        >
          Launch Dominion
          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </button>
        <p className="text-slate-600 text-sm mt-6">Free during beta · No credit card · Cancel anytime</p>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-[#060D1A] border-t border-white/5 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <DominionLogo size={40} />
            <span className="text-white font-bold text-lg">Dominion</span>
          </div>
          <div className="text-slate-500 text-sm text-center">
            AI-powered financial operations for growing businesses.
          </div>
          <div className="text-slate-600 text-sm">
            © {new Date().getFullYear()} Dominion. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────────────

export function LandingPage({ onEnterApp, onSignIn }: { onEnterApp: () => void; onSignIn?: () => void }) {
  const handleSignIn = onSignIn ?? onEnterApp;
  return (
    <div className="min-h-screen bg-[#080F1E]">
      <Nav onEnterApp={onEnterApp} onSignIn={handleSignIn} />
      <Hero onEnterApp={onEnterApp} onSignIn={handleSignIn} />
      <StatsBar />
      <PlatformSection />
      <FeaturesSection />
      <AboutSection />
      <PricingSection onEnterApp={onEnterApp} />
      <CTASection onEnterApp={onEnterApp} />
      <Footer />
    </div>
  );
}

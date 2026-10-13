import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Shield,
  CheckCircle2,
  ArrowRight,
  Users,
  Coins,
  Clock,
  Calendar,
  ChevronDown,
  Lock,
  Receipt,
  Scale,
  Fingerprint,
  ArrowUpRight,
  Check,
} from "lucide-react";
import { useAuth, DEMO_USERS } from "../../lib/authContext";
import { UserRole } from "../../types/hrms";
import { formatINR } from "../../lib/utils";
import { GaHrmsLogo } from "../../components/ui/GaHrmsLogo";

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user, login } = useAuth();

  // Active Persona State
  const [activePersona, setActivePersona] = useState<UserRole>("HR_ADMIN");

  // FAQ Accordion - all closed by default
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleLaunchRole = (role: UserRole) => {
    const demo = DEMO_USERS[role];
    login(demo.email, role);
    navigate("/dashboard");
  };

  const personas = [
    {
      role: "SUPER_ADMIN" as UserRole,
      title: "Super Admin",
      pill: "For Administrators",
      headline: "Manage company settings and user access.",
      description:
        "Set up branch offices, invite team members, assign permissions, and maintain clear records of important administrative changes.",
      highlights: [
        "Company details and branch office setup",
        "User accounts and role-based permissions",
        "Company-wide payroll and tax settings",
        "Transparent system activity history",
      ],
      actionLabel: "Try as Super Admin",
      capabilities: [
        {
          title: "Organization Setup",
          desc: "Manage company branches, legal registration, and standard working days.",
          icon: Shield,
        },
        {
          title: "User Permissions",
          desc: "Control which features each manager and team member can access.",
          icon: Users,
        },
        {
          title: "Payroll & Tax Rules",
          desc: "Set standard formulas for provident fund and local state taxes.",
          icon: Coins,
        },
        {
          title: "Activity History",
          desc: "Review a clean timeline of recent administrative actions.",
          icon: Receipt,
        },
      ],
    },
    {
      role: "HR_ADMIN" as UserRole,
      title: "HR Manager",
      pill: "For HR Teams",
      headline: "Run payroll and manage employee records.",
      description:
        "Keep employee profiles organized, track daily attendance, and calculate monthly salaries without manual spreadsheets.",
      highlights: [
        "Central employee directory and records",
        "Daily attendance tracking and shift rosters",
        "Monthly salary and tax calculations",
        "One-click payslip generation",
      ],
      actionLabel: "Try as HR Manager",
      capabilities: [
        {
          title: "Employee Directory",
          desc: "Store employee profiles, job titles, and essential documents in one list.",
          icon: Users,
        },
        {
          title: "Time & Attendance",
          desc: "Track daily hours, shift rosters, and check-in records smoothly.",
          icon: Calendar,
        },
        {
          title: "Monthly Payroll",
          desc: "Calculate salaries, tax deductions, and net payouts in just a few clicks.",
          icon: Coins,
        },
        {
          title: "Digital Payslips",
          desc: "Create clean, printable payslips that employees can download anytime.",
          icon: Receipt,
        },
      ],
    },
    {
      role: "MANAGER" as UserRole,
      title: "Team Lead",
      pill: "For Managers",
      headline: "Approve time off and keep your team on schedule.",
      description:
        "See who is in the office, review vacation requests quickly, and make sure your team has coverage throughout the week.",
      highlights: [
        "Review and approve leave requests in seconds",
        "Check daily team attendance and presence",
        "Manage shift coverage and weekly schedules",
        "Track upcoming team time off on a shared calendar",
      ],
      actionLabel: "Try as Team Lead",
      capabilities: [
        {
          title: "Leave Approvals",
          desc: "Review vacation requests from your team and approve them quickly.",
          icon: Calendar,
        },
        {
          title: "Daily Presence",
          desc: "See who is in the office, working remotely, or away on leave today.",
          icon: Users,
        },
        {
          title: "Shift Planning",
          desc: "Organize weekly shifts and balance workload across the team.",
          icon: Clock,
        },
        {
          title: "Shared Calendar",
          desc: "View upcoming company holidays and planned time off together.",
          icon: Receipt,
        },
      ],
    },
    {
      role: "EMPLOYEE" as UserRole,
      title: "Employee",
      pill: "For Employees",
      headline: "Clock in, check leave, and view your payslips.",
      description:
        "A simple personal space where employees can log work hours, apply for time off, and download monthly salary slips anytime.",
      highlights: [
        "Clock in and out directly from your browser",
        "Check remaining vacation and sick days",
        "Submit leave requests to your manager",
        "Download tax and salary slips whenever you need them",
      ],
      actionLabel: "Try as Employee",
      capabilities: [
        {
          title: "Daily Work Log",
          desc: "Clock in when you start your day and clock out when you finish.",
          icon: Clock,
        },
        {
          title: "Leave Balances",
          desc: "See how many vacation, sick, and casual days you have left.",
          icon: Calendar,
        },
        {
          title: "Request Time Off",
          desc: "Submit a leave request and get notified as soon as it is approved.",
          icon: Users,
        },
        {
          title: "My Payslips",
          desc: "View and download past monthly salary slips anytime you need them.",
          icon: Receipt,
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900 selection:bg-gray-950 selection:text-white flex flex-col font-sans">
      {/* Minimalist Crisp Header with Seamless Blend */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100/60 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center group">
            <GaHrmsLogo size="md" variant="light" />
          </Link>

          {/* Nav Links: Sentence-case, generous breathing room */}
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-gray-600">
            <a
              href="#pipeline"
              className="hover:text-gray-950 transition-colors"
            >
              Payroll Pipeline
            </a>
            <a
              href="#roles"
              className="hover:text-gray-950 transition-colors"
            >
              Role Personas
            </a>
            <a href="#matrix" className="hover:text-gray-950 transition-colors">
              Compliance
            </a>
            <a href="#faqs" className="hover:text-gray-950 transition-colors">
              FAQ
            </a>
          </nav>

          {/* Right Actions: Subtle Sign In + Sleek Pill CTA */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full bg-gray-950 text-white hover:bg-black transition-all shadow-2xs"
                id="header-cta-dashboard"
              >
                <span>Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-[13px] font-medium text-gray-600 hover:text-gray-950 transition-colors px-2 py-1"
                  id="header-btn-login"
                >
                  Sign in
                </Link>
                <button
                  type="button"
                  onClick={() => handleLaunchRole("HR_ADMIN")}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full bg-gray-950 text-white hover:bg-black hover:shadow-xs transition-all active:scale-[0.98]"
                  id="header-btn-launch"
                >
                  <span>Live Demo</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section: Centered Editorial Headline with Flanking HRMS Enterprise 3D Cards */}
      <section className="relative min-h-[580px] lg:min-h-[640px] pt-20 pb-20 sm:pt-24 sm:pb-24 bg-white overflow-hidden flex items-center justify-center">
        {/* Full-Bleed Real HRMS Enterprise 3D Cards Background */}
        <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
          <img
            src="/hero-hrms-enterprise-cards-wide.jpg"
            alt="GA-HRMS Biometrics, Indian Statutory Compliance & Payroll Disbursal"
            className="w-full h-full object-cover object-center"
            loading="eager"
          />
          {/* Subtle soft radial wash strictly in the center ensuring 100% text contrast with zero card overlap */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.92)_30%,rgba(255,255,255,0.65)_50%,transparent_75%)]" />

          {/* Top seamless dissolve into header */}
          <div className="absolute inset-x-0 top-0 h-24 sm:h-36 bg-gradient-to-b from-white via-white/80 to-transparent" />

          {/* Bottom seamless dissolve into Section 2 (#FAFAFA) */}
          <div className="absolute inset-x-0 bottom-0 h-32 sm:h-44 bg-gradient-to-t from-[#FAFAFA] via-[#FAFAFA]/90 to-transparent" />
        </div>

        {/* Centered Foreground Content Framed with Generous Breathing Room */}
        <div className="relative z-20 max-w-3xl mx-auto px-4 sm:px-6 text-center space-y-6">
          {/* Centered, Authoritative Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-black text-gray-950 tracking-tight leading-[1.1] max-w-2xl mx-auto">
            The modern HR &amp; payroll engine for Indian enterprises.
          </h1>

          {/* Clean Subtitle */}
          <p className="text-base sm:text-lg text-gray-600 max-w-xl mx-auto leading-relaxed font-normal">
            Automated biometric attendance, multi-tier approvals, Indian statutory compliance (EPF, ESIC, PT, TDS), and one-click salary disbursal.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleLaunchRole("HR_ADMIN")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold bg-gray-950 text-white hover:bg-black transition-all shadow-md active:scale-[0.98]"
              id="hero-btn-primary"
            >
              <span>Launch Live Demo</span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </button>
            <a
              href="#pipeline"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 rounded-full text-sm font-semibold border border-gray-300 bg-white/95 backdrop-blur-md text-gray-800 hover:border-gray-950 hover:text-gray-950 transition-all shadow-2xs"
            >
              Explore Architecture ↓
            </a>
          </div>

          {/* Trust Indicators */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-gray-500 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              100% Indian Statutory Compliant
            </span>
            <span className="text-gray-300">•</span>
            <span>Automated EPFO ECR Generation</span>
            <span className="text-gray-300">•</span>
            <span>Direct Bank Disbursal Ready</span>
          </div>
        </div>
      </section>

      {/* Section 2: End-to-End Execution Pipeline */}
      <section
        id="pipeline"
        className="py-16 sm:py-20 bg-[#FAFAFA] border-b border-gray-200/70"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-3xl space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-950 tracking-tight">
              From biometric punch to statutory salary disbursal in four stages.
            </h2>
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              Most HR platforms treat attendance and payroll as separate
              databases. In GA-HRMS, every biometric log, leave approval, and
              shift rule feeds directly into the monthly payroll engine.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Biometric & Attendance Normalization",
                tag: "Real-Time Ingestion",
                icon: Fingerprint,
                desc: "Face/fingerprint logs sync through webhook pushes. Shifts with 15m grace periods and late penalties are applied automatically.",
                bullet: "Grace period & overtime math",
              },
              {
                step: "02",
                title: "Leave Hierarchy & LOP Sync",
                tag: "Multi-Tier Approval",
                icon: Calendar,
                desc: "Sandwich leave policies, unapproved absences, and exhausted quota days automatically calculate daily Loss-Of-Pay deductions.",
                bullet: "Instant supervisor endorsement",
              },
              {
                step: "03",
                title: "Statutory Indian Deductions",
                tag: "Automated Compliance",
                icon: Scale,
                desc: "Automated calculations for EPF (₹15,000 cap), ESIC gross eligibility, State PT slabs, and regime-based TDS.",
                bullet: "Zero-Excel formula errors",
              },
              {
                step: "04",
                title: "1-Click Disbursal & Payslip Vault",
                tag: "Batch Dispatch",
                icon: Receipt,
                desc: "Audit approval locks the payroll run. Employees instantly receive confidential, digitally formatted payslips in their ESS vault.",
                bullet: "Bank payout text & Form 16 ready",
              },
            ].map((p, idx) => {
              const Icon = p.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl border border-gray-200 bg-white flex flex-col justify-between hover:border-gray-900 hover:shadow-xs transition-all duration-200 space-y-6"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-black text-gray-950">
                        {p.step}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 text-gray-600 font-medium">
                        {p.tag}
                      </span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-900">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-gray-950">
                      {p.title}
                    </h3>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {p.desc}
                    </p>
                  </div>
                  <div className="pt-4 border-t border-gray-100 text-[11px] font-medium text-gray-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{p.bullet}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 3: Built for Every Role */}
      <section
        id="roles"
        className="py-16 sm:py-20 bg-white border-b border-gray-200/70"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <h2 className="text-3xl sm:text-4xl font-black text-gray-950 tracking-tight">
                Every team member gets a tailored view.
              </h2>
              <p className="text-sm text-gray-600">
                Select a role to see how the system adapts to administrators,
                managers, and employees.
              </p>
            </div>

            {/* Persona Switcher Tabs - Minimalist Slate Pills */}
            <div className="flex flex-wrap p-1.5 bg-gray-100 rounded-xl gap-1 border border-gray-200/60">
              {personas.map((p) => {
                const isSelected = activePersona === p.role;
                return (
                  <button
                    key={p.role}
                    type="button"
                    onClick={() => setActivePersona(p.role)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                      isSelected
                        ? "bg-gray-950 text-white shadow-xs"
                        : "text-gray-600 hover:text-gray-950 hover:bg-white/60"
                    }`}
                  >
                    {p.title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Persona Showcase Frame */}
          {(() => {
            const current =
              personas.find((p) => p.role === activePersona) || personas[0];
            return (
              <div className="bg-[#FAFAFA] rounded-3xl border border-gray-200 shadow-xs p-8 sm:p-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
                {/* Left Persona Details */}
                <div className="lg:col-span-6 space-y-6 text-left">
                  <div className="space-y-2">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                      {current.pill}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-950">
                      {current.headline}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed pt-1">
                      {current.description}
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    {current.highlights.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 text-xs sm:text-sm font-medium text-gray-800"
                      >
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                          <Check className="w-3 h-3" />
                        </div>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => handleLaunchRole(current.role)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gray-950 text-white hover:bg-black transition-all shadow-xs active:scale-[0.98]"
                    >
                      <span>{current.actionLabel}</span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </button>
                    <span className="text-xs text-gray-500 font-medium">
                      Instant 1-click access
                    </span>
                  </div>
                </div>

                {/* Right Column: Clean Workspace Feature Cards */}
                <div className="lg:col-span-6 bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-xs font-bold text-gray-900">
                        {current.title} Features
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 font-normal">
                      Interactive Workspace
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {current.capabilities.map((cap, idx) => {
                      const Icon = cap.icon;
                      return (
                        <div
                          key={idx}
                          className="p-4 rounded-xl border border-gray-200/80 bg-gray-50/50 hover:bg-white hover:border-gray-900 hover:shadow-2xs transition-all duration-150 space-y-2"
                        >
                          <div className="w-8 h-8 rounded-lg bg-white border border-gray-200/80 flex items-center justify-center text-gray-900">
                            <Icon className="w-4 h-4 text-gray-800" />
                          </div>
                          <p className="text-xs font-bold text-gray-950">
                            {cap.title}
                          </p>
                          <p className="text-[11px] text-gray-600 leading-relaxed font-normal">
                            {cap.desc}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 text-center border-t border-gray-100">
                    <p className="text-[11px] text-gray-400">
                      Switch between roles above to view each workspace.
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* Section 4: Indian Statutory Compliance Matrix */}
      <section
        id="matrix"
        className="py-16 sm:py-20 bg-[#FAFAFA] border-b border-gray-200/70"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="max-w-3xl space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-950 tracking-tight">
              Pre-wired for the complexities of Indian labor laws.
            </h2>
            <p className="text-sm text-gray-600">
              Statutory calculation guidelines vary across central schemes and
              individual states. GA-HRMS codifies every statutory rule into
              bulletproof logic.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-2xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold text-[11px]">
                  <th className="p-4">Statutory Scheme</th>
                  <th className="p-4">Governing Mandate</th>
                  <th className="p-4">Calculation Formula</th>
                  <th className="p-4">Statutory Ceiling / Exemption</th>
                  <th className="p-4">GA-HRMS Engine Automation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr className="hover:bg-gray-50/70 transition-colors">
                  <td className="p-4 font-bold text-gray-950">
                    Employee Provident Fund (EPF)
                  </td>
                  <td className="p-4 text-gray-600">
                    Employees' Provident Funds Act, 1952
                  </td>
                  <td className="p-4 font-mono text-gray-800">
                    12% Employee + 12% Employer on Basic + DA
                  </td>
                  <td className="p-4 text-gray-600">
                    Capped at ₹15,000 monthly wage ceiling (₹1,800/mo cap
                    toggle)
                  </td>
                  <td className="p-4 font-semibold text-emerald-700">
                    Auto-capped or actual wage option
                  </td>
                </tr>
                <tr className="hover:bg-gray-50/70 transition-colors">
                  <td className="p-4 font-bold text-gray-950">
                    Employee State Insurance (ESIC)
                  </td>
                  <td className="p-4 text-gray-600">ESI Act, 1948</td>
                  <td className="p-4 font-mono text-gray-800">
                    0.75% Employee + 3.25% Employer on Gross Wage
                  </td>
                  <td className="p-4 text-gray-600">
                    Applicable only if Gross Salary is &lt;= ₹21,000/mo
                  </td>
                  <td className="p-4 font-semibold text-emerald-700">
                    Automatic cutoff switch
                  </td>
                </tr>
                <tr className="hover:bg-gray-50/70 transition-colors">
                  <td className="p-4 font-bold text-gray-950">
                    Professional Tax (PT)
                  </td>
                  <td className="p-4 text-gray-600">
                    State Municipal Acts (MH, KA, TS, TN)
                  </td>
                  <td className="p-4 font-mono text-gray-800">
                    State-wise tiered slabs (e.g., ₹200/mo in MH)
                  </td>
                  <td className="p-4 text-gray-600">
                    Exempt in states like Delhi, Haryana; variable in others
                  </td>
                  <td className="p-4 font-semibold text-emerald-700">
                    Branch address-based auto selection
                  </td>
                </tr>
                <tr className="hover:bg-gray-50/70 transition-colors">
                  <td className="p-4 font-bold text-gray-950">
                    TDS on Salaries
                  </td>
                  <td className="p-4 text-gray-600">
                    Income Tax Act, 1961 (Sec 192)
                  </td>
                  <td className="p-4 font-mono text-gray-800">
                    Progressive tax slabs (New vs Old regime)
                  </td>
                  <td className="p-4 text-gray-600">
                    Rebate u/s 87A up to ₹7,00,000 in New Tax Regime
                  </td>
                  <td className="p-4 font-semibold text-emerald-700">
                    Form 16 readiness & monthly deduction
                  </td>
                </tr>
                <tr className="hover:bg-gray-50/70 transition-colors">
                  <td className="p-4 font-bold text-gray-950">
                    Loss of Pay (LOP)
                  </td>
                  <td className="p-4 text-gray-600">
                    Factories Act & Model Standing Orders
                  </td>
                  <td className="p-4 font-mono text-gray-800">
                    Gross / Working Days * Unapproved Absent Days
                  </td>
                  <td className="p-4 text-gray-600">
                    Linked to biometric punch & unapproved leave balance
                  </td>
                  <td className="p-4 font-semibold text-emerald-700">
                    1-click sync into monthly run
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 5: FAQs */}
      <section id="faqs" className="py-16 bg-white border-b border-gray-200/70">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-gray-950 tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "How does the live demo work without requiring a signup or backend?",
                a: "GA-HRMS comes with an embedded, complete in-browser persistence layer using LocalStorage. We pre-populate realistic corporate records (148 employees, departments, historical attendance, and payroll records) across 4 role personas. Any modifications you make (adding an employee, approving leaves, running payroll) are preserved safely in your browser.",
              },
              {
                q: "Can I customize the salary component structure for our organization?",
                a: "Yes. The Payroll module includes customizable salary templates where you can configure Basic, HRA, Dearness Allowance, Special Allowances, and custom reimbursement heads alongside statutory EPF and ESIC rules.",
              },
              {
                q: "How does GA-HRMS handle biometric punch regularization?",
                a: "Employees can submit regularization requests directly through their ESS portal specifying the date, missing punch time, and reason (e.g. client visit or biometric scanner failure). Managers receive immediate notifications to approve or decline the adjustment.",
              },
              {
                q: "Are payslips compliant with Indian corporate requirements?",
                a: "Yes. Generated payslips feature company logo, PAN, TAN, employee UAN, PF number, ESIC IP number, bank account details, and a clear side-by-side breakdown of earnings and statutory deductions.",
              },
            ].map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-2xs transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm font-bold text-gray-900">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-gray-900" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="p-5 pt-0 text-xs sm:text-sm text-gray-600 leading-relaxed border-t border-gray-100">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 6: Launch CTA Banner with High-Contrast Minimalist Buttons */}
      <section className="py-14 px-4 sm:px-6 lg:px-8 bg-[#FAFAFA]">
        <div className="max-w-5xl mx-auto rounded-3xl bg-gray-950 p-8 sm:p-12 text-white text-center space-y-6 shadow-sm relative overflow-hidden border border-gray-800">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight max-w-3xl mx-auto leading-tight text-white">
            Take full control of your workforce & payroll operations today.
          </h2>

          <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto leading-relaxed">
            Instant operational access. Explore the Super Admin governance hub,
            HR manager payroll runs, or the employee self-service portal.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            {/* Primary Action: High-Contrast Crisp White Pill */}
            <button
              type="button"
              onClick={() => handleLaunchRole("SUPER_ADMIN")}
              className="w-full sm:w-auto px-6 py-3 rounded-full text-sm font-bold text-gray-950 bg-white hover:bg-gray-100 transition-all shadow-sm flex items-center justify-center gap-2 active:scale-[0.98]"
              id="cta-bottom-superadmin"
            >
              <span>Enter as Super Admin (Full Access)</span>
              <ArrowRight className="w-4 h-4 text-gray-600" />
            </button>

            {/* Secondary Action: Translucent Frosted Glass Pill */}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="w-full sm:w-auto px-6 py-3 rounded-full text-sm font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/20 transition-all shadow-2xs flex items-center justify-center gap-2"
              id="cta-bottom-login"
            >
              <span>Go to Login Page</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer: Clean, Naturally Blended & Open Layout */}
      <footer className="mt-auto border-t border-gray-200 bg-white pt-16 pb-8 text-xs text-gray-500 relative overflow-hidden">
        {/* Subtle Decorative Skyline Trim: Anchored strictly at the very bottom */}
        <div
          className="absolute inset-x-0 bottom-0 h-28 sm:h-36 pointer-events-none select-none z-0 overflow-hidden"
          aria-hidden="true"
        >
          <img
            src="/brand/hrms-footer-cityscape.jpg"
            alt=""
            className="w-full h-full object-cover object-[center_55%] opacity-60 [mask-image:linear-gradient(to_top,rgba(0,0,0,0.8)_20%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_top,rgba(0,0,0,0.8)_20%,transparent_100%)]"
          />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 sm:space-y-16 relative z-10 w-full">
          {/* Main Footer Links: Pure, Open & Crisp on Natural White Background (No Boxes) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2 space-y-3">
              <Link to="/" className="inline-flex items-center group">
                <GaHrmsLogo size="md" variant="light" />
              </Link>
              <p className="text-gray-500 text-xs max-w-sm leading-relaxed">
                The modern standard for enterprise workforce management,
                biometric attendance, and Indian statutory payroll automation.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-900">
                Platform Modules
              </p>
              <ul className="space-y-1.5 text-gray-600 font-medium">
                <li>
                  <Link to="/login" className="hover:text-blue-600 transition-colors">
                    Employee Directory (360°)
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-blue-600 transition-colors">
                    Biometric Attendance & Shifts
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-blue-600 transition-colors">
                    Multi-Tier Leave Hierarchy
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-blue-600 transition-colors">
                    Indian Statutory Payroll (PF/ESIC)
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-900">
                Compliance & Security
              </p>
              <ul className="space-y-1.5 text-gray-600 font-medium">
                <li className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-600" /> ISO 27001
                  Ready
                </li>
                <li className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" /> SOC-2 Type
                  II Certified
                </li>
                <li className="flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-emerald-600" /> Indian IT
                  Act 2000 Compliant
                </li>
              </ul>
            </div>
          </div>

          {/* Clean Natural Copyright Line (No Boxes, Pure Seamless Layout) */}
          <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
            <p className="text-gray-900 font-semibold">
              © {new Date().getFullYear()} GA Enterprise Workforce Solutions.
              All rights reserved.
            </p>
            <p className="text-gray-800 font-medium">
              Built for Indian Enterprises • Enterprise HR &amp; Payroll Platform
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

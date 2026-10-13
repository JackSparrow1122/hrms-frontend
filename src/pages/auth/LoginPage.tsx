import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Shield,
  CheckCircle2,
  Lock,
  Mail,
  ArrowRight,
  Users,
  Building,
  User,
  ArrowLeft,
} from "lucide-react";
import { useAuth, DEMO_USERS } from "../../lib/authContext";
import { UserRole } from "../../types/hrms";
import { Input } from "../../components/ui/Input";
import { GaHrmsLogo } from "../../components/ui/GaHrmsLogo";

export function LoginPage() {
  const [email, setEmail] = useState("ajay.pawar@ga-hrms.io");
  const [password, setPassword] = useState("••••••••••••");
  const [selectedRole, setSelectedRole] = useState<UserRole>("SUPER_ADMIN");
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      login(email, selectedRole);
      setIsLoading(false);
      navigate("/dashboard");
    }, 400);
  };

  const handleQuickDemo = (role: UserRole) => {
    setSelectedRole(role);
    const demo = DEMO_USERS[role];
    setEmail(demo.email);
    setIsLoading(true);
    setTimeout(() => {
      login(demo.email, role);
      setIsLoading(false);
      navigate("/dashboard");
    }, 300);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#FAFAFA] text-gray-900 selection:bg-gray-950 selection:text-white">
      {/* Left Column: Minimalist Dark Editorial Sidebar (Stripe/Linear style) */}
      <div className="lg:w-1/2 bg-gray-950 text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden border-r border-gray-900">
        {/* Subtle grid backdrop */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1F2937_1px,transparent_1px),linear-gradient(to_bottom,#1F2937_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 -z-10 pointer-events-none" />

        {/* Top: Logo & Back Link */}
        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="flex items-center group">
            <GaHrmsLogo size="md" variant="dark" />
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to website</span>
          </Link>
        </div>

        {/* Center: Hero Heading & Feature Pillars */}
        <div className="relative z-10 my-12 space-y-8 max-w-lg">
          <div className="space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight text-white">
              The modern standard for enterprise workforce & payroll.
            </h2>
            <p className="text-sm text-gray-400 leading-relaxed font-normal">
              Unified digital employee lifecycle, biometric time & attendance normalization,
              zero-error multi-tier payroll runs, and real-time executive analytics.
            </p>
          </div>

          {/* Value points */}
          <div className="space-y-3 pt-2">
            {[
              "Statutory Indian Payroll (PF 12%, ESIC, Professional Tax, TDS)",
              "Multi-branch Attendance & Biometric Push Sync Engine",
              "Multi-tier Leave Approvals & Automated LOP Deduction",
              "Encrypted Employee Document Vault & Corporate Payslips",
            ].map((text, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm text-gray-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: Trust & Security Note */}
        <div className="relative z-10 pt-8 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>ISO 27001 & SOC-2 Type II Ready</span>
          </div>
          <span className="font-mono text-gray-500">v2.4.0 SaaS Enterprise</span>
        </div>
      </div>

      {/* Right Column: Clean White Sign In Card */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16 bg-[#FAFAFA]">
        <div className="w-full max-w-md space-y-7 bg-white p-8 sm:p-10 rounded-2xl border border-gray-200/90 shadow-sm">
          {/* Header */}
          <div className="space-y-1.5 text-left">
            <div className="lg:hidden pb-3">
              <GaHrmsLogo size="md" variant="light" />
            </div>
            <h3 className="text-2xl font-black text-gray-950 tracking-tight">
              Sign in to your workplace
            </h3>
            <p className="text-sm text-gray-500">
              Enter your corporate credentials or use quick demo personas below.
            </p>
          </div>

          {/* Quick Demo Role Selector Pills */}
          <div className="space-y-2.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Select 1-Click Demo Persona
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { role: "SUPER_ADMIN" as UserRole, name: "Super Admin", icon: Shield },
                { role: "HR_ADMIN" as UserRole, name: "HR Manager", icon: Users },
                { role: "MANAGER" as UserRole, name: "Team Manager", icon: Building },
                { role: "EMPLOYEE" as UserRole, name: "Employee (ESS)", icon: User },
              ].map((p) => {
                const Icon = p.icon;
                const isSelected = selectedRole === p.role;
                return (
                  <button
                    key={p.role}
                    type="button"
                    onClick={() => handleQuickDemo(p.role)}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center gap-2.5 ${
                      isSelected
                        ? "bg-gray-950 border-gray-950 text-white shadow-xs font-semibold"
                        : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isSelected ? "text-white" : "text-gray-400"
                      }`}
                    />
                    <div className="truncate">
                      <div className="font-semibold">{p.name}</div>
                      <div className={`text-[10px] truncate ${isSelected ? "text-gray-300" : "text-gray-400"}`}>
                        {DEMO_USERS[p.role].name.split(" ")[0]}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Standard Form */}
          <form onSubmit={handleLogin} className="space-y-4 pt-1">
            <Input
              label="Work Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              leftIcon={<Mail className="w-4 h-4 text-gray-400" />}
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              leftIcon={<Lock className="w-4 h-4 text-gray-400" />}
              required
            />

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-gray-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-gray-300 text-gray-950 focus:ring-gray-950/20 w-4 h-4 accent-gray-950"
                />
                <span>Remember me for 30 days</span>
              </label>

              <button
                type="button"
                onClick={() => alert("Simulated: Password reset link sent to " + email)}
                className="text-gray-900 hover:text-black font-semibold hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gray-950 hover:bg-black text-white text-sm font-semibold transition-all shadow-xs hover:shadow flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
            >
              <span>{isLoading ? "Signing in..." : `Sign In as ${DEMO_USERS[selectedRole].name}`}</span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </button>
          </form>

          {/* Footer credentials note */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-center">
            <p className="text-xs text-gray-600 font-medium">
              Demo Mode Active: All operational state is saved safely in LocalStorage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

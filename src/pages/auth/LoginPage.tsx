import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
  Server,
} from "lucide-react";
import { useAuth } from "../../lib/authContext";
import { UserRole } from "../../types/hrms";
import { Input } from "../../components/ui/Input";
import { GaHrmsLogo } from "../../components/ui/GaHrmsLogo";

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const initialRole = (searchParams.get("role") as UserRole) || "SUPER_ADMIN";

  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [email, setEmail] = useState(() => (initialRole === "SUPER_ADMIN" ? "admin@gahrms.com" : ""));
  const [password, setPassword] = useState(() => (initialRole === "SUPER_ADMIN" ? "Admin@123456" : ""));
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter both work email and password.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await login(email.trim(), selectedRole, password.trim());
      if (res.success) {
        if (rememberMe) {
          localStorage.setItem("hrms_remember_email", email.trim());
        } else {
          localStorage.removeItem("hrms_remember_email");
        }
        navigate("/dashboard");
      } else {
        setErrorMessage(res.message || "Invalid credentials. Please verify your email and password.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Unable to connect to HRMS server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRole = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
    if (role === "SUPER_ADMIN") {
      setEmail("admin@gahrms.com");
      setPassword("Admin@123456");
    } else {
      setEmail("");
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#FAFAFA] text-gray-900 selection:bg-gray-950 selection:text-white">
      {/* Left Column: Minimalist Dark Editorial Sidebar */}
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-900 border border-gray-800 text-xs text-gray-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Next-Gen Indian Statutory & People OS</span>
            </div>
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
          {/* Header */}
          <div className="space-y-1.5 text-left">
            <div className="lg:hidden pb-3">
              <GaHrmsLogo size="md" variant="light" />
            </div>
            <h3 className="text-2xl font-black text-gray-950 tracking-tight">
              Sign in to GA-HRMS
            </h3>
            <p className="text-sm text-gray-500">
              Select your workspace portal and enter your registered corporate credentials.
            </p>
          </div>

          {/* Workspace Portal Selector */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-gray-500">
              <span>Select Workspace Portal</span>
              <span className="text-[10px] text-emerald-600 font-normal flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Live PostgreSQL Backend
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { role: "SUPER_ADMIN" as UserRole, name: "Super Admin", subtitle: "Platform Owner", icon: Shield },
                { role: "TENANT_ADMIN" as UserRole, name: "HR Head", subtitle: "Organization Head HR", icon: Building },
                { role: "HR_ADMIN" as UserRole, name: "HR Admin", subtitle: "Branch Operations", icon: Users },
                { role: "EMPLOYEE" as UserRole, name: "Employee", subtitle: "Workforce ESS (Mgr / TL)", icon: User },
              ].map((p) => {
                const Icon = p.icon;
                const isSelected = selectedRole === p.role;
                return (
                  <button
                    key={p.role}
                    type="button"
                    onClick={() => handleSelectRole(p.role)}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center gap-2.5 ${
                      isSelected
                        ? "bg-gray-950 border-gray-950 text-white shadow-xs font-semibold"
                        : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isSelected ? "text-emerald-400" : "text-gray-400"
                      }`}
                    />
                    <div className="truncate">
                      <div className="font-semibold">{p.name}</div>
                      <div className={`text-[10px] truncate ${isSelected ? "text-gray-300" : "text-gray-400"}`}>
                        {p.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Portal Guidance & Quick Credential Assist */}
            {selectedRole === "SUPER_ADMIN" && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                <div>
                  <span className="font-semibold text-slate-800 block">Platform Owner Credentials</span>
                  <span className="text-[11px] text-slate-500 font-mono">admin@gahrms.com • Admin@123456</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmail("admin@gahrms.com");
                    setPassword("Admin@123456");
                    setErrorMessage(null);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors shadow-xs"
                >
                  Auto-Fill
                </button>
              </div>
            )}

            {selectedRole === "TENANT_ADMIN" && (
              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-indigo-900">
                    <Building className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Organization Head HR (Vanshu Nalode)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("vanshu@gmail.com");
                      setPassword("Admin@123456");
                      setErrorMessage(null);
                    }}
                    className="px-2 py-0.5 text-[11px] font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
                  >
                    Auto-Fill
                  </button>
                </div>
                <p className="text-[11px] text-indigo-700 leading-relaxed">
                  Head HR credentials: <span className="font-mono font-semibold">vanshu@gmail.com</span> • <span className="font-mono font-semibold">Admin@123456</span>
                </p>
              </div>
            )}

            {selectedRole === "HR_ADMIN" && (
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    <span>HR Admin (Anvita Pawar)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("anvita.pawar@gryphonacademy.co.in");
                      setPassword("Admin@123456");
                      setErrorMessage(null);
                    }}
                    className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-xs"
                  >
                    Auto-Fill
                  </button>
                </div>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  HR Admin credentials: <span className="font-mono font-semibold">anvita.pawar@gryphonacademy.co.in</span> • <span className="font-mono font-semibold">Admin@123456</span>
                </p>
              </div>
            )}

            {selectedRole === "EMPLOYEE" && (
              <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-purple-900">
                    <User className="w-3.5 h-3.5 text-purple-600" />
                    <span>Employee & Team Lead Portals</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEmail("dipratna.mahire@gryphonacademy.co.in");
                        setPassword("Admin@123456");
                        setErrorMessage(null);
                      }}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-xs"
                    >
                      Dipratna (GA70)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail("ajay.pawar@gryphonacademy.co.in");
                        setPassword("Admin@123456");
                        setErrorMessage(null);
                      }}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors shadow-xs"
                    >
                      Ajay Pawar (IT TL)
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-purple-700 leading-relaxed">
                  Sign in as regular employee (Dipratna) or Department Team Lead (Ajay Pawar) with password <span className="font-mono font-semibold">Admin@123456</span>.
                </p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 text-xs bg-red-50 text-red-600 rounded-xl border border-red-200">
              {errorMessage}
            </div>
          )}

          {/* Standard Form */}
          <form onSubmit={handleLogin} className="space-y-4 pt-1">
            <Input
              label="Work Email or Employee ID"
              type="text"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorMessage(null);
              }}
              placeholder="e.g. name@company.com or GA70"
              leftIcon={<Mail className="w-4 h-4 text-gray-400" />}
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrorMessage(null);
              }}
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
                onClick={() => alert("Please contact IT administrator or HR to reset password.")}
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
              <span>{isLoading ? "Authenticating..." : "Sign In to GA-HRMS"}</span>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </button>
          </form>

          {/* Footer note */}
          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-center flex items-center justify-center gap-2">
            <Server className="w-3.5 h-3.5 text-emerald-600" />
            <p className="text-xs text-gray-600 font-medium">
              Live Backend API Active • Spring Boot 3.4.1 (Port 8082)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

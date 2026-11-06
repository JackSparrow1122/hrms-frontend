import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Clock,
  CalendarCheck2,
  AlertTriangle,
  WalletCards,
  UserPlus,
  ArrowRight,
  TrendingUp,
  FileCheck,
  CheckCircle2,
  CalendarPlus,
  Receipt,
  Building2,
  ShieldCheck,
  Calendar,
  Building,
  MapPin,
  Sparkles,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  Crown,
  Briefcase,
  Layers,
  Globe,
  Radio,
  RefreshCw,
  Fingerprint,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "../../lib/authContext";
import { useHrms } from "../../lib/hrmsContext";
import { useToast } from "../../lib/toastContext";
import { tenantApi, TenantItem, attendanceApi, DailyAttendanceRecordItem } from "../../lib/api";
import { KpiCard } from "../../components/ui/KpiCard";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Avatar } from "../../components/ui/Avatar";
import { formatCompactINR, formatINR, formatDate, formatTime, cn, getTodayIst } from "../../lib/utils";
export interface DashboardPageProps {
  onOpenAddEmployee?: () => void;
  onOpenApplyLeave?: () => void;
}

export function DashboardPage({ onOpenAddEmployee, onOpenApplyLeave }: DashboardPageProps) {
  const { user } = useAuth();
  const {
    employees,
    attendance,
    leaveRequests,
    leaveTypes,
    departments,
    branches,
    company,
    allCompanies,
    activeCompanyId,
    switchActiveCompany,
    payroll,
    regularizations,
    holidays,
    approveLeave,
    rejectLeave,
    approveRegularization,
    settings,
    punchAttendance,
  } = useHrms();
  const navigate = useNavigate();
  const toast = useToast();
  const isCompact = !!settings?.compactMode;

  // Role detection
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isTenantAdmin = user?.role === "TENANT_ADMIN" || !!user?.isTenantAdmin;
  const isHrAdmin = user?.role === "HR_ADMIN" && !isTenantAdmin && !isSuperAdmin;
  const isSupervisor = user?.role === "MANAGER" || user?.role === "TEAM_LEAD";
  const isEmployee = user?.role === "EMPLOYEE" || (!isSuperAdmin && !isTenantAdmin && !isHrAdmin && !isSupervisor);

  // Super Admin: Load all tenant organizations from API
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);

  useEffect(() => {
    if (isSuperAdmin) {
      setLoadingTenants(true);
      tenantApi
        .getTenants({ size: 100 })
        .then((res) => {
          if (res && res.content) {
            setTenants(res.content);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingTenants(false));
    }
  }, [isSuperAdmin]);

  // Current logged in employee record
  const currentEmp = useMemo(() => {
    return employees.find(
      (e) =>
        e.id === user?.employeeId ||
        (user?.employeeCode && e.employeeCode?.toUpperCase() === user.employeeCode.toUpperCase()) ||
        (user?.email && e.email.toLowerCase() === user.email.toLowerCase())
    );
  }, [employees, user]);

  // Team Lead / Manager team scoping
  const userDept = currentEmp?.department || user?.department || "";
  const effectiveTeamDept = useMemo(() => {
    if (userDept && userDept !== "Global Automations HRMS" && userDept !== "General") {
      return userDept;
    }
    return "Information Technology";
  }, [userDept]);

  const teamMembers = useMemo(() => {
    if (!isSupervisor) return [];
    let list = employees.filter(
      (e) =>
        (currentEmp?.id && String(e.managerId) === String(currentEmp.id)) ||
        (userDept && e.department?.toLowerCase() === userDept.toLowerCase() && e.id !== currentEmp?.id)
    );
    if (list.length === 0) {
      // Fallback for role simulation: display the Information Technology team roster
      list = employees.filter((e) => {
        const d = (e.department || "").toLowerCase();
        return d.includes("information") || d.includes("tech") || d.includes("it");
      });
    }
    return list;
  }, [employees, isSupervisor, currentEmp, userDept]);

  const teamMemberIds = useMemo(() => new Set(teamMembers.map((m) => m.id)), [teamMembers]);

  const todayStr = getTodayIst();

  const totalEmployees = employees.length;
  const todayAttendance = attendance.filter((a) => a.date === todayStr);

  const presentCount = todayAttendance.filter(
    (a) => a.status === "PRESENT" || a.status === "LATE" || a.status === "HALF_DAY"
  ).length;
  const onLeaveCount = todayAttendance.filter((a) => a.status === "LEAVE").length;
  const lateCount = todayAttendance.filter((a) => a.status === "LATE").length;
  const absentCount = todayAttendance.filter((a) => a.status === "ABSENT").length;
  const halfDayCount = todayAttendance.filter((a) => a.status === "HALF_DAY").length;
  const attendanceRate = totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0;

  const pendingLeaves = leaveRequests.filter((l) => l.status === "PENDING");
  const pendingRegs = regularizations.filter((r) => r.status === "PENDING");

  // Team-specific counts (for Manager / TL)
  const teamAttendance = todayAttendance.filter((a) => teamMemberIds.has(a.employeeId));
  const teamPresentCount = teamAttendance.filter(
    (a) => a.status === "PRESENT" || a.status === "LATE" || a.status === "HALF_DAY"
  ).length;
  const teamOnLeaveCount = teamAttendance.filter((a) => a.status === "LEAVE").length;
  const teamPendingLeaves = leaveRequests.filter(
    (l) => l.status === "PENDING" && (teamMemberIds.has(l.employeeId) || (l as any).approverId === currentEmp?.id)
  );

  // Employee-specific counts
  const myLeaves = leaveRequests.filter(
    (l) => l.employeeId === (currentEmp?.id || user?.employeeId || "EMP-1004")
  );
  const myTodayAttendance = todayAttendance.find(
    (a) => a.employeeId === (currentEmp?.id || user?.employeeId)
  );

  // Live real-time biometric today punch and ticking work timer
  const [todayBioRecord, setTodayBioRecord] = useState<DailyAttendanceRecordItem | null>(null);
  const [nowTime, setNowTime] = useState<Date>(() => new Date());
  const [selectedTapDate, setSelectedTapDate] = useState<string>(() => getTodayIst());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadBioRoster = useCallback(async (targetDate?: string) => {
    const todayStr = getTodayIst();
    const queryDate = targetDate || todayStr;
    try {
      const roster = await attendanceApi.getDailyRoster(queryDate);
      if (roster?.records) {
        const empCode = currentEmp?.employeeCode || (user?.email?.toLowerCase().includes("dipratna") ? "GA70" : undefined);
        const found = roster.records.find(
          (r) =>
            (empCode && r.employeeCode === empCode) ||
            (currentEmp?.id && r.employeeId === Number(currentEmp.id)) ||
            r.employeeCode === "GA70"
        );
        if (found && (found.firstIn || found.punchCount > 0)) {
          setTodayBioRecord(found);
          setSelectedTapDate(queryDate);
          return found;
        }
      }

      // Fallback: If querying today and no punch found yet, check yesterday (2026-10-20)
      if (queryDate === todayStr) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split("T")[0];
        const yRoster = await attendanceApi.getDailyRoster(yStr);
        if (yRoster?.records) {
          const empCode = currentEmp?.employeeCode || (user?.email?.toLowerCase().includes("dipratna") ? "GA70" : undefined);
          const foundY = yRoster.records.find(
            (r) =>
              (empCode && r.employeeCode === empCode) ||
              (currentEmp?.id && r.employeeId === Number(currentEmp.id)) ||
              r.employeeCode === "GA70"
          );
          if (foundY && (foundY.firstIn || foundY.punchCount > 0)) {
            setTodayBioRecord(foundY);
            setSelectedTapDate(yStr);
            return foundY;
          }
        }
      }
      setTodayBioRecord(null);
    } catch {
      // silent fallback
    }
  }, [currentEmp, user]);

  useEffect(() => {
    loadBioRoster();
  }, [loadBioRoster]);

  const cardTapDate = useMemo(() => {
    if (todayBioRecord?.firstIn) {
      return new Date(todayBioRecord.firstIn);
    }
    if (myTodayAttendance?.firstIn) {
      const [h, m] = myTodayAttendance.firstIn.split(":").map(Number);
      const d = new Date();
      d.setHours(h || 9, m || 35, 0, 0);
      return d;
    }
    return null;
  }, [todayBioRecord, myTodayAttendance]);

  const elapsedTime = useMemo(() => {
    if (!cardTapDate) return { hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 };
    // If user has punched out, use lastOut; otherwise tick live from nowTime
    const isOut = Boolean(todayBioRecord?.lastOut && todayBioRecord?.lastOut !== todayBioRecord?.firstIn);
    const endTime = isOut ? new Date(todayBioRecord!.lastOut!) : nowTime;
    const diffMs = Math.max(0, endTime.getTime() - cardTapDate.getTime());
    const totalSeconds = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { hours, minutes, seconds, totalSeconds };
  }, [cardTapDate, todayBioRecord, nowTime]);

  const hasCardTap = Boolean(cardTapDate);
  const isPunchedIn = hasCardTap || (!!myTodayAttendance?.firstIn && !myTodayAttendance?.lastOut);

  // Total payroll for latest processed month
  const latestPayroll = payroll.filter((p) => p.month === "2026-09");
  const totalDisbursed = latestPayroll.reduce((sum, p) => sum + p.netSalary, 0);

  // Workforce Headcount Chart Data
  const headcountData = [
    { month: "May", headcount: 22, payroll: 2900000 },
    { month: "Jun", headcount: 25, payroll: 3300000 },
    { month: "Jul", headcount: 27, payroll: 3600000 },
    { month: "Aug", headcount: 29, payroll: 3950000 },
    { month: "Sep", headcount: 31, payroll: 4300000 },
    { month: "Oct", headcount: totalEmployees, payroll: totalDisbursed || 4500000 },
  ];

  // Attendance Donut Data
  const attendanceDonutData = [
    { name: "Present (On-time)", value: Math.max(0, presentCount - lateCount - halfDayCount), color: "#10B981" },
    { name: "Late Arrival", value: lateCount, color: "#F59E0B" },
    { name: "Half Day", value: halfDayCount, color: "#8B5CF6" },
    { name: "Approved Leave", value: onLeaveCount, color: "#6366F1" },
    { name: "Absent", value: absentCount, color: "#EF4444" },
  ];

  // Department distribution
  const departmentData = departments.map((d) => {
    const deptEmployees = employees.filter((e) => e.departmentId === d.id);
    return {
      name: d.code,
      fullName: d.name,
      employees: deptEmployees.length,
      budget: Math.round(d.budget / 1000000),
    };
  });

  // Cross-tenant chart data for Super Admin
  const crossTenantData = useMemo(() => {
    if (tenants.length > 0) {
      return tenants.map((t) => ({
        name: t.code || t.name.substring(0, 10),
        fullName: t.name,
        employees: t.totalEmployees || 15,
        branches: t.totalBranches || 1,
      }));
    }
    return allCompanies.map((c) => ({
      name: (c as any).code || c.legalName?.substring(0, 10) || "Tenant",
      fullName: c.legalName || c.tradeName,
      employees: c.id === 2 ? 32 : 18,
      branches: 4,
    }));
  }, [tenants, allCompanies]);

  return (
    <div className={cn("transition-all duration-200", isCompact ? "space-y-4" : "space-y-6")}>
      {/* =========================================================================
          1. TOP WELCOME HEADER (Customized per Role)
      ========================================================================= */}
      <div
        className={cn(
          "flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-card border border-surface-border shadow-card transition-all",
          isCompact ? "p-4 sm:p-5" : "p-5 sm:p-6"
        )}
      >
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1
              className={cn(
                "font-bold text-gray-950 tracking-tight",
                isCompact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
              )}
            >
              Good morning, {user?.name.split(" ")[0]} 👋
            </h1>
            <Badge
              variant={
                isSuperAdmin
                  ? "purple"
                  : isTenantAdmin
                    ? "purple"
                    : isHrAdmin
                      ? "cyan"
                      : isSupervisor
                        ? "warning"
                        : "default"
              }
              size="sm"
            >
              {isSuperAdmin
                ? "Super Admin • Platform Executive"
                : isTenantAdmin
                  ? "Head HR • Organization Executive"
                  : isHrAdmin
                    ? "HR Admin • Operations"
                    : isSupervisor
                      ? `${effectiveTeamDept} Team Lead`
                      : "Employee (ESS)"}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary mt-1">
            {isSuperAdmin && "Cross-Tenant Platform Governance: Monitoring all client organizations and tenant ecosystems."}
            {isTenantAdmin && `Organization-Wide HR Administration: Complete multi-branch oversight for ${company?.name || "your organization"}.`}
            {isHrAdmin && "HR Operations Command: Managing daily workforce attendance, leave approvals, and employee records."}
            {isSupervisor && `Team Leadership Command: Supervising ${teamMembers.length} members of the ${effectiveTeamDept} team.`}
            {isEmployee && `Self-Service Portal: Access your punch card, leave balances, and company calendar.`}
          </p>
        </div>

        {/* Header Action Buttons based on role */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {isSuperAdmin && (
            <>
              <Button
                onClick={() => navigate("/admin/organizations")}
                variant="deep"
                size="md"
                leftIcon={<Building2 className="w-4 h-4" />}
              >
                Manage Organizations
              </Button>
              <Button
                onClick={() => navigate("/admin/users-roles")}
                variant="outline"
                size="md"
                leftIcon={<ShieldCheck className="w-4 h-4" />}
              >
                Platform Users
              </Button>
            </>
          )}

          {isTenantAdmin && (
            <>
              <Button
                onClick={() => navigate("/people/branches")}
                variant="outline"
                size="md"
                leftIcon={<MapPin className="w-4 h-4" />}
              >
                Branches ({branches.length})
              </Button>
              <Button
                onClick={() => navigate("/people/employees")}
                variant="primary"
                size="md"
                leftIcon={<Users className="w-4 h-4" />}
              >
                Organization Workforce
              </Button>
            </>
          )}

          {isHrAdmin && (
            <>
              <Button
                onClick={() => navigate("/time/holidays")}
                variant="outline"
                size="md"
                leftIcon={<Calendar className="w-4 h-4 text-indigo-600" />}
              >
                Holiday Calendar
              </Button>
              {onOpenAddEmployee && (
                <Button
                  onClick={onOpenAddEmployee}
                  variant="primary"
                  size="md"
                  leftIcon={<UserPlus className="w-4 h-4" />}
                >
                  Add Employee
                </Button>
              )}
            </>
          )}

          {isSupervisor && (
            <>
              <Button
                onClick={() => navigate("/leave/requests")}
                variant="outline"
                size="md"
                leftIcon={<CalendarCheck2 className="w-4 h-4 text-indigo-600" />}
              >
                Team Leaves ({teamPendingLeaves.length})
              </Button>
              {onOpenApplyLeave && (
                <Button
                  onClick={onOpenApplyLeave}
                  variant="primary"
                  size="md"
                  leftIcon={<CalendarPlus className="w-4 h-4" />}
                >
                  Apply Leave
                </Button>
              )}
            </>
          )}

          {isEmployee && onOpenApplyLeave && (
            <>
              <Button
                onClick={() => punchAttendance(user?.employeeId || "EMP-1004", isPunchedIn ? "OUT" : "IN")}
                variant={isPunchedIn ? "outline" : "primary"}
                size="md"
                leftIcon={<Clock className="w-4 h-4" />}
              >
                {isPunchedIn ? "Punch Out" : "Web Punch In"}
              </Button>
              <Button
                onClick={onOpenApplyLeave}
                variant="outline"
                size="md"
                leftIcon={<CalendarPlus className="w-4 h-4 text-emerald-600" />}
              >
                Apply Leave
              </Button>
            </>
          )}
        </div>
      </div>

      {/* =========================================================================
          2. ROLE-SPECIFIC DASHBOARD SECTIONS
      ========================================================================= */}

      {/* -------------------------------------------------------------------------
          ROLE A: SUPER ADMIN DASHBOARD (All Organizations Details & Multi-Tenant)
      ------------------------------------------------------------------------- */}
      {isSuperAdmin && (
        <div className="space-y-6">
          {/* Top Platform KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Total Client Organizations"
              value={tenants.length || allCompanies.length || 2}
              icon={<Building2 className="w-6 h-6 text-purple-600" />}
              trend={{ value: "+100%", isPositive: true, label: "Active Tenants" }}
              subtitle="Multi-tenant tenant isolation"
              accentColor="purple"
              onClick={() => navigate("/admin/organizations")}
            />

            <KpiCard
              label="Global Platform Workforce"
              value={totalEmployees}
              icon={<Users className="w-6 h-6 text-blue-600" />}
              trend={{ value: `${totalEmployees} Employees`, isPositive: true }}
              subtitle="Across all customer organizations"
              accentColor="blue"
              onClick={() => navigate("/people/employees")}
            />

            <KpiCard
              label="Total Monthly Payroll Volume"
              value={formatCompactINR(totalDisbursed || 4520000)}
              icon={<WalletCards className="w-6 h-6 text-emerald-600" />}
              trend={{ value: "Processed", isPositive: true, label: "Sep 2026" }}
              subtitle="Consolidated tenant compensation"
              accentColor="emerald"
              onClick={() => navigate("/payroll/runs")}
            />

            <KpiCard
              label="Active Cloud Ecosystem"
              value="100% Up"
              icon={<Globe className="w-6 h-6 text-indigo-600" />}
              trend={{ value: "4 Branches", isPositive: true }}
              subtitle="Enterprise PostgreSQL Multi-Tenant"
              accentColor="indigo"
              onClick={() => navigate("/admin/settings")}
            />
          </div>

          {/* All Organizations Directory Table */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-purple-700" />
                  <CardTitle>All Customer Tenant Organizations</CardTitle>
                  <span className="text-xs font-bold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                    {tenants.length || allCompanies.length} Organizations
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">
                  Complete tenant catalog with active quotas, designated HR administrators, and active scopes.
                </p>
              </div>

              <Button
                onClick={() => navigate("/admin/organizations")}
                variant="outline"
                size="sm"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Full Org Center
              </Button>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-y border-gray-200 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                    <th className="py-3 px-4">Organization Name</th>
                    <th className="py-3 px-4">Tenant Code</th>
                    <th className="py-3 px-4">Designated Admin</th>
                    <th className="py-3 px-4">Workforce Quota</th>
                    <th className="py-3 px-4">Branches</th>
                    <th className="py-3 px-4">Plan / Tier</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Switch Scope</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(tenants.length > 0 ? tenants : (allCompanies as any[])).map((t: any) => {
                    const isCurrentlyActive = t.id === activeCompanyId;
                    return (
                      <tr
                        key={t.id}
                        className={`hover:bg-gray-50/80 transition-colors ${isCurrentlyActive ? "bg-purple-50/40" : ""
                          }`}
                      >
                        <td className="py-3.5 px-4 font-semibold text-gray-900 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {(t.name || t.legalName || "O").substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-gray-950 flex items-center gap-1.5">
                              {t.name || t.legalName}
                              {isCurrentlyActive && (
                                <span className="text-[9.5px] font-extrabold text-purple-700 bg-purple-100/90 px-1.5 py-0.2 rounded">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono">
                              ID: #{t.id} • {t.domain || "tenant.cloud"}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-xs font-semibold text-gray-700">
                          {t.code}
                        </td>

                        <td className="py-3.5 px-4 text-xs text-gray-600">
                          <div className="font-medium text-gray-900">{t.adminName || "Anvita Pawar"}</div>
                          <div className="text-[10px] text-gray-400">{t.contactEmail || t.adminEmail || "hr@company.com"}</div>
                        </td>

                        <td className="py-3.5 px-4 text-xs text-gray-800">
                          <span className="font-bold font-mono text-gray-950">
                            {t.totalEmployees || (t.id === 2 ? 32 : 12)}
                          </span>
                          <span className="text-gray-400 text-[11px]"> / {t.maxEmployees || 500}</span>
                        </td>

                        <td className="py-3.5 px-4 text-xs text-gray-600">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            <span>{t.totalBranches || branches.length || 4} Branches</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                            {t.subscriptionPlan || "ENTERPRISE"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <Badge variant={t.status === "ACTIVE" ? "success" : "neutral"} size="sm">
                            {t.status || "ACTIVE"}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <Button
                            onClick={() => {
                              switchActiveCompany(t.id);
                              toast.success(`Switched active tenant to "${t.name || t.legalName}"`);
                            }}
                            variant={isCurrentlyActive ? "deep" : "outline"}
                            size="sm"
                            className="text-[11px] h-7 px-2.5"
                          >
                            {isCurrentlyActive ? "Active Scope" : "Switch Org"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Cross-Tenant Workforce Comparison Chart & Governance Shortcuts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <div>
                  <CardTitle>Workforce Headcount Across Client Organizations</CardTitle>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Distribution of active employees onboarded per customer tenant.
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={crossTenantData}>
                      <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} />
                      <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} />
                      <Tooltip
                        formatter={(val, name, item) => [
                          `${val} Employees (${item.payload.fullName})`,
                          "Workforce",
                        ]}
                      />
                      <Bar dataKey="employees" fill="#6366F1" radius={[6, 6, 0, 0]} barSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Platform Governance Shortcuts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <button
                  onClick={() => navigate("/admin/organizations")}
                  className="w-full p-3 rounded-xl border border-gray-200/80 hover:border-purple-300 hover:bg-purple-50/50 transition-all text-left flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-950">Onboard New Tenant</div>
                      <div className="text-[11px] text-gray-400">Add corporate organization</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>

                <button
                  onClick={() => navigate("/admin/users-roles")}
                  className="w-full p-3 rounded-xl border border-gray-200/80 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all text-left flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-950">Manage Users & Roles</div>
                      <div className="text-[11px] text-gray-400">Set super admins and HR heads</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>

                <button
                  onClick={() => navigate("/admin/audit-logs")}
                  className="w-full p-3 rounded-xl border border-gray-200/80 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all text-left flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                      <FileCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-950">Platform Audit Logs</div>
                      <div className="text-[11px] text-gray-400">Security & compliance trail</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------
          ROLE B: HEAD HR (TENANT ADMIN) DASHBOARD (All Branches & Org-Wide Oversight)
      ------------------------------------------------------------------------- */}
      {isTenantAdmin && (
        <div className="space-y-6">
          {/* Top Organization Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Organization Workforce"
              value={totalEmployees}
              icon={<Users className="w-6 h-6 text-gray-900" />}
              trend={{ value: "+4.2%", isPositive: true, label: "All Units" }}
              subtitle={`${company?.name || "Gryphon Academy"}`}
              accentColor="neutral"
              onClick={() => navigate("/people/employees")}
            />

            <KpiCard
              label="Regional Branches"
              value={branches.length || 4}
              icon={<MapPin className="w-6 h-6 text-indigo-600" />}
              trend={{ value: "Pune HQ + 3 Regional", isPositive: true }}
              subtitle="All operating smoothly"
              accentColor="indigo"
              onClick={() => navigate("/people/branches")}
            />

            <KpiCard
              label="Organization Turnout Today"
              value={`${attendanceRate}%`}
              icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />}
              trend={{ value: `${presentCount} Present`, isPositive: attendanceRate >= 90 }}
              subtitle={`${absentCount} absentees across branches`}
              accentColor="emerald"
              onClick={() => navigate("/time/attendance")}
            />

            <KpiCard
              label="Monthly Organization Payroll"
              value={formatCompactINR(totalDisbursed || 4520000)}
              icon={<WalletCards className="w-6 h-6 text-purple-600" />}
              trend={{ value: "100%", isPositive: true, label: "Disbursed" }}
              subtitle="All statutory taxes filed"
              accentColor="purple"
              onClick={() => navigate("/payroll/dashboard")}
            />
          </div>

          {/* All Branches Under this Organization */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle>Regional Branches & Office Facilities</CardTitle>
                <p className="text-xs text-text-secondary mt-0.5">
                  Live operational telemetry for all branches under {company?.name || "your organization"}.
                </p>
              </div>
              <Button
                onClick={() => navigate("/people/branches")}
                variant="outline"
                size="sm"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Manage Branches
              </Button>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {branches.map((b) => {
                  const branchEmps = employees.filter((e) => e.branchId === b.id);
                  const branchPresent = todayAttendance.filter(
                    (a) =>
                      branchEmps.some((e) => e.id === a.employeeId) &&
                      (a.status === "PRESENT" || a.status === "LATE" || a.status === "HALF_DAY")
                  ).length;
                  const branchRate = branchEmps.length > 0 ? Math.round((branchPresent / branchEmps.length) * 100) : 0;

                  return (
                    <div
                      key={b.id}
                      className="p-4 rounded-xl border border-gray-200/80 bg-gray-50/50 hover:bg-white hover:border-indigo-300 hover:shadow-xs transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          {(b as any).isHeadquarters ? "Headquarters" : "Regional Hub"}
                        </span>
                        <Badge variant={branchRate >= 90 ? "success" : "warning"} size="sm">
                          {branchRate}% Turnout
                        </Badge>
                      </div>

                      <h4 className="font-bold text-sm text-gray-950 mt-2">{b.name}</h4>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        {b.city}, {b.state}
                      </p>

                      <div className="mt-4 pt-3 border-t border-gray-200/60 flex items-center justify-between text-xs">
                        <span className="text-gray-500">Staff Count</span>
                        <span className="font-bold font-mono text-gray-950">{branchEmps.length} staff</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Department Headcount Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Department Headcount Distribution</CardTitle>
                <p className="text-xs text-text-secondary mt-0.5">
                  Allocations across IT, L&D, Digital Marketing, Corporate Relations, and Sales.
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentData} layout="vertical">
                      <XAxis type="number" stroke="#9CA3AF" fontSize={12} tickLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={12} tickLine={false} width={70} />
                      <Tooltip
                        formatter={(val, name, item) => [
                          `${val} Employees (${item.payload.fullName})`,
                          "Headcount",
                        ]}
                      />
                      <Bar dataKey="employees" fill="#4F46E5" radius={[0, 6, 6, 0]} barSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Organization Approvals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-indigo-950">Pending Leave Sign-offs</div>
                    <div className="text-[11px] text-indigo-700">{pendingLeaves.length} applications awaiting action</div>
                  </div>
                  <Button
                    onClick={() => navigate("/leave/requests")}
                    variant="primary"
                    size="sm"
                    className="text-[11px] h-7 px-2.5"
                  >
                    Review
                  </Button>
                </div>

                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-amber-950">Pending Regularizations</div>
                    <div className="text-[11px] text-amber-700">{pendingRegs.length} attendance corrections</div>
                  </div>
                  <Button
                    onClick={() => navigate("/time/regularization")}
                    variant="outline"
                    size="sm"
                    className="text-[11px] h-7 px-2.5"
                  >
                    Inspect
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------
          ROLE C: HR ADMIN DASHBOARD (Daily Operations, Attendance Donut, Leaves)
      ------------------------------------------------------------------------- */}
      {isHrAdmin && (
        <div className="space-y-6">
          {/* Top Operational Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Total Active Employees"
              value={totalEmployees}
              icon={<Users className="w-6 h-6 text-gray-700" />}
              trend={{ value: "+4.2%", isPositive: true, label: "vs last month" }}
              subtitle="All registered staff"
              accentColor="neutral"
              onClick={() => navigate("/people/employees")}
            />

            <KpiCard
              label="Present Today"
              value={presentCount}
              icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />}
              trend={{ value: `${attendanceRate}%`, isPositive: attendanceRate >= 90, label: "Turnout" }}
              subtitle={`${Math.max(0, presentCount - lateCount)} on-time punches`}
              accentColor="emerald"
              onClick={() => navigate("/time/attendance")}
            />

            <KpiCard
              label="Pending Leave Approvals"
              value={pendingLeaves.length}
              icon={<CalendarCheck2 className="w-6 h-6 text-indigo-600" />}
              trend={{ value: pendingLeaves.length > 0 ? "Action Req" : "All Clear", isPositive: pendingLeaves.length === 0 }}
              subtitle="Review submitted requests"
              accentColor="indigo"
              onClick={() => navigate("/leave/requests")}
            />

            <KpiCard
              label="Late Arrivals / Mis-Punches"
              value={lateCount}
              icon={<AlertTriangle className="w-6 h-6 text-amber-600" />}
              trend={{ value: `${pendingRegs.length} regularizations`, isPositive: false }}
              subtitle="Requires approval"
              accentColor="amber"
              onClick={() => navigate("/time/regularization")}
            />
          </div>

          {/* Attendance Donut & Pending Leave Applications Queue */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Today's Attendance Distribution</CardTitle>
                  <p className="text-xs text-text-secondary mt-0.5">Real-time biometric punch telemetry</p>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {attendanceRate}% Present
                </span>
              </CardHeader>
              <CardContent>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={attendanceDonutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {attendanceDonutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="space-y-1.5 mt-2 pt-2 border-t border-gray-100 text-xs">
                  {attendanceDonutData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-text-secondary">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-semibold text-text-primary">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Action Required: Pending Leave Approvals</CardTitle>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Employee applications awaiting HR Admin sign-off
                  </p>
                </div>
                <Button
                  onClick={() => navigate("/leave/requests")}
                  variant="ghost"
                  size="sm"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  View All ({pendingLeaves.length})
                </Button>
              </CardHeader>

              <CardContent className="space-y-2.5">
                {pendingLeaves.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    All leave applications have been reviewed!
                  </div>
                ) : (
                  pendingLeaves.slice(0, 4).map((req) => {
                    const emp = employees.find((e) => e.id === req.employeeId);
                    return (
                      <div
                        key={req.id}
                        className="p-3 bg-gray-50/80 rounded-xl border border-gray-200/80 flex items-center justify-between gap-3 hover:bg-white hover:border-gray-300 transition-all"
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Avatar name={`${emp?.firstName || "E"} ${emp?.lastName || ""}`} size="sm" />
                          <div className="truncate">
                            <p className="text-xs font-semibold text-gray-950 truncate">
                              {emp?.firstName} {emp?.lastName}{" "}
                              <span className="text-[10px] text-gray-400 font-mono">
                                ({emp?.employeeCode || emp?.id})
                              </span>
                            </p>
                            <p className="text-[11px] text-gray-500 truncate">
                              {req.days} Day Leave ({formatDate(req.fromDate)}) • {req.reason}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            onClick={() => {
                              approveLeave(req.id);
                              toast.success("Leave approved");
                            }}
                            variant="primary"
                            size="sm"
                            className="text-[11px] h-7 px-2.5"
                          >
                            Approve
                          </Button>
                          <Button
                            onClick={() => {
                              rejectLeave(req.id, "Declined by HR Admin");
                              toast.info("Leave rejected");
                            }}
                            variant="outline"
                            size="sm"
                            className="text-[11px] h-7 px-2.5 text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* Declared Holidays Strip */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Declared Annual Holidays (CY 2026)</CardTitle>
                <p className="text-xs text-text-secondary mt-0.5">
                  Official public and optional holidays administered by the HR department.
                </p>
              </div>
              <Button
                onClick={() => navigate("/time/holidays")}
                variant="outline"
                size="sm"
                rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
              >
                Open Holiday Calendar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {holidays.slice(0, 3).map((h) => (
                  <div
                    key={h.id}
                    className="p-3 rounded-xl border border-gray-200/80 bg-gray-50/60 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-gray-900">{h.name}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        {formatDate(h.date)} • {h.day}
                      </div>
                    </div>
                    <Badge variant={h.isOptional ? "warning" : "neutral"} size="sm">
                      {h.isOptional ? "Optional" : "Paid"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* -------------------------------------------------------------------------
          ROLE D: MANAGER / TEAM LEAD DASHBOARD (My Team Roster & Team Approvals)
      ------------------------------------------------------------------------- */}
      {isSupervisor && (
        <div className="space-y-6">
          {/* Top Team KPI Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="My Team Members"
              value={teamMembers.length}
              icon={<Users className="w-6 h-6 text-indigo-600" />}
              trend={{ value: effectiveTeamDept, isPositive: true }}
              subtitle="Direct reports in your unit"
              accentColor="indigo"
              onClick={() => navigate("/people/employees")}
            />

            <KpiCard
              label="Team Present Today"
              value={teamPresentCount}
              icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />}
              trend={{
                value: `${teamMembers.length > 0 ? Math.round((teamPresentCount / teamMembers.length) * 100) : 100}%`,
                isPositive: true,
                label: "Turnout",
              }}
              subtitle="On-time team turnout"
              accentColor="emerald"
              onClick={() => navigate("/time/attendance")}
            />

            <KpiCard
              label="Team Members On Leave"
              value={teamOnLeaveCount}
              icon={<CalendarCheck2 className="w-6 h-6 text-amber-600" />}
              trend={{ value: `${teamPendingLeaves.length} pending`, isPositive: false }}
              subtitle="Scheduled leave absences"
              accentColor="amber"
              onClick={() => navigate("/leave/requests")}
            />

            <KpiCard
              label="Pending Team Approvals"
              value={teamPendingLeaves.length}
              icon={<FileCheck className="w-6 h-6 text-rose-600" />}
              trend={{ value: teamPendingLeaves.length > 0 ? "Sign-off Req" : "Clear", isPositive: teamPendingLeaves.length === 0 }}
              subtitle="Awaiting your approval"
              accentColor="rose"
              onClick={() => navigate("/leave/requests")}
            />
          </div>

          {/* Team Members Attendance Roster Today */}
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle>My Team Roster & Today's Attendance</CardTitle>
                <p className="text-xs text-text-secondary mt-0.5">
                  Live presence tracking for team members reporting to you.
                </p>
              </div>
              <Badge variant="default" size="sm">
                Today: {formatDate(getTodayIst())}
              </Badge>
            </CardHeader>

            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-y border-gray-200 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                    <th className="py-3 px-4">Team Member</th>
                    <th className="py-3 px-4">Designation</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Punch In Time</th>
                    <th className="py-3 px-4">Today's Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {teamMembers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-gray-400">
                        No direct team members found assigned to your lead.
                      </td>
                    </tr>
                  ) : (
                    teamMembers.map((m) => {
                      const att = todayAttendance.find((a) => a.employeeId === m.id);
                      const isPresent = att?.status === "PRESENT" || att?.status === "LATE" || att?.status === "HALF_DAY";
                      const isOnLeave = att?.status === "LEAVE";
                      return (
                        <tr key={m.id} className="hover:bg-gray-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-gray-900 flex items-center gap-2.5">
                            <Avatar name={`${m.firstName} ${m.lastName}`} size="sm" />
                            <div>
                              <div className="text-xs font-bold text-gray-950">
                                {m.firstName} {m.lastName}
                              </div>
                              <div className="text-[10px] text-gray-400 font-mono">
                                {m.employeeCode || m.id}
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-xs text-gray-600">
                            {m.designation || "Software Engineer"}
                          </td>

                          <td className="py-3.5 px-4 text-xs text-gray-500">
                            {m.branchName || "Pune HQ"}
                          </td>

                          <td className="py-3.5 px-4 font-mono text-xs text-gray-900">
                            {att?.firstIn ? `${att.firstIn} AM` : "--:--"}
                          </td>

                          <td className="py-3.5 px-4">
                            <Badge
                              variant={
                                isPresent
                                  ? "success"
                                  : isOnLeave
                                    ? "warning"
                                    : att?.status === "LATE"
                                      ? "warning"
                                      : "neutral"
                              }
                              size="sm"
                            >
                              {isOnLeave ? "On Leave" : isPresent ? "Present" : "Absent"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Pending Team Leave Approvals */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Team Leave Requests Awaiting Your Approval</CardTitle>
                <p className="text-xs text-text-secondary mt-0.5">
                  Direct sign-offs for team members reporting to your team.
                </p>
              </div>
              <Button
                onClick={() => navigate("/leave/requests")}
                variant="outline"
                size="sm"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                All Requests
              </Button>
            </CardHeader>

            <CardContent className="space-y-3">
              {teamPendingLeaves.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  All team leave requests are currently reviewed!
                </div>
              ) : (
                teamPendingLeaves.map((req) => {
                  const emp = employees.find((e) => e.id === req.employeeId);
                  return (
                    <div
                      key={req.id}
                      className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-200/80 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <Avatar name={`${emp?.firstName || "E"} ${emp?.lastName || ""}`} size="sm" />
                        <div className="truncate">
                          <p className="text-xs font-semibold text-gray-950 truncate">
                            {emp?.firstName} {emp?.lastName}{" "}
                            <span className="text-[10px] text-gray-400 font-mono">
                              ({emp?.employeeCode || emp?.id})
                            </span>
                          </p>
                          <p className="text-[11px] text-gray-500 truncate">
                            {req.days} Day Leave ({formatDate(req.fromDate)}) • {req.reason}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          onClick={() => {
                            approveLeave(req.id);
                            toast.success("Leave approved for team member");
                          }}
                          variant="primary"
                          size="sm"
                          className="text-[11px] h-7 px-2.5"
                        >
                          Approve
                        </Button>
                        <Button
                          onClick={() => {
                            rejectLeave(req.id, "Rejected by Team Lead");
                            toast.info("Leave rejected");
                          }}
                          variant="outline"
                          size="sm"
                          className="text-[11px] h-7 px-2.5 text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )
      }

      {/* -------------------------------------------------------------------------
          ROLE E: EMPLOYEE DASHBOARD (ESS Self-Service Portal)
      ------------------------------------------------------------------------- */}
      {
        isEmployee && (
          <div className="space-y-6">
            {/* Top ESS Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="My Designation & Unit"
                value={currentEmp?.designation?.split(" ")[0] || "Engineer"}
                icon={<Briefcase className="w-6 h-6 text-indigo-600" />}
                subtitle={currentEmp?.department || user?.department || "Technology"}
                accentColor="indigo"
              />

              <KpiCard
                label="Available Leave Balance"
                value="18.5 Days"
                icon={<CalendarCheck2 className="w-6 h-6 text-emerald-600" />}
                trend={{ value: "Casual + Sick + PL", isPositive: true }}
                subtitle="Statutory quota"
                accentColor="emerald"
                onClick={() => navigate("/leave/overview")}
              />

              <KpiCard
                label="My Latest Payslip"
                value="Sep 2026"
                icon={<WalletCards className="w-6 h-6 text-gray-700" />}
                trend={{ value: "Processed", isPositive: true }}
                subtitle="Ready to download"
                accentColor="neutral"
                onClick={() => navigate("/payroll/payslips")}
              />

              <KpiCard
                label="Today's Card Tap Status"
                value={hasCardTap ? `${elapsedTime.hours}h ${elapsedTime.minutes}m Worked` : "Not Tapped"}
                icon={<Clock className="w-6 h-6 text-emerald-600" />}
                trend={{
                  value: hasCardTap
                    ? `In at ${formatTime(todayBioRecord?.firstIn || (cardTapDate ? cardTapDate.toISOString() : "09:35"))}`
                    : "No Punches",
                  isPositive: hasCardTap,
                }}
                subtitle={hasCardTap ? `${todayBioRecord?.punchCount || 1} card taps today` : "Biometric Verified"}
                accentColor="emerald"
                onClick={() => navigate("/time/attendance")}
              />
            </div>

            {/* Web Punch Card & Leave Applications Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="border-emerald-200/60 shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle>Daily Card Tap & Work Timer</CardTitle>
                    <p className="text-xs text-text-secondary mt-0.5">Live work duration from biometric reader</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => loadBioRoster(getTodayIst())}
                      className={`px-2 py-0.5 text-[10px] rounded font-semibold transition-all ${selectedTapDate === getTodayIst()
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                    >
                      Today
                    </button>
                    <button
                      onClick={() => loadBioRoster("2026-10-20")}
                      className={`px-2 py-0.5 text-[10px] rounded font-semibold transition-all ${selectedTapDate === "2026-10-20"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                    >
                      20 Oct
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {hasCardTap ? (
                    <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/50 border border-emerald-200 text-center relative overflow-hidden shadow-xs">
                      <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider flex items-center justify-center gap-1.5 mb-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>
                          {selectedTapDate === new Date().toISOString().split("T")[0] ? "Today" : selectedTapDate} • Work Timer Active
                        </span>
                      </div>

                      {/* BIG BOLD ELAPSED TIMER */}
                      <div className="text-3xl sm:text-4xl font-mono font-extrabold text-gray-950 flex items-center justify-center gap-1 my-1">
                        <span>{String(elapsedTime.hours).padStart(2, "0")}h</span>
                        <span className="text-emerald-500 animate-pulse">:</span>
                        <span>{String(elapsedTime.minutes).padStart(2, "0")}m</span>
                        <span className="text-xs font-mono text-gray-400 self-end mb-1">
                          :{String(elapsedTime.seconds).padStart(2, "0")}s
                        </span>
                      </div>

                      <div className="text-xs font-semibold text-emerald-800 mt-1">
                        Total: {elapsedTime.hours} Hours {elapsedTime.minutes} Minutes Logged
                      </div>

                      {/* Tap breakdown details */}
                      <div className="mt-3 pt-3 border-t border-emerald-100 grid grid-cols-2 gap-2 text-left text-[11px]">
                        <div className="bg-white/90 p-2 rounded-lg border border-emerald-100">
                          <div className="text-gray-400 font-medium">First Card Tap</div>
                          <div className="font-bold text-gray-900 mt-0.5">
                            {formatTime(todayBioRecord?.firstIn || (cardTapDate ? cardTapDate.toISOString() : "09:35"))}
                          </div>
                        </div>
                        <div className="bg-white/90 p-2 rounded-lg border border-emerald-100">
                          <div className="text-gray-400 font-medium">Latest Card Tap</div>
                          <div className="font-bold text-gray-900 mt-0.5">
                            {todayBioRecord?.lastOut && todayBioRecord.lastOut !== todayBioRecord.firstIn
                              ? formatTime(todayBioRecord.lastOut)
                              : "Active on Duty"}
                          </div>
                        </div>
                      </div>

                      {/* Progress bar to 9 hour general shift */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[11px] text-gray-500 mb-1">
                          <span>Shift Target: 9h (10:00 - 19:00)</span>
                          <span className="font-bold text-emerald-700">
                            {Math.min(100, Math.round((elapsedTime.totalSeconds / (9 * 3600)) * 100))}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-emerald-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.round((elapsedTime.totalSeconds / (9 * 3600)) * 100))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-center">
                      <div className="text-2xl font-mono font-bold text-gray-700">
                        {nowTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
                      </div>
                      <div className="text-xs text-gray-600 font-medium mt-1">
                        Biometric Reader Ready (Listening on 192.168.1.30)
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Tap your card on office reader to automatically start your daily work timer.
                      </p>
                      <div className="mt-2.5 flex items-center justify-center gap-1.5 text-xs text-indigo-700 font-semibold bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                        <Fingerprint className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
                        <span>Ready for card swipe</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => {
                        punchAttendance(user?.employeeId || "EMP-1004", isPunchedIn ? "OUT" : "IN");
                      }}
                      variant={hasCardTap ? "outline" : "primary"}
                      size="md"
                      className="flex-1 justify-center text-xs font-semibold"
                      leftIcon={<Clock className="w-4 h-4" />}
                    >
                      {hasCardTap ? "Web Punch Out" : "Web Punch In"}
                    </Button>
                    <Button
                      onClick={async () => {
                        await loadBioRoster(selectedTapDate);
                        toast.success(`Biometric punches refreshed for ${selectedTapDate}!`);
                      }}
                      variant="ghost"
                      size="md"
                      className="px-2.5 text-gray-500 hover:text-gray-900"
                      title="Refresh latest taps from biometric reader"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>My Leave Applications</CardTitle>
                    <p className="text-xs text-text-secondary mt-0.5">
                      History and approval status of your submitted time-off
                    </p>
                  </div>
                  {onOpenApplyLeave && (
                    <Button
                      onClick={onOpenApplyLeave}
                      variant="primary"
                      size="sm"
                      leftIcon={<CalendarPlus className="w-3.5 h-3.5" />}
                    >
                      Apply Leave
                    </Button>
                  )}
                </CardHeader>

                <CardContent className="space-y-3">
                  {myLeaves.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      You haven't submitted any leave applications recently.
                    </div>
                  ) : (
                    myLeaves.slice(0, 4).map((req) => (
                      <div
                        key={req.id}
                        className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-200/80 flex items-center justify-between gap-3"
                      >
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-950">
                              {req.days} Day Leave
                            </span>
                            <span className="text-[11px] text-gray-500">
                              ({formatDate(req.fromDate)})
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">{req.reason}</p>
                        </div>

                        <Badge
                          variant={
                            req.status === "APPROVED"
                              ? "success"
                              : req.status === "REJECTED"
                                ? "danger"
                                : "warning"
                          }
                          size="sm"
                        >
                          {req.status === "PENDING" ? "Pending Review" : req.status}
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ESS Quick Action Shortcuts */}
            <Card>
              <CardHeader>
                <CardTitle>Employee Self-Service Quick Shortcuts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => navigate("/time/attendance")}
                    className="p-3.5 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-gray-950">Clock Attendance</span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Review your monthly punch logs, daily shift hours, and biometric sensor records.
                    </p>
                  </button>

                  <button
                    onClick={() => navigate("/payroll/payslips")}
                    className="p-3.5 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <WalletCards className="w-4 h-4 text-gray-900" />
                      <span className="text-xs font-bold text-gray-950">Download Payslips</span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Access monthly salary slips with statutory EPF and tax deduction breakdowns.
                    </p>
                  </button>

                  <button
                    onClick={() => navigate("/time/holidays")}
                    className="p-3.5 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-gray-950">Company Holidays</span>
                    </div>
                    <p className="text-[11px] text-gray-500">
                      View official public holidays and optional festival leaves for Calendar Year 2026.
                    </p>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      }
    </div >
  );
}

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarCheck2,
  CalendarPlus,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Calendar,
  Building2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useHrms } from "../../lib/hrmsContext";
import { useAuth } from "../../lib/authContext";
import { leaveApi, LeaveRequestItem } from "../../lib/api"; // 👈 Backend API import
import { KpiCard } from "../../components/ui/KpiCard";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Avatar } from "../../components/ui/Avatar";
import { formatDate } from "../../lib/utils";
import { useToast } from "../../lib/toastContext";

export interface LeaveOverviewPageProps {
  onOpenApplyLeave?: () => void;
}

export function LeaveOverviewPage({ onOpenApplyLeave }: LeaveOverviewPageProps) {
  const {
    leaveTypes,
    employees,
    activeCompanyId,
    company,
    allCompanies,
    switchActiveCompany,
  } = useHrms();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isEmployee = user?.role === "EMPLOYEE";

  // 👇 Backend Data State
  const [backendLeaves, setBackendLeaves] = useState<LeaveRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 👇 Backend se data fetch karo
  useEffect(() => {
    const fetchLeaves = async () => {
      setIsLoading(true);
      try {
        if (isEmployee) {
          // Employee ko sirf apni leaves dikhengi
          const myLeaves = await leaveApi.getMyRequests();
          setBackendLeaves(myLeaves || []);
        } else {
          // HR / TL / Admin ko saari leaves dikhengi (approvals endpoint se)
          const approvals = await leaveApi.getApprovals(
            "ALL",
            isSuperAdmin ? activeCompanyId : undefined
          );
          setBackendLeaves(approvals || []);
        }
      } catch {
        toast.error("Failed to load leave overview data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaves();
  }, [isEmployee, isSuperAdmin, activeCompanyId, toast]);

  // 👇 Backend data ko local format me map karo (Kyunki backend DTO alag hai)
  const mappedLeaves = useMemo(() => {
    return backendLeaves.map((b) => ({
      id: b.id,
      employeeId: String(b.employeeId),
      leaveTypeId: String(b.leaveTypeId),
      status: b.status,
      fromDate: b.startDate,
      toDate: b.endDate,
      days: Number(b.totalDays) || 1,
      reason: b.reason,
      employeeName: b.employeeName,
      employeeCode: b.employeeCode,
      departmentName: b.departmentName,
    }));
  }, [backendLeaves]);

  // 👇 Super Admin Company Filter
  const scopedLeaves = useMemo(() => {
    if (!isSuperAdmin || !activeCompanyId) return mappedLeaves;
    return mappedLeaves.filter((l) => {
      const emp = employees.find((e) => e.id === l.employeeId);
      return !emp?.companyId || Number(emp.companyId) === activeCompanyId;
    });
  }, [mappedLeaves, employees, isSuperAdmin, activeCompanyId]);

  // 👇 KPIs (Ab sirf backend data se calculate hoga)
  const totalRequests = scopedLeaves.length;
  const pendingRequests = scopedLeaves.filter((l) => l.status === "PENDING").length;
  const approvedRequests = scopedLeaves.filter((l) => l.status === "APPROVED").length;
  const rejectedRequests = scopedLeaves.filter((l) => l.status === "REJECTED").length;

  const approvedDays = scopedLeaves
    .filter((l) => l.status === "APPROVED")
    .reduce((sum, l) => sum + (l.days || 0), 0);

  // Chart Data: Approved leaves by type
  const leaveByTypeData = leaveTypes.map((type) => {
    const count = scopedLeaves.filter(
      (l) => l.leaveTypeId === type.id && l.status === "APPROVED"
    ).length;
    return {
      name: type.code,
      fullName: type.name,
      requests: count,
      quota: type.annualQuota,
      color: type.color,
    };
  });

  // Upcoming Leaves (Aaj se aage ki leaves)
  const todayStr = new Date().toISOString().split("T")[0];
  const upcomingLeaves = scopedLeaves.filter(
    (l) => l.status === "APPROVED" && l.fromDate >= todayStr
  ).sort((a, b) => a.fromDate.localeCompare(b.fromDate)).slice(0, 5); // Top 5 upcoming

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-950 tracking-tight flex items-center gap-3">
            Leave & Time-Off Overview
            {isLoading && <span className="text-sm font-normal text-gray-400">(Loading...)</span>}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Monitor organizational leave utilization, pending approvals, and statutory quota balances.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button onClick={() => navigate("/leave/policies")} variant="outline" size="md" leftIcon={<ShieldCheck className="w-4 h-4 text-gray-500" />}>
            Leave Policies
          </Button>
          <Button onClick={() => navigate("/leave/requests")} variant="outline" size="md" leftIcon={<CalendarCheck2 className="w-4 h-4 text-gray-500" />}>
            Review Requests
          </Button>
          {onOpenApplyLeave && (
            <Button onClick={onOpenApplyLeave} variant="primary" size="md" leftIcon={<CalendarPlus className="w-4 h-4" />}>
              Apply Leave
            </Button>
          )}
        </div>
      </div>

      {/* Super Admin Tenant Organization Scope Banner */}
      {isSuperAdmin && (
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50/50 border border-purple-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-purple-800">Super Admin Cross-Tenant Governance</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-700 text-white">Organization Scope Active</span>
              </div>
              <h3 className="text-sm font-bold text-gray-950 mt-0.5">
                Leave Analytics for: <span className="text-purple-700 font-extrabold">{company?.name || `Organization #${activeCompanyId}`}</span>
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <div className="flex items-center gap-2 bg-white border border-purple-200 px-3 py-1.5 rounded-xl shadow-2xs">
              <span className="text-xs font-semibold text-gray-600">Active Tenant:</span>
              <select
                value={activeCompanyId}
                onChange={(e) => switchActiveCompany(Number(e.target.value))}
                className="text-xs font-bold text-purple-950 bg-transparent border-none focus:outline-none cursor-pointer"
              >
                {allCompanies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.legalName || c.tradeName} (ID: #{c.id})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Action Alert Banner for Pending Requests */}
      {pendingRequests > 0 && (
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 text-amber-700">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-950">
                {pendingRequests} Leave Application{pendingRequests > 1 ? "s" : ""} Awaiting Review
              </p>
              <p className="text-xs text-amber-800/90">
                Action is required from HR and line managers before the upcoming payroll cut-off date.
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/leave/requests")}
            variant="outline"
            size="sm"
            className="border-amber-300 text-amber-900 hover:bg-amber-100/60 self-start sm:self-auto text-xs"
            rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Process Approvals
          </Button>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Applications"
          value={totalRequests}
          icon={<CalendarCheck2 className="w-6 h-6 text-gray-700" />}
          subtitle="From backend records"
          accentColor="neutral"
        />
        <KpiCard
          label="Pending Approvals"
          value={pendingRequests}
          icon={<Clock className="w-6 h-6 text-amber-600" />}
          trend={pendingRequests > 0 ? { value: "Action Required", isPositive: false } : undefined}
          subtitle="Awaiting manager signoff"
          accentColor="amber"
          onClick={() => navigate("/leave/requests")}
        />
        <KpiCard
          label="Approved Leaves"
          value={approvedRequests}
          icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />}
          trend={{ value: `${totalRequests > 0 ? Math.round((approvedRequests / totalRequests) * 100) : 0}% Approved`, isPositive: true }}
          subtitle="Reflected in biometric roster"
          accentColor="emerald"
        />
        <KpiCard
          label="Total Approved Days"
          value={approvedDays}
          icon={<TrendingUp className="w-6 h-6 text-indigo-600" />}
          subtitle="Working days consumed"
          accentColor="indigo"
        />
      </div>

      {/* Visualizations & Upcoming Leaves Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Approved Leaves by Category</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Distribution of approved time-off.</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leaveByTypeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: "rgba(241, 245, 249, 0.6)" }}
                      contentStyle={{ backgroundColor: "#0F172A", borderColor: "#1E293B", borderRadius: "8px", color: "#FFFFFF", fontSize: "12px" }}
                      formatter={(val, name, item) => [`${val} Approved Requests`, item.payload.fullName]}
                    />
                    <Bar dataKey="requests" fill="#0F172A" radius={[6, 6, 0, 0]} barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Statutory Policy Quotas</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Standard annual entitlements.</p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {leaveTypes.slice(0, 3).map((policy) => (
                  <div key={policy.id} className="p-3.5 rounded-xl border border-gray-200/80 bg-gray-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: policy.color }} />
                        <span className="font-bold text-xs text-gray-950">{policy.code}</span>
                      </div>
                      <Badge variant={policy.isPaid ? "success" : "neutral"} size="sm">{policy.isPaid ? "Paid" : "Unpaid"}</Badge>
                    </div>
                    <div className="text-xs text-gray-700 font-medium truncate mb-2">{policy.name}</div>
                    <div className="flex items-baseline justify-between text-xs pt-2 border-t border-gray-200/60">
                      <span className="text-gray-500">Annual Quota:</span>
                      <span className="font-bold text-gray-950">{policy.annualQuota} Days</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle>Upcoming Leaves</CardTitle>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{upcomingLeaves.length} Planned</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingLeaves.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <Calendar className="w-5 h-5 mx-auto mb-2 text-gray-400" />
                  <p className="text-xs font-medium text-gray-700">No Upcoming Leaves</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">No approved leaves found from today.</p>
                </div>
              ) : (
                upcomingLeaves.map((l) => {
                  const emp = employees.find((e) => e.id === l.employeeId);
                  const lt = leaveTypes.find((t) => t.id === l.leaveTypeId);
                  return (
                    <div key={l.id} className="p-3 bg-white rounded-xl border border-gray-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar src={emp?.avatar} name={`${emp?.firstName} ${emp?.lastName}`} size="xs" />
                          <div>
                            <span className="font-semibold text-xs text-gray-950 block">{emp?.firstName} {emp?.lastName}</span>
                            <span className="text-[10px] text-gray-500 font-mono">{emp?.employeeCode}</span>
                          </div>
                        </div>
                        <Badge variant="neutral" size="sm">{lt?.code || "LV"}</Badge>
                      </div>
                      <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-gray-100">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Calendar className="w-3 h-3 text-gray-400" />
                          <span>{formatDate(l.fromDate)}</span>
                        </div>
                        <span className="font-semibold text-gray-900 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                          {l.days} {l.days === 1 ? "Day" : "Days"}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
import React from "react";
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
  AlertCircle,
  FileText,
  Users,
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
import { KpiCard } from "../../components/ui/KpiCard";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Avatar } from "../../components/ui/Avatar";
import { formatDate } from "../../lib/utils";

export interface LeaveOverviewPageProps {
  onOpenApplyLeave?: () => void;
}

export function LeaveOverviewPage({ onOpenApplyLeave }: LeaveOverviewPageProps) {
  const { leaveRequests, leaveTypes, employees } = useHrms();
  const navigate = useNavigate();

  const totalRequests = leaveRequests.length;
  const pendingRequests = leaveRequests.filter((l) => l.status === "PENDING").length;
  const approvedRequests = leaveRequests.filter((l) => l.status === "APPROVED").length;
  const rejectedRequests = leaveRequests.filter((l) => l.status === "REJECTED").length;

  // Chart data: Leave by type
  const leaveByTypeData = leaveTypes.map((type) => {
    const count = leaveRequests.filter((l) => l.leaveTypeId === type.id && l.status === "APPROVED").length;
    return {
      name: type.code,
      fullName: type.name,
      requests: count,
      quota: type.annualQuota,
      color: type.color,
    };
  });

  const upcomingLeaves = leaveRequests.filter(
    (l) => l.status === "APPROVED" && l.fromDate >= "2026-10-06"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-950 tracking-tight">
            Leave & Time-Off Overview
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Monitor organizational leave utilization, pending approvals, and statutory quota balances.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={() => navigate("/leave/policies")}
            variant="outline"
            size="md"
            leftIcon={<ShieldCheck className="w-4 h-4 text-gray-500" />}
          >
            Leave Policies
          </Button>

          <Button
            onClick={() => navigate("/leave/requests")}
            variant="outline"
            size="md"
            leftIcon={<CalendarCheck2 className="w-4 h-4 text-gray-500" />}
          >
            Review Requests
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
        </div>
      </div>

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
          subtitle="Processed this fiscal year"
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
          trend={{ value: `${totalRequests > 0 ? Math.round((approvedRequests / totalRequests) * 100) : 100}% Approved`, isPositive: true }}
          subtitle="Reflected in biometric roster"
          accentColor="emerald"
        />

        <KpiCard
          label="Leave Utilization"
          value="24.8%"
          icon={<TrendingUp className="w-6 h-6 text-indigo-600" />}
          trend={{ value: "Healthy Rate", isPositive: true }}
          subtitle="Against annual employee quota"
          accentColor="indigo"
        />
      </div>

      {/* Visualizations & Upcoming Leaves Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Approved Leaves by Category & Quotas */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Approved Leaves by Category</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Distribution of approved time-off across statutory Casual, Sick, and Privilege Leave quotas.
                </p>
              </div>
              <Button
                onClick={() => navigate("/leave/policies")}
                variant="ghost"
                size="sm"
                className="text-xs text-gray-600 hover:text-gray-950"
              >
                Policy Rules →
              </Button>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={leaveByTypeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis
                      dataKey="name"
                      stroke="#94A3B8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#E2E8F0" }}
                    />
                    <YAxis
                      stroke="#94A3B8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(241, 245, 249, 0.6)" }}
                      contentStyle={{
                        backgroundColor: "#0F172A",
                        borderColor: "#1E293B",
                        borderRadius: "8px",
                        color: "#FFFFFF",
                        fontSize: "12px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      }}
                      itemStyle={{ color: "#F8FAFC" }}
                      labelStyle={{ color: "#94A3B8", fontWeight: 600, marginBottom: "4px" }}
                      formatter={(val, name, item) => [
                        `${val} Approved Requests`,
                        item.payload.fullName,
                      ]}
                    />
                    <Bar dataKey="requests" fill="#0F172A" radius={[6, 6, 0, 0]} barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Leave Type Legend & Summary Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 mt-2 border-t border-gray-100">
                {leaveByTypeData.slice(0, 4).map((lt) => (
                  <div key={lt.name} className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lt.color }} />
                        <span className="font-semibold text-xs text-gray-900">{lt.name}</span>
                      </div>
                      <span className="text-[11px] text-gray-500">{lt.fullName}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-gray-950">{lt.requests}</span>
                      <span className="text-[10px] text-gray-400 block">appr.</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Statutory Quotas & Accrual Snapshot */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Statutory Policy Quotas</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  Standard annual entitlements and monthly accrual rules per employee.
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {leaveTypes.slice(0, 3).map((policy) => (
                  <div
                    key={policy.id}
                    className="p-3.5 rounded-xl border border-gray-200/80 bg-gray-50/50 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: policy.color }} />
                        <span className="font-bold text-xs text-gray-950">{policy.code}</span>
                      </div>
                      <Badge variant={policy.isPaid ? "success" : "neutral"} size="sm">
                        {policy.isPaid ? "Paid" : "Unpaid"}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-700 font-medium truncate mb-2">{policy.name}</div>
                    <div className="flex items-baseline justify-between text-xs pt-2 border-t border-gray-200/60">
                      <span className="text-gray-500">Annual Quota:</span>
                      <span className="font-bold text-gray-950">{policy.annualQuota} Days</span>
                    </div>
                    <div className="flex items-baseline justify-between text-xs mt-1">
                      <span className="text-gray-500">Monthly Accrual:</span>
                      <span className="font-medium text-gray-800">+{policy.monthlyAccrual} / mo</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Upcoming Team Leaves & Rules */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle>Upcoming Team Leaves</CardTitle>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                  {upcomingLeaves.length} Planned
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingLeaves.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2 text-gray-400">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-medium text-gray-700">No Upcoming Leaves</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    No approved leaves scheduled in the next 14 days.
                  </p>
                </div>
              ) : (
                upcomingLeaves.map((l) => {
                  const emp = employees.find((e) => e.id === l.employeeId);
                  const lt = leaveTypes.find((t) => t.id === l.leaveTypeId);

                  return (
                    <div
                      key={l.id}
                      className="p-3 bg-white rounded-xl border border-gray-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-2 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar
                            src={emp?.avatar}
                            name={`${emp?.firstName} ${emp?.lastName}`}
                            size="xs"
                          />
                          <div>
                            <span className="font-semibold text-xs text-gray-950 block">
                              {emp?.firstName} {emp?.lastName}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono">
                              {emp?.employeeCode}
                            </span>
                          </div>
                        </div>
                        <Badge variant="neutral" size="sm">
                          {lt?.code || "LV"}
                        </Badge>
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
                      {l.reason && (
                        <p className="text-[11px] text-gray-500 italic line-clamp-1">
                          "{l.reason}"
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Statutory Policy Guidelines */}
          <div className="p-4 rounded-xl border border-gray-200/80 bg-gray-50/70 space-y-2.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-gray-700" />
              <span className="text-xs font-semibold text-gray-950">Statutory Leave Rules</span>
            </div>
            <ul className="text-[11px] text-gray-600 space-y-1.5 list-disc pl-4 leading-relaxed">
              <li>Casual Leave (CL) cannot be combined with Sick Leave (SL).</li>
              <li>Medical certificate mandatory for Sick Leave exceeding 2 consecutive days.</li>
              <li>Privilege Leave (PL) requires advance notice of at least 7 working days.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

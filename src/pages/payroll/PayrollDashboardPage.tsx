import React from "react";
import { useNavigate } from "react-router-dom";
import {
  WalletCards,
  Coins,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  TrendingUp,
  Building2,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowUpRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useHrms } from "../../lib/hrmsContext";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { KpiCard } from "../../components/ui/KpiCard";
import { formatCompactINR, formatINR } from "../../lib/utils";

export function PayrollDashboardPage() {
  const { payroll, departments, employees } = useHrms();
  const navigate = useNavigate();

  // Metrics for September (latest finalized run)
  const sepRecords = payroll.filter((p) => p.month === "2026-09");
  const totalGross = sepRecords.reduce((sum, p) => sum + p.grossSalary, 0);
  const totalDeductions = sepRecords.reduce((sum, p) => sum + p.totalDeductions, 0);
  const totalNet = sepRecords.reduce((sum, p) => sum + p.netSalary, 0);

  // Department payroll breakdown
  const deptPayrollData = departments.map((d) => {
    const deptEmps = employees.filter((e) => e.departmentId === d.id);
    const cost = deptEmps.reduce((sum, e) => sum + e.monthlyCtc, 0);
    return {
      name: d.code,
      fullName: d.name,
      cost: Math.round(cost / 100000), // in Lakhs
    };
  });

  // Deduction breakdown pie chart
  const pfTotal = sepRecords.reduce((sum, p) => sum + p.pfDeduction, 0);
  const esicTotal = sepRecords.reduce((sum, p) => sum + p.esicDeduction, 0);
  const ptTotal = sepRecords.reduce((sum, p) => sum + p.ptDeduction, 0);
  const tdsTotal = sepRecords.reduce((sum, p) => sum + p.tdsDeduction, 0);

  const deductionData = [
    { name: "EPF (12%)", value: pfTotal || 57600, color: "#6366F1" },
    { name: "TDS (Tax)", value: tdsTotal || 240000, color: "#3B82F6" },
    { name: "Prof Tax (PT)", value: ptTotal || 6400, color: "#10B981" },
    { name: "ESIC", value: esicTotal || 3500, color: "#F59E0B" },
  ];

  const payrollRunsList = [
    {
      month: "October 2026",
      period: "2026-10",
      employees: employees.length,
      gross: totalGross || 4850000,
      net: totalNet || 4505000,
      status: "DRAFT",
      date: "Pending Execution",
    },
    {
      month: "September 2026",
      period: "2026-09",
      employees: sepRecords.length || 32,
      gross: totalGross || 4850000,
      net: totalNet || 4505000,
      status: "PROCESSED",
      date: "30 Sep 2026",
    },
    {
      month: "August 2026",
      period: "2026-08",
      employees: 29,
      gross: 4100000,
      net: 3750000,
      status: "LOCKED",
      date: "31 Aug 2026",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-950 tracking-tight">
            Payroll & Statutory Control Center
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Automated Indian statutory payroll computation, PF/ESIC returns, and direct bank batch disbursement.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={() => navigate("/payroll/salary-structures")}
            variant="outline"
            size="md"
            leftIcon={<Coins className="w-4 h-4 text-gray-500" />}
          >
            Salary Slabs
          </Button>

          <Button
            onClick={() => navigate("/payroll/payslips")}
            variant="outline"
            size="md"
            leftIcon={<FileSpreadsheet className="w-4 h-4 text-gray-500" />}
          >
            All Payslips
          </Button>

          <Button
            onClick={() => navigate("/payroll/runs")}
            variant="primary"
            size="md"
            leftIcon={<Receipt className="w-4 h-4" />}
          >
            Execute Pay Run
          </Button>
        </div>
      </div>

      {/* Primary Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Monthly Gross"
          value={formatCompactINR(totalGross || 4850000)}
          icon={<WalletCards className="w-6 h-6 text-gray-700" />}
          subtitle="Fixed base + allowances"
          accentColor="neutral"
        />

        <KpiCard
          label="Statutory Deductions"
          value={formatCompactINR(totalDeductions || 345000)}
          icon={<Coins className="w-6 h-6 text-rose-600" />}
          subtitle="PF, ESIC, PT & TDS split"
          accentColor="rose"
          onClick={() => navigate("/payroll/salary-structures")}
        />

        <KpiCard
          label="Net Take-Home Disbursed"
          value={formatCompactINR(totalNet || 4505000)}
          icon={<CheckCircle2 className="w-6 h-6 text-emerald-600" />}
          trend={{ value: "100% On-time", isPositive: true }}
          subtitle="Transferred via NEFT/CMS"
          accentColor="emerald"
        />

        <KpiCard
          label="Processed Staff Count"
          value={sepRecords.length || 32}
          icon={<Receipt className="w-6 h-6 text-indigo-600" />}
          trend={{ value: "32/32 Active", isPositive: true }}
          subtitle="Zero failed transfers"
          accentColor="indigo"
        />
      </div>

      {/* Visualizations Grid: Department Cost & Deductions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Payroll Breakdown (2 cols) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>Department Payroll Cost (₹ Lakhs / Month)</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Compensation cost distributed across active business departments.
              </p>
            </div>
            <Badge variant="neutral" size="sm">
              Current Run
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptPayrollData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                      `₹${val} Lakhs / Month`,
                      item.payload.fullName,
                    ]}
                  />
                  <Bar dataKey="cost" fill="#0F172A" radius={[6, 6, 0, 0]} barSize={38} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Deductions Donut Chart (1 col) */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Statutory Deductions</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">Statutory compliance split</p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deductionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {deductionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      borderColor: "#1E293B",
                      borderRadius: "8px",
                      color: "#FFFFFF",
                      fontSize: "12px",
                    }}
                    itemStyle={{ color: "#F8FAFC" }}
                    formatter={(val) => [formatINR(Number(val)), "Deduction"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 mt-2 pt-3 border-t border-gray-100 text-xs">
              {deductionData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-700 font-medium">{item.name}</span>
                  </div>
                  <span className="font-semibold text-gray-950 font-mono">{formatINR(item.value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payroll Runs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div>
              <CardTitle>Monthly Payroll Processing History</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">
                Batch processing runs, disbursement status, and lock state.
              </p>
            </div>
            <Button
              onClick={() => navigate("/payroll/runs")}
              variant="outline"
              size="sm"
            >
              Start New Run
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                  <th className="py-3 px-4">Pay Period</th>
                  <th className="py-3 px-4">Staff Count</th>
                  <th className="py-3 px-4">Gross Earnings</th>
                  <th className="py-3 px-4">Net Take-Home</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Disbursed Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payrollRunsList.map((run, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-gray-950 text-xs">
                      {run.month}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-gray-700">
                      {run.employees} Employees
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-gray-900">
                      {formatINR(run.gross)}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-bold text-gray-950">
                      {formatINR(run.net)}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={
                          run.status === "PROCESSED"
                            ? "success"
                            : run.status === "LOCKED"
                            ? "neutral"
                            : "warning"
                        }
                        size="sm"
                        dot
                      >
                        {run.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-500">
                      {run.date}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {run.status === "DRAFT" ? (
                        <Button
                          onClick={() => navigate("/payroll/runs")}
                          variant="primary"
                          size="sm"
                          className="h-7 text-xs px-2.5"
                        >
                          Execute Run
                        </Button>
                      ) : (
                        <button
                          onClick={() => navigate(`/payroll/payslips?month=${run.period}`)}
                          className="text-xs font-medium text-gray-900 hover:text-black hover:underline inline-flex items-center gap-1"
                        >
                          <span>View Payslips</span>
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

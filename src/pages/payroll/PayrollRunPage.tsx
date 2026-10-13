import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Receipt,
  CheckCircle2,
  Calendar,
  Users,
  Coins,
  ShieldCheck,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { useHrms } from "../../lib/hrmsContext";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Avatar } from "../../components/ui/Avatar";
import { formatINR, formatCompactINR } from "../../lib/utils";

export function PayrollRunPage() {
  const { employees, processPayrollRun } = useHrms();
  const navigate = useNavigate();

  const [selectedMonth, setSelectedMonth] = useState("2026-10");
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>(employees.map((e) => e.id));
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Compute live calculations
  const selectedEmployees = employees.filter((e) => selectedEmpIds.includes(e.id));
  const totalGross = selectedEmployees.reduce((sum, e) => sum + e.monthlyCtc, 0);
  const totalDeductions = selectedEmployees.reduce(
    (sum, e) => sum + 1800 + 200 + Math.round(e.monthlyCtc * 0.08),
    0
  );
  const totalNet = totalGross - totalDeductions;

  const toggleSelectAll = () => {
    if (selectedEmpIds.length === employees.length) {
      setSelectedEmpIds([]);
    } else {
      setSelectedEmpIds(employees.map((e) => e.id));
    }
  };

  const toggleEmployee = (id: string) => {
    if (selectedEmpIds.includes(id)) {
      setSelectedEmpIds(selectedEmpIds.filter((empId) => empId !== id));
    } else {
      setSelectedEmpIds([...selectedEmpIds, id]);
    }
  };

  const handleRunPayroll = () => {
    if (selectedEmpIds.length === 0) {
      alert("Please select at least one employee for the payroll run.");
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      processPayrollRun(selectedMonth, selectedEmpIds);
      setIsProcessing(false);
      setIsCompleted(true);
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-950 tracking-tight">
            Execute Monthly Payroll Run
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Process salaries, calculate statutory EPF, ESIC, and Professional Tax, and generate locked salary registers.
          </p>
        </div>
      </div>

      {isCompleted ? (
        <Card className="text-center p-8 sm:p-12 space-y-4 max-w-2xl mx-auto border-emerald-200 bg-emerald-50/20 shadow-md">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-bold text-gray-950">
            Payroll Successfully Finalized!
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
            October 2026 payroll has been locked for {selectedEmpIds.length} employees with total net
            disbursement of <strong className="text-gray-950">{formatINR(totalNet)}</strong>. Individual payslips and NEFT disbursement registers are ready.
          </p>

          <div className="pt-4 flex items-center justify-center gap-3">
            <Button
              onClick={() => navigate("/payroll/payslips")}
              variant="primary"
              size="md"
            >
              View Generated Payslips
            </Button>
            <Button
              onClick={() => navigate("/payroll/dashboard")}
              variant="outline"
              size="md"
            >
              Return to Control Center
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Step 1 & 2: Month Selector & Summary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-gray-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-center">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Processing Month
              </span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="mt-1 text-base font-bold text-gray-950 bg-transparent border-none focus:outline-none cursor-pointer"
              >
                <option value="2026-10">October 2026</option>
                <option value="2026-11">November 2026</option>
              </select>
            </div>

            <div className="p-4 rounded-xl border border-gray-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-center">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Selected Staff
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-950">
                  {selectedEmpIds.length}
                </span>
                <span className="text-xs text-gray-500">of {employees.length} employees</span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-gray-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-center">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Gross Disbursement
              </span>
              <p className="text-2xl font-bold text-gray-950 mt-1 font-mono">
                {formatCompactINR(totalGross)}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gray-950 text-white flex flex-col justify-center shadow-sm">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Net Take-Home Payable
              </span>
              <p className="text-2xl font-bold text-white mt-1 font-mono">
                {formatCompactINR(totalNet)}
              </p>
            </div>
          </div>

          {/* Employee Selection List */}
          <div className="bg-white rounded-xl border border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="selectAllEmps"
                  checked={selectedEmpIds.length === employees.length}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-gray-950 focus:ring-gray-950/20 w-4 h-4 cursor-pointer accent-gray-950"
                />
                <div>
                  <label htmlFor="selectAllEmps" className="text-sm font-bold text-gray-950 cursor-pointer block">
                    Included Employees in Payroll Batch ({selectedEmpIds.length}/{employees.length})
                  </label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Verify individual salary components and payable deductions before executing batch lock.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleRunPayroll}
                variant="primary"
                size="md"
                isLoading={isProcessing}
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Process & Lock Payroll ({selectedEmpIds.length})
              </Button>
            </div>

            <div className="overflow-x-auto max-h-[520px]">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="sticky top-0 bg-gray-50/90 backdrop-blur-xs border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500 font-semibold z-10">
                  <tr>
                    <th className="py-3 px-4 w-10"></th>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Gross CTC</th>
                    <th className="py-3 px-4 text-rose-700">EPF 12%</th>
                    <th className="py-3 px-4 text-rose-700">PT (MH)</th>
                    <th className="py-3 px-4 text-rose-700">TDS</th>
                    <th className="py-3 px-4 text-right font-bold text-gray-950">Net Pay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {employees.map((emp) => {
                    const isSelected = selectedEmpIds.includes(emp.id);
                    const pf = 1800;
                    const pt = 200;
                    const tds = Math.round(emp.monthlyCtc * 0.08);
                    const net = emp.monthlyCtc - (pf + pt + tds);

                    return (
                      <tr
                        key={emp.id}
                        className={`hover:bg-gray-50/70 transition-colors text-xs ${
                          isSelected ? "" : "opacity-40"
                        }`}
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleEmployee(emp.id)}
                            className="rounded border-gray-300 text-gray-950 focus:ring-gray-950/20 w-4 h-4 cursor-pointer accent-gray-950"
                          />
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar
                              src={emp.avatar}
                              name={`${emp.firstName} ${emp.lastName}`}
                              size="xs"
                            />
                            <div>
                              <span className="font-semibold text-gray-950 block text-xs">
                                {emp.firstName} {emp.lastName}
                              </span>
                              <span className="text-[11px] text-gray-500 font-mono">
                                {emp.employeeCode}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-semibold text-gray-950 font-mono">
                          {formatINR(emp.monthlyCtc)}
                        </td>
                        <td className="py-3 px-4 text-rose-600 font-mono">-{formatINR(pf)}</td>
                        <td className="py-3 px-4 text-rose-600 font-mono">-{formatINR(pt)}</td>
                        <td className="py-3 px-4 text-rose-600 font-mono">-{formatINR(tds)}</td>
                        <td className="py-3 px-4 text-right font-bold text-gray-950 font-mono text-xs">
                          {formatINR(net)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from "react";
import { Coins, Search, ShieldCheck, Info, FileSpreadsheet, RotateCcw } from "lucide-react";
import { useHrms } from "../../lib/hrmsContext";
import { Avatar } from "../../components/ui/Avatar";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { formatINR } from "../../lib/utils";

export function SalaryStructurePage() {
  const { employees, salaryStructures, departments } = useHrms();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");

  const filtered = employees.filter((e) => {
    const matchesDept = selectedDept === "ALL" || e.departmentId === selectedDept;
    const name = `${e.firstName} ${e.lastName}`.toLowerCase();
    const matchesSearch =
      name.includes(searchQuery.toLowerCase()) ||
      e.employeeCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-950 tracking-tight">
            Salary Structures & Statutory Slabs
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Component decomposition: Basic 50%, HRA 25%, Special Allowance 25%, EPF 12%, and State PT.
          </p>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-center gap-3 flex-wrap justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee by name or ID..."
            className="w-full h-9 pl-9 pr-3 text-xs bg-gray-50/70 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:border-gray-950 focus:ring-2 focus:ring-gray-950/5 transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="h-9 px-3 text-xs bg-gray-50/70 border border-gray-200 rounded-lg text-gray-800 focus:bg-white focus:outline-none focus:border-gray-950 focus:ring-2 focus:ring-gray-950/5 transition-all"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {(selectedDept !== "ALL" || searchQuery) && (
            <button
              onClick={() => {
                setSelectedDept("ALL");
                setSearchQuery("");
              }}
              className="h-9 px-2.5 text-xs text-gray-500 hover:text-gray-950 hover:bg-gray-100 rounded-lg flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Salary Structures Table */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Monthly CTC</th>
                <th className="py-3 px-4">Basic (50%)</th>
                <th className="py-3 px-4">HRA (25%)</th>
                <th className="py-3 px-4">Special Allowance</th>
                <th className="py-3 px-4 text-rose-700">PF (12%)</th>
                <th className="py-3 px-4 text-rose-700">PT (MH)</th>
                <th className="py-3 px-4 text-rose-700">Est. TDS</th>
                <th className="py-3 px-4 text-right font-bold text-gray-950">Net Salary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-gray-400 text-xs">
                    No employees found matching selected parameters.
                  </td>
                </tr>
              ) : (
                filtered.map((emp) => {
                  const s = salaryStructures.find((item) => item.employeeId === emp.id);
                  const basic = s?.basic || Math.round(emp.monthlyCtc * 0.5);
                  const hra = s?.hra || Math.round(emp.monthlyCtc * 0.25);
                  const special = s?.specialAllowance || Math.round(emp.monthlyCtc * 0.25);
                  const pf = s?.pfEmployee || 1800;
                  const pt = s?.professionalTax || 200;
                  const tds = s?.tdsMonthly || Math.round(emp.monthlyCtc * 0.08);
                  const net = emp.monthlyCtc - (pf + pt + tds);

                  return (
                    <tr key={emp.id} className="hover:bg-gray-50/70 transition-colors text-xs">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            src={emp.avatar}
                            name={`${emp.firstName} ${emp.lastName}`}
                            size="xs"
                          />
                          <div>
                            <p className="font-semibold text-gray-950 text-xs">
                              {emp.firstName} {emp.lastName}
                            </p>
                            <span className="text-[11px] font-mono text-gray-500">{emp.employeeCode}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-gray-950 font-mono">
                        {formatINR(emp.monthlyCtc)}
                      </td>

                      <td className="py-3.5 px-4 font-medium text-gray-800 font-mono">{formatINR(basic)}</td>
                      <td className="py-3.5 px-4 text-gray-600 font-mono">{formatINR(hra)}</td>
                      <td className="py-3.5 px-4 text-gray-600 font-mono">{formatINR(special)}</td>

                      <td className="py-3.5 px-4 text-rose-600 font-semibold font-mono">-{formatINR(pf)}</td>
                      <td className="py-3.5 px-4 text-rose-600 font-mono">-{formatINR(pt)}</td>
                      <td className="py-3.5 px-4 text-rose-600 font-mono">-{formatINR(tds)}</td>

                      <td className="py-3.5 px-4 text-right font-bold text-gray-950 text-xs font-mono">
                        {formatINR(net)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

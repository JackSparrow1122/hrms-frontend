import React, { useState } from "react";
import { ScrollText, Search, Filter, ShieldCheck, Download, RotateCcw, Shield } from "lucide-react";
import { useHrms } from "../../lib/hrmsContext";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { exportToCsv } from "../../lib/utils";

export function AuditLogsPage() {
  const { auditLogs } = useHrms();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedModule, setSelectedModule] = useState("ALL");

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      searchQuery === "" ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesModule = selectedModule === "ALL" || log.module === selectedModule;

    return matchesSearch && matchesModule;
  });

  const handleExport = () => {
    const headers = ["Timestamp", "User", "Role", "Action", "Module", "Details", "IP Address", "Status"];
    const rows = filteredLogs.map((l) => [
      l.timestamp,
      l.userName,
      l.userRole,
      l.action,
      l.module,
      l.details,
      l.ipAddress,
      l.status,
    ]);
    exportToCsv("GA_HRMS_Security_Audit_Logs", headers, rows);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedModule("ALL");
  };

  const successCount = auditLogs.filter((l) => l.status === "SUCCESS").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-950 tracking-tight">
            Security & Audit Trail
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Tamper-evident system activity log recording all HR modifications, permissions, and administrative events.
          </p>
        </div>

        <Button
          onClick={handleExport}
          variant="outline"
          size="md"
          leftIcon={<Download className="w-4 h-4 text-gray-500" />}
        >
          Export Audit Trail (CSV)
        </Button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-gray-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Total Logged Events
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-950 font-mono">{auditLogs.length}</span>
            <span className="text-xs text-gray-500">events</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-gray-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Successful Operations
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700 font-mono">{successCount}</span>
            <span className="text-xs text-gray-500">verified</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-gray-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Audit Coverage
          </span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-950 font-mono">100%</span>
            <span className="text-xs text-emerald-700 font-medium">All Modules</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex items-center gap-3 flex-wrap justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by action, actor, or event details..."
            className="w-full h-9 pl-9 pr-3 text-xs bg-gray-50/70 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:border-gray-950 focus:ring-2 focus:ring-gray-950/5 transition-all"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="h-9 px-3 text-xs bg-gray-50/70 border border-gray-200 rounded-lg text-gray-800 focus:bg-white focus:outline-none focus:border-gray-950 focus:ring-2 focus:ring-gray-950/5 transition-all"
          >
            <option value="ALL">All Modules</option>
            <option value="EMPLOYEE">Employee</option>
            <option value="ATTENDANCE">Attendance</option>
            <option value="LEAVE">Leave</option>
            <option value="PAYROLL">Payroll</option>
            <option value="SETTINGS">Settings</option>
            <option value="SYSTEM">System</option>
          </select>

          {(selectedModule !== "ALL" || searchQuery) && (
            <button
              onClick={resetFilters}
              className="h-9 px-2.5 text-xs text-gray-500 hover:text-gray-950 hover:bg-gray-100 rounded-lg flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Event Details</th>
                <th className="py-3 px-4">Client IP</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-gray-400 text-xs">
                    No audit records matching selected search query or module filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-4 text-gray-500 whitespace-nowrap font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-semibold text-gray-950 block text-xs">{log.userName}</span>
                      <span className="text-[10px] text-gray-500 font-mono">{log.userRole}</span>
                    </td>

                    <td className="py-3 px-4 font-semibold text-gray-950">
                      {log.action}
                    </td>

                    <td className="py-3 px-4">
                      <Badge variant="neutral" size="sm">
                        {log.module}
                      </Badge>
                    </td>

                    <td className="py-3 px-4 text-gray-600 max-w-sm leading-relaxed text-xs">
                      {log.details}
                    </td>

                    <td className="py-3 px-4 font-mono text-gray-400 text-[11px]">
                      {log.ipAddress}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <Badge
                        variant={log.status === "SUCCESS" ? "success" : "warning"}
                        size="sm"
                        dot
                      >
                        {log.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

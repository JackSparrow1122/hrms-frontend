import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Search,
  Download,
  Upload,
  Plus,
  Eye,
  Trash2,
  Clock,
  CalendarCheck2,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Filter,
  UserCheck,
  UserX,
  Building2,
  MapPin,
  ShieldCheck,
  X,
} from "lucide-react";
import { useHrms } from "../../lib/hrmsContext";
import { useAuth } from "../../lib/authContext";
import { Employee, EmploymentStatus } from "../../types/hrms";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Avatar } from "../../components/ui/Avatar";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { formatDate, exportToCsv } from "../../lib/utils";

export interface EmployeesPageProps {
  onOpenAddEmployee?: () => void;
}

export function EmployeesPage({ onOpenAddEmployee }: EmployeesPageProps) {
  const {
    employees,
    departments,
    designations,
    branches,
    company,
    allCompanies,
    activeCompanyId,
    switchActiveCompany,
    deleteEmployee,
    syncBackendData,
  } = useHrms();
  const { user } = useAuth();
  const navigate = useNavigate();

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isTenantAdmin = user?.role === "TENANT_ADMIN" || !!user?.isTenantAdmin;
  const isBranchAdmin = user?.scopeType === "BRANCH" || (user?.role === "HR_ADMIN" && !isTenantAdmin && !isSuperAdmin);
  const isManager = user?.role === "MANAGER";
  const isTeamLead = user?.role === "TEAM_LEAD";
  const isSupervisor = isManager || isTeamLead;

  const assignedBranchId = user?.scopeBranchId ? String(user.scopeBranchId) : user?.branchId || "";
  const currentBranch = branches.find((b) => b.id === assignedBranchId);

  const canAddEmployee = isSuperAdmin || isTenantAdmin || isBranchAdmin;
  const canDelete = isSuperAdmin || user?.role === "HR_ADMIN" || isTenantAdmin;

  const currentUserId = user?.id ? String(user.id) : "";
  const currentEmpId = user?.employeeId ? String(user.employeeId) : "";
  const currentEmpEmail = user?.email?.toLowerCase() || "";

  // Identify supervisor's own employee record
  const selfEmployee = useMemo(() => {
    return employees.find(
      (e) =>
        (currentEmpId && e.id === currentEmpId) ||
        (currentEmpEmail && e.email.toLowerCase() === currentEmpEmail) ||
        (currentUserId && e.id === currentUserId)
    );
  }, [employees, currentEmpId, currentEmpEmail, currentUserId]);

  const effectiveSupervisorEmpId = selfEmployee?.id || currentEmpId || currentUserId;

  // Hierarchical scoping: strictly find all employees below this user in reporting tree
  const subordinateIds = useMemo(() => {
    if (!isSupervisor) return null;
    const directSet = new Set<string>();

    employees.forEach((e) => {
      if (
        (effectiveSupervisorEmpId && String(e.managerId) === String(effectiveSupervisorEmpId)) ||
        (currentUserId && String(e.managerId) === String(currentUserId)) ||
        (currentEmpId && String(e.managerId) === String(currentEmpId))
      ) {
        directSet.add(String(e.id));
      }
    });

    if (isManager) {
      // Recursive expansion for Manager to also view staff reporting to their Team Leads
      let added = true;
      while (added) {
        added = false;
        employees.forEach((e) => {
          if (e.managerId && directSet.has(String(e.managerId)) && !directSet.has(String(e.id))) {
            directSet.add(String(e.id));
            added = true;
          }
        });
      }
    }

    return directSet;
  }, [isSupervisor, isManager, employees, effectiveSupervisorEmpId, currentUserId, currentEmpId]);

  React.useEffect(() => {
    syncBackendData();
  }, [syncBackendData]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedBranch, setSelectedBranch] = useState(() => {
    if (isBranchAdmin && assignedBranchId) return assignedBranchId;
    return "ALL";
  });
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  React.useEffect(() => {
    if (isBranchAdmin && assignedBranchId) {
      setSelectedBranch(assignedBranchId);
    }
  }, [isBranchAdmin, assignedBranchId]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Delete modal state
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);

  // Quick Stats
  const stats = useMemo(() => {
    let sourceEmployees = employees;
    if (isSupervisor && subordinateIds) {
      sourceEmployees = employees.filter((e) => subordinateIds.has(String(e.id)));
    } else if (isBranchAdmin && assignedBranchId) {
      sourceEmployees = employees.filter((e) => String(e.branchId) === String(assignedBranchId));
    } else if (selectedBranch !== "ALL") {
      sourceEmployees = employees.filter((e) => String(e.branchId) === String(selectedBranch));
    }

    const total = sourceEmployees.length;
    const active = sourceEmployees.filter((e) => e.status === "ACTIVE").length;
    const probation = sourceEmployees.filter((e) => e.status === "PROBATION").length;
    const notice = sourceEmployees.filter((e) => e.status === "NOTICE_PERIOD").length;

    const deptIdsInScope = new Set(sourceEmployees.map((e) => e.departmentId).filter(Boolean));
    const deptsCount = isSupervisor
      ? deptIdsInScope.size
      : (isBranchAdmin && assignedBranchId
          ? departments.filter((d) => !d.branchId || String(d.branchId) === String(assignedBranchId)).length
          : (selectedBranch !== "ALL"
              ? departments.filter((d) => !d.branchId || String(d.branchId) === String(selectedBranch)).length
              : departments.length));

    return { total, active, probation, notice, deptsCount };
  }, [employees, departments, isSupervisor, subordinateIds, isBranchAdmin, assignedBranchId, selectedBranch]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // 1. Manager / Team Lead: strictly unse jo niche he sirf unhika data
      if (isSupervisor && subordinateIds) {
        if (!subordinateIds.has(String(emp.id))) {
          return false;
        }
      }

      // 2. Branch HR Admin: strictly enforce branchId
      if (isBranchAdmin && assignedBranchId) {
        if (String(emp.branchId) !== String(assignedBranchId)) {
          return false;
        }
      }

      const matchesSearch =
        searchQuery === "" ||
        `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesDept = selectedDept === "ALL" || emp.departmentId === selectedDept;
      const matchesBranch = selectedBranch === "ALL" || String(emp.branchId) === String(selectedBranch);
      const matchesStatus = selectedStatus === "ALL" || emp.status === selectedStatus;

      return matchesSearch && matchesDept && matchesBranch && matchesStatus;
    });
  }, [employees, searchQuery, selectedDept, selectedBranch, selectedStatus, isSupervisor, subordinateIds, isBranchAdmin, assignedBranchId]);

  // Paginated records
  const totalPages = Math.ceil(filteredEmployees.length / pageSize) || 1;
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const hasActiveFilters =
    searchQuery !== "" ||
    selectedDept !== "ALL" ||
    selectedBranch !== "ALL" ||
    selectedStatus !== "ALL";

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedDept("ALL");
    setSelectedBranch("ALL");
    setSelectedStatus("ALL");
    setCurrentPage(1);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      "Employee ID",
      "Full Name",
      "Email",
      "Phone",
      "Department",
      "Designation",
      "Branch",
      "Joining Date",
      "Status",
      "Annual CTC (INR)",
    ];

    const rows = filteredEmployees.map((e) => {
      const dept = departments.find((d) => d.id === e.departmentId)?.name || e.departmentId;
      const desig = designations.find((d) => d.id === e.designationId)?.title || e.designationId;
      const branch = branches.find((b) => b.id === e.branchId)?.name || e.branchId;

      return [
        e.employeeCode,
        `${e.firstName} ${e.lastName}`,
        e.email,
        e.phone,
        dept,
        desig,
        branch,
        e.joiningDate,
        e.status,
        e.annualCtc,
      ];
    });

    exportToCsv("GA_HRMS_Employees_Export", headers, rows);
  };

  const getStatusBadge = (status: EmploymentStatus) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="success" size="sm" dot>Active</Badge>;
      case "PROBATION":
        return <Badge variant="warning" size="sm" dot>Probation</Badge>;
      case "NOTICE_PERIOD":
        return <Badge variant="danger" size="sm" dot>Notice</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-950 tracking-tight">
            {isManager ? "Team Hierarchy Directory" : isTeamLead ? "Direct Team Members" : "Employee Directory"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isSupervisor
              ? `Showing ${stats.total} subordinates reporting directly or indirectly under your leadership.`
              : isBranchAdmin
              ? `Manage your ${stats.total} branch employees, profiles, statutory identities, and compensation records.`
              : `Manage your ${employees.length} organization members, profiles, statutory identities, and compensation records.`}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            onClick={handleExportCSV}
            variant="outline"
            size="md"
            leftIcon={<Download className="w-4 h-4 text-gray-500" />}
          >
            Export CSV
          </Button>

          {canAddEmployee && (
            <>
              <Button
                onClick={() => alert("Simulated: Bulk import XLSX/CSV modal.")}
                variant="outline"
                size="md"
                leftIcon={<Upload className="w-4 h-4 text-gray-500" />}
              >
                Import
              </Button>

              {onOpenAddEmployee && (
                <Button
                  onClick={onOpenAddEmployee}
                  variant="primary"
                  size="md"
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Add Employee
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Role-tailored Scope Context Banners */}
      {isManager && (
        <div className="bg-gradient-to-r from-purple-50/90 via-violet-50/80 to-purple-50/90 border border-purple-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-purple-800">Manager Team Directory</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-600 text-white">Hierarchical Subordinates Only</span>
              </div>
              <h3 className="text-base font-bold text-gray-950 mt-0.5">
                Reporting Hierarchy Subordinates
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                Logged in as Manager: <strong className="text-gray-900">{user?.name}</strong>. Only Team Leads and employees who report under your hierarchy are visible.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-purple-200 text-purple-900 font-semibold text-xs shadow-2xs">
              <Users className="w-3.5 h-3.5 text-purple-600" />
              {stats.total} Team Members
            </span>
          </div>
        </div>
      )}

      {isTeamLead && (
        <div className="bg-gradient-to-r from-amber-50/90 via-orange-50/80 to-amber-50/90 border border-amber-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-amber-800">Team Lead Workspace</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-600 text-white">Direct Reportees Only</span>
              </div>
              <h3 className="text-base font-bold text-gray-950 mt-0.5">
                Direct Team Members
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                Logged in as Team Lead: <strong className="text-gray-900">{user?.name}</strong>. Only employees who report directly to you are visible.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-amber-900 font-semibold text-xs shadow-2xs">
              <Users className="w-3.5 h-3.5 text-amber-600" />
              {stats.total} Direct Reportees
            </span>
          </div>
        </div>
      )}

      {isBranchAdmin && (
        <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-blue-50/90 border border-blue-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-blue-800">Branch Operations Workspace</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">Strict Branch Isolation</span>
              </div>
              <h3 className="text-base font-bold text-gray-950 mt-0.5">
                {currentBranch?.name || user?.branchName || "Assigned Branch Campus"}
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                Designated HR Admin: <strong className="text-gray-900">{user?.name}</strong> ({user?.email}) • All directory records, departments, and designations are strictly isolated to this branch.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-blue-200 text-blue-900 font-semibold text-xs shadow-2xs">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              {currentBranch?.city || "Local Branch Location"}
            </span>
          </div>
        </div>
      )}

      {isTenantAdmin && (
        <div className="bg-gradient-to-r from-emerald-50/90 via-teal-50/80 to-emerald-50/90 border border-emerald-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-800">Organization Head HR Governance</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">{company.name}</span>
              </div>
              <h3 className="text-base font-bold text-gray-950 mt-0.5">
                Multi-Branch Organization Oversight
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                Company Head HR has full oversight across all branches. Use the Branch filter below to view workforce assigned to specific Branch HR Admins.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-emerald-900 font-semibold text-xs shadow-2xs">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              {branches.length} Registered Branches
            </span>
          </div>
        </div>
      )}

      {isSuperAdmin && (
        <div className="bg-gradient-to-r from-purple-50/90 via-indigo-50/80 to-purple-50/90 border border-purple-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-700 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-purple-800">Super Admin Global Platform Governance</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-700 text-white">Platform Scope</span>
              </div>
              <h3 className="text-base font-bold text-gray-950 mt-0.5">
                Cross-Tenant Ecosystem Workforce Directory
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                Audit and inspect complete organization rosters and branch structures across the platform.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <div className="flex items-center gap-2 bg-white border border-purple-200 px-3 py-1.5 rounded-xl shadow-2xs">
              <span className="text-xs font-semibold text-gray-600">Active Org:</span>
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

      {/* Minimalist Executive KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-3.5 rounded-card border border-surface-border shadow-card flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-900 shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">Total Roster</span>
            <span className="text-lg font-bold text-gray-950 tracking-tight">{stats.total}</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-card border border-surface-border shadow-card flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">Active Staff</span>
            <span className="text-lg font-bold text-gray-950 tracking-tight">{stats.active}</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-card border border-surface-border shadow-card flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">In Probation</span>
            <span className="text-lg font-bold text-gray-950 tracking-tight">{stats.probation}</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-card border border-surface-border shadow-card flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-700 shrink-0">
            <UserX className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">Notice Period</span>
            <span className="text-lg font-bold text-gray-950 tracking-tight">{stats.notice}</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-card border border-surface-border shadow-card flex items-center gap-3 col-span-2 sm:col-span-4 lg:col-span-1">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-700 shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider block">Departments</span>
            <span className="text-lg font-bold text-gray-950 tracking-tight">{stats.deptsCount}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-card border border-surface-border shadow-card flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by name, employee code, or email..."
            className="w-full h-9 pl-9 pr-4 text-sm bg-gray-50/70 border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-950/5 focus:border-gray-950 transition-all"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Department */}
          <select
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 px-2.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-gray-950 focus:ring-2 focus:ring-gray-950/5 transition-all"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Branch Scoping & Filtering */}
          {isSupervisor ? (
            <div className="flex items-center gap-1.5 h-9 px-3 bg-purple-50 border border-purple-200 rounded-lg text-xs font-semibold text-purple-900 shadow-2xs">
              <Users className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span>{isManager ? "Managed Team Reports" : "Direct Reportees"}</span>
            </div>
          ) : isBranchAdmin ? (
            <div className="flex items-center gap-1.5 h-9 px-3 bg-blue-50 border border-blue-200 rounded-lg text-xs font-semibold text-blue-900 shadow-2xs">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>{currentBranch?.name || user?.branchName || "Assigned Branch"} (Your Branch)</span>
            </div>
          ) : isTenantAdmin ? (
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 px-2.5 text-xs bg-emerald-50/70 border border-emerald-300 rounded-lg text-emerald-950 font-medium focus:outline-none focus:border-emerald-600 transition-all max-w-[300px]"
              title="Filter workforce by Branch & Branch HR Admin"
            >
              <option value="ALL">🏢 All Branches & HR Admins (Consolidated View)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  📍 {b.name} — HR Admin: {b.hrAdminName ? `${b.hrAdminName} (${b.hrAdminEmail || ""})` : "Unassigned"}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 px-2.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-gray-950 focus:ring-2 focus:ring-gray-950/5 transition-all"
            >
              <option value="ALL">All Branches of Organization</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.city || ""})
                </option>
              ))}
            </select>
          )}

          {/* Status */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 px-2.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:border-gray-950 focus:ring-2 focus:ring-gray-950/5 transition-all"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PROBATION">Probation</option>
            <option value="NOTICE_PERIOD">Notice Period</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="h-9 px-2.5 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg flex items-center gap-1 transition-colors"
              title="Reset all filters"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Employees Table Card */}
      <div className="bg-white rounded-card border border-surface-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">ID</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Designation</th>
                <th className="py-3.5 px-4">Branch</th>
                <th className="py-3.5 px-4">Joining Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-gray-400 text-sm">
                    {isSupervisor ? (
                      <div className="max-w-md mx-auto space-y-2">
                        <Users className="w-8 h-8 text-purple-400 mx-auto" />
                        <p className="font-semibold text-gray-700">No reportees or team members found</p>
                        <p className="text-xs text-gray-500">
                          {isManager
                            ? "You are logged in as Manager. Only team leads and employees reporting under your hierarchy will appear here."
                            : "You are logged in as Team Lead. Only team members directly reporting to you will appear here."}
                        </p>
                      </div>
                    ) : (
                      "No employees matching the search and filter criteria."
                    )}
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => {
                  const dept = departments.find((d) => d.id === emp.departmentId);
                  const desig = designations.find((d) => d.id === emp.designationId);
                  const branch = branches.find((b) => b.id === emp.branchId);

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-gray-50/70 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/people/employees/${emp.id}`)}
                    >
                      {/* Name & Avatar */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={emp.avatar}
                            name={`${emp.firstName} ${emp.lastName}`}
                            size="sm"
                          />
                          <div>
                            <div className="font-semibold text-gray-950 group-hover:text-black transition-colors">
                              {emp.firstName} {emp.lastName}
                            </div>
                            <div className="text-xs text-gray-500">{emp.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-semibold text-gray-800 bg-gray-100/90 border border-gray-200/80 px-2 py-0.5 rounded-md inline-block">
                          {emp.employeeCode}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {dept?.name || "General"}
                      </td>

                      {/* Designation */}
                      <td className="py-3 px-4 text-gray-600 text-xs">
                        {desig?.title || "Staff Member"}
                      </td>

                      {/* Branch */}
                      <td className="py-3 px-4 text-gray-700 text-xs font-medium">
                        {branch ? (
                          <div className="flex flex-col">
                            <span className="text-gray-900 font-semibold">{branch.name}</span>
                            <span className="text-[11px] text-gray-500">{branch.city}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            🏢 Corporate HQ
                          </span>
                        )}
                      </td>

                      {/* Joining Date */}
                      <td className="py-3 px-4 text-xs text-gray-500">
                        {formatDate(emp.joiningDate)}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">{getStatusBadge(emp.status)}</td>

                      {/* Actions */}
                      <td
                        className="py-3 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/people/employees/${emp.id}`)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-950 hover:bg-gray-100 transition-colors"
                            title="View Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/time/attendance?emp=${emp.id}`)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                            title="View Attendance"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/leave/requests?emp=${emp.id}`)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                            title="View Leaves"
                          >
                            <CalendarCheck2 className="w-4 h-4" />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => setEmployeeToDelete(emp)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                              title="Delete Employee / Manager"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50/60 flex items-center justify-between text-xs text-gray-500">
          <div>
            Showing{" "}
            <span className="font-semibold text-gray-900">
              {filteredEmployees.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-gray-900">
              {Math.min(currentPage * pageSize, filteredEmployees.length)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-gray-900">
              {filteredEmployees.length}
            </span>{" "}
            employees
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
            >
              Prev
            </Button>

            <span className="px-2 font-semibold text-gray-900">
              {currentPage} / {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!employeeToDelete}
        onClose={() => setEmployeeToDelete(null)}
        onConfirm={async () => {
          if (employeeToDelete) {
            await deleteEmployee(employeeToDelete.employeeCode || employeeToDelete.id);
            setEmployeeToDelete(null);
          }
        }}
        title={`Delete Employee ${employeeToDelete?.firstName} ${employeeToDelete?.lastName}?`}
        description="Deleting this employee will remove them from active HR rosters, attendance, and payroll processing. This action cannot be undone."
        confirmText="Delete Employee"
        variant="danger"
      />
    </div>
  );
}

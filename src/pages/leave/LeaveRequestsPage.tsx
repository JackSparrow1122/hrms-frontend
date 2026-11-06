import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  CalendarCheck2,
  Plus,
  CheckCircle2,
  XCircle,
  Filter,
  Calendar,
  Search,
  Clock,
  RotateCcw,
  AlertCircle,
  Check,
  X,
  FileText,
  Loader2,
  RefreshCw,
  Building2,
  UserCheck,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useHrms } from "../../lib/hrmsContext";
import { useAuth } from "../../lib/authContext";
import { leaveApi, LeaveRequestItem } from "../../lib/api";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Avatar } from "../../components/ui/Avatar";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { formatDate } from "../../lib/utils";
import { useToast } from "../../lib/toastContext";

export interface LeaveRequestsPageProps {
  onOpenApplyLeave?: () => void;
}

interface UnifiedLeave {
  id: number | string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  companyId?: number;
  companyName?: string;
  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  fromDate: string;
  toDate: string;
  days: number;
  isHalfDay: boolean;
  halfDaySession?: string | null;
  reason: string;
  status: string;
  appliedDate: string;
  approverId?: number;
  approverName?: string;
  reviewedBy?: string;
  reviewerRemarks?: string;
  isBackend: boolean;
}


export function LeaveRequestsPage({ onOpenApplyLeave }: LeaveRequestsPageProps) {
  const {
    leaveRequests,
    leaveTypes,
    employees,
    departments,
    approveLeave,
    rejectLeave,
    activeCompanyId,
    company,
    allCompanies,
    switchActiveCompany,
  } = useHrms();
  const { user } = useAuth();
  const toast = useToast();

  const isEmployee = user?.role === "EMPLOYEE";
  const isSupervisor = user?.role === "MANAGER" || user?.role === "TEAM_LEAD";
  const isHrAdmin = user?.role === "HR_ADMIN";
  const isTenantAdmin = user?.role === "TENANT_ADMIN";
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  // Current logged in employee record
  const currentEmp = useMemo(() => {
    return employees.find(
      (e) =>
        e.id === user?.employeeId ||
        (user?.employeeCode && e.employeeCode?.toUpperCase() === user.employeeCode.toUpperCase()) ||
        (user?.email && e.email.toLowerCase() === user.email.toLowerCase())
    );
  }, [employees, user]);

  // Scope Tab:
  // For HR Admin: 'tl' (TL approvals), 'all' (All employees), 'my' (Personal)
  // For Manager / TL: 'team' (Team approvals), 'my' (Personal)
  // For Employee: 'my' (Personal)
  // For Tenant Admin: 'hr' (HR approvals), 'all' (All org), 'my' (Personal)
  const [scopeTab, setScopeTab] = useState<string>(() => {
    if (isSupervisor || isHrAdmin || isTenantAdmin) return "team";
    return "my";
  });

  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Backend data
  const [backendApprovals, setBackendApprovals] = useState<LeaveRequestItem[]>([]);
  const [backendMyLeaves, setBackendMyLeaves] = useState<LeaveRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Rejection modal state
  const [rejectingRequestId, setRejectingRequestId] = useState<string | number | null>(null);
  const [isRejectingBackend, setIsRejectingBackend] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const loadRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Load my personal leave requests
      const myItems = await leaveApi.getMyRequests().catch(() => []);
      if (myItems && Array.isArray(myItems)) {
        setBackendMyLeaves(myItems);
      }

      // 2. If supervisor, HR Admin or Tenant Admin, load approvals
      if (!isEmployee) {
        const approvals = await leaveApi.getApprovals("ALL", isSuperAdmin ? activeCompanyId : undefined).catch(() => []);
        if (approvals && Array.isArray(approvals)) {
          setBackendApprovals(approvals);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [isEmployee, isSuperAdmin, activeCompanyId]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Unified list of all requests mapped cleanly
  const allMappedRequests: UnifiedLeave[] = useMemo(() => {
    const rawList: LeaveRequestItem[] = [];
    const seenIds = new Set<string | number>();

    // Add backend approvals
    for (const item of backendApprovals) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        rawList.push(item);
      }
    }
    // Add backend personal leaves
    for (const item of backendMyLeaves) {
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        rawList.push(item);
      }
    }

    if (rawList.length > 0) {
      return rawList.map((b) => ({
        id: b.id,
        employeeId: String(b.employeeId),
        employeeCode: b.employeeCode || `EMP-${b.employeeId}`,
        employeeName: b.employeeName || "Employee",
        departmentName: b.departmentName || "General",
        companyId: b.companyId,
        companyName: b.companyName,
        leaveTypeId: String(b.leaveTypeId),
        leaveTypeCode: b.leaveTypeCode || "LV",
        leaveTypeName: b.leaveTypeName || "Leave",
        fromDate: b.startDate,
        toDate: b.endDate,
        days: Number(b.totalDays) || 1,
        isHalfDay: b.halfDay,
        halfDaySession: b.halfDaySession,
        reason: b.reason || "Personal Leave",
        status: b.status,
        appliedDate: b.createdAt ? b.createdAt.substring(0, 10) : "",
        approverId: b.approverId,
        approverName: b.approverName,
        reviewedBy: b.approverName,
        reviewerRemarks: b.reviewerRemarks,
        isBackend: true,
      }));
    }

    // Fallback to local context leaveRequests
    return leaveRequests.map((l) => {
      const emp = employees.find((e) => e.id === l.employeeId);
      const lt = leaveTypes.find((t) => t.id === l.leaveTypeId);
      return {
        id: l.id,
        employeeId: l.employeeId,
        employeeCode: emp?.employeeCode || l.employeeId,
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : "Employee",
        departmentName: (emp as any)?.department || "General",
        companyId: emp?.companyId ? Number(emp.companyId) : undefined,
        companyName: company?.name,
        leaveTypeId: l.leaveTypeId,
        leaveTypeCode: lt?.code || "LV",
        leaveTypeName: lt?.name || "Leave",
        fromDate: l.fromDate,
        toDate: l.toDate,
        days: l.days,
        isHalfDay: l.isHalfDay,
        halfDaySession: l.halfDaySession,
        reason: l.reason,
        status: l.status,
        appliedDate: l.appliedDate,
        approverId: (l as any).approverId,
        approverName: l.reviewedBy,
        reviewedBy: l.reviewedBy,
        reviewerRemarks: l.rejectionReason,
        isBackend: false,
      };
    });
  }, [backendApprovals, backendMyLeaves, leaveRequests, employees, leaveTypes, company]);

  // Scope Filtering according to user role and active scopeTab
  const scopedRequests = useMemo(() => {
    const currentId = currentEmp?.id ? String(currentEmp.id) : user?.employeeId;
    const currentCode = currentEmp?.employeeCode || user?.employeeCode || "";

    // 1. EMPLOYEE: strictly only own leaves
    if (isEmployee) {
      return allMappedRequests.filter(
        (r) =>
          (currentId && r.employeeId === currentId) ||
          (currentCode && r.employeeCode?.toUpperCase() === currentCode.toUpperCase())
      );
    }

    // 2. Personal leaves tab
    if (scopeTab === "my") {
      return allMappedRequests.filter(
        (r) =>
          (currentId && r.employeeId === currentId) ||
          (currentCode && r.employeeCode?.toUpperCase() === currentCode.toUpperCase())
      );
    }

    // 3. TEAM LEAD / MANAGER: team members only
    if (isSupervisor && scopeTab === "team") {
      return allMappedRequests.filter((r) => {
        const isOwn =
          (currentId && String(r.employeeId) === String(currentId)) ||
          (currentCode && r.employeeCode?.toUpperCase() === currentCode.toUpperCase());
        if (isOwn) return false;

        // Priority 1: Agar backend ne approverId diya hai aur wo current user hai
        if (currentId && r.approverId && String(r.approverId) === String(currentId)) {
          return true;
        }

        // Priority 2: Agar employee directory me managerId match karta hai
        const applicant = employees.find(
          (e) => String(e.id) === String(r.employeeId) || e.employeeCode === r.employeeCode
        );
        if (applicant && currentId) {
          const mgrId = (applicant as any).managerId ?? (applicant as any).manager_id;
          if (mgrId && String(mgrId) === String(currentId)) return true;
        }

        // Priority 3: Department fallback (Agar upar dono fail ho jayein)
        const applicantDept = applicant?.department ?? (applicant as any)?.departmentName;
        if (currentEmp?.department && applicantDept) {
          return String(applicantDept).toLowerCase() === String(currentEmp.department).toLowerCase();
        }

        // Agar backend se data aa raha hai lekin TL ka dept/manager match nahi mil raha, toh fallback me allow kardo
        // taaki UI blank na dikhe (kyunki backend already filtered data bhej raha hai getApprovals se)
        return true;
      });
    }

    // 4. HR ADMIN / TENANT ADMIN / SUPER ADMIN: Team approvals (All employees & TLs - "sab aayenge")
    if ((isHrAdmin || isTenantAdmin || isSuperAdmin) && (scopeTab === "team" || scopeTab === "all")) {
      return allMappedRequests.filter((r) => {
        // Exclude own requests from team approvals
        if (currentId && r.employeeId === currentId) return false;
        if (currentCode && r.employeeCode?.toUpperCase() === currentCode.toUpperCase()) return false;
        return true;
      });
    }

    // 5. Fallback organization-wide overview
    return allMappedRequests;
  }, [allMappedRequests, isEmployee, isSupervisor, isHrAdmin, isTenantAdmin, isSuperAdmin, scopeTab, currentEmp, user, employees]);

  // Filter by status, category, department and search keyword
  const filteredRequests = useMemo(() => {
    return scopedRequests.filter((req) => {
      const matchesStatus = selectedStatus === "ALL" || req.status === selectedStatus;
      const matchesType =
        selectedType === "ALL" ||
        req.leaveTypeId === selectedType ||
        req.leaveTypeCode === selectedType;
      const matchesDept =
        selectedDepartment === "ALL" ||
        req.departmentName?.toLowerCase() === selectedDepartment.toLowerCase();

      if (!matchesStatus || !matchesType || !matchesDept) return false;

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const fullName = (req.employeeName || "").toLowerCase();
      const empCode = (req.employeeCode || "").toLowerCase();
      const reason = (req.reason || "").toLowerCase();

      return fullName.includes(q) || empCode.includes(q) || reason.includes(q);
    });
  }, [scopedRequests, selectedStatus, selectedType, selectedDepartment, searchQuery]);

  // Counts for summary metrics
  const pendingCount = scopedRequests.filter((l) => l.status === "PENDING").length;
  const approvedCount = scopedRequests.filter((l) => l.status === "APPROVED").length;
  const rejectedCount = scopedRequests.filter((l) => l.status === "REJECTED").length;
  const totalApprovedDays = scopedRequests
    .filter((l) => l.status === "APPROVED")
    .reduce((sum, l) => sum + (l.days || 0), 0);

  // Approval actions
  const handleApprove = async (req: UnifiedLeave) => {
    try {
      if (req.isBackend) {
        await leaveApi.approveLeave(
          Number(req.id),
          `Approved by ${user?.fullName || user?.name || "Reviewer"}`
        );
      } else {
        approveLeave(String(req.id));
      }
      toast.success(`Leave request #${req.id} approved successfully!`);
      loadRequests();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve leave");
    }
  };

  const handleOpenReject = (id: string | number, isBackend: boolean) => {
    setRejectingRequestId(id);
    setIsRejectingBackend(isBackend);
    setRejectionReason("Operational exigencies require roster coverage.");
  };

  const handleConfirmReject = async () => {
    if (!rejectingRequestId) return;
    try {
      if (isRejectingBackend) {
        await leaveApi.rejectLeave(Number(rejectingRequestId), rejectionReason);
      } else {
        rejectLeave(String(rejectingRequestId), rejectionReason);
      }
      toast.success("Leave request rejected.");
      setRejectingRequestId(null);
      setRejectionReason("");
      loadRequests();
    } catch (err: any) {
      toast.error(err.message || "Failed to reject leave");
    }
  };

  const resetFilters = () => {
    setSelectedStatus("ALL");
    setSelectedType("ALL");
    setSelectedDepartment("ALL");
    setSearchQuery("");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-950 tracking-tight">
              {isEmployee ? "My Leave Applications" : "Leave Requests & Approvals"}
            </h1>
            <button
              onClick={loadRequests}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              title="Refresh Leave Requests"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {isEmployee
              ? "Track your submitted leave applications, statutory quota consumption, and manager sign-offs."
              : isSupervisor
                ? `Review team members' leave applications under ${currentEmp?.department || "your team"}, process approvals, and manage schedule coverage.`
                : isHrAdmin
                  ? "Approve Department Team Leads' leaves, inspect organization-wide leave registers, and monitor statutory compliance."
                  : "Enterprise multi-tier leave approval workflow and organization leave governance."}
          </p>
        </div>

        {onOpenApplyLeave && (
          <Button
            onClick={onOpenApplyLeave}
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Apply for Leave
          </Button>
        )}
      </div>

      {/* Role-Specific High-Level Scope Tabs (Hidden for pure ESS Employee) */}
      {!isEmployee && (
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
          {isSupervisor && (
            <>
              <button
                onClick={() => setScopeTab("my")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${scopeTab === "my"
                  ? "bg-gray-950 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-950 hover:bg-gray-100"
                  }`}
              >
                <CalendarCheck2 className="w-3.5 h-3.5" />
                <span>My Leaves</span>
              </button>
              <button
                onClick={() => setScopeTab("team")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${scopeTab === "team"
                  ? "bg-gray-950 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-950 hover:bg-gray-100"
                  }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Team Leaves</span>
              </button>
            </>
          )}

          {isHrAdmin && (
            <>
              <button
                onClick={() => setScopeTab("my")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${scopeTab === "my"
                  ? "bg-gray-950 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-950 hover:bg-gray-100"
                  }`}
              >
                <CalendarCheck2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>My Leaves</span>
              </button>
              <button
                onClick={() => setScopeTab("team")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${scopeTab === "team"
                  ? "bg-gray-950 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-950 hover:bg-gray-100"
                  }`}
              >
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                <span>Team Leaves (All Employees & TLs)</span>
              </button>
            </>
          )}

          {isTenantAdmin && (
            <>
              <button
                onClick={() => setScopeTab("my")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${scopeTab === "my"
                  ? "bg-gray-950 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-950 hover:bg-gray-100"
                  }`}
              >
                <CalendarCheck2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>My Leaves</span>
              </button>
              <button
                onClick={() => setScopeTab("team")}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${scopeTab === "team"
                  ? "bg-gray-950 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-950 hover:bg-gray-100"
                  }`}
              >
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                <span>Team Leaves (All Organization)</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Summary Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setSelectedStatus("PENDING")}
          className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${selectedStatus === "PENDING"
            ? "bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/10"
            : "bg-white border-gray-200/80 hover:border-gray-300"
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">
              {isEmployee ? "Pending Review" : "Action Req. (Pending)"}
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-950">{pendingCount}</span>
            {pendingCount > 0 && (
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/70 px-1.5 py-0.5 rounded">
                Action Req.
              </span>
            )}
          </div>
        </div>

        <div
          onClick={() => setSelectedStatus("APPROVED")}
          className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${selectedStatus === "APPROVED"
            ? "bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/10"
            : "bg-white border-gray-200/80 hover:border-gray-300"
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Approved Leaves</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-950">{approvedCount}</span>
            <span className="text-[11px] text-gray-500">granted</span>
          </div>
        </div>

        <div
          onClick={() => setSelectedStatus("REJECTED")}
          className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${selectedStatus === "REJECTED"
            ? "bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/10"
            : "bg-white border-gray-200/80 hover:border-gray-300"
            }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Declined Requests</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-950">{rejectedCount}</span>
            <span className="text-[11px] text-gray-500">declined</span>
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl border bg-white border-gray-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Total Approved Days</span>
            <CalendarCheck2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-950">{totalApprovedDays}</span>
            <span className="text-[11px] text-gray-500">working days</span>
          </div>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status Tab Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {[
              { id: "ALL", label: "All Requests", count: scopedRequests.length },
              { id: "PENDING", label: "Pending Review", count: pendingCount },
              { id: "APPROVED", label: "Approved", count: approvedCount },
              { id: "REJECTED", label: "Rejected", count: rejectedCount },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${selectedStatus === tab.id
                  ? "bg-gray-950 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-950 hover:bg-gray-100"
                  }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedStatus === tab.id
                    ? "bg-gray-800 text-gray-200"
                    : "bg-gray-100 text-gray-600"
                    }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search, Leave Type & Department Dropdown */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {!isEmployee && (
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search employee or reason..."
                  className="w-full h-9 pl-9 pr-3 text-xs bg-gray-50/70 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:border-gray-950 focus:ring-2 focus:ring-gray-950/5 transition-all"
                />
              </div>
            )}

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="h-9 px-3 text-xs bg-gray-50/70 border border-gray-200 rounded-lg text-gray-800 focus:bg-white focus:outline-none focus:border-gray-950 focus:ring-2 focus:ring-gray-950/5 transition-all"
            >
              <option value="ALL">All Leave Categories</option>
              {leaveTypes.map((t) => (
                <option key={t.id} value={t.code || t.id}>
                  {t.name} ({t.code})
                </option>
              ))}
            </select>

            {/* Department Filter for HR Admin and Tenant Admin */}
            {(isHrAdmin || isTenantAdmin) && scopeTab === "all" && (
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="h-9 px-3 text-xs bg-gray-50/70 border border-gray-200 rounded-lg text-gray-800 focus:bg-white focus:outline-none focus:border-gray-950 focus:ring-2 focus:ring-gray-950/5 transition-all"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}

            {(selectedStatus !== "ALL" || selectedType !== "ALL" || selectedDepartment !== "ALL" || searchQuery) && (
              <button
                onClick={resetFilters}
                className="h-9 px-2.5 text-xs text-gray-500 hover:text-gray-950 hover:bg-gray-100 rounded-lg flex items-center gap-1 transition-colors"
                title="Reset filters"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                {!isEmployee && <th className="py-3.5 px-4">Employee</th>}
                <th className="py-3.5 px-4">Leave Category</th>
                <th className="py-3.5 px-4">Dates</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Reason / Purpose</th>
                <th className="py-3.5 px-4">Applied Date</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">
                  {isEmployee || scopeTab === "my" ? "Approver & Decision" : "Approval Actions"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={isEmployee ? 7 : 8} className="py-16 text-center">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2 text-gray-400">
                      <CalendarCheck2 className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900">No Leave Applications Found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      No leave applications match the selected status or filter.
                    </p>
                    {(selectedStatus !== "ALL" || selectedType !== "ALL" || selectedDepartment !== "ALL" || searchQuery) && (
                      <button
                        onClick={resetFilters}
                        className="mt-3 text-xs text-indigo-600 hover:underline font-medium"
                      >
                        Clear active filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const emp = employees.find(
                    (e) => e.id === req.employeeId || e.employeeCode === req.employeeCode
                  );
                  const lt = leaveTypes.find(
                    (t) => t.id === req.leaveTypeId || t.code?.toUpperCase() === req.leaveTypeCode?.toUpperCase()
                  );

                  const isOwnRequest =
                    req.employeeId === currentEmp?.id ||
                    req.employeeCode === currentEmp?.employeeCode ||
                    req.employeeId === user?.employeeId;

                  // Can current user approve this request?
                  // Employee: NEVER
                  // TL: Can approve team members' requests (isOwnRequest === false)
                  // HR Admin: Can approve TL requests and any employee requests (isOwnRequest === false)
                  // Tenant Admin: Can approve HR Admin and other requests (isOwnRequest === false)
                  const canAct = !isEmployee && !isOwnRequest && (scopeTab !== "my");

                  return (
                    <tr key={req.id} className="hover:bg-gray-50/70 transition-colors">
                      {!isEmployee && (
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar
                              src={emp?.avatar}
                              name={req.employeeName || `${emp?.firstName} ${emp?.lastName}`}
                              size="xs"
                            />
                            <div>
                              <span className="font-semibold text-gray-950 block text-xs">
                                {req.employeeName}
                                {isOwnRequest && (
                                  <span className="ml-1.5 text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded font-normal">
                                    You
                                  </span>
                                )}
                              </span>
                              <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                <span className="font-mono">{req.employeeCode}</span>
                                {req.departmentName && (
                                  <>
                                    <span>•</span>
                                    <span className="text-gray-400">{req.departmentName}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      )}

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: lt?.color || "#4F46E5" }}
                          />
                          <span className="text-xs font-medium text-gray-900">
                            {req.leaveTypeName || lt?.name || "Leave"}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-xs font-medium text-gray-900">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <span>{formatDate(req.fromDate)}</span>
                          {req.fromDate !== req.toDate && (
                            <>
                              <span className="text-gray-400">→</span>
                              <span>{formatDate(req.toDate)}</span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-bold text-xs text-gray-950 bg-gray-100 px-2 py-0.5 rounded">
                          {req.days} {req.days === 1 ? "Day" : "Days"}
                          {req.isHalfDay && (
                            <span className="text-[10px] font-normal text-gray-600">(Half)</span>
                          )}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-xs text-gray-600 max-w-xs truncate" title={req.reason}>
                        {req.reason}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-gray-500 whitespace-nowrap">
                        {req.appliedDate ? formatDate(req.appliedDate) : "—"}
                      </td>

                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            req.status === "APPROVED"
                              ? "success"
                              : req.status === "REJECTED"
                                ? "danger"
                                : "warning"
                          }
                          size="sm"
                          dot
                        >
                          {req.status === "PENDING"
                            ? "Pending Review"
                            : req.status === "APPROVED"
                              ? "Approved"
                              : "Rejected"}
                        </Badge>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        {req.status === "PENDING" && canAct ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              onClick={() => handleApprove(req)}
                              variant="success"
                              size="sm"
                              className="h-7 text-xs px-2.5 font-medium shadow-none"
                              leftIcon={<Check className="w-3.5 h-3.5" />}
                            >
                              Approve
                            </Button>
                            <Button
                              onClick={() => handleOpenReject(req.id, req.isBackend)}
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2 text-rose-600 border-rose-200 hover:bg-rose-50"
                              leftIcon={<X className="w-3.5 h-3.5" />}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <div className="text-right">
                            <span className="text-xs text-gray-600 font-medium block">
                              {req.status === "PENDING"
                                ? req.approverName
                                  ? `Awaiting ${req.approverName}`
                                  : "Pending Review"
                                : req.reviewedBy
                                  ? `By ${req.reviewedBy}`
                                  : "Completed"}
                            </span>
                            {req.reviewerRemarks && (
                              <span
                                className="text-[10px] text-gray-400 max-w-[150px] truncate block ml-auto mt-0.5"
                                title={req.reviewerRemarks}
                              >
                                {req.reviewerRemarks}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reject Leave Modal */}
      {rejectingRequestId && (
        <Modal
          isOpen={true}
          onClose={() => setRejectingRequestId(null)}
          title="Decline Leave Application"
          description="Provide a formal justification for declining this employee leave request."
        >
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <span className="font-semibold">Note:</span> Declining this leave will automatically restore the deducted statutory quota back to the employee's remaining leave balance.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700">Rejection Reason</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-gray-950"
                placeholder="State the reason for declining (e.g. Critical project sprint milestone coverage required)..."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectingRequestId(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmReject}
                disabled={!rejectionReason.trim()}
              >
                Confirm Decline
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

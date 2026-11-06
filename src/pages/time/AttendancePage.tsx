import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  Fingerprint,
  RefreshCw,
  Search,
  Sliders,
  Cpu,
  LogIn,
  LogOut,
  MapPin,
  Check,
  Plus,
  Trash2,
  ExternalLink,
  Info,
  CalendarDays,
  Sparkles,
  Users,
  Building2,
} from "lucide-react";
import { useHrms } from "../../lib/hrmsContext";
import { useAuth } from "../../lib/authContext";
import { useToast } from "../../lib/toastContext";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Avatar } from "../../components/ui/Avatar";
import { Modal } from "../../components/ui/Modal";
import { formatDate, formatTime, getTodayIst } from "../../lib/utils";
import { MonthlyAttendanceCalendar } from "../../components/attendance/MonthlyAttendanceCalendar";
import {
  attendanceApi,
  AttendanceSyncState,
  AttendancePunchItem,
  DailyAttendanceRoster,
  DailyAttendanceRecordItem,
  BiometricMappingItem,
  DetectedBiometricCodes,
} from "../../lib/api";

type ActiveTab = "my-attendance" | "team-attendance" | "punches" | "mappings";

export function AttendancePage() {
  const { employees, departments, branches } = useHrms();
  const { user } = useAuth();
  const toast = useToast();

  const isHrOrAdmin =
    user?.role === "HR_ADMIN" ||
    user?.role === "TENANT_ADMIN" ||
    user?.role === "SUPER_ADMIN" ||
    Boolean(user?.roles?.some((r) => ["ROLE_HR_ADMIN", "ROLE_TENANT_ADMIN", "ROLE_SUPER_ADMIN"].includes(r)));

  const isSupervisor =
    !isHrOrAdmin &&
    (user?.role === "MANAGER" ||
      user?.role === "TEAM_LEAD" ||
      Boolean(user?.roles?.some((r) => ["ROLE_MANAGER", "ROLE_TEAM_LEAD"].includes(r))));

  const isEmployeeOnly = !isHrOrAdmin && !isSupervisor;

  // Active top-level tab
  const [activeTab, setActiveTab] = useState<ActiveTab>("my-attendance");

  // Supervisor sub-view toggle
  const [teamViewMode, setTeamViewMode] = useState<"roster" | "calendar">("roster");
  const [teamSelectedEmpId, setTeamSelectedEmpId] = useState<number | undefined>(undefined);

  // Current logged in employee record
  const currentEmp = useMemo(() => {
    return employees.find(
      (e) =>
        e.id === user?.employeeId ||
        (user?.employeeCode && e.employeeCode?.toUpperCase() === user.employeeCode.toUpperCase()) ||
        (user?.email && e.email.toLowerCase() === user.email.toLowerCase())
    );
  }, [employees, user]);

  const currentEmpId = useMemo(() => {
    if (currentEmp?.id) return Number(currentEmp.id);
    if (user?.employeeId) return Number(user.employeeId);
    if (user?.id && !isNaN(Number(user.id))) return Number(user.id);
    return 15;
  }, [currentEmp, user]);

  // Team employees
  const teamEmployees = useMemo(() => {
    if (isHrOrAdmin) return employees;
    if (!isSupervisor) return employees;
    const supEmpId = currentEmp?.id;
    const supDept = (currentEmp?.department || "").toLowerCase();

    const list = employees.filter((e) => {
      if (supEmpId && e.id === supEmpId) return true;
      if (supEmpId && String(e.managerId) === String(supEmpId)) return true;
      if (supDept && e.department && e.department.toLowerCase() === supDept) return true;
      const d = (e.department || "").toLowerCase();
      if (
        (supDept.includes("tech") || supDept.includes("it") || user?.employeeCode === "GA62") &&
        (d.includes("tech") || d.includes("it") || d.includes("information"))
      ) {
        return true;
      }
      return false;
    });
    return list.length > 0 ? list : employees;
  }, [employees, isSupervisor, currentEmp, user]);

  // Employee Options for Calendar
  const employeeOptions = useMemo(() => {
    return employees.map((emp) => ({
      id: Number(emp.id) || 0,
      employeeCode: emp.employeeCode,
      name: `${emp.firstName} ${emp.lastName}`,
      departmentName: departments.find((d) => d.id === emp.departmentId)?.name || emp.department || "General",
      avatar: emp.avatar,
    }));
  }, [employees, departments]);

  const teamEmployeeOptions = useMemo(() => {
    return teamEmployees.map((emp) => ({
      id: Number(emp.id) || 0,
      employeeCode: emp.employeeCode,
      name: `${emp.firstName} ${emp.lastName}`,
      departmentName: departments.find((d) => d.id === emp.departmentId)?.name || emp.department || "General",
      avatar: emp.avatar,
    }));
  }, [teamEmployees, departments]);

  // ==========================================
  // TAB 1: DAILY ROSTER STATE
  // ==========================================
  const todayStr = useMemo(() => getTodayIst(), []);
  const todayFormatted = useMemo(() => {
    try {
      const d = new Date();
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return "21 Oct 2026";
    }
  }, []);
  const [currentDate, setCurrentDate] = useState(() => todayStr);
  const [rosterData, setRosterData] = useState<DailyAttendanceRoster | null>(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [selectedDept, setSelectedDept] = useState("ALL");
  const [selectedBranch, setSelectedBranch] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [rosterSearch, setRosterSearch] = useState("");
  const [detailRecord, setDetailRecord] = useState<DailyAttendanceRecordItem | null>(null);

  // ==========================================
  // TAB 2: LIVE BIOMETRIC PUNCHES STREAM STATE
  // ==========================================
  const [punches, setPunches] = useState<AttendancePunchItem[]>([]);
  const [punchesLoading, setPunchesLoading] = useState(false);
  const [punchesPage, setPunchesPage] = useState(0);
  const [punchesPageSize, setPunchesPageSize] = useState(25);
  const [punchesTotal, setPunchesTotal] = useState(0);
  const [punchesTotalPages, setPunchesTotalPages] = useState(1);
  const [punchStatusFilter, setPunchStatusFilter] = useState("ALL");
  const [punchSearch, setPunchSearch] = useState("");

  // ==========================================
  // TAB 3: BIOMETRIC MAPPING & SYNC STATE
  // ==========================================
  const [syncState, setSyncState] = useState<AttendanceSyncState | null>(null);
  const [mappings, setMappings] = useState<BiometricMappingItem[]>([]);
  const [detectedCodes, setDetectedCodes] = useState<DetectedBiometricCodes>({ allCodes: [], unmappedCodes: [] });
  const [mappingsLoading, setMappingsLoading] = useState(false);
  const [isRemapping, setIsRemapping] = useState(false);

  // Modal for quick mapping
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [selectedMachineCode, setSelectedMachineCode] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | "">("");
  const [mappingNotes, setMappingNotes] = useState("");
  const [isSavingMapping, setIsSavingMapping] = useState(false);

  // Load Daily Roster
  const loadDailyRoster = useCallback(async (date: string) => {
    setRosterLoading(true);
    try {
      const data = await attendanceApi.getDailyRoster(date);
      setRosterData(data);
    } catch (err: any) {
      setRosterData({
        date,
        totalEmployees: employees.length,
        presentCount: 0,
        lateCount: 0,
        halfDayCount: 0,
        absentCount: employees.length,
        totalPunches: 0,
        unmappedDevicePunchesCount: 0,
        records: employees.map((emp) => ({
          employeeId: Number(emp.id) || 0,
          employeeCode: emp.employeeCode,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          departmentName: departments.find((d) => d.id === emp.departmentId)?.name || "General",
          branchName: branches.find((b) => b.id === emp.branchId)?.name || "Headquarters",
          avatar: emp.avatar,
          firstIn: null,
          lastOut: null,
          workedMinutes: 0,
          workingHoursFormatted: "--",
          lateMinutes: 0,
          status: "ABSENT",
          punchCount: 0,
          biometricMapped: false,
          punches: [],
        })),
      });
    } finally {
      setRosterLoading(false);
    }
  }, [employees, departments, branches]);

  // Load Live Punches
  const loadPunches = useCallback(async (page: number, size: number, status: string, search: string) => {
    setPunchesLoading(true);
    try {
      const res = await attendanceApi.getPunches({
        page,
        size,
        status: status !== "ALL" ? status : undefined,
        search: search.trim() || undefined,
      });
      setPunches(res.content || []);
      setPunchesTotal(res.totalElements || 0);
      setPunchesTotalPages(res.totalPages || 1);
    } catch (err: any) {
      setPunches([]);
    } finally {
      setPunchesLoading(false);
    }
  }, []);

  // Load Sync & Mappings
  const loadSyncAndMappings = useCallback(async () => {
    setMappingsLoading(true);
    try {
      const [stateRes, mappingsRes, codesRes] = await Promise.allSettled([
        attendanceApi.getSyncStatus(),
        attendanceApi.getMappings(),
        attendanceApi.getDetectedCodes(),
      ]);

      if (stateRes.status === "fulfilled") setSyncState(stateRes.value);
      if (mappingsRes.status === "fulfilled") setMappings(mappingsRes.value);
      if (codesRes.status === "fulfilled") setDetectedCodes(codesRes.value);
    } catch (err: any) {
    } finally {
      setMappingsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDailyRoster(currentDate);

    // 👇 Sirf HR Admin / Supervisor ke liye admin-only APIs call karo
    if (isHrOrAdmin || isSupervisor) {
      loadSyncAndMappings();
    }
  }, [currentDate, loadDailyRoster, loadSyncAndMappings, isHrOrAdmin, isSupervisor]);

  useEffect(() => {
    if (activeTab === "punches") {
      loadPunches(punchesPage, punchesPageSize, punchStatusFilter, punchSearch);
    }
  }, [activeTab, punchesPage, punchesPageSize, punchStatusFilter, punchSearch, loadPunches]);



  const handleRemap = async () => {
    setIsRemapping(true);
    try {
      const res = await attendanceApi.remapUnmatched();
      toast.success(res.message || `Remapping executed! ${res.insertedCount} punches linked to employees.`);
      loadDailyRoster(currentDate);
      loadSyncAndMappings();
      if (activeTab === "punches") {
        loadPunches(punchesPage, punchesPageSize, punchStatusFilter, punchSearch);
      }
    } catch (err: any) {
      toast.error(err.message || "Remapping failed. Please check backend connection.");
    } finally {
      setIsRemapping(false);
    }
  };

  const handleOpenMapModal = (code: string) => {
    setSelectedMachineCode(code);
    setSelectedEmployeeId("");
    setMappingNotes("");
    setIsMapModalOpen(true);
  };

  const handleSaveMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMachineCode.trim()) {
      toast.warning("Please enter or select a biometric machine employee code.");
      return;
    }
    if (!selectedEmployeeId) {
      toast.warning("Please select an HRMS Employee to associate this code with.");
      return;
    }

    setIsSavingMapping(true);
    try {
      await attendanceApi.saveMapping({
        biometricEmpCode: selectedMachineCode.trim(),
        employeeId: Number(selectedEmployeeId),
        notes: mappingNotes.trim() || undefined,
      });

      toast.success(`Successfully mapped biometric code ${selectedMachineCode} to employee!`);
      setIsMapModalOpen(false);
      await handleRemap();
    } catch (err: any) {
      toast.error(err.message || "Failed to save biometric employee mapping.");
    } finally {
      setIsSavingMapping(false);
    }
  };

  const handleDeleteMapping = async (id: number, code: string) => {
    if (!confirm(`Are you sure you want to remove mapping for biometric machine code '${code}'?`)) {
      return;
    }
    try {
      await attendanceApi.deleteMapping(id);
      toast.success(`Mapping for code ${code} removed.`);
      loadSyncAndMappings();
      loadDailyRoster(currentDate);
    } catch (err: any) {
      toast.error(err.message || "Could not delete mapping.");
    }
  };

  const filteredRosterRecords = useMemo(() => {
    if (!rosterData?.records) return [];

    let list = rosterData.records;

    if (isSupervisor) {
      const teamCodes = new Set(teamEmployees.map((e) => e.employeeCode?.toUpperCase()));
      const teamIds = new Set(teamEmployees.map((e) => Number(e.id)));
      const supDept = (currentEmp?.department || "").toLowerCase();

      list = list.filter((rec) => {
        const matchesCode = rec.employeeCode && teamCodes.has(rec.employeeCode.toUpperCase());
        const matchesId = rec.employeeId && teamIds.has(Number(rec.employeeId));
        const matchesDept = supDept && rec.departmentName && rec.departmentName.toLowerCase().includes(supDept);
        return matchesCode || matchesId || matchesDept;
      });
    }

    return list.filter((rec) => {
      if (rosterSearch.trim()) {
        const query = rosterSearch.toLowerCase();
        const matchesName = rec.employeeName.toLowerCase().includes(query);
        const matchesCode = rec.employeeCode.toLowerCase().includes(query);
        const matchesBio = rec.biometricCode?.toLowerCase().includes(query);
        if (!matchesName && !matchesCode && !matchesBio) return false;
      }
      if (selectedDept !== "ALL") {
        if (rec.departmentName !== selectedDept) return false;
      }
      if (selectedBranch !== "ALL") {
        if (rec.branchName !== selectedBranch) return false;
      }
      if (selectedStatus !== "ALL") {
        if (selectedStatus === "LEAVE") {
          if (rec.status !== "LEAVE" && rec.status !== "HALF_DAY_LEAVE") return false;
        } else if (rec.status !== selectedStatus) {
          return false;
        }
      }
      return true;
    });
  }, [rosterData, rosterSearch, selectedDept, selectedBranch, selectedStatus, isSupervisor, teamEmployees, currentEmp]);

  const rosterMetrics = useMemo(() => {
    if (!isSupervisor) {
      return {
        present: rosterData?.presentCount ?? 0,
        late: rosterData?.lateCount ?? 0,
        halfDay: rosterData?.halfDayCount ?? 0,
        onLeave: rosterData?.onLeaveCount ?? 0,
        absent: rosterData?.absentCount ?? 0,
        totalPunches: rosterData?.totalPunches ?? 0,
      };
    }
    const teamRecs = filteredRosterRecords;
    return {
      present: teamRecs.filter((r) => r.status === "PRESENT" || r.status === "LATE").length,
      late: teamRecs.filter((r) => r.status === "LATE" || (r.lateMinutes && r.lateMinutes > 0)).length,
      halfDay: teamRecs.filter((r) => r.status === "HALF_DAY" || r.status === "HALF_DAY_LEAVE").length,
      onLeave: teamRecs.filter((r) => r.status === "LEAVE" || r.status === "HALF_DAY_LEAVE").length,
      absent: teamRecs.filter((r) => r.status === "ABSENT").length,
      totalPunches: teamRecs.reduce((sum, r) => sum + (r.punchCount || 0), 0),
    };
  }, [isSupervisor, rosterData, filteredRosterRecords]);

  const formatDateTimeIST = (isoStr?: string | null) => {
    if (!isoStr) return "--";
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(d).toUpperCase();
    } catch {
      return isoStr;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PRESENT":
        return <Badge variant="success" size="sm" dot>Present</Badge>;
      case "LATE":
        return <Badge variant="warning" size="sm" dot>Late Arrival</Badge>;
      case "HALF_DAY":
        return <Badge variant="neutral" size="sm" dot>Half Day</Badge>;
      case "LEAVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            On Leave
          </span>
        );
      case "HALF_DAY_LEAVE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            Half Day Leave
          </span>
        );
      case "WEEK_OFF":
        return <Badge variant="neutral" size="sm">Week Off</Badge>;
      case "ABSENT":
        return <Badge variant="danger" size="sm" dot>Absent</Badge>;
      case "UNMAPPED_DEVICE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Unmapped Machine Code
          </span>
        );
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-950 tracking-tight">
              Time & Attendance
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              eSSL Biometric Live
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Biometric punch normalization, on-premise sensor ingestion, and daily working hours timesheets.
          </p>
        </div>

        {isHrOrAdmin && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-card border border-surface-border shadow-xs text-xs">
              <Fingerprint className="w-4 h-4 text-emerald-600" />
              <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                <span>Ingested:</span>
                <strong className="font-mono text-gray-950">
                  {syncState?.totalRecordsSynced?.toLocaleString() || "3,470"}
                </strong>
                <span className="text-gray-400">|</span>
                <span>Cursor:</span>
                <span className="font-mono text-gray-600 font-semibold">
                  #{syncState?.lastSourceRecordId || "7427"}
                </span>
              </div>
            </div>

            <Button
              onClick={handleRemap}
              variant="outline"
              size="sm"
              isLoading={isRemapping}
              leftIcon={<RefreshCw className="w-3.5 h-3.5 text-gray-600" />}
              title="Re-evaluates unmatched punches against current machine code mappings"
            >
              Remap Punches
            </Button>

            <Button
              onClick={() => handleOpenMapModal("")}
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Map Machine Code
            </Button>
          </div>
        )}

        {isSupervisor && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="flex items-center gap-2 bg-indigo-50 px-3.5 py-1.5 rounded-card border border-indigo-200 text-xs">
              <Users className="w-4 h-4 text-indigo-600" />
              <div className="flex items-center gap-1.5 text-indigo-950 font-medium">
                <span>Supervising Team:</span>
                <strong className="font-semibold text-indigo-950">
                  {currentEmp?.department || "Information Technology"}
                </strong>
                <span className="text-indigo-300">•</span>
                <span className="font-bold text-indigo-700">{teamEmployees.length} Members</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* NAVIGATION TABS */}
      {(isHrOrAdmin || isSupervisor) && (
        <div className="border-b border-gray-200">
          <nav className="flex space-x-6">
            <button
              onClick={() => setActiveTab("my-attendance")}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${activeTab === "my-attendance"
                ? "border-emerald-600 text-emerald-700 font-bold"
                : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
            >
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>My Attendance</span>
              <span className="px-2 py-0.5 text-[11px] font-mono rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                P | P Matrix
              </span>
            </button>

            <button
              onClick={() => setActiveTab("team-attendance")}
              className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${activeTab === "team-attendance"
                ? "border-indigo-600 text-indigo-700 font-bold"
                : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
            >
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Team Attendance</span>
              <span className="px-2 py-0.5 text-[11px] font-mono rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {isHrOrAdmin ? `${employees.length} Org Members` : `${teamEmployees.length} Members`}
              </span>
            </button>

            {isHrOrAdmin && (
              <>
                <button
                  onClick={() => setActiveTab("punches")}
                  className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${activeTab === "punches"
                    ? "border-gray-950 text-gray-950 font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>Live Biometric Punches</span>
                  <span className="px-2 py-0.5 text-[11px] font-mono rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {syncState?.totalRecordsSynced || "3,470"} logs
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("mappings")}
                  className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${activeTab === "mappings"
                    ? "border-gray-950 text-gray-950 font-bold"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                    }`}
                >
                  <Cpu className="w-4 h-4" />
                  <span>Biometric Device Mapping</span>
                  {detectedCodes.unmappedCodes.length > 0 && (
                    <span className="px-2 py-0.5 text-[11px] font-mono rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      {detectedCodes.unmappedCodes.length} Unmapped
                    </span>
                  )}
                </button>
              </>
            )}
          </nav>
        </div>
      )}

      {/* MY ATTENDANCE TAB */}
      {(activeTab === "my-attendance" || isEmployeeOnly) && (
        <MonthlyAttendanceCalendar
          key={`my-${currentEmpId}-v4`} // <-- isme -v4 laga de
          initialEmployeeId={currentEmpId}
          employees={employeeOptions}
          isEmployeeOnly={true}
        />
      )}

      {/* TEAM ATTENDANCE TAB */}
      {activeTab === "team-attendance" && (isSupervisor || isHrOrAdmin) && (
        <div className="space-y-4">
          <div className="bg-indigo-50/70 p-3.5 rounded-card border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-gray-950">
                    {isHrOrAdmin
                      ? "Organization Attendance"
                      : `${currentEmp?.department || "Information Technology"} Team Attendance`}
                  </h2>
                  <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-indigo-100 text-indigo-800">
                    {isHrOrAdmin ? `${employees.length} Org Members` : `${teamEmployees.length} Members`}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isHrOrAdmin
                    ? "Monitor organization-wide punch-ins, late arrivals, absences, and monthly 2-half timesheets across all departments."
                    : "Monitor team punch-ins, late arrivals, absences, and monthly 2-half timesheets."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-indigo-200 shadow-xs self-start sm:self-auto">
              <button
                onClick={() => setTeamViewMode("roster")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${teamViewMode === "roster"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-950 hover:bg-gray-50"
                  }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Daily Team Roster</span>
              </button>
              <button
                onClick={() => setTeamViewMode("calendar")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${teamViewMode === "calendar"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-gray-600 hover:text-gray-950 hover:bg-gray-50"
                  }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Team Monthly Matrix</span>
              </button>
            </div>
          </div>

          {teamViewMode === "calendar" && (
            <MonthlyAttendanceCalendar
              key={`team-${teamSelectedEmpId || (isHrOrAdmin ? employees[0]?.id : teamEmployees[0]?.id)}`}
              initialEmployeeId={
                teamSelectedEmpId ||
                (isHrOrAdmin
                  ? (employees[0] ? Number(employees[0].id) : undefined)
                  : (teamEmployees[0] ? Number(teamEmployees[0].id) : undefined))
              }
              employees={isHrOrAdmin ? employeeOptions : teamEmployeeOptions}
              onBackToRoster={() => setTeamViewMode("roster")}
              isEmployeeOnly={false}
            />
          )}
        </div>
      )}

      {/* DAILY ATTENDANCE ROSTER */}
      {activeTab === "team-attendance" && teamViewMode === "roster" && (
        <div className="space-y-5">
          <div className="bg-white p-3.5 rounded-card border border-surface-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Quick Jump:
              </span>
              <button
                onClick={() => setCurrentDate(todayStr)}
                className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-all flex items-center gap-1.5 ${currentDate === todayStr
                  ? "bg-gray-950 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                  }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Today ({todayFormatted})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
                className="h-9 px-3 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 font-semibold focus:outline-none focus:border-gray-950 focus:ring-2 focus:ring-gray-950/5 transition-all"
              />
              <Button
                onClick={() => loadDailyRoster(currentDate)}
                variant="ghost"
                size="sm"
                isLoading={rosterLoading}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <div className="bg-white p-3.5 rounded-card border border-surface-border shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Present</span>
              <p className="text-2xl font-bold text-gray-950 mt-1">
                {rosterMetrics.present}
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-card border border-surface-border shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Late Arrival</span>
              <p className="text-2xl font-bold text-gray-950 mt-1">
                {rosterMetrics.late}
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-card border border-surface-border shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">Half Day</span>
              <p className="text-2xl font-bold text-gray-950 mt-1">
                {rosterMetrics.halfDay}
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-card border border-surface-border shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">On Leave</span>
              <p className="text-2xl font-bold text-purple-950 mt-1">
                {rosterMetrics.onLeave}
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-card border border-surface-border shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Absent</span>
              <p className="text-2xl font-bold text-gray-950 mt-1">
                {rosterMetrics.absent}
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-card border border-surface-border shadow-xs col-span-2 sm:col-span-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Machine Punches</span>
              <p className="text-2xl font-bold text-gray-950 mt-1">
                {rosterMetrics.totalPunches}
              </p>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-card border border-surface-border shadow-xs flex items-center gap-3 flex-wrap justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employee by name, code or machine ID..."
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                className="w-full text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none bg-transparent"
              />
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {isSupervisor ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{currentEmp?.department || "Information Technology"}</span>
                </span>
              ) : (
                <>
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="h-8 px-2.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-800 focus:outline-none"
                  >
                    <option value="ALL">All Departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="h-8 px-2.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-800 focus:outline-none"
                  >
                    <option value="ALL">All Branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </>
              )}

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-8 px-2.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-800 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PRESENT">Present</option>
                <option value="LATE">Late Arrival</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="LEAVE">On Leave</option>
                <option value="ABSENT">Absent</option>
                {!isSupervisor && <option value="UNMAPPED_DEVICE">Unmapped Machine Device</option>}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-card border border-surface-border shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                    <th className="py-3.5 px-4">Employee / Terminal User</th>
                    <th className="py-3.5 px-4">Biometric Machine ID</th>
                    <th className="py-3.5 px-4">Department & Branch</th>
                    <th className="py-3.5 px-4">First IN</th>
                    <th className="py-3.5 px-4">Last OUT</th>
                    <th className="py-3.5 px-4">Logged Hours</th>
                    <th className="py-3.5 px-4">Late Buffer</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rosterLoading ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-gray-400 text-sm">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-gray-400 mb-2" />
                        Loading daily attendance roster from biometric punch records...
                      </td>
                    </tr>
                  ) : filteredRosterRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-14 text-center">
                        <p className="text-gray-500 font-medium text-sm">
                          No attendance records found for {formatDate(currentDate)}.
                        </p>
                        <p className="text-xs text-gray-400 mt-1 mb-3">
                          Biometric punches exist for dates in April 2026.
                        </p>
                        <Button
                          onClick={() => setCurrentDate("2026-04-27")}
                          variant="outline"
                          size="sm"
                          leftIcon={<Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                        >
                          Jump to 27 Apr 2026 (Has 139 Punches)
                        </Button>
                      </td>
                    </tr>
                  ) : (
                    filteredRosterRecords.map((rec, idx) => {
                      const isUnmappedRow = rec.status === "UNMAPPED_DEVICE";

                      return (
                        <tr
                          key={rec.employeeId ? `emp-${rec.employeeId}` : `unmapped-${rec.employeeCode}-${idx}`}
                          className="hover:bg-gray-50/70 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <Avatar
                                src={rec.avatar || undefined}
                                name={rec.employeeName}
                                size="sm"
                              />
                              <div>
                                <span className="font-semibold text-gray-950 block">
                                  {rec.employeeName}
                                </span>
                                <span className="text-xs text-gray-500 block font-mono">
                                  {rec.employeeCode}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {rec.biometricCode ? (
                              <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                                <Cpu className="w-3 h-3 text-gray-500" />
                                {rec.biometricCode}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">Not configured</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-xs text-gray-600">
                            <div>{rec.departmentName || "General"}</div>
                            <div className="text-[11px] text-gray-400">{rec.branchName || "Main"}</div>
                          </td>

                          <td className="py-3 px-4 font-mono text-xs font-semibold text-emerald-700">
                            {rec.firstIn ? formatTime(rec.firstIn) : "--:--"}
                          </td>

                          <td className="py-3 px-4 font-mono text-xs font-semibold text-gray-900">
                            {rec.lastOut ? formatTime(rec.lastOut) : "--:--"}
                          </td>

                          <td className="py-3 px-4 font-bold text-gray-950 text-xs">
                            {rec.workingHoursFormatted}
                          </td>

                          <td className="py-3 px-4 text-xs">
                            {rec.lateMinutes && rec.lateMinutes > 0 ? (
                              <span className="font-semibold text-rose-600">
                                +{rec.lateMinutes} mins
                              </span>
                            ) : rec.firstIn ? (
                              <span className="text-emerald-600 font-medium">On-time</span>
                            ) : (
                              <span className="text-gray-400">--</span>
                            )}
                          </td>

                          <td className="py-3 px-4">{getStatusBadge(rec.status)}</td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isUnmappedRow && isHrOrAdmin && (
                                <Button
                                  onClick={() => handleOpenMapModal(rec.employeeCode)}
                                  variant="primary"
                                  size="sm"
                                  leftIcon={<Plus className="w-3 h-3" />}
                                >
                                  Map Employee
                                </Button>
                              )}
                              {rec.employeeId && (
                                <Button
                                  onClick={() => {
                                    setTeamSelectedEmpId(Number(rec.employeeId));
                                    setTeamViewMode("calendar");
                                  }}
                                  variant="outline"
                                  size="sm"
                                  leftIcon={<Calendar className="w-3.5 h-3.5 text-emerald-600" />}
                                  title="View Monthly 2-Half Attendance Calendar"
                                >
                                  2-Half Matrix
                                </Button>
                              )}
                              {rec.punches && rec.punches.length > 0 && (
                                <Button
                                  onClick={() => setDetailRecord(rec)}
                                  variant="ghost"
                                  size="sm"
                                  leftIcon={<Eye className="w-3.5 h-3.5" />}
                                >
                                  Timeline ({rec.punchCount})
                                </Button>
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
          </div>
        </div>
      )}

      {/* LIVE BIOMETRIC PUNCHES TAB */}
      {activeTab === "punches" && isHrOrAdmin && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-card border border-surface-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Filter punches by biometric code (e.g. GA110) or employee name..."
                value={punchSearch}
                onChange={(e) => {
                  setPunchSearch(e.target.value);
                  setPunchesPage(0);
                }}
                className="w-full text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none bg-transparent"
              />
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <select
                value={punchStatusFilter}
                onChange={(e) => {
                  setPunchStatusFilter(e.target.value);
                  setPunchesPage(0);
                }}
                className="h-8 px-2.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-800 focus:outline-none"
              >
                <option value="ALL">All Mapping States</option>
                <option value="MAPPED">Mapped to HRMS</option>
                <option value="UNMAPPED">Unmapped Codes</option>
              </select>

              <select
                value={punchesPageSize}
                onChange={(e) => {
                  setPunchesPageSize(Number(e.target.value));
                  setPunchesPage(0);
                }}
                className="h-8 px-2.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-800 focus:outline-none"
              >
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </select>

              <Button
                onClick={() => loadPunches(punchesPage, punchesPageSize, punchStatusFilter, punchSearch)}
                variant="ghost"
                size="sm"
                isLoading={punchesLoading}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Refresh
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-card border border-surface-border shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                    <th className="py-3 px-4">Punch ID / Machine ID</th>
                    <th className="py-3 px-4">Biometric Machine Code</th>
                    <th className="py-3 px-4">Punch Timestamp (IST)</th>
                    <th className="py-3 px-4">Punch Type</th>
                    <th className="py-3 px-4">Mapped HRMS Employee</th>
                    <th className="py-3 px-4">Source Terminal</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-sans">
                  {punchesLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400 text-sm">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto text-gray-400 mb-2" />
                        Fetching live biometric punches...
                      </td>
                    </tr>
                  ) : punches.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400 text-sm">
                        No biometric punch records match the selected query.
                      </td>
                    </tr>
                  ) : (
                    punches.map((p) => {
                      const isUnmapped = p.mappingStatus === "UNMAPPED";

                      return (
                        <tr key={p.id} className="hover:bg-gray-50/70 transition-colors text-xs">
                          <td className="py-2.5 px-4 font-mono text-gray-500 font-medium">
                            #{p.sourceRecordId || p.id}
                          </td>

                          <td className="py-2.5 px-4 font-mono font-bold text-gray-900">
                            <span className="px-2 py-0.5 rounded bg-gray-100 border border-gray-200">
                              {p.employeeCode}
                            </span>
                          </td>

                          <td className="py-2.5 px-4 font-mono text-gray-700">
                            {formatDateTimeIST(p.punchTime)}
                          </td>

                          <td className="py-2.5 px-4">
                            {p.punchType === "IN" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <LogIn className="w-3 h-3" />
                                Punch IN
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-300">
                                <LogOut className="w-3 h-3" />
                                Punch OUT
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-4">
                            {isUnmapped ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                                Unmapped Machine Code
                              </span>
                            ) : (
                              <div className="flex items-center gap-1.5 font-medium text-emerald-800">
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{p.employeeName}</span>
                              </div>
                            )}
                          </td>

                          <td className="py-2.5 px-4 text-gray-500 text-[11px]">
                            {p.sourceSystem || "ESSL_ETIMETRACK"}
                          </td>

                          <td className="py-2.5 px-4 text-right">
                            {isUnmapped && (
                              <Button
                                onClick={() => handleOpenMapModal(p.employeeCode)}
                                variant="outline"
                                size="sm"
                                leftIcon={<Plus className="w-3 h-3" />}
                              >
                                Map Code
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 bg-gray-50/80 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
              <div>
                Showing Page <strong className="text-gray-900">{punchesPage + 1}</strong> of{" "}
                <strong className="text-gray-900">{punchesTotalPages}</strong> (
                <span className="font-mono">{punchesTotal.toLocaleString()}</span> total punches)
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  onClick={() => setPunchesPage((p) => Math.max(0, p - 1))}
                  disabled={punchesPage === 0}
                  variant="outline"
                  size="sm"
                  leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
                >
                  Previous
                </Button>
                <Button
                  onClick={() => setPunchesPage((p) => Math.min(punchesTotalPages - 1, p + 1))}
                  disabled={punchesPage >= punchesTotalPages - 1}
                  variant="outline"
                  size="sm"
                  rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BIOMETRIC MAPPING TAB */}
      {activeTab === "mappings" && isHrOrAdmin && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-gray-900 to-slate-900 text-white p-5 rounded-2xl shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <Fingerprint className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>eSSL eTimeTrack Dual-Dispatch Sync Engine</span>
                    <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Active
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Office laptop safely duplicates biometric machine records without touching Glueple production cursor.
                  </p>
                </div>
              </div>

              <Button
                onClick={handleRemap}
                variant="primary"
                size="sm"
                isLoading={isRemapping}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Re-evaluate All Punches
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
              <div>
                <span className="text-gray-400 block text-[11px] uppercase tracking-wider">Source Database</span>
                <span className="font-semibold text-white mt-0.5 block">SQL Server dbo.AttendanceAll</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px] uppercase tracking-wider">Punches Ingested</span>
                <span className="font-mono font-bold text-emerald-400 text-sm mt-0.5 block">
                  {syncState?.totalRecordsSynced?.toLocaleString() || "3,470"}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px] uppercase tracking-wider">Last Processed Cursor</span>
                <span className="font-mono font-bold text-white text-sm mt-0.5 block">
                  #{syncState?.lastSourceRecordId || "7427"}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[11px] uppercase tracking-wider">Detected Machine Codes</span>
                <span className="font-mono font-bold text-amber-400 text-sm mt-0.5 block">
                  {detectedCodes.allCodes.length} Codes ({detectedCodes.unmappedCodes.length} Unmapped)
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-card border border-surface-border shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-950">Add / Update Biometric Employee Mapping</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Explicitly associate a machine EMP_CODE (e.g. GA110) with an HRMS employee.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveMapping} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Biometric Machine Code *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="detectedCodesList"
                    placeholder="e.g. GA110, GA68, GA107..."
                    value={selectedMachineCode}
                    onChange={(e) => setSelectedMachineCode(e.target.value)}
                    required
                    className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 font-mono focus:outline-none focus:border-gray-950"
                  />
                  <datalist id="detectedCodesList">
                    {detectedCodes.allCodes.map((code) => (
                      <option key={code} value={code}>
                        {code} {detectedCodes.unmappedCodes.includes(code) ? "(Unmapped)" : ""}
                      </option>
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  HRMS Employee *
                </label>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(Number(e.target.value) || "")}
                  required
                  className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-gray-950"
                >
                  <option value="">-- Select HRMS Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Office terminal device tag"
                    value={mappingNotes}
                    onChange={(e) => setMappingNotes(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-gray-950"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isSavingMapping}
                    leftIcon={<Check className="w-3.5 h-3.5" />}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </form>

            {detectedCodes.unmappedCodes.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                  Detected Unmapped Machine Codes (Click to map):
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {detectedCodes.unmappedCodes.slice(0, 30).map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setSelectedMachineCode(code)}
                      className={`px-2 py-0.5 rounded text-xs font-mono font-semibold border transition-all ${selectedMachineCode === code
                        ? "bg-gray-950 text-white border-gray-950"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                        }`}
                    >
                      {code}
                    </button>
                  ))}
                  {detectedCodes.unmappedCodes.length > 30 && (
                    <span className="text-xs text-gray-400 self-center">
                      +{detectedCodes.unmappedCodes.length - 30} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-card border border-surface-border shadow-card overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-950">Active Machine Mappings</h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  Biometric hardware employee codes mapped to active HRMS employee profiles.
                </p>
              </div>
              <span className="text-xs text-gray-500 font-medium">
                {mappings.length} configured mappings
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                    <th className="py-3 px-4">Biometric Machine Code</th>
                    <th className="py-3 px-4">Mapped Employee</th>
                    <th className="py-3 px-4">HRMS Employee Code</th>
                    <th className="py-3 px-4">Configured On</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {mappingsLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400">
                        Loading configured machine mappings...
                      </td>
                    </tr>
                  ) : mappings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400">
                        No explicit machine code mappings created yet. Use the form above to link biometric codes.
                      </td>
                    </tr>
                  ) : (
                    mappings.map((m) => (
                      <tr key={m.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-bold text-gray-900">
                          <span className="px-2 py-0.5 rounded bg-gray-100 border border-gray-200">
                            {m.biometricEmpCode}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-gray-950">
                          {m.employeeName}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-gray-600">
                          {m.employeeCode}
                        </td>
                        <td className="py-2.5 px-4 text-gray-500">
                          {formatDate(m.createdAt)}
                        </td>
                        <td className="py-2.5 px-4 text-gray-600">
                          {m.notes || "--"}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <Button
                            onClick={() => handleDeleteMapping(m.id, m.biometricEmpCode)}
                            variant="ghost"
                            size="sm"
                            leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-600" />}
                          >
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PUNCH TIMELINE MODAL */}
      <Modal
        isOpen={!!detailRecord}
        onClose={() => setDetailRecord(null)}
        title="Biometric Sensor Punch Timeline"
        description={`Recorded machine events on ${formatDate(currentDate)} for ${detailRecord?.employeeName}.`}
      >
        {detailRecord && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-950">{detailRecord.employeeName}</p>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  Code: {detailRecord.employeeCode} • First IN: {detailRecord.firstIn ? formatTime(detailRecord.firstIn) : "--:--"} • Last OUT:{" "}
                  {detailRecord.lastOut ? formatTime(detailRecord.lastOut) : "--:--"} • Logged:{" "}
                  {detailRecord.lastOut
                    ? detailRecord.workingHoursFormatted
                    : detailRecord.firstIn
                      ? "In Progress"
                      : "--"}
                </p>
              </div>
              {getStatusBadge(detailRecord.status)}
            </div>

            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">
                Biometric Sensor Events ({detailRecord.punches?.length || 0})
              </h5>

              {!detailRecord.punches || detailRecord.punches.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">
                  No individual biometric punches registered for this employee on this date.
                </p>
              ) : (
                <div className="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                  {detailRecord.punches.map((p, idx) => (
                    <div key={p.id || idx} className="flex items-start gap-4 relative pl-7 text-xs">
                      <div
                        className={`absolute left-2 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs ${p.punchType === "IN" ? "bg-emerald-500" : "bg-slate-800"
                          }`}
                      />
                      <div className="flex-1 p-3 bg-white rounded-lg border border-gray-200 shadow-xs flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-950">
                              Punch {p.punchType}
                            </span>
                            <span className="font-mono text-xs text-gray-600 font-semibold">
                              {formatTime(p.punchTime)}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            <span>eSSL Biometric Terminal • Record #{p.sourceRecordId || p.id}</span>
                          </p>
                        </div>

                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                          {p.employeeCode}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* QUICK MACHINE CODE MAPPING MODAL */}
      <Modal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        title="Map Biometric Machine Code"
        description="Link an on-premise biometric hardware EMP_CODE with an HRMS employee profile."
      >
        <form onSubmit={handleSaveMapping} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Machine Biometric Code *
            </label>
            <input
              type="text"
              placeholder="e.g. GA110, GA68, GA107"
              value={selectedMachineCode}
              onChange={(e) => setSelectedMachineCode(e.target.value)}
              required
              className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 font-mono focus:outline-none focus:border-gray-950"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Select HRMS Employee *
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(Number(e.target.value) || "")}
              required
              className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-gray-950"
            >
              <option value="">-- Choose Employee --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.employeeCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Assigned biometric terminal card"
              value={mappingNotes}
              onChange={(e) => setMappingNotes(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-gray-950"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsMapModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSavingMapping}
              leftIcon={<Check className="w-3.5 h-3.5" />}
            >
              Save & Link Punches
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
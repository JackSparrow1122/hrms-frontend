import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  User,
  AlertCircle,
  RefreshCw,
  Info,
  CheckCircle2,
  CalendarDays,
  ShieldCheck,
  Search,
  LogIn,
  LogOut,
  MapPin,
  Sparkles,
  CalendarPlus,
  FileCheck,
  Check,
  X,
  FileText,
  Clock3,
  Send,
  HelpCircle,
  Users,
} from "lucide-react";
import {
  attendanceApi,
  leaveApi,
  LeaveBalanceItem,
  LeaveRequestItem,
  EmployeeMonthlyAttendance,
  MonthlyDayAttendanceItem,
  AttendancePunchItem,
} from "../../lib/api";
import { formatTime, formatTimeWithSeconds, formatDate, getTodayIst } from "../../lib/utils";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { useAuth } from "../../lib/authContext";
import { useToast } from "../../lib/toastContext";
import { useHrms } from "../../lib/hrmsContext";

interface EmployeeOption {
  id: number;
  employeeCode: string;
  name: string;
  departmentName?: string;
  avatar?: string | null;
}

interface MonthlyAttendanceCalendarProps {
  initialEmployeeId?: number;
  employees: EmployeeOption[];
  onBackToRoster?: () => void;
  isEmployeeOnly?: boolean;
}

export function MonthlyAttendanceCalendar({
  initialEmployeeId,
  employees,
  onBackToRoster,
  isEmployeeOnly = false,
}: MonthlyAttendanceCalendarProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [holidayMap, setHolidayMap] = useState<Record<string, string>>({});

  useEffect(() => {
    // Employee ke liye ye call 403 de sakti hai, ignore karo
    attendanceApi.getHolidayList()
      .then((list) => {
        const map: Record<string, string> = {};
        if (Array.isArray(list)) {
          list.forEach((h: any) => {
            const dateStr = h.holidayDate || h.date;
            if (dateStr) map[dateStr] = h.name;
          });
        }
        setHolidayMap(map);
      })
      .catch(() => {});
  }, []);

  // Helper to determine if a date is the last Saturday of its month
  const isLastSaturdayOfMonth = useCallback((dateStr: string) => {
    if (!dateStr) return false;
    try {
      const parts = dateStr.split("-");
      if (parts.length !== 3) return false;
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const cur = new Date(y, m, d);
      if (cur.getDay() !== 6) return false; // Must be Saturday
      const nextWeek = new Date(y, m, d + 7);
      return nextWeek.getMonth() !== cur.getMonth();
    } catch {
      return false;
    }
  }, []);

  const isLeaderOrAdmin = Boolean(
    user?.role === "HR_ADMIN" ||
    user?.role === "TENANT_ADMIN" ||
    user?.role === "SUPER_ADMIN" ||
    user?.role === "TEAM_LEAD" ||
    user?.role === "MANAGER" ||
    user?.roles?.some((r) =>
      ["ROLE_HR_ADMIN", "ROLE_TENANT_ADMIN", "ROLE_SUPER_ADMIN", "ROLE_MANAGER", "ROLE_TEAM_LEAD"].includes(r)
    )
  );

  // Current calendar viewing month and year (defaults to current date in IST)
  const [currentYear, setCurrentYear] = useState<number>(() => {
    const today = getTodayIst();
    return parseInt(today.split("-")[0], 10) || new Date().getFullYear();
  });
  const [currentMonth, setCurrentMonth] = useState<number>(() => {
    const today = getTodayIst();
    return parseInt(today.split("-")[1], 10) || (new Date().getMonth() + 1);
  });

  // Selected Employee (lock to user.id or user.employeeId if employee only)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number>(() => {
    if (initialEmployeeId && !isNaN(initialEmployeeId)) return initialEmployeeId;
    if (isEmployeeOnly && user?.id && !isNaN(Number(user.id))) return Number(user.id);
    if (employees.length > 0) return employees[0].id;
    return 15; // default to GA70 Dipratna
  });

  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState("");

  // Data state
  const [loading, setLoading] = useState(false);
  const [monthlyData, setMonthlyData] = useState<EmployeeMonthlyAttendance | null>(null);

  // Leave balances for currently viewed employee
  const [balances, setBalances] = useState<LeaveBalanceItem[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);

  // Pending Approvals (for TL / HR Admin)
  const [pendingApprovals, setPendingApprovals] = useState<LeaveRequestItem[]>([]);
  const [isApprovalsModalOpen, setIsApprovalsModalOpen] = useState(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  // Modal 1: Date Action Hub (When clicking ANY date)
  const [clickedDateCell, setClickedDateCell] = useState<{
    dayNumber: number;
    dateStr: string;
    dayData?: MonthlyDayAttendanceItem;
  } | null>(null);

  // Modal 2: Apply Leave Modal
  const [isApplyLeaveOpen, setIsApplyLeaveOpen] = useState(false);
  const [leaveTypeCode, setLeaveTypeCode] = useState<"EL" | "SL" | "CL">("EL");
  const [leaveDuration, setLeaveDuration] = useState<"FULL" | "HALF">("FULL");
  const [halfSession, setHalfSession] = useState<"FIRST_HALF" | "SECOND_HALF">("FIRST_HALF");
  const [leaveStartDate, setLeaveStartDate] = useState(() => getTodayIst());
  const [leaveEndDate, setLeaveEndDate] = useState(() => getTodayIst());
  const [leaveReason, setLeaveReason] = useState("");
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

  // Modal 3: Attendance Correction Modal
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [corrDate, setCorrDate] = useState(() => getTodayIst());
  const [corrInTime, setCorrInTime] = useState("10:00");
  const [corrOutTime, setCorrOutTime] = useState("19:00");
  const [corrReason, setCorrReason] = useState("");
  const [isSubmittingCorr, setIsSubmittingCorr] = useState(false);

  // Modal 4: Punch Timeline Detail Modal
  const [selectedDayDetail, setSelectedDayDetail] = useState<MonthlyDayAttendanceItem | null>(null);

  // Sync selected employee if initialEmployeeId changes from parent
  // Sync selected employee if initialEmployeeId changes from parent
  useEffect(() => {
    if (isEmployeeOnly && user?.id && !isNaN(Number(user.id))) {
      setSelectedEmployeeId(Number(user.id));
    } else if (initialEmployeeId && !isNaN(initialEmployeeId)) {
      setSelectedEmployeeId(initialEmployeeId);
    }
    // 👈 YE 2 LINES ADD KARO: Purana modal aur click reset karne ke liye
    setSelectedDayDetail(null);
    setClickedDateCell(null);
  }, [initialEmployeeId, isEmployeeOnly, user?.id]);
  // Load monthly matrix data
  const loadMonthlyData = useCallback(async (empId: number, year: number, month: number) => {
    setLoading(true);
    try {
      const data = await attendanceApi.getEmployeeMonthly({
        employeeId: empId,
        year,
        month,
      });
      setMonthlyData(data);
    } catch {
      setMonthlyData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load balances
  const loadBalances = useCallback(async (empId: number) => {
    setBalancesLoading(true);
    try {
      const bList = await leaveApi.getBalances(empId, currentYear);
      setBalances(bList);
    } catch {
      // ignore
    } finally {
      setBalancesLoading(false);
    }
  }, [currentYear]);

  // Load pending approvals for TLs / HR Admin
  const loadPendingApprovals = useCallback(async () => {
    if (!isLeaderOrAdmin) return;
    try {
      const pList = await leaveApi.getPendingApprovals();
      setPendingApprovals(pList);
    } catch {
      // ignore
    }
  }, [isLeaderOrAdmin]);

  useEffect(() => {
    if (selectedEmployeeId) {
      loadMonthlyData(selectedEmployeeId, currentYear, currentMonth);
      loadBalances(selectedEmployeeId);
    }
    loadPendingApprovals();
  }, [selectedEmployeeId, currentYear, currentMonth, loadMonthlyData, loadBalances, loadPendingApprovals]);

  // Current employee info
  const currentEmployee = useMemo(() => {
    // 1. Sabse pehle monthlyData (jo backend se aata hai) ko priority do
    if (monthlyData) {
      return {
        id: monthlyData.employeeId,
        employeeCode: monthlyData.employeeCode,
        name: monthlyData.employeeName,
        departmentName: monthlyData.departmentName,
      };
    }
    // 2. Agar data load ho raha hai, toh employees array mein selectedEmployeeId se dhoondho
    const found = employees.find((e) => e.id === selectedEmployeeId);
    if (found) return found;

    // 3. Fallback ke liye user (sirf employee-only mode mein)
    if (isEmployeeOnly && user) {
      return {
        id: Number(user.id) || 15,
        employeeCode: user.employeeCode || "GA70",
        name: user.fullName || user.name || "Dipratna Mahire",
        departmentName: user.department || "Information Technology",
      };
    }
    return undefined;
  }, [employees, selectedEmployeeId, monthlyData, user, isEmployeeOnly]);

  // Approver determination helper based on company leadership
  const getApproverInfo = (empCode?: string, deptName?: string) => {
    const code = empCode?.toUpperCase();
    if (code === "GA62") return { name: "Anvita Pawar", role: "HR Admin" }; // Ajay Pawar reports to HR
    if (code === "GA06") return { name: "Anvita Pawar", role: "HR Admin" }; // Nasim Shaikh reports to HR
    if (code === "GA133") return { name: "Anvita Pawar", role: "HR Admin" }; // Shruti Das reports to HR
    if (code === "GA26") return { name: "Anvita Pawar", role: "HR Admin" }; // Neha Dube reports to HR
    if (code === "GA115") return { name: "Anvita Pawar", role: "HR Admin" }; // Aditya Bhadouria reports to HR
    if (code === "GA137") return { name: "System Admin", role: "Super Admin" };

    if (deptName?.includes("Information Technology") || code === "GA70" || code === "GA93" || code === "GA109" || code === "GA111") {
      return { name: "Ajay Pawar", role: "IT Team Lead / Manager" };
    }
    if (deptName?.includes("Digital Marketing") || code === "GA11" || code === "GA63" || code === "GA83" || code === "GA84" || code === "GA125" || code === "GA126" || code === "GA129") {
      return { name: "Nasim Shaikh", role: "Digital Marketing Team Lead" };
    }
    if (deptName?.includes("Corporate Relations") || code === "GA98" || code === "GA101" || code === "GA103" || code === "GA123" || code === "GA124" || code === "GA134") {
      return { name: "Shruti Das", role: "Corporate Relations Team Lead" };
    }
    if (deptName?.includes("Learning") || code === "GA20" || code === "GA60" || code === "GA68" || code === "GA79" || code === "GA120" || code === "GA121" || code === "GA132" || code === "GA138" || code === "GA139") {
      return { name: "Neha Dube", role: "Learning & Development Team Lead" };
    }
    if (deptName?.includes("Sales") || code === "GA107" || code === "GA114" || code === "GA116" || code === "GA117" || code === "GA118") {
      return { name: "Aditya Bhadouria", role: "Sales Team Lead" };
    }
    return { name: "Anvita Pawar", role: "HR Admin" };
  };

  const approverInfo = useMemo(() => {
    return getApproverInfo(currentEmployee?.employeeCode, currentEmployee?.departmentName);
  }, [currentEmployee]);

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleJumpToToday = () => {
    const today = getTodayIst();
    setCurrentYear(parseInt(today.split("-")[0], 10) || new Date().getFullYear());
    setCurrentMonth(parseInt(today.split("-")[1], 10) || (new Date().getMonth() + 1));
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // Calendar matrix calculation (starts Monday)
  const calendarGrid = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const firstDayIndex = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0: Sun, 1: Mon...
    const mondayOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const prevMonthDays = new Date(currentYear, currentMonth - 1, 0).getDate();

    const cells: Array<{
      key: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      dateStr: string;
      dayData?: MonthlyDayAttendanceItem;
    }> = [];

    // 1. Previous month trailing days
    for (let i = mondayOffset - 1; i >= 0; i--) {
      const dNum = prevMonthDays - i;
      const m = currentMonth === 1 ? 12 : currentMonth - 1;
      const y = currentMonth === 1 ? currentYear - 1 : currentYear;
      const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(dNum).padStart(2, "0")}`;
      cells.push({
        key: `prev-${dNum}`,
        dayNumber: dNum,
        isCurrentMonth: false,
        dateStr,
      });
    }

    // 2. Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dayData = monthlyData?.days?.find((item) => item.dayOfMonth === d);
      cells.push({
        key: `curr-${d}`,
        dayNumber: d,
        isCurrentMonth: true,
        dateStr,
        dayData,
      });
    }

    // 3. Next month leading days to complete grid of 35 or 42
    const totalCellsNeeded = cells.length <= 35 ? 35 : 42;
    const remaining = totalCellsNeeded - cells.length;
    for (let n = 1; n <= remaining; n++) {
      const m = currentMonth === 12 ? 1 : currentMonth + 1;
      const y = currentMonth === 12 ? currentYear + 1 : currentYear;
      const dateStr = `${y}-${String(m).padStart(2, "0")}-${String(n).padStart(2, "0")}`;
      cells.push({
        key: `next-${n}`,
        dayNumber: n,
        isCurrentMonth: false,
        dateStr,
      });
    }

    return cells;
  }, [currentYear, currentMonth, monthlyData]);

  // Open Date Action Hub when clicking dates to inspect live punch logs or actions
  const handleDateCellClick = (cell: { dayNumber: number; isCurrentMonth: boolean; dateStr: string; dayData?: MonthlyDayAttendanceItem }) => {
    if (!cell.isCurrentMonth) return;
    const isSunday = new Date(cell.dateStr).getDay() === 0;
    const isLastSat = isLastSaturdayOfMonth(cell.dateStr);
    const isHoliday = Boolean(cell.dayData?.isHoliday || holidayMap[cell.dateStr]);
    const isWeekOff = Boolean(isSunday || isLastSat || isHoliday || cell.dayData?.isWeekOff || cell.dayData?.weekOff || cell.dayData?.displayCode === "O | O");
    const isLeave = Boolean(
      (cell.dayData?.displayCode && (
        cell.dayData.displayCode.includes("CL") ||
        cell.dayData.displayCode.includes("SL") ||
        cell.dayData.displayCode.includes("EL")
      )) ||
      (cell.dayData?.firstHalfStatus && ["CL", "SL", "EL"].includes(cell.dayData.firstHalfStatus)) ||
      (cell.dayData?.secondHalfStatus && ["CL", "SL", "EL"].includes(cell.dayData.secondHalfStatus))
    );
    // Sundays, holidays, and leaves are strictly non-clickable as requested
    if (isWeekOff || isHoliday || isLeave || cell.dayData?.isFuture || cell.dayData?.displayCode === "--") {
      return;
    }
    setClickedDateCell(cell);
  };

  // Open Apply Leave modal
  const handleOpenApplyLeave = (dateStr?: string) => {
    const d = dateStr || getTodayIst();
    setLeaveStartDate(d);
    setLeaveEndDate(d);
    setLeaveReason("");
    setLeaveDuration("FULL");
    setHalfSession("FIRST_HALF");
    setLeaveTypeCode("EL");
    setClickedDateCell(null);
    setIsApplyLeaveOpen(true);
  };

  // Open Correction modal
  const handleOpenCorrection = (dateStr?: string) => {
    const d = dateStr || getTodayIst();
    setCorrDate(d);
    setCorrInTime("10:00");
    setCorrOutTime("19:00");
    setCorrReason("");
    setClickedDateCell(null);
    setIsCorrectionOpen(true);
  };

  // Submit Leave Application
  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveReason.trim()) {
      toast.error("Please enter a reason for your leave application.");
      return;
    }
    setIsSubmittingLeave(true);
    try {
      await leaveApi.applyLeave({
        employeeId: selectedEmployeeId,
        leaveTypeCode,
        startDate: leaveStartDate,
        endDate: leaveDuration === "HALF" ? leaveStartDate : leaveEndDate,
        halfDay: leaveDuration === "HALF",
        halfDaySession: leaveDuration === "HALF" ? halfSession : null,
        reason: leaveReason.trim(),
      });
      toast.success(`Leave application (${leaveTypeCode}) submitted to ${approverInfo.name} for approval!`);
      setIsApplyLeaveOpen(false);
      // Reload calendar & balances
      loadMonthlyData(selectedEmployeeId, currentYear, currentMonth);
      loadBalances(selectedEmployeeId);
      loadPendingApprovals();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit leave application.");
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!corrReason.trim()) {
      toast.error("Please provide a reason for attendance correction.");
      return;
    }
    setIsSubmittingCorr(true);
    try {
      const proposedIn = new Date(`${corrDate}T${corrInTime}:00+05:30`).toISOString();
      const proposedOut = new Date(`${corrDate}T${corrOutTime}:00+05:30`).toISOString();

      await attendanceApi.applyCorrection({
        employeeId: selectedEmployeeId,
        date: corrDate,
        proposedPunchIn: proposedIn,
        proposedPunchOut: proposedOut,
        reason: corrReason.trim(),
      });

      toast.success(`Attendance correction for ${corrDate} submitted successfully!`);
      setIsCorrectionOpen(false);
    } catch (err: any) {
      // 👇 Yahan exact error message dikhega
      toast.error(err.message || "Failed to submit correction request.");
    } finally {
      setIsSubmittingCorr(false);
    }
  };
  // Handle Approve / Reject Leave
  const handleApproveLeave = async (id: number) => {
    setApprovingId(id);
    try {
      await leaveApi.approveLeave(id, "Approved by Team Lead / Admin");
      toast.success("Leave application approved!");
      loadPendingApprovals();
      loadMonthlyData(selectedEmployeeId, currentYear, currentMonth);
      loadBalances(selectedEmployeeId);
    } catch (err: any) {
      toast.error(err.message || "Could not approve leave.");
    } finally {
      setApprovingId(null);
    }
  };

  const handleRejectLeave = async (id: number) => {
    setRejectingId(id);
    try {
      await leaveApi.rejectLeave(id, "Declined due to work requirements");
      toast.success("Leave application rejected.");
      loadPendingApprovals();
      loadMonthlyData(selectedEmployeeId, currentYear, currentMonth);
      loadBalances(selectedEmployeeId);
    } catch (err: any) {
      toast.error(err.message || "Could not reject leave.");
    } finally {
      setRejectingId(null);
    }
  };
  // Ordinal suffix: 1 -> st, 2 -> nd, 3 -> rd, 4 -> th, 11 -> th, 21 -> st, etc.
  const getOrdinalSuffix = (n: number): string => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };
  // Render 2-Half Pill Component inside cell
  const renderCellPill = (cell: { dayNumber: number; isCurrentMonth: boolean; dateStr?: string; dayData?: MonthlyDayAttendanceItem }) => {
    const { dayData, dateStr } = cell;

    if (!cell.isCurrentMonth) {
      return null;
    }

    const holidayName = dayData?.holidayName || (dateStr ? holidayMap[dateStr] : null);
    const isHoliday = Boolean(dayData?.isHoliday || holidayName);

    // 0. Official Declared Holiday -> O | O with holiday name
    if (isHoliday) {
      const hasPunch = Boolean(dayData?.punchCount && dayData.punchCount > 0);
      if (hasPunch) {
        return (
          <div
            title={`🎉 Official Holiday: ${holidayName || "Holiday"} (Present / Comp Off Eligible)`}
            className="w-full py-1 px-1 flex flex-col items-center justify-center rounded border border-emerald-400 bg-emerald-50 text-[11px] font-bold font-mono text-emerald-800 shadow-2xs"
          >
            <div className="flex items-center gap-1">
              <span>🎉</span>
              <span>P | P</span>
            </div>
            <span className="text-[9px] font-sans font-semibold text-emerald-700 truncate max-w-full px-0.5 leading-tight">
              {holidayName || "Holiday"}
            </span>
          </div>
        );
      }
      return (
        <div
          title={`🎉 Official Holiday: ${holidayName || "Holiday"} (Office Closed)`}
          className="w-full py-1 px-1 flex flex-col items-center justify-center rounded border border-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50 text-[11px] font-bold font-mono text-purple-900 shadow-2xs"
        >
          <div className="flex items-center gap-1">
            <span className="text-[10px]">🎉</span>
            <span>O | O</span>
          </div>
          <span className="text-[9px] font-sans font-semibold text-purple-700 truncate max-w-full px-0.5 leading-tight">
            {holidayName || "Holiday"}
          </span>
        </div>
      );
    }

    if (!dayData || dayData.isFuture || dayData.displayCode === "--" || !dayData.displayCode) {
      return null;
    }

    const isLatePunch = dayData.isLate && dayData.lateMinutes && dayData.lateMinutes > 5;
    const code = dayData.displayCode || "A | A";

    const isSunday = dayData.dayOfWeek === "SUN" || (dateStr ? new Date(dateStr).getDay() === 0 : false);
    const isLastSat = dateStr ? isLastSaturdayOfMonth(dateStr) : false;

    const isWeekOff = Boolean(
      dayData.isWeekOff ||
      dayData.weekOff ||
      code === "O | O" ||
      dayData.firstHalfStatus === "O" ||
      dayData.secondHalfStatus === "O" ||
      isSunday ||
      isLastSat
    );

    // 1. Week Off (Sundays and Last Saturday) -> O | O
    if (isWeekOff || code === "O | O") {
      const offLabel = isSunday ? "Sun Off" : isLastSat ? "Sat Off" : "Week Off";
      return (
        <div
          title={isSunday ? "Weekly Off (Sunday)" : isLastSat ? "Weekly Off (Last Saturday)" : "Weekly Off"}
          className="w-full py-1 px-1 flex flex-col items-center justify-center rounded border border-blue-200 bg-blue-50 text-[11px] font-bold font-mono text-blue-700 shadow-2xs"
        >
          <span>O | O</span>
          <span className="text-[9px] font-sans font-medium text-blue-600 leading-tight">
            {offLabel}
          </span>
        </div>
      );
    }

    // 2. Approved Earned Leave -> EL | EL or EL | P or P | EL
    if (code.includes("EL")) {
      const elTooltip =
        code === "EL | EL"
          ? "Earned Leave (Full Day)"
          : code.startsWith("EL")
            ? "First Half: Earned Leave (EL) • Second Half: Present (P)"
            : "First Half: Present (P) • Second Half: Earned Leave (EL)";
      return (
        <div
          title={elTooltip}
          className="w-full py-1 px-1.5 text-center rounded border border-sky-300 bg-sky-50 text-[11px] font-bold font-mono text-sky-800"
        >
          {code}
        </div>
      );
    }

    // 3. Approved Casual Leave -> CL | CL or CL | P or P | CL
    if (code.includes("CL")) {
      const clTooltip =
        code === "CL | CL"
          ? "Casual Leave (Full Day)"
          : code.startsWith("CL")
            ? "First Half: Casual Leave (CL) • Second Half: Present (P)"
            : "First Half: Present (P) • Second Half: Casual Leave (CL)";
      return (
        <div
          title={clTooltip}
          className="w-full py-1 px-1.5 text-center rounded border border-amber-300 bg-amber-50 text-[11px] font-bold font-mono text-amber-800"
        >
          {code}
        </div>
      );
    }

    // 4. Approved Sick Leave -> SL | SL or SL | P or P | SL
    if (code.includes("SL")) {
      const slTooltip =
        code === "SL | SL"
          ? "Sick Leave (Full Day)"
          : code.startsWith("SL")
            ? "First Half: Sick Leave (SL) • Second Half: Present (P)"
            : "First Half: Present (P) • Second Half: Sick Leave (SL)";
      return (
        <div
          title={slTooltip}
          className="w-full py-1 px-1.5 text-center rounded border border-purple-300 bg-purple-50 text-[11px] font-bold font-mono text-purple-800"
        >
          {code}
        </div>
      );
    }

    // 5. Leave Without Pay / Half Day / Penalty -> LWP | LWP, LWP | P, P | LWP, A | A
    if (code.includes("LWP") || code === "A | A") {
      // 3rd / 5th / 7th late mark => FULL DAY LWP penalty
      if (dayData.isLwpPenaltyApplied || (code === "LWP | LWP" && dayData.isLatePenaltyApplied)) {
        const lwpTooltip = `${dayData.lateOccurrenceNumber || 3}${getOrdinalSuffix(dayData.lateOccurrenceNumber || 3)} Late Mark (Arrived ${formatTime(dayData.firstIn)}, +${dayData.lateMinutes} mins) • Exceeded 2 allowed late marks → Full Day LWP (1 day deducted)`;
        return (
          <div
            title={lwpTooltip}
            className="w-full py-1 px-1.5 flex items-center justify-center gap-1 rounded border border-rose-500 bg-rose-100 text-[11px] font-bold font-mono text-rose-900 ring-1 ring-rose-300 shadow-2xs"
          >
            <span>LWP | LWP</span>
            <span className="text-[10px] text-rose-700 font-sans font-bold">⏰</span>
          </div>
        );
      }

      // 4th / 6th late mark => HALF DAY LWP penalty
      if (dayData.isLatePenaltyApplied && (code === "LWP | P" || code === "P | LWP")) {
        const occ = dayData.lateOccurrenceNumber || 4;
        const lateTooltipHalf = `${occ}${getOrdinalSuffix(occ)} Late Mark (Arrived ${formatTime(dayData.firstIn)}, +${dayData.lateMinutes} mins) → 4th Late Mark Half Day Penalty (0.5 day deducted)`;
        return (
          <div
            title={lateTooltipHalf}
            className="w-full py-1 px-1.5 flex items-center justify-center gap-1 rounded border border-rose-400 bg-rose-50 text-[11px] font-bold font-mono text-rose-900 ring-1 ring-rose-300 shadow-2xs"
          >
            <span>{code}</span>
            <span className="text-[10px] text-rose-700 font-sans font-bold">⏰</span>
          </div>
        );
      }

      // Half Day Missed / Pending Leave Approval (LWP | P or P | LWP)
      if (code === "LWP | P" || code === "P | LWP") {
        const lwpHalfTooltip =
          code === "LWP | P"
            ? "First Half: LWP (Pending Approval or No Leave Applied) • Second Half: Present (P)"
            : "First Half: Present (P) • Second Half: LWP (Pending Approval or No Leave Applied)";
        return (
          <div
            title={lwpHalfTooltip}
            className="w-full py-1 px-1.5 flex items-center justify-center gap-1 rounded border border-rose-300 bg-rose-50/90 text-[11px] font-bold font-mono text-rose-800"
          >
            <span>{code}</span>
          </div>
        );
      }

      const absentTooltip =
        code === "A | A"
          ? "Absent (No Punches logged)"
          : "Leave Without Pay (Full Day LWP)";
      return (
        <div
          title={absentTooltip}
          className="w-full py-1 px-1.5 text-center rounded border border-rose-300 bg-rose-50 text-[11px] font-bold font-mono text-rose-800"
        >
          {code}
        </div>
      );
    }

    // 6. Half Day Punch (PR | AB or AB | PR legacy fallback)
    if (
      code === "PR | AB" ||
      code === "AB | PR" ||
      dayData.firstHalfStatus === "AB" ||
      dayData.secondHalfStatus === "AB"
    ) {
      const isLateHalfDay = Boolean(dayData.isLate || dayData.isLatePenaltyApplied);
      const occ = dayData.lateOccurrenceNumber;
      const lateTooltipHalf = dayData.isLatePenaltyApplied
        ? `${occ || 4}${getOrdinalSuffix(occ || 4)} Late Mark (Arrived ${formatTime(dayData.firstIn)}, +${dayData.lateMinutes} mins) → Half Day (0.5 day deducted)`
        : `Late Arrival: Arrived at ${formatTime(dayData.firstIn)} (+${dayData.lateMinutes} mins)`;

      return (
        <div className="w-full py-1 px-1.5 flex items-center justify-center gap-1.5 rounded border border-amber-300 bg-amber-50/70 text-[11px] font-bold font-mono text-amber-900">
          <span>{code}</span>
          {isLateHalfDay && (
            <span
              title={lateTooltipHalf}
              className="inline-flex items-center justify-center text-rose-600 animate-pulse cursor-help"
            >
              ⏰
            </span>
          )}
        </div>
      );
    }

    if (code !== "P | P" && code !== "P") {
      return null;
    }

    const lateTooltipFull = dayData.lateOccurrenceNumber
      ? `Late Arrival #${dayData.lateOccurrenceNumber} of 2 Allowed (No deduction): Arrived ${formatTime(dayData.firstIn)} (+${dayData.lateMinutes} mins)`
      : `Late Arrival: Arrived at ${formatTime(dayData.firstIn)} (+${dayData.lateMinutes} mins)`;

    const pillCode = "P | P";

    return (
      <div className="w-full py-1 px-1.5 flex items-center justify-center gap-1.5 rounded border border-emerald-300 bg-emerald-50/40 text-[11px] font-bold font-mono text-emerald-700">
        <span>{pillCode}</span>
        {isLatePunch && (
          <span
            title={lateTooltipFull}
            className="inline-flex items-center justify-center text-rose-600 animate-pulse cursor-help"
          >
            ⏰
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* ============================================================= */}
      {/* TOP CONTROLS & EMPLOYEE / BALANCE BAR                         */}
      {/* ============================================================= */}
      <div className="bg-white p-4 rounded-card border border-surface-border shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Employee Selector (or Locked Badge for regular employee) */}
        <div className="flex items-center gap-3 flex-wrap">
          {isEmployeeOnly ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>My Attendance: {currentEmployee?.name || user?.fullName || "Employee"}</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[11px]">
                {currentEmployee?.employeeCode || user?.employeeCode || "GA70"}
              </span>
              {currentEmployee?.departmentName && (
                <span className="text-gray-500 font-normal">• {currentEmployee.departmentName}</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Employee:
              </span>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(Number(e.target.value))}
                className="h-9 px-3 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 font-semibold focus:outline-none focus:border-gray-950 min-w-[240px]"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.employeeCode}) {emp.departmentName ? `• ${emp.departmentName}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick Leave Balances Pills (EL, SL, CL only) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {balances
              .filter((b) => b.leaveTypeCode !== "LWP")
              .map((b) => (
                <span
                  key={b.leaveTypeCode}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono bg-slate-50 border border-slate-200 text-slate-700"
                >
                  <span className="text-slate-400 font-sans">{b.leaveTypeCode}:</span>
                  <span className={b.remainingCount > 0 ? "text-emerald-700" : "text-slate-500"}>
                    {Number(b.remainingCount).toFixed(1)}
                  </span>
                </span>
              ))}
          </div>
        </div>

        {/* Right: Controls & Approvals */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Pending Approvals Button for TL / HR Admin */}
          {isLeaderOrAdmin && (
            <button
              onClick={() => setIsApprovalsModalOpen(true)}
              className="relative px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Leave Approvals</span>
              {pendingApprovals.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white font-mono font-bold animate-pulse">
                  {pendingApprovals.length}
                </span>
              )}
            </button>
          )}

          {/* Quick Apply Leave Button */}
          <Button
            onClick={() => handleOpenApplyLeave()}
            variant="primary"
            size="sm"
            leftIcon={<CalendarPlus className="w-3.5 h-3.5" />}
          >
            Apply Leave
          </Button>

          {onBackToRoster && !isEmployeeOnly && (
            <Button onClick={onBackToRoster} variant="ghost" size="sm">
              Back to Roster
            </Button>
          )}

          <Button
            onClick={() => {
              loadMonthlyData(selectedEmployeeId, currentYear, currentMonth);
              loadBalances(selectedEmployeeId);
              loadPendingApprovals();
              toast.info("Refreshed live attendance and biometric punches");
            }}
            variant="ghost"
            size="sm"
            isLoading={loading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : "text-emerald-600"}`} />}
          >
            <span className="flex items-center gap-1.5 font-semibold text-gray-900">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Sync Live Punches
            </span>
          </Button>

          <button
            onClick={handleJumpToToday}
            className="px-3 py-1.5 text-xs font-bold text-white bg-slate-600 hover:bg-slate-700 rounded transition-colors shadow-xs"
          >
            today
          </button>

          <div className="inline-flex items-center rounded border border-slate-700 bg-slate-800 text-white overflow-hidden shadow-xs">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-700 transition-colors border-r border-slate-700"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-700 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* CALENDAR MATRIX CARD                                          */}
      {/* ============================================================= */}
      <div className="bg-white rounded-card border border-surface-border shadow-xs overflow-hidden">
        {/* Month Title Header */}
        <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-950 font-sans tracking-tight">
              {monthNames[currentMonth - 1]} {currentYear}
            </h2>
            <span className="text-xs text-gray-500 font-medium">
              General Shift (10:00 AM – 07:00/07:30 PM)
            </span>
          </div>

          <div className="text-xs text-gray-500 font-medium hidden sm:block">
            Showing schedule for{" "}
            <strong className="text-gray-900 font-semibold">{currentEmployee?.name}</strong>
          </div>
        </div>

        {/* Calendar Day-of-Week Column Headers (Mon to Sun) */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-100/60 text-center font-bold text-xs text-gray-700 uppercase tracking-wider py-2.5">
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
          <div className="text-blue-700">Sun</div>
        </div>

        {/* Calendar 7-Column Day Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-gray-200 border-b border-gray-200">
          {calendarGrid.map((cell) => {
            const now = new Date();
            const isTodayCell =
              cell.isCurrentMonth &&
              cell.dayNumber === now.getDate() &&
              currentMonth === now.getMonth() + 1 &&
              currentYear === now.getFullYear();
            const isSundayCell = cell.isCurrentMonth && new Date(cell.dateStr).getDay() === 0;
            const isLastSatCell = cell.isCurrentMonth && isLastSaturdayOfMonth(cell.dateStr);

            const holidayName = cell.dayData?.holidayName || holidayMap[cell.dateStr];
            const isHolidayCell = cell.isCurrentMonth && Boolean(cell.dayData?.isHoliday || holidayName);

            const isWeekOffCell = Boolean(
              cell.dayData?.isWeekOff ||
              cell.dayData?.weekOff ||
              cell.dayData?.displayCode === "O | O" ||
              isSundayCell ||
              isLastSatCell ||
              isHolidayCell
            );

            const isLeaveCell = cell.isCurrentMonth && Boolean(
              (cell.dayData?.displayCode && (
                cell.dayData.displayCode.includes("CL") ||
                cell.dayData.displayCode.includes("SL") ||
                cell.dayData.displayCode.includes("EL")
              )) ||
              (cell.dayData?.firstHalfStatus && ["CL", "SL", "EL"].includes(cell.dayData.firstHalfStatus)) ||
              (cell.dayData?.secondHalfStatus && ["CL", "SL", "EL"].includes(cell.dayData.secondHalfStatus))
            );

            const isOffOrLeave = Boolean(
              isHolidayCell ||
              isSundayCell ||
              isLastSatCell ||
              isWeekOffCell ||
              isLeaveCell
            );

            // Sundays, holidays, and leaves are strictly non-clickable as requested.
            // Future dates / unrecorded blank dates are also non-clickable and shown completely blank.
            const isClickable = Boolean(
              cell.isCurrentMonth &&
              !isOffOrLeave &&
              !cell.dayData?.isFuture &&
              cell.dayData?.displayCode !== "--" &&
              (Boolean(cell.dayData?.punchCount && cell.dayData.punchCount > 0) ||
               cell.dayData?.displayCode === "A | A" ||
               cell.dayData?.displayCode?.includes("LWP"))
            );

            return (
              <div
                key={cell.key}
                onClick={isClickable ? () => handleDateCellClick(cell) : undefined}
                className={`min-h-[92px] sm:min-h-[105px] p-2 flex flex-col justify-between transition-all relative ${
                  !cell.isCurrentMonth
                    ? "bg-gray-50/30 text-gray-300 cursor-default select-none"
                    : isTodayCell
                      ? "bg-amber-50/40 hover:bg-amber-100/60 cursor-pointer ring-1 ring-inset ring-amber-300 shadow-xs"
                      : isHolidayCell
                        ? "bg-gradient-to-b from-purple-50/50 to-indigo-50/40 ring-1 ring-inset ring-purple-200/70 cursor-default select-none"
                        : isSundayCell || isWeekOffCell
                          ? "bg-slate-50/60 cursor-default select-none"
                          : isLeaveCell
                            ? "bg-amber-50/30 cursor-default select-none"
                            : isClickable
                              ? "hover:bg-indigo-50/40 cursor-pointer"
                              : "cursor-default select-none"
                }`}
              >
                {/* Day Number in top-right corner & Holiday / Off Status in top-left */}
                <div className="flex items-center justify-between gap-1">
                  {isHolidayCell ? (
                    <span
                      title={`🎉 Official Holiday: ${holidayName || "Holiday"}`}
                      className="text-[10px] font-bold text-purple-800 bg-purple-100 border border-purple-200 px-1.5 py-0.2 rounded truncate max-w-[70%] shadow-2xs"
                    >
                      🎉 {holidayName || "Holiday"}
                    </span>
                  ) : isSundayCell ? (
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/80 px-1.5 py-0.2 rounded">
                      Sun Off
                    </span>
                  ) : isLastSatCell ? (
                    <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-100/80 px-1.5 py-0.2 rounded">
                      Sat Off
                    </span>
                  ) : isWeekOffCell ? (
                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-100/70 px-1.5 py-0.2 rounded">
                      Off
                    </span>
                  ) : isLeaveCell ? (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-100/80 px-1.5 py-0.2 rounded">
                      Leave
                    </span>
                  ) : (
                    <span />
                  )}
                  <span
                    className={`text-xs font-medium font-sans ${
                      !cell.isCurrentMonth
                        ? "text-gray-300"
                        : isTodayCell
                          ? "font-bold text-amber-900 bg-amber-200/80 px-1.5 py-0.5 rounded-full"
                          : isHolidayCell
                            ? "text-purple-950 font-bold"
                            : isWeekOffCell
                              ? "text-blue-900 font-semibold"
                              : isLeaveCell
                                ? "text-amber-900 font-semibold"
                                : "text-gray-600"
                    }`}
                  >
                    {cell.dayNumber}
                  </span>
                </div>

                {/* 2-Half Pill Component in Center */}
                <div className="my-auto py-1">
                  {renderCellPill(cell)}
                </div>

                {/* Bottom subtle punch count indicator */}
                <div className="text-[10px] text-gray-400 font-mono text-right h-3">
                  {cell.dayData?.punchCount && cell.dayData.punchCount > 0 ? (
                    <span className="hover:text-gray-700">
                      {cell.dayData.punchCount} {cell.dayData.punchCount === 1 ? "punch" : "punches"}
                    </span>
                  ) : isHolidayCell ? (
                    <span className="text-[9px] text-purple-700 font-bold truncate block" title={holidayName}>
                      🎉 {holidayName || "Holiday Off"}
                    </span>
                  ) : isSundayCell ? (
                    <span className="text-[9px] text-blue-500 font-medium">Sunday Off</span>
                  ) : isLastSatCell ? (
                    <span className="text-[9px] text-indigo-500 font-medium">Last Sat Off</span>
                  ) : isWeekOffCell ? (
                    <span className="text-[9px] text-blue-500 font-medium">Week Off</span>
                  ) : isLeaveCell ? (
                    <span className="text-[9px] text-amber-600 font-medium">Leave</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Calendar Legend Bar (bottom footer) */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-wrap gap-3 text-xs text-gray-600 font-medium">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded border border-emerald-400 bg-emerald-100" />
              <strong>P | P</strong>: Full Day Present
            </span>

            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded border border-purple-400 bg-purple-100" />
              <strong>🎉 Holiday</strong>: Official Holiday (HR Declared)
            </span>

            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded border border-blue-400 bg-blue-100" />
              <strong>O | O</strong>: Weekly Off (Sundays & Last Sat)
            </span>

            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded border border-rose-400 bg-rose-100" />
              <strong>A | A</strong>: Absent (No Punches)
            </span>

            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded border border-sky-400 bg-sky-100" />
              <strong>EL | P / P | EL</strong>: Earned Leave Half Day
            </span>

            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded border border-amber-400 bg-amber-100" />
              <strong>CL | P / P | CL</strong>: Casual Leave Half Day
            </span>

            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded border border-purple-400 bg-purple-100" />
              <strong>SL | P / P | SL</strong>: Sick Leave Half Day
            </span>

            <span className="flex items-center gap-1.5">
              <span className="text-rose-600 font-bold">⏰</span>
              <strong>Clock</strong>: Late (&gt; 10:05:59 AM) • 2 allowed/mo
            </span>

            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded border border-rose-500 bg-rose-100" />
              <strong>LWP | LWP</strong>: 3rd Late Mark Full Day Deduction
            </span>

            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded border border-rose-400 bg-rose-100" />
              <strong>LWP | P / P | LWP</strong>: 4th Late Mark or Half Day Without Leave
            </span>
          </div>

          <div className="text-gray-500 text-[11px] font-sans">
            💡 Click any date to <strong>Apply Leave</strong>, <strong>Request Correction</strong>, or <strong>View Punches</strong>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* MODAL 1: DATE ACTION HUB                                      */}
      {/* ============================================================= */}
      <Modal
        isOpen={Boolean(clickedDateCell)}
        onClose={() => setClickedDateCell(null)}
        title={clickedDateCell ? `${formatDate(clickedDateCell.dateStr)}` : "Date Actions"}
        description={`Attendance & Leave Actions for ${currentEmployee?.name} (${currentEmployee?.employeeCode}).`}
      >
        {clickedDateCell && (
          <div className="space-y-4">
            {/* Holiday Announcement Banner if this is a declared holiday */}
            {Boolean(clickedDateCell.dayData?.isHoliday || holidayMap[clickedDateCell.dateStr]) && (
              <div className="p-4 bg-gradient-to-r from-purple-50 via-pink-50 to-indigo-50 rounded-xl border border-purple-200 flex items-start gap-3 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 text-xl border border-purple-200">
                  🎉
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-purple-950">
                      Official Holiday: {clickedDateCell.dayData?.holidayName || holidayMap[clickedDateCell.dateStr]}
                    </h4>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-200/80 text-purple-800">
                      Office Closed
                    </span>
                  </div>
                  <p className="text-xs text-purple-800 mt-1 leading-relaxed">
                    Official organization holiday declared by HR Admin. Attendance is fully excused and no leave balance or salary deduction applies.
                  </p>
                </div>
              </div>
            )}

            {/* Weekly Off Announcement if Sunday or Last Saturday (and not a declared holiday) */}
            {!Boolean(clickedDateCell.dayData?.isHoliday || holidayMap[clickedDateCell.dateStr]) &&
              Boolean(
                new Date(clickedDateCell.dateStr).getDay() === 0 ||
                isLastSaturdayOfMonth(clickedDateCell.dateStr) ||
                clickedDateCell.dayData?.isWeekOff ||
                clickedDateCell.dayData?.displayCode === "O | O"
              ) && (
                <div className="p-3.5 bg-blue-50/80 rounded-xl border border-blue-200 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 text-base">
                    🏖️
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-blue-950">
                      {new Date(clickedDateCell.dateStr).getDay() === 0
                        ? "Standard Weekly Off (Sunday)"
                        : isLastSaturdayOfMonth(clickedDateCell.dateStr)
                          ? "Standard Weekly Off (Last Saturday of Month)"
                          : "Company Scheduled Weekly Off"}
                    </h4>
                    <p className="text-[11px] text-blue-700 mt-0.5">
                      Regular organization week off. No punches required.
                    </p>
                  </div>
                </div>
              )}

            {/* Day Header Info Card */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-medium">
                  Scheduled Shift: {clickedDateCell.dayData?.scheduledShift || "General Shift (10:00 - 19:00)"}
                </p>
                <p className="text-xs text-slate-700 font-semibold mt-0.5">
                  Logged In: {clickedDateCell.dayData?.firstIn ? formatTime(clickedDateCell.dayData.firstIn) : "--:--"} • Out:{" "}
                  {clickedDateCell.dayData?.lastOut ? formatTime(clickedDateCell.dayData.lastOut) : "--:--"}
                </p>
              </div>
              {/* LWP Penalty Alert (3rd/5th/7th late) */}
              {clickedDateCell.dayData?.isLwpPenaltyApplied && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-rose-900">
                      Full Day LWP Penalty Applied ({clickedDateCell.dayData.lateOccurrenceNumber}
                      {getOrdinalSuffix(clickedDateCell.dayData.lateOccurrenceNumber || 3)} Late Mark)
                    </p>
                    <p className="text-rose-700 mt-0.5 leading-relaxed">
                      Monthly late limit (2) exhausted. This day is treated as <strong>Leave Without Pay</strong> — 1 full day salary deduction applies.
                    </p>
                  </div>
                </div>
              )}

              {/* Half Day Penalty Alert (4th/6th/8th late) */}
              {clickedDateCell.dayData?.isLatePenaltyApplied && !clickedDateCell.dayData?.isLwpPenaltyApplied && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-amber-900">
                      Half Day Penalty Applied ({clickedDateCell.dayData.lateOccurrenceNumber}
                      {getOrdinalSuffix(clickedDateCell.dayData.lateOccurrenceNumber || 4)} Late Mark)
                    </p>
                    <p className="text-amber-700 mt-0.5 leading-relaxed">
                      This day is converted to a <strong>Half Day</strong> — 0.5 day salary deduction applies.
                    </p>
                  </div>
                </div>
              )}
              <div className="text-right">
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-white border border-slate-300 text-slate-800">
                  {clickedDateCell.dayData?.displayCode || "A | A"}
                </span>
              </div>
            </div>

            {/* 3 Prominent Action Cards */}
            <div className="space-y-2.5">
              {/* Option 1: Apply Leave */}
              <button
                type="button"
                onClick={() => handleOpenApplyLeave(clickedDateCell.dateStr)}
                className="w-full p-3.5 rounded-xl border border-gray-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/40 transition-all text-left flex items-start gap-3 group shadow-xs hover:shadow"
              >
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <CalendarPlus className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900 group-hover:text-emerald-950">
                      Apply Leave
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-full">
                      EL • SL • CL
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Submit Full Day or Half Day leave request. Approver: <strong>{approverInfo.name}</strong> ({approverInfo.role}).
                  </p>
                </div>
              </button>

              {/* Option 2: Attendance Correction */}
              <button
                type="button"
                onClick={() => handleOpenCorrection(clickedDateCell.dateStr)}
                className="w-full p-3.5 rounded-xl border border-gray-200 bg-white hover:border-amber-500 hover:bg-amber-50/40 transition-all text-left flex items-start gap-3 group shadow-xs hover:shadow"
              >
                <div className="p-2 rounded-lg bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <Clock3 className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900 group-hover:text-amber-950">
                      Attendance Correction
                    </span>
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-full">
                      Regularization
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Request punch correction or timing regularize if biometric reader missed punch or was offline.
                  </p>
                </div>
              </button>

              {/* Option 3: Show Attendance Logs */}
              <button
                type="button"
                onClick={() => {
                  const detail = clickedDateCell.dayData || {
                    date: clickedDateCell.dateStr,
                    dayNumber: clickedDateCell.dayNumber,
                    firstIn: null,
                    lastOut: null,
                    workingHoursFormatted: "0h 0m",
                    displayCode: "A",
                    punches: [],
                  };
                  setSelectedDayDetail(detail as any);
                  setClickedDateCell(null);
                }}
                className="w-full p-3.5 rounded-xl border border-gray-200 bg-white hover:border-blue-500 hover:bg-blue-50/40 transition-all text-left flex items-start gap-3 group shadow-xs hover:shadow"
              >
                <div className="p-2 rounded-lg bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900 group-hover:text-blue-950">
                      Show Attendance Logs
                    </span>
                    <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded-full">
                      {clickedDateCell.dayData?.punchCount || 0} Punches
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    Inspect raw biometric device logs, hardware terminals, in/out timestamps, and working hours.
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ============================================================= */}
      {/* MODAL 2: APPLY LEAVE (EL, SL, CL, LWP)                        */}
      {/* ============================================================= */}
      <Modal
        isOpen={isApplyLeaveOpen}
        onClose={() => setIsApplyLeaveOpen(false)}
        title="Apply for Leave"
        description={`Submit leave request for ${currentEmployee?.name} (${currentEmployee?.employeeCode}).`}
      >
        <form onSubmit={handleSubmitLeave} className="space-y-4">
          {/* Balance Quota Summary Cards (EL, SL, CL only) */}
          <div className="grid grid-cols-3 gap-2">
            {balances
              .filter((b) => b.leaveTypeCode !== "LWP")
              .map((b) => (
                <div
                  key={b.leaveTypeCode}
                  onClick={() => setLeaveTypeCode(b.leaveTypeCode as any)}
                  className={`p-2.5 rounded-xl border text-center cursor-pointer transition-all ${leaveTypeCode === b.leaveTypeCode
                    ? "border-emerald-500 bg-emerald-50/70 shadow-xs ring-1 ring-emerald-500"
                    : "border-gray-200 bg-gray-50/50 hover:bg-gray-100/60"
                    }`}
                >
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">
                    {b.leaveTypeCode}
                  </span>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">
                    {Number(b.remainingCount).toFixed(1)}
                  </p>
                  <span className="text-[10px] text-gray-400">Remaining</span>
                </div>
              ))}
          </div>

          {/* Leave Type Selector (EL, SL, CL only) */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Leave Category:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["EL", "SL", "CL"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setLeaveTypeCode(type)}
                  className={`py-2 text-xs font-bold rounded-lg border transition-all ${leaveTypeCode === type
                    ? "bg-gray-900 text-white border-gray-900 shadow-xs"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                >
                  {type === "EL" && "Earned (EL)"}
                  {type === "SL" && "Sick (SL)"}
                  {type === "CL" && "Casual (CL)"}
                </button>
              ))}
            </div>
          </div>

          {/* Duration Selector: Full Day vs Half Day */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Leave Duration:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLeaveDuration("FULL")}
                className={`py-2 text-xs font-bold rounded-lg border transition-all ${leaveDuration === "FULL"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
              >
                Full Day (1.0 Day)
              </button>

              <button
                type="button"
                onClick={() => setLeaveDuration("HALF")}
                className={`py-2 text-xs font-bold rounded-lg border transition-all ${leaveDuration === "HALF"
                  ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
              >
                Half Day (0.5 Day)
              </button>
            </div>
          </div>

          {/* If Half Day: Which session */}
          {leaveDuration === "HALF" && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs">
              <span className="font-semibold text-amber-900 block mb-1.5">
                Select Half Day Session:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setHalfSession("FIRST_HALF")}
                  className={`py-1.5 text-xs font-semibold rounded-lg border ${halfSession === "FIRST_HALF"
                    ? "bg-amber-700 text-white border-amber-700"
                    : "bg-white text-amber-900 border-amber-200"
                    }`}
                >
                  First Half (10:00 - 14:00)
                </button>

                <button
                  type="button"
                  onClick={() => setHalfSession("SECOND_HALF")}
                  className={`py-1.5 text-xs font-semibold rounded-lg border ${halfSession === "SECOND_HALF"
                    ? "bg-amber-700 text-white border-amber-700"
                    : "bg-white text-amber-900 border-amber-200"
                    }`}
                >
                  Second Half (14:00 - Out)
                </button>
              </div>
            </div>
          )}

          {/* Date Pickers */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                From Date:
              </label>
              <input
                type="date"
                value={leaveStartDate}
                onChange={(e) => {
                  setLeaveStartDate(e.target.value);
                  if (leaveEndDate < e.target.value) setLeaveEndDate(e.target.value);
                }}
                className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 font-medium focus:outline-none focus:border-gray-950"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                To Date:
              </label>
              <input
                type="date"
                value={leaveDuration === "HALF" ? leaveStartDate : leaveEndDate}
                disabled={leaveDuration === "HALF"}
                onChange={(e) => setLeaveEndDate(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 font-medium focus:outline-none focus:border-gray-950 disabled:bg-gray-100 disabled:text-gray-400"
                required
              />
            </div>
          </div>

          {/* Reason Textarea */}
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Reason / Justification:
            </label>
            <textarea
              rows={2}
              value={leaveReason}
              onChange={(e) => setLeaveReason(e.target.value)}
              placeholder="e.g. Personal emergency, family function, medical appointment..."
              className="w-full p-2.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-gray-950"
              required
            />
          </div>

          {/* Designated Approver Info Box */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] text-gray-400 uppercase font-semibold block">
                Designated Approver
              </span>
              <span className="font-bold text-gray-900">
                {approverInfo.name}
              </span>
              <span className="text-gray-500 ml-1">({approverInfo.role})</span>
            </div>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsApplyLeaveOpen(false)}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmittingLeave}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Submit Application
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================= */}
      {/* MODAL 3: ATTENDANCE CORRECTION (REGULARIZATION)               */}
      {/* ============================================================= */}
      <Modal
        isOpen={isCorrectionOpen}
        onClose={() => setIsCorrectionOpen(false)}
        title="Attendance Correction Request"
        description={`Request punch regularization for ${currentEmployee?.name} on ${corrDate}.`}
      >
        <form onSubmit={handleSubmitCorrection} className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 leading-relaxed">
            Use this form if biometric sensor didn't record your thumb/face punch or you were away on an authorized duty.
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Date:
            </label>
            <input
              type="date"
              value={corrDate}
              onChange={(e) => setCorrDate(e.target.value)}
              className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 font-medium focus:outline-none focus:border-gray-950"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Proposed Punch In:
              </label>
              <input
                type="time"
                value={corrInTime}
                onChange={(e) => setCorrInTime(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 font-mono font-semibold"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">
                Proposed Punch Out:
              </label>
              <input
                type="time"
                value={corrOutTime}
                onChange={(e) => setCorrOutTime(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 font-mono font-semibold"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Reason for Correction:
            </label>
            <textarea
              rows={2}
              value={corrReason}
              onChange={(e) => setCorrReason(e.target.value)}
              placeholder="e.g. Device sensor error, forgot punch out, client site visit..."
              className="w-full p-2.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-gray-950"
              required
            />
          </div>

          {/* Approver preview */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] text-gray-400 uppercase font-semibold block">
                Reporting Manager / Approver
              </span>
              <span className="font-bold text-gray-900">{approverInfo.name}</span>
              <span className="text-gray-500 ml-1">({approverInfo.role})</span>
            </div>
            <Clock3 className="w-4 h-4 text-amber-600" />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCorrectionOpen(false)}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmittingCorr}
              leftIcon={<Send className="w-3.5 h-3.5" />}
            >
              Submit Correction
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================= */}
      {/* MODAL 4: PENDING LEAVE APPROVALS (TL / HR ADMIN)              */}
      {/* ============================================================= */}
      <Modal
        isOpen={isApprovalsModalOpen}
        onClose={() => setIsApprovalsModalOpen(false)}
        title={`Pending Leave Approvals (${pendingApprovals.length})`}
        description="Review and decide on employee leave applications for your team."
      >
        <div className="space-y-3">
          {pendingApprovals.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-gray-800">No pending leave applications!</p>
              <p className="text-gray-400 mt-1">All leave requests from your team have been reviewed.</p>
            </div>
          ) : (
            pendingApprovals.map((req) => (
              <div
                key={req.id}
                className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-xs space-y-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-gray-950 text-sm">
                      {req.employeeName}
                    </span>
                    <span className="text-gray-400 font-mono ml-1.5">
                      [{req.employeeCode}]
                    </span>
                    <span className="text-gray-500 block text-[11px]">
                      {req.departmentName}
                    </span>
                  </div>

                  <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                    {req.leaveTypeCode} • {req.totalDays} Day{req.totalDays > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="p-2.5 bg-gray-50 rounded-lg text-gray-700">
                  <p className="text-[11px] text-gray-500 font-mono">
                    Dates: <strong>{req.startDate}</strong> {req.startDate !== req.endDate ? `to ${req.endDate}` : ""}
                    {req.halfDay && ` (${req.halfDaySession === "FIRST_HALF" ? "First Half" : "Second Half"})`}
                  </p>
                  <p className="mt-1 font-sans text-gray-900">
                    "{req.reason}"
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => handleRejectLeave(req.id)}
                    disabled={rejectingId === req.id || approvingId === req.id}
                    className="px-3 py-1 rounded-lg text-xs font-semibold border border-rose-200 text-rose-700 hover:bg-rose-50 transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>

                  <button
                    onClick={() => handleApproveLeave(req.id)}
                    disabled={approvingId === req.id || rejectingId === req.id}
                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1 disabled:opacity-50 shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* ============================================================= */}
      {/* MODAL 5: DAY DETAIL & BIOMETRIC PUNCH TIMELINE MODAL          */}
      {/* ============================================================= */}
      <Modal
        isOpen={Boolean(selectedDayDetail)}
        onClose={() => setSelectedDayDetail(null)}
        title={`Biometric Punches • ${selectedDayDetail ? formatDate(selectedDayDetail.date) : ""}`}
        description={`Recorded attendance sensor events for ${monthlyData?.employeeName || currentEmployee?.name} (${monthlyData?.employeeCode || currentEmployee?.employeeCode}).`}>
        {selectedDayDetail && (
          <div className="space-y-4">
            {/* Header Status Card */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-950">
                  {monthlyData?.employeeName || currentEmployee?.name}
                </p>
                <p className="text-xs text-gray-500 font-mono mt-0.5">
                  First IN: {selectedDayDetail.firstIn ? formatTimeWithSeconds(selectedDayDetail.firstIn) : "--:--"} • Last OUT:{" "}
                  {selectedDayDetail.lastOut ? formatTimeWithSeconds(selectedDayDetail.lastOut) : "--:--"} • Logged:{" "}
                  {selectedDayDetail.lastOut
                    ? selectedDayDetail.workingHoursFormatted
                    : selectedDayDetail.firstIn
                      ? "In Progress"
                      : "--"}
                </p>
              </div>

              <div className="text-right">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold border ${selectedDayDetail.displayCode?.includes("LWP")
                    ? "bg-rose-100 text-rose-900 border-rose-400"
                    : selectedDayDetail.firstHalfStatus === "AB" || selectedDayDetail.secondHalfStatus === "AB"
                      ? "bg-amber-100 text-amber-900 border-amber-300"
                      : "bg-emerald-100 text-emerald-800 border-emerald-300"
                    }`}
                >
                  {selectedDayDetail.displayCode || "PRESENT"}
                </span>
                {selectedDayDetail.isLate && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1">
                    Late +{selectedDayDetail.lateMinutes} mins
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-xs">
                <span className="text-gray-500 uppercase font-bold text-[10px] block">
                  First Half (10:00 AM – 01:30 PM)
                </span>
                <p className="text-sm font-bold text-gray-950 mt-1 flex items-center gap-1.5">
                  {selectedDayDetail.firstHalfStatus === "LWP" ? (
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                  ) : selectedDayDetail.firstHalfStatus === "AB" || selectedDayDetail.firstHalfStatus === "A" ? (
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  ) : selectedDayDetail.firstHalfStatus === "P" || selectedDayDetail.firstHalfStatus === "PR" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  )}
                  <span
                    className={
                      selectedDayDetail.firstHalfStatus === "LWP"
                        ? "text-rose-700 font-bold"
                        : selectedDayDetail.firstHalfStatus === "AB" || selectedDayDetail.firstHalfStatus === "A"
                          ? "text-amber-700"
                          : selectedDayDetail.firstHalfStatus === "P" || selectedDayDetail.firstHalfStatus === "PR"
                            ? "text-emerald-700"
                            : "text-indigo-700 font-bold"
                    }
                  >
                    {selectedDayDetail.firstHalfStatus === "P" || selectedDayDetail.firstHalfStatus === "PR"
                      ? "Present"
                      : selectedDayDetail.firstHalfStatus === "LWP"
                        ? "LWP (Unpaid / No Leave)"
                        : selectedDayDetail.firstHalfStatus === "CL"
                          ? "Casual Leave (CL)"
                          : selectedDayDetail.firstHalfStatus === "SL"
                            ? "Sick Leave (SL)"
                            : selectedDayDetail.firstHalfStatus === "EL"
                              ? "Earned Leave (EL)"
                              : selectedDayDetail.firstHalfStatus === "AB" || selectedDayDetail.firstHalfStatus === "A"
                                ? "Absent"
                                : selectedDayDetail.firstHalfStatus
                                  ? `${selectedDayDetail.firstHalfStatus} (Leave)`
                                  : "Absent"}
                  </span>
                </p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-xs">
                <span className="text-gray-500 uppercase font-bold text-[10px] block">
                  Second Half (02:15 PM – Out Time)
                </span>
                <p className="text-sm font-bold text-gray-950 mt-1 flex items-center gap-1.5">
                  {selectedDayDetail.secondHalfStatus === "LWP" ? (
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                  ) : selectedDayDetail.secondHalfStatus === "AB" || selectedDayDetail.secondHalfStatus === "A" ? (
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  ) : selectedDayDetail.secondHalfStatus === "P" || selectedDayDetail.secondHalfStatus === "PR" ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  )}
                  <span
                    className={
                      selectedDayDetail.secondHalfStatus === "LWP"
                        ? "text-rose-700 font-bold"
                        : selectedDayDetail.secondHalfStatus === "AB" || selectedDayDetail.secondHalfStatus === "A"
                          ? "text-amber-700"
                          : selectedDayDetail.secondHalfStatus === "P" || selectedDayDetail.secondHalfStatus === "PR"
                            ? "text-emerald-700"
                            : "text-indigo-700 font-bold"
                    }
                  >
                    {selectedDayDetail.secondHalfStatus === "P" || selectedDayDetail.secondHalfStatus === "PR"
                      ? "Present"
                      : selectedDayDetail.secondHalfStatus === "LWP"
                        ? "LWP (Unpaid / No Leave)"
                        : selectedDayDetail.secondHalfStatus === "CL"
                          ? "Casual Leave (CL)"
                          : selectedDayDetail.secondHalfStatus === "SL"
                            ? "Sick Leave (SL)"
                            : selectedDayDetail.secondHalfStatus === "EL"
                              ? "Earned Leave (EL)"
                              : selectedDayDetail.secondHalfStatus === "AB" || selectedDayDetail.secondHalfStatus === "A"
                                ? "Absent"
                                : selectedDayDetail.secondHalfStatus
                                  ? `${selectedDayDetail.secondHalfStatus} (Leave)`
                                  : "Absent"}
                  </span>
                </p>
              </div>
            </div>

            {/* Sensor Events Timeline */}
            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Biometric Sensor Events ({selectedDayDetail.punches?.length || 0})
              </h5>

              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {selectedDayDetail.punches && selectedDayDetail.punches.length > 0 ? (
                  selectedDayDetail.punches.map((p, idx) => (
                    <div
                      key={p.id || idx}
                      className="p-2.5 bg-white rounded-lg border border-gray-200 text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono ${p.punchType === "IN"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-700 border border-slate-300"
                            }`}
                        >
                          Punch {p.punchType}
                        </span>
                        <span className="font-mono font-bold text-gray-900">
                          {formatTimeWithSeconds(p.punchTime)}
                        </span>
                      </div>

                      <span className="text-[11px] text-gray-500 font-mono">
                        Terminal Record #{p.sourceRecordId || p.id}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 bg-gray-50 text-center rounded-lg border border-gray-200 text-xs text-gray-500">
                    No hardware sensor punches on this date.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { CalendarPlus, Calendar, Clock, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { useHrms } from "../../lib/hrmsContext";
import { useAuth } from "../../lib/authContext";
import { useToast } from "../../lib/toastContext";
import { leaveApi } from "../../lib/api";

export interface ApplyLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeaveApplied?: () => void;
}

export function ApplyLeaveModal({ isOpen, onClose, onLeaveApplied }: ApplyLeaveModalProps) {
  const { leaveTypes, employees, applyLeave, leaveRequests } = useHrms();
  const { user } = useAuth();
  const toast = useToast();

  const currentEmp = employees.find(
    (e) =>
      e.id === user?.employeeId ||
      (user?.employeeCode && e.employeeCode?.toUpperCase() === user.employeeCode.toUpperCase()) ||
      (user?.email && e.email.toLowerCase() === user.email.toLowerCase())
  );

  // Sirf logged-in user — koi fallback employee nahi
  const [employeeId, setEmployeeId] = useState(
    currentEmp?.id || user?.employeeId || ""
  );

  useEffect(() => {
    setEmployeeId(currentEmp?.id || user?.employeeId || "");
  }, [currentEmp, user]);

  const [leaveTypeId, setLeaveTypeId] = useState(leaveTypes[0]?.id || "lt-cl");
  const [fromDate, setFromDate] = useState("2026-10-21");
  const [toDate, setToDate] = useState("2026-10-21");
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDaySession, setHalfDaySession] = useState<"MORNING" | "AFTERNOON">("AFTERNOON");
  const [reason, setReason] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedPolicy = leaveTypes.find((t) => t.id === leaveTypeId);

  // Identify applying employee and designated approver
  const applyingEmp = employees.find((e) => e.id === employeeId) || currentEmp;
  const approverInfo = React.useMemo(() => {
    if (!applyingEmp) return "Manager / Team Lead";
    const code = (applyingEmp.employeeCode || "").toUpperCase();
    const dept = (applyingEmp.department || "").toLowerCase();

    // If Team Lead applies -> Approver is HR Admin (Anvita Pawar GA137)
    if (code === "GA62" || code === "GA26" || code === "GA06" || code === "GA133" || code === "GA115") {
      return "Anvita Pawar (HR Admin)";
    }
    // If HR Admin applies -> Approver is Head HR (Vanshu Nalode)
    if (code === "GA137" || applyingEmp.email?.toLowerCase().includes("anvita")) {
      return "Vanshu Nalode (Head HR / Tenant Admin)";
    }
    // If employee is in IT team -> Approver is Ajay Pawar
    if (dept.includes("it") || dept.includes("information") || applyingEmp.departmentId === "6") {
      return "Ajay Pawar (IT Team Lead)";
    }
    if (dept.includes("learning") || dept.includes("l&d") || applyingEmp.departmentId === "8") {
      return "Neha Dube (L&D Team Lead)";
    }
    if (dept.includes("marketing") || dept.includes("dm") || applyingEmp.departmentId === "7") {
      return "Nasim Shaikh (Digital Marketing TL)";
    }
    if (dept.includes("corporate") || dept.includes("cr") || applyingEmp.departmentId === "10") {
      return "Shruti Das (Corporate Relations TL)";
    }
    if (dept.includes("sales") || applyingEmp.departmentId === "11") {
      return "Aditya Bhadouria (Sales Team Lead)";
    }
    return "Reporting Manager / Team Lead";
  }, [applyingEmp]);

  // Compute taken leaves for this employee and type
  const usedDays = leaveRequests
    .filter((l) => l.employeeId === employeeId && l.leaveTypeId === leaveTypeId && l.status === "APPROVED")
    .reduce((sum, l) => sum + (l.days || 0), 0);

  const availableQuota = selectedPolicy ? Math.max(0, selectedPolicy.annualQuota - usedDays) : 0;

  // Calculate days difference
  const calculateDays = () => {
    if (isHalfDay) return 0.5;
    try {
      const d1 = new Date(fromDate);
      const d2 = new Date(toDate);
      if (d2 < d1) return 0;
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays > 0 ? diffDays : 1;
    } catch {
      return 1;
    }
  };

  const daysCount = calculateDays();

  // Reset or adjust toDate if fromDate changes beyond it
  const handleFromDateChange = (val: string) => {
    setFromDate(val);
    setErrorMessage("");
    if (toDate < val) {
      setToDate(val);
    }
  };

  const handleToDateChange = (val: string) => {
    if (val < fromDate) {
      setErrorMessage("End date cannot be prior to the start date.");
    } else {
      setErrorMessage("");
    }
    setToDate(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      setErrorMessage("Aapka employee record nahi mila. HR se contact karein.");
      return;
    }
    if (!reason.trim()) {
      setErrorMessage("Please state a brief reason for the leave application.");
      return;
    }
    if (toDate < fromDate) {
      setErrorMessage("End date cannot be before start date.");
      return;
    }

    const effectiveEndDate = isHalfDay ? fromDate : toDate;

    // Client-side quick check: prevent multiple leaves on same day (full or half)
    const hasExisting = leaveRequests.some((l) => {
      if (l.employeeId !== employeeId || l.status === "REJECTED") return false;
      return l.fromDate <= effectiveEndDate && l.toDate >= fromDate;
    });
    if (hasExisting) {
      const msg = "Already applied! Iss date par pehle hi leave apply ho chuki hai (chahe Full Day ho ya Half Day, same date par dubara apply nahi kar sakte).";
      setErrorMessage(msg);
      toast.error("Already applied for this date!");
      return;
    }

    try {
      const code = selectedPolicy?.code || "CL";
      await leaveApi.applyLeave({
        leaveTypeCode: code,
        startDate: fromDate,
        endDate: effectiveEndDate,
        halfDay: isHalfDay,
        halfDaySession: isHalfDay ? (halfDaySession === "MORNING" ? "FIRST_HALF" : "SECOND_HALF") : null,
        reason: reason.trim(),
      });
      toast.success(`Leave applied successfully! Forwarded to ${approverInfo} for approval.`);
      setReason("");
      setErrorMessage("");
      onClose();
      if (onLeaveApplied) {
        onLeaveApplied();
      }
    } catch (err: any) {
      const errMsg = err?.message || "Failed to submit leave";
      if (
        errMsg.toLowerCase().includes("already applied") ||
        errMsg.toLowerCase().includes("exists") ||
        errMsg.toLowerCase().includes("overlap")
      ) {
        setErrorMessage("Already applied! Iss date par pehle hi leave apply ho chuki hai (chahe Full Day ho ya Half Day).");
        toast.error("Already applied for this date!");
        return;
      }
      // Fallback local save only if other network failure
      applyLeave({
        employeeId,
        leaveTypeId,
        fromDate,
        toDate: effectiveEndDate,
        days: daysCount,
        isHalfDay,
        halfDaySession: isHalfDay ? halfDaySession : undefined,
        reason: reason.trim(),
      });
      toast.success(`Leave request registered for ${approverInfo}!`);
      setReason("");
      setErrorMessage("");
      onClose();
      if (onLeaveApplied) {
        onLeaveApplied();
      }
    }
  };


  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Apply for Leave"
      description="Submit a formal leave application for manager approval and roster scheduling."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Applying Employee field */}
        {/* Applying Employee — ALWAYS the logged-in user, read-only for everyone */}
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block">
              Applying Employee
            </span>
            <p className="text-sm font-bold text-gray-950 mt-0.5">
              {currentEmp
                ? `${currentEmp.firstName} ${currentEmp.lastName}`
                : (user?.fullName || user?.name)}
              <span className="text-xs font-mono text-gray-500 font-normal ml-2">
                ({currentEmp?.employeeCode || user?.employeeCode || ""})
              </span>
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-gray-400 block">Designated Approver</span>
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              {approverInfo}
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Select
            label="Leave Category"
            value={leaveTypeId}
            onChange={(e) => setLeaveTypeId(e.target.value)}
            options={leaveTypes.map((t) => ({
              label: `${t.name} (${t.code}) - Quota: ${t.annualQuota} Days`,
              value: t.id,
            }))}
          />

          {/* Quota Balance Preview */}
          {selectedPolicy && (
            <div className="flex items-center justify-between text-[11px] text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
              <span className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: selectedPolicy.color }}
                />
                <span>Quota: {selectedPolicy.annualQuota} Days/Year</span>
              </span>
              <span className="font-semibold text-gray-900">
                {availableQuota} Days Remaining
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Input
            label="Start Date"
            type="date"
            value={fromDate}
            onChange={(e) => handleFromDateChange(e.target.value)}
            required
          />
          <Input
            label="End Date"
            type="date"
            value={isHalfDay ? fromDate : toDate}
            onChange={(e) => handleToDateChange(e.target.value)}
            disabled={isHalfDay}
            required
          />
        </div>

        {/* Half Day Options */}
        <div className="p-3 bg-gray-50/70 border border-gray-200/80 rounded-xl space-y-2.5">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="halfDayToggle"
              checked={isHalfDay}
              onChange={(e) => setIsHalfDay(e.target.checked)}
              className="rounded border-gray-300 text-gray-950 focus:ring-gray-950/20 w-4 h-4 cursor-pointer accent-gray-950"
            />
            <label
              htmlFor="halfDayToggle"
              className="text-xs font-semibold text-gray-900 cursor-pointer select-none"
            >
              Half-Day Leave Request (0.5 Working Day)
            </label>
          </div>

          {isHalfDay && (
            <div className="flex items-center gap-3 pl-6 pt-1">
              <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="halfDaySession"
                  checked={halfDaySession === "MORNING"}
                  onChange={() => setHalfDaySession("MORNING")}
                  className="accent-gray-950"
                />
                <span>Morning Session</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                <input
                  type="radio"
                  name="halfDaySession"
                  checked={halfDaySession === "AFTERNOON"}
                  onChange={() => setHalfDaySession("AFTERNOON")}
                  className="accent-gray-950"
                />
                <span>Afternoon Session</span>
              </label>
            </div>
          )}
        </div>

        {/* Total Duration Banner */}
        <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-gray-900">Total Requested Duration:</span>
          </div>
          <span className="font-bold text-xs text-gray-950 bg-white px-2.5 py-1 rounded-lg border border-gray-200/80 shadow-xs">
            {daysCount} {daysCount === 1 ? "Working Day" : "Working Days"}
          </span>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-gray-700">
            Reason / Purpose for Absence <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Attending family function at native place"
            rows={2}
            className="w-full p-2.5 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-950 focus:ring-2 focus:ring-gray-950/5 transition-all resize-none"
            required
          />
        </div>

        <div className="pt-3 flex justify-end gap-2.5 border-t border-gray-100">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit">
            Submit Application
          </Button>
        </div>
      </form>
    </Modal >
  );
}

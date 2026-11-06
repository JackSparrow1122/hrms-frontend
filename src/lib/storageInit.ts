import { storage, STORAGE_KEYS } from "./storage";
import {
  initialCompany,
  initialEmployees,
  initialDepartments,
  initialDesignations,
  initialBranches,
  initialShifts,
  initialLeaveTypes,
  initialHolidays,
  initialSalaryStructures,
  initialAttendanceRecords,
  initialRegularizations,
  initialLeaveRequests,
  initialPayrollRecords,
  initialPayslips,
  initialDocuments,
  initialNotifications,
  initialAuditLogs,
  initialSettings,
  initialJobs,
  initialCandidates,
  initialAssets,
  initialGoals,
  initialAppraisals,
} from "./seedData";
import { CurrentUser } from "../types/hrms";

export const DEFAULT_USER: CurrentUser = {
  id: "1",
  name: "System Administrator",
  email: "admin@gahrms.com",
  role: "SUPER_ADMIN",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  employeeId: "EMP-0001",
  designation: "System Administrator",
  department: "Executive Leadership",
};

export function initializeHrmsStorage(forceReset = false) {
  const isInitialized = storage.get<boolean>(STORAGE_KEYS.INITIALIZED, false);

  // ALWAYS purge mock seed employees, mock departments, mock designations, and mock branches
  // so that ONLY real PostgreSQL backend data is shown in the UI!
  const purgeMockData = () => {
    const existingEmployees = storage.get<any[]>(STORAGE_KEYS.EMPLOYEES, []);
    const realEmployees = existingEmployees.filter(
      (e: any) =>
        e &&
        e.employeeCode &&
        !e.employeeCode.startsWith("EMP-10") &&
        !String(e.id).startsWith("EMP-10") &&
        !e.email?.endsWith("@ga-hrms.io")
    );
    storage.set(STORAGE_KEYS.EMPLOYEES, realEmployees);

    const existingDepts = storage.get<any[]>(STORAGE_KEYS.DEPARTMENTS, []);
    const realDepts = existingDepts.filter((d: any) => d && !String(d.id).startsWith("dept-") && !["1","2","3","4","5"].includes(String(d.id)));
    storage.set(STORAGE_KEYS.DEPARTMENTS, realDepts);

    const existingBranches = storage.get<any[]>(STORAGE_KEYS.BRANCHES, []);
    const realBranches = existingBranches.filter((b: any) => b && !String(b.id).startsWith("branch-") && !["1","2"].includes(String(b.id)));
    storage.set(STORAGE_KEYS.BRANCHES, realBranches);

    const existingDesigs = storage.get<any[]>(STORAGE_KEYS.DESIGNATIONS, []);
    const realDesigs = existingDesigs.filter((ds: any) => ds && !String(ds.id).startsWith("desig-") && !["1","2","3","4","5","6","7","8"].includes(String(ds.id)));
    storage.set(STORAGE_KEYS.DESIGNATIONS, realDesigs);

    // Sync official HR declared holidays if not already populated with 2026-2027 list
    const existingHols = storage.get<any[]>(STORAGE_KEYS.HOLIDAYS, []);
    const hasGudiPadwa = existingHols.some((h: any) => h && h.name && h.name.includes("Gudi Padwa"));
    if (!hasGudiPadwa || existingHols.length < 15) {
      storage.set(STORAGE_KEYS.HOLIDAYS, initialHolidays);
    }
  };

  purgeMockData();

  if (!isInitialized || forceReset) {
    storage.set(STORAGE_KEYS.COMPANY, initialCompany);
    storage.set(STORAGE_KEYS.USER, DEFAULT_USER);
    // Real PostgreSQL backend data only
    storage.set(STORAGE_KEYS.EMPLOYEES, []);
    storage.set(STORAGE_KEYS.DEPARTMENTS, []);
    storage.set(STORAGE_KEYS.DESIGNATIONS, []);
    storage.set(STORAGE_KEYS.BRANCHES, []);
    storage.set(STORAGE_KEYS.ATTENDANCE, initialAttendanceRecords);
    storage.set(STORAGE_KEYS.REGULARIZATIONS, initialRegularizations);
    storage.set(STORAGE_KEYS.LEAVE_TYPES, initialLeaveTypes);
    storage.set(STORAGE_KEYS.LEAVE_REQUESTS, initialLeaveRequests);
    storage.set(STORAGE_KEYS.HOLIDAYS, initialHolidays);
    storage.set(STORAGE_KEYS.SHIFTS, initialShifts);
    storage.set(STORAGE_KEYS.SALARY_STRUCTURES, initialSalaryStructures);
    storage.set(STORAGE_KEYS.PAYROLL, initialPayrollRecords);
    storage.set(STORAGE_KEYS.PAYSLIPS, initialPayslips);
    storage.set(STORAGE_KEYS.DOCUMENTS, initialDocuments);
    storage.set(STORAGE_KEYS.NOTIFICATIONS, initialNotifications);
    storage.set(STORAGE_KEYS.AUDIT_LOGS, initialAuditLogs);
    storage.set(STORAGE_KEYS.SETTINGS, initialSettings);
    storage.set(STORAGE_KEYS.JOBS, initialJobs);
    storage.set(STORAGE_KEYS.CANDIDATES, initialCandidates);
    storage.set(STORAGE_KEYS.ASSETS, initialAssets);
    storage.set(STORAGE_KEYS.GOALS, initialGoals);
    storage.set(STORAGE_KEYS.APPRAISALS, initialAppraisals);
    storage.set(STORAGE_KEYS.INITIALIZED, true);
  } else {
    // Migration guard: ensure new modules exist and have demo data if empty or missing
    const checkAndSeed = (key: string, seed: any[]) => {
      const existing = storage.get<any[]>(key, []);
      if (!Array.isArray(existing) || existing.length === 0) {
        storage.set(key, seed);
      }
    };
    checkAndSeed(STORAGE_KEYS.JOBS, initialJobs);
    checkAndSeed(STORAGE_KEYS.CANDIDATES, initialCandidates);
    checkAndSeed(STORAGE_KEYS.ASSETS, initialAssets);
    checkAndSeed(STORAGE_KEYS.GOALS, initialGoals);
    checkAndSeed(STORAGE_KEYS.APPRAISALS, initialAppraisals);
  }
}

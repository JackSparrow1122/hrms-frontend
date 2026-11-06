import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  Employee,
  Department,
  Designation,
  Branch,
  Company,
  AttendanceRecord,
  AttendanceRegularization,
  LeaveType,
  LeaveRequest,
  Holiday,
  Shift,
  SalaryStructure,
  PayrollRecord,
  Payslip,
  EmployeeDocument,
  NotificationItem,
  AuditLog,
  CompanySettings,
  JobPosting,
  Candidate,
  CompanyAsset,
  PerformanceGoal,
  AppraisalReview,
  Gender,
  EmploymentStatus,
} from "../types/hrms";
import { storage, STORAGE_KEYS } from "./storage";
import { useAuth } from "./authContext";
import { useToast } from "./toastContext";
import { calculateSalaryComponents, recordAuditLog } from "./utils";
import {
  orgApi,
  employeeApi,
  tenantApi,
  CreateEmployeePayload,
  BackendCompany,
  TenantItem,
  CreateTenantPayload,
  EmployeeSummary,
} from "./api";
import {
  initialEmployees,
  initialDepartments,
  initialDesignations,
  initialBranches,
  initialJobs,
  initialCandidates,
  initialAssets,
  initialGoals,
  initialAppraisals,
} from "./seedData";

interface HrmsContextType {
  // State
  company: Company;
  employees: Employee[];
  departments: Department[];
  designations: Designation[];
  branches: Branch[];
  attendance: AttendanceRecord[];
  regularizations: AttendanceRegularization[];
  leaveTypes: LeaveType[];
  leaveRequests: LeaveRequest[];
  holidays: Holiday[];
  shifts: Shift[];
  salaryStructures: SalaryStructure[];
  payroll: PayrollRecord[];
  payslips: Payslip[];
  documents: EmployeeDocument[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
  settings: CompanySettings;
  jobs: JobPosting[];
  candidates: Candidate[];
  assets: CompanyAsset[];
  performanceGoals: PerformanceGoal[];
  appraisalReviews: AppraisalReview[];
  eligibleManagers: EmployeeSummary[];

  // Actions
  addEmployee: (employee: Omit<Employee, "id">) => Employee;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;

  addDepartment: (dept: Omit<Department, "id">) => Department;
  updateDepartment: (id: string, updates: Partial<Department>) => void;
  deleteDepartment: (id: string) => void;

  addDesignation: (desig: Omit<Designation, "id">) => Designation;
  updateDesignation: (id: string, updates: Partial<Designation>) => void;
  deleteDesignation: (id: string) => void;

  addShift: (shift: Omit<Shift, "id">) => Shift;
  updateShift: (id: string, updates: Partial<Shift>) => void;

  addHoliday: (holiday: Omit<Holiday, "id">) => Holiday;
  deleteHoliday: (id: string) => void;

  applyLeave: (request: Omit<LeaveRequest, "id" | "appliedDate" | "status">) => void;
  approveLeave: (id: string) => void;
  rejectLeave: (id: string, reason?: string) => void;

  applyRegularization: (reg: Omit<AttendanceRegularization, "id" | "appliedDate" | "status">) => void;
  approveRegularization: (id: string) => void;
  rejectRegularization: (id: string, comment?: string) => void;

  punchAttendance: (employeeId: string, type: "IN" | "OUT") => void;
  processPayrollRun: (month: string, employeeIds: string[]) => void;

  updateLeavePolicy: (id: string, updates: Partial<LeaveType>) => void;
  updateSettings: (updates: Partial<CompanySettings>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  uploadDocument: (doc: Omit<EmployeeDocument, "id" | "uploadDate">) => void;
  resetAllData: () => void;

  // New modules actions
  addJob: (job: Omit<JobPosting, "id" | "postedDate" | "applicantsCount">) => JobPosting;
  updateJobStatus: (id: string, status: JobPosting["status"]) => void;
  addCandidate: (candidate: Omit<Candidate, "id" | "appliedDate">) => Candidate;
  updateCandidateStage: (id: string, stage: Candidate["stage"]) => void;
  addAsset: (asset: Omit<CompanyAsset, "id">) => CompanyAsset;
  allocateAsset: (assetId: string, employeeId: string, employeeName: string) => void;
  returnAsset: (assetId: string) => void;
  addGoal: (goal: Omit<PerformanceGoal, "id">) => PerformanceGoal;
  updateGoalProgress: (id: string, progress: number) => void;
  submitAppraisalReview: (reviewId: string, managerRating: number, feedback: string) => void;
  syncBackendData: (explicitCompanyId?: number) => Promise<void>;
  activeCompanyId: number;
  allCompanies: BackendCompany[];
  switchActiveCompany: (companyId: number) => Promise<void>;
  onboardOrganization: (data: CreateTenantPayload) => Promise<TenantItem>;
  terminateOrganization: (companyId: number) => Promise<void>;
}

const HrmsContext = createContext<HrmsContextType | undefined>(undefined);

export const HrmsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const toast = useToast();

  const [activeCompanyId, setActiveCompanyId] = useState<number>(() => {
    const saved = storage.get<number>("hrms_active_company_id", 2);
    return saved || 2;
  });
  const [allCompanies, setAllCompanies] = useState<BackendCompany[]>([]);

  useEffect(() => {
    if (user && user.role !== "SUPER_ADMIN" && user.companyId) {
      setActiveCompanyId(Number(user.companyId));
      storage.set("hrms_active_company_id", Number(user.companyId));
    }
  }, [user]);

  // Load state from localStorage - filter out any legacy mock seed entities
  const [company, setCompany] = useState<Company>(() => storage.get(STORAGE_KEYS.COMPANY, {} as Company));
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const raw = storage.get<Employee[]>(STORAGE_KEYS.EMPLOYEES, []);
    const hasLegacy = raw.some((e) => e.firstName === "Rahul" || e.firstName === "Priya" || e.firstName === "Amit" || e.employeeCode === "EMP-0001");
    if (!raw || raw.length === 0 || hasLegacy) {
      storage.set(STORAGE_KEYS.EMPLOYEES, initialEmployees);
      return initialEmployees;
    }
    return raw;
  });
  const [departments, setDepartments] = useState<Department[]>(() => {
    const raw = storage.get<Department[]>(STORAGE_KEYS.DEPARTMENTS, []);
    const hasLegacy = raw.some((d) => d.code === "DEP-ENG" || d.code === "DEP-FIN");
    if (!raw || raw.length === 0 || hasLegacy) {
      storage.set(STORAGE_KEYS.DEPARTMENTS, initialDepartments);
      return initialDepartments;
    }
    return raw;
  });
  const [designations, setDesignations] = useState<Designation[]>(() => {
    const raw = storage.get<Designation[]>(STORAGE_KEYS.DESIGNATIONS, []);
    if (!raw || raw.length === 0) {
      storage.set(STORAGE_KEYS.DESIGNATIONS, initialDesignations);
      return initialDesignations;
    }
    const filtered = raw.filter((d) => !d.id?.startsWith("desig-"));
    return filtered.length > 0 ? filtered : initialDesignations;
  });
  const [branches, setBranches] = useState<Branch[]>(() => {
    const raw = storage.get<Branch[]>(STORAGE_KEYS.BRANCHES, []);
    const filtered = raw.filter((b) => !b.id?.startsWith("branch-") && !["1","2"].includes(String(b.id)));
    return filtered;
  });
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => storage.get(STORAGE_KEYS.ATTENDANCE, []));
  const [regularizations, setRegularizations] = useState<AttendanceRegularization[]>(() =>
    storage.get(STORAGE_KEYS.REGULARIZATIONS, [])
  );
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>(() => storage.get(STORAGE_KEYS.LEAVE_TYPES, []));
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() => storage.get(STORAGE_KEYS.LEAVE_REQUESTS, []));
  const [holidays, setHolidays] = useState<Holiday[]>(() => storage.get(STORAGE_KEYS.HOLIDAYS, []));
  const [shifts, setShifts] = useState<Shift[]>(() => storage.get(STORAGE_KEYS.SHIFTS, []));
  const [salaryStructures, setSalaryStructures] = useState<SalaryStructure[]>(() =>
    storage.get(STORAGE_KEYS.SALARY_STRUCTURES, [])
  );
  const [payroll, setPayroll] = useState<PayrollRecord[]>(() => storage.get(STORAGE_KEYS.PAYROLL, []));
  const [payslips, setPayslips] = useState<Payslip[]>(() => storage.get(STORAGE_KEYS.PAYSLIPS, []));
  const [documents, setDocuments] = useState<EmployeeDocument[]>(() => storage.get(STORAGE_KEYS.DOCUMENTS, []));
  const [notifications, setNotifications] = useState<NotificationItem[]>(() =>
    storage.get(STORAGE_KEYS.NOTIFICATIONS, [])
  );
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => storage.get(STORAGE_KEYS.AUDIT_LOGS, []));
  const [settings, setSettings] = useState<CompanySettings>(() => storage.get(STORAGE_KEYS.SETTINGS, {} as CompanySettings));
  const [jobs, setJobs] = useState<JobPosting[]>(() => {
    const data = storage.get<JobPosting[]>(STORAGE_KEYS.JOBS, []);
    return data && data.length > 0 ? data : initialJobs;
  });
  const [candidates, setCandidates] = useState<Candidate[]>(() => {
    const data = storage.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []);
    return data && data.length > 0 ? data : initialCandidates;
  });
  const [assets, setAssets] = useState<CompanyAsset[]>(() => {
    const data = storage.get<CompanyAsset[]>(STORAGE_KEYS.ASSETS, []);
    return data && data.length > 0 ? data : initialAssets;
  });
  const [performanceGoals, setPerformanceGoals] = useState<PerformanceGoal[]>(() => {
    const data = storage.get<PerformanceGoal[]>(STORAGE_KEYS.GOALS, []);
    return data && data.length > 0 ? data : initialGoals;
  });
  const [appraisalReviews, setAppraisalReviews] = useState<AppraisalReview[]>(() => {
    const data = storage.get<AppraisalReview[]>(STORAGE_KEYS.APPRAISALS, []);
    return data && data.length > 0 ? data : initialAppraisals;
  });
  const [eligibleManagers, setEligibleManagers] = useState<EmployeeSummary[]>([]);

  // Ensure seed data is synced into storage if initially empty
  useEffect(() => {
    if (jobs.length > 0 && storage.get<JobPosting[]>(STORAGE_KEYS.JOBS, []).length === 0) {
      storage.set(STORAGE_KEYS.JOBS, jobs);
    }
    if (candidates.length > 0 && storage.get<Candidate[]>(STORAGE_KEYS.CANDIDATES, []).length === 0) {
      storage.set(STORAGE_KEYS.CANDIDATES, candidates);
    }
    if (assets.length > 0 && storage.get<CompanyAsset[]>(STORAGE_KEYS.ASSETS, []).length === 0) {
      storage.set(STORAGE_KEYS.ASSETS, assets);
    }
    if (performanceGoals.length > 0 && storage.get<PerformanceGoal[]>(STORAGE_KEYS.GOALS, []).length === 0) {
      storage.set(STORAGE_KEYS.GOALS, performanceGoals);
    }
    if (appraisalReviews.length > 0 && storage.get<AppraisalReview[]>(STORAGE_KEYS.APPRAISALS, []).length === 0) {
      storage.set(STORAGE_KEYS.APPRAISALS, appraisalReviews);
    }
  }, [jobs, candidates, assets, performanceGoals, appraisalReviews]);

  // Subscribe to storage changes
  useEffect(() => {
    const unsubscribe = storage.subscribe(({ key, value }) => {
      switch (key) {
        case STORAGE_KEYS.COMPANY: setCompany(value); break;
        case STORAGE_KEYS.EMPLOYEES: setEmployees(value); break;
        case STORAGE_KEYS.DEPARTMENTS: setDepartments(value); break;
        case STORAGE_KEYS.DESIGNATIONS: setDesignations(value); break;
        case STORAGE_KEYS.BRANCHES: setBranches(value); break;
        case STORAGE_KEYS.ATTENDANCE: setAttendance(value); break;
        case STORAGE_KEYS.REGULARIZATIONS: setRegularizations(value); break;
        case STORAGE_KEYS.LEAVE_TYPES: setLeaveTypes(value); break;
        case STORAGE_KEYS.LEAVE_REQUESTS: setLeaveRequests(value); break;
        case STORAGE_KEYS.HOLIDAYS: setHolidays(value); break;
        case STORAGE_KEYS.SHIFTS: setShifts(value); break;
        case STORAGE_KEYS.SALARY_STRUCTURES: setSalaryStructures(value); break;
        case STORAGE_KEYS.PAYROLL: setPayroll(value); break;
        case STORAGE_KEYS.PAYSLIPS: setPayslips(value); break;
        case STORAGE_KEYS.DOCUMENTS: setDocuments(value); break;
        case STORAGE_KEYS.NOTIFICATIONS: setNotifications(value); break;
        case STORAGE_KEYS.AUDIT_LOGS: setAuditLogs(value); break;
        case STORAGE_KEYS.SETTINGS: setSettings(value); break;
        case STORAGE_KEYS.JOBS: setJobs(value); break;
        case STORAGE_KEYS.CANDIDATES: setCandidates(value); break;
        case STORAGE_KEYS.ASSETS: setAssets(value); break;
        case STORAGE_KEYS.GOALS: setPerformanceGoals(value); break;
        case STORAGE_KEYS.APPRAISALS: setAppraisalReviews(value); break;
        case "*":
          // Storage cleared
          window.location.reload();
          break;
      }
    });
    return unsubscribe;
  }, []);

  // --- REAL BACKEND SYNCHRONIZATION (Auth, Org, Employees) ---
  const syncBackendData = useCallback(async (explicitCompanyId?: number) => {
    try {
      let targetCompanyId = explicitCompanyId ?? activeCompanyId;
      if (user && user.role !== "SUPER_ADMIN" && user.companyId) {
        targetCompanyId = Number(user.companyId);
      }

      // 1. Fetch real companies from PostgreSQL
      const companies = await orgApi.getCompanies().catch(() => null);
      if (companies && Array.isArray(companies) && companies.length > 0) {
        setAllCompanies(companies);
        const matched = companies.find((c) => c.id === targetCompanyId) || companies[0];
        targetCompanyId = matched.id;
        if (targetCompanyId !== activeCompanyId) {
          setActiveCompanyId(targetCompanyId);
          storage.set("hrms_active_company_id", targetCompanyId);
        }
        const backendCompany: Company = {
          id: String(matched.id),
          name: matched.legalName || "Global Automations HRMS Inc.",
          tagline: "Enterprise Workforce & People Platform",
          cin: matched.registrationNumber || "U72900MH2026PTC123456",
          gstin: matched.taxIdentifier || "27AADCG1234F1Z5",
          pan: matched.panNumber || "AADCG1234F",
          logo: "",
          website: matched.websiteUrl || "https://gahrms.com",
          phone: matched.phoneNumber || "+91 22 6123 4567",
          email: matched.email || "contact@gahrms.com",
          headquarters: `${matched.city || "Corporate"}, ${matched.state || "Maharashtra"}`,
        };
        setCompany(backendCompany);
        storage.set(STORAGE_KEYS.COMPANY, backendCompany);
      }

      const branchScopeId = user?.scopeType === "BRANCH" && user?.scopeBranchId ? Number(user.scopeBranchId) : undefined;

      // 2. Fetch real departments from PostgreSQL (Organization-wide, shared across all branches)
      const backendDepts = await orgApi.getDepartments(targetCompanyId).catch(() => null);
      if (backendDepts && Array.isArray(backendDepts) && backendDepts.length > 0) {
        const mappedDepts: Department[] = backendDepts.map((d) => ({
          id: String(d.id),
          name: d.name,
          code: d.code,
          headEmployeeId: "EMP-0001",
          headName: "Leadership Team",
          budget: 15000000,
          openPositions: 2,
          description: `${d.name} operational division.`,
          branchId: d.branchId ? String(d.branchId) : undefined,
          branchName: d.branchName || undefined,
        }));
        setDepartments(mappedDepts);
        storage.set(STORAGE_KEYS.DEPARTMENTS, mappedDepts);
      } else {
        setDepartments([]);
        storage.set(STORAGE_KEYS.DEPARTMENTS, []);
      }

      // 3. Fetch real branches from PostgreSQL
      const backendBranches = await orgApi.getBranches(targetCompanyId).catch(() => null);
      if (backendBranches && Array.isArray(backendBranches) && backendBranches.length > 0) {
        const mappedBranches: Branch[] = backendBranches.map((b) => ({
          id: String(b.id),
          name: b.name,
          code: b.code,
          city: b.city || "Mumbai",
          state: b.state || "Maharashtra",
          address: b.addressLine1 || "Corporate Office Park",
          headCount: b.employeeCount || b.headCount || 0,
          hrAdminId: b.hrAdminId ?? undefined,
          hrAdminName: b.hrAdminName ?? undefined,
          hrAdminEmail: b.hrAdminEmail ?? undefined,
        }));
        setBranches(mappedBranches);
        storage.set(STORAGE_KEYS.BRANCHES, mappedBranches);
      } else {
        setBranches([]);
        storage.set(STORAGE_KEYS.BRANCHES, []);
      }

      // 4. Fetch real designations from PostgreSQL (Organization-wide, shared across all branches)
      const backendDesignations = await orgApi.getDesignations(targetCompanyId).catch(() => null);
      if (backendDesignations && Array.isArray(backendDesignations) && backendDesignations.length > 0) {
        const mappedDesigs: Designation[] = backendDesignations.map((ds) => ({
          id: String(ds.id),
          title: ds.title || ds.name || ds.code,
          code: ds.code,
          departmentId: ds.departmentId ? String(ds.departmentId) : undefined,
          departmentName: ds.departmentName || undefined,
          branchId: ds.branchId ? String(ds.branchId) : undefined,
          branchName: ds.branchName || undefined,
          level: `L${ds.level || 1}`,
          minCtc: 600000,
          maxCtc: 2400000,
        }));
        setDesignations(mappedDesigs);
        storage.set(STORAGE_KEYS.DESIGNATIONS, mappedDesigs);
      } else {
        setDesignations([]);
        storage.set(STORAGE_KEYS.DESIGNATIONS, []);
      }

      // 5. Fetch real employees from PostgreSQL (All 52 real employees)
      const empParams: { companyId?: number; branchId?: number; size?: number } = { companyId: targetCompanyId, size: 100 };
      if (branchScopeId) {
        empParams.branchId = branchScopeId;
      }
      const backendEmpPage = await employeeApi.getEmployees(empParams).catch(() => null);
      if (backendEmpPage && backendEmpPage.content && Array.isArray(backendEmpPage.content) && backendEmpPage.content.length > 0) {
        const mappedEmployees: Employee[] = backendEmpPage.content.map((b) => ({
          id: String(b.id),
          employeeCode: b.employeeCode,
          firstName: b.firstName,
          lastName: b.lastName,
          email: b.email,
          phone: b.phoneNumber || "+91 98200 00000",
          gender: (b.gender?.toUpperCase() === "FEMALE" ? "FEMALE" : "MALE") as Gender,
          dob: b.dateOfBirth || "1996-05-15",
          avatar:
            b.gender?.toUpperCase() === "FEMALE"
              ? "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150"
              : "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
          departmentId: b.departmentId ? String(b.departmentId) : undefined,
          designationId: b.designationId ? String(b.designationId) : undefined,
          branchId: b.branchId ? String(b.branchId) : undefined,
          managerId: b.managerId ? String(b.managerId) : undefined,
          joiningDate: b.joiningDate || "2026-10-01",
          employmentType: "FULL_TIME",
          status: (b.status as EmploymentStatus) || "ACTIVE",
          shiftId: "shift-gen",
          pan: "ABCDE1234F",
          aadhaar: "4512 7890 2345",
          uan: "100912457899",
          esicNumber: "3100456799",
          bankName: "HDFC Bank Ltd.",
          accountNumber: "50100456789123",
          ifscCode: "HDFC0000052",
          accountHolderName: b.fullName || `${b.firstName} ${b.lastName}`,
          monthlyCtc: 85000,
          annualCtc: 85000 * 12,
        }));

        setEmployees(mappedEmployees);
        storage.set(STORAGE_KEYS.EMPLOYEES, mappedEmployees);
      } else {
        // Fallback to initialEmployees (all 52 real Gryphon Academy employees)
        setEmployees(initialEmployees);
        storage.set(STORAGE_KEYS.EMPLOYEES, initialEmployees);
      }

      // 6. Fetch eligible reporting managers for the company
      const managersData = await employeeApi.getEligibleManagers(targetCompanyId).catch(() => null);
      if (managersData && Array.isArray(managersData)) {
        setEligibleManagers(managersData);
      } else {
        setEligibleManagers([]);
      }
    } catch {
      // ignore
    }
  }, [user, activeCompanyId]);

  useEffect(() => {
    syncBackendData();
  }, [user, syncBackendData]);

  const switchActiveCompany = useCallback(
    async (newCompanyId: number) => {
      setActiveCompanyId(newCompanyId);
      storage.set("hrms_active_company_id", newCompanyId);
      await syncBackendData(newCompanyId);
    },
    [syncBackendData]
  );

  const onboardOrganization = useCallback(
    async (data: CreateTenantPayload): Promise<TenantItem> => {
      const created = await tenantApi.createTenant(data);
      await syncBackendData(created.id);
      recordAuditLog(
        "Tenant Organization Onboarded",
        "SYSTEM",
        `New tenant "${created.name}" (${created.code}) created with Admin ${data.adminEmail}`,
        user || undefined
      );
      toast.success(`Organization "${created.name}" onboarded successfully!`);
      return created;
    },
    [user, toast, syncBackendData]
  );

  const terminateOrganization = useCallback(
    async (orgId: number): Promise<void> => {
      await tenantApi.deleteTenant(orgId);
      await syncBackendData();
      recordAuditLog(
        "Tenant Organization Terminated",
        "SYSTEM",
        `Tenant organization #${orgId} terminated.`,
        user || undefined,
        "WARNING"
      );
      toast.success("Organization terminated successfully.");
    },
    [user, toast, syncBackendData]
  );

  // --- EMPLOYEE CRUD ---
  const addEmployee = useCallback((data: Omit<Employee, "id">): Employee => {
    const tempId = `EMP-${String(employees.length + 1).padStart(4, "0")}`;
    const newEmployee: Employee = {
      ...data,
      id: tempId,
      employeeCode: tempId,
    };

    const updatedEmployees = [newEmployee, ...employees];
    storage.set(STORAGE_KEYS.EMPLOYEES, updatedEmployees);
    setEmployees(updatedEmployees);

    // Call real Spring Boot backend API to persist to PostgreSQL & provision user account
    const deptIdNum = Number(data.departmentId);
    const branchIdNum = Number(data.branchId);
    const desigIdNum = Number(data.designationId);
    const mgrIdNum = Number(data.managerId);

    const payload: CreateEmployeePayload = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phoneNumber: data.phone,
      dateOfBirth: data.dob,
      gender: data.gender,
      joiningDate: data.joiningDate,
      status: data.status || "ACTIVE",
      companyId: activeCompanyId,
      departmentId: !isNaN(deptIdNum) ? deptIdNum : 3,
      branchId: !isNaN(branchIdNum) ? branchIdNum : 1,
      designationId: !isNaN(desigIdNum) ? desigIdNum : 7,
      managerId: !isNaN(mgrIdNum) ? mgrIdNum : undefined,
      createLoginAccount: true,
      initialPassword: (data as any).initialPassword || "Welcome@123",
    };

    employeeApi
      .onboardEmployee(payload)
      .then((createdBackendEmp) => {
        if (createdBackendEmp && createdBackendEmp.id) {
          toast.success(`Employee ${createdBackendEmp.employeeCode || ""} onboarded in backend! Login account created.`);
          setEmployees((prev) => {
            const synced = prev.map((e) =>
              e.id === tempId
                ? {
                    ...e,
                    id: String(createdBackendEmp.id),
                    employeeCode: createdBackendEmp.employeeCode || e.employeeCode,
                  }
                : e
            );
            storage.set(STORAGE_KEYS.EMPLOYEES, synced);
            return synced;
          });
        }
      })
      .catch((err) => {
        toast.error(err?.message || "Failed to onboard employee in backend");
      });

    // Auto-create salary structure
    const comp = calculateSalaryComponents(newEmployee.monthlyCtc);
    const newSalary: SalaryStructure = {
      employeeId: tempId,
      monthlyCtc: newEmployee.monthlyCtc,
      annualCtc: newEmployee.annualCtc,
      basic: comp.basic,
      hra: comp.hra,
      specialAllowance: comp.specialAllowance,
      conveyance: comp.conveyance,
      medicalAllowance: comp.medicalAllowance,
      bonus: 0,
      pfEmployee: comp.pfEmployee,
      esicEmployee: comp.esicEmployee,
      professionalTax: comp.professionalTax,
      tdsMonthly: comp.tdsMonthly,
      otherDeductions: 0,
    };
    const updatedSalaries = [...salaryStructures, newSalary];
    storage.set(STORAGE_KEYS.SALARY_STRUCTURES, updatedSalaries);
    setSalaryStructures(updatedSalaries);

    // Initial attendance for today (Present)
    const todayStr = "2026-10-06";
    const newAtt: AttendanceRecord = {
      id: `att-${todayStr}-${tempId}`,
      employeeId: tempId,
      date: todayStr,
      shiftId: newEmployee.shiftId || "shift-gen",
      firstIn: "09:30",
      lastOut: null,
      workingHours: 0,
      lateMinutes: 0,
      status: "PRESENT",
      punches: [
        {
          id: `p-${tempId}-1`,
          time: "09:30",
          type: "IN",
          source: "WEB",
          location: "Web Portal Self-Checkin",
        },
      ],
    };
    const updatedAtt = [newAtt, ...attendance];
    storage.set(STORAGE_KEYS.ATTENDANCE, updatedAtt);
    setAttendance(updatedAtt);

    // Audit log & toast
    recordAuditLog(
      "Employee Onboarded",
      "EMPLOYEE",
      `New employee ${newEmployee.firstName} ${newEmployee.lastName} (${tempId}) created with CTC ₹${(newEmployee.annualCtc / 100000).toFixed(1)}L.`,
      user || undefined
    );
    toast.success(`Employee ${newEmployee.firstName} ${newEmployee.lastName} onboarded successfully!`);

    return newEmployee;
  }, [employees, salaryStructures, attendance, user, toast]);

  const updateEmployee = useCallback((id: string, updates: Partial<Employee>) => {
    const updated = employees.map((emp) => (emp.id === id ? { ...emp, ...updates } : emp));
    storage.set(STORAGE_KEYS.EMPLOYEES, updated);
    setEmployees(updated);

    // If salary changed, update salary structure
    if (updates.monthlyCtc) {
      const comp = calculateSalaryComponents(updates.monthlyCtc);
      const updatedSalaries = salaryStructures.map((s) =>
        s.employeeId === id
          ? {
              ...s,
              monthlyCtc: updates.monthlyCtc!,
              annualCtc: updates.monthlyCtc! * 12,
              basic: comp.basic,
              hra: comp.hra,
              specialAllowance: comp.specialAllowance,
              pfEmployee: comp.pfEmployee,
              esicEmployee: comp.esicEmployee,
              tdsMonthly: comp.tdsMonthly,
            }
          : s
      );
      storage.set(STORAGE_KEYS.SALARY_STRUCTURES, updatedSalaries);
      setSalaryStructures(updatedSalaries);
    }

    recordAuditLog("Employee Record Updated", "EMPLOYEE", `Employee ID ${id} profile details modified.`, user || undefined);
    toast.success("Employee profile updated successfully.");
  }, [employees, salaryStructures, user, toast]);

  const deleteEmployee = useCallback(async (id: string) => {
    const empToDelete = employees.find((e) => e.id === id || e.employeeCode === id);
    const identifier = empToDelete?.employeeCode || empToDelete?.id || id;
    const updated = employees.filter((e) => e.id !== id && e.employeeCode !== id && e.id !== empToDelete?.id);
    storage.set(STORAGE_KEYS.EMPLOYEES, updated);
    setEmployees(updated);

    // Call real Spring Boot backend DELETE /api/v1/employees/{identifier}
    try {
      await employeeApi.deleteEmployee(identifier);
      await syncBackendData();
      recordAuditLog(
        "Employee Terminated/Deleted",
        "EMPLOYEE",
        `Employee ${empToDelete?.firstName || ""} (${identifier}) removed from system.`,
        user || undefined,
        "WARNING"
      );
      toast.success(`Employee ${empToDelete?.firstName || identifier} removed successfully.`);
    } catch (err: any) {
      toast.error(`Failed to delete employee: ${err?.message || "Server error"}`);
    }
  }, [employees, user, toast, syncBackendData]);

  // --- DEPARTMENT CRUD ---
  const addDepartment = useCallback((data: Omit<Department, "id">): Department => {
    const newId = `dept-${Date.now()}`;
    const newDept: Department = { ...data, id: newId };
    const updated = [...departments, newDept];
    storage.set(STORAGE_KEYS.DEPARTMENTS, updated);
    setDepartments(updated);

    // Call real backend API
    const branchScopeId = user?.scopeType === "BRANCH" && user?.scopeBranchId ? Number(user.scopeBranchId) : undefined;
    orgApi
      .createDepartment({
        companyId: activeCompanyId,
        name: data.name,
        code: data.code,
        branchId: branchScopeId,
      })
      .then((created) => {
        if (created && created.id) {
          setDepartments((prev) => {
            const synced = prev.map((d) => (d.id === newId ? { ...d, id: String(created.id), branchId: created.branchId ? String(created.branchId) : undefined, branchName: created.branchName || undefined } : d));
            storage.set(STORAGE_KEYS.DEPARTMENTS, synced);
            return synced;
          });
        }
      })
      .catch(() => {});

    recordAuditLog("Department Created", "DEPARTMENT", `New department ${newDept.name} added.`, user || undefined);
    toast.success(`Department "${newDept.name}" created.`);
    return newDept;
  }, [departments, activeCompanyId, user, toast]);

  const updateDepartment = useCallback((id: string, updates: Partial<Department>) => {
    const updated = departments.map((d) => (d.id === id ? { ...d, ...updates } : d));
    storage.set(STORAGE_KEYS.DEPARTMENTS, updated);
    setDepartments(updated);

    const numId = Number(id);
    if (!isNaN(numId)) {
      orgApi
        .updateDepartment(numId, {
          name: updates.name,
          code: updates.code,
        })
        .catch(() => {});
    }

    toast.success("Department details updated.");
  }, [departments, toast]);

  const deleteDepartment = useCallback(async (id: string) => {
    const dept = departments.find((d) => d.id === id);
    const numId = Number(id);

    if (!isNaN(numId)) {
      try {
        await orgApi.deleteDepartment(numId);
      } catch (err: any) {
        toast.error(err?.message || "Cannot delete department from backend");
        return;
      }
    }

    const updated = departments.filter((d) => d.id !== id);
    storage.set(STORAGE_KEYS.DEPARTMENTS, updated);
    setDepartments(updated);
    toast.success(`Department "${dept?.name || id}" removed successfully.`);
  }, [departments, toast]);

  // --- DESIGNATION CRUD ---
  const addDesignation = useCallback((data: Omit<Designation, "id">): Designation => {
    const newId = `desig-${Date.now()}`;
    const newDesig: Designation = { ...data, id: newId };
    const updated = [...designations, newDesig];
    storage.set(STORAGE_KEYS.DESIGNATIONS, updated);
    setDesignations(updated);

    // Call real backend API
    const levelNum = data.level ? parseInt(data.level.replace(/\D/g, "")) || 1 : 1;
    const deptIdNum = data.departmentId && !isNaN(Number(data.departmentId)) ? Number(data.departmentId) : undefined;
    const companyIdToUse = (user?.companyId ? Number(user.companyId) : activeCompanyId) || (allCompanies[0]?.id || 5);
    const branchScopeId = user?.scopeType === "BRANCH" && user?.scopeBranchId ? Number(user.scopeBranchId) : undefined;
    orgApi
      .createDesignation({
        companyId: companyIdToUse,
        departmentId: deptIdNum,
        branchId: branchScopeId,
        name: data.title,
        code: data.code,
        level: levelNum,
      })
      .then((created) => {
        if (created && created.id) {
          setDesignations((prev) => {
            const synced = prev.map((d) => (d.id === newId ? { ...d, id: String(created.id), branchId: created.branchId ? String(created.branchId) : undefined, branchName: created.branchName || undefined } : d));
            storage.set(STORAGE_KEYS.DESIGNATIONS, synced);
            return synced;
          });
        }
      })
      .catch(() => {});

    recordAuditLog("Designation Created", "SETTINGS", `New designation ${newDesig.title} (${newDesig.code}) added.`, user || undefined);
    toast.success(`Designation "${newDesig.title}" created.`);
    return newDesig;
  }, [designations, activeCompanyId, user, toast]);

  const updateDesignation = useCallback((id: string, updates: Partial<Designation>) => {
    const updated = designations.map((d) => (d.id === id ? { ...d, ...updates } : d));
    storage.set(STORAGE_KEYS.DESIGNATIONS, updated);
    setDesignations(updated);

    const numId = Number(id);
    if (!isNaN(numId)) {
      const levelNum = updates.level ? parseInt(updates.level.replace(/\D/g, "")) || 1 : undefined;
      const deptIdNum = updates.departmentId !== undefined ? (updates.departmentId ? Number(updates.departmentId) : null) : undefined;
      orgApi
        .updateDesignation(numId, {
          departmentId: deptIdNum,
          name: updates.title,
          code: updates.code,
          level: levelNum,
          active: updates.active,
        })
        .catch(() => {});
    }

    toast.success("Designation details updated.");
  }, [designations, toast]);

  const deleteDesignation = useCallback(async (id: string) => {
    const desig = designations.find((d) => d.id === id);
    const numId = Number(id);

    if (!isNaN(numId)) {
      try {
        await orgApi.deleteDesignation(numId);
      } catch (err: any) {
        toast.error(err?.message || "Cannot delete designation from backend");
        return;
      }
    }

    const updated = designations.filter((d) => d.id !== id);
    storage.set(STORAGE_KEYS.DESIGNATIONS, updated);
    setDesignations(updated);
    toast.success(`Designation "${desig?.title || id}" removed successfully.`);
  }, [designations, toast]);

  // --- SHIFTS ---
  const addShift = useCallback((data: Omit<Shift, "id">): Shift => {
    const newId = `shift-${Date.now()}`;
    const newShift: Shift = { ...data, id: newId };
    const updated = [...shifts, newShift];
    storage.set(STORAGE_KEYS.SHIFTS, updated);
    setShifts(updated);
    toast.success(`Shift "${newShift.name}" created.`);
    return newShift;
  }, [shifts, toast]);

  const updateShift = useCallback((id: string, updates: Partial<Shift>) => {
    const updated = shifts.map((s) => (s.id === id ? { ...s, ...updates } : s));
    storage.set(STORAGE_KEYS.SHIFTS, updated);
    setShifts(updated);
    toast.success("Shift policy updated.");
  }, [shifts, toast]);

  // --- HOLIDAYS WORKFLOW (HR Admin & Head HR Managed) ---
  const addHoliday = useCallback((data: Omit<Holiday, "id">): Holiday => {
    const newId = `hol-${Date.now()}`;
    const newHoliday: Holiday = { ...data, id: newId };
    const updated = [...holidays, newHoliday].sort((a, b) => a.date.localeCompare(b.date));
    storage.set(STORAGE_KEYS.HOLIDAYS, updated);
    setHolidays(updated);
    toast.success(`Holiday "${newHoliday.name}" declared on ${newHoliday.date}.`);
    return newHoliday;
  }, [holidays, toast]);

  const deleteHoliday = useCallback((id: string) => {
    const target = holidays.find((h) => h.id === id);
    const updated = holidays.filter((h) => h.id !== id);
    storage.set(STORAGE_KEYS.HOLIDAYS, updated);
    setHolidays(updated);
    toast.success(`Holiday "${target?.name || id}" removed from calendar.`);
  }, [holidays, toast]);

  // --- LEAVE WORKFLOW ---
  const applyLeave = useCallback((requestData: Omit<LeaveRequest, "id" | "appliedDate" | "status">) => {
    const newId = `lr-${Date.now()}`;
    const newRequest: LeaveRequest = {
      ...requestData,
      id: newId,
      status: "PENDING",
      appliedDate: "2026-10-06",
    };
    const updated = [newRequest, ...leaveRequests];
    storage.set(STORAGE_KEYS.LEAVE_REQUESTS, updated);
    setLeaveRequests(updated);

    // Add notification
    const emp = employees.find((e) => e.id === requestData.employeeId);
    const lt = leaveTypes.find((t) => t.id === requestData.leaveTypeId);
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: "New Leave Application",
      message: `${emp?.firstName || "Employee"} applied for ${requestData.days} day(s) ${lt?.name || "Leave"}.`,
      type: "leave",
      timestamp: "Just now",
      isRead: false,
      link: "/leave/requests",
    };
    storage.set(STORAGE_KEYS.NOTIFICATIONS, [newNotif, ...notifications]);
    setNotifications([newNotif, ...notifications]);

    recordAuditLog(
      "Leave Application Submitted",
      "LEAVE",
      `Employee ${requestData.employeeId} applied for ${requestData.days} days (${requestData.fromDate} to ${requestData.toDate}).`,
      user || undefined
    );
    toast.success("Leave application submitted for approval!");
  }, [leaveRequests, employees, leaveTypes, notifications, user, toast]);

  const approveLeave = useCallback((id: string) => {
    const req = leaveRequests.find((r) => r.id === id);
    if (!req) return;

    const updated = leaveRequests.map((r) =>
      r.id === id
        ? {
            ...r,
            status: "APPROVED" as const,
            reviewedBy: user?.name || "HR Admin",
            reviewedAt: "2026-10-06",
          }
        : r
    );
    storage.set(STORAGE_KEYS.LEAVE_REQUESTS, updated);
    setLeaveRequests(updated);

    // If leave covers today, update today's attendance to LEAVE
    const todayStr = "2026-10-06";
    if (req.fromDate <= todayStr && req.toDate >= todayStr) {
      const updatedAtt = attendance.map((a) =>
        a.employeeId === req.employeeId && a.date === todayStr
          ? { ...a, status: "LEAVE" as const, firstIn: null, lastOut: null, workingHours: 0 }
          : a
      );
      storage.set(STORAGE_KEYS.ATTENDANCE, updatedAtt);
      setAttendance(updatedAtt);
    }

    recordAuditLog("Leave Request Approved", "LEAVE", `Leave request ${id} approved for employee ${req.employeeId}.`, user || undefined);
    toast.success("Leave request approved successfully.");
  }, [leaveRequests, attendance, user, toast]);

  const rejectLeave = useCallback((id: string, reason?: string) => {
    const updated = leaveRequests.map((r) =>
      r.id === id
        ? {
            ...r,
            status: "REJECTED" as const,
            reviewedBy: user?.name || "HR Admin",
            reviewedAt: "2026-10-06",
            rejectionReason: reason || "Operational requirement at current sprint.",
          }
        : r
    );
    storage.set(STORAGE_KEYS.LEAVE_REQUESTS, updated);
    setLeaveRequests(updated);

    recordAuditLog("Leave Request Rejected", "LEAVE", `Leave request ${id} rejected. Reason: ${reason || "N/A"}`, user || undefined, "WARNING");
    toast.info("Leave request marked as rejected.");
  }, [leaveRequests, user, toast]);

  // --- ATTENDANCE REGULARIZATION ---
  const applyRegularization = useCallback(
    (data: Omit<AttendanceRegularization, "id" | "appliedDate" | "status">) => {
      const newId = `reg-${Date.now()}`;
      const newReg: AttendanceRegularization = {
        ...data,
        id: newId,
        status: "PENDING",
        appliedDate: "2026-10-06",
      };
      const updated = [newReg, ...regularizations];
      storage.set(STORAGE_KEYS.REGULARIZATIONS, updated);
      setRegularizations(updated);

      toast.success("Attendance regularization request submitted!");
    },
    [regularizations, toast]
  );

  const approveRegularization = useCallback(
    (id: string) => {
      const reg = regularizations.find((r) => r.id === id);
      if (!reg) return;

      const updatedRegs = regularizations.map((r) =>
        r.id === id ? { ...r, status: "APPROVED" as const, approvedBy: user?.name || "Manager" } : r
      );
      storage.set(STORAGE_KEYS.REGULARIZATIONS, updatedRegs);
      setRegularizations(updatedRegs);

      // Update the attendance record
      const updatedAtt = attendance.map((a) => {
        if (a.employeeId === reg.employeeId && a.date === reg.date) {
          return {
            ...a,
            status: "PRESENT" as const,
            lateMinutes: 0,
            firstIn: reg.missingPunchType === "IN" || reg.missingPunchType === "BOTH" ? reg.requestedTime : a.firstIn,
            lastOut: reg.missingPunchType === "OUT" ? reg.requestedTime : a.lastOut,
          };
        }
        return a;
      });
      storage.set(STORAGE_KEYS.ATTENDANCE, updatedAtt);
      setAttendance(updatedAtt);

      toast.success("Attendance regularization approved.");
    },
    [regularizations, attendance, user, toast]
  );

  const rejectRegularization = useCallback(
    (id: string, comment?: string) => {
      const updated = regularizations.map((r) =>
        r.id === id ? { ...r, status: "REJECTED" as const, comments: comment } : r
      );
      storage.set(STORAGE_KEYS.REGULARIZATIONS, updated);
      setRegularizations(updated);
      toast.info("Regularization rejected.");
    },
    [regularizations, toast]
  );

  // --- WEB PUNCH IN / OUT ---
  const punchAttendance = useCallback(
    (employeeId: string, type: "IN" | "OUT") => {
      const todayStr = "2026-10-06";
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      const existingRecord = attendance.find((a) => a.employeeId === employeeId && a.date === todayStr);

      if (existingRecord) {
        const updatedRecord: AttendanceRecord = {
          ...existingRecord,
          firstIn: type === "IN" ? timeStr : existingRecord.firstIn || timeStr,
          lastOut: type === "OUT" ? timeStr : existingRecord.lastOut,
          status: "PRESENT",
          punches: [
            ...existingRecord.punches,
            {
              id: `p-${Date.now()}`,
              time: timeStr,
              type,
              source: "WEB",
              location: "Web Portal Self Punch",
            },
          ],
        };
        const updated = attendance.map((a) =>
          a.employeeId === employeeId && a.date === todayStr ? updatedRecord : a
        );
        storage.set(STORAGE_KEYS.ATTENDANCE, updated);
        setAttendance(updated);
      } else {
        const newRecord: AttendanceRecord = {
          id: `att-${todayStr}-${employeeId}`,
          employeeId,
          date: todayStr,
          shiftId: "shift-gen",
          firstIn: type === "IN" ? timeStr : null,
          lastOut: type === "OUT" ? timeStr : null,
          workingHours: 0,
          lateMinutes: 0,
          status: "PRESENT",
          punches: [
            {
              id: `p-${Date.now()}`,
              time: timeStr,
              type,
              source: "WEB",
              location: "Web Portal Self Punch",
            },
          ],
        };
        const updated = [newRecord, ...attendance];
        storage.set(STORAGE_KEYS.ATTENDANCE, updated);
        setAttendance(updated);
      }

      recordAuditLog("Web Punch Registered", "ATTENDANCE", `Punch-${type} recorded at ${timeStr} for ${employeeId}.`, user || undefined);
      toast.success(`Punch-${type} successful at ${timeStr}!`);
    },
    [attendance, user, toast]
  );

  // --- PAYROLL RUN WORKFLOW ---
  const processPayrollRun = useCallback(
    (month: string, employeeIds: string[]) => {
      const monthName = month === "2026-10" ? "October 2026" : "November 2026";
      const newPayrollRecords: PayrollRecord[] = employeeIds.map((empId) => {
        const emp = employees.find((e) => e.id === empId);
        const comp = calculateSalaryComponents(emp?.monthlyCtc || 100000);
        return {
          id: `pay-${month}-${empId}`,
          month,
          monthName,
          employeeId: empId,
          workingDaysInMonth: 22,
          presentDays: 22,
          paidLeaveDays: 0,
          lopDays: 0,
          grossSalary: comp.grossEarnings,
          totalDeductions: comp.totalDeductions,
          netSalary: comp.netSalary,
          pfDeduction: comp.pfEmployee,
          esicDeduction: comp.esicEmployee,
          ptDeduction: comp.professionalTax,
          tdsDeduction: comp.tdsMonthly,
          lopDeduction: 0,
          status: "PROCESSED",
          processedDate: "2026-10-06",
          paymentMode: "BANK_TRANSFER",
          transactionRef: `CMS-HDFC-OCT-${empId.replace("EMP-", "")}`,
        };
      });

      // Filter out existing records for this month and append new ones
      const existingFiltered = payroll.filter((p) => p.month !== month);
      const updatedPayroll = [...newPayrollRecords, ...existingFiltered];
      storage.set(STORAGE_KEYS.PAYROLL, updatedPayroll);
      setPayroll(updatedPayroll);

      // Generate payslips
      const newPayslips: Payslip[] = newPayrollRecords.map((p) => ({
        id: `ps-${p.id}`,
        payrollRecordId: p.id,
        employeeId: p.employeeId,
        month: monthName.split(" ")[0],
        year: 2026,
        issueDate: "2026-10-06",
      }));
      const existingPayslipsFiltered = payslips.filter((ps) => !ps.payrollRecordId.startsWith(`pay-${month}`));
      const updatedPayslips = [...newPayslips, ...existingPayslipsFiltered];
      storage.set(STORAGE_KEYS.PAYSLIPS, updatedPayslips);
      setPayslips(updatedPayslips);

      recordAuditLog(
        "Monthly Payroll Disbursed",
        "PAYROLL",
        `Processed and finalized ${monthName} payroll for ${employeeIds.length} employees.`,
        user || undefined
      );
      toast.success(`Payroll for ${monthName} processed successfully for ${employeeIds.length} employees!`);
    },
    [employees, payroll, payslips, user, toast]
  );

  // --- LEAVE POLICIES ---
  const updateLeavePolicy = useCallback((id: string, updates: Partial<LeaveType>) => {
    const updated = leaveTypes.map((lt) => (lt.id === id ? { ...lt, ...updates } : lt));
    storage.set(STORAGE_KEYS.LEAVE_TYPES, updated);
    setLeaveTypes(updated);
    toast.success("Leave policy configuration saved.");
  }, [leaveTypes, toast]);

  // --- SETTINGS ---
  const updateSettings = useCallback((updates: Partial<CompanySettings>) => {
    const updated = { ...settings, ...updates };
    storage.set(STORAGE_KEYS.SETTINGS, updated);
    setSettings(updated);
    recordAuditLog("Company Settings Modified", "SETTINGS", "Updated organizational parameters.", user || undefined);
    toast.success("Company settings updated successfully.");
  }, [settings, user, toast]);

  // --- NOTIFICATIONS ---
  const markNotificationRead = useCallback((id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
    storage.set(STORAGE_KEYS.NOTIFICATIONS, updated);
    setNotifications(updated);
  }, [notifications]);

  const markAllNotificationsRead = useCallback(() => {
    const updated = notifications.map((n) => ({ ...n, isRead: true }));
    storage.set(STORAGE_KEYS.NOTIFICATIONS, updated);
    setNotifications(updated);
    toast.info("All notifications marked as read.");
  }, [notifications, toast]);

  // --- DOCUMENTS ---
  const uploadDocument = useCallback((doc: Omit<EmployeeDocument, "id" | "uploadDate">) => {
    const newDoc: EmployeeDocument = {
      ...doc,
      id: `doc-${Date.now()}`,
      uploadDate: "2026-10-06",
    };
    const updated = [newDoc, ...documents];
    storage.set(STORAGE_KEYS.DOCUMENTS, updated);
    setDocuments(updated);
    toast.success(`Document "${newDoc.title}" uploaded.`);
  }, [documents, toast]);

  // --- RECRUITMENT & ATS ACTIONS ---
  const addJob = useCallback((jobData: Omit<JobPosting, "id" | "postedDate" | "applicantsCount">): JobPosting => {
    const newJob: JobPosting = {
      ...jobData,
      id: `job-${Date.now()}`,
      postedDate: new Date().toISOString().split("T")[0],
      applicantsCount: 0,
    };
    const updated = [newJob, ...jobs];
    storage.set(STORAGE_KEYS.JOBS, updated);
    setJobs(updated);
    toast.success(`Job requisition "${newJob.title}" created.`);
    recordAuditLog(`Job Requisition Created: ${newJob.title}`, "SYSTEM", `Openings: ${newJob.openingsCount}`, user || undefined);
    return newJob;
  }, [jobs, user, toast]);

  const updateJobStatus = useCallback((id: string, status: JobPosting["status"]) => {
    const updated = jobs.map((j) => (j.id === id ? { ...j, status } : j));
    storage.set(STORAGE_KEYS.JOBS, updated);
    setJobs(updated);
    toast.info(`Job status updated to ${status}.`);
  }, [jobs, toast]);

  const addCandidate = useCallback((candidateData: Omit<Candidate, "id" | "appliedDate">): Candidate => {
    const newCandidate: Candidate = {
      ...candidateData,
      id: `cand-${Date.now()}`,
      appliedDate: new Date().toISOString().split("T")[0],
    };
    const updated = [newCandidate, ...candidates];
    storage.set(STORAGE_KEYS.CANDIDATES, updated);
    setCandidates(updated);
    // increment job applicants count
    const updatedJobs = jobs.map((j) => (j.id === newCandidate.jobId ? { ...j, applicantsCount: j.applicantsCount + 1 } : j));
    storage.set(STORAGE_KEYS.JOBS, updatedJobs);
    setJobs(updatedJobs);
    toast.success(`Candidate "${newCandidate.fullName}" added to pipeline.`);
    return newCandidate;
  }, [candidates, jobs, toast]);

  const updateCandidateStage = useCallback((id: string, stage: Candidate["stage"]) => {
    const cand = candidates.find((c) => c.id === id);
    const updated = candidates.map((c) => (c.id === id ? { ...c, stage } : c));
    storage.set(STORAGE_KEYS.CANDIDATES, updated);
    setCandidates(updated);
    toast.success(`Candidate ${cand?.fullName || ""} moved to stage: ${stage}.`);
    recordAuditLog(`Candidate Stage Updated`, "EMPLOYEE", `${cand?.fullName} -> ${stage}`, user || undefined);
  }, [candidates, user, toast]);

  // --- ASSET MANAGEMENT ACTIONS ---
  const addAsset = useCallback((assetData: Omit<CompanyAsset, "id">): CompanyAsset => {
    const newAsset: CompanyAsset = {
      ...assetData,
      id: `ast-${Date.now()}`,
    };
    const updated = [newAsset, ...assets];
    storage.set(STORAGE_KEYS.ASSETS, updated);
    setAssets(updated);
    toast.success(`Asset "${newAsset.name}" [${newAsset.assetTag}] registered.`);
    recordAuditLog(`Asset Registered: ${newAsset.assetTag}`, "SETTINGS", newAsset.name, user || undefined);
    return newAsset;
  }, [assets, user, toast]);

  const allocateAsset = useCallback((assetId: string, employeeId: string, employeeName: string) => {
    const emp = employees.find((e) => e.id === employeeId);
    const updated = assets.map((a) => {
      if (a.id === assetId) {
        return {
          ...a,
          status: "ALLOCATED" as const,
          assignedToEmployeeId: employeeId,
          assignedToEmployeeName: employeeName,
          assignedDate: new Date().toISOString().split("T")[0],
          department: emp ? departments.find((d) => d.id === emp.departmentId)?.name : a.department,
        };
      }
      return a;
    });
    storage.set(STORAGE_KEYS.ASSETS, updated);
    setAssets(updated);
    toast.success(`Asset allocated to ${employeeName}.`);
    recordAuditLog(`Asset Allocated`, "EMPLOYEE", `Asset ID ${assetId} assigned to ${employeeName}`, user || undefined);
  }, [assets, employees, departments, user, toast]);

  const returnAsset = useCallback((assetId: string) => {
    const targetAsset = assets.find((a) => a.id === assetId);
    const updated = assets.map((a) => {
      if (a.id === assetId) {
        return {
          ...a,
          status: "AVAILABLE" as const,
          assignedToEmployeeId: undefined,
          assignedToEmployeeName: undefined,
          assignedDate: undefined,
        };
      }
      return a;
    });
    storage.set(STORAGE_KEYS.ASSETS, updated);
    setAssets(updated);
    toast.info(`Asset ${targetAsset?.assetTag || ""} checked back into available stock.`);
    recordAuditLog(`Asset Returned`, "SYSTEM", `Asset ${targetAsset?.assetTag} returned to IT Stock`, user || undefined);
  }, [assets, user, toast]);

  // --- PERFORMANCE & OKRs ACTIONS ---
  const addGoal = useCallback((goalData: Omit<PerformanceGoal, "id">): PerformanceGoal => {
    const newGoal: PerformanceGoal = {
      ...goalData,
      id: `goal-${Date.now()}`,
    };
    const updated = [newGoal, ...performanceGoals];
    storage.set(STORAGE_KEYS.GOALS, updated);
    setPerformanceGoals(updated);
    toast.success(`Objective / OKR "${newGoal.title}" created.`);
    return newGoal;
  }, [performanceGoals, toast]);

  const updateGoalProgress = useCallback((id: string, progress: number) => {
    const safeProgress = Math.min(100, Math.max(0, progress));
    const updated = performanceGoals.map((g) => {
      if (g.id === id) {
        const status = safeProgress === 100 ? ("COMPLETED" as const) : safeProgress > 0 ? ("IN_PROGRESS" as const) : ("NOT_STARTED" as const);
        return { ...g, progressPercent: safeProgress, status };
      }
      return g;
    });
    storage.set(STORAGE_KEYS.GOALS, updated);
    setPerformanceGoals(updated);
    toast.info(`Goal progress updated to ${safeProgress}%.`);
  }, [performanceGoals, toast]);

  const submitAppraisalReview = useCallback((reviewId: string, managerRating: number, feedback: string) => {
    const updated = appraisalReviews.map((r) => {
      if (r.id === reviewId) {
        return {
          ...r,
          managerRating,
          feedback,
          status: "COMPLETED" as const,
          submittedDate: new Date().toISOString().split("T")[0],
        };
      }
      return r;
    });
    storage.set(STORAGE_KEYS.APPRAISALS, updated);
    setAppraisalReviews(updated);
    toast.success("Manager appraisal review successfully submitted.");
    recordAuditLog(`Appraisal Review Submitted`, "EMPLOYEE", `Review ID: ${reviewId}, Rating: ${managerRating}★`, user || undefined);
  }, [appraisalReviews, user, toast]);

  // --- RESET DEMO DATA ---
  const resetAllData = useCallback(() => {
    storage.clear();
    window.location.reload();
  }, []);

  return (
    <HrmsContext.Provider
      value={{
        company,
        employees,
        departments,
        designations,
        branches,
        attendance,
        regularizations,
        leaveTypes,
        leaveRequests,
        holidays,
        shifts,
        salaryStructures,
        payroll,
        payslips,
        documents,
        notifications,
        auditLogs,
        settings,
        jobs,
        candidates,
        assets,
        performanceGoals,
        appraisalReviews,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        addDesignation,
        updateDesignation,
        deleteDesignation,
        addShift,
        updateShift,
        addHoliday,
        deleteHoliday,
        applyLeave,
        approveLeave,
        rejectLeave,
        applyRegularization,
        approveRegularization,
        rejectRegularization,
        punchAttendance,
        processPayrollRun,
        updateLeavePolicy,
        updateSettings,
        markNotificationRead,
        markAllNotificationsRead,
        uploadDocument,
        resetAllData,
        addJob,
        updateJobStatus,
        addCandidate,
        updateCandidateStage,
        addAsset,
        allocateAsset,
        returnAsset,
        addGoal,
        updateGoalProgress,
        submitAppraisalReview,
        syncBackendData,
        activeCompanyId,
        allCompanies,
        switchActiveCompany,
        onboardOrganization,
        terminateOrganization,
        eligibleManagers,
      }}
    >
      {children}
    </HrmsContext.Provider>
  );
};

export function useHrms() {
  const context = useContext(HrmsContext);
  if (!context) {
    throw new Error("useHrms must be used within an HrmsProvider");
  }
  return context;
}

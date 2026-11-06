import React, { useState, useMemo, useEffect } from "react";
import {
  User,
  Briefcase,
  ShieldCheck,
  CreditCard,
  Coins,
  FileCheck2,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Upload,
  KeyRound,
  Lock,
} from "lucide-react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { useHrms } from "../../lib/hrmsContext";
import { useAuth } from "../../lib/authContext";
import { EmploymentStatus, EmploymentType, Gender, Employee } from "../../types/hrms";
import { formatINR } from "../../lib/utils";

export type HierarchyRoleTier = "EMPLOYEE" | "TEAM_LEAD" | "MANAGER" | "HR_ADMIN";

export interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddEmployeeModal({ isOpen, onClose }: AddEmployeeModalProps) {
  const { departments, designations, branches, employees, shifts, addEmployee, uploadDocument, eligibleManagers } = useHrms();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);

  // Check if current user is platform super admin or organization Head HR (Tenant Admin)
  const isHeadHr = useMemo(() => {
    if (!user) return false;
    if (user.role === "SUPER_ADMIN" || user.role === "TENANT_ADMIN") return true;
    if (user.isTenantAdmin) return true;
    return false;
  }, [user]);

  // Determine assigned branch for Branch HR Admin (e.g. Pune Campus for Pooja, Mumbai Campus for Vikram)
  const assignedBranch = useMemo(() => {
    if (isHeadHr) return null; // Head HR / Super Admin has multi-branch access across all locations

    const targetBranchId = user?.scopeBranchId ? String(user.scopeBranchId) : user?.branchId;
    if (targetBranchId) {
      const match = branches.find((b) => String(b.id) === String(targetBranchId));
      if (match) return match;
    }

    const userEmail = (user?.email || "").toLowerCase();
    if (userEmail.includes("pune")) {
      const match = branches.find((b) => (b.city || "").toLowerCase().includes("pune") || (b.name || "").toLowerCase().includes("pune"));
      if (match) return match;
    }
    if (userEmail.includes("mumbai")) {
      const match = branches.find((b) => (b.city || "").toLowerCase().includes("mumbai") || (b.name || "").toLowerCase().includes("mumbai"));
      if (match) return match;
    }

    const empMatch = employees.find((e) => (e.email || "").toLowerCase() === userEmail);
    if (empMatch?.branchId) {
      const match = branches.find((b) => String(b.id) === String(empMatch.branchId));
      if (match) return match;
    }

    if (user?.scopeType === "BRANCH" && branches.length > 0) {
      return branches[0];
    }

    return null;
  }, [isHeadHr, user, branches, employees]);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Welcome@123");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<Gender>("MALE");
  const [dob, setDob] = useState("1996-05-15");

  // Employment & Hierarchy
  const [roleTier, setRoleTier] = useState<HierarchyRoleTier>("EMPLOYEE");
  const [employeeReportsTo, setEmployeeReportsTo] = useState<"TEAM_LEAD" | "MANAGER">("TEAM_LEAD");
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || "3");
  const [designationId, setDesignationId] = useState(designations[0]?.id || "7");
  const [branchId, setBranchId] = useState(assignedBranch?.id || branches[0]?.id || "1");
  const [managerId, setManagerId] = useState(employees[0]?.id || "EMP-0001");
  const [joiningDate, setJoiningDate] = useState("2026-10-06");
  const [employmentType, setEmploymentType] = useState<EmploymentType>("FULL_TIME");
  const [shiftId, setShiftId] = useState(shifts[0]?.id || "shift-gen");

  // Statutory
  const [pan, setPan] = useState("ABCDE1234F");
  const [aadhaar, setAadhaar] = useState("4512 7890 2345");
  const [uan, setUan] = useState("100912457899");
  const [esicNumber, setEsicNumber] = useState("3100456799");

  // Banking
  const [bankName, setBankName] = useState("HDFC Bank Ltd.");
  const [accountNumber, setAccountNumber] = useState("50100456789123");
  const [ifscCode, setIfscCode] = useState("HDFC0000052");
  const [accountHolderName, setAccountHolderName] = useState("");

  // Salary
  const [monthlyCtc, setMonthlyCtc] = useState(125000);

  // Documents
  const [uploadedDocName, setUploadedDocName] = useState("Offer_Letter_Signed.pdf");

  // Helper to categorize existing workforce by hierarchy tier
  // Check if an employee is Head HR (Tenant Admin / Organization Owner)
  const isHeadHrEmployee = (e: Employee) =>
    !e.branchId ||
    e.email?.toLowerCase() === "vanshu@gmail.com" ||
    e.employeeCode.endsWith("-0001") ||
    e.email?.toLowerCase().includes("head");

  // Helper to categorize existing workforce by hierarchy tier
  const classifyEmployee = (e: Employee): HierarchyRoleTier => {
    const des = designations.find((d) => d.id === e.designationId);
    const desTitle = (des?.title || "").toLowerCase();
    const desCode = (des?.code || "").toLowerCase();
    const email = (e.email || "").toLowerCase();

    // 1. Head HR & Branch HR Admins
    if (
      isHeadHrEmployee(e) ||
      desTitle.includes("director") ||
      desTitle.includes("head of human") ||
      desTitle.includes("hr admin") ||
      desTitle.includes("branch hr") ||
      desCode.includes("hr") ||
      email.includes("hr.") ||
      email.includes("hr@") ||
      email.includes("punehr") ||
      email.includes("mumbaihr")
    ) {
      return "HR_ADMIN";
    }

    // 2. Department Managers
    if (
      desTitle.includes("manager") ||
      desTitle.includes("mgr") ||
      desCode.includes("mgr") ||
      email.includes("manager") ||
      email.includes("rohan") ||
      email.includes("ajay")
    ) {
      return "MANAGER";
    }

    // 3. Team Leads
    if (
      desTitle.includes("team lead") ||
      desTitle.includes("lead") ||
      desTitle.includes("supervisor") ||
      desCode.includes("lead") ||
      desCode.includes("tl") ||
      email.includes("lead") ||
      email.includes("kunal")
    ) {
      return "TEAM_LEAD";
    }

    // 4. Default: Employee (Individual Contributor)
    return "EMPLOYEE";
  };

  // Candidate pool: Branch HR Admin strictly NEVER sees Head HR (Tenant Admin)
  const combinedManagerPool = useMemo(() => {
    let list: Employee[] = [...employees];

    if (!isHeadHr) {
      // Branch HR Admin strictly sees only branch personnel, NEVER Head HR
      return list.filter((e) => !isHeadHrEmployee(e));
    }

    if (eligibleManagers && eligibleManagers.length > 0) {
      eligibleManagers.forEach((em) => {
        if (!list.some((existing) => String(existing.id) === String(em.id) || existing.email?.toLowerCase() === em.email?.toLowerCase())) {
          list.push({
            id: String(em.id),
            employeeCode: em.employeeCode,
            firstName: em.fullName.split(" ")[0] || "Head",
            lastName: em.fullName.split(" ").slice(1).join(" ") || "HR",
            email: em.email,
            phone: "+91 98200 00000",
            gender: "FEMALE",
            dob: "1994-01-01",
            avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150",
            departmentId: "1",
            designationId: "1",
            branchId: undefined, // Corporate / Organization level
            joiningDate: "2026-01-01",
            employmentType: "FULL_TIME",
            status: "ACTIVE",
            shiftId: "shift-gen",
            pan: "ABCDE1234F",
            aadhaar: "123456789012",
            uan: "100912345678",
            esicNumber: "3100123456",
            bankName: "HDFC Bank",
            accountNumber: "50100012345678",
            ifscCode: "HDFC0000060",
            accountHolderName: em.fullName,
            monthlyCtc: 200000,
            annualCtc: 2400000,
          });
        }
      });
    }

    return list;
  }, [employees, eligibleManagers, isHeadHr]);

  // Role Tiers available to the onboarding user
  const availableRoleTiers = useMemo(() => {
    if (isHeadHr) {
      return [
        { tier: "EMPLOYEE" as HierarchyRoleTier, label: "Employee", sub: "Reports to Team Lead", icon: "👨‍💻" },
        { tier: "TEAM_LEAD" as HierarchyRoleTier, label: "Team Lead", sub: "Reports to Manager", icon: "🎯" },
        { tier: "MANAGER" as HierarchyRoleTier, label: "Dept Manager", sub: "Reports to HR Admin / Head HR", icon: "👔" },
        { tier: "HR_ADMIN" as HierarchyRoleTier, label: "Branch HR", sub: "Reports to Head HR", icon: "👤" },
      ];
    }
    // Branch HR Admin onboards workforce for their assigned branch: Manager, Team Lead, Employee
    return [
      { tier: "EMPLOYEE" as HierarchyRoleTier, label: "Employee", sub: "Reports to Team Lead", icon: "👨‍💻" },
      { tier: "TEAM_LEAD" as HierarchyRoleTier, label: "Team Lead", sub: "Reports to Manager", icon: "🎯" },
      { tier: "MANAGER" as HierarchyRoleTier, label: "Dept Manager", sub: "Reports to Branch HR / Head HR", icon: "👔" },
    ];
  }, [isHeadHr]);

  // Dynamic Reporting Manager calculation based on Hierarchy Tier & Branch Scope
  const availableManagers = useMemo(() => {
    if (combinedManagerPool.length === 0) return [];

    if (roleTier === "EMPLOYEE") {
      // Flexible supervisor selection: Team Lead OR direct Department Manager (e.g. Sales)
      if (employeeReportsTo === "TEAM_LEAD") {
        let tls = combinedManagerPool.filter((e) => !isHeadHrEmployee(e) && classifyEmployee(e) === "TEAM_LEAD");
        if (assignedBranch) {
          const branchTls = tls.filter((t) => String(t.branchId) === String(assignedBranch.id));
          if (branchTls.length > 0) tls = branchTls;
        }
        if (tls.length > 0) return tls;

        // Fallback to Department Managers if no Team Lead exists yet
        let mgrs = combinedManagerPool.filter((e) => !isHeadHrEmployee(e) && classifyEmployee(e) === "MANAGER");
        if (assignedBranch) {
          const branchMgrs = mgrs.filter((m) => String(m.branchId) === String(assignedBranch.id));
          if (branchMgrs.length > 0) mgrs = branchMgrs;
        }
        if (mgrs.length > 0) return mgrs;
        return combinedManagerPool.filter((e) => classifyEmployee(e) === "HR_ADMIN");
      } else {
        // Direct to Department Manager
        let mgrs = combinedManagerPool.filter((e) => !isHeadHrEmployee(e) && classifyEmployee(e) === "MANAGER");
        if (assignedBranch) {
          const branchMgrs = mgrs.filter((m) => String(m.branchId) === String(assignedBranch.id));
          if (branchMgrs.length > 0) mgrs = branchMgrs;
        }
        if (mgrs.length > 0) return mgrs;
        return combinedManagerPool.filter((e) => classifyEmployee(e) === "HR_ADMIN");
      }
    }

    if (roleTier === "TEAM_LEAD") {
      // 2. Team Leads report directly to Department Managers
      let mgrs = combinedManagerPool.filter((e) => !isHeadHrEmployee(e) && classifyEmployee(e) === "MANAGER");
      if (assignedBranch) {
        const branchMgrs = mgrs.filter((m) => String(m.branchId) === String(assignedBranch.id));
        if (branchMgrs.length > 0) mgrs = branchMgrs;
      }
      if (mgrs.length > 0) return mgrs;
      return combinedManagerPool.filter((e) => classifyEmployee(e) === "HR_ADMIN");
    }

    if (roleTier === "MANAGER") {
      // 3. Department Managers report directly to Head HR (if Head HR logged in) OR Branch HR Admin
      const headHrs = isHeadHr ? combinedManagerPool.filter((e) => isHeadHrEmployee(e)) : [];
      const branchHrs = combinedManagerPool.filter(
        (e) => !isHeadHrEmployee(e) && classifyEmployee(e) === "HR_ADMIN" && (!assignedBranch || String(e.branchId) === String(assignedBranch.id))
      );

      // Include self Branch HR Admin if logged in
      let selfHrList: Employee[] = [];
      if (user && (user.role === "HR_ADMIN" || user.scopeType === "BRANCH")) {
        const alreadyInList = [...headHrs, ...branchHrs].some((h) => h.email?.toLowerCase() === user.email?.toLowerCase());
        if (!alreadyInList) {
          selfHrList.push({
            id: user.id || "HR-SELF",
            employeeCode: user.employeeId || "HR-SELF",
            firstName: user.name.split(" ")[0] || "Branch",
            lastName: user.name.split(" ").slice(1).join(" ") || "HR Lead",
            email: user.email,
            phone: "+91 98200 00000",
            gender: "FEMALE",
            dob: "1994-01-01",
            avatar: user.avatar,
            departmentId: "2",
            designationId: "3",
            branchId: assignedBranch ? assignedBranch.id : "1",
            managerId: "1",
            joiningDate: "2026-01-01",
            employmentType: "FULL_TIME",
            status: "ACTIVE",
            shiftId: "shift-gen",
            pan: "ABCDE1234F",
            aadhaar: "123456789012",
            uan: "100912345678",
            esicNumber: "3100123456",
            bankName: "HDFC Bank",
            accountNumber: "50100012345678",
            ifscCode: "HDFC0000060",
            accountHolderName: user.name,
            monthlyCtc: 150000,
            annualCtc: 1800000,
          });
        }
      }

      const managerReportingOptions = isHeadHr ? [...headHrs, ...selfHrList, ...branchHrs] : [...selfHrList, ...branchHrs];
      return managerReportingOptions.length > 0 ? managerReportingOptions : combinedManagerPool;
    }

    if (roleTier === "HR_ADMIN") {
      // 4. Branch HR Admins report directly to Head HR (Tenant Admin)
      const headHrs = combinedManagerPool.filter((e) => isHeadHrEmployee(e));
      return headHrs.length > 0 ? headHrs : combinedManagerPool;
    }

    return combinedManagerPool;
  }, [combinedManagerPool, roleTier, employeeReportsTo, assignedBranch, user]);

  // Auto-reset roleTier if Branch HR has HR_ADMIN selected
  useEffect(() => {
    if (!isHeadHr && roleTier === "HR_ADMIN") {
      setRoleTier("EMPLOYEE");
    }
  }, [isHeadHr, roleTier]);

  // Filter designations strictly by currently selected department
  const availableDesignations = useMemo(() => {
    if (!departmentId) return [];
    return designations.filter((d) => String(d.departmentId) === String(departmentId));
  }, [designations, departmentId]);

  // Synchronize dropdown default selections when organization data loads
  useEffect(() => {
    if (departments.length > 0 && !departments.some((d) => d.id === departmentId)) {
      setDepartmentId(departments[0].id);
    }
  }, [departments, departmentId]);

  useEffect(() => {
    if (availableDesignations.length > 0 && !availableDesignations.some((d) => d.id === designationId)) {
      setDesignationId(availableDesignations[0].id);
    }
  }, [availableDesignations, designationId]);

  useEffect(() => {
    if (assignedBranch) {
      setBranchId(assignedBranch.id);
    } else if (branches.length > 0 && !branches.some((b) => b.id === branchId)) {
      setBranchId(branches[0].id);
    }
  }, [assignedBranch, branches, branchId]);

  // Keep managerId aligned with the current availableManagers list
  useEffect(() => {
    if (availableManagers.length > 0) {
      if (!availableManagers.some((m) => m.id === managerId)) {
        setManagerId(availableManagers[0].id);
      }
    }
  }, [availableManagers, managerId]);

  const handleDepartmentChange = (newDeptId: string) => {
    setDepartmentId(newDeptId);
    const dept = departments.find((d) => d.id === newDeptId);
    const deptName = (dept?.name || "").toLowerCase();
    // In departments like Sales or Corporate Relations that may not have Team Leads,
    // automatically default reporting line directly to Department Manager
    if (deptName.includes("sale") || deptName.includes("relation") || deptName.includes("corporate")) {
      setEmployeeReportsTo("MANAGER");
    }

    // Auto-select designation matching the newly selected department
    const deptDesigs = designations.filter((d) => String(d.departmentId) === String(newDeptId));
    if (deptDesigs.length > 0) {
      handleDesignationChange(deptDesigs[0].id);
    } else {
      setDesignationId("");
    }
  };

  const handleRoleTierChange = (newTier: HierarchyRoleTier) => {
    setRoleTier(newTier);
    // Auto-select a compatible designation from available designations of this department
    const candidate = availableDesignations.find((d) => {
      const t = (d.title || "").toLowerCase();
      const c = (d.code || "").toLowerCase();
      if (newTier === "HR_ADMIN") return t.includes("hr") || t.includes("head") || t.includes("director");
      if (newTier === "MANAGER") return t.includes("manager") || t.includes("mgr") || c.includes("mgr");
      if (newTier === "TEAM_LEAD") return t.includes("lead") || c.includes("lead") || c.includes("tl");
      return !t.includes("manager") && !t.includes("lead") && !t.includes("head") && !t.includes("director");
    }) || designations.find((d) => {
      const t = (d.title || "").toLowerCase();
      const c = (d.code || "").toLowerCase();
      if (newTier === "HR_ADMIN") return t.includes("hr") || t.includes("head") || t.includes("director");
      if (newTier === "MANAGER") return t.includes("manager") || t.includes("mgr") || c.includes("mgr");
      if (newTier === "TEAM_LEAD") return t.includes("lead") || c.includes("lead") || c.includes("tl");
      return !t.includes("manager") && !t.includes("lead") && !t.includes("head") && !t.includes("director");
    });
    if (candidate) {
      setDesignationId(candidate.id);
    }
  };

  const handleDesignationChange = (newDesigId: string) => {
    setDesignationId(newDesigId);
    const des = designations.find((d) => d.id === newDesigId);
    const desTitle = (des?.title || "").toLowerCase();
    const desCode = (des?.code || "").toLowerCase();

    if (
      desTitle.includes("director") ||
      desTitle.includes("head") ||
      desTitle.includes("hr admin") ||
      desTitle.includes("branch hr") ||
      desCode.includes("hr")
    ) {
      setRoleTier("HR_ADMIN");
    } else if (desTitle.includes("manager") || desTitle.includes("mgr") || desCode.includes("mgr")) {
      setRoleTier("MANAGER");
    } else if (
      desTitle.includes("lead") ||
      desTitle.includes("team lead") ||
      desTitle.includes("supervisor") ||
      desCode.includes("lead") ||
      desCode.includes("tl")
    ) {
      setRoleTier("TEAM_LEAD");
    } else {
      setRoleTier("EMPLOYEE");
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setFirstName("");
    setLastName("");
    setEmail("");
    setPassword("Welcome@123");
    setPhone("");
  };

  const handleFinish = () => {
    if (!firstName || !lastName || !email) {
      alert("Please fill in basic personal information.");
      setCurrentStep(1);
      return;
    }

    const newEmp = addEmployee({
      employeeCode: "", // generated
      firstName,
      lastName,
      email,
      phone: phone || "+91 98200 00000",
      gender,
      dob,
      avatar:
        gender === "FEMALE"
          ? "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150"
          : "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      departmentId,
      designationId,
      branchId,
      managerId,
      joiningDate,
      employmentType,
      status: "ACTIVE" as EmploymentStatus,
      shiftId,
      pan,
      aadhaar,
      uan,
      esicNumber,
      bankName,
      accountNumber,
      ifscCode,
      accountHolderName: accountHolderName || `${firstName} ${lastName}`,
      monthlyCtc: Number(monthlyCtc),
      annualCtc: Number(monthlyCtc) * 12,
      initialPassword: password || "Welcome@123",
    } as any);

    if (uploadedDocName) {
      uploadDocument({
        employeeId: newEmp.id,
        title: "Signed Appointment & Offer Letter",
        category: "COMPANY_POLICY",
        fileSize: "1.4 MB",
        fileType: "PDF",
      });
    }

    resetForm();
    onClose();
  };

  const steps = [
    { num: 1, title: "Personal", icon: User },
    { num: 2, title: "Employment", icon: Briefcase },
    { num: 3, title: "Statutory", icon: ShieldCheck },
    { num: 4, title: "Banking", icon: CreditCard },
    { num: 5, title: "Salary", icon: Coins },
    { num: 6, title: "Finish", icon: FileCheck2 },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title="Employee Onboarding Wizard"
      description="Enter employee details across statutory, banking, and compensation modules."
    >
      {/* Wizard Stepper Bar */}
      <div className="mb-6 pb-4 border-b border-surface-border">
        <div className="flex items-center justify-between">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isCompleted = currentStep > s.num;
            const isCurrent = currentStep === s.num;

            return (
              <React.Fragment key={s.num}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCurrent
                        ? "bg-gray-950 text-white ring-4 ring-gray-900/10 shadow-sm"
                        : isCompleted
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                  </div>
                  <span
                    className={`hidden sm:inline text-xs font-semibold ${
                      isCurrent ? "text-gray-950" : "text-gray-400"
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      isCompleted ? "bg-emerald-500" : "bg-gray-200"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[280px]">
        {/* Step 1: Personal Info */}
        {currentStep === 1 && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-sm font-semibold text-gray-950">Personal Information</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Ramesh"
                required
              />
              <Input
                label="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Patil"
                required
              />
              <Input
                label="Work Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ramesh.patil@ga-hrms.io"
                required
              />
              <Input
                label="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98234 56789"
                required
              />
              <Select
                label="Gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                options={[
                  { label: "Male", value: "MALE" },
                  { label: "Female", value: "FEMALE" },
                  { label: "Other", value: "OTHER" },
                ]}
              />
              <Input
                label="Date of Birth"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                required
              />
              <Input
                label="Portal Login Password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="e.g. Welcome@123"
                helperText="Password for employee to log into the HRMS portal"
                required
              />
            </div>
          </div>
        )}

        {/* Step 2: Employment */}
        {currentStep === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-950">Employment & Organization Hierarchy</h4>
              <span className="text-[11px] text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full font-medium">
                Multi-Tenant Strict Chain
              </span>
            </div>

            {/* Hierarchy Level / Role Tier Selector */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>1. Select Onboarding Hierarchy Tier:</span>
                <span className="text-[10px] text-slate-500 font-normal">Controls direct supervisor chain</span>
              </div>
              <div className={`grid gap-2 ${availableRoleTiers.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
                {availableRoleTiers.map((item) => {
                  const isSelected = roleTier === item.tier;
                  return (
                    <button
                      key={item.tier}
                      type="button"
                      onClick={() => handleRoleTierChange(item.tier)}
                      className={`p-2.5 rounded-xl border text-left text-xs transition-all flex flex-col justify-between ${
                        isSelected
                          ? "bg-slate-900 border-slate-900 text-white shadow-xs font-semibold"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                      <div className={`text-[10px] mt-1 ${isSelected ? "text-slate-300" : "text-slate-500"}`}>
                        {item.sub}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Flexible Reporting Supervisor Toggle (When Onboarding Employee) */}
            {roleTier === "EMPLOYEE" && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                <div>
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Direct Reporting Supervisor:</span>
                    <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full font-semibold">
                      Flexible Chain
                    </span>
                  </div>
                  <span className="block text-[11px] text-slate-500 mt-0.5">
                    Select Team Lead or direct Department Manager (e.g., Sales / Ops without Team Leads)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEmployeeReportsTo("TEAM_LEAD")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      employeeReportsTo === "TEAM_LEAD"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <span>🎯</span>
                    <span>Team Lead</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmployeeReportsTo("MANAGER")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      employeeReportsTo === "MANAGER"
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <span>👔</span>
                    <span>Dept Manager</span>
                  </button>
                </div>
              </div>
            )}

            {/* Active Hierarchy Dynamic Notice */}
            <div className="p-3 bg-indigo-50/80 border border-indigo-200/90 rounded-xl text-xs text-indigo-950 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Active Reporting Hierarchy Rule: </span>
                {roleTier === "EMPLOYEE" && (
                  <span>
                    Adding <strong>Employee</strong> &rarr; Reporting dropdown filtered to{" "}
                    <strong>{employeeReportsTo === "TEAM_LEAD" ? "Team Leads" : "Department Managers (e.g. Sales / Ops direct reporting)"}</strong>
                    {assignedBranch ? ` in ${assignedBranch.city || "Pune"} Campus` : ""}.
                  </span>
                )}
                {roleTier === "TEAM_LEAD" && (
                  <span>
                    Adding <strong>Team Lead</strong> &rarr; Reporting dropdown shows <strong>Department Managers</strong>
                    {assignedBranch ? ` in ${assignedBranch.city || "Pune"} Campus` : ""}.
                  </span>
                )}
                {roleTier === "MANAGER" && (
                  <span>
                    Adding <strong>Department Manager</strong> &rarr; Reporting dropdown shows{" "}
                    <strong>{assignedBranch ? `Branch HR Admin (${assignedBranch.city || "Pune"})` : "Branch HR Admins & Head HR"}</strong>.
                  </span>
                )}
                {roleTier === "HR_ADMIN" && (
                  <span>
                    Adding <strong>Branch HR Admin</strong> &rarr; Reporting dropdown shows <strong>Head HR (Tenant Admin)</strong>.
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {assignedBranch ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <span>Branch / Location</span>
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5 text-emerald-600" />
                        Assigned Location
                      </span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">Branch HR Locked</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center text-xs">
                        📍
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 leading-tight">
                          {assignedBranch.name} ({assignedBranch.city || "Pune"})
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {assignedBranch.address || "Corporate Campus"}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      🔒 Fixed
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Locked to your assigned branch. You onboard managers, team leads, and employees specifically for {assignedBranch.city || "this branch"}.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <span>Branch / Location *</span>
                      <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                        Head HR Access
                      </span>
                    </label>
                    <span className="text-[10px] text-indigo-600 font-medium">Multi-Branch</span>
                  </div>
                  <Select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    options={branches.map((b) => ({ label: `${b.name} (${b.city || "Branch"})`, value: b.id }))}
                  />
                  <p className="text-[10px] text-slate-500 leading-tight">
                    As Head HR (Tenant Admin), you oversee all branches and can assign employees to any location.
                  </p>
                </div>
              )}
              <Select
                label="Department *"
                value={departmentId}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                options={departments.map((d) => ({ label: d.name, value: d.id }))}
              />
              <div className="space-y-1">
                <Select
                  label="Designation *"
                  value={designationId}
                  onChange={(e) => handleDesignationChange(e.target.value)}
                  options={
                    availableDesignations.length > 0
                      ? availableDesignations.map((des) => ({
                          label: `${des.title} (${des.code || "Role"})`,
                          value: des.id,
                        }))
                      : [{ label: "⚠️ No designations created for this department", value: "" }]
                  }
                />
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    {availableDesignations.length > 0
                      ? `Showing ${availableDesignations.length} designation(s) for ${departments.find((d) => d.id === departmentId)?.name || "this department"}`
                      : `⚠️ No designations found for ${departments.find((d) => d.id === departmentId)?.name || "this department"}`}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <Select
                  label={
                    roleTier === "EMPLOYEE"
                      ? (employeeReportsTo === "TEAM_LEAD"
                          ? "Reporting Supervisor (Team Lead) *"
                          : "Reporting Supervisor (Department Manager) *")
                      : roleTier === "TEAM_LEAD"
                      ? "Reporting Manager (Department Manager) *"
                      : roleTier === "MANAGER"
                      ? (isHeadHr ? "Reporting Manager (Branch HR Admin / Head HR) *" : "Reporting Manager (Branch HR Admin) *")
                      : "Reporting Manager (Head HR / Tenant Admin) *"
                  }
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  options={availableManagers.map((e) => {
                    const isHead = isHeadHrEmployee(e);
                    const tier = classifyEmployee(e);
                    const branch = branches.find((b) => b.id === e.branchId);
                    const branchLabel = branch ? ` • ${branch.city || branch.name}` : (isHead ? " • Corporate HQ / Organization" : "");
                    const tag =
                      isHead
                        ? " [Head HR / Organization Owner]"
                        : tier === "HR_ADMIN"
                        ? " [Branch HR Admin]"
                        : tier === "MANAGER"
                        ? " [Dept Manager]"
                        : tier === "TEAM_LEAD"
                        ? " [Team Lead]"
                        : "";
                    return {
                      label: `${e.firstName} ${e.lastName}${tag}${branchLabel} (${e.employeeCode})`,
                      value: e.id,
                    };
                  })}
                />
                <p className="text-[11px] text-slate-500">
                  {roleTier === "EMPLOYEE" &&
                    (employeeReportsTo === "TEAM_LEAD"
                      ? "↳ Hierarchy: Individual contributors report directly to their assigned Team Lead."
                      : "↳ Hierarchy: In divisions without Team Leads (e.g. Sales), employee reports directly to Department Manager.")}
                  {roleTier === "TEAM_LEAD" && "↳ Hierarchy: Team Leads report directly to their Department Manager."}
                  {roleTier === "MANAGER" && "↳ Hierarchy: Department Managers report directly to the Branch HR Admin."}
                  {roleTier === "HR_ADMIN" && "↳ Hierarchy: Branch HR Admins report to the Organization Head HR (Tenant Admin)."}
                </p>
              </div>
              <Input
                label="Joining Date *"
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                required
              />
              <Select
                label="Assigned Shift *"
                value={shiftId}
                onChange={(e) => setShiftId(e.target.value)}
                options={shifts.map((s) => ({
                  label: `${s.name} (${s.startTime} - ${s.endTime})`,
                  value: s.id,
                }))}
              />
            </div>
          </div>
        )}

        {/* Step 3: Statutory */}
        {currentStep === 3 && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-sm font-semibold text-gray-950">Indian Statutory Compliance Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Permanent Account Number (PAN)"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                required
              />
              <Input
                label="Aadhaar Card Number"
                value={aadhaar}
                onChange={(e) => setAadhaar(e.target.value)}
                placeholder="4512 7890 2345"
                required
              />
              <Input
                label="Universal Account Number (EPFO UAN)"
                value={uan}
                onChange={(e) => setUan(e.target.value)}
                placeholder="100912457899"
                required
              />
              <Input
                label="ESIC IP Number"
                value={esicNumber}
                onChange={(e) => setEsicNumber(e.target.value)}
                placeholder="3100456799"
                required
              />
            </div>
          </div>
        )}

        {/* Step 4: Banking */}
        {currentStep === 4 && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-sm font-semibold text-gray-950">Salary Disbursement Bank Account</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Bank Name"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. HDFC Bank Ltd."
                required
              />
              <Input
                label="Account Number"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="50100456789123"
                required
              />
              <Input
                label="IFSC Code"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                placeholder="HDFC0000052"
                required
              />
              <Input
                label="Account Holder Name"
                value={accountHolderName || `${firstName} ${lastName}`}
                onChange={(e) => setAccountHolderName(e.target.value)}
                placeholder="Full Name as per Bank Passbook"
                required
              />
            </div>
          </div>
        )}

        {/* Step 5: Salary */}
        {currentStep === 5 && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-sm font-semibold text-gray-950">Compensation & Salary Structure</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Monthly Gross CTC (INR)"
                type="number"
                value={monthlyCtc}
                onChange={(e) => setMonthlyCtc(Number(e.target.value))}
                required
              />
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-center">
                <span className="text-xs text-gray-500 font-medium">Annual CTC</span>
                <span className="text-xl font-bold text-gray-950">
                  {formatINR(monthlyCtc * 12)} / annum
                </span>
              </div>
            </div>

            {/* Calculated Breakdown Preview */}
            <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
                Automatic Salary Structure Breakdown
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-text-muted">Basic Salary (50%):</span>
                  <p className="font-bold text-text-primary">{formatINR(monthlyCtc * 0.5)}</p>
                </div>
                <div>
                  <span className="text-text-muted">HRA (25%):</span>
                  <p className="font-bold text-text-primary">{formatINR(monthlyCtc * 0.25)}</p>
                </div>
                <div>
                  <span className="text-text-muted">Special Allowance:</span>
                  <p className="font-bold text-text-primary">{formatINR(monthlyCtc * 0.25)}</p>
                </div>
                <div>
                  <span className="text-text-muted">EPF Deduction (12%):</span>
                  <p className="font-bold text-rose-600">₹1,800</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Review & Finish */}
        {currentStep === 6 && (
          <div className="space-y-4 animate-fade-in">
            <h4 className="text-sm font-semibold text-gray-950">Review & Verification</h4>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Employee profile is ready for immediate enterprise activation!
              </div>
              <p className="text-emerald-800">
                Once saved, this employee will appear in the directory, attendance roster,
                and PostgreSQL database with portal login access enabled.
              </p>
            </div>

            {/* Onboarding Hierarchy & Location Summary */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Branch Location</span>
                <span className="font-semibold text-slate-900 flex items-center gap-1 text-[11px] truncate">
                  {assignedBranch ? `📍 ${assignedBranch.name}` : (branches.find((b) => b.id === branchId)?.name || "Assigned Branch")}
                  {assignedBranch && <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">LOCKED</span>}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Hierarchy Tier</span>
                <span className="font-semibold text-slate-900 text-[11px]">
                  {roleTier === "EMPLOYEE" ? "Employee" : roleTier === "TEAM_LEAD" ? "Team Lead" : roleTier === "MANAGER" ? "Dept Manager" : "Branch HR"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Department</span>
                <span className="font-semibold text-slate-900 text-[11px] truncate block">
                  {departments.find((d) => d.id === departmentId)?.name || "General"}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Reports To</span>
                <span className="font-semibold text-slate-900 text-[11px] truncate block">
                  {availableManagers.find((m) => m.id === managerId)?.firstName || "Supervisor"} {availableManagers.find((m) => m.id === managerId)?.lastName || ""}
                </span>
              </div>
            </div>

            {/* Portal Login Credentials Card */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-2.5">
              <div className="flex items-center gap-2 font-semibold text-gray-900">
                <KeyRound className="w-4 h-4 text-indigo-600" />
                <span>Backend User Account Credentials:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-600 pt-1">
                <div className="p-2.5 bg-white rounded-lg border border-gray-200">
                  <span className="text-[10px] text-gray-400 block uppercase font-medium">Work Email (Login ID)</span>
                  <span className="font-semibold text-gray-900 text-xs">{email || "Not specified"}</span>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-gray-200">
                  <span className="text-[10px] text-gray-400 block uppercase font-medium">Initial Password</span>
                  <span className="font-mono font-semibold text-gray-900 text-xs">{password || "Welcome@123"}</span>
                </div>
              </div>
              <p className="text-[11px] text-gray-500">
                Employee can immediately sign in at the <span className="font-medium text-gray-800">/login</span> page using these credentials with role <span className="font-mono text-gray-800">ROLE_EMPLOYEE</span>.
              </p>
            </div>

            <div className="border border-dashed border-gray-300 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Upload className="w-5 h-5 text-gray-700" />
                <div>
                  <p className="text-xs font-semibold text-text-primary">Appointment Document</p>
                  <p className="text-[11px] text-text-muted">{uploadedDocName}</p>
                </div>
              </div>
              <Badge variant="success" size="sm">
                Ready to attach
              </Badge>
            </div>
          </div>
        )}
      </div>

      {/* Stepper Navigation Footer */}
      <div className="mt-6 pt-4 border-t border-surface-border flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => {
            if (currentStep > 1) setCurrentStep(currentStep - 1);
            else onClose();
          }}
          leftIcon={<ChevronLeft className="w-4 h-4" />}
        >
          {currentStep === 1 ? "Cancel" : "Previous"}
        </Button>

        {currentStep < 6 ? (
          <Button
            variant="primary"
            onClick={() => setCurrentStep(currentStep + 1)}
            rightIcon={<ChevronRight className="w-4 h-4" />}
          >
            Continue
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleFinish}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            Finish & Activate Employee
          </Button>
        )}
      </div>
    </Modal>
  );
}

import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/authContext";
import { ToastProvider } from "./lib/toastContext";
import { HrmsProvider } from "./lib/hrmsContext";
import { AppShell } from "./components/layout/AppShell";
import { AddEmployeeModal } from "./pages/people/AddEmployeeModal";
import { ApplyLeaveModal } from "./pages/leave/ApplyLeaveModal";

// Pages
import { LandingPage } from "./pages/landing/LandingPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { EmployeesPage } from "./pages/people/EmployeesPage";
import { EmployeeProfilePage } from "./pages/people/EmployeeProfilePage";
import { DepartmentsPage } from "./pages/people/DepartmentsPage";
import { DesignationsPage } from "./pages/people/DesignationsPage";
import { BranchesPage } from "./pages/people/BranchesPage";
import { OrganizationPage } from "./pages/people/OrganizationPage";
import { DocumentsPage } from "./pages/people/DocumentsPage";
import { AttendancePage } from "./pages/time/AttendancePage";
import { RegularizationPage } from "./pages/time/RegularizationPage";
import { ShiftsPage } from "./pages/time/ShiftsPage";
import { HolidaysPage } from "./pages/time/HolidaysPage";
import { LeaveOverviewPage } from "./pages/leave/LeaveOverviewPage";
import { LeaveRequestsPage } from "./pages/leave/LeaveRequestsPage";
import { LeavePoliciesPage } from "./pages/leave/LeavePoliciesPage";
import { PayrollDashboardPage } from "./pages/payroll/PayrollDashboardPage";
import { SalaryStructurePage } from "./pages/payroll/SalaryStructurePage";
import { PayrollRunPage } from "./pages/payroll/PayrollRunPage";
import { PayslipsPage } from "./pages/payroll/PayslipsPage";
import { ReportsPage } from "./pages/reports/ReportsPage";
import { UsersRolesPage } from "./pages/admin/UsersRolesPage";
import { OrganizationsPage } from "./pages/admin/OrganizationsPage";
import { SettingsPage } from "./pages/admin/SettingsPage";
import { NotificationsPage } from "./pages/admin/NotificationsPage";
import { AuditLogsPage } from "./pages/admin/AuditLogsPage";
import { RecruitmentPage } from "./pages/recruitment/RecruitmentPage";
import { AssetsPage } from "./pages/assets/AssetsPage";
import { PerformancePage } from "./pages/performance/PerformancePage";

import { UserRole } from "./types/hrms";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function RoleRoute({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const role = user?.role || "EMPLOYEE";
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function MainAppContent() {
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isApplyLeaveOpen, setIsApplyLeaveOpen] = useState(false);

  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Dashboard Layout */}
        <Route
          element={
            <ProtectedRoute>
              <AppShell
                onOpenAddEmployee={() => setIsAddEmployeeOpen(true)}
                onOpenApplyLeave={() => setIsApplyLeaveOpen(true)}
              />
            </ProtectedRoute>
          }
        >
          <Route
            path="/dashboard"
            element={
              <DashboardPage
                onOpenAddEmployee={() => setIsAddEmployeeOpen(true)}
                onOpenApplyLeave={() => setIsApplyLeaveOpen(true)}
              />
            }
          />

          {/* People Module */}
          <Route
            path="/people/employees"
            element={
              <RoleRoute allowedRoles={["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN", "MANAGER", "TEAM_LEAD"]}>
                <EmployeesPage onOpenAddEmployee={() => setIsAddEmployeeOpen(true)} />
              </RoleRoute>
            }
          />
          <Route
            path="/people/employees/:id"
            element={
              <RoleRoute allowedRoles={["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN", "MANAGER", "TEAM_LEAD", "EMPLOYEE"]}>
                <EmployeeProfilePage />
              </RoleRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <RoleRoute allowedRoles={["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN", "MANAGER", "TEAM_LEAD", "EMPLOYEE"]}>
                <EmployeeProfilePage />
              </RoleRoute>
            }
          />
          <Route
            path="/people/departments"
            element={
              <RoleRoute allowedRoles={["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN"]}>
                <DepartmentsPage />
              </RoleRoute>
            }
          />
          <Route
            path="/people/designations"
            element={
              <RoleRoute allowedRoles={["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN"]}>
                <DesignationsPage />
              </RoleRoute>
            }
          />
          <Route
            path="/people/branches"
            element={
              <RoleRoute allowedRoles={["SUPER_ADMIN", "TENANT_ADMIN"]}>
                <BranchesPage />
              </RoleRoute>
            }
          />
          <Route
            path="/people/organization"
            element={
              <RoleRoute allowedRoles={["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN"]}>
                <OrganizationPage />
              </RoleRoute>
            }
          />
          <Route
            path="/people/documents"
            element={
              <RoleRoute allowedRoles={["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN", "MANAGER", "TEAM_LEAD", "EMPLOYEE"]}>
                <DocumentsPage />
              </RoleRoute>
            }
          />

          {/* Time & Attendance */}
          <Route path="/time/attendance" element={<AttendancePage />} />
          <Route
            path="/time/regularization"
            element={
              <RoleRoute allowedRoles={["TENANT_ADMIN", "HR_ADMIN", "MANAGER", "TEAM_LEAD"]}>
                <RegularizationPage />
              </RoleRoute>
            }
          />
          <Route
            path="/time/shifts"
            element={
              <RoleRoute allowedRoles={["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN"]}>
                <ShiftsPage />
              </RoleRoute>
            }
          />
          <Route path="/time/holidays" element={<HolidaysPage />} />

          {/* Leave Management */}
          <Route
            path="/leave/overview"
            element={
              <RoleRoute allowedRoles={["TENANT_ADMIN", "HR_ADMIN", "MANAGER", "TEAM_LEAD", "EMPLOYEE"]}>
                <LeaveOverviewPage onOpenApplyLeave={() => setIsApplyLeaveOpen(true)} />
              </RoleRoute>
            }
          />
          <Route
            path="/leave/requests"
            element={
              <RoleRoute allowedRoles={["TENANT_ADMIN", "HR_ADMIN", "MANAGER", "TEAM_LEAD", "EMPLOYEE"]}>
                <LeaveRequestsPage onOpenApplyLeave={() => setIsApplyLeaveOpen(true)} />
              </RoleRoute>
            }
          />
          <Route
            path="/leave/policies"
            element={
              <RoleRoute allowedRoles={["TENANT_ADMIN", "HR_ADMIN"]}>
                <LeavePoliciesPage />
              </RoleRoute>
            }
          />

          {/* Payroll Management */}
          <Route
            path="/payroll/dashboard"
            element={
              <RoleRoute allowedRoles={["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN", "PAYROLL_ADMIN"]}>
                <PayrollDashboardPage />
              </RoleRoute>
            }
          />
          <Route
            path="/payroll/salary-structures"
            element={
              <RoleRoute allowedRoles={["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN", "PAYROLL_ADMIN"]}>
                <SalaryStructurePage />
              </RoleRoute>
            }
          />
          <Route
            path="/payroll/runs"
            element={
              <RoleRoute allowedRoles={["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN", "PAYROLL_ADMIN"]}>
                <PayrollRunPage />
              </RoleRoute>
            }
          />
          <Route path="/payroll/payslips" element={<PayslipsPage />} />

          {/* Reports */}
          <Route
            path="/reports"
            element={
              <RoleRoute allowedRoles={["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN", "MANAGER"]}>
                <ReportsPage />
              </RoleRoute>
            }
          />

          {/* Administration */}
          <Route
            path="/admin/organizations"
            element={
              <RoleRoute allowedRoles={["SUPER_ADMIN"]}>
                <OrganizationsPage />
              </RoleRoute>
            }
          />
          <Route
            path="/admin/users-roles"
            element={
              <RoleRoute allowedRoles={["SUPER_ADMIN", "TENANT_ADMIN"]}>
                <UsersRolesPage />
              </RoleRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <RoleRoute allowedRoles={["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN"]}>
                <SettingsPage />
              </RoleRoute>
            }
          />
          <Route path="/admin/notifications" element={<NotificationsPage />} />
          <Route
            path="/admin/audit-logs"
            element={
              <RoleRoute allowedRoles={["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN"]}>
                <AuditLogsPage />
              </RoleRoute>
            }
          />

          {/* Extended Enterprise Modules */}
          <Route
            path="/recruitment"
            element={
              <RoleRoute allowedRoles={["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN"]}>
                <RecruitmentPage />
              </RoleRoute>
            }
          />
          <Route
            path="/assets"
            element={
              <RoleRoute allowedRoles={["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN"]}>
                <AssetsPage />
              </RoleRoute>
            }
          />
          <Route
            path="/performance"
            element={
              <RoleRoute allowedRoles={["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN", "MANAGER", "TEAM_LEAD"]}>
                <PerformancePage />
              </RoleRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>

      {/* Global Modals */}
      <AddEmployeeModal
        isOpen={isAddEmployeeOpen}
        onClose={() => setIsAddEmployeeOpen(false)}
      />

      <ApplyLeaveModal
        isOpen={isApplyLeaveOpen}
        onClose={() => setIsApplyLeaveOpen(false)}
      />
    </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <HrmsProvider>
            <MainAppContent />
          </HrmsProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;

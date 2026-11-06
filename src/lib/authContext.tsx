import React, { createContext, useContext, useState, useEffect } from "react";
import { CurrentUser, UserRole } from "../types/hrms";
import { storage, STORAGE_KEYS } from "./storage";
import { DEFAULT_USER } from "./storageInit";
import { authApi, setAuthTokens, clearAuthTokens, getAccessToken } from "./api";

interface AuthContextType {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  login: (email: string, role?: UserRole, password?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CurrentUser | null>(() => {
    return storage.get<CurrentUser | null>(STORAGE_KEYS.USER, DEFAULT_USER);
  });

  useEffect(() => {
    const unsubscribe = storage.subscribe(({ key, value }) => {
      if (key === STORAGE_KEYS.USER) {
        setUser(value);
      }
    });
    return unsubscribe;
  }, []);

  const login = async (
    email: string,
    role?: UserRole,
    password?: string
  ): Promise<{ success: boolean; message?: string }> => {
    if (!email || !email.trim()) {
      return { success: false, message: "Work email address is required" };
    }
    if (!password || !password.trim()) {
      return { success: false, message: "Password is required" };
    }

    try {
      const result = await authApi.login(email.trim(), password.trim());
      if (result && result.accessToken) {
        const roles = result.user.roles || [];
        const isSuperAdmin = roles.some((r) => r === "ROLE_SUPER_ADMIN");
        const isTenantAdmin = roles.some((r) => r === "ROLE_TENANT_ADMIN");
        const isHrAdmin = roles.some((r) => r === "ROLE_HR_ADMIN");
        const isManager = roles.some((r) => r === "ROLE_MANAGER");
        const isTeamLead = roles.some((r) => r === "ROLE_TEAM_LEAD");
        const isEmployee = roles.some((r) => r === "ROLE_EMPLOYEE");

        // Determine user's real primary account portal
        let actualPortalRole: UserRole = "EMPLOYEE";
        let actualPortalLabel = "Employee";
        if (isSuperAdmin) {
          actualPortalRole = "SUPER_ADMIN";
          actualPortalLabel = "Super Admin";
        } else if (isTenantAdmin) {
          actualPortalRole = "TENANT_ADMIN";
          actualPortalLabel = "HR Head";
        } else if (isHrAdmin) {
          actualPortalRole = "HR_ADMIN";
          actualPortalLabel = "HR Admin";
        } else if (isManager) {
          actualPortalRole = "MANAGER";
          actualPortalLabel = "Manager";
        } else if (isTeamLead) {
          actualPortalRole = "TEAM_LEAD";
          actualPortalLabel = "Team Lead";
        }

        // Strict role-portal check: 4 portals (SUPER_ADMIN, TENANT_ADMIN, HR_ADMIN, EMPLOYEE)
        if (role) {
          const isPermittedForPortal =
            (role === "SUPER_ADMIN" && isSuperAdmin) ||
            (role === "TENANT_ADMIN" && (isTenantAdmin || isSuperAdmin)) ||
            (role === "HR_ADMIN" && (isHrAdmin || isTenantAdmin || isSuperAdmin)) ||
            (role === "EMPLOYEE") ||
            (role === "MANAGER" && (isManager || isTeamLead || isHrAdmin || isTenantAdmin || isSuperAdmin));

          if (!isPermittedForPortal) {
            clearAuthTokens();
            let targetPortalName = "Employee";
            if (role === "SUPER_ADMIN") targetPortalName = "Super Admin";
            else if (role === "TENANT_ADMIN") targetPortalName = "HR Head";
            else if (role === "HR_ADMIN") targetPortalName = "HR Admin";

            return {
              success: false,
              message: `Portal Mismatch: You selected "${targetPortalName}", but this email (${email.trim()}) is registered as ${actualPortalLabel}. Please select the appropriate portal above to sign in.`,
            };
          }

          if (role === "EMPLOYEE") {
            actualPortalRole = isManager ? "MANAGER" : isTeamLead ? "TEAM_LEAD" : "EMPLOYEE";
          } else {
            actualPortalRole = role;
          }
        }

        setAuthTokens(result.accessToken, result.refreshToken);

        const mappedRole: UserRole = actualPortalRole;
        const fullName = result.user.fullName || `${result.user.firstName} ${result.user.lastName}`.trim();
        const isHeadTenant = isSuperAdmin || isTenantAdmin;
        const inferredScopeBranchId = result.user.scopeBranchId 
          ? Number(result.user.scopeBranchId) 
          : undefined;

        const loggedInUser: CurrentUser = {
          id: String(result.user.employeeId || result.user.id),
          name: fullName,
          fullName: fullName,
          email: result.user.email,
          role: mappedRole,
          roles: roles,
          employeeCode: result.user.employeeCode,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0f172a&color=fff`,
          employeeId: result.user.employeeCode || (result.user.employeeId ? `EMP-${String(result.user.employeeId).padStart(4, "0")}` : undefined),
          designation: result.user.designationName || (mappedRole === "SUPER_ADMIN" ? "Platform Administrator" : isHeadTenant ? "Head of Human Resources" : mappedRole === "HR_ADMIN" ? "Branch HR Administrator" : mappedRole === "MANAGER" ? "Department Manager" : "Employee"),
          department: result.user.departmentName || result.user.companyName || "Global Automations HRMS",
          companyId: result.user.companyId ? Number(result.user.companyId) : undefined,
          companyName: result.user.companyName || undefined,
          scopeType: (result.user.scopeType || (isSuperAdmin ? "PLATFORM" : isHeadTenant ? "ORGANIZATION" : "BRANCH")) as any,
          scopeBranchId: inferredScopeBranchId,
          branchId: inferredScopeBranchId ? String(inferredScopeBranchId) : undefined,
          branchName: (result.user as any).branchName || undefined,
          isTenantAdmin: isTenantAdmin,
        };

        storage.set(STORAGE_KEYS.USER, loggedInUser);
        setUser(loggedInUser);
        return { success: true, message: "Login successful" };
      }
      return { success: false, message: "Authentication failed. No access token returned." };
    } catch (err: any) {
      return { success: false, message: err?.message || "Invalid corporate email or password" };
    }
  };

  const logout = () => {
    clearAuthTokens();
    storage.set<CurrentUser | null>(STORAGE_KEYS.USER, null);
    setUser(null);
  };

  const switchRole = (newRole: UserRole) => {
    if (user) {
      const updated: CurrentUser = { ...user, role: newRole };
      storage.set(STORAGE_KEYS.USER, updated);
      setUser(updated);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        switchRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

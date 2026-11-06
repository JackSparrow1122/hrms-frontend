import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  GitBranch,
  Briefcase,
  Network,
  FileText,
  Clock,
  ClockAlert,
  CalendarDays,
  CalendarCheck2,
  CalendarRange,
  FileCheck,
  ShieldCheck,
  WalletCards,
  Coins,
  Receipt,
  FileSpreadsheet,
  BarChart3,
  UserCheck,
  Settings,
  Bell,
  ScrollText,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  Laptop,
  Target,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../lib/authContext";
import { useHrms } from "../../lib/hrmsContext";
import { GaHrmsLogo } from "../ui/GaHrmsLogo";

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  roles?: string[];
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

export interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { leaveRequests, regularizations, notifications, company } = useHrms();

  const role = user?.role || "SUPER_ADMIN";

  const pendingLeavesCount = React.useMemo(() => {
    if (role === "EMPLOYEE") {
      const currentEmpId = user?.employeeId ? String(user.employeeId) : "";
      const currentEmpCode = user?.employeeCode ? user.employeeCode.toUpperCase() : "";
      return leaveRequests.filter((l) => {
        if (l.status !== "PENDING") return false;
        return (
          (currentEmpId && String(l.employeeId) === currentEmpId) ||
          (currentEmpCode && (l as any).employeeCode?.toUpperCase() === currentEmpCode)
        );
      }).length;
    }
    return leaveRequests.filter((l) => l.status === "PENDING").length;
  }, [leaveRequests, role, user]);

  const pendingRegsCount = regularizations.filter((r) => r.status === "PENDING").length;
  const unreadNotifsCount = notifications.filter((n) => !n.isRead).length;

  const navigationGroups: NavGroup[] = [
    {
      group: "Overview",
      items: [
        { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
        {
          label: "My Profile",
          path: `/profile`,
          icon: Users,
        },
      ],
    },
    {
      group: "People",
      items: [
        {
          label: "Employees",
          path: "/people/employees",
          icon: Users,
          roles: ["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN"],
        },
        { label: "Branches", path: "/people/branches", icon: GitBranch, roles: ["SUPER_ADMIN", "TENANT_ADMIN"] },
        { label: "Departments", path: "/people/departments", icon: Building2, roles: ["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN"] },
        { label: "Designations", path: "/people/designations", icon: Briefcase, roles: ["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN"] },
        { label: "Organization", path: "/people/organization", icon: Network, roles: ["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN"] },
        { label: "Documents", path: "/people/documents", icon: FileText, roles: ["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN", "MANAGER", "TEAM_LEAD", "EMPLOYEE"] },
      ],
    },
    {
      group: "Time",
      items: [
        { label: "Attendance", path: "/time/attendance", icon: Clock },
        {
          label: "Regularization",
          path: "/time/regularization",
          icon: ClockAlert,
          roles: ["TENANT_ADMIN", "HR_ADMIN", "MANAGER", "TEAM_LEAD"],
          badge: pendingRegsCount > 0 ? pendingRegsCount : undefined,
        },
        { label: "Shifts", path: "/time/shifts", icon: CalendarRange, roles: ["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN"] },
        { label: "Holidays", path: "/time/holidays", icon: CalendarDays },
      ],
    },
    {
      group: "Leave",
      items: [
        {
          label: role === "EMPLOYEE" ? "My Leaves" : "Leave Requests",
          path: "/leave/requests",
          icon: FileCheck,
          roles: ["TENANT_ADMIN", "HR_ADMIN", "MANAGER", "TEAM_LEAD", "EMPLOYEE"],
          badge: pendingLeavesCount > 0 ? pendingLeavesCount : undefined,
        },
        {
          label: "Leave Overview",
          path: "/leave/overview",
          icon: CalendarCheck2,
          roles: ["TENANT_ADMIN", "HR_ADMIN", "MANAGER", "TEAM_LEAD", "EMPLOYEE"],
        },
        {
          label: "Leave Policies",
          path: "/leave/policies",
          icon: ShieldCheck,
          roles: ["TENANT_ADMIN", "HR_ADMIN"],
        },
      ],
    },
    {
      group: "Payroll",
      items: [
        { label: "Payroll Dashboard", path: "/payroll/dashboard", icon: WalletCards, roles: ["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN", "PAYROLL_ADMIN"] },
        { label: "Salary Structures", path: "/payroll/salary-structures", icon: Coins, roles: ["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN", "PAYROLL_ADMIN"] },
        { label: "Payroll Runs", path: "/payroll/runs", icon: Receipt, roles: ["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN", "PAYROLL_ADMIN"] },
        { label: "Payslips", path: "/payroll/payslips", icon: FileSpreadsheet, roles: ["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN", "PAYROLL_ADMIN"] },
      ],
    },
    {
      group: "Reports",
      items: [
        { label: "Reports Center", path: "/reports", icon: BarChart3, roles: ["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN"] },
      ],
    },
    {
      group: "Administration",
      items: [
        { label: "Tenant Organizations", path: "/admin/organizations", icon: Building2, roles: ["SUPER_ADMIN"] },
        { label: "Users & Roles", path: "/admin/users-roles", icon: UserCheck, roles: ["SUPER_ADMIN", "TENANT_ADMIN"] },
        { label: "Company Settings", path: "/admin/settings", icon: Settings, roles: ["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN"] },
        {
          label: "Notifications",
          path: "/admin/notifications",
          icon: Bell,
          roles: ["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN"],
          badge: unreadNotifsCount > 0 ? unreadNotifsCount : undefined,
        },
        { label: "Audit Logs", path: "/admin/audit-logs", icon: ScrollText, roles: ["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN"] },
      ],
    },
    {
      group: "More Modules",
      items: [
        { label: "Recruitment & ATS", path: "/recruitment", icon: Briefcase, roles: ["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN"] },
        { label: "Asset & IT", path: "/assets", icon: Laptop, roles: ["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN"] },
        { label: "Performance & OKRs", path: "/performance", icon: Target, roles: ["SUPER_ADMIN", "TENANT_ADMIN", "HR_ADMIN"] },
      ],
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-gray-950 text-gray-400 border-r border-gray-900 select-none">
      {/* Brand Header */}
      <div
        className={cn(
          "h-14 flex items-center border-b border-gray-900 shrink-0 bg-gray-950 transition-all",
          collapsed ? "justify-center px-1" : "justify-between px-3"
        )}
      >
        {collapsed ? (
          <button
            onClick={onToggleCollapse}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-900 transition-colors"
            title="Expand Sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2.5 overflow-hidden">
              <NavLink to="/dashboard" className="flex items-center group">
                <GaHrmsLogo size="sm" variant="dark" iconOnly={false} />
              </NavLink>
            </div>

            {/* Desktop Collapse Toggle */}
            <button
              onClick={onToggleCollapse}
              className="hidden md:flex p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-900 transition-colors"
              title="Collapse Sidebar"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Company Selector Widget */}
      {!collapsed && (
        <div className="px-2.5 py-2.5 border-b border-gray-900 bg-gray-950">
          <div className="px-2.5 py-1.5 rounded-lg bg-gray-900/90 border border-gray-800 flex items-center justify-between gap-2 text-xs">
            <div className="truncate">
              <p className="font-semibold text-white truncate leading-tight">
                {company.name || "Gryphon Technologies"}
              </p>
              <p className="text-[11px] text-gray-400 truncate mt-0.5">
                {company.headquarters ? "Pune HQ (4 Branches)" : "Enterprise Tenant"}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          </div>
        </div>
      )}

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {navigationGroups.map((group) => {
          // Filter items based on user role
          const visibleItems = group.items.filter(
            (item) => !item.roles || item.roles.includes(role)
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={group.group} className="space-y-1">
              {!collapsed && (
                <p className="px-2.5 text-[9.5px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">
                  {group.group}
                </p>
              )}
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  (item.path !== "/dashboard" && location.pathname.startsWith(item.path));

                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onCloseMobile}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-150 group relative",
                      isActive
                        ? "bg-white/10 text-white shadow-2xs font-semibold"
                        : "text-gray-400 hover:bg-gray-900 hover:text-white"
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-4 h-4 shrink-0 transition-transform duration-150",
                        isActive ? "text-white" : "text-gray-400 group-hover:text-white"
                      )}
                    />

                    {!collapsed && <span className="truncate flex-1">{item.label}</span>}

                    {!collapsed && item.badge !== undefined && (
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-auto shrink-0",
                          isActive
                            ? "bg-white text-gray-950"
                            : "bg-gray-800 text-gray-200"
                        )}
                      >
                        {item.badge}
                      </span>
                    )}

                    {collapsed && item.badge !== undefined && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400" />
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* User Status Bar at Bottom */}
      <div className="p-2.5 border-t border-gray-900 bg-gray-950 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <img
              src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
              alt={user?.name || "User"}
              className="w-8 h-8 rounded-full object-cover border border-gray-800"
            />
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-gray-950" />
          </div>

          {!collapsed && (
            <div className="truncate flex-1">
              <p className="text-xs font-semibold text-white truncate leading-tight">
                {user?.name}
              </p>
              <p className="text-[10px] text-gray-400 truncate uppercase tracking-wider mt-0.5">
                {user?.role.replace("_", " ")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:block h-screen sticky top-0 transition-all duration-300 z-30 shrink-0",
          collapsed ? "w-16" : "w-56"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-60 transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </div>
    </>
  );
}

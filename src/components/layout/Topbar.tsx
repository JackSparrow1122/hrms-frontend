import React, { useState, useRef, useEffect } from "react";
import {
  Menu,
  Search,
  Bell,
  Clock,
  LogOut,
  User,
  Shield,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  Monitor,
} from "lucide-react";
import { useAuth } from "../../lib/authContext";
import { useHrms } from "../../lib/hrmsContext";
import { UserRole } from "../../types/hrms";
import { useNavigate } from "react-router-dom";
import { cn } from "../../lib/utils";
import { GaHrmsLogo } from "../ui/GaHrmsLogo";

export interface TopbarProps {
  onOpenMobileSidebar: () => void;
  onOpenSearch: () => void;
}

export function Topbar({ onOpenMobileSidebar, onOpenSearch }: TopbarProps) {
  const { user, logout, switchRole } = useAuth();
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    attendance,
    punchAttendance,
    resetAllData,
    settings,
    updateSettings,
  } = useHrms();
  const navigate = useNavigate();

  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifMenu(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (roleRef.current && !roleRef.current.contains(event.target as Node)) {
        setShowRoleMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Today's attendance status for current logged in user
  const todayStr = "2026-10-06";
  const userTodayAttendance = attendance.find(
    (a) => a.employeeId === user?.employeeId && a.date === todayStr
  );
  const isPunchedIn = !!userTodayAttendance?.firstIn && !userTodayAttendance?.lastOut;

  const unreadNotifs = notifications.filter((n) => !n.isRead);

  const handlePunchToggle = () => {
    if (!user?.employeeId) return;
    if (isPunchedIn) {
      punchAttendance(user.employeeId, "OUT");
    } else {
      punchAttendance(user.employeeId, "IN");
    }
  };

  const rolesList: { role: UserRole; label: string; desc: string }[] = [
    { role: "SUPER_ADMIN", label: "Super Admin", desc: "Full platform & organization access" },
    { role: "HR_ADMIN", label: "HR Admin", desc: "People, payroll, leave & policy control" },
    { role: "MANAGER", label: "Manager", desc: "Team attendance, leaves & regularizations" },
    { role: "EMPLOYEE", label: "Employee (ESS)", desc: "Self-service portal, leaves, payslips" },
  ];

  return (
    <header className="h-16 bg-white border-b border-surface-border sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between gap-4 select-none">
      {/* Left: Mobile hamburger + Global Search Trigger */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={onOpenMobileSidebar}
          className="md:hidden p-2 text-text-secondary hover:text-text-primary hover:bg-gray-100 rounded-lg"
          aria-label="Open mobile menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="md:hidden shrink-0">
          <GaHrmsLogo size="xs" variant="light" />
        </div>

        {/* Global Search Input Button */}
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-2 bg-surface-bg border border-surface-border rounded-input text-sm text-text-muted hover:border-gray-400 hover:bg-white transition-all shadow-xs group"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-text-muted group-hover:text-gray-900 transition-colors" />
            <span className="truncate">Search employees, departments, payroll...</span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded shadow-2xs">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Right: Quick Punch, Role Switcher, Notifications, User Menu */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Quick Punch-In / Punch-Out Widget */}
        <button
          onClick={handlePunchToggle}
          className={`hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 ${
            isPunchedIn
              ? "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-800"
              : "bg-gray-100 border-gray-200 text-gray-900 hover:bg-gray-950 hover:text-white"
          }`}
          title={isPunchedIn ? "Click to Punch-Out" : "Click to Punch-In"}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>
            {isPunchedIn
              ? `In: ${userTodayAttendance?.firstIn} (Click to Out)`
              : "Web Punch In"}
          </span>
        </button>

        {/* Monitor Density Switcher */}
        <button
          onClick={() => updateSettings({ compactMode: !settings.compactMode })}
          className={cn(
            "hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all",
            settings?.compactMode
              ? "bg-gray-950 text-white border-gray-900 hover:bg-black"
              : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 hover:text-gray-900"
          )}
          title={
            settings?.compactMode
              ? "Current: Compact Monitor Mode (Click for Comfortable View)"
              : "Current: Comfortable View (Click for Compact Monitor Mode)"
          }
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>{settings?.compactMode ? "Compact" : "Comfortable"}</span>
        </button>

        {/* Fast Role Switcher */}
        <div className="relative" ref={roleRef}>
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-200 transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-gray-700" />
            <span>Role: {user?.role.replace("_", " ")}</span>
            <ChevronDown className="w-3 h-3 text-gray-500" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-elevated border border-gray-200 p-2 z-50 animate-scale-in">
              <p className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                Switch Interactive Role
              </p>
              <div className="space-y-1">
                {rolesList.map((r) => (
                  <button
                    key={r.role}
                    onClick={() => {
                      switchRole(r.role);
                      setShowRoleMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                      user?.role === r.role
                        ? "bg-gray-950 text-white font-semibold"
                        : "hover:bg-gray-100 text-gray-900"
                    }`}
                  >
                    <div className="font-semibold">{r.label}</div>
                    <div
                      className={`text-[10px] mt-0.5 ${
                        user?.role === r.role ? "text-gray-300" : "text-gray-500"
                      }`}
                    >
                      {r.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-gray-100 rounded-lg relative transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifs.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
            )}
          </button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-card shadow-elevated border border-surface-border overflow-hidden z-50 animate-scale-in">
              <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between bg-surface-subtle/50">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-text-primary">Notifications</h4>
                  {unreadNotifs.length > 0 && (
                    <span className="text-[10px] font-bold bg-gray-900 text-white px-2 py-0.5 rounded-full">
                      {unreadNotifs.length} new
                    </span>
                  )}
                </div>
                {unreadNotifs.length > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-xs text-gray-900 hover:underline font-semibold"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-text-muted">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.slice(0, 5).map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markNotificationRead(notif.id);
                        if (notif.link) navigate(notif.link);
                        setShowNotifMenu(false);
                      }}
                      className={`p-3.5 hover:bg-gray-50 cursor-pointer transition-colors text-left ${
                        !notif.isRead ? "bg-gray-50/80 font-medium" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-text-primary">
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-text-muted shrink-0">
                          {notif.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                        {notif.message}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2.5 bg-gray-50 border-t border-surface-border text-center">
                <button
                  onClick={() => {
                    navigate("/admin/notifications");
                    setShowNotifMenu(false);
                  }}
                  className="text-xs font-semibold text-gray-900 hover:underline inline-flex items-center gap-1"
                >
                  View all notifications <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-gray-900/10 transition-all"
          >
            <img
              src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"}
              alt=""
              className="w-8 h-8 rounded-full object-cover border border-gray-200"
            />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-card shadow-elevated border border-surface-border p-2 z-50 animate-scale-in">
              <div className="px-3 py-2 border-b border-surface-border mb-1">
                <p className="text-xs font-semibold text-text-primary truncate">
                  {user?.name}
                </p>
                <p className="text-[11px] text-text-secondary truncate mt-0.5">
                  {user?.email}
                </p>
                <span className="inline-block text-[10px] uppercase font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded mt-1.5">
                  {user?.role.replace("_", " ")}
                </span>
              </div>

              <div className="space-y-0.5">
                <button
                  onClick={() => {
                    navigate(`/people/employees/${user?.employeeId || "EMP-1001"}`);
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-text-primary hover:bg-gray-100 transition-colors"
                >
                  <User className="w-4 h-4 text-text-muted" />
                  <span>My Profile</span>
                </button>

                <button
                  onClick={() => {
                    navigate("/admin/settings");
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-text-primary hover:bg-gray-100 transition-colors"
                >
                  <Shield className="w-4 h-4 text-text-muted" />
                  <span>Company Settings</span>
                </button>

                <button
                  onClick={() => {
                    if (window.confirm("Reset all LocalStorage data to fresh demo state?")) {
                      resetAllData();
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-amber-700 hover:bg-amber-50 transition-colors"
                >
                  <RotateCcw className="w-4 h-4 text-amber-600" />
                  <span>Reset Demo Data</span>
                </button>

                <div className="my-1 border-t border-gray-100" />

                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

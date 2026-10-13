import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutGrid,
  Briefcase,
  Laptop,
  Target,
  ArrowRight,
  Shield,
  Layers,
} from "lucide-react";
import { useHrms } from "../../lib/hrmsContext";
import { useAuth } from "../../lib/authContext";
import { cn } from "../../lib/utils";

export function MoreAppsLauncher() {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { jobs, assets, performanceGoals } = useHrms();

  const isAuthorized = user?.role === "SUPER_ADMIN" || user?.role === "HR_ADMIN";

  // Hover handlers with debounce
  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, 220);
  };

  // Close on outside click - Must be called before any early return to obey React Rules of Hooks
  useEffect(() => {
    if (!isAuthorized) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isAuthorized]);

  // If user is not Super Admin or HR Admin, don't show the launcher
  if (!isAuthorized) {
    return null;
  }

  const openJobsCount = jobs.filter((j) => j.status === "OPEN").length;
  const availableAssetsCount = assets.filter((a) => a.status === "AVAILABLE").length;
  const activeOkrsCount = performanceGoals.length;

  const appModules = [
    {
      id: "recruitment",
      title: "Recruitment & ATS",
      description: "Job requisitions, candidate pipeline, interviews & hiring stages.",
      path: "/recruitment",
      icon: Briefcase,
      badgeText: `${openJobsCount} Open Roles`,
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      gradient: "from-indigo-600 to-violet-600 text-white",
      hoverBorder: "hover:border-indigo-400 hover:bg-indigo-50/40",
      active: location.pathname.startsWith("/recruitment"),
    },
    {
      id: "assets",
      title: "Asset & IT Management",
      description: "Hardware inventory, employee laptop assignments & return lifecycle.",
      path: "/assets",
      icon: Laptop,
      badgeText: `${availableAssetsCount} Available`,
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      gradient: "from-teal-600 to-emerald-600 text-white",
      hoverBorder: "hover:border-emerald-400 hover:bg-emerald-50/40",
      active: location.pathname.startsWith("/assets"),
    },
    {
      id: "performance",
      title: "Performance & OKRs",
      description: "Company & departmental goals, key results & 360 appraisal cycles.",
      path: "/performance",
      icon: Target,
      badgeText: `${activeOkrsCount} Active Goals`,
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      gradient: "from-amber-500 to-orange-600 text-white",
      hoverBorder: "hover:border-amber-400 hover:bg-amber-50/40",
      active: location.pathname.startsWith("/performance"),
    },
  ];

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  const isAnyActive = appModules.some((m) => m.active);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger Button with 9-dot square icon */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-150 select-none",
          isOpen || isAnyActive
            ? "bg-gray-900 text-white border-gray-900 shadow-sm"
            : "bg-gray-50 hover:bg-gray-100 text-gray-800 border-gray-200 hover:border-gray-300"
        )}
        title="More Enterprise Modules"
        aria-expanded={isOpen}
      >
        <LayoutGrid className={cn("w-4 h-4 transition-transform duration-200", isOpen && "rotate-90")} />
        <span className="font-semibold tracking-wide">More</span>
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
      </button>

      {/* Flyout Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[380px] sm:w-[440px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50 animate-scale-in">
          {/* Header */}
          <div className="px-4 py-3.5 bg-gradient-to-r from-gray-900 via-slate-900 to-gray-950 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-white/10 text-white backdrop-blur-xs">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold tracking-wide text-white uppercase">
                  Enterprise Modules
                </h3>
                <p className="text-[11px] text-gray-300">
                  Extended tools for Super Admin & HR Ops
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-white/15 px-2 py-0.5 rounded-full text-gray-200 border border-white/10">
              <Shield className="w-3 h-3 text-indigo-300" /> Admin
            </span>
          </div>

          {/* Module Grid List */}
          <div className="p-3 space-y-2 bg-gray-50/50">
            {appModules.map((module) => {
              const Icon = module.icon;
              return (
                <div
                  key={module.id}
                  onClick={() => handleNavigate(module.path)}
                  className={cn(
                    "group relative p-3 rounded-xl border bg-white cursor-pointer transition-all duration-200 flex items-start gap-3.5 shadow-2xs",
                    module.hoverBorder,
                    module.active
                      ? "border-gray-900 ring-1 ring-gray-900/10 bg-gray-50/80"
                      : "border-gray-200/90 hover:shadow-md"
                  )}
                >
                  {/* Icon badge */}
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm bg-gradient-to-br transition-transform group-hover:scale-105",
                      module.gradient
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {module.title}
                        </span>
                        {module.active && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            Active
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0",
                          module.badgeColor
                        )}
                      >
                        {module.badgeText}
                      </span>
                    </div>

                    <p className="text-[11px] text-gray-500 leading-snug line-clamp-2">
                      {module.description}
                    </p>
                  </div>

                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-900 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 bg-white border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-gray-500" />
              <span>3 Enterprise apps available</span>
            </span>
            <span className="font-semibold text-gray-700">GA-HRMS Suite</span>
          </div>
        </div>
      )}
    </div>
  );
}

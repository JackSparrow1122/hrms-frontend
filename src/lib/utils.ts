import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { storage, STORAGE_KEYS } from "./storage";
import { AuditLog, UserRole } from "../types/hrms";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format Indian Rupee currency (e.g. ₹1,50,000)
 */
export function formatINR(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Compact Rupee format (e.g. ₹14.5L, ₹45K)
 */
export function formatCompactINR(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)}Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(0)}K`;
  }
  return formatINR(amount);
}

/**
 * Date formatting (e.g., 06 Oct 2026)
 */
export function formatDate(dateString: string | undefined): string {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return dateString;
  }
}

/**
 * Time formatting (e.g. 09:30 AM)
 * Supports ISO date strings ("2026-10-20T04:05:03Z"), full datetime strings, and simple time strings ("09:30", "18:45:00")
 */
export function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return "--:--";
  try {
    const trimmed = String(timeStr).trim();

    // Check if ISO timestamp or full date string (e.g., contains 'T' or looks like 'YYYY-MM-DD ...')
    if (trimmed.includes("T") || (trimmed.includes("-") && trimmed.includes(":"))) {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }).format(date).toUpperCase();
      }
    }

    // If it's a simple HH:mm or HH:mm:ss string without date
    if (trimmed.includes(":")) {
      const parts = trimmed.split(":");
      const h = Number(parts[0]);
      const m = Number(parts[1]);
      if (!isNaN(h) && !isNaN(m)) {
        const period = h >= 12 ? "PM" : "AM";
        const displayHours = h % 12 || 12;
        return `${String(displayHours).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
      }
    }
    return trimmed;
  } catch {
    return timeStr;
  }
}

/**
 * Format Time including seconds (e.g. 10:03:16 AM)
 */
export function formatTimeWithSeconds(timeStr: string | null | undefined): string {
  if (!timeStr) return "--:--:--";
  try {
    const trimmed = String(timeStr).trim();
    if (trimmed.includes("T") || (trimmed.includes("-") && trimmed.includes(":"))) {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return new Intl.DateTimeFormat("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }).format(date).toUpperCase();
      }
    }
    return formatTime(timeStr);
  } catch {
    return timeStr || "--:--:--";
  }
}

/**
 * Calculate working hours between two times (e.g. "09:30" and "18:45" -> 9.25 hrs)
 */
export function calculateHours(inTime: string | null, outTime: string | null): number {
  if (!inTime || !outTime) return 0;
  try {
    const [h1, m1] = inTime.split(":").map(Number);
    const [h2, m2] = outTime.split(":").map(Number);
    const totalMinutes = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (totalMinutes <= 0) return 0;
    return Math.round((totalMinutes / 60) * 10) / 10;
  } catch {
    return 0;
  }
}
/**
 * Returns today's date in YYYY-MM-DD format, strictly in IST (Asia/Kolkata).
 * Safe for backend API params where timezone must be consistent.
 */
export function getTodayIst(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
}

/**
 * Returns today's date in YYYY-MM-DD format offset by `days` (negative = past),
 * strictly in IST (Asia/Kolkata).
 * Example: getDateIst(-1) = yesterday in IST.
 */
export function getDateIst(daysOffset: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}
/**
 * Calculate statutory Indian payroll components based on monthly CTC
 */
export function calculateSalaryComponents(monthlyCtc: number) {
  // Typical enterprise structure: Basic 50%, HRA 25%, Special Allowance 25%
  const basic = Math.round(monthlyCtc * 0.50);
  const hra = Math.round(monthlyCtc * 0.25);
  const conveyance = 1600;
  const medicalAllowance = 1250;
  const specialAllowance = Math.max(0, monthlyCtc - (basic + hra + conveyance + medicalAllowance));
  const grossEarnings = basic + hra + specialAllowance + conveyance + medicalAllowance;

  // EPF: 12% of basic (capped at ₹15,000 ceiling standard = ₹1,800, or uncapped for high earners)
  const pfEmployee = Math.min(1800, Math.round(basic * 0.12));

  // ESIC: 0.75% of gross if gross <= 21,000; 0 otherwise
  const esicEmployee = grossEarnings <= 21000 ? Math.round(grossEarnings * 0.0075) : 0;

  // Professional Tax: standard Maharashtra slab (₹200 / month, ₹300 in Feb)
  const professionalTax = 200;

  // Estimated monthly TDS (approximate tax slab estimation)
  const annualGross = grossEarnings * 12;
  let estimatedAnnualTax = 0;
  if (annualGross > 1200000) {
    estimatedAnnualTax = (annualGross - 1200000) * 0.20 + 90000;
  } else if (annualGross > 700000) {
    estimatedAnnualTax = (annualGross - 700000) * 0.10 + 20000;
  }
  const tdsMonthly = Math.round(estimatedAnnualTax / 12);

  const totalDeductions = pfEmployee + esicEmployee + professionalTax + tdsMonthly;
  const netSalary = grossEarnings - totalDeductions;

  return {
    monthlyCtc,
    annualCtc: monthlyCtc * 12,
    basic,
    hra,
    specialAllowance,
    conveyance,
    medicalAllowance,
    bonus: 0,
    grossEarnings,
    pfEmployee,
    esicEmployee,
    professionalTax,
    tdsMonthly,
    totalDeductions,
    netSalary,
  };
}

/**
 * Helper to record enterprise audit logs into localStorage
 */
export function recordAuditLog(
  action: string,
  module: AuditLog['module'],
  details: string,
  user?: { id: string; name: string; role: UserRole },
  status: 'SUCCESS' | 'WARNING' | 'FAILED' = 'SUCCESS'
) {
  const currentLogs = storage.get<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
  const newLog: AuditLog = {
    id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    userId: user?.id || 'EMP-1001',
    userName: user?.name || 'Super Administrator',
    userRole: user?.role || 'SUPER_ADMIN',
    action,
    module,
    details,
    ipAddress: '192.168.1.104 (Localhost)',
    status,
  };
  storage.set(STORAGE_KEYS.AUDIT_LOGS, [newLog, ...currentLogs.slice(0, 99)]);
}

/**
 * Helper to trigger browser CSV file download
 */
export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent = [
    headers.join(","),
    ...rows.map(row =>
      row
        .map(field => {
          const str = String(field ?? "");
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

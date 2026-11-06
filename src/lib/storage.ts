/**
 * Enterprise Centralized LocalStorage Data Layer
 * Handles robust JSON serialization, default fallbacks, updates,
 * and window events for cross-component reactive updates.
 */

export const STORAGE_KEYS = {
  INITIALIZED: 'hrms_initialized',
  COMPANY: 'hrms_company',
  USER: 'hrms_user',
  EMPLOYEES: 'hrms_employees',
  DEPARTMENTS: 'hrms_departments',
  DESIGNATIONS: 'hrms_designations',
  BRANCHES: 'hrms_branches',
  ATTENDANCE: 'hrms_attendance',
  REGULARIZATIONS: 'hrms_regularizations',
  LEAVE_TYPES: 'hrms_leave_types',
  LEAVE_REQUESTS: 'hrms_leave_requests',
  HOLIDAYS: 'hrms_holidays',
  SHIFTS: 'hrms_shifts',
  SALARY_STRUCTURES: 'hrms_salary_structures',
  PAYROLL: 'hrms_payroll',
  PAYSLIPS: 'hrms_payslips',
  DOCUMENTS: 'hrms_documents',
  NOTIFICATIONS: 'hrms_notifications',
  AUDIT_LOGS: 'hrms_audit_logs',
  SETTINGS: 'hrms_settings',
  JOBS: 'hrms_jobs',
  CANDIDATES: 'hrms_candidates',
  ASSETS: 'hrms_assets',
  GOALS: 'hrms_goals',
  APPRAISALS: 'hrms_appraisals',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

// Custom event name for instant state sync across components
const HRMS_STORAGE_EVENT = 'hrms_storage_change';

function get<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
}

function set<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    // Dispatch custom window event so all reactive hooks update
    window.dispatchEvent(
      new CustomEvent(HRMS_STORAGE_EVENT, {
        detail: { key, value },
      })
    );
  } catch {
    // ignore
  }
}

function update<T>(key: string, updater: (prev: T) => T, defaultValue: T): T {
  const current = get<T>(key, defaultValue);
  const updated = updater(current);
  set<T>(key, updated);
  return updated;
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
    window.dispatchEvent(
      new CustomEvent(HRMS_STORAGE_EVENT, {
        detail: { key, value: null },
      })
    );
  } catch {
    // ignore
  }
}

function clear(): void {
  try {
    localStorage.clear();
    window.dispatchEvent(
      new CustomEvent(HRMS_STORAGE_EVENT, {
        detail: { key: '*', value: null },
      })
    );
  } catch {
    // ignore
  }
}

function subscribe(callback: (event: { key: string; value: any }) => void): () => void {
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<{ key: string; value: any }>;
    callback(customEvent.detail);
  };
  window.addEventListener(HRMS_STORAGE_EVENT, handler);
  return () => window.removeEventListener(HRMS_STORAGE_EVENT, handler);
}

export const storage = {
  get,
  set,
  update,
  remove,
  clear,
  subscribe,
};

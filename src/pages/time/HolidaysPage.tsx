import React, { useState, useEffect, useMemo } from "react";
import {
  CalendarDays, MapPin, Plus, Trash2, Calendar, CheckCircle2, Sparkles, ShieldCheck, Search, RefreshCw
} from "lucide-react";
import { useHrms } from "../../lib/hrmsContext";
import { useAuth } from "../../lib/authContext";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { formatDate } from "../../lib/utils";
import { useToast } from "../../lib/toastContext";
import { attendanceApi, HolidayItem } from "../../lib/api";

export function HolidaysPage() {
  const { branches } = useHrms();
  const { user } = useAuth();
  const toast = useToast();

  const isHrAdmin =
    user?.role === "HR_ADMIN" ||
    user?.role === "TENANT_ADMIN" ||
    user?.roles?.some((r) => r === "ROLE_HR_ADMIN" || r === "ROLE_TENANT_ADMIN");

  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [holidayName, setHolidayName] = useState("");
  const [holidayDate, setHolidayDate] = useState("2026-11-01");
  const [formError, setFormError] = useState("");

  const computedDay = useMemo(() => {
    if (!holidayDate) return "";
    try {
      const d = new Date(holidayDate);
      return d.toLocaleDateString("en-US", { weekday: "long" });
    } catch {
      return "";
    }
  }, [holidayDate]);

  // 👇 YE HAI SABSE BADA FIX (Object to Array Converter)
  const loadHolidays = async () => {
    setIsLoading(true);
    try {
      const data = await attendanceApi.getHolidayList();

      let finalArray: HolidayItem[] = [];

      // Agar backend se Array aa raha hai (Naya code)
      if (Array.isArray(data)) {
        finalArray = data;
      }
      // Agar backend se Object aa raha hai (Purana code)
      else if (data && typeof data === "object") {
        finalArray = Object.entries(data).map(([dateStr, name], index) => ({
          id: index + 1,
          holidayDate: dateStr,
          name: String(name),
          createdAt: new Date().toISOString(),
        }));
      }

      setHolidays(finalArray);
    } catch (err: any) {
      toast.error("Could not load holidays.");
      setHolidays([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHolidays();
  }, []);

  const filteredHolidays = useMemo(() => {
    if (!searchQuery.trim()) return holidays;
    const q = searchQuery.toLowerCase();
    return holidays.filter(
      (h) => h.name.toLowerCase().includes(q) || h.holidayDate.includes(q)
    );
  }, [holidays, searchQuery]);

  const handleOpenAddModal = () => {
    setHolidayName("");
    setHolidayDate("2026-11-01");
    setFormError("");
    setIsAddModalOpen(true);
  };

  const handleCreateHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayName.trim() || !holidayDate) {
      setFormError("Please enter a holiday name and select a date.");
      return;
    }

    try {
      await attendanceApi.addHoliday({ name: holidayName.trim(), holidayDate });
      toast.success(`Holiday "${holidayName}" declared successfully!`);
      setIsAddModalOpen(false);
      loadHolidays();
    } catch (err: any) {
      toast.error(err.message || "Failed to add holiday.");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}"?`)) return;
    try {
      await attendanceApi.deleteHoliday(id);
      toast.success("Holiday removed.");
      loadHolidays();
    } catch (err: any) {
      toast.error("Failed to delete holiday.");
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-950 tracking-tight">
              Annual Holiday Calendar
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <ShieldCheck className="w-3.5 h-3.5" /> Dynamic
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Declared organization public holidays administered by HR Admin.
          </p>
        </div>

        {isHrAdmin ? (
          <div className="flex items-center gap-2">
            <Button onClick={loadHolidays} variant="outline" isLoading={isLoading} leftIcon={<RefreshCw className="w-4 h-4" />}>
              Refresh
            </Button>
            <Button onClick={handleOpenAddModal} variant="primary" size="md" leftIcon={<Plus className="w-4 h-4" />}>
              Declare Holiday
            </Button>
          </div>
        ) : (
          <div className="text-xs text-gray-500 flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Administered by HR Department</span>
          </div>
        )}
      </div>

      {/* TOTAL COUNT CARD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="p-3.5 sm:p-4 rounded-xl border bg-white border-gray-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Total Calendar Holidays</span>
            <Calendar className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-950">{holidays.length}</span>
            <span className="text-[11px] text-gray-500">declared</span>
          </div>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-white p-3 sm:p-3.5 rounded-xl border border-gray-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search holiday name or date..."
            className="w-full h-9 pl-9 pr-3 text-xs bg-gray-50/70 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl border border-gray-200/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                <th className="py-3.5 px-4">Holiday Name</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Day of Week</th>
                <th className="py-3.5 px-4">Classification</th>
                {isHrAdmin && <th className="py-3.5 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={isHrAdmin ? 5 : 4} className="py-12 text-center text-xs text-gray-400">Loading...</td>
                </tr>
              ) : filteredHolidays.length === 0 ? (
                <tr>
                  <td colSpan={isHrAdmin ? 5 : 4} className="py-12 text-center text-xs text-gray-400">No holidays match your search.</td>
                </tr>
              ) : (
                filteredHolidays.map((h) => {
                  const dayName = new Date(h.holidayDate).toLocaleDateString("en-US", { weekday: "long" });
                  return (
                    <tr key={h.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-gray-900 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                          <CalendarDays className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs">{h.name}</span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-medium text-xs text-gray-900">
                        {formatDate(h.holidayDate)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-600">{dayName}</td>
                      <td className="py-3.5 px-4">
                        <Badge variant="neutral" size="sm">Mandatory Public Holiday</Badge>
                      </td>
                      {isHrAdmin && (
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleDelete(h.id, h.name)}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Declare New Official Holiday">
        <form onSubmit={handleCreateHoliday} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">{formError}</div>
          )}
          <Input
            label="Holiday Name"
            value={holidayName}
            onChange={(e) => setHolidayName(e.target.value)}
            placeholder="e.g. Diwali (Deepavali)"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Holiday Date</label>
              <input
                type="date"
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
                className="w-full h-9 px-3 text-xs bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-gray-950"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Day of Week</label>
              <input
                type="text"
                value={computedDay}
                disabled
                className="w-full h-9 px-3 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-600 font-medium cursor-not-allowed"
              />
            </div>
          </div>
          <div className="pt-3 flex justify-end gap-2.5">
            <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Declare Holiday</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
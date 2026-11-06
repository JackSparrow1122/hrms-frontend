import React, { useState, useMemo } from "react";
import {
  Briefcase,
  Users,
  Plus,
  Building2,
  Edit,
  Trash2,
  Search,
  LayoutGrid,
  Table as TableIcon,
  ShieldCheck,
  Award,
  Layers,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { useHrms } from "../../lib/hrmsContext";
import { useAuth } from "../../lib/authContext";
import { Designation } from "../../types/hrms";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { formatINR } from "../../lib/utils";

export function DesignationsPage() {
  const { designations, departments, employees, branches, addDesignation, updateDesignation, deleteDesignation, syncBackendData } = useHrms();
  const { user } = useAuth();

  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isTenantAdmin = user?.role === "TENANT_ADMIN" || !!user?.isTenantAdmin;
  const isBranchAdmin = user?.scopeType === "BRANCH" || (user?.role === "HR_ADMIN" && !isTenantAdmin && !isSuperAdmin);
  const assignedBranchId = user?.scopeBranchId ? String(user.scopeBranchId) : user?.branchId || "";
  const currentBranch = branches.find((b) => b.id === assignedBranchId);

  React.useEffect(() => {
    syncBackendData();
  }, [syncBackendData]);

  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("ALL");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDesig, setEditingDesig] = useState<Designation | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || "3");
  const [levelNum, setLevelNum] = useState(2);
  const [minCtc, setMinCtc] = useState(60000);
  const [maxCtc, setMaxCtc] = useState(120000);

  const canManage = user?.role === "SUPER_ADMIN" || user?.role === "HR_ADMIN" || user?.isTenantAdmin;

  // Filtered designations
  const filteredDesignations = useMemo(() => {
    return designations.filter((d) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        d.title.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        (d.level && d.level.toLowerCase().includes(q));

      const matchesDept = selectedDeptFilter === "ALL" || d.departmentId === selectedDeptFilter;
      return matchesSearch && matchesDept;
    });
  }, [designations, searchQuery, selectedDeptFilter]);

  // Quick KPI metrics
  const stats = useMemo(() => {
    const total = designations.length;
    const senior = designations.filter((d) => {
      const lvl = parseInt(d.level?.replace(/\D/g, "") || "1");
      return lvl >= 4;
    }).length;
    const deptsCovered = new Set(designations.map((d) => d.departmentId).filter(Boolean)).size;
    const totalIncumbents = employees.filter((e) => e.designationId).length;
    return { total, senior, deptsCovered, totalIncumbents };
  }, [designations, employees]);

  const resetForm = () => {
    setTitle("");
    setCode("");
    setDepartmentId(departments[0]?.id || "3");
    setLevelNum(2);
    setMinCtc(60000);
    setMaxCtc(120000);
    setEditingDesig(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const handleOpenEdit = (desig: Designation) => {
    setEditingDesig(desig);
    setTitle(desig.title);
    setCode(desig.code);
    setDepartmentId(desig.departmentId || departments[0]?.id || "3");
    const parsedLevel = parseInt(desig.level?.replace(/\D/g, "") || "2");
    setLevelNum(!isNaN(parsedLevel) ? parsedLevel : 2);
    setMinCtc(desig.minCtc || 60000);
    setMaxCtc(desig.maxCtc || 120000);
    setIsAddOpen(true);
  };

  const handleSave = () => {
    if (!title.trim() || !code.trim()) return;

    const levelStr = `L${levelNum}`;
    if (editingDesig) {
      updateDesignation(editingDesig.id, {
        title: title.trim(),
        code: code.trim().toUpperCase(),
        departmentId,
        level: levelStr,
        minCtc: Number(minCtc),
        maxCtc: Number(maxCtc),
      });
    } else {
      addDesignation({
        title: title.trim(),
        code: code.trim().toUpperCase(),
        departmentId,
        level: levelStr,
        minCtc: Number(minCtc),
        maxCtc: Number(maxCtc),
        active: true,
        branchId: isBranchAdmin && assignedBranchId ? assignedBranchId : undefined,
      });
    }

    setIsAddOpen(false);
    resetForm();
  };

  const handleDelete = (desig: Designation) => {
    const incumbentCount = employees.filter((e) => e.designationId === desig.id).length;
    if (incumbentCount > 0) {
      alert(`Cannot delete designation "${desig.title}". There are ${incumbentCount} employees currently assigned to this designation.`);
      return;
    }
    if (confirm(`Are you sure you want to permanently delete designation "${desig.title}" (${desig.code})?`)) {
      deleteDesignation(desig.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-950 tracking-tight">
              Designations & Career Levels
            </h1>
            <Badge variant="neutral" size="sm">
              {designations.length} Configured
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Configure job titles, seniority bands, and compensation brackets managed by HR Admin.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <Button onClick={handleOpenAdd} className="shadow-xs font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              Add Designation
            </Button>
          </div>
        )}
      </div>

      {/* Role-tailored Scope Banner */}
      {isBranchAdmin && (
        <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-blue-50/90 border border-blue-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-blue-800">Organization Master Designations</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">{currentBranch?.name || user?.branchName || "Assigned Branch"}</span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Organization-wide career designations and job roles shared across all branches. Available for workforce assignments in <strong className="text-gray-900">{currentBranch?.name || "your branch"}</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-surface-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Roles</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stats.total}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Active titles</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Briefcase className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-surface-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Lead & Managerial</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stats.senior}</h3>
              <p className="text-[11px] text-indigo-600 font-medium mt-0.5">L4+ Leadership</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
              <Award className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-surface-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Departments Covered</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stats.deptsCovered}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Assigned to depts</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-surface-border">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Active Incumbents</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stats.totalIncumbents}</h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Assigned employees</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-surface-border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, code or level..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <select
            value={selectedDeptFilter}
            onChange={(e) => setSelectedDeptFilter(e.target.value)}
            className="text-xs py-1.5 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-md text-xs transition-all flex items-center gap-1.5 ${
              viewMode === "table" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Table</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={`p-1.5 rounded-md text-xs transition-all flex items-center gap-1.5 ${
              viewMode === "cards" ? "bg-white text-slate-900 shadow-2xs font-semibold" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cards</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredDesignations.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 mx-auto flex items-center justify-center text-indigo-600 mb-4 shadow-xs">
            <Briefcase className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Designations Configured Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1.5 leading-relaxed">
            All previous seed designations have been cleared as requested. As HR Admin, create designations to establish career hierarchy and onboarding roles for your organization.
          </p>
          {canManage && (
            <div className="mt-5">
              <Button onClick={handleOpenAdd} className="shadow-xs font-semibold">
                <Plus className="w-4 h-4 mr-2" />
                Add First Designation
              </Button>
            </div>
          )}
        </div>
      ) : viewMode === "table" ? (
        <div className="bg-white rounded-xl border border-surface-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="py-3 px-4">Designation Title</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Career Level</th>
                  <th className="py-3 px-4">Standard CTC Band</th>
                  <th className="py-3 px-4 text-center">Incumbents</th>
                  {canManage && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDesignations.map((desig) => {
                  const dept = departments.find((d) => d.id === desig.departmentId);
                  const count = employees.filter((e) => e.designationId === desig.id).length;
                  const lvlNum = parseInt(desig.level?.replace(/\D/g, "") || "1");

                  return (
                    <tr key={desig.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
                            <Briefcase className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="block text-xs font-bold text-slate-900">{desig.title}</span>
                            <span className="text-[10px] text-slate-400">ID: #{desig.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
                          {desig.code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{dept?.name || "Corporate Wide"}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                            lvlNum >= 5
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : lvlNum >= 3
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          <Layers className="w-3 h-3" />
                          {desig.level || "L1"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        {desig.minCtc && desig.maxCtc ? (
                          <span className="font-medium">
                            {formatINR(desig.minCtc)} - {formatINR(desig.maxCtc)}
                          </span>
                        ) : (
                          <span className="text-slate-400">Standard Tier</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-full text-xs border border-slate-200/50">
                          <Users className="w-3.5 h-3.5 text-slate-500" />
                          {count}
                        </span>
                      </td>
                      {canManage && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(desig)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit Designation"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(desig)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Designation"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDesignations.map((desig) => {
            const dept = departments.find((d) => d.id === desig.departmentId);
            const count = employees.filter((e) => e.designationId === desig.id).length;
            const lvlNum = parseInt(desig.level?.replace(/\D/g, "") || "1");

            return (
              <Card key={desig.id} className="border-surface-border hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 leading-tight">{desig.title}</h4>
                        <span className="font-mono text-[10px] text-slate-500 font-semibold">{desig.code}</span>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        lvlNum >= 5
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : lvlNum >= 3
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {desig.level || "L1"}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 flex items-center justify-between border-t border-slate-100 pt-2">
                    <span className="text-slate-400">Department:</span>
                    <span className="font-semibold text-slate-800">{dept?.name || "Corporate"}</span>
                  </div>

                  <div className="text-xs text-slate-600 flex items-center justify-between">
                    <span className="text-slate-400">CTC Band:</span>
                    <span className="font-semibold text-slate-800">
                      {desig.minCtc && desig.maxCtc ? `${formatINR(desig.minCtc)} - ${formatINR(desig.maxCtc)}` : "Standard"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded text-xs border border-slate-200">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {count} incumbents
                    </span>
                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(desig)}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(desig)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Designation Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => {
          setIsAddOpen(false);
          resetForm();
        }}
        size="md"
        title={editingDesig ? "Edit Designation" : "Add New Designation"}
        description="Configure job title, career seniority level, and salary bracket."
      >
        <div className="space-y-4">
          <Input
            label="Designation Title *"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Senior Software Engineer, Academic Lead, Sales Executive"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Designation Code *"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. SSE, MGR, TL, ACAD"
              required
            />

            <Select
              label="Career Level *"
              value={String(levelNum)}
              onChange={(e) => setLevelNum(Number(e.target.value))}
              options={[
                { label: "L1 - Entry / Associate", value: "1" },
                { label: "L2 - Executive / Junior", value: "2" },
                { label: "L3 - Senior Specialist", value: "3" },
                { label: "L4 - Team Lead / Supervisor", value: "4" },
                { label: "L5 - Department Manager", value: "5" },
                { label: "L6 - Senior Manager", value: "6" },
                { label: "L7 - Associate Director", value: "7" },
                { label: "L8 - Director / VP", value: "8" },
              ]}
            />
          </div>

          <Select
            label="Associated Department *"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            options={departments.map((d) => ({ label: d.name, value: d.id }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Min Monthly CTC (₹)"
              type="number"
              value={minCtc}
              onChange={(e) => setMinCtc(Number(e.target.value))}
            />
            <Input
              label="Max Monthly CTC (₹)"
              type="number"
              value={maxCtc}
              onChange={(e) => setMaxCtc(Number(e.target.value))}
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span className="font-medium text-slate-700">HR Admin Governance</span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Level {levelNum} ({levelNum >= 5 ? "Managerial" : levelNum >= 4 ? "Lead" : "Contributor"})
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!title.trim() || !code.trim()}>
              {editingDesig ? "Update Designation" : "Create Designation"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

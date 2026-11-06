import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  Plus,
  Briefcase,
  Edit,
  Trash2,
  ArrowRight,
  Search,
  LayoutGrid,
  Table as TableIcon,
  ShieldCheck,
  Coins,
  CheckCircle2,
} from "lucide-react";
import { useHrms } from "../../lib/hrmsContext";
import { useAuth } from "../../lib/authContext";
import { Department } from "../../types/hrms";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { Drawer } from "../../components/ui/Drawer";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Avatar } from "../../components/ui/Avatar";
import { formatCompactINR, formatINR } from "../../lib/utils";

export function DepartmentsPage() {
  const navigate = useNavigate();
  const { departments, employees, branches, addDepartment, updateDepartment, deleteDepartment, syncBackendData } = useHrms();
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
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [viewingDept, setViewingDept] = useState<Department | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [headEmployeeId, setHeadEmployeeId] = useState(employees[0]?.id || "EMP-0001");
  const [budget, setBudget] = useState(25000000);
  const [openPositions, setOpenPositions] = useState(2);
  const [description, setDescription] = useState("");

  const filteredDepartments = useMemo(() => {
    if (!searchQuery.trim()) return departments;
    const q = searchQuery.toLowerCase();
    return departments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.code.toLowerCase().includes(q) ||
        (d.headName && d.headName.toLowerCase().includes(q))
    );
  }, [departments, searchQuery]);

  const totalHeadcount = useMemo(() => {
    return employees.length;
  }, [employees]);

  const totalOpenings = useMemo(() => {
    return departments.reduce((acc, d) => acc + (d.openPositions || 0), 0);
  }, [departments]);

  const totalBudget = useMemo(() => {
    return departments.reduce((acc, d) => acc + (d.budget || 0), 0);
  }, [departments]);

  const handleCreate = () => {
    if (!name || !code) return;
    const head = employees.find((e) => e.id === headEmployeeId);
    addDepartment({
      name,
      code: code.toUpperCase(),
      headEmployeeId,
      headName: head ? `${head.firstName} ${head.lastName}` : "Department Lead",
      budget: Number(budget),
      openPositions: Number(openPositions),
      description: description || `${name} operational business unit.`,
      branchId: isBranchAdmin && assignedBranchId ? assignedBranchId : undefined,
    });
    setName("");
    setCode("");
    setDescription("");
    setIsAddOpen(false);
  };

  const handleUpdate = () => {
    if (!editingDept) return;
    const head = employees.find((e) => e.id === headEmployeeId);
    updateDepartment(editingDept.id, {
      name,
      code: code.toUpperCase(),
      headEmployeeId,
      headName: head ? `${head.firstName} ${head.lastName}` : editingDept.headName,
      budget: Number(budget),
      openPositions: Number(openPositions),
      description,
    });
    setEditingDept(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
              Departments Management
            </h1>
            <Badge variant="purple" size="sm">
              {departments.length} Units Active
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Configure functional divisions, department heads, headcount budgets, and staffing.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === "table"
                  ? "bg-white text-gray-950 shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === "cards"
                  ? "bg-white text-gray-950 shadow-xs"
                  : "text-gray-500 hover:text-gray-900"
              }`}
              title="Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>

          <Button
            onClick={() => {
              setName("");
              setCode("");
              setDescription("");
              setIsAddOpen(true);
            }}
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Add Department
          </Button>
        </div>
      </div>

      {/* Role-tailored Scope Banner */}
      {isBranchAdmin && (
        <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-blue-50/90 border border-blue-200/90 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-blue-800">Organization Functional Divisions</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">{currentBranch?.name || user?.branchName || "Assigned Branch"}</span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Organization-wide functional divisions shared across all branches. Available for workforce assignments in <strong className="text-gray-900">{currentBranch?.name || "your branch"}</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs space-y-1">
          <div className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span>Total Departments</span>
          </div>
          <div className="text-2xl font-black text-gray-950">{departments.length}</div>
          <div className="text-[11px] text-gray-400">Configured in organization</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs space-y-1">
          <div className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Assigned Workforce</span>
          </div>
          <div className="text-2xl font-black text-gray-950">{totalHeadcount}</div>
          <div className="text-[11px] text-emerald-600 font-medium">Across all divisions</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs space-y-1">
          <div className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
            <Briefcase className="w-4 h-4 text-amber-600" />
            <span>Open Requisitions</span>
          </div>
          <div className="text-2xl font-black text-gray-950">{totalOpenings}</div>
          <div className="text-[11px] text-amber-600 font-medium">Approved openings</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs space-y-1">
          <div className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-purple-600" />
            <span>Operational Budget</span>
          </div>
          <div className="text-2xl font-black text-gray-950">{formatCompactINR(totalBudget)}</div>
          <div className="text-[11px] text-gray-400">Annual financial ceiling</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search departments by name, code, or department lead..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:border-gray-950 focus:bg-white transition-all"
          />
        </div>
        <div className="text-xs text-gray-500">
          Showing <span className="font-bold text-gray-950">{filteredDepartments.length}</span> of {departments.length}
        </div>
      </div>

      {/* 1. TABLE VIEW */}
      {viewMode === "table" && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Department & Code</th>
                  <th className="py-3.5 px-4">Department Lead</th>
                  <th className="py-3.5 px-4">Headcount / Staff</th>
                  <th className="py-3.5 px-4">Open Positions</th>
                  <th className="py-3.5 px-4">Annual Budget</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDepartments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      No departments found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredDepartments.map((dept) => {
                    const deptEmployees = employees.filter((e) => e.departmentId === dept.id);
                    const head = employees.find((e) => e.id === dept.headEmployeeId);

                    return (
                      <tr
                        key={dept.id}
                        className="hover:bg-gray-50/60 transition-colors cursor-pointer group"
                        onClick={() => setViewingDept(dept)}
                      >
                        {/* Name & Code */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold text-gray-950 text-sm flex items-center gap-2">
                                <span>{dept.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-[10px] px-1.5 py-0.5 bg-gray-100 border border-gray-200 text-gray-600 rounded">
                                  {dept.code}
                                </span>
                                <span className="text-[11px] text-gray-400 truncate max-w-[200px]">
                                  {dept.description || "Operational Unit"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Department Lead */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <Avatar
                              src={head?.avatar}
                              name={dept.headName || "Lead"}
                              size="xs"
                            />
                            <div>
                              <div className="font-semibold text-gray-900">{dept.headName || "Unassigned"}</div>
                              <div className="text-[10px] text-gray-400">
                                {head ? head.employeeCode : "Executive"}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Headcount */}
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingDept(dept);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold transition-colors"
                          >
                            <Users className="w-3.5 h-3.5 text-slate-500" />
                            <span>{deptEmployees.length} Members</span>
                          </button>
                        </td>

                        {/* Open Positions */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium text-[11px]">
                            <Briefcase className="w-3 h-3 text-emerald-600" />
                            <span>{dept.openPositions} Open</span>
                          </span>
                        </td>

                        {/* Annual Budget */}
                        <td className="py-3.5 px-4 font-mono font-medium text-gray-900">
                          {formatINR(dept.budget || 15000000)}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            Active
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setViewingDept(dept)}
                              className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="View Team"
                            >
                              Team &rarr;
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingDept(dept);
                                setName(dept.name);
                                setCode(dept.code);
                                setBudget(dept.budget || 25000000);
                                setOpenPositions(dept.openPositions || 2);
                                setDescription(dept.description || "");
                                setHeadEmployeeId(dept.headEmployeeId);
                              }}
                              className="p-1.5 text-gray-400 hover:text-gray-950 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit Department"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (deptEmployees.length > 0) {
                                  alert(`Cannot delete department with ${deptEmployees.length} active employees.`);
                                  return;
                                }
                                if (confirm(`Are you sure you want to delete department "${dept.name}"?`)) {
                                  deleteDepartment(dept.id);
                                }
                              }}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Department"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. CARD GRID VIEW */}
      {viewMode === "cards" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDepartments.map((dept) => {
            const deptEmployees = employees.filter((e) => e.departmentId === dept.id);
            const deptMonthlyPayroll = deptEmployees.reduce((sum, e) => sum + e.monthlyCtc, 0);

            return (
              <Card
                key={dept.id}
                className="hover:border-gray-300 hover:shadow-card-hover transition-all duration-200 cursor-pointer"
                onClick={() => setViewingDept(dept)}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-900 font-bold">
                      <Building2 className="w-5 h-5 text-gray-700" />
                    </div>
                    <div>
                      <CardTitle>{dept.name}</CardTitle>
                      <Badge variant="neutral" size="sm" className="mt-0.5">
                        {dept.code}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setEditingDept(dept);
                        setName(dept.name);
                        setCode(dept.code);
                        setBudget(dept.budget || 25000000);
                        setOpenPositions(dept.openPositions || 2);
                        setDescription(dept.description || "");
                        setHeadEmployeeId(dept.headEmployeeId);
                      }}
                      className="p-1.5 text-text-muted hover:text-gray-950 hover:bg-gray-100 rounded-lg"
                      title="Edit Department"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (deptEmployees.length > 0) {
                          alert(`Cannot delete department with ${deptEmployees.length} active employees.`);
                          return;
                        }
                        if (confirm(`Are you sure you want to delete department "${dept.name}"?`)) {
                          deleteDepartment(dept.id);
                        }
                      }}
                      className="p-1.5 text-text-muted hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                      title="Delete Department"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                    {dept.description || "Operational departmental division."}
                  </p>

                  {/* Metrics Pill Grid */}
                  <div className="grid grid-cols-3 gap-3 p-3 bg-surface-subtle/60 rounded-xl text-xs">
                    <div>
                      <span className="text-[11px] text-text-muted">Staffing</span>
                      <p className="font-bold text-text-primary mt-0.5 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-gray-700" />
                        {deptEmployees.length} Members
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] text-text-muted">Openings</span>
                      <p className="font-bold text-emerald-600 mt-0.5 flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5" />
                        {dept.openPositions} Jobs
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] text-text-muted">Monthly CTC</span>
                      <p className="font-bold text-gray-950 mt-0.5">
                        {formatCompactINR(deptMonthlyPayroll)}
                      </p>
                    </div>
                  </div>

                  {/* Head Info */}
                  <div className="pt-2 flex items-center justify-between text-xs border-t border-surface-border">
                    <div className="flex items-center gap-2">
                      <span className="text-text-muted">Department Lead:</span>
                      <span className="font-semibold text-text-primary">{dept.headName}</span>
                    </div>
                    <span className="text-gray-900 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      View Team <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Department Modal */}
      <Modal
        isOpen={isAddOpen || !!editingDept}
        onClose={() => {
          setIsAddOpen(false);
          setEditingDept(null);
        }}
        title={editingDept ? "Edit Department" : "Onboard New Department"}
        description="Add a new functional division to your organization with designated lead and budget."
      >
        <div className="space-y-4">
          <Input
            label="Department Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sales, Corporate Relation, Learning and Dev"
            required
          />
          <Input
            label="Department Code / Acronym * (Unique)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="e.g. SALES, CORP-REL, L&D"
            required
          />
          <Select
            label="Designated Department Head"
            value={headEmployeeId}
            onChange={(e) => setHeadEmployeeId(e.target.value)}
            options={employees.map((e) => ({
              label: `${e.firstName} ${e.lastName} (${e.employeeCode})`,
              value: e.id,
            }))}
          />
          <Input
            label="Annual Operational Budget (INR)"
            type="number"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
          />
          <Input
            label="Approved Open Positions"
            type="number"
            value={openPositions}
            onChange={(e) => setOpenPositions(Number(e.target.value))}
          />
          <Input
            label="Department Mandate / Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Functional role, target metrics, and team mandate"
          />

          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Multi-Tenant Dynamic Creation: </span>
              This department will be provisioned directly in PostgreSQL for your company and will instantly appear in all employee onboarding forms.
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2.5">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddOpen(false);
                setEditingDept(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={editingDept ? handleUpdate : handleCreate}
            >
              {editingDept ? "Save Changes" : "Create Department"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Department Detail Drawer (View Team Members) */}
      <Drawer
        isOpen={!!viewingDept}
        onClose={() => setViewingDept(null)}
        title={viewingDept?.name}
        subtitle={`${viewingDept?.code} • ${employees.filter((e) => e.departmentId === viewingDept?.id).length} Active Team Members`}
      >
        {viewingDept && (
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1">
              <span className="font-semibold text-gray-950">Department Mandate</span>
              <p className="text-text-secondary">{viewingDept.description || "Active corporate business unit."}</p>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
                Team Members ({employees.filter((e) => e.departmentId === viewingDept.id).length})
              </h4>
              <div className="divide-y divide-gray-100">
                {employees.filter((e) => e.departmentId === viewingDept.id).length === 0 ? (
                  <div className="text-center py-8 text-xs text-gray-400">
                    No employees assigned to this department yet. Onboard employees to populate team.
                  </div>
                ) : (
                  employees
                    .filter((e) => e.departmentId === viewingDept.id)
                    .map((emp) => (
                      <div
                        key={emp.id}
                        className="py-3 flex items-center justify-between hover:bg-gray-50 rounded-lg px-2 transition-colors cursor-pointer"
                        onClick={() => navigate(`/people/employees/${emp.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={emp.avatar}
                            name={`${emp.firstName} ${emp.lastName}`}
                            size="sm"
                          />
                          <div>
                            <p className="text-xs font-semibold text-text-primary">
                              {emp.firstName} {emp.lastName}
                            </p>
                            <p className="text-[11px] text-text-muted">{emp.email}</p>
                          </div>
                        </div>
                        <Badge variant="neutral" size="sm">
                          {emp.employeeCode}
                        </Badge>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

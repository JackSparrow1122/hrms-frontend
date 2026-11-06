import React, { useState, useEffect, useMemo } from "react";
import {
  GitBranch,
  Building2,
  Users,
  Plus,
  Search,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Phone,
  KeyRound,
  Trash2,
  Edit,
  MapPin,
  Lock,
  ArrowRight,
  Info,
} from "lucide-react";
import { useAuth } from "../../lib/authContext";
import { useToast } from "../../lib/toastContext";
import { useHrms } from "../../lib/hrmsContext";
import {
  branchApi,
  tenantApi,
  BackendBranch,
  CreateBranchPayload,
  AssignBranchHrPayload,
  TenantItem,
} from "../../lib/api";

export const BranchesPage: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const { syncBackendData } = useHrms();

  const [branches, setBranches] = useState<BackendBranch[]>([]);
  const [tenantInfo, setTenantInfo] = useState<TenantItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showAssignHrModal, setShowAssignHrModal] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [selectedBranch, setSelectedBranch] = useState<BackendBranch | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form State: Add Branch
  const [newBranchData, setNewBranchData] = useState<CreateBranchPayload>({
    companyId: user?.companyId ? Number(user.companyId) : 8,
    name: "",
    code: "",
    city: "",
    state: "",
    country: "India",
    headquarters: false,
    hrAdminFirstName: "",
    hrAdminLastName: "",
    hrAdminEmail: "",
    hrAdminPassword: "Welcome@123",
    hrAdminPhone: "",
  });

  const [assignHrNow, setAssignHrNow] = useState<boolean>(true);

  // Form State: Assign HR Admin
  const [assignHrData, setAssignHrData] = useState<AssignBranchHrPayload>({
    firstName: "",
    lastName: "",
    email: "",
    password: "Welcome@123",
    phoneNumber: "",
  });

  // Form State: Edit Branch
  const [editBranchData, setEditBranchData] = useState<{
    name: string;
    city: string;
    state: string;
    country: string;
  }>({
    name: "",
    city: "",
    state: "",
    country: "India",
  });

  const companyId = user?.companyId ? Number(user.companyId) : 8;

  const loadData = async () => {
    try {
      setLoading(true);
      // Fetch tenant details to inspect maxBranches limit set by Super Admin
      try {
        const myTenant = await tenantApi.getMyTenant();
        if (myTenant) setTenantInfo(myTenant);
      } catch {
        // ignore
      }

      // Fetch branches for this company
      const branchList = await branchApi.getBranches(companyId);
      setBranches(branchList || []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load branches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [companyId]);

  const maxBranchesAllowed = tenantInfo?.maxBranches ?? 5;
  const isQuotaReached = branches.length >= maxBranchesAllowed;

  const filteredBranches = useMemo(() => {
    if (!searchQuery.trim()) return branches;
    const q = searchQuery.toLowerCase();
    return branches.filter(
      (b) =>
        b.name?.toLowerCase().includes(q) ||
        b.code?.toLowerCase().includes(q) ||
        b.city?.toLowerCase().includes(q) ||
        b.hrAdminName?.toLowerCase().includes(q) ||
        b.hrAdminEmail?.toLowerCase().includes(q)
    );
  }, [branches, searchQuery]);

  // Handle Add Branch
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchData.name.trim() || !newBranchData.code.trim()) {
      toast.error("Branch name and branch code are required.");
      return;
    }

    if (isQuotaReached) {
      toast.error(
        `Branch quota limit reached (${branches.length}/${maxBranchesAllowed}). Super Admin allocated maximum ${maxBranchesAllowed} branches for your organization.`
      );
      return;
    }

    try {
      setSubmitting(true);
      const payload: CreateBranchPayload = {
        ...newBranchData,
        companyId,
        code: newBranchData.code.toUpperCase().trim(),
        name: newBranchData.name.trim(),
      };

      if (!assignHrNow) {
        delete payload.hrAdminFirstName;
        delete payload.hrAdminLastName;
        delete payload.hrAdminEmail;
        delete payload.hrAdminPassword;
        delete payload.hrAdminPhone;
      }

      const created = await branchApi.createBranch(payload);
      toast.success(`Branch "${created.name}" created successfully!`);
      setShowAddModal(false);

      // Reset form
      setNewBranchData({
        companyId,
        name: "",
        code: "",
        city: "",
        state: "",
        country: "India",
        headquarters: false,
        hrAdminFirstName: "",
        hrAdminLastName: "",
        hrAdminEmail: "",
        hrAdminPassword: "Welcome@123",
        hrAdminPhone: "",
      });

      await loadData();
      syncBackendData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create branch.");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Assign HR Admin Modal
  const openAssignHrModal = (branch: BackendBranch) => {
    setSelectedBranch(branch);
    setAssignHrData({
      firstName: branch.hrAdminName ? branch.hrAdminName.split(" ")[0] : "",
      lastName: branch.hrAdminName ? branch.hrAdminName.split(" ").slice(1).join(" ") : "",
      email: branch.hrAdminEmail || "",
      password: "Welcome@123",
      phoneNumber: "",
    });
    setShowAssignHrModal(true);
  };

  // Handle Assign HR Admin
  const handleAssignHrAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;

    if (!assignHrData.firstName.trim() || !assignHrData.lastName.trim() || !assignHrData.email.trim()) {
      toast.error("First Name, Last Name, and Work Email are required.");
      return;
    }

    try {
      setSubmitting(true);
      await branchApi.assignHrAdmin(selectedBranch.id, {
        ...assignHrData,
        email: assignHrData.email.toLowerCase().trim(),
        firstName: assignHrData.firstName.trim(),
        lastName: assignHrData.lastName.trim(),
      });
      toast.success(`Branch HR Admin assigned to ${selectedBranch.name}!`);
      setShowAssignHrModal(false);
      await loadData();
      syncBackendData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to assign Branch HR Admin.");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Branch Modal
  const openEditModal = (branch: BackendBranch) => {
    setSelectedBranch(branch);
    setEditBranchData({
      name: branch.name,
      city: branch.city || "",
      state: branch.state || "",
      country: branch.country || "India",
    });
    setShowEditModal(true);
  };

  // Handle Edit Branch
  const handleEditBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranch) return;

    try {
      setSubmitting(true);
      await branchApi.updateBranch(selectedBranch.id, {
        name: editBranchData.name.trim(),
        city: editBranchData.city.trim(),
        state: editBranchData.state.trim(),
        country: editBranchData.country.trim(),
      });
      toast.success("Branch details updated successfully!");
      setShowEditModal(false);
      await loadData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update branch.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Branch
  const handleDeleteBranch = async (branch: BackendBranch) => {
    if (branch.headquarters) {
      toast.error("Headquarters branch cannot be deleted.");
      return;
    }
    if ((branch.employeeCount || 0) > 0) {
      toast.error(`Cannot delete branch "${branch.name}". It has ${branch.employeeCount} active workforce members.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete branch "${branch.name}" (${branch.code})?`)) {
      return;
    }

    try {
      await branchApi.deleteBranch(branch.id);
      toast.success(`Branch "${branch.name}" deleted successfully.`);
      await loadData();
      syncBackendData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete branch.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Branch Quota Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Organization Branches</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Head HR control center to onboard company branches and assign dedicated Branch HR Admins
              </p>
            </div>
          </div>
        </div>

        {/* Quota Meter & Add Branch Action */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700">
            <div className="text-right">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                Branch Quota
              </span>
              <span className="text-sm font-bold text-white">
                {branches.length}{" "}
                <span className="text-xs font-normal text-slate-400">/ {maxBranchesAllowed} Active</span>
              </span>
            </div>
            <div className="w-24 bg-slate-700 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  isQuotaReached ? "bg-rose-500" : branches.length === 1 ? "bg-indigo-500" : "bg-emerald-500"
                }`}
                style={{
                  width: `${Math.min(100, (branches.length / maxBranchesAllowed) * 100)}%`,
                }}
              />
            </div>
            {isQuotaReached && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold uppercase border border-rose-500/30">
                Full
              </span>
            )}
          </div>

          <button
            onClick={() => {
              if (isQuotaReached) {
                toast.error(
                  `Branch quota reached (${branches.length}/${maxBranchesAllowed}). Super Admin specified a maximum of ${maxBranchesAllowed} branches. Please contact Super Admin to increase your limit.`
                );
                return;
              }
              setShowAddModal(true);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-lg ${
              isQuotaReached
                ? "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-750 cursor-pointer"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30"
            }`}
          >
            <Plus className="w-4 h-4" />
            Add Branch
          </button>
        </div>
      </div>

      {/* Quota Alert Banner if Reached */}
      {isQuotaReached && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-200">
            <strong className="font-semibold block text-sm text-amber-300">
              Maximum Branch Quota Reached ({branches.length} of {maxBranchesAllowed})
            </strong>
            Super Admin allocated {maxBranchesAllowed} branch locations for {tenantInfo?.name || "your organization"}.
            You have active branches for all permitted slots. To open additional campus branches, request your Super
            Admin to update your organization's branch quota.
          </div>
        </div>
      )}

      {/* Search & Overview Stats Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search branches, city, or HR Admin..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Showing <span className="text-white font-bold">{filteredBranches.length}</span> of{" "}
          <span className="text-white font-bold">{branches.length}</span> branches
        </div>
      </div>

      {/* Branches Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Loading branch networks and HR Admin assignments...</p>
        </div>
      ) : filteredBranches.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white">No Branches Found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {searchQuery
                ? "No branch matched your search criteria."
                : "No branches registered yet. Click 'Add Branch' to onboard your first campus branch."}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBranches.map((branch) => {
            const hasHrAdmin = Boolean(branch.hrAdminEmail || branch.hrAdminName);

            return (
              <div
                key={branch.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 space-y-4 transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/5 flex flex-col justify-between"
              >
                <div>
                  {/* Branch Top Badge & Code */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono font-bold">
                          {branch.code}
                        </span>
                        {branch.headquarters && (
                          <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 text-[10px] font-semibold uppercase">
                            Headquarters
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-white tracking-tight">{branch.name}</h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(branch)}
                        title="Edit Branch Details"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {!branch.headquarters && (
                        <button
                          onClick={() => handleDeleteBranch(branch)}
                          title="Delete Branch"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Location Info */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {[branch.city, branch.state, branch.country].filter(Boolean).join(", ") || "Location Unspecified"}
                    </span>
                  </div>

                  {/* Headcount Stat */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-300">
                      <Users className="w-4 h-4 text-indigo-400" />
                      <span>Branch Workforce</span>
                    </div>
                    <span className="text-sm font-bold text-white">{branch.employeeCount || 0} active</span>
                  </div>

                  {/* Dedicated Branch HR Admin Governance Box */}
                  <div className="mt-4 p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/70 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        Dedicated Branch HR Admin
                      </span>
                      {hasHrAdmin ? (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Assigned
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          Vacant
                        </span>
                      )}
                    </div>

                    {hasHrAdmin ? (
                      <div className="space-y-1 text-xs">
                        <div className="font-semibold text-white flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          {branch.hrAdminName}
                        </div>
                        <div className="text-slate-400 font-mono text-[11px] truncate flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                          {branch.hrAdminEmail}
                        </div>
                        <p className="text-[10px] text-slate-500 pt-0.5">
                          Authorized to onboard Managers, Team Leads & Staff for this campus
                        </p>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 space-y-1">
                        <p className="text-[11px] text-slate-400">
                          No Branch HR Admin assigned. Workforce onboarding for this branch is currently unmanaged.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-2">
                  <button
                    onClick={() => openAssignHrModal(branch)}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-indigo-300 hover:text-white border border-slate-700 text-xs font-semibold transition-colors"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    {hasHrAdmin ? "Change / Reassign HR Admin" : "Assign Branch HR Admin"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD BRANCH */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                  <GitBranch className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Onboard New Company Branch</h2>
                  <p className="text-xs text-slate-400">
                    Slot {branches.length + 1} of {maxBranchesAllowed} allowed by Super Admin
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-5">
              {/* Branch Details */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <Building2 className="w-4 h-4" /> 1. Campus / Branch Location
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1">Branch Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Pune Campus or Mumbai Regional Office"
                      value={newBranchData.name}
                      onChange={(e) => setNewBranchData({ ...newBranchData, name: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Branch Code * (Unique)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. PUN-01"
                      value={newBranchData.code}
                      onChange={(e) => setNewBranchData({ ...newBranchData, code: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono uppercase focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">City *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Pune"
                      value={newBranchData.city}
                      onChange={(e) => setNewBranchData({ ...newBranchData, city: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">State</label>
                    <input
                      type="text"
                      placeholder="e.g. Maharashtra"
                      value={newBranchData.state}
                      onChange={(e) => setNewBranchData({ ...newBranchData, state: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Country</label>
                    <input
                      type="text"
                      value={newBranchData.country}
                      onChange={(e) => setNewBranchData({ ...newBranchData, country: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Toggle to assign Branch HR Admin */}
              <div className="pt-2 border-t border-slate-800">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={assignHrNow}
                    onChange={(e) => setAssignHrNow(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Assign Dedicated Branch HR Admin Immediately
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Creates an HR Admin account scoped specifically to operate this branch
                    </span>
                  </div>
                </label>
              </div>

              {/* Section 2: Branch HR Admin Provisioning */}
              {assignHrNow && (
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <KeyRound className="w-4 h-4" /> 2. Dedicated Branch HR Admin Details
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">HR Admin First Name *</label>
                      <input
                        type="text"
                        required={assignHrNow}
                        placeholder="e.g. Pooja"
                        value={newBranchData.hrAdminFirstName}
                        onChange={(e) => setNewBranchData({ ...newBranchData, hrAdminFirstName: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">HR Admin Last Name *</label>
                      <input
                        type="text"
                        required={assignHrNow}
                        placeholder="e.g. Patil"
                        value={newBranchData.hrAdminLastName}
                        onChange={(e) => setNewBranchData({ ...newBranchData, hrAdminLastName: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Work Email Address *</label>
                      <input
                        type="email"
                        required={assignHrNow}
                        placeholder="e.g. pooja.punehr@gryphon.com"
                        value={newBranchData.hrAdminEmail}
                        onChange={(e) => setNewBranchData({ ...newBranchData, hrAdminEmail: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Password *</label>
                      <input
                        type="text"
                        required={assignHrNow}
                        value={newBranchData.hrAdminPassword}
                        onChange={(e) => setNewBranchData({ ...newBranchData, hrAdminPassword: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number (Optional)</label>
                      <input
                        type="tel"
                        placeholder="e.g. +91 98765 43210"
                        value={newBranchData.hrAdminPhone}
                        onChange={(e) => setNewBranchData({ ...newBranchData, hrAdminPhone: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
                    <span>
                      This user will sign in through the <strong>HR Admin</strong> portal with their credentials, locked
                      to this branch context to manage departments and onboard Managers, Team Leads & staff.
                    </span>
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                  Create Branch Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ASSIGN / REASSIGN HR ADMIN */}
      {showAssignHrModal && selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Assign Branch HR Admin</h2>
                  <p className="text-xs text-slate-400">
                    For branch: <strong className="text-white">{selectedBranch.name}</strong> ({selectedBranch.code})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAssignHrModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAssignHrAdmin} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pooja"
                    value={assignHrData.firstName}
                    onChange={(e) => setAssignHrData({ ...assignHrData, firstName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Patil"
                    value={assignHrData.lastName}
                    onChange={(e) => setAssignHrData({ ...assignHrData, lastName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">Work Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. pooja.punehr@gryphon.com"
                    value={assignHrData.email}
                    onChange={(e) => setAssignHrData({ ...assignHrData, email: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">Password *</label>
                  <input
                    type="text"
                    required
                    value={assignHrData.password}
                    onChange={(e) => setAssignHrData({ ...assignHrData, password: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={assignHrData.phoneNumber}
                    onChange={(e) => setAssignHrData({ ...assignHrData, phoneNumber: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAssignHrModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                  Assign Branch HR Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT BRANCH */}
      {showEditModal && selectedBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Edit Branch Details</h2>
                  <p className="text-xs text-slate-400">Branch Code: {selectedBranch.code}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditBranch} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Branch Name *</label>
                <input
                  type="text"
                  required
                  value={editBranchData.name}
                  onChange={(e) => setEditBranchData({ ...editBranchData, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">City</label>
                  <input
                    type="text"
                    value={editBranchData.city}
                    onChange={(e) => setEditBranchData({ ...editBranchData, city: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">State</label>
                  <input
                    type="text"
                    value={editBranchData.state}
                    onChange={(e) => setEditBranchData({ ...editBranchData, state: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Country</label>
                <input
                  type="text"
                  value={editBranchData.country}
                  onChange={(e) => setEditBranchData({ ...editBranchData, country: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

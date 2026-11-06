import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  GitBranch,
  FolderTree,
  Plus,
  Search,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  MoreVertical,
  Mail,
  Phone,
  Globe,
  Briefcase,
  KeyRound,
  RefreshCw,
  Building,
  Trash2,
} from "lucide-react";
import { useHrms } from "../../lib/hrmsContext";
import { useAuth } from "../../lib/authContext";
import { useToast } from "../../lib/toastContext";
import { tenantApi, TenantItem, CreateTenantPayload } from "../../lib/api";

export const OrganizationsPage: React.FC = () => {
  const { user } = useAuth();
  const { activeCompanyId, switchActiveCompany, syncBackendData } = useHrms();
  const toast = useToast();
  const navigate = useNavigate();

  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [tenantToDelete, setTenantToDelete] = useState<TenantItem | null>(null);
  const [deletingTenant, setDeletingTenant] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState<CreateTenantPayload>({
    name: "",
    code: "",
    registrationNumber: "",
    taxId: "",
    domain: "",
    contactEmail: "",
    contactPhone: "",
    subscriptionPlan: "ENTERPRISE",
    maxEmployees: 500,
    maxBranches: 2,
    adminEmail: "",
    adminPassword: "Welcome@123",
    adminFirstName: "",
    adminLastName: "",
    adminPhoneNumber: "",
  });

  const loadTenants = async () => {
    try {
      setLoading(true);
      const res = await tenantApi.getTenants({ size: 100 });
      if (res && res.content) {
        setTenants(res.content);
      }
    } catch (err: any) {
      toast.error(err?.message || "Could not load tenant organizations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error("Company Name and Unique Code are required.");
      return;
    }
    if (!formData.adminEmail.trim() || !formData.adminFirstName.trim() || !formData.adminLastName.trim()) {
      toast.error("Designated HR Admin Name and Work Email are required.");
      return;
    }

    try {
      setSubmitting(true);
      const created = await tenantApi.createTenant({
        ...formData,
        code: formData.code.toUpperCase().trim(),
        name: formData.name.trim(),
        adminEmail: formData.adminEmail.toLowerCase().trim(),
      });
      toast.success(`Organization "${created.name}" created with HR Admin ${formData.adminEmail}!`);
      setShowCreateModal(false);
      // Reset form
      setFormData({
        name: "",
        code: "",
        registrationNumber: "",
        taxId: "",
        domain: "",
        contactEmail: "",
        contactPhone: "",
        subscriptionPlan: "ENTERPRISE",
        maxEmployees: 500,
        maxBranches: 2,
        adminEmail: "",
        adminPassword: "Welcome@123",
        adminFirstName: "",
        adminLastName: "",
        adminPhoneNumber: "",
      });
      await loadTenants();
      await syncBackendData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to create tenant organization");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwitchWorkspace = async (tenant: TenantItem) => {
    await switchActiveCompany(tenant.id);
    toast.success(`Switched active workspace to ${tenant.name}!`);
    navigate("/employees");
  };

  const handleToggleStatus = async (tenant: TenantItem) => {
    const nextStatus = tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      await tenantApi.updateTenantStatus(tenant.id, nextStatus);
      toast.success(`Organization status changed to ${nextStatus}.`);
      await loadTenants();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update tenant status");
    }
  };

  const handleDeleteTenant = (tenant: TenantItem) => {
    setTenantToDelete(tenant);
  };

  const handleExecuteDelete = async () => {
    if (!tenantToDelete) return;
    try {
      setDeletingTenant(true);
      await tenantApi.deleteTenant(tenantToDelete.id);
      toast.success(`Organization "${tenantToDelete.name}" permanently deleted.`);
      setTenantToDelete(null);
      await loadTenants();
      await syncBackendData();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete organization");
    } finally {
      setDeletingTenant(false);
    }
  };

  // Filtered tenants
  const filteredTenants = tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.domain && t.domain.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.adminEmail && t.adminEmail.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalEmployeesAcrossTenants = tenants.reduce((acc, curr) => acc + (curr.totalEmployees || 0), 0);
  const activeTenantsCount = tenants.filter((t) => t.status === "ACTIVE").length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Organization Tenants Governance</h1>
              <p className="text-sm text-slate-400">
                Super Admin Platform Control • Manage Customer Organizations, Dedicated HR Admins & Workspaces
              </p>
            </div>
          </div>
          {/* Hierarchy Banner */}
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800/50 text-xs font-medium text-indigo-300">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Platform Hierarchy: <strong>Super Admin</strong> ➔ <strong>Organization</strong> ➔ <strong>HR Admin</strong> ➔ <strong>Workforce</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadTenants}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all flex items-center gap-2 text-sm font-medium"
            title="Refresh organizations list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Onboard New Organization
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Organizations</span>
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{tenants.length}</span>
            <span className="text-xs text-emerald-400 font-medium">({activeTenantsCount} Active)</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Customer tenants running on platform</p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Platform Workforce</span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{totalEmployeesAcrossTenants}</span>
            <span className="text-xs text-slate-400">Employees</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Enrolled across all companies</p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Workspace</span>
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-lg font-bold text-white truncate block">
              {tenants.find((t) => t.id === activeCompanyId)?.name || `Organization #${activeCompanyId}`}
            </span>
            <span className="text-xs text-indigo-400 font-medium">
              ID: {activeCompanyId} • Super Admin Switcher Active
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Currently selected context</p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/80 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">System Isolation</span>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400">Enforced</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">HR Admins isolated strictly to their company</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search organizations by name, code, domain, or HR admin..."
            className="w-full bg-slate-800/60 border border-slate-700/80 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400 font-medium">Status:</span>
          {["ALL", "ACTIVE", "SUSPENDED", "TERMINATED"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === status
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Organizations Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-900/30 rounded-2xl border border-slate-800 text-slate-400 gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
          <p className="text-sm">Loading registered customer organizations...</p>
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="text-center p-12 bg-slate-900/30 rounded-2xl border border-slate-800 text-slate-400 space-y-3">
          <Building className="w-10 h-10 mx-auto text-slate-500" />
          <h3 className="text-base font-semibold text-white">No organizations found</h3>
          <p className="text-xs text-slate-400">
            {searchQuery ? "No matches for your search criteria." : "Click below to onboard the first organization."}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            Onboard Organization
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredTenants.map((t) => {
            const isCurrentlyActive = t.id === activeCompanyId;
            return (
              <div
                key={t.id}
                className={`bg-slate-900/70 border rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-xl ${
                  isCurrentlyActive
                    ? "border-indigo-500 shadow-indigo-500/10 ring-1 ring-indigo-500/30"
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <div>
                  {/* Top Bar of Card */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-center text-indigo-400 font-bold text-lg shadow-inner">
                        {t.code.slice(0, 3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-base leading-snug">{t.name}</h3>
                          {isCurrentlyActive && (
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold tracking-wide uppercase">
                              Active View
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-mono font-semibold">
                            {t.code}
                          </span>
                          {t.domain && (
                            <span className="flex items-center gap-1 text-xs text-slate-400">
                              <Globe className="w-3 h-3 text-slate-500" />
                              {t.domain}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        t.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : t.status === "SUSPENDED"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}
                    >
                      {t.status === "ACTIVE" && <CheckCircle2 className="w-3 h-3" />}
                      {t.status === "SUSPENDED" && <AlertTriangle className="w-3 h-3" />}
                      {t.status === "TERMINATED" && <XCircle className="w-3 h-3" />}
                      {t.status}
                    </span>
                  </div>

                  {/* HR Admin Governance Block */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-800/40 border border-slate-700/60">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                      Designated Organization HR Admin
                    </span>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-slate-200">
                        <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="font-medium text-white">{t.adminName || "Assigned HR Lead"}</span>
                      </div>
                      <span className="text-slate-400 font-mono text-[11px]">{t.adminEmail || t.contactEmail || "No admin email"}</span>
                    </div>
                  </div>

                  {/* Operational Metrics */}
                  <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                    <div className="p-2.5 rounded-xl bg-slate-800/30 border border-slate-800">
                      <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mb-0.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>Workforce</span>
                      </div>
                      <span className="text-base font-bold text-white">{t.totalEmployees}</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-800/30 border border-slate-800">
                      <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mb-0.5">
                        <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Branches</span>
                      </div>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-base font-bold text-white">{t.totalBranches}</span>
                        <span className="text-xs text-slate-400 font-medium">/ {t.maxBranches || 5}</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-800/30 border border-slate-800">
                      <div className="flex items-center justify-center gap-1 text-slate-400 text-xs mb-0.5">
                        <FolderTree className="w-3.5 h-3.5" />
                        <span>Depts</span>
                      </div>
                      <span className="text-base font-bold text-white">{t.totalDepartments}</span>
                    </div>
                  </div>

                  {/* Identification Details */}
                  <div className="mt-3 text-xs text-slate-400 space-y-1">
                    {t.taxId && (
                      <div className="flex justify-between">
                        <span>GSTIN / Tax ID:</span>
                        <span className="font-mono text-slate-300">{t.taxId}</span>
                      </div>
                    )}
                    {t.registrationNumber && (
                      <div className="flex justify-between">
                        <span>CIN / Registration:</span>
                        <span className="font-mono text-slate-300">{t.registrationNumber}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Plan & Capacity:</span>
                      <span className="text-indigo-300 font-medium">
                        {t.subscriptionPlan} (up to {t.maxEmployees} employees)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleStatus(t)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all ${
                        t.status === "ACTIVE"
                          ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                          : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                      }`}
                    >
                      {t.status === "ACTIVE" ? "Suspend" : "Activate"}
                    </button>
                    <button
                      onClick={() => handleDeleteTenant(t)}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-rose-500/40 text-rose-400 hover:bg-rose-500/15 hover:border-rose-500 font-medium transition-all flex items-center gap-1 shadow-xs"
                      title="Permanently erase this organization"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Org
                    </button>
                  </div>

                  <button
                    onClick={() => handleSwitchWorkspace(t)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all ${
                      isCurrentlyActive
                        ? "bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 hover:scale-[1.02]"
                    }`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {isCurrentlyActive ? "Explore Live Data" : "Switch to Workspace"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Onboard New Organization */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Onboard Customer Organization</h2>
                  <p className="text-xs text-slate-400">
                    Provisions company, headquarters, departments, and assigns initial HR Admin
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-6">
              {/* Section 1: Organization Details */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <Building className="w-4 h-4" /> 1. Company Legal & Operational Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Company Legal Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Infosys Technologies Ltd."
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Company Code * (Unique)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. INFY"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white uppercase font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Domain Name</label>
                    <input
                      type="text"
                      placeholder="e.g. infosys.com"
                      value={formData.domain}
                      onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">GSTIN / Tax ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 27AAACI1234Q1Z5"
                      value={formData.taxId}
                      onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">CIN / Registration No.</label>
                    <input
                      type="text"
                      placeholder="e.g. L85110KA1981PLC013115"
                      value={formData.registrationNumber}
                      onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Subscription Plan</label>
                    <select
                      value={formData.subscriptionPlan}
                      onChange={(e) => setFormData({ ...formData, subscriptionPlan: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="STARTER">Starter (up to 50 employees)</option>
                      <option value="GROWTH">Growth (up to 250 employees)</option>
                      <option value="ENTERPRISE">Enterprise (Unlimited / 500+ employees)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Max Branches Allowed *</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      placeholder="e.g. 2"
                      value={formData.maxBranches || 2}
                      onChange={(e) => setFormData({ ...formData, maxBranches: parseInt(e.target.value) || 1 })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">Limits how many branches Head HR can onboard (e.g. 2 branches)</p>
                  </div>
                </div>
              </div>

              {/* Section 2: Designated HR Admin */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <KeyRound className="w-4 h-4" /> 2. Designated Organization HR Admin
                  </h3>
                  <span className="text-[11px] text-slate-400">Controls this company's workspace</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">HR Admin First Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sneha"
                      value={formData.adminFirstName}
                      onChange={(e) => setFormData({ ...formData, adminFirstName: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">HR Admin Last Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kulkarni"
                      value={formData.adminLastName}
                      onChange={(e) => setFormData({ ...formData, adminLastName: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">HR Admin Corporate Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. sneha.hr@infosys.com"
                      value={formData.adminEmail}
                      onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Initial Password *</label>
                    <input
                      type="text"
                      required
                      placeholder="Welcome@123"
                      value={formData.adminPassword}
                      onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      placeholder="+91 98200 12345"
                      value={formData.adminPhoneNumber}
                      onChange={(e) => setFormData({ ...formData, adminPhoneNumber: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Provisioning...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Provision Organization
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirm Permanent Deletion */}
      {tenantToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-rose-500/30 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Permanently Delete Organization?</h3>
                <p className="text-xs text-rose-400 font-medium">Super Admin Platform Action • Irreversible</p>
              </div>
            </div>

            <div className="bg-rose-950/30 border border-rose-500/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-rose-300 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>Critical Warning: Cascading Database Purge</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                You are about to permanently delete <strong className="text-white font-bold">{tenantToDelete.name}</strong> (<span className="font-mono text-rose-300">{tenantToDelete.code}</span>). All associated branches, departments, workforce profiles, attendance, payroll records, and dedicated HR Admin login accounts will be permanently wiped from PostgreSQL.
              </p>
            </div>

            <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Branches</span>
                <span className="text-white font-bold text-sm">{tenantToDelete.totalBranches}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Departments</span>
                <span className="text-white font-bold text-sm">{tenantToDelete.totalDepartments}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Workforce</span>
                <span className="text-white font-bold text-sm">{tenantToDelete.totalEmployees}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deletingTenant}
                onClick={() => setTenantToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingTenant}
                onClick={handleExecuteDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/30 disabled:opacity-50 transition-all hover:scale-[1.02]"
              >
                {deletingTenant ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Purging Organization...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" /> Confirm Permanent Deletion
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

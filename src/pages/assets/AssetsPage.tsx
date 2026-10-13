import React, { useState } from "react";
import {
  Laptop,
  HardDrive,
  Monitor,
  Smartphone,
  Key,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  UserCheck,
  Calendar,
  DollarSign,
  Tag,
  ShieldCheck,
  ArrowUpRight,
  User,
} from "lucide-react";
import { useHrms } from "../../lib/hrmsContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { KpiCard } from "../../components/ui/KpiCard";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { CompanyAsset, AssetCategory, AssetStatus, AssetCondition } from "../../types/hrms";
import { formatINR, cn } from "../../lib/utils";

const CATEGORIES: { key: AssetCategory | "ALL"; label: string; icon: any }[] = [
  { key: "ALL", label: "All Assets", icon: HardDrive },
  { key: "LAPTOP", label: "Laptops & PCs", icon: Laptop },
  { key: "MONITOR", label: "Monitors", icon: Monitor },
  { key: "MOBILE", label: "Phones & Tablets", icon: Smartphone },
  { key: "LICENSE", label: "Software Licenses", icon: Key },
];

export function AssetsPage() {
  const { assets, employees, addAsset, allocateAsset, returnAsset } = useHrms();

  const [activeTab, setActiveTab] = useState("inventory");
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<AssetStatus | "ALL">("ALL");

  // Modals
  const [isAddAssetModalOpen, setIsAddAssetModalOpen] = useState(false);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [targetAssetForAllocation, setTargetAssetForAllocation] = useState<CompanyAsset | null>(null);

  // New Asset Form State
  const [newTag, setNewTag] = useState(`AST-LT-${100 + assets.length + 1}`);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<AssetCategory>("LAPTOP");
  const [newModel, setNewModel] = useState("");
  const [newSerial, setNewSerial] = useState("");
  const [newCost, setNewCost] = useState(125000);
  const [newPurchaseDate, setNewPurchaseDate] = useState("2026-02-15");
  const [newWarranty, setNewWarranty] = useState("2029-02-14");
  const [newCondition, setNewCondition] = useState<AssetCondition>("EXCELLENT");

  // Allocation Form State
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [selectedEmpId, setSelectedEmpId] = useState(employees[0]?.id || "");

  // Metrics
  const totalAssets = assets.length;
  const allocatedAssets = assets.filter((a) => a.status === "ALLOCATED").length;
  const availableAssets = assets.filter((a) => a.status === "AVAILABLE").length;
  const maintenanceAssets = assets.filter((a) => a.status === "MAINTENANCE").length;

  const handleRegisterAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newSerial.trim()) return;

    addAsset({
      assetTag: newTag.trim() || `AST-${Date.now().toString().slice(-4)}`,
      name: newName.trim(),
      category: newCategory,
      model: newModel.trim() || newName.trim(),
      serialNumber: newSerial.trim(),
      purchaseDate: newPurchaseDate,
      warrantyExpiry: newWarranty,
      purchaseCost: Number(newCost) || 50000,
      status: "AVAILABLE",
      condition: newCondition,
      department: "IT Stock Room",
    });

    setIsAddAssetModalOpen(false);
    setNewName("");
    setNewModel("");
    setNewSerial("");
  };

  const handleAllocateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const assetId = targetAssetForAllocation ? targetAssetForAllocation.id : selectedAssetId;
    if (!assetId || !selectedEmpId) return;

    const emp = employees.find((e) => e.id === selectedEmpId);
    if (!emp) return;

    allocateAsset(assetId, emp.id, `${emp.firstName} ${emp.lastName}`);
    setIsAllocateModalOpen(false);
    setTargetAssetForAllocation(null);
  };

  const openAllocateForSpecific = (asset: CompanyAsset) => {
    setTargetAssetForAllocation(asset);
    setSelectedAssetId(asset.id);
    setIsAllocateModalOpen(true);
  };

  // Filtered Assets
  const filteredAssets = assets.filter((a) => {
    const matchesCat = selectedCategory === "ALL" || a.category === selectedCategory;
    const matchesStatus = statusFilter === "ALL" || a.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      a.name.toLowerCase().includes(q) ||
      a.assetTag.toLowerCase().includes(q) ||
      a.serialNumber.toLowerCase().includes(q) ||
      (a.assignedToEmployeeName && a.assignedToEmployeeName.toLowerCase().includes(q));
    return matchesCat && matchesStatus && matchesQuery;
  });

  const availableOptions = assets.filter((a) => a.status === "AVAILABLE");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset & IT Management"
        subtitle="Track company hardware inventory, device assignments, procurement value, and warranties."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              onClick={() => {
                setTargetAssetForAllocation(null);
                setIsAllocateModalOpen(true);
              }}
              className="gap-2"
              disabled={availableOptions.length === 0}
            >
              <UserCheck className="w-4 h-4" />
              Allocate Asset
            </Button>
            <Button
              variant="primary"
              onClick={() => setIsAddAssetModalOpen(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Register Device
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total IT Assets"
          value={totalAssets}
          trend={{ value: `${totalAssets}`, label: "hardware & licenses", isPositive: true }}
          icon={<Laptop className="w-5 h-5 text-gray-700" />}
          accentColor="neutral"
        />
        <KpiCard
          label="Assigned to Staff"
          value={allocatedAssets}
          trend={{
            value: `${Math.round((allocatedAssets / (totalAssets || 1)) * 100)}%`,
            label: "deployed",
            isPositive: true,
          }}
          icon={<UserCheck className="w-5 h-5 text-indigo-600" />}
          accentColor="indigo"
        />
        <KpiCard
          label="In Stock & Ready"
          value={availableAssets}
          trend={{ value: `${availableAssets}`, label: "ready to deploy", isPositive: true }}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          accentColor="emerald"
        />
        <KpiCard
          label="Under Maintenance"
          value={maintenanceAssets}
          trend={{ value: `${maintenanceAssets}`, label: "at service center", isPositive: false }}
          icon={<AlertTriangle className="w-5 h-5 text-amber-600" />}
          accentColor="amber"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab("inventory")}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px",
            activeTab === "inventory"
              ? "border-gray-950 text-gray-950"
              : "border-transparent text-gray-500 hover:text-gray-900"
          )}
        >
          Hardware Inventory
          <span className="text-[11px] font-bold bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">
            {assets.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("allocations")}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px",
            activeTab === "allocations"
              ? "border-gray-950 text-gray-950"
              : "border-transparent text-gray-500 hover:text-gray-900"
          )}
        >
          Staff Allocations
          <span className="text-[11px] font-bold bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">
            {allocatedAssets}
          </span>
        </button>
      </div>

      {/* Tab 1: Inventory List */}
      {activeTab === "inventory" && (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3">
              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.key;
                  return (
                    <button
                      key={cat.key}
                      onClick={() => setSelectedCategory(cat.key)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap ${
                        isSelected
                          ? "bg-gray-950 text-white border-gray-950 shadow-xs"
                          : "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Search & Status Filters */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-gray-100">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tag, serial, model, employee..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:border-gray-900"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="AVAILABLE">Available</option>
                    <option value="ALLOCATED">Allocated</option>
                    <option value="MAINTENANCE">Maintenance</option>
                  </select>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/80 border-y border-gray-200 text-gray-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Asset Tag</th>
                    <th className="py-3 px-4">Device / Asset Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Serial Number</th>
                    <th className="py-3 px-4">Cost</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Assigned To</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAssets.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-xs text-gray-400 italic">
                        No assets found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredAssets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                          {asset.assetTag}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-gray-900">
                          {asset.name}
                          <div className="text-[10px] text-gray-400 font-normal">
                            Model: {asset.model} • Warranty: {asset.warrantyExpiry}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-[10px] font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200">
                            {asset.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-gray-600">
                          {asset.serialNumber}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-gray-800">
                          {formatINR(asset.purchaseCost)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              asset.status === "ALLOCATED"
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                : asset.status === "AVAILABLE"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {asset.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {asset.assignedToEmployeeName ? (
                            <span className="font-semibold text-gray-900 flex items-center gap-1">
                              <User className="w-3 h-3 text-indigo-500" />
                              {asset.assignedToEmployeeName}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">In IT Stock</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {asset.status === "AVAILABLE" ? (
                            <button
                              onClick={() => openAllocateForSpecific(asset)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 rounded border border-indigo-200"
                            >
                              Assign
                            </button>
                          ) : asset.status === "ALLOCATED" ? (
                            <button
                              onClick={() => returnAsset(asset.id)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 rounded border border-rose-200 inline-flex items-center gap-1"
                              title="Check back into stock"
                            >
                              <RotateCcw className="w-3 h-3" /> Return
                            </button>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">In Service</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Allocations Matrix */}
      {activeTab === "allocations" && (
        <Card>
          <CardHeader>
            <CardTitle>Staff Hardware Allocations</CardTitle>
            <p className="text-xs text-text-muted mt-1">
              Active company devices deployed to team members across departments.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/80 border-y border-gray-200 text-gray-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Assigned Asset</th>
                    <th className="py-3 px-4">Asset Tag</th>
                    <th className="py-3 px-4">Date Issued</th>
                    <th className="py-3 px-4">Condition</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {assets
                    .filter((a) => a.status === "ALLOCATED")
                    .map((asset) => (
                      <tr key={asset.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-gray-900">
                          {asset.assignedToEmployeeName}
                        </td>
                        <td className="py-3.5 px-4 text-gray-700">{asset.department || "General"}</td>
                        <td className="py-3.5 px-4 font-medium text-gray-900">{asset.name}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">
                          {asset.assetTag}
                        </td>
                        <td className="py-3.5 px-4 text-gray-600">{asset.assignedDate || "Active"}</td>
                        <td className="py-3.5 px-4">
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {asset.condition}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => returnAsset(asset.id)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 rounded border border-rose-200 inline-flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" /> Return to Stock
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MODAL: Register New Asset */}
      <Modal
        isOpen={isAddAssetModalOpen}
        onClose={() => setIsAddAssetModalOpen(false)}
        title="Register New Company Asset"
        size="lg"
      >
        <form onSubmit={handleRegisterAsset} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Asset Tag / Inventory ID"
              placeholder="e.g. AST-LT-105"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              required
            />
            <Select
              label="Category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as AssetCategory)}
              options={[
                { value: "LAPTOP", label: "Laptop / Computer" },
                { value: "MONITOR", label: "External Display / Monitor" },
                { value: "MOBILE", label: "Phone / Tablet" },
                { value: "ACCESSORY", label: "Accessory / Peripheral" },
                { value: "LICENSE", label: "Software License" },
              ]}
            />
          </div>

          <Input
            label="Device / Model Name"
            placeholder="e.g. Apple MacBook Pro 14 (M3 Max, 36GB, 1TB)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Manufacturer Model"
              placeholder="e.g. MacBook Pro 14-inch"
              value={newModel}
              onChange={(e) => setNewModel(e.target.value)}
            />
            <Input
              label="Serial Number"
              placeholder="e.g. C02GL01X..."
              value={newSerial}
              onChange={(e) => setNewSerial(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Purchase Cost (₹)"
              type="number"
              value={newCost}
              onChange={(e) => setNewCost(Number(e.target.value))}
            />
            <Input
              label="Purchase Date"
              type="date"
              value={newPurchaseDate}
              onChange={(e) => setNewPurchaseDate(e.target.value)}
            />
            <Input
              label="Warranty Expiry"
              type="date"
              value={newWarranty}
              onChange={(e) => setNewWarranty(e.target.value)}
            />
          </div>

          <Select
            label="Initial Physical Condition"
            value={newCondition}
            onChange={(e) => setNewCondition(e.target.value as AssetCondition)}
            options={[
              { value: "EXCELLENT", label: "Brand New / Excellent" },
              { value: "GOOD", label: "Good" },
              { value: "FAIR", label: "Fair" },
              { value: "NEEDS_REPAIR", label: "Needs Repair" },
            ]}
          />

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setIsAddAssetModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save & Register Asset
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Allocate Asset */}
      <Modal
        isOpen={isAllocateModalOpen}
        onClose={() => {
          setIsAllocateModalOpen(false);
          setTargetAssetForAllocation(null);
        }}
        title="Allocate Asset to Employee"
        size="md"
      >
        <form onSubmit={handleAllocateSubmit} className="space-y-4">
          {targetAssetForAllocation ? (
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs space-y-1">
              <div className="font-bold text-gray-900">{targetAssetForAllocation.name}</div>
              <div className="text-gray-500 font-mono">
                Tag: {targetAssetForAllocation.assetTag} • SN: {targetAssetForAllocation.serialNumber}
              </div>
            </div>
          ) : (
            <Select
              label="Select Available Device"
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              options={availableOptions.map((a) => ({
                value: a.id,
                label: `${a.assetTag} — ${a.name} (${a.category})`,
              }))}
            />
          )}

          <Select
            label="Assign to Employee"
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            options={employees.map((e) => ({
              value: e.id,
              label: `${e.employeeCode} - ${e.firstName} ${e.lastName}`,
            }))}
          />

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                setIsAllocateModalOpen(false);
                setTargetAssetForAllocation(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Confirm Assignment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

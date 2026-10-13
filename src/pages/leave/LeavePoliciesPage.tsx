import React, { useState } from "react";
import {
  ShieldCheck,
  Edit2,
  Check,
  X,
  Calendar,
  Layers,
  HelpCircle,
  FileCheck2,
  ArrowUpRight,
} from "lucide-react";
import { useHrms } from "../../lib/hrmsContext";
import { LeaveType } from "../../types/hrms";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";

export function LeavePoliciesPage() {
  const { leaveTypes, updateLeavePolicy } = useHrms();
  const [editingPolicy, setEditingPolicy] = useState<LeaveType | null>(null);

  const [annualQuota, setAnnualQuota] = useState(12);
  const [monthlyAccrual, setMonthlyAccrual] = useState(1.0);
  const [carryForwardMax, setCarryForwardMax] = useState(0);

  const handleOpenEdit = (policy: LeaveType) => {
    setEditingPolicy(policy);
    setAnnualQuota(policy.annualQuota);
    setMonthlyAccrual(policy.monthlyAccrual);
    setCarryForwardMax(policy.carryForwardMax);
  };

  const handleSave = () => {
    if (!editingPolicy) return;
    updateLeavePolicy(editingPolicy.id, {
      annualQuota: Number(annualQuota),
      monthlyAccrual: Number(monthlyAccrual),
      carryForwardMax: Number(carryForwardMax),
    });
    setEditingPolicy(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-950 tracking-tight">
            Leave Policies & Accrual Rules
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configurable annual quotas, monthly accrual schedules, and statutory carry-forward limits.
          </p>
        </div>
      </div>

      {/* Policy Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {leaveTypes.map((policy) => (
          <div
            key={policy.id}
            className="bg-white rounded-xl border border-gray-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:border-gray-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
          >
            <div className="p-5">
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: policy.color }}
                  />
                  <div>
                    <h2 className="text-base font-bold text-gray-950 leading-tight">
                      {policy.name}
                    </h2>
                    <span className="text-[11px] font-mono text-gray-500 font-semibold">
                      {policy.code}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenEdit(policy)}
                  className="p-1.5 text-gray-400 hover:text-gray-950 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Configure Policy"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              {/* Description */}
              <p className="text-xs text-gray-500 leading-relaxed mb-4 min-h-[36px]">
                {policy.description}
              </p>

              {/* Metrics Grid */}
              <div className="space-y-2.5 text-xs pt-3 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Annual Entitlement:</span>
                  <span className="font-bold text-gray-950 text-sm">
                    {policy.annualQuota} Days
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Monthly Accrual:</span>
                  <span className="font-semibold text-gray-800">
                    +{policy.monthlyAccrual} / month
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Max Carry-Forward:</span>
                  <span className="font-semibold text-gray-800">
                    {policy.carryForwardMax > 0 ? `${policy.carryForwardMax} Days` : "0 (Lapses Yearly)"}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Compensation:</span>
                  <Badge variant={policy.isPaid ? "success" : "neutral"} size="sm">
                    {policy.isPaid ? "Paid Leave" : "Loss of Pay (Unpaid)"}
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Encashable:</span>
                  <span className="text-xs font-medium text-gray-700">
                    {policy.isEncashable ? "Yes (On Separation)" : "Non-encashable"}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Footer */}
            <div className="px-5 py-3 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[11px] text-gray-500">Configured Policy</span>
              <button
                onClick={() => handleOpenEdit(policy)}
                className="text-xs font-medium text-gray-950 hover:underline flex items-center gap-1"
              >
                <span>Edit Parameters</span>
                <ArrowUpRight className="w-3 h-3 text-gray-400" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Policy Modal */}
      <Modal
        isOpen={!!editingPolicy}
        onClose={() => setEditingPolicy(null)}
        title={`Configure ${editingPolicy?.name} (${editingPolicy?.code})`}
        description="Modify annual quotas, monthly accrual rates, and year-end carry forward caps."
      >
        <div className="space-y-4">
          <Input
            label="Annual Entitlement Quota (Days / Year)"
            type="number"
            value={annualQuota}
            onChange={(e) => setAnnualQuota(Number(e.target.value))}
            min={0}
            required
          />

          <Input
            label="Monthly Accrual Rate (Days / Month)"
            type="number"
            step="0.1"
            value={monthlyAccrual}
            onChange={(e) => setMonthlyAccrual(Number(e.target.value))}
            min={0}
            required
          />

          <Input
            label="Maximum Carry Forward Cap (Days)"
            type="number"
            value={carryForwardMax}
            onChange={(e) => setCarryForwardMax(Number(e.target.value))}
            min={0}
            required
          />

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-600 space-y-1">
            <div className="flex justify-between font-medium">
              <span>Policy Mode:</span>
              <span className="text-gray-950">{editingPolicy?.isPaid ? "Paid Leave" : "Loss of Pay"}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Encashable:</span>
              <span className="text-gray-950">{editingPolicy?.isEncashable ? "Permitted" : "No"}</span>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2.5">
            <Button variant="outline" onClick={() => setEditingPolicy(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave}>
              Save Policy
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

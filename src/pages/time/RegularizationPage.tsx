import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { useHrms } from "../../lib/hrmsContext";
import { useAuth } from "../../lib/authContext";
import { useToast } from "../../lib/toastContext";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { formatDate, formatTime } from "../../lib/utils";
import { API_BASE_URL } from "../../lib/api";

interface RegularizationItem {
  id: number;
  employeeId: number | null;
  employeeName: string | null;
  employeeCode: string | null;
  departmentName: string | null;
  date: string;
  proposedPunchIn: string;
  proposedPunchOut: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewerRemarks?: string | null;
  decidedAt?: string | null;
  createdAt: string;
}
export function RegularizationPage() {
  const { employees } = useHrms();
  const { user } = useAuth();
  const toast = useToast();

  const isHrOrAdmin =
    user?.role === "HR_ADMIN" ||
    user?.role === "TENANT_ADMIN" ||
    user?.role === "SUPER_ADMIN" ||
    Boolean(user?.roles?.some((r) => ["ROLE_HR_ADMIN", "ROLE_TENANT_ADMIN", "ROLE_SUPER_ADMIN"].includes(r)));

  const isSupervisor =
    !isHrOrAdmin &&
    (user?.role === "MANAGER" ||
      user?.role === "TEAM_LEAD" ||
      Boolean(user?.roles?.some((r) => ["ROLE_MANAGER", "ROLE_TEAM_LEAD"].includes(r))));

  const isLeaderOrAdmin = isHrOrAdmin || isSupervisor;

  const [requests, setRequests] = useState<RegularizationItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Apply modal
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [applyDate, setApplyDate] = useState("2026-10-23");
  const [applyIn, setApplyIn] = useState("10:00");
  const [applyOut, setApplyOut] = useState("19:00");
  const [applyReason, setApplyReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applyError, setApplyError] = useState("");

  // ---------- API Helpers ----------
  const getToken = () => localStorage.getItem("hrms_access_token") || "";

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      // Employee ke liye apne requests, admin ke liye pending
      const url = isLeaderOrAdmin
        ? `${API_BASE_URL}/regularization/pending`
        : `${API_BASE_URL}/regularization/employee/${user?.employeeId || 0}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setRequests(json.data || []);
    } catch {
      toast.error("Could not load requests");
    } finally {
      setLoading(false);
    }
  }, [isLeaderOrAdmin, user?.employeeId, toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // ---------- Submit new request ----------
  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    setApplyError("");

    if (!applyReason.trim()) {
      setApplyError("Please provide a reason.");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = getToken();
      const proposedIn = new Date(`${applyDate}T${applyIn}:00+05:30`).toISOString();
      const proposedOut = new Date(`${applyDate}T${applyOut}:00+05:30`).toISOString();

      const res = await fetch(`${API_BASE_URL}/regularization/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          employeeId: user?.employeeId,
          date: applyDate,
          proposedPunchIn: proposedIn,
          proposedPunchOut: proposedOut,
          reason: applyReason.trim(),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Failed to submit correction request");
      }

      toast.success("Correction request submitted successfully!");
      setIsApplyOpen(false);
      setApplyReason("");
      fetchRequests();
    } catch (err: any) {
      setApplyError(err.message || "Submission failed");
      toast.error(err.message || "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/regularization/${id}/approve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Approve failed");
      toast.success("Request approved! Attendance updated.");
      fetchRequests();
      // Page reload ya state refresh taaki calendar me dikhe
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      toast.error(err.message || "Could not approve");
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm("Reject this correction request? Employee will be able to re-submit.")) return;
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/regularization/${id}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ remarks: "Rejected by " + (user?.fullName || "Manager") }),
      });
      if (!res.ok) throw new Error("Reject failed");
      toast.success("Request rejected.");
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message || "Could not reject");
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-950 tracking-tight">
            Attendance Regularization
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Resolve missed punches, hardware failures, or outdoor duty with manager approval.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={fetchRequests}
            variant="outline"
            size="md"
            isLoading={loading}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Refresh
          </Button>
          <Button
            onClick={() => setIsApplyOpen(true)}
            variant="primary"
            size="md"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Request Regularization
          </Button>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-card border border-surface-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Attendance Date</th>
                <th className="py-3.5 px-4">Proposed Punch In</th>
                <th className="py-3.5 px-4">Proposed Punch Out</th>
                <th className="py-3.5 px-4">Reason / Justification</th>
                <th className="py-3.5 px-4">Status</th>
                {isLeaderOrAdmin && (
                  <th className="py-3.5 px-4 text-right">Approval Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={isLeaderOrAdmin ? 7 : 6} className="py-12 text-center text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading regularization requests...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={isLeaderOrAdmin ? 7 : 6} className="py-14 text-center text-gray-400 text-sm">
                    No regularization requests found.
                  </td>
                </tr>
              ) : (
                requests.map((reg) => (
                  <tr key={reg.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-950">{reg.employeeName || "Unknown"}</div>
                      <div className="text-xs text-gray-500">{reg.employeeCode || "--"}</div>
                    </td>

                    <td className="py-3 px-4 text-xs font-medium text-gray-900">
                      {formatDate(reg.date)}
                    </td>

                    <td className="py-3 px-4 font-mono text-xs font-semibold text-emerald-700">
                      {reg.proposedPunchIn ? formatTime(reg.proposedPunchIn) : "--:--"}
                    </td>

                    <td className="py-3 px-4 font-mono text-xs font-semibold text-gray-900">
                      {reg.proposedPunchOut ? formatTime(reg.proposedPunchOut) : "--:--"}
                    </td>

                    <td className="py-3 px-4 text-xs text-gray-600 max-w-xs truncate">
                      {reg.reason}
                    </td>

                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          reg.status === "APPROVED"
                            ? "success"
                            : reg.status === "REJECTED"
                              ? "danger"
                              : "warning"
                        }
                        size="sm"
                        dot
                      >
                        {reg.status}
                      </Badge>
                    </td>

                    {isLeaderOrAdmin && (
                      <td className="py-3 px-4 text-right">
                        {reg.status === "PENDING" ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              onClick={() => handleApprove(reg.id)}
                              variant="success"
                              size="sm"
                              className="h-8 text-xs px-2.5"
                              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                            >
                              Approve
                            </Button>
                            <Button
                              onClick={() => handleReject(reg.id)}
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs px-2.5 text-rose-600 hover:bg-rose-50 border-rose-200"
                              leftIcon={<XCircle className="w-3.5 h-3.5" />}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">
                            {reg.reviewerRemarks || "Completed"}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Modal */}
      <Modal
        isOpen={isApplyOpen}
        onClose={() => setIsApplyOpen(false)}
        title="Submit Attendance Regularization Request"
        description="Provide details for missed punches or biometric reader discrepancies."
      >
        <form onSubmit={handleApply} className="space-y-4">
          {applyError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{applyError}</span>
            </div>
          )}

          <Input
            label="Attendance Date"
            type="date"
            value={applyDate}
            onChange={(e) => setApplyDate(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Proposed Punch In"
              type="time"
              value={applyIn}
              onChange={(e) => setApplyIn(e.target.value)}
              required
            />
            <Input
              label="Proposed Punch Out"
              type="time"
              value={applyOut}
              onChange={(e) => setApplyOut(e.target.value)}
              required
            />
          </div>

          <Input
            label="Reason / Explanation"
            value={applyReason}
            onChange={(e) => setApplyReason(e.target.value)}
            placeholder="e.g. Device was offline / Client site visit"
            required
          />

          <div className="pt-4 flex justify-end gap-2.5">
            <Button type="button" variant="outline" onClick={() => setIsApplyOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
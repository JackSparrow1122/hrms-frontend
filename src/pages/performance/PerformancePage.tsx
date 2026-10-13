import React, { useState } from "react";
import {
  Target,
  TrendingUp,
  Award,
  Star,
  Plus,
  CheckCircle2,
  Clock,
  ChevronRight,
  User,
  Building2,
  Calendar,
  BarChart2,
  Filter,
  MessageSquare,
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
import { PerformanceGoal, AppraisalReview, GoalPriority } from "../../types/hrms";
import { cn } from "../../lib/utils";

export function PerformancePage() {
  const { performanceGoals, appraisalReviews, departments, employees, addGoal, updateGoalProgress, submitAppraisalReview } = useHrms();

  const [activeTab, setActiveTab] = useState("okrs");
  const [selectedQuarter, setSelectedQuarter] = useState("Q3 2026");

  // Modals
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [selectedReviewForRating, setSelectedReviewForRating] = useState<AppraisalReview | null>(null);
  const [ratingInput, setRatingInput] = useState(4.5);
  const [feedbackInput, setFeedbackInput] = useState("");

  // New Goal Form State
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalDeptId, setNewGoalDeptId] = useState(departments[0]?.id || "");
  const [newGoalOwnerId, setNewGoalOwnerId] = useState(employees[0]?.id || "");
  const [newGoalPriority, setNewGoalPriority] = useState<GoalPriority>("HIGH");
  const [newGoalDueDate, setNewGoalDueDate] = useState("2026-12-15");
  const [kr1Title, setKr1Title] = useState("");
  const [kr2Title, setKr2Title] = useState("");

  // Metrics
  const totalGoals = performanceGoals.length;
  const avgProgress = totalGoals > 0
    ? Math.round(performanceGoals.reduce((sum, g) => sum + g.progressPercent, 0) / totalGoals)
    : 0;
  const completedReviews = appraisalReviews.filter((r) => r.status === "COMPLETED").length;
  const topPerformers = appraisalReviews.filter((r) => r.managerRating >= 4.5).length;

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;

    const dept = departments.find((d) => d.id === newGoalDeptId);
    const emp = employees.find((e) => e.id === newGoalOwnerId);

    addGoal({
      title: newGoalTitle.trim(),
      quarter: selectedQuarter,
      departmentId: newGoalDeptId,
      departmentName: dept?.name || "General",
      ownerEmployeeId: newGoalOwnerId,
      ownerName: emp ? `${emp.firstName} ${emp.lastName}` : "Team Lead",
      ownerAvatar: emp?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100",
      priority: newGoalPriority,
      status: "IN_PROGRESS",
      progressPercent: 10,
      dueDate: newGoalDueDate,
      keyResults: [
        {
          id: `kr-${Date.now()}-1`,
          title: kr1Title.trim() || "Milestone 1 Key Deliverable",
          target: 100,
          current: 10,
          unit: "%",
        },
        ...(kr2Title.trim()
          ? [
              {
                id: `kr-${Date.now()}-2`,
                title: kr2Title.trim(),
                target: 100,
                current: 5,
                unit: "%",
              },
            ]
          : []),
      ],
    });

    setIsAddGoalModalOpen(false);
    setNewGoalTitle("");
    setKr1Title("");
    setKr2Title("");
  };

  const handleRatingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReviewForRating) return;

    submitAppraisalReview(selectedReviewForRating.id, Number(ratingInput), feedbackInput);
    setSelectedReviewForRating(null);
    setFeedbackInput("");
  };

  const openRatingModal = (review: AppraisalReview) => {
    setSelectedReviewForRating(review);
    setRatingInput(review.managerRating || 4.5);
    setFeedbackInput(review.feedback || "");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance & OKRs"
        subtitle="Align organizational priorities, track key results, and conduct 360 appraisal evaluations."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="primary"
              onClick={() => setIsAddGoalModalOpen(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              New Objective / OKR
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Active Objectives"
          value={totalGoals}
          trend={{ value: `${totalGoals}`, label: "tracked for Q3", isPositive: true }}
          icon={<Target className="w-5 h-5 text-gray-700" />}
          accentColor="neutral"
        />
        <KpiCard
          label="Average Goal Progress"
          value={`${avgProgress}%`}
          trend={{ value: `${avgProgress}%`, label: "completion velocity", isPositive: true }}
          icon={<TrendingUp className="w-5 h-5 text-indigo-600" />}
          accentColor="indigo"
        />
        <KpiCard
          label="Appraisals Finalized"
          value={`${completedReviews} / ${appraisalReviews.length}`}
          trend={{ value: `${completedReviews}`, label: "calibrated", isPositive: true }}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          accentColor="emerald"
        />
        <KpiCard
          label="Top Performers (★ 4.5+)"
          value={topPerformers}
          trend={{ value: `${topPerformers}`, label: "high rating band", isPositive: true }}
          icon={<Award className="w-5 h-5 text-amber-600" />}
          accentColor="amber"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab("okrs")}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px",
            activeTab === "okrs"
              ? "border-gray-950 text-gray-950"
              : "border-transparent text-gray-500 hover:text-gray-900"
          )}
        >
          Objectives & OKRs
          <span className="text-[11px] font-bold bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">
            {performanceGoals.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("appraisals")}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px",
            activeTab === "appraisals"
              ? "border-gray-950 text-gray-950"
              : "border-transparent text-gray-500 hover:text-gray-900"
          )}
        >
          Appraisal Cycles & Reviews
          <span className="text-[11px] font-bold bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">
            {appraisalReviews.length}
          </span>
        </button>
      </div>

      {/* Tab 1: OKRs */}
      {activeTab === "okrs" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Quarterly Objectives
              </span>
              <span className="text-xs text-gray-400">
                • Interactive progress updates & measurable Key Results (KRs)
              </span>
            </div>

            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg font-semibold text-gray-800 shadow-2xs"
            >
              <option value="Q3 2026">Cycle: Q3 2026 (Active)</option>
              <option value="Q4 2026">Cycle: Q4 2026 (Upcoming)</option>
              <option value="Q2 2026">Cycle: Q2 2026 (Archived)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {performanceGoals.map((goal) => (
              <div
                key={goal.id}
                className="p-5 bg-white rounded-2xl border border-gray-200 shadow-xs hover:border-gray-900 transition-all duration-150 space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {goal.departmentName}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          goal.priority === "CRITICAL"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : goal.priority === "HIGH"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}
                      >
                        {goal.priority} PRIORITY
                      </span>
                      <span className="text-xs text-gray-400">Due {goal.dueDate}</span>
                    </div>

                    <h3 className="text-sm font-bold text-gray-900">{goal.title}</h3>
                  </div>

                  {/* Owner */}
                  <div className="flex items-center gap-2.5 shrink-0 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
                    <img
                      src={goal.ownerAvatar}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover"
                    />
                    <div className="text-left">
                      <div className="text-xs font-semibold text-gray-900">{goal.ownerName}</div>
                      <div className="text-[10px] text-gray-500">Owner</div>
                    </div>
                  </div>
                </div>

                {/* Progress Bar & Interactive Slider */}
                <div className="space-y-1.5 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-700">Progress Completion</span>
                    <span className="font-mono font-bold text-gray-900">{goal.progressPercent}%</span>
                  </div>

                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        goal.progressPercent >= 80
                          ? "bg-emerald-500"
                          : goal.progressPercent >= 50
                          ? "bg-indigo-600"
                          : "bg-amber-500"
                      }`}
                      style={{ width: `${goal.progressPercent}%` }}
                    />
                  </div>

                  {/* Quick Controls */}
                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <span className="text-[10px] text-gray-400 mr-1">Quick update:</span>
                    <button
                      onClick={() => updateGoalProgress(goal.id, goal.progressPercent - 10)}
                      className="px-2 py-0.5 text-[10px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded border border-gray-200"
                    >
                      -10%
                    </button>
                    <button
                      onClick={() => updateGoalProgress(goal.id, goal.progressPercent + 10)}
                      className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded border border-indigo-200"
                    >
                      +10%
                    </button>
                    <button
                      onClick={() => updateGoalProgress(goal.id, 100)}
                      className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded border border-emerald-200"
                    >
                      Mark 100%
                    </button>
                  </div>
                </div>

                {/* Key Results */}
                {goal.keyResults && goal.keyResults.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                      Key Results Breakdown
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {goal.keyResults.map((kr) => (
                        <div
                          key={kr.id}
                          className="p-2.5 bg-gray-50/70 rounded-xl border border-gray-200/80 text-xs flex items-center justify-between"
                        >
                          <span className="text-gray-700 font-medium truncate pr-2">
                            {kr.title}
                          </span>
                          <span className="font-mono font-bold text-gray-900 shrink-0">
                            {kr.current} / {kr.target} {kr.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Appraisals */}
      {activeTab === "appraisals" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>360° Appraisal Calibration & Reviews</CardTitle>
                <p className="text-xs text-text-muted mt-1">
                  Manager reviews, self-assessments, and performance rating scores.
                </p>
              </div>
              <span className="text-xs font-semibold bg-gray-100 px-3 py-1 rounded-full border border-gray-200 text-gray-700">
                Cycle: Annual Appraisal 2026
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/80 border-y border-gray-200 text-gray-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Reviewer</th>
                    <th className="py-3 px-4 text-center">Self Rating</th>
                    <th className="py-3 px-4 text-center">Manager Rating</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Feedback Summary</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {appraisalReviews.map((review) => (
                    <tr key={review.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-gray-900">
                        {review.employeeName}
                        <div className="text-[10px] text-gray-400 font-normal">
                          {review.employeeDesignation}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-700">{review.department}</td>
                      <td className="py-3.5 px-4 text-gray-800 font-medium">{review.reviewerName}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                          {review.selfRating}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {review.managerRating > 0 ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <Star className="w-3 h-3 fill-emerald-500 text-emerald-600" />
                            {review.managerRating}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[11px] italic">Pending</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            review.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {review.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 max-w-xs truncate">
                        {review.feedback || "Awaiting calibration review"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => openRatingModal(review)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50 rounded border border-indigo-200"
                        >
                          {review.status === "COMPLETED" ? "Edit Rating" : "Submit Review"}
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

      {/* MODAL: Create Objective / OKR */}
      <Modal
        isOpen={isAddGoalModalOpen}
        onClose={() => setIsAddGoalModalOpen(false)}
        title="Create New Objective (OKR)"
        size="lg"
      >
        <form onSubmit={handleCreateGoal} className="space-y-4">
          <Input
            label="Objective Statement"
            placeholder="e.g. Elevate Enterprise Security to ISO 27001 Compliance"
            value={newGoalTitle}
            onChange={(e) => setNewGoalTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Department"
              value={newGoalDeptId}
              onChange={(e) => setNewGoalDeptId(e.target.value)}
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
            />
            <Select
              label="Goal Owner"
              value={newGoalOwnerId}
              onChange={(e) => setNewGoalOwnerId(e.target.value)}
              options={employees.map((e) => ({
                value: e.id,
                label: `${e.firstName} ${e.lastName} (${e.employeeCode})`,
              }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Priority Level"
              value={newGoalPriority}
              onChange={(e) => setNewGoalPriority(e.target.value as GoalPriority)}
              options={[
                { value: "CRITICAL", label: "Critical" },
                { value: "HIGH", label: "High" },
                { value: "MEDIUM", label: "Medium" },
                { value: "LOW", label: "Low" },
              ]}
            />
            <Input
              label="Target Due Date"
              type="date"
              value={newGoalDueDate}
              onChange={(e) => setNewGoalDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-gray-100">
            <label className="block text-xs font-bold text-gray-700">
              Measurable Key Results (KRs)
            </label>
            <Input
              label="Key Result 1 (Required)"
              placeholder="e.g. Complete 100% of vendor penetration audit tests"
              value={kr1Title}
              onChange={(e) => setKr1Title(e.target.value)}
              required
            />
            <Input
              label="Key Result 2 (Optional)"
              placeholder="e.g. Train 50 employees on security awareness"
              value={kr2Title}
              onChange={(e) => setKr2Title(e.target.value)}
            />
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setIsAddGoalModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Objective
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Submit Appraisal Review */}
      {selectedReviewForRating && (
        <Modal
          isOpen={!!selectedReviewForRating}
          onClose={() => setSelectedReviewForRating(null)}
          title={`Appraisal Evaluation: ${selectedReviewForRating.employeeName}`}
          size="md"
        >
          <form onSubmit={handleRatingSubmit} className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-1">
              <div>
                <span className="text-gray-500">Employee: </span>
                <span className="font-bold text-gray-900">{selectedReviewForRating.employeeName}</span> (
                {selectedReviewForRating.employeeDesignation})
              </div>
              <div>
                <span className="text-gray-500">Department: </span>
                <span className="font-semibold text-gray-800">{selectedReviewForRating.department}</span>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-gray-500">Self Evaluation: </span>
                <span className="font-bold text-amber-600 flex items-center gap-0.5">
                  <Star className="w-3 h-3 fill-amber-400" />
                  {selectedReviewForRating.selfRating} / 5.0
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">
                Manager Rating Score (1.0 to 5.0 Stars)
              </label>
              <input
                type="number"
                step="0.1"
                min="1.0"
                max="5.0"
                value={ratingInput}
                onChange={(e) => setRatingInput(Number(e.target.value))}
                className="w-full text-xs p-2.5 border border-gray-200 rounded-lg font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1">
                Manager Performance Feedback & Next Steps
              </label>
              <textarea
                rows={4}
                value={feedbackInput}
                onChange={(e) => setFeedbackInput(e.target.value)}
                placeholder="Highlight key achievements, areas of improvement, and promotion readiness..."
                className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-hidden focus:border-gray-900"
                required
              />
            </div>

            <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
              <Button variant="outline" type="button" onClick={() => setSelectedReviewForRating(null)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Finalize Appraisal
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

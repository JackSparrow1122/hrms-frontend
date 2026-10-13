import React, { useState } from "react";
import {
  Briefcase,
  Users,
  UserPlus,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Star,
  MapPin,
  Calendar,
  Building2,
  DollarSign,
  ChevronRight,
  MoreVertical,
  Award,
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
import { cn } from "../../lib/utils";
import { Candidate, CandidateStage, JobPosting, JobType } from "../../types/hrms";

const STAGES: { key: CandidateStage; label: string; color: string }[] = [
  { key: "SOURCED", label: "Sourced", color: "bg-gray-100 text-gray-700 border-gray-300" },
  { key: "SCREENING", label: "Screening", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { key: "INTERVIEW", label: "Interview", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { key: "OFFER", label: "Offer Sent", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { key: "HIRED", label: "Hired", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
];

export function RecruitmentPage() {
  const { jobs, candidates, departments, addJob, updateJobStatus, addCandidate, updateCandidateStage } = useHrms();

  const [activeTab, setActiveTab] = useState("pipeline");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("ALL");

  // Modals
  const [isPostJobModalOpen, setIsPostJobModalOpen] = useState(false);
  const [isAddCandidateModalOpen, setIsAddCandidateModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  // New Job Form
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newJobDeptId, setNewJobDeptId] = useState(departments[0]?.id || "");
  const [newJobLocation, setNewJobLocation] = useState("Pune (Hybrid)");
  const [newJobType, setNewJobType] = useState<JobType>("FULL_TIME");
  const [newJobExperience, setNewJobExperience] = useState("3 - 6 Years");
  const [newJobSalary, setNewJobSalary] = useState("₹15,00,000 - ₹22,00,000");
  const [newJobOpenings, setNewJobOpenings] = useState(1);
  const [newJobDescription, setNewJobDescription] = useState("");

  // New Candidate Form
  const [newCandName, setNewCandName] = useState("");
  const [newCandEmail, setNewCandEmail] = useState("");
  const [newCandPhone, setNewCandPhone] = useState("");
  const [newCandJobId, setNewCandJobId] = useState(jobs[0]?.id || "");
  const [newCandCompany, setNewCandCompany] = useState("");
  const [newCandDesignation, setNewCandDesignation] = useState("");
  const [newCandExp, setNewCandExp] = useState(4);
  const [newCandCtc, setNewCandCtc] = useState(1800000);
  const [newCandNotes, setNewCandNotes] = useState("");

  // Metrics
  const activeJobs = jobs.filter((j) => j.status === "OPEN").length;
  const inInterview = candidates.filter((c) => c.stage === "INTERVIEW").length;
  const offersMade = candidates.filter((c) => c.stage === "OFFER").length;
  const hiredCount = candidates.filter((c) => c.stage === "HIRED").length;

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobTitle.trim()) return;
    const dept = departments.find((d) => d.id === newJobDeptId);
    addJob({
      title: newJobTitle.trim(),
      departmentId: newJobDeptId,
      departmentName: dept?.name || "General",
      location: newJobLocation,
      type: newJobType,
      experience: newJobExperience,
      salaryRange: newJobSalary,
      openingsCount: Number(newJobOpenings) || 1,
      status: "OPEN",
      description: newJobDescription || "Exciting role at GA-HRMS.",
      requirements: ["Strong domain expertise", "Good communication skills"],
    });
    setIsPostJobModalOpen(false);
    setNewJobTitle("");
    setNewJobDescription("");
  };

  const handleCreateCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandName.trim()) return;
    const targetJob = jobs.find((j) => j.id === newCandJobId);
    addCandidate({
      jobId: newCandJobId,
      jobTitle: targetJob?.title || "Role",
      fullName: newCandName.trim(),
      email: newCandEmail.trim() || `${newCandName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      phone: newCandPhone.trim() || "+91 98000 00000",
      currentCompany: newCandCompany || "Previous Org",
      currentDesignation: newCandDesignation || "Engineer",
      experienceYears: Number(newCandExp) || 3,
      expectedCtc: Number(newCandCtc) || 1500000,
      stage: "SOURCED",
      rating: 4.5,
      notes: newCandNotes || "Screening profile review.",
    });
    setIsAddCandidateModalOpen(false);
    setNewCandName("");
    setNewCandEmail("");
    setNewCandCompany("");
    setNewCandNotes("");
  };

  // Filtered jobs
  const filteredJobs = jobs.filter((j) => {
    const matchesQuery =
      j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.departmentName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDeptFilter === "ALL" || j.departmentId === selectedDeptFilter;
    return matchesQuery && matchesDept;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recruitment & ATS"
        subtitle="Manage end-to-end talent acquisition pipelines, job openings, and candidate evaluations."
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              onClick={() => setIsAddCandidateModalOpen(true)}
              className="gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Add Candidate
            </Button>
            <Button
              variant="primary"
              onClick={() => setIsPostJobModalOpen(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Post New Job
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Active Requisitions"
          value={activeJobs}
          trend={{ value: "+2", label: "vs last month", isPositive: true }}
          icon={<Briefcase className="w-5 h-5 text-gray-700" />}
          accentColor="neutral"
        />
        <KpiCard
          label="Total Pipeline Candidates"
          value={candidates.length}
          trend={{ value: "+12", label: "applicants", isPositive: true }}
          icon={<Users className="w-5 h-5 text-indigo-600" />}
          accentColor="indigo"
        />
        <KpiCard
          label="In Active Interviews"
          value={inInterview}
          trend={{ value: `${inInterview}`, label: "rounds pending", isPositive: true }}
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          accentColor="amber"
        />
        <KpiCard
          label="Offers & Hires (Q3)"
          value={offersMade + hiredCount}
          trend={{ value: `+${hiredCount}`, label: "joined successfully", isPositive: true }}
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          accentColor="emerald"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab("pipeline")}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px",
            activeTab === "pipeline"
              ? "border-gray-950 text-gray-950"
              : "border-transparent text-gray-500 hover:text-gray-900"
          )}
        >
          Candidate Pipeline
          <span className="text-[11px] font-bold bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">
            {candidates.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("jobs")}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px",
            activeTab === "jobs"
              ? "border-gray-950 text-gray-950"
              : "border-transparent text-gray-500 hover:text-gray-900"
          )}
        >
          Job Openings
          <span className="text-[11px] font-bold bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">
            {jobs.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Candidate Pipeline Board */}
      {activeTab === "pipeline" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Pipeline Stages
              </span>
              <span className="text-xs text-gray-400">
                • Click any card to advance stage or view resume notes
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsAddCandidateModalOpen(true)}
              className="gap-1.5 text-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Quick Add Candidate
            </Button>
          </div>

          {/* Kanban Columns Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 overflow-x-auto pb-4">
            {STAGES.map((col) => {
              const colCandidates = candidates.filter((c) => c.stage === col.key);
              return (
                <div
                  key={col.key}
                  className="bg-gray-50/80 rounded-2xl p-3 border border-gray-200/90 flex flex-col min-w-[220px]"
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-gray-200">
                    <span className="text-xs font-bold text-gray-800 tracking-wide">
                      {col.label}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${col.color}`}>
                      {colCandidates.length}
                    </span>
                  </div>

                  {/* Candidate Cards */}
                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[560px] pr-0.5">
                    {colCandidates.length === 0 ? (
                      <div className="py-8 text-center text-xs text-gray-400 italic">
                        No candidates
                      </div>
                    ) : (
                      colCandidates.map((cand) => (
                        <div
                          key={cand.id}
                          onClick={() => setSelectedCandidate(cand)}
                          className="p-3 bg-white rounded-xl border border-gray-200 hover:border-gray-950 hover:shadow-md cursor-pointer transition-all duration-150 group text-left"
                        >
                          <div className="flex items-start justify-between gap-1.5 mb-1">
                            <h4 className="text-xs font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                              {cand.fullName}
                            </h4>
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 shrink-0">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                              {cand.rating}
                            </span>
                          </div>

                          <p className="text-[11px] font-medium text-gray-600 truncate mb-1.5">
                            {cand.jobTitle}
                          </p>

                          <div className="text-[10px] text-gray-500 space-y-0.5 mb-2">
                            <div className="truncate">🏢 {cand.currentCompany || "N/A"}</div>
                            <div>⏳ {cand.experienceYears} yrs exp</div>
                          </div>

                          {/* Quick Stage Progression */}
                          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px]">
                            <span className="font-semibold text-gray-700">
                              ₹{(cand.expectedCtc / 100000).toFixed(1)}L CTC
                            </span>
                            <span className="text-indigo-600 font-semibold group-hover:underline inline-flex items-center gap-0.5">
                              Details <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Job Requisitions */}
      {activeTab === "jobs" && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle>Open Requisitions & Roles</CardTitle>
                <p className="text-xs text-text-muted mt-1">
                  Active hiring positions tracked across all business departments.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search roles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:border-gray-900 w-48"
                  />
                </div>

                <select
                  value={selectedDeptFilter}
                  onChange={(e) => setSelectedDeptFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden"
                >
                  <option value="ALL">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/80 border-y border-gray-200 text-gray-600 font-semibold">
                  <tr>
                    <th className="py-3 px-4">Role Title</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Location & Type</th>
                    <th className="py-3 px-4">Experience</th>
                    <th className="py-3 px-4">Salary Range</th>
                    <th className="py-3 px-4 text-center">Applicants</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-gray-900">
                        {job.title}
                        <div className="text-[10px] text-gray-400 font-normal">
                          Posted on {job.postedDate} • {job.openingsCount} {job.openingsCount === 1 ? "opening" : "openings"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-700">{job.departmentName}</td>
                      <td className="py-3.5 px-4 text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          {job.location}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">{job.experience}</td>
                      <td className="py-3.5 px-4 font-medium text-gray-800">{job.salaryRange}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                          {job.applicantsCount}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            job.status === "OPEN"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : job.status === "ON_HOLD"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-gray-100 text-gray-700 border-gray-200"
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {job.status === "OPEN" ? (
                            <button
                              onClick={() => updateJobStatus(job.id, "ON_HOLD")}
                              className="px-2 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-50 rounded border border-amber-200"
                            >
                              Hold
                            </button>
                          ) : (
                            <button
                              onClick={() => updateJobStatus(job.id, "OPEN")}
                              className="px-2 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 rounded border border-emerald-200"
                            >
                              Activate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MODAL: Post New Job */}
      <Modal
        isOpen={isPostJobModalOpen}
        onClose={() => setIsPostJobModalOpen(false)}
        title="Post New Job Requisition"
        size="lg"
      >
        <form onSubmit={handleCreateJob} className="space-y-4">
          <Input
            label="Job Title"
            placeholder="e.g. Senior Frontend Engineer"
            value={newJobTitle}
            onChange={(e) => setNewJobTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Department"
              value={newJobDeptId}
              onChange={(e) => setNewJobDeptId(e.target.value)}
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
            />

            <Select
              label="Employment Type"
              value={newJobType}
              onChange={(e) => setNewJobType(e.target.value as JobType)}
              options={[
                { value: "FULL_TIME", label: "Full Time" },
                { value: "PART_TIME", label: "Part Time" },
                { value: "CONTRACT", label: "Contract" },
                { value: "REMOTE", label: "Remote" },
                { value: "HYBRID", label: "Hybrid" },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Location"
              placeholder="e.g. Pune (Hybrid)"
              value={newJobLocation}
              onChange={(e) => setNewJobLocation(e.target.value)}
            />
            <Input
              label="Experience Required"
              placeholder="e.g. 4 - 7 Years"
              value={newJobExperience}
              onChange={(e) => setNewJobExperience(e.target.value)}
            />
            <Input
              label="Number of Openings"
              type="number"
              min={1}
              value={newJobOpenings}
              onChange={(e) => setNewJobOpenings(Number(e.target.value))}
            />
          </div>

          <Input
            label="Budgeted Salary Range"
            placeholder="e.g. ₹18,00,000 - ₹25,00,000"
            value={newJobSalary}
            onChange={(e) => setNewJobSalary(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Job Description & Key Responsibilities
            </label>
            <textarea
              rows={3}
              placeholder="Describe core duties and expected qualifications..."
              value={newJobDescription}
              onChange={(e) => setNewJobDescription(e.target.value)}
              className="w-full text-xs p-2.5 border border-gray-200 rounded-lg focus:outline-hidden focus:border-gray-900"
            />
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setIsPostJobModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Publish Requisition
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Add Candidate */}
      <Modal
        isOpen={isAddCandidateModalOpen}
        onClose={() => setIsAddCandidateModalOpen(false)}
        title="Add Candidate to Pipeline"
        size="md"
      >
        <form onSubmit={handleCreateCandidate} className="space-y-4">
          <Input
            label="Candidate Full Name"
            placeholder="e.g. Aarav Mehta"
            value={newCandName}
            onChange={(e) => setNewCandName(e.target.value)}
            required
          />

          <Select
            label="Position Applied For"
            value={newCandJobId}
            onChange={(e) => setNewCandJobId(e.target.value)}
            options={jobs.map((j) => ({ value: j.id, label: `${j.title} (${j.departmentName})` }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email"
              type="email"
              placeholder="aarav@example.com"
              value={newCandEmail}
              onChange={(e) => setNewCandEmail(e.target.value)}
            />
            <Input
              label="Phone"
              placeholder="+91 98..."
              value={newCandPhone}
              onChange={(e) => setNewCandPhone(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Current Company"
              placeholder="e.g. Infosys / TCS"
              value={newCandCompany}
              onChange={(e) => setNewCandCompany(e.target.value)}
            />
            <Input
              label="Current Title"
              placeholder="e.g. Senior Software Engineer"
              value={newCandDesignation}
              onChange={(e) => setNewCandDesignation(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Total Experience (Years)"
              type="number"
              step="0.1"
              value={newCandExp}
              onChange={(e) => setNewCandExp(Number(e.target.value))}
            />
            <Input
              label="Expected Annual CTC (₹)"
              type="number"
              step="50000"
              value={newCandCtc}
              onChange={(e) => setNewCandCtc(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Initial Notes / Screener Comments
            </label>
            <textarea
              rows={2}
              placeholder="Interview feedback or resume highlights..."
              value={newCandNotes}
              onChange={(e) => setNewCandNotes(e.target.value)}
              className="w-full text-xs p-2 border border-gray-200 rounded-lg focus:outline-hidden focus:border-gray-900"
            />
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => setIsAddCandidateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Add to Pipeline
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Candidate Detail & Stage Advance */}
      {selectedCandidate && (
        <Modal
          isOpen={!!selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          title={`Candidate Profile: ${selectedCandidate.fullName}`}
          size="md"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{selectedCandidate.fullName}</h4>
                  <p className="text-xs text-indigo-600 font-medium">{selectedCandidate.jobTitle}</p>
                </div>
                <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  {selectedCandidate.rating} / 5.0
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-2 border-t border-gray-200">
                <div>🏢 Org: <span className="font-semibold text-gray-900">{selectedCandidate.currentCompany || "N/A"}</span></div>
                <div>⏳ Exp: <span className="font-semibold text-gray-900">{selectedCandidate.experienceYears} Years</span></div>
                <div>✉️ {selectedCandidate.email}</div>
                <div>📞 {selectedCandidate.phone}</div>
                <div className="col-span-2">
                  💰 Expected CTC: <span className="font-bold text-gray-900">₹{(selectedCandidate.expectedCtc / 100000).toFixed(1)} Lakhs</span>
                </div>
              </div>
            </div>

            {selectedCandidate.notes && (
              <div>
                <label className="text-xs font-bold text-gray-700">Interview & Evaluation Notes:</label>
                <p className="text-xs text-gray-600 p-2.5 bg-gray-50 rounded-lg mt-1 border border-gray-200 italic">
                  "{selectedCandidate.notes}"
                </p>
              </div>
            )}

            {/* Advance Stage Control */}
            <div>
              <label className="text-xs font-bold text-gray-800 block mb-1.5">
                Current Pipeline Stage:
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {STAGES.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => {
                      updateCandidateStage(selectedCandidate.id, s.key);
                      setSelectedCandidate({ ...selectedCandidate, stage: s.key });
                    }}
                    className={`py-1.5 px-1 rounded text-[11px] font-bold border transition-all ${
                      selectedCandidate.stage === s.key
                        ? "bg-gray-950 text-white border-gray-950 shadow-sm"
                        : "bg-white hover:bg-gray-100 text-gray-700 border-gray-200"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200 flex justify-end">
              <Button variant="primary" onClick={() => setSelectedCandidate(null)}>
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

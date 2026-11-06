import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Building2,
  MapPin,
  FileText,
  Receipt,
  Download,
  Upload,
  Edit,
  Loader2,
} from "lucide-react";
import { useHrms } from "../../lib/hrmsContext";
import { useAuth } from "../../lib/authContext"; // 👈 IMPORT KIYA
import { leaveApi } from "../../lib/api"; // 👈 BACKEND API
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Avatar } from "../../components/ui/Avatar";
import { Tabs, TabList, TabTrigger, TabContent } from "../../components/ui/Tabs";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { formatDate, formatINR, formatTime } from "../../lib/utils";
import { useToast } from "../../lib/toastContext";
export function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth(); // 👈 LOGIN USER

  const {
    employees,
    departments,
    designations,
    branches,
    shifts,
    attendance,
    leaveTypes,
    salaryStructures,
    payroll,
    documents,
    auditLogs,
    updateEmployee,
    uploadDocument,
  } = useHrms();

  // 👈 FIX: Agar URL me ID hai (e.g. /people/employees/12) toh wo lo,
  // warna Login User ki ID lo (e.g. /profile)
  const targetId = id || (user as any)?.employeeId || (user as any)?.id;
  const userEmail = (user as any)?.email;

  // ID se match karo, agar na mile to Email se match karo
  const employee =

    employees.find((e) => String(e.id) === String(targetId)) ||
    employees.find((e) => e.email?.toLowerCase() === userEmail?.toLowerCase());

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editPhone, setEditPhone] = useState(employee?.phone || "");
  const [editEmail, setEditEmail] = useState(employee?.email || "");
  const [editCtc, setEditCtc] = useState(employee?.monthlyCtc || 100000);

  // Backend Leave Balances
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [isLoadingLeaves, setIsLoadingLeaves] = useState(false);

  useEffect(() => {
    if (!employee?.id) return;

    const fetchLeavesAndBalances = async () => {
      setIsLoadingLeaves(true);
      try {
        const balances = await leaveApi.getBalances(Number(employee.id));
        setLeaveBalances(balances || []);
      } catch {
        // ignore
      } finally {
        setIsLoadingLeaves(false);
      }
    };

    fetchLeavesAndBalances();
  }, [employee?.id]);

  if (!employee) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-text-muted">Employee profile not found.</p>
        <Button onClick={() => navigate("/dashboard")} className="mt-4">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const dept = departments.find((d) => d.id === employee.departmentId);
  const desig = designations.find((d) => d.id === employee.designationId);
  const branch = branches.find((b) => b.id === employee.branchId);
  const shift = shifts.find((s) => s.id === employee.shiftId);
  const manager = employee.managerId
    ? employees.find((e) => String(e.id) === String(employee.managerId))
    : null;
  const salary = salaryStructures.find((s) => s.employeeId === employee.id);

  const empAttendance = attendance.filter((a) => a.employeeId === employee.id);
  const empDocs = documents.filter((d) => d.employeeId === employee.id);
  const empLogs = auditLogs.filter(
    (l) => l.details.includes(employee.id) || l.userId === employee.id
  );

  // Actual Attendance Calculations
  const presentDays = empAttendance.filter((a) => a.status === "PRESENT").length;
  const lateDays = empAttendance.filter((a) => a.status === "LATE").length;
  const leaveDays = empAttendance.filter((a) => a.status === "LEAVE").length;

  // Actual Salary Calculations
  const basic = salary?.basic || (employee.monthlyCtc * 0.5);
  const hra = salary?.hra || (employee.monthlyCtc * 0.25);
  const specialAllowance = salary?.specialAllowance || (employee.monthlyCtc * 0.25);

  const handleSaveProfile = () => {
    updateEmployee(employee.id, {
      phone: editPhone,
      email: editEmail,
      monthlyCtc: Number(editCtc),
      annualCtc: Number(editCtc) * 12,
    });
    setIsEditOpen(false);
    toast.success("Profile updated successfully");
  };

  return (
    <div className="space-y-6">
      <div>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-950 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      {/* Profile Header Banner */}
      <div className="bg-white rounded-card border border-surface-border shadow-card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <Avatar
              src={employee.avatar}
              name={`${employee.firstName} ${employee.lastName}`}
              size="xl"
            />
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-950 tracking-tight">
                  {employee.firstName} {employee.lastName}
                </h1>
                <Badge variant="neutral" size="sm">
                  {employee.employeeCode}
                </Badge>
                <Badge variant={employee.status === "ACTIVE" ? "success" : "warning"} size="sm" dot>
                  {employee.status}
                </Badge>
              </div>

              <p className="text-sm font-semibold text-text-primary">
                {desig?.title || "Staff Member"}
              </p>

              <div className="flex items-center gap-4 text-xs text-text-secondary flex-wrap pt-1">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-text-muted" />
                  {dept?.name || "General"}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-text-muted" />
                  {branch ? `${branch.name} (${branch.city})` : "Corporate HQ"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-text-muted" />
                  Joined {formatDate(employee.joiningDate)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              onClick={() => {
                setEditPhone(employee.phone);
                setEditEmail(employee.email);
                setEditCtc(employee.monthlyCtc);
                setIsEditOpen(true);
              }}
              variant="outline"
              size="md"
              leftIcon={<Edit className="w-4 h-4" />}
            >
              Edit Profile
            </Button>
            <Button
              onClick={() => navigate(`/payroll/payslips?emp=${employee.id}`)}
              variant="primary"
              size="md"
              leftIcon={<Receipt className="w-4 h-4" />}
            >
              Payslips
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabList className="bg-white px-4 rounded-t-card border border-b-0 border-surface-border">
          <TabTrigger value="overview">Overview</TabTrigger>
          <TabTrigger value="personal">Personal</TabTrigger>
          <TabTrigger value="employment">Employment</TabTrigger>
          <TabTrigger value="attendance" badge={empAttendance.length}>Attendance</TabTrigger>
          <TabTrigger value="leave" badge={leaveBalances.length}>Leave</TabTrigger>
          <TabTrigger value="payroll">Payroll</TabTrigger>
          <TabTrigger value="documents" badge={empDocs.length}>Documents</TabTrigger>
          <TabTrigger value="activity">Activity</TabTrigger>
        </TabList>

        <div className="bg-white rounded-b-card border border-surface-border p-6 shadow-card">

          {/* TAB 1: OVERVIEW */}
          <TabContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Contact</h4>
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-text-muted">Email:</span>
                      <p className="font-semibold text-text-primary mt-0.5">{employee.email}</p>
                    </div>
                    <div>
                      <span className="text-text-muted">Phone:</span>
                      <p className="font-semibold text-text-primary mt-0.5">{employee.phone}</p>
                    </div>
                    <div>
                      <span className="text-text-muted">Manager:</span>
                      <p className="font-semibold text-gray-950 mt-0.5">
                        {manager ? `${manager.firstName} ${manager.lastName}` : "Executive Board"}
                      </p>
                    </div>
                    <div>
                      <span className="text-text-muted">Shift:</span>
                      <p className="font-semibold text-text-primary mt-0.5">
                        {shift?.name || "General"} ({shift?.startTime || "09:00"} - {shift?.endTime || "18:00"})
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-surface-border">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Statutory ID</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-muted">PAN:</span>
                      <span className="font-mono font-semibold">{employee.pan || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Aadhaar:</span>
                      <span className="font-mono font-semibold">{employee.aadhaar || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">UAN:</span>
                      <span className="font-mono font-semibold">{employee.uan || "—"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Attendance</h4>
                  <div className="p-4 bg-surface-subtle/50 rounded-xl border border-surface-border space-y-2.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-text-secondary">Present:</span>
                      <span className="font-bold text-emerald-600">{presentDays} Days</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-secondary">Late:</span>
                      <span className="font-bold text-amber-600">{lateDays} Times</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-text-secondary">On Leave:</span>
                      <span className="font-bold text-indigo-600">{leaveDays} Days</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Leave Balance</h4>
                  {isLoadingLeaves ? (
                    <div className="flex items-center gap-2 text-xs text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
                  ) : leaveBalances.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {leaveBalances.slice(0, 4).map((bal) => (
                        <div key={bal.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                          <span className="text-[11px] text-gray-600 font-semibold uppercase">{bal.leaveTypeCode}</span>
                          <p className="text-lg font-bold text-gray-900 mt-1">
                            {bal.remainingCount} <span className="text-xs font-normal text-gray-500">/ {bal.totalAllowance}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No leave balances configured.</p>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3">Salary Summary</h4>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                    <div>
                      <span className="text-[11px] text-gray-500 font-medium">Monthly CTC</span>
                      <p className="text-xl font-bold text-gray-950">{formatINR(employee.monthlyCtc)}</p>
                    </div>
                    <div className="flex justify-between text-xs pt-2 border-t border-gray-200">
                      <span className="text-text-secondary">Annual CTC:</span>
                      <span className="font-semibold text-text-primary">{formatINR(employee.annualCtc)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-text-secondary">Bank:</span>
                      <span className="font-semibold text-text-primary">{employee.bankName || "—"}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-text-secondary">Account:</span>
                      <span className="font-mono text-text-primary">{employee.accountNumber || "—"}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabContent>

          {/* TAB 2: PERSONAL */}
          <TabContent value="personal">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs">
              <div>
                <span className="text-text-muted">First Name</span>
                <p className="text-sm font-semibold text-text-primary mt-1">{employee.firstName}</p>
              </div>
              <div>
                <span className="text-text-muted">Last Name</span>
                <p className="text-sm font-semibold text-text-primary mt-1">{employee.lastName}</p>
              </div>
              <div>
                <span className="text-text-muted">Gender</span>
                <p className="text-sm font-semibold text-text-primary mt-1">{employee.gender || "—"}</p>
              </div>
              <div>
                <span className="text-text-muted">Date of Birth</span>
                <p className="text-sm font-semibold text-text-primary mt-1">{employee.dob ? formatDate(employee.dob) : "—"}</p>
              </div>
              <div>
                <span className="text-text-muted">Personal Email</span>
                <p className="text-sm font-semibold text-text-primary mt-1">{employee.email}</p>
              </div>
              <div>
                <span className="text-text-muted">Contact Phone</span>
                <p className="text-sm font-semibold text-text-primary mt-1">{employee.phone}</p>
              </div>
            </div>
          </TabContent>

          {/* TAB 3: EMPLOYMENT */}
          <TabContent value="employment">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs">
              <div>
                <span className="text-text-muted">Employee Code</span>
                <p className="text-sm font-semibold text-text-primary mt-1">{employee.employeeCode}</p>
              </div>
              <div>
                <span className="text-text-muted">Joining Date</span>
                <p className="text-sm font-semibold text-text-primary mt-1">{formatDate(employee.joiningDate)}</p>
              </div>
              <div>
                <span className="text-text-muted">Department</span>
                <p className="text-sm font-semibold text-text-primary mt-1">{dept?.name || "—"}</p>
              </div>
              <div>
                <span className="text-text-muted">Designation</span>
                <p className="text-sm font-semibold text-text-primary mt-1">{desig?.title || "—"}</p>
              </div>
              <div>
                <span className="text-text-muted">Employment Type</span>
                <p className="text-sm font-semibold text-text-primary mt-1">{employee.employmentType || "—"}</p>
              </div>
              <div>
                <span className="text-text-muted">Branch Office</span>
                <p className="text-sm font-semibold text-text-primary mt-1">{branch?.name || "—"}</p>
              </div>
            </div>
          </TabContent>

          {/* TAB 4: ATTENDANCE */}
          <TabContent value="attendance">
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-gray-950">Attendance Records</h4>
              {empAttendance.length === 0 ? (
                <p className="text-xs text-text-muted">No attendance records found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-surface-border font-semibold text-text-secondary">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">First In</th>
                        <th className="py-2.5 px-3">Last Out</th>
                        <th className="py-2.5 px-3">Hours</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {empAttendance.map((a) => (
                        <tr key={a.id}>
                          <td className="py-2.5 px-3 font-medium">{formatDate(a.date)}</td>
                          <td className="py-2.5 px-3">{formatTime(a.firstIn)}</td>
                          <td className="py-2.5 px-3">{formatTime(a.lastOut)}</td>
                          <td className="py-2.5 px-3 font-semibold">{a.workingHours} hrs</td>
                          <td className="py-2.5 px-3">
                            <Badge variant={a.status === "PRESENT" ? "success" : a.status === "LATE" ? "warning" : "neutral"} size="sm">
                              {a.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabContent>

          {/* TAB 5: LEAVE */}
          <TabContent value="leave">
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-gray-950">Leave Balances & History</h4>
              {leaveBalances.length === 0 ? (
                <p className="text-xs text-text-muted">No leave data available.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  {leaveBalances.map((bal) => (
                    <div key={bal.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <span className="text-[11px] text-gray-600 font-semibold uppercase">{bal.leaveTypeCode}</span>
                      <p className="text-lg font-bold text-gray-900 mt-1">
                        {bal.remainingCount} <span className="text-xs font-normal text-gray-500">/ {bal.totalAllowance}</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabContent>

          {/* TAB 6: PAYROLL */}
          <TabContent value="payroll">
            <div className="space-y-6">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-500 font-medium">Monthly Compensation Structure</span>
                  <p className="text-2xl font-bold text-gray-950 mt-0.5">{formatINR(employee.monthlyCtc)} / month</p>
                </div>
                <Button onClick={() => navigate(`/payroll/payslips?emp=${employee.id}`)} variant="primary" size="sm">
                  View All Payslips
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="p-4 border border-surface-border rounded-xl space-y-2.5">
                  <h5 className="font-bold text-emerald-700 uppercase tracking-wider text-[11px]">Earnings Breakdown</h5>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Basic Salary:</span>
                    <span className="font-semibold text-text-primary">{formatINR(basic)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">HRA:</span>
                    <span className="font-semibold text-text-primary">{formatINR(hra)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Special Allowance:</span>
                    <span className="font-semibold text-text-primary">{formatINR(specialAllowance)}</span>
                  </div>
                </div>

                <div className="p-4 border border-surface-border rounded-xl space-y-2.5">
                  <h5 className="font-bold text-rose-700 uppercase tracking-wider text-[11px]">Statutory Deductions</h5>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Employee PF (12%):</span>
                    <span className="font-semibold text-rose-600">{formatINR(salary?.pfEmployee || 1800)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Professional Tax:</span>
                    <span className="font-semibold text-rose-600">{formatINR(salary?.professionalTax || 200)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">TDS:</span>
                    <span className="font-semibold text-rose-600">{formatINR(salary?.tdsMonthly || 8500)}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabContent>

          {/* TAB 7: DOCUMENTS */}
          <TabContent value="documents">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-950">Employee Document Vault</h4>
                <Button
                  onClick={() => {
                    uploadDocument({
                      employeeId: employee.id,
                      title: "PAN Card Verified Copy",
                      category: "IDENTITY",
                      fileSize: "640 KB",
                      fileType: "PDF",
                    });
                  }}
                  variant="outline"
                  size="sm"
                  leftIcon={<Upload className="w-3.5 h-3.5" />}
                >
                  Upload New Doc
                </Button>
              </div>
              {empDocs.length === 0 ? (
                <p className="text-xs text-text-muted">No documents uploaded yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {empDocs.map((doc) => (
                    <div key={doc.id} className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-700" />
                        <div>
                          <p className="text-xs font-semibold text-text-primary">{doc.title}</p>
                          <p className="text-[10px] text-text-muted">{doc.category} • {doc.fileSize} • {formatDate(doc.uploadDate)}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Download className="w-4 h-4 text-gray-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabContent>

          {/* TAB 8: ACTIVITY */}
          <TabContent value="activity">
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-gray-950">Audit Trail</h4>
              {empLogs.length === 0 ? (
                <p className="text-xs text-text-muted">No audit logs recorded for this employee.</p>
              ) : (
                empLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-gray-50 rounded-lg text-xs flex justify-between">
                    <div>
                      <span className="font-semibold text-text-primary">{log.action}</span>
                      <p className="text-text-secondary mt-0.5">{log.details}</p>
                    </div>
                    <span className="text-[11px] text-text-muted shrink-0">{new Date(log.timestamp).toLocaleDateString()}</span>
                  </div>
                ))
              )}
            </div>
          </TabContent>
        </div>
      </Tabs>

      {/* Edit Modal */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Edit Profile — ${employee.firstName}`}>
        <div className="space-y-4">
          <Input label="Work Email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
          <Input label="Phone Number" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
          <Input label="Monthly CTC (INR)" type="number" value={editCtc} onChange={(e) => setEditCtc(Number(e.target.value))} />
          <div className="pt-4 flex justify-end gap-2.5">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSaveProfile}>Save Changes</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
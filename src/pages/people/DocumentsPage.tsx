import React, { useState } from "react";
import {
  FileText,
  Upload,
  Download,
  Search,
  Filter,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { useHrms } from "../../lib/hrmsContext";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { formatDate } from "../../lib/utils";

import { useAuth } from "../../lib/authContext";

export function DocumentsPage() {
  const { documents, employees, uploadDocument } = useHrms();
  const { user } = useAuth();
  const isHrOrAdmin = user?.role === "HR_ADMIN" || user?.role === "TENANT_ADMIN" || user?.role === "SUPER_ADMIN";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Form state
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || "EMP-1001");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<any>("IDENTITY");
  const [fileType, setFileType] = useState("PDF");

  const categories = ["ALL", "IDENTITY", "ACADEMIC", "EXPERIENCE", "COMPANY_POLICY"];

  const filteredDocs = documents.filter((doc) => {
    // If not HR Admin or Super Admin, only view employee's own documents or company policies
    if (!isHrOrAdmin && user?.employeeId && String(doc.employeeId) !== String(user.employeeId) && doc.category !== "COMPANY_POLICY") {
      return false;
    }
    const matchesSearch =
      searchQuery === "" ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === "ALL" || doc.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleUpload = () => {
    if (!title) return;
    uploadDocument({
      employeeId,
      title,
      category,
      fileSize: "1.2 MB",
      fileType,
    });
    setTitle("");
    setIsUploadOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-950 tracking-tight">
            Employee Document Vault
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Encrypted storage for statutory proofs, academic certificates, and offer letters.
          </p>
        </div>

        <Button
          onClick={() => setIsUploadOpen(true)}
          variant="primary"
          size="md"
          leftIcon={<Upload className="w-4 h-4" />}
        >
          Upload Document
        </Button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-card border border-surface-border shadow-card flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search document title..."
            className="w-full h-10 pl-9 pr-4 text-sm bg-surface-bg border border-surface-border rounded-input text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-950/5 focus:border-gray-950 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? "bg-gray-950 text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {cat.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Document Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filteredDocs.map((doc) => {
          const emp = employees.find((e) => e.id === doc.employeeId);
          return (
            <div
              key={doc.id}
              className="bg-white p-5 rounded-card border border-surface-border shadow-card hover:border-gray-300 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-gray-700" />
                  </div>
                  <Badge variant="neutral" size="sm">
                    {doc.fileType}
                  </Badge>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-text-primary line-clamp-1">
                    {doc.title}
                  </h4>
                  <p className="text-xs text-gray-950 font-medium mt-0.5">
                    {emp ? `${emp.firstName} ${emp.lastName} (${emp.employeeCode})` : "General"}
                  </p>
                  <p className="text-[11px] text-text-muted mt-1">
                    Category: {doc.category} • {doc.fileSize}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-surface-border flex items-center justify-between text-xs">
                <span className="text-text-muted">{formatDate(doc.uploadDate)}</span>
                <Button
                  onClick={() => alert(`Simulated download of ${doc.title} (${doc.fileSize})`)}
                  variant="outline"
                  size="sm"
                  leftIcon={<Download className="w-3.5 h-3.5" />}
                >
                  Download
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload Modal */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Upload Employee Document"
      >
        <div className="space-y-4">
          <Select
            label="Select Employee"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            options={employees.map((e) => ({
              label: `${e.firstName} ${e.lastName} (${e.employeeCode})`,
              value: e.id,
            }))}
          />
          <Input
            label="Document Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Master Degree Marksheet"
            required
          />
          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={[
              { label: "Identity Proof (Aadhaar / PAN)", value: "IDENTITY" },
              { label: "Academic Record", value: "ACADEMIC" },
              { label: "Experience / Relieving", value: "EXPERIENCE" },
              { label: "Company Policy / Offer", value: "COMPANY_POLICY" },
            ]}
          />
          <Select
            label="File Type"
            value={fileType}
            onChange={(e) => setFileType(e.target.value)}
            options={[
              { label: "PDF Document", value: "PDF" },
              { label: "Scanned Image (PNG/JPEG)", value: "IMAGE" },
            ]}
          />

          <div className="pt-4 flex justify-end gap-2.5">
            <Button variant="outline" onClick={() => setIsUploadOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUpload}>
              Save Document
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

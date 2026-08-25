import { motion } from "framer-motion";
import {
  AlertCircle,
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Lock,
  Paperclip,
  Plus,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { mdReportsCache, reportsCache, plansCache, useSheetCache } from "../lib/dataCache";
import { masterRepo, mdReportsRepo } from "../lib/repo";
import { uploadFile } from "../lib/upload";
import type { MdReportEntry, MdWorkCategory } from "../lib/types";
import { formatDisplayDate, formatTimestampIndian, genId, todayISO } from "../lib/utils";
import { Badge, Button, Card, EmptyState, Input, Label, Spinner } from "../components/ui";

const MD_REPORT_PASSWORD = "9189";

const CATEGORIES: { key: MdWorkCategory; label: string; tone: "teal" | "amber" | "slate" }[] = [
  { key: "Completed", label: "Completed work", tone: "teal" },
  { key: "Pending", label: "Pending work", tone: "amber" },
  { key: "Nextday Priority", label: "Nextday Priority work", tone: "slate" },
];

const selectClass =
  "field-surface rounded-xl border dark:border-ink-600 border-white/20 dark:bg-ink-900/60 px-3 py-2.5 text-sm outline-none focus:border-teal-400";

function dateOf(timestamp: string): string {
  if (!timestamp) return "";
  const match = timestamp.match(/^(\d{2})-(\d{2})-(\d{4})/);
  if (match) {
    // We now expect and store DD-MM-YYYY
    const [, day, month, year] = match;
    return `${year}-${month}-${day}`;
  }
  return timestamp.slice(0, 10);
}

export default function MDReport() {
  const [viewMode, setViewMode] = useState<"selection" | "ea" | "employee">("selection");
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [wrongAttempt, setWrongAttempt] = useState(false);
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);

  const { data: mdReports, error: mdReportsError } = useSheetCache(mdReportsCache);

  const today = todayISO();
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [category, setCategory] = useState<MdWorkCategory>("Completed");
  const [workDescription, setWorkDescription] = useState("");
  const [workingPerson, setWorkingPerson] = useState("");
  const [remarks, setRemarks] = useState("");
  const [newTaskFileUrl, setNewTaskFileUrl] = useState("");
  const [uploadingNewTaskFile, setUploadingNewTaskFile] = useState(false);
  const [newTaskFileInputKey, setNewTaskFileInputKey] = useState(0);
  const [showForm, setShowForm] = useState(false);

  const [completingEntry, setCompletingEntry] = useState<MdReportEntry | null>(null);
  const [completedDate, setCompletedDate] = useState(todayISO());
  const [completedFileUrl, setCompletedFileUrl] = useState("");
  const [completedRemark, setCompletedRemark] = useState("");

  const [editingEntry, setEditingEntry] = useState<MdReportEntry | null>(null);
  const [editTaskDesc, setEditTaskDesc] = useState("");
  const [editWorkPerson, setEditWorkPerson] = useState("");
  const [editCategory, setEditCategory] = useState<MdWorkCategory>("Pending");
  const [editRemarks, setEditRemarks] = useState("");
  const [editAttachmentUrl, setEditAttachmentUrl] = useState("");
  const [uploadingEditFile, setUploadingEditFile] = useState(false);

  const [updatingEntry, setUpdatingEntry] = useState<MdReportEntry | null>(null);
  const [updateCompletedDate, setUpdateCompletedDate] = useState(todayISO());
  const [updateFileUrl, setUpdateFileUrl] = useState("");
  const [updateRemark, setUpdateRemark] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);

  const [personNames, setPersonNames] = useState<string[] | null>(() => {
    try {
      const cached = localStorage.getItem("person_names_cache");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [personNamesError, setPersonNamesError] = useState<string | null>(null);
  const [addingPerson, setAddingPerson] = useState(false);

  const handleAddNewPerson = async (name: string, setter: (v: string) => void) => {
    try {
      setAddingPerson(true);
      await masterRepo.addPersonName(name.trim());
      setPersonNames((prev) => {
        const arr = prev ? [...prev, name.trim()] : [name.trim()];
        return [...new Set(arr)].sort();
      });
      setter(name.trim());
      toast.success("New person added to Master table");
    } catch (err: any) {
      toast.error(err.message || "Failed to add new person");
    } finally {
      setAddingPerson(false);
    }
  };

  const [statusFilter, setStatusFilter] = useState<string>("All");

  const filteredEntries = useMemo(() => {
    const list = mdReports ?? [];
    if (statusFilter === "All") return list;
    return list.filter((r) => r.category === statusFilter);
  }, [mdReports, statusFilter]);

  useEffect(() => {
    if (!unlocked) return;
    masterRepo
      .personNames()
      .then((names) => {
        setPersonNames(names);
        try {
          localStorage.setItem("person_names_cache", JSON.stringify(names));
        } catch {}
      })
      .catch((e) => setPersonNamesError(e instanceof Error ? e.message : "Failed to load person list."));
  }, [unlocked]);



  const entriesForSelectedDate = useMemo(
    () =>
      (mdReports ?? []).filter((r) => {
        const d = dateOf(r.timestamp);
        if (d >= startDate && d <= endDate) return true;
        if (r.category === "Completed" && r.completedDate) {
          const cd = dateOf(r.completedDate);
          if (cd >= startDate && cd <= endDate) return true;
        }
        return false;
      }),
    [mdReports, startDate, endDate],
  );

  const daysLogged = useMemo(() => new Set((mdReports ?? []).map((r) => dateOf(r.timestamp))).size, [mdReports]);



  function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (password === MD_REPORT_PASSWORD) {
      setUnlocked(true);
      setWrongAttempt(false);
    } else {
      setWrongAttempt(true);
      setPassword("");
      toast.error("Incorrect password");
    }
  }

  async function handleAddEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!workDescription.trim()) {
      toast.error("Please add a work description.");
      return;
    }
    if (!workingPerson) {
      toast.error("Please select a working person.");
      return;
    }

    const newEntry: Omit<MdReportEntry, "_id"> = {
      entryId: genId("mdw"),
      // Only the date part is used for filtering/display, so a fixed time-of-day
      // keeps this valid even when selectedDate isn't today (backdated entries).
      timestamp: `${endDate}T12:00:00.000Z`,
      category,
      workDescription: workDescription.trim(),
      workingPerson,
      remarks: remarks.trim(),
      attachmentUrl: newTaskFileUrl,
    };

    mdReportsCache.mutate((cur) => [...(cur ?? []), { ...newEntry, _id: "__optimistic__" }]);
    setWorkDescription("");
    setRemarks("");
    setNewTaskFileUrl("");
    setNewTaskFileInputKey((k) => k + 1);
    setShowForm(false);

    mdReportsRepo
      .create(newEntry)
      .then((created) => {
        mdReportsCache.mutate((cur) => (cur ?? []).map((x) => (x._id === "__optimistic__" ? created : x)));
        toast.success("Task added");
      })
      .catch((err) => {
        mdReportsCache.mutate((cur) => (cur ?? []).filter((x) => x._id !== "__optimistic__"));
        toast.error(err instanceof Error ? err.message : "Could not add task");
      });
  }

  function handleMarkComplete(entry: MdReportEntry) {
    setCompletingEntry(entry);
    setCompletedDate(todayISO());
    setCompletedFileUrl("");
    setCompletedRemark("");
  }

  async function handleSubmitCompletion(e: React.FormEvent) {
    e.preventDefault();
    if (!completingEntry) return;

    mdReportsCache.mutate((cur) =>
      (cur ?? []).map((x) =>
        x._id === completingEntry._id
          ? { ...x, category: "Completed", completedDate, completedFileUrl, completedRemark }
          : x,
      ),
    );
    setCompletingEntry(null);

    mdReportsRepo
      .updateCompletion(completingEntry._id, completedDate, completedFileUrl, completedRemark)
      .then(() => {
        toast.success("Task marked as completed");
      })
      .catch((err) => {
        mdReportsCache.refresh(true);
        toast.error(err instanceof Error ? err.message : "Could not update task");
      });
  }

  function handleEditEntry(entry: MdReportEntry) {
    setEditingEntry(entry);
    setEditTaskDesc(entry.workDescription);
    setEditWorkPerson(entry.workingPerson);
    setEditCategory(entry.category);
    setEditRemarks(entry.remarks);
    setEditAttachmentUrl(entry.attachmentUrl || "");
  }

  async function handleSubmitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingEntry || !editTaskDesc.trim()) {
      toast.error("Please fill in the required fields");
      return;
    }

    const isCompletingNow = editCategory === "Completed" && editingEntry.category !== "Completed";
    const newCompletedDate = isCompletingNow ? todayISO() : editingEntry.completedDate;

    mdReportsCache.mutate((cur) =>
      (cur ?? []).map((x) =>
        x._id === editingEntry._id
          ? { ...x, workDescription: editTaskDesc, workingPerson: editWorkPerson, category: editCategory, remarks: editRemarks, attachmentUrl: editAttachmentUrl, completedDate: newCompletedDate }
          : x,
      ),
    );
    setEditingEntry(null);

    mdReportsRepo
      .updateEntry(editingEntry._id, {
        workDescription: editTaskDesc,
        workingPerson: editWorkPerson,
        category: editCategory,
        remarks: editRemarks,
        attachmentUrl: editAttachmentUrl,
        ...(isCompletingNow && { completedDate: newCompletedDate }),
      })
      .then(() => {
        toast.success("Entry updated successfully");
      })
      .catch((err) => {
        mdReportsCache.refresh(true);
        toast.error(err instanceof Error ? err.message : "Could not update entry");
      });
  }

  async function handleDeleteEntry(entry: MdReportEntry) {
    if (!confirm("Are you sure you want to delete this entry?")) return;

    mdReportsCache.mutate((cur) => (cur ?? []).filter((x) => x._id !== entry._id));
    
    mdReportsRepo
      .deleteEntry(entry._id)
      .then(() => {
        toast.success("Entry deleted successfully");
      })
      .catch((err) => {
        mdReportsCache.refresh(true);
        toast.error(err instanceof Error ? err.message : "Could not delete entry");
      });
  }

  function handleUpdateEntry(entry: MdReportEntry) {
    setUpdatingEntry(entry);
    setUpdateCompletedDate(todayISO());
    setUpdateFileUrl("");
    setUpdateRemark("");
  }

  function makeFileUploadHandler(setUrl: (url: string) => void, setUploading: (v: boolean) => void) {
    return async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const result = event.target?.result;
          if (typeof result !== "string") {
            toast.error("Could not read file");
            setUploading(false);
            return;
          }
          const base64Data = result.split(",")[1];
          if (!base64Data) {
            toast.error("Could not read file");
            setUploading(false);
            return;
          }
          try {
            const fileUrl = await uploadFile(base64Data, file.name, file.type);
            setUrl(fileUrl);
            toast.success("File uploaded successfully");
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "File upload failed");
          } finally {
            setUploading(false);
          }
        };
        reader.readAsDataURL(file);
      } catch {
        toast.error("Could not process file");
        setUploading(false);
      }
    };
  }

  const handleNewTaskFileUpload = makeFileUploadHandler(setNewTaskFileUrl, setUploadingNewTaskFile);
  const handleUpdateFileUpload = makeFileUploadHandler(setUpdateFileUrl, setUploadingFile);
  const handleEditFileUpload = makeFileUploadHandler(setEditAttachmentUrl, setUploadingEditFile);

  async function handleSubmitUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!updatingEntry) return;

    mdReportsCache.mutate((cur) =>
      (cur ?? []).map((x) =>
        x._id === updatingEntry._id
          ? { ...x, category: "Completed", completedDate: updateCompletedDate, completedFileUrl: updateFileUrl, completedRemark: updateRemark }
          : x,
      ),
    );
    setUpdatingEntry(null);

    mdReportsRepo
      .updateCompletion(updatingEntry._id, updateCompletedDate, updateFileUrl, updateRemark)
      .then(() => {
        toast.success("Entry updated successfully");
      })
      .catch((err) => {
        mdReportsCache.refresh(true);
        toast.error(err instanceof Error ? err.message : "Could not update entry");
      });
  }

  const REPORT_COLUMNS = [
    "Timestamp",
    "Task Description",
    "Working Person",
    "Status",
    "Remark",
    "Attachment Url",
    "Completed Date",
    "Completion File Url",
    "Completion Remark",
  ];

  function reportRow(e: MdReportEntry): string[] {
    return [
      formatTimestampIndian(e.timestamp),
      e.workDescription,
      e.workingPerson,
      e.category,
      e.remarks || "",
      e.attachmentUrl || "",
      e.completedDate || "",
      e.completedFileUrl || "",
      e.completedRemark || "",
    ];
  }

  function csvEscape(value: string): string {
    if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
    return value;
  }

  function handleDownloadExcel() {
    if (entriesForSelectedDate.length === 0) {
      toast.error("No entries in the selected date range.");
      return;
    }
    const lines = [REPORT_COLUMNS, ...entriesForSelectedDate.map(reportRow)].map((row) =>
      row.map((cell) => csvEscape(cell)).join(","),
    );
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `md-reports_${startDate}_to_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Excel file downloaded");
  }

  function handleDownloadPdf() {
    if (entriesForSelectedDate.length === 0) {
      toast.error("No entries in the selected date range.");
      return;
    }

    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header band
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 52, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Piramal Petroleum", 24, 22);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("MD Reports", 24, 38);
    doc.setFontSize(9);
    doc.text(`${formatDisplayDate(startDate)} — ${formatDisplayDate(endDate)}`, pageWidth - 24, 22, { align: "right" });
    doc.text(`Generated: ${new Date().toLocaleString("en-IN")}`, pageWidth - 24, 36, { align: "right" });
    doc.setTextColor(0, 0, 0);

    const pdfColumns = [
      "#",
      "Timestamp",
      "Task Description",
      "Working Person",
      "Status",
      "Remark",
      "Attachment",
      "Completed On",
      "Completion File",
      "Completion Remark",
    ];

    const attachmentLinks: (string | null)[] = [];
    const completionLinks: (string | null)[] = [];
    const attachmentColIndex = 6;
    const completionColIndex = 8;
    const statusColIndex = 4;

    const body = entriesForSelectedDate.map((e, i) => {
      attachmentLinks.push(e.attachmentUrl || null);
      completionLinks.push(e.completedFileUrl || null);
      return [
        String(i + 1),
        formatTimestampIndian(e.timestamp),
        e.workDescription,
        e.workingPerson,
        e.category,
        e.remarks || "-",
        e.attachmentUrl ? "View file" : "-",
        e.completedDate || "-",
        e.completedFileUrl ? "View file" : "-",
        e.completedRemark || "-",
      ];
    });

    autoTable(doc, {
      startY: 66,
      head: [pdfColumns],
      body,
      theme: "grid",
      styles: {
        fontSize: 8.5,
        cellPadding: 5,
        overflow: "linebreak",
        valign: "middle",
        lineColor: [226, 232, 240],
        lineWidth: 0.5,
        textColor: [30, 41, 59],
      },
      headStyles: {
        fillColor: [13, 148, 136],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 9,
        halign: "left",
      },
      alternateRowStyles: { fillColor: [244, 249, 248] },
      columnStyles: {
        0: { cellWidth: 22, halign: "center" },
        1: { cellWidth: 70 },
        2: { cellWidth: "auto" },
        3: { cellWidth: 72 },
        4: { cellWidth: 56, halign: "center" },
        5: { cellWidth: 90 },
        6: { cellWidth: 52, halign: "center" },
        7: { cellWidth: 68 },
        8: { cellWidth: 58, halign: "center" },
        9: { cellWidth: 90 },
      },
      margin: { top: 66, left: 20, right: 20, bottom: 24 },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === statusColIndex) {
          const status = String(data.cell.raw);
          data.cell.styles.fontStyle = "bold";
          if (status === "Completed") data.cell.styles.textColor = [5, 150, 105];
          else if (status === "Pending") data.cell.styles.textColor = [217, 119, 6];
          else data.cell.styles.textColor = [37, 99, 235];
        }
        if (
          data.section === "body" &&
          (data.column.index === attachmentColIndex || data.column.index === completionColIndex) &&
          String(data.cell.raw) === "View file"
        ) {
          data.cell.styles.textColor = [13, 148, 136];
          data.cell.styles.fontStyle = "bold";
        }
      },
      didDrawCell: (data) => {
        if (data.section !== "body") return;
        if (data.column.index === attachmentColIndex) {
          const url = attachmentLinks[data.row.index];
          if (url) doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url });
        }
        if (data.column.index === completionColIndex) {
          const url = completionLinks[data.row.index];
          if (url) doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url });
        }
      },
    });

    const pageCount = doc.getNumberOfPages();
    const pageHeight = doc.internal.pageSize.getHeight();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text("DailyOps · Piramal Petroleum", 24, pageHeight - 12);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - 24, pageHeight - 12, { align: "right" });
    }

    doc.save(`md-reports_${startDate}_to_${endDate}.pdf`);
    toast.success("PDF file downloaded");
  }

  
  if (viewMode === "selection") {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in-95">
        <h2 className="mb-8 text-2xl font-semibold text-mist-100">Select Report Type</h2>
        <div className="flex flex-col sm:flex-row gap-6 max-w-2xl w-full px-4">
          <Card 
            glow="teal" 
            className="flex-1 cursor-pointer hover:scale-105 transition-transform flex flex-col items-center justify-center py-12 gap-4 border-teal-500/30 bg-teal-500/5"
            onClick={() => setViewMode("ea")}
          >
            <ShieldCheck size={48} className="text-teal-600 dark:text-teal-400 drop-shadow-md" />
            <h3 className="text-lg font-bold text-teal-700 dark:text-teal-100 tracking-wider">EA REPORT</h3>
            <p className="text-xs text-mist-500 dark:text-mist-400 text-center px-4">Executive Assistant Daily Work Log</p>
          </Card>
          <Card 
            glow="blue" 
            className="flex-1 cursor-pointer hover:scale-105 transition-transform flex flex-col items-center justify-center py-12 gap-4 border-blue-500/30 bg-blue-500/5"
            onClick={() => setViewMode("employee")}
          >
            <ClipboardList size={48} className="text-blue-600 dark:text-blue-400 drop-shadow-md" />
            <h3 className="text-lg font-bold text-blue-700 dark:text-blue-100 tracking-wider">EMPLOYEE REPORT</h3>
            <p className="text-xs text-mist-500 dark:text-mist-400 text-center px-4">View End-of-Day Reports submitted by all employees</p>
          </Card>
        </div>
      </div>
    );
  }

  if (viewMode === "employee") {
    return <EmployeeReportsView onBack={() => setViewMode("selection")} />;
  }

  if (!unlocked) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="glass w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl"
        >
          <div className="w-full mb-4 text-left">
            <Button variant="ghost" className="!px-2 text-xs" onClick={() => setViewMode("selection")}>← Back</Button>
          </div>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-amber-400 text-ink-950">
            <Lock size={20} />
          </div>
          <h2 className="text-lg font-semibold ">MD Report Access</h2>
          <p className="mt-1 text-sm opacity-50 text-[11px] font-semibold uppercase tracking-wide">Enter the access password to view reports.</p>

          <form onSubmit={handleUnlock} className="mt-6 space-y-3 text-left">
            <div>
              <Label htmlFor="md-password">Password</Label>
              <div className="relative">
                <Input
                  id="md-password"
                  type={showUnlockPassword ? "text" : "password"}
                  autoFocus
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setWrongAttempt(false);
                  }}
                  placeholder="••••"
                  className={`pr-10 ${wrongAttempt ? "border-rose-500/60" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowUnlockPassword(!showUnlockPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 opacity-50 text-[11px] font-semibold uppercase tracking-wide hover:opacity-80 transition-colors"
                  aria-label={showUnlockPassword ? "Hide password" : "Show password"}
                >
                  {showUnlockPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {wrongAttempt && <p className="mt-1.5 text-xs text-rose-400">Incorrect password — try again.</p>}
            </div>
            <Button type="submit" fullWidth icon={<ShieldCheck size={16} />}>
              Unlock
            </Button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight ">MD Reports</h2>
          <p className="mt-1 text-sm opacity-50 text-[11px] font-semibold uppercase tracking-wide">Daily work log — completed, pending and next-day priority tasks.</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setShowForm(true)}>
          Add new task
        </Button>
      </div>

      {(mdReportsError || personNamesError) && (
        <Card className="border-rose-500/30">
          <div className="flex items-center gap-2 text-rose-300">
            <AlertCircle size={16} />
            <p className="text-sm">{mdReportsError || personNamesError}</p>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card glow="teal">
          <div className="flex items-center gap-2 opacity-60 text-[11px] sm:text-xs">
            <span className="text-teal-400">
              <CalendarDays size={18} />
            </span>
            <p className="text-xs font-medium">Days logged</p>
          </div>
          <p className="mt-2 text-2xl font-semibold ">{mdReports === null ? "—" : daysLogged}</p>
          <p className="mt-3 text-xs opacity-50 text-[11px] font-semibold uppercase tracking-wide">Total days with an MD report submitted</p>
        </Card>
        <Card glow="amber" className="flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 opacity-60 text-[11px] sm:text-xs">
              <span className="text-amber-400">
                <ClipboardList size={18} />
              </span>
              <p className="text-xs font-medium">Entries in Range</p>
            </div>
            <div className="flex items-center gap-0.5">
              <button onClick={handleDownloadExcel} title="Download Excel" className="p-1.5 text-emerald-400 hover:bg-emerald-400/20 rounded-md transition-colors cursor-pointer">
                <FileSpreadsheet size={16} />
              </button>
              <button onClick={handleDownloadPdf} title="Download PDF" className="p-1.5 text-rose-400 hover:bg-rose-400/20 rounded-md transition-colors cursor-pointer">
                <FileText size={16} />
              </button>
            </div>
          </div>
          <p className="mt-1 text-2xl font-semibold ">{entriesForSelectedDate.length}</p>
          <div className="mt-2 flex items-center gap-2">
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="py-1.5 px-2 text-[13px] w-full" />
            <span className="opacity-50 text-[11px] font-semibold uppercase tracking-wide text-xs font-medium">to</span>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="py-1.5 px-2 text-[13px] w-full" />
          </div>
        </Card>
      </div>

      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowForm(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl"
          >
            <Card glow="teal">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold ">Add new task</h3>
            <button
              onClick={() => setShowForm(false)}
              className="opacity-50 text-[11px] font-semibold uppercase tracking-wide hover:opacity-80 text-sm"
            >
              ✕
            </button>
          </div>
          <form onSubmit={handleAddEntry} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="mdw-category">Category</Label>
              <select
                id="mdw-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as MdWorkCategory)}
                className={`${selectClass} w-full`}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="mdw-person">Working person</Label>
              <PersonDropdown 
                value={workingPerson} 
                onChange={setWorkingPerson} 
                personNames={personNames} 
                handleAdd={(n) => handleAddNewPerson(n, setWorkingPerson)} 
                adding={addingPerson}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="mdw-desc">Work description</Label>
            <Input
              id="mdw-desc"
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              placeholder="What's the task?"
            />
          </div>

          <div>
            <Label htmlFor="mdw-remarks">Remarks</Label>
            <Input id="mdw-remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" />
          </div>

          <div>
            <Label htmlFor="mdw-attachment">Attachment (Optional)</Label>
            <div className="space-y-2">
              <input
                key={newTaskFileInputKey}
                id="mdw-attachment"
                type="file"
                onChange={handleNewTaskFileUpload}
                disabled={uploadingNewTaskFile}
                className="field-surface rounded-xl border border-ink-600 bg-ink-900/60 px-3 py-2.5 text-sm  outline-none focus:border-teal-400 w-full file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-teal-500/20 file:text-teal-300 hover:file:bg-teal-500/30 cursor-pointer"
              />
              {uploadingNewTaskFile && <p className="text-xs text-amber-400">Uploading file...</p>}
              {newTaskFileUrl && (
                <div className="flex items-center gap-1.5 text-xs text-teal-400 bg-teal-500/10 p-2 rounded">
                  <Paperclip size={12} /> File attached:{" "}
                  <a href={newTaskFileUrl} target="_blank" rel="noreferrer" className="underline hover:text-teal-300">
                    View file
                  </a>
                </div>
              )}
            </div>
          </div>

          <Button type="submit" icon={<Plus size={16} />} disabled={!workDescription.trim()} className="self-start">
            Add task
          </Button>
        </form>
      </Card>
      </motion.div>
      </div>
      )}

      {completingEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setCompletingEntry(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto hide-scrollbar"
          >
            <Card glow="amber">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold ">Mark task as completed</h3>
            <button
              onClick={() => setCompletingEntry(null)}
              className="opacity-50 text-[11px] font-semibold uppercase tracking-wide hover:opacity-80 text-sm"
            >
              ✕
            </button>
          </div>
          <form onSubmit={handleSubmitCompletion} className="flex flex-col gap-3">
            <div>
              <Label htmlFor="comp-date">Completion Date</Label>
              <Input
                id="comp-date"
                type="date"
                value={completedDate}
                onChange={(e) => setCompletedDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="comp-file-url">File Url (Optional)</Label>
              <Input
                id="comp-file-url"
                value={completedFileUrl}
                onChange={(e) => setCompletedFileUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div>
              <Label htmlFor="comp-remark">Completion Remark (Optional)</Label>
              <Input
                id="comp-remark"
                value={completedRemark}
                onChange={(e) => setCompletedRemark(e.target.value)}
                placeholder="Any additional notes..."
              />
            </div>
            <Button type="submit" className="self-start">
              Confirm Completion
            </Button>
          </form>
        </Card>
          </motion.div>
        </div>
      )}

      {editingEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setEditingEntry(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto hide-scrollbar"
          >
            <Card glow="teal">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold ">Edit entry</h3>
            <button
              onClick={() => setEditingEntry(null)}
              className="opacity-50 text-[11px] font-semibold uppercase tracking-wide hover:opacity-80 text-sm"
            >
              ✕
            </button>
          </div>
          <form onSubmit={handleSubmitEdit} className="flex flex-col gap-3">
            <div>
              <Label htmlFor="edit-category">Category</Label>
              <select
                id="edit-category"
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as MdWorkCategory)}
                className={`${selectClass} w-full`}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="edit-person">Working person</Label>
              <PersonDropdown 
                value={editWorkPerson} 
                onChange={setEditWorkPerson} 
                personNames={personNames} 
                handleAdd={(n) => handleAddNewPerson(n, setEditWorkPerson)} 
                adding={addingPerson}
              />
            </div>
            <div>
              <Label htmlFor="edit-desc">Work description</Label>
              <Input
                id="edit-desc"
                value={editTaskDesc}
                onChange={(e) => setEditTaskDesc(e.target.value)}
                placeholder="What's the task?"
              />
            </div>
            <div>
              <Label htmlFor="edit-remarks">Remarks</Label>
              <Input
                id="edit-remarks"
                value={editRemarks}
                onChange={(e) => setEditRemarks(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <Label>Attachment (Optional)</Label>
              <div className="flex items-center gap-3 glass p-2 rounded-xl border border-white/5">
                <input
                  type="file"
                  id="edit-file"
                  className="hidden"
                  onChange={handleEditFileUpload}
                />
                <Button variant="primary" type="button" onClick={() => document.getElementById("edit-file")?.click()}>
                  Choose File
                </Button>
                <span className="text-xs opacity-60 text-[11px] sm:text-xs truncate max-w-[150px]">
                  {editAttachmentUrl ? "File attached" : "No file chosen"}
                </span>
              </div>
              {uploadingEditFile && <p className="text-xs text-amber-400 mt-1">Uploading...</p>}
              {editAttachmentUrl && !uploadingEditFile && (
                <div className="flex items-center gap-1.5 text-xs text-teal-400 bg-teal-500/10 p-2 rounded mt-2">
                  <Paperclip size={12} /> File attached:{" "}
                  <a href={editAttachmentUrl} target="_blank" rel="noreferrer" className="underline hover:text-teal-300">
                    View file
                  </a>
                  <button type="button" onClick={() => setEditAttachmentUrl("")} className="ml-auto text-rose-400 hover:text-rose-300">Remove</button>
                </div>
              )}
            </div>
            <Button type="submit" className="self-start">
              Save Changes
            </Button>
          </form>
        </Card>
          </motion.div>
        </div>
      )}

      {updatingEntry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setUpdatingEntry(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md"
          >
            <Card glow="amber">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold ">Update entry (Mark as Completed)</h3>
                <button
                  onClick={() => setUpdatingEntry(null)}
                  className="opacity-50 text-[11px] font-semibold uppercase tracking-wide hover:opacity-80 text-sm"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleSubmitUpdate} className="flex flex-col gap-3">
                <div>
                  <Label htmlFor="update-date">Completion Date</Label>
                  <Input id="update-date" type="date" value={updateCompletedDate} readOnly disabled />
                </div>
                <div>
                  <Label htmlFor="update-file-url">File Upload (Optional)</Label>
                  <div className="space-y-2">
                    <input
                      id="update-file-url"
                      type="file"
                      onChange={handleUpdateFileUpload}
                      disabled={uploadingFile}
                      className="field-surface rounded-xl border border-ink-600 bg-ink-900/60 px-3 py-2.5 text-sm  outline-none focus:border-teal-400 w-full file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-teal-500/20 file:text-teal-300 hover:file:bg-teal-500/30 cursor-pointer"
                    />
                    {uploadingFile && <p className="text-xs text-amber-400">Uploading file...</p>}
                    {updateFileUrl && (
                      <div className="text-xs text-teal-400 bg-teal-500/10 p-2 rounded">
                        ✓ File uploaded: <a href={updateFileUrl} target="_blank" rel="noreferrer" className="underline hover:text-teal-300">View file</a>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="update-remark">Remark (Optional)</Label>
                  <Input
                    id="update-remark"
                    value={updateRemark}
                    onChange={(e) => setUpdateRemark(e.target.value)}
                    placeholder="Any notes about completion…"
                  />
                </div>
                <Button type="submit" className="self-start">
                  Confirm Update
                </Button>
              </form>
            </Card>
          </motion.div>
        </div>
      )}


      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-8 mb-4">
        <div>
          <h2 className="text-xl font-semibold text-ink-900 dark:text-white">All Entries (Data Table)</h2>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-mist-500 dark:text-mist-400">Full data view with edit and delete options.</p>
        </div>
        
        <div className="flex p-1.5 bg-ink-900/10 dark:bg-ink-900/60 rounded-xl border border-white/5 w-full md:w-auto overflow-x-auto hide-scrollbar">
          {["All", "Completed", "Pending", "Nextday Priority"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`relative px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap outline-none ${
                statusFilter === status ? "text-ink-950" : "text-mist-500 dark:text-mist-400 hover:text-mist-900 dark:hover:text-mist-200"
              }`}
            >
              {statusFilter === status && (
                <motion.div
                  className={`absolute inset-0 z-0 rounded-lg ${
                    status === "Completed" ? "bg-teal-400 shadow-[0_4px_12px_rgba(45,212,191,0.3)]" :
                    status === "Pending" ? "bg-amber-400 shadow-[0_4px_12px_rgba(251,146,60,0.3)]" :
                    status === "Nextday Priority" ? "bg-mist-400 dark:bg-mist-300 shadow-[0_4px_12px_rgba(203,213,225,0.3)]" :
                    "bg-mist-300 dark:bg-ink-700 shadow-[0_4px_12px_rgba(26,37,64,0.3)]"
                  }`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.15 }}
                />
              )}
              <span className="relative z-10">{status}</span>
            </button>
          ))}
        </div>
      </div>

      {mdReports === null && !mdReportsError ? (
        <div className="flex justify-center py-12 opacity-50 text-[11px] font-semibold uppercase tracking-wide">
          <Spinner size={24} />
        </div>
      ) : (
        <Card>
          {filteredEntries.length === 0 ? (
            <EmptyState icon={<ClipboardList size={24} />} title="No matching entries" />
          ) : (
            <div className="w-full">
              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {filteredEntries.map((entry) => (
                  <div key={entry._id} className="border border-ink-200 dark:border-ink-800/60 rounded-xl p-4 space-y-3 bg-white/50 dark:bg-ink-900/20 shadow-sm">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-sm font-bold text-ink-900 dark:text-white leading-tight">{entry.workDescription}</span>
                      <Badge tone={entry.category === "Completed" ? "teal" : entry.category === "Pending" ? "amber" : "slate"}>
                        {entry.category}
                      </Badge>
                    </div>
                    <div className="text-xs font-medium text-mist-600 dark:text-mist-400">
                      {formatTimestampIndian(entry.timestamp)} • {entry.workingPerson}
                    </div>
                    
                    {entry.remarks && (
                      <div className="text-xs text-mist-500 dark:text-mist-400 bg-ink-50 dark:bg-ink-900/40 p-2 rounded-lg">
                        <span className="font-semibold">Remark:</span> {entry.remarks}
                      </div>
                    )}
                    
                    {(entry.attachmentUrl || entry.completedDate || entry.completedRemark || entry.completedFileUrl) && (
                      <div className="border-t border-ink-100 dark:border-ink-800/60 pt-3 mt-3 flex flex-col gap-2 text-xs">
                        {entry.attachmentUrl && (
                           <a href={entry.attachmentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 hover:underline font-medium">
                             <Paperclip size={12} /> View Initial File
                           </a>
                        )}
                        {entry.completedDate && <div className="text-teal-600 dark:text-teal-400 font-medium">Completed: {formatTimestampIndian(entry.completedDate)}</div>}
                        {entry.completedRemark && <div className="text-ink-700 dark:text-mist-300 italic">"{entry.completedRemark}"</div>}
                        {entry.completedFileUrl && (
                          <a href={entry.completedFileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 hover:underline font-medium">
                            <Paperclip size={12} /> View Completed File
                          </a>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2 border-t border-ink-100 dark:border-ink-800/60 mt-3 justify-end">
                      <button onClick={() => handleEditEntry(entry)} disabled={entry._id === "__optimistic__"} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 transition-colors">Edit</button>
                      <button onClick={() => handleUpdateEntry(entry)} disabled={entry._id === "__optimistic__"} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 transition-colors">Update</button>
                      <button onClick={() => handleDeleteEntry(entry)} disabled={entry._id === "__optimistic__"} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-500/10 text-rose-700 dark:text-rose-300 transition-colors">Delete</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-200 text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink-700/60 text-[11px] text-mist-500 dark:text-mist-400 font-semibold uppercase tracking-wide">
                      <th className="py-2 pr-2 font-medium">Timestamp</th>
                      <th className="py-2 pr-2 font-medium">Task Description</th>
                      <th className="py-2 pr-2 font-medium">Working Person</th>
                      <th className="py-2 pr-2 font-medium">Status</th>
                      <th className="py-2 pr-2 font-medium">Remark</th>
                      <th className="py-2 pr-2 font-medium">File Url</th>
                      <th className="py-2 pr-2 font-medium">Completion Info</th>
                      <th className="py-2 pr-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry) => (
                      <tr key={entry._id} className="border-b border-ink-800/60 last:border-0 hover:bg-ink-800/10 dark:hover:bg-ink-800/30">
                        <td className="py-2.5 pr-2 text-[11px] sm:text-xs text-mist-500 dark:text-mist-400">{formatTimestampIndian(entry.timestamp)}</td>
                        <td className="py-2.5 pr-2 max-w-xs truncate text-ink-900 dark:text-white">{entry.workDescription}</td>
                        <td className="py-2.5 pr-2 text-ink-800 dark:text-mist-200">{entry.workingPerson}</td>
                        <td className="py-2.5 pr-2">
                          <Badge tone={entry.category === "Completed" ? "teal" : entry.category === "Pending" ? "amber" : "slate"}>
                            {entry.category}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-2 text-[11px] sm:text-xs text-mist-500 dark:text-mist-400 max-w-xs truncate">{entry.remarks || "—"}</td>
                        <td className="py-2.5 pr-2 text-[11px] sm:text-xs text-mist-500 dark:text-mist-400">
                          {entry.attachmentUrl ? (
                            <a
                              href={entry.attachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:underline text-xs"
                            >
                              <Paperclip size={12} /> View
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-2.5 pr-2 text-[11px] sm:text-xs text-mist-500 dark:text-mist-400">
                          {entry.completedDate && <div className="text-xs text-teal-600 dark:text-teal-400 mb-1">{formatTimestampIndian(entry.completedDate)}</div>}
                          {entry.completedRemark && <div className="text-[11px] max-w-[120px] truncate mb-1" title={entry.completedRemark}>{entry.completedRemark}</div>}
                          {entry.completedFileUrl && (
                            <a href={entry.completedFileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:underline text-xs">
                              <Paperclip size={12} /> View File
                            </a>
                          )}
                          {!entry.completedDate && !entry.completedRemark && !entry.completedFileUrl && "—"}
                        </td>
                        <td className="py-2.5 pr-2 flex gap-1.5 flex-wrap justify-end">
                          <button
                            onClick={() => handleEditEntry(entry)}
                            disabled={entry._id === "__optimistic__"}
                            title={entry._id === "__optimistic__" ? "Still syncing — try again in a moment" : undefined}
                            className="px-2 py-1 text-xs font-medium rounded bg-blue-500/20 text-blue-700 dark:text-blue-300 hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleUpdateEntry(entry)}
                            disabled={entry._id === "__optimistic__"}
                            title={entry._id === "__optimistic__" ? "Still syncing — try again in a moment" : undefined}
                            className="px-2 py-1 text-xs font-medium rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 hover:bg-amber-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Update
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(entry)}
                            disabled={entry._id === "__optimistic__"}
                            title={entry._id === "__optimistic__" ? "Still syncing — try again in a moment" : undefined}
                            className="px-2 py-1 text-xs font-medium rounded bg-rose-500/20 text-rose-700 dark:text-rose-300 hover:bg-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}

      <div>
        <h2 className="text-2xl font-semibold text-ink-900 dark:text-white">Work Log by Category</h2>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-mist-500 dark:text-mist-400">View tasks by completion status.</p>
      </div>

      {mdReports === null && !mdReportsError ? (
        <div className="flex justify-center py-12 opacity-50 text-[11px] font-semibold uppercase tracking-wide">
          <Spinner size={24} />
        </div>
      ) : (
        CATEGORIES.map((c) => (
          <WorkTable
            key={c.key}
            title={c.label}
            tone={c.tone}
            entries={entriesForSelectedDate.filter((e) => e.category === c.key)}
            onMarkComplete={handleMarkComplete}
          />
        ))
      )}
    </div>
  );
}

function WorkTable({
  title,
  tone,
  entries,
  onMarkComplete,
}: {
  title: string;
  tone: "teal" | "amber" | "slate";
  entries: MdReportEntry[];
  onMarkComplete?: (entry: MdReportEntry) => void;
}) {
  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-sm font-semibold ">{title}</h3>
        <Badge tone={tone}>{entries.length}</Badge>
      </div>
      {entries.length === 0 ? (
        <EmptyState icon={<ClipboardList size={24} />} title="No tasks yet" />
      ) : (
        <div className="w-full">
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {entries.map((e, i) => (
              <div key={e._id} className="border border-ink-200 dark:border-ink-800/60 rounded-xl p-4 space-y-3 bg-white/50 dark:bg-ink-900/20 shadow-sm">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-sm font-bold text-ink-900 dark:text-white leading-tight">
                    <span className="text-mist-400 mr-1">#{i + 1}</span> {e.workDescription}
                  </span>
                </div>
                <div className="text-xs font-medium text-mist-600 dark:text-mist-400">
                  {formatTimestampIndian(e.timestamp)} • {e.workingPerson}
                </div>
                
                {e.remarks && (
                  <div className="text-xs text-mist-500 dark:text-mist-400 bg-ink-50 dark:bg-ink-900/40 p-2 rounded-lg">
                    <span className="font-semibold">Remark:</span> {e.remarks}
                  </div>
                )}
                
                {title === "Completed work" && (e.completedDate || e.completedRemark || e.completedFileUrl) && (
                  <div className="border-t border-ink-100 dark:border-ink-800/60 pt-3 mt-3 flex flex-col gap-2 text-xs">
                    {e.completedDate && <div className="text-teal-600 dark:text-teal-400 font-medium">Completed: {formatTimestampIndian(e.completedDate)}</div>}
                    {e.completedRemark && <div className="text-ink-700 dark:text-mist-300 italic">"{e.completedRemark}"</div>}
                    {e.completedFileUrl && (
                      <a href={e.completedFileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 hover:underline font-medium">
                        <Paperclip size={12} /> View Completed File
                      </a>
                    )}
                  </div>
                )}

                {onMarkComplete && (
                  <div className="flex pt-2 border-t border-ink-100 dark:border-ink-800/60 mt-3 justify-end">
                    <button
                      onClick={() => onMarkComplete(e)}
                      disabled={e._id === "__optimistic__"}
                      className="px-4 py-2 text-xs font-bold rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 transition-colors w-full sm:w-auto"
                    >
                      Mark Done
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-140 text-left text-sm">
              <thead>
                <tr className="border-b border-ink-700/60 text-[11px] font-semibold uppercase tracking-wide text-mist-500 dark:text-mist-400">
                  <th className="w-10 py-2 pr-2 font-medium">#</th>
                  <th className="py-2 pr-2 font-medium">Date</th>
                  <th className="py-2 pr-2 font-medium">Work description</th>
                  <th className="py-2 pr-2 font-medium">Working person</th>
                  <th className="py-2 pr-2 font-medium">Remarks</th>
                  {title === "Completed work" && <th className="py-2 pr-2 font-medium">Completed Details</th>}
                  {onMarkComplete && <th className="py-2 pr-2 font-medium">Action</th>}
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={e._id} className="border-b border-ink-800/60 last:border-0 hover:bg-ink-800/10 dark:hover:bg-ink-800/30">
                    <td className="py-2.5 pr-2 text-[11px] font-semibold uppercase tracking-wide text-mist-500 dark:text-mist-400">{i + 1}</td>
                    <td className="py-2.5 pr-2 text-[11px] sm:text-xs text-mist-500 dark:text-mist-400">{formatTimestampIndian(e.timestamp)}</td>
                    <td className="py-2.5 pr-2 text-ink-900 dark:text-white">{e.workDescription}</td>
                    <td className="py-2.5 pr-2 text-ink-800 dark:text-mist-200">{e.workingPerson}</td>
                    <td className="py-2.5 pr-2 text-[11px] sm:text-xs text-mist-500 dark:text-mist-400">{e.remarks || "—"}</td>
                    {title === "Completed work" && (
                      <td className="py-2.5 pr-2 text-[11px] sm:text-xs text-mist-500 dark:text-mist-400">
                        {e.completedDate && <div className="text-xs text-teal-600 dark:text-teal-400 mb-1">{formatTimestampIndian(e.completedDate)}</div>}
                        {e.completedRemark && <div className="text-sm text-ink-900 dark:text-white">{e.completedRemark}</div>}
                        {e.completedFileUrl && (
                          <a href={e.completedFileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:underline text-xs mt-1">
                            <Paperclip size={12} /> View File
                          </a>
                        )}
                        {!e.completedDate && !e.completedRemark && !e.completedFileUrl && "—"}
                      </td>
                    )}
                    {onMarkComplete && (
                      <td className="py-2.5 pr-2 text-right">
                        <button
                          onClick={() => onMarkComplete(e)}
                          disabled={e._id === "__optimistic__"}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-teal-500/20 text-teal-700 dark:text-teal-300 hover:bg-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Mark Done
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}


function PersonDropdown({ 
  value, 
  onChange, 
  placeholder = "Search or select…", 
  personNames, 
  handleAdd,
  adding
}: { 
  value: string; 
  onChange: (val: string) => void; 
  placeholder?: string; 
  personNames: string[] | null; 
  handleAdd: (name: string) => void;
  adding: boolean;
}) {
  const [show, setShow] = useState(false);
  
  const filtered = useMemo(() => {
    if (!personNames) return [];
    if (!value) return personNames;
    const s = value.toLowerCase().trim();
    return personNames.filter((n) => n.toLowerCase().includes(s));
  }, [personNames, value]);

  const exactMatch = personNames?.some(n => n.toLowerCase() === value.toLowerCase().trim());

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => { onChange(e.target.value); setShow(true); }}
        onFocus={() => setShow(true)}
        onClick={() => setShow(true)}
        onBlur={() => setTimeout(() => setShow(false), 200)}
        placeholder={placeholder}
        autoComplete="off"
        disabled={adding}
      />
      {show && (
        <ul className="absolute top-full left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto rounded-xl border border-ink-600 bg-ink-900 shadow-lg">
          {personNames === null ? (
            <li className="px-3.5 py-2.5 text-sm opacity-50 text-[11px] font-semibold uppercase tracking-wide italic">Loading names...</li>
          ) : (
            <>
              {filtered.map((name) => (
                <li
                  key={name}
                  onMouseDown={(e) => { e.preventDefault(); onChange(name); setShow(false); }}
                  className={`cursor-pointer px-3.5 py-2.5 text-sm transition-colors ${
                    value === name ? "bg-teal-500/30 text-teal-300 font-medium" : "text-mist-200 hover:bg-ink-800"
                  }`}
                >
                  {name}
                </li>
              ))}
              {value.trim() !== "" && !exactMatch && (
                <li
                  onMouseDown={(e) => { e.preventDefault(); handleAdd(value); setShow(false); }}
                  className="cursor-pointer px-3.5 py-2.5 text-sm text-teal-300 hover:bg-teal-500/20 border-t border-white/5 flex items-center gap-2 font-medium"
                >
                  <Plus size={14} /> Add "{value}"
                </li>
              )}
              {filtered.length === 0 && (value.trim() === "" || exactMatch) && (
                <li className="px-3.5 py-2.5 text-sm opacity-50 text-[11px] font-semibold uppercase tracking-wide">No matches found</li>
              )}
            </>
          )}
        </ul>
      )}
    </div>
  );
}


function EmployeeReportsView({ onBack }: { onBack: () => void }) {
  const { data: allReports, error: repError } = useSheetCache(reportsCache);
  const { data: allPlans, error: planError } = useSheetCache(plansCache);
  
  const [filterDate, setFilterDate] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterType, setFilterType] = useState<"All" | "Daily Plan" | "EOD Report">("All");
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());

  const loading = allReports === null || allPlans === null;
  const error = repError || planError;

  const unifiedList = useMemo(() => {
    if (!allReports || !allPlans) return [];
    
    const list = [];
    for (const r of allReports) {
      list.push({
        id: r._id,
        type: "EOD Report",
        date: r.date,
        userId: r.userId,
        summary: r.summary,
        statusStr: `${r.tasksCompleted}/${r.tasksPlanned}`,
        attachmentUrl: r.fileUrl,
        completedAt: "",
        notes: ""
      });
    }
    
    for (const p of allPlans) {
      list.push({
        id: p._id,
        type: "Daily Plan",
        date: p.date,
        userId: p.userId,
        summary: p.task,
        statusStr: p.status,
        attachmentUrl: "",
        completedAt: p.completedAt,
        notes: p.notes
      });
    }
    
    list.sort((a, b) => b.date.localeCompare(a.date));
    return list;
  }, [allReports, allPlans]);

  const filtered = useMemo(() => {
    return unifiedList.filter(item => {
      if (filterDate && item.date !== filterDate) return false;
      if (filterName && !item.userId.toLowerCase().includes(filterName.toLowerCase())) return false;
      if (filterType !== "All" && item.type !== filterType) return false;
      return true;
    });
  }, [unifiedList, filterDate, filterName, filterType]);

  const grouped = useMemo(() => {
    const groups: Record<string, {
      userId: string;
      total: number;
      completed: number;
      pending: number;
      entries: typeof filtered;
    }> = {};

    filtered.forEach(item => {
      if (!groups[item.userId]) {
        groups[item.userId] = {
          userId: item.userId,
          total: 0,
          completed: 0,
          pending: 0,
          entries: []
        };
      }
      const g = groups[item.userId];
      g.total++;
      g.entries.push(item);

      if (item.type === "Daily Plan") {
        if (item.statusStr === "Completed") g.completed++;
        else if (item.statusStr === "Pending" || item.statusStr === "In Progress") g.pending++;
      }
    });

    return Object.values(groups).sort((a, b) => a.userId.localeCompare(b.userId));
  }, [filtered]);

  const toggleEmployee = (userId: string) => {
    setExpandedEmployees((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center gap-4 mb-2">
        <Button variant="secondary" onClick={onBack} className="!px-3 text-xs">
          ← Back
        </Button>
        <div>
          <h2 className="text-2xl font-semibold text-mist-100">Employee Reports</h2>
          <p className="mt-1 text-sm text-mist-500">View daily plans and end-of-day reports</p>
        </div>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap gap-3 items-end">
          <div>
            <Label className="mb-1 text-[11px] opacity-70">Filter Date</Label>
            <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="py-1.5 px-2 text-xs" />
          </div>
          <div>
            <Label className="mb-1 text-[11px] opacity-70">Employee Name</Label>
            <Input type="text" placeholder="Search name..." value={filterName} onChange={e => setFilterName(e.target.value)} className="py-1.5 px-2 text-xs w-40" />
          </div>
          <div>
            <Label className="mb-1 text-[11px] opacity-70">Report Type</Label>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value as any)}
              className={selectClass + " !py-1.5 !px-2 !text-xs"}
            >
              <option value="All">All Types</option>
              <option value="Daily Plan">Daily Plan</option>
              <option value="EOD Report">EOD Report</option>
            </select>
          </div>
          {(filterDate || filterName || filterType !== "All") && (
            <div className="pb-0.5">
              <Button variant="ghost" className="!px-3 !py-1.5 text-xs text-mist-400" onClick={() => { setFilterDate(""); setFilterName(""); setFilterType("All"); }}>
                Clear
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12 text-mist-500"><Spinner size={24} /></div>
        ) : error ? (
          <div className="p-4 text-rose-400 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<ClipboardList size={28} />} title="No reports found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink-700/60 text-xs opacity-50 font-semibold uppercase tracking-wide">
                  <th className="py-2 pl-2 pr-2 w-8"></th>
                  <th className="py-2 pr-2">Date</th>
                  <th className="py-2 pr-2">Employee Name</th>
                  <th className="py-2 pr-2">Type</th>
                  <th className="py-2 pr-2">Status / Tasks</th>
                  <th className="py-2 pr-2 max-w-sm">Summary / Description</th>
                  <th className="py-2 pr-2">Attachment</th>
                </tr>
              </thead>
              {grouped.map(group => {
                const isExpanded = expandedEmployees.has(group.userId);
                return (
                  <tbody key={group.userId}>
                    {/* Summary Row */}
                    <tr 
                      onClick={() => toggleEmployee(group.userId)}
                      className="border-b border-ink-800/60 last:border-0 hover:bg-ink-800/30 cursor-pointer bg-ink-900/5 dark:bg-ink-900/40"
                    >
                      <td className="py-3 pl-2 pr-2 text-mist-400 font-bold">
                        {isExpanded ? "▼" : "▶"}
                      </td>
                      <td className="py-3 pr-2 font-medium text-teal-600 dark:text-teal-400" colSpan={2}>
                        {group.userId}
                      </td>
                      <td className="py-3 pr-2" colSpan={4}>
                        <div className="flex gap-4 text-xs">
                          <span className="text-mist-500 dark:text-mist-300">Total Entries: <b className="text-ink-900 dark:text-white">{group.total}</b></span>
                          <span className="text-teal-600 dark:text-teal-400">Completed Plans: <b className="text-teal-700 dark:text-teal-300">{group.completed}</b></span>
                          <span className="text-amber-600 dark:text-amber-400">Pending Plans: <b className="text-amber-700 dark:text-amber-300">{group.pending}</b></span>
                        </div>
                      </td>
                    </tr>

                    {/* Detail Rows */}
                    {isExpanded && group.entries.map(r => (
                      <tr key={r.id + r.type} className="border-b border-ink-800/20 last:border-0 hover:bg-ink-800/30 bg-ink-950/5 dark:bg-ink-950/20">
                        <td className="py-2.5 pl-2 pr-2 text-xs text-mist-400 opacity-50 text-center">↳</td>
                        <td className="py-2.5 pr-2 text-xs opacity-80 whitespace-nowrap">{formatDisplayDate(r.date)}</td>
                        <td className="py-2.5 pr-2 font-medium text-teal-600/70 dark:text-teal-400/70">{r.userId}</td>
                        <td className="py-2.5 pr-2">
                          <Badge tone={r.type === "EOD Report" ? "blue" : "amber"}>{r.type}</Badge>
                        </td>
                        <td className="py-2.5 pr-2 text-xs">
                          {r.type === "Daily Plan" ? (
                            <span className={r.statusStr === "Completed" ? "text-teal-600 dark:text-teal-400" : r.statusStr === "Pending" ? "text-amber-600 dark:text-amber-400" : "text-mist-600 dark:text-mist-500"}>
                              {r.statusStr}
                            </span>
                          ) : (
                            <Badge tone="slate">{r.statusStr}</Badge>
                          )}
                        </td>
                        <td className="py-2.5 pr-2 opacity-80 text-xs max-w-sm" title={r.summary}>
                          <div className="truncate">{r.summary}</div>
                          {r.type === "Daily Plan" && r.statusStr === "Completed" && (r.completedAt || r.notes) && (
                            <div className="text-[10px] mt-1 opacity-70 font-medium">
                              {r.completedAt && <span className="mr-2 text-teal-600 dark:text-teal-400">Date: {r.completedAt.length > 10 ? formatTimestampIndian(r.completedAt) : r.completedAt}</span>}
                              {r.notes && <span className="text-ink-600 dark:text-mist-400 italic">Remark: "{r.notes}"</span>}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 pr-2 text-xs">
                          {r.attachmentUrl ? (
                            <a href={r.attachmentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                              <Paperclip size={12} /> View
                            </a>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                );
              })}
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}


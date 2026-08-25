import { AlertCircle, CheckCircle2, File as FileIcon, Paperclip, Send, Upload, X, Target, Clock, CalendarCheck } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";
import { plansCache, reportsCache, useSheetCache } from "../lib/dataCache";
import { reportsRepo } from "../lib/repo";
import { uploadFile } from "../lib/upload";
import type { EODReport } from "../lib/types";
import { fileToBase64, formatBytes, formatDisplayDate, genId, todayISO } from "../lib/utils";
import { Badge, Button, Card, EmptyState, Input, Label, Spinner, Textarea } from "../components/ui";

const MAX_FILE_BYTES = 8 * 1024 * 1024;

export default function EODReportPage() {
  const { user } = useAuth();
  const today = todayISO();

  const { data: allPlans, error: plansError } = useSheetCache(plansCache);
  const { data: allReports, error: reportsError } = useSheetCache(reportsCache);
  const error = plansError || reportsError;

  const plans = useMemo(
    () =>
      allPlans
        ? allPlans.filter((x) => x.userId.toLowerCase() === (user?.userId ?? "").toLowerCase() && x.date === today)
        : null,
    [allPlans, user, today],
  );
  const reports = useMemo(
    () => (allReports ? allReports.filter((x) => x.userId.toLowerCase() === (user?.userId ?? "").toLowerCase()) : null),
    [allReports, user],
  );

  const [summary, setSummary] = useState("");
  const [highlights, setHighlights] = useState("");
  const [blockers, setBlockers] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [historyFrom, setHistoryFrom] = useState("");
  const [historyTo, setHistoryTo] = useState("");

  const tasksPlanned = plans?.length ?? 0;
  const tasksCompleted = plans?.filter((p) => p.status === "Completed").length ?? 0;
  const alreadySubmittedToday = useMemo(() => (reports ?? []).some((r) => r.date === today), [reports, today]);
  const pastReports = useMemo(() => [...(allReports ?? [])].sort((a, b) => {
    // Sort by date (descending), then by createdAt (descending) so newest is on top
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (a.createdAt || "") < (b.createdAt || "") ? 1 : -1;
  }), [allReports]);
  const filteredPastReports = useMemo(
    () =>
      pastReports.filter((r) => {
        if (historyFrom && r.date < historyFrom) return false;
        if (historyTo && r.date > historyTo) return false;
        return true;
      }),
    [pastReports, historyFrom, historyTo],
  );

  function pickFile(f: File | null) {
    if (!f) return setFile(null);
    if (f.size > MAX_FILE_BYTES) {
      toast.error(`"${f.name}" is ${formatBytes(f.size)} — please keep attachments under ${formatBytes(MAX_FILE_BYTES)}.`);
      return;
    }
    setFile(f);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!summary.trim()) {
      toast.error("Please add a summary of your day.");
      return;
    }
    setSubmitting(true);
    try {
      let fileUrl = "";
      let fileName = "";
      if (file) {
        const base64 = await fileToBase64(file);
        fileUrl = await uploadFile(base64, file.name, file.type || "application/octet-stream");
        fileName = file.name;
      }

      const newReport: Omit<EODReport, "_id" | "createdAt"> = {
        reportId: genId("eod"),
        date: today,
        userId: user.userId,
        summary: summary.trim(),
        highlights: highlights.trim(),
        blockers: blockers.trim(),
        tasksPlanned,
        tasksCompleted,
        fileUrl,
        fileName,
      };
      const created = await reportsRepo.create(newReport);
      reportsCache.mutate((cur) => [...(cur ?? []), created]);

      toast.success("EOD report submitted successfully!");
      setSummary("");
      setHighlights("");
      setBlockers("");
      setFile(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit report");
    } finally {
      setSubmitting(false);
    }
  }

  const loading = plans === null || reports === null;
  const progressPct = tasksPlanned > 0 ? Math.round((tasksCompleted / tasksPlanned) * 100) : 0;

  return (
    <div className="space-y-8 pb-12 animate-in fade-in zoom-in-95 duration-300">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-teal-500 to-blue-500 dark:from-teal-400 dark:to-blue-400 bg-clip-text text-transparent inline-flex items-center gap-3">
            <CalendarCheck className="text-teal-500 dark:text-teal-400" size={32} />
            EOD Report
          </h2>
          <p className="mt-2 text-sm md:text-base text-mist-600 dark:text-mist-400 font-medium max-w-lg">
            Wrap up <b className="text-ink-900 dark:text-white">{formatDisplayDate(today)}</b> with a quick, professional summary for the team.
          </p>
        </div>
        
        {tasksPlanned > 0 && (
          <div className="glass bg-white/50 dark:bg-ink-900/40 border border-ink-200 dark:border-white/10 rounded-2xl p-4 flex items-center gap-5 shadow-sm">
            <div>
              <p className="text-[10px] sm:text-[11px] uppercase tracking-widest font-bold text-mist-500 dark:text-mist-400 mb-1">Today's Progress</p>
              <p className="text-sm sm:text-base font-bold text-ink-900 dark:text-white">
                <span className="text-teal-600 dark:text-teal-400">{tasksCompleted}</span> / {tasksPlanned} Tasks Done
              </p>
            </div>
            <div className="w-14 h-14 rounded-full flex items-center justify-center relative bg-ink-100 dark:bg-ink-800/50">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle cx="28" cy="28" r="24" fill="none" className="stroke-ink-200 dark:stroke-ink-700" strokeWidth="4" />
                <circle 
                  cx="28" cy="28" r="24" fill="none" 
                  className="stroke-teal-500 dark:stroke-teal-400 transition-all duration-1000 ease-out" 
                  strokeWidth="4" 
                  strokeLinecap="round"
                  strokeDasharray="150" 
                  strokeDashoffset={150 - (150 * (progressPct / 100))} 
                />
              </svg>
              <span className="text-[11px] sm:text-xs font-bold text-teal-700 dark:text-teal-300">{progressPct}%</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <Card className="border-rose-500/30 bg-rose-50/50 dark:bg-rose-500/5">
          <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 font-medium p-2">
            <AlertCircle size={20} />
            <p className="text-sm">{error}</p>
          </div>
        </Card>
      )}

      {loading && !error ? (
        <div className="flex justify-center py-32 text-mist-500">
          <Spinner size={32} />
        </div>
      ) : alreadySubmittedToday ? (
        <Card glow="teal" className="bg-teal-50/50 dark:bg-teal-500/5 border-teal-200 dark:border-teal-500/20 py-10">
          <div className="flex flex-col items-center justify-center text-center gap-4">
            <div className="w-16 h-16 bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 rounded-full flex items-center justify-center mb-2">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-ink-900 dark:text-white mb-2">Report Submitted Successfully</h3>
              <p className="text-sm text-mist-600 dark:text-mist-400 max-w-md mx-auto">
                Excellent work today! Your EOD report has been safely recorded. You can review it in the timeline below.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card glow="blue" className="p-1 sm:p-2">
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-8">
            {/* Form Section 1: Summary */}
            <div className="space-y-2">
              <Label htmlFor="summary" className="flex items-center gap-2 text-ink-900 dark:text-mist-100 font-bold text-sm sm:text-base">
                <Target size={18} className="text-blue-500 dark:text-blue-400" /> Summary of the day <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                id="summary"
                rows={4}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Briefly describe what you accomplished today..."
                className="text-base min-h-[120px] shadow-sm"
                required
              />
            </div>

            {/* Form Section 3: Attachment */}
            <div className="space-y-2 pt-2 border-t border-ink-200 dark:border-white/5">
              <Label className="flex items-center gap-2 text-ink-900 dark:text-mist-100 font-bold text-sm sm:text-base mb-4 mt-4">
                <Paperclip size={18} className="text-teal-500 dark:text-teal-400" /> Attach a file (Optional)
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <div className="flex items-center gap-4 rounded-2xl border border-teal-200 dark:border-teal-500/30 bg-teal-50/50 dark:bg-teal-500/10 px-5 py-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                  <div className="p-3 bg-teal-100 dark:bg-teal-500/20 rounded-xl">
                    <FileIcon size={24} className="shrink-0 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink-900 dark:text-white mb-0.5">{file.name}</p>
                    <p className="text-xs font-medium text-teal-700 dark:text-teal-300">{formatBytes(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    aria-label="Remove attachment"
                    className="cursor-pointer rounded-full p-2 text-mist-500 hover:bg-white dark:hover:bg-ink-800 hover:text-rose-500 hover:shadow-sm transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    pickFile(e.dataTransfer.files?.[0] ?? null);
                  }}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-all duration-200 group ${
                    dragOver ? "border-blue-400 bg-blue-50/50 dark:bg-blue-500/10 scale-[1.01]" : "border-ink-300 dark:border-ink-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-ink-50/50 dark:hover:bg-ink-900/40"
                  }`}
                >
                  <div className={`p-4 rounded-full transition-colors duration-200 ${dragOver ? "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400" : "bg-ink-100 dark:bg-ink-800 text-mist-400 group-hover:text-blue-500 dark:group-hover:text-blue-400"}`}>
                    <Upload size={28} />
                  </div>
                  <div>
                    <p className="text-base text-ink-900 dark:text-white font-medium mb-1">
                      <span className="text-blue-600 dark:text-blue-400 font-bold group-hover:underline decoration-2 underline-offset-4">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs font-medium text-mist-500 dark:text-mist-400">Maximum file size {formatBytes(MAX_FILE_BYTES)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button 
                type="submit" 
                loading={submitting} 
                icon={<Send size={18} />} 
                className="w-full sm:w-auto px-8 py-3.5 text-base shadow-lg shadow-teal-500/20 dark:shadow-teal-500/10 hover:shadow-teal-500/30"
              >
                Submit Professional Report
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Report History */}
      <div className="pt-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-xl font-bold text-ink-900 dark:text-white flex items-center gap-2">
            <Clock className="text-mist-400" size={24} /> Report History
          </h3>
          {pastReports.length > 0 && (
            <Badge tone="teal" className="text-[11px] px-3 py-1 bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-300 border-0">
              {filteredPastReports.length} Submitted
            </Badge>
          )}
        </div>

        {pastReports.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Input type="date" value={historyFrom} onChange={(e) => setHistoryFrom(e.target.value)} className="py-1 px-2 text-xs rounded-lg w-36" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-mist-500 dark:text-mist-400">to</span>
            <Input type="date" value={historyTo} onChange={(e) => setHistoryTo(e.target.value)} className="py-1 px-2 text-xs rounded-lg w-36" />
            {(historyFrom || historyTo) && (
              <button
                type="button"
                onClick={() => {
                  setHistoryFrom("");
                  setHistoryTo("");
                }}
                className="text-[11px] font-semibold uppercase tracking-wide text-teal-600 dark:text-teal-400 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {loading ? null : pastReports.length === 0 ? (
          <EmptyState icon={<FileIcon size={32} />} title="No history available" subtitle="Your submitted EOD reports will appear here." />
        ) : filteredPastReports.length === 0 ? (
          <EmptyState icon={<FileIcon size={32} />} title="No reports in this range" subtitle="Try adjusting the date filter." />
        ) : (
          <Card className="p-1 sm:p-2">
            <div className="p-4 sm:p-5">
              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {filteredPastReports.map((r) => (
                  <div key={r._id} className="border border-ink-200 dark:border-ink-800/60 rounded-xl p-4 space-y-3 bg-white/50 dark:bg-ink-900/20 shadow-sm">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="text-sm font-bold text-ink-900 dark:text-white">{formatDisplayDate(r.date)}</p>
                        <p className="text-[11px] text-mist-500 font-medium uppercase tracking-wider">{r.userId}</p>
                      </div>
                      <Badge tone="teal" className="text-[11px] px-2.5 py-1 bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-300 border-0 shrink-0">
                        {r.tasksCompleted} / {r.tasksPlanned}
                      </Badge>
                    </div>
                    <p className="text-sm text-ink-800 dark:text-mist-200 leading-relaxed whitespace-pre-wrap">{r.summary}</p>
                    {r.fileUrl ? (
                      <a
                        href={r.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-ink-50 hover:bg-ink-100 dark:bg-ink-800/50 dark:hover:bg-ink-800 text-xs font-bold text-blue-700 dark:text-blue-400 transition-colors"
                      >
                        {(r.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i) || r.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)) ? (
                          <img src={r.fileUrl} alt="Preview" className="w-6 h-6 object-cover rounded shadow-sm" />
                        ) : (
                          <Paperclip size={14} className="text-blue-500" />
                        )}
                        <span className="truncate max-w-[200px]">{r.fileName || "View Attachment"}</span>
                      </a>
                    ) : (
                      <span className="text-xs text-mist-400">No attachment</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full min-w-160 text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink-700/60 text-[11px] text-mist-500 dark:text-mist-400 font-semibold uppercase tracking-wide">
                      <th className="py-2 pr-2 font-medium">Date</th>
                      <th className="py-2 pr-2 font-medium">Submitted By</th>
                      <th className="py-2 pr-2 font-medium">Summary</th>
                      <th className="py-2 pr-2 font-medium">Tasks</th>
                      <th className="py-2 pr-2 font-medium">Attachment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPastReports.map((r) => (
                      <tr key={r._id} className="border-b border-ink-800/60 last:border-0 hover:bg-ink-800/10 dark:hover:bg-ink-800/30 align-top">
                        <td className="py-3 pr-2 text-xs font-semibold text-ink-900 dark:text-white whitespace-nowrap">{formatDisplayDate(r.date)}</td>
                        <td className="py-3 pr-2 text-xs text-mist-500 dark:text-mist-400 uppercase tracking-wide whitespace-nowrap">{r.userId}</td>
                        <td className="py-3 pr-2 max-w-md text-ink-800 dark:text-mist-200 leading-relaxed whitespace-pre-wrap">{r.summary}</td>
                        <td className="py-3 pr-2 whitespace-nowrap">
                          <Badge tone="teal" className="text-[11px] px-2.5 py-1 bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-300 border-0">
                            {r.tasksCompleted} / {r.tasksPlanned}
                          </Badge>
                        </td>
                        <td className="py-3 pr-2">
                          {r.fileUrl ? (
                            <a
                              href={r.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:underline text-xs font-bold"
                            >
                              {(r.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i) || r.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)) ? (
                                <img src={r.fileUrl} alt="Preview" className="w-6 h-6 object-cover rounded shadow-sm" />
                              ) : (
                                <Paperclip size={14} />
                              )}
                              <span className="truncate max-w-[160px]">{r.fileName || "View file"}</span>
                            </a>
                          ) : (
                            <span className="text-xs text-mist-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, File as FileIcon, Paperclip, Send, Upload, X, Target, Star, AlertTriangle, Clock, CalendarCheck } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";
import { plansCache, reportsCache, useSheetCache } from "../lib/dataCache";
import { reportsRepo } from "../lib/repo";
import { uploadFile } from "../lib/upload";
import type { EODReport } from "../lib/types";
import { fileToBase64, formatBytes, formatDisplayDate, genId, todayISO } from "../lib/utils";
import { Badge, Button, Card, EmptyState, Label, Spinner, Textarea } from "../components/ui";

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

  const tasksPlanned = plans?.length ?? 0;
  const tasksCompleted = plans?.filter((p) => p.status === "Completed").length ?? 0;
  const alreadySubmittedToday = useMemo(() => (reports ?? []).some((r) => r.date === today), [reports, today]);
  const pastReports = useMemo(() => [...(allReports ?? [])].sort((a, b) => {
    // Sort by date (descending), then by createdAt (descending) so newest is on top
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (a.createdAt || "") < (b.createdAt || "") ? 1 : -1;
  }), [allReports]);

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

            {/* Form Section 2: Highlights & Blockers Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-2">
                <Label htmlFor="highlights" className="flex items-center gap-2 text-ink-900 dark:text-mist-100 font-bold text-sm sm:text-base">
                  <Star size={18} className="text-amber-500 dark:text-amber-400" /> Highlights / Wins
                </Label>
                <Textarea
                  id="highlights"
                  rows={3}
                  value={highlights}
                  onChange={(e) => setHighlights(e.target.value)}
                  placeholder="Any notable achievements or call-outs?"
                  className="shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="blockers" className="flex items-center gap-2 text-ink-900 dark:text-mist-100 font-bold text-sm sm:text-base">
                  <AlertTriangle size={18} className="text-rose-500 dark:text-rose-400" /> Blockers / Pending
                </Label>
                <Textarea
                  id="blockers"
                  rows={3}
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                  placeholder="What's holding you up, or carrying over to tomorrow?"
                  className="shadow-sm border-rose-100 dark:border-rose-900/30 focus:border-rose-400 dark:focus:border-rose-400"
                />
              </div>
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

      {/* Report History Timeline */}
      <div className="pt-8">
        <h3 className="mb-6 text-xl font-bold text-ink-900 dark:text-white flex items-center gap-2">
          <Clock className="text-mist-400" size={24} /> Report Timeline
        </h3>
        
        {loading ? null : pastReports.length === 0 ? (
          <EmptyState icon={<FileIcon size={32} />} title="No history available" subtitle="Your submitted EOD reports will appear here." />
        ) : (
          <div className="relative border-l-2 border-ink-200 dark:border-ink-800 ml-4 md:ml-6 space-y-8 pb-4">
            <AnimatePresence>
              {pastReports.map((r, i) => (
                <motion.div
                  key={r._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(i * 0.05, 0.4), type: "spring", stiffness: 100 }}
                  className="relative pl-6 md:pl-8 group"
                >
                  {/* Timeline dot */}
                  <div className="absolute w-4 h-4 rounded-full bg-white dark:bg-ink-950 border-2 border-teal-500 dark:border-teal-400 -left-[9px] top-1.5 shadow-[0_0_0_4px_rgba(255,255,255,1)] dark:shadow-[0_0_0_4px_rgba(13,20,36,1)] group-hover:scale-125 transition-transform" />
                  
                  <Card className="hover:border-ink-300 dark:hover:border-white/10 transition-colors bg-white/40 dark:bg-ink-900/20 shadow-sm hover:shadow-md">
                    <div className="p-4 sm:p-5">
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-bold text-ink-900 dark:text-white mb-0.5">{formatDisplayDate(r.date)}</p>
                          <p className="text-xs text-mist-500 font-medium uppercase tracking-wider">Submitted by {r.userId}</p>
                        </div>
                        <Badge tone="teal" className="text-[11px] px-3 py-1 bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-300 border-0">
                          {r.tasksCompleted} / {r.tasksPlanned} Tasks Completed
                        </Badge>
                      </div>
                      
                      <div className="space-y-4 text-sm">
                        <div>
                          <p className="text-ink-800 dark:text-mist-200 leading-relaxed whitespace-pre-wrap">{r.summary}</p>
                        </div>
                        
                        {r.highlights && (
                          <div className="bg-amber-50/50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10 p-3 rounded-xl flex gap-3">
                            <Star size={16} className="text-amber-500 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-amber-800 dark:text-amber-500 mb-0.5 uppercase tracking-wider">Highlights</p>
                              <p className="text-amber-900 dark:text-amber-200/90 leading-relaxed">{r.highlights}</p>
                            </div>
                          </div>
                        )}
                        
                        {r.blockers && (
                          <div className="bg-rose-50/50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/10 p-3 rounded-xl flex gap-3">
                            <AlertTriangle size={16} className="text-rose-500 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-rose-800 dark:text-rose-500 mb-0.5 uppercase tracking-wider">Blockers</p>
                              <p className="text-rose-900 dark:text-rose-200/90 leading-relaxed">{r.blockers}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {r.fileUrl && (
                        <div className="mt-4 pt-4 border-t border-ink-100 dark:border-white/5">
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
                            <span className="truncate max-w-[200px] sm:max-w-xs">{r.fileName || "View Attachment"}</span>
                          </a>
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

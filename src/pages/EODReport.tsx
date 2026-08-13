import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, File as FileIcon, Paperclip, Send, Upload, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";
import { plansCache, reportsCache, useSheetCache } from "../lib/dataCache";
import { reportsRepo } from "../lib/repo";
import { uploadFile } from "../lib/upload";
import type { EODReport } from "../lib/types";
import { fileToBase64, formatBytes, formatDisplayDate, genId, todayISO } from "../lib/utils";
import { Badge, Button, Card, EmptyState, Label, Spinner, Textarea } from "../components/ui";

const MAX_FILE_BYTES = 8 * 1024 * 1024; // Apps Script POST bodies have practical size limits; keep uploads modest.
const DRIVE_FOLDER_ID = import.meta.env.VITE_DRIVE_FOLDER_ID;

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
  const pastReports = useMemo(() => [...(reports ?? [])].sort((a, b) => (a.date < b.date ? 1 : -1)), [reports]);

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
        if (!DRIVE_FOLDER_ID) throw new Error("Drive folder is not configured (VITE_DRIVE_FOLDER_ID).");
        const base64 = await fileToBase64(file);
        fileUrl = await uploadFile(base64, file.name, file.type || "application/octet-stream", DRIVE_FOLDER_ID);
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

      toast.success("EOD report submitted");
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-mist-100">EOD Report</h2>
        <p className="mt-1 text-sm text-mist-500">Wrap up {formatDisplayDate(today)} with a quick summary for the team.</p>
      </div>

      {error && (
        <Card className="border-rose-500/30">
          <div className="flex items-center gap-2 text-rose-300">
            <AlertCircle size={16} />
            <p className="text-sm">{error}</p>
          </div>
        </Card>
      )}

      {loading && !error ? (
        <div className="flex justify-center py-24 text-mist-500">
          <Spinner size={28} />
        </div>
      ) : alreadySubmittedToday ? (
        <Card glow="teal">
          <div className="flex items-center gap-3 text-teal-300">
            <CheckCircle2 size={22} />
            <div>
              <p className="text-sm font-semibold">You've already submitted today's report.</p>
              <p className="text-xs text-mist-500">Nice work — see it in the history below.</p>
            </div>
          </div>
        </Card>
      ) : (
        <Card glow="teal">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex flex-wrap gap-3 text-xs text-mist-400">
              <Badge tone="teal">
                {tasksCompleted}/{tasksPlanned} planned tasks done today
              </Badge>
            </div>

            <div>
              <Label htmlFor="summary">Summary of the day *</Label>
              <Textarea
                id="summary"
                rows={4}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="What did you work on today?"
                required
              />
            </div>

            <div>
              <Label htmlFor="highlights">Highlights / wins</Label>
              <Textarea
                id="highlights"
                rows={2}
                value={highlights}
                onChange={(e) => setHighlights(e.target.value)}
                placeholder="Anything worth calling out?"
              />
            </div>

            <div>
              <Label htmlFor="blockers">Blockers / pending items</Label>
              <Textarea
                id="blockers"
                rows={2}
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                placeholder="What's holding you up, or carrying over to tomorrow?"
              />
            </div>

            <div>
              <Label>Attach a file (optional)</Label>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
              {file ? (
                <div className="flex items-center gap-3 rounded-xl border border-ink-600 bg-ink-900/40 px-4 py-3">
                  <FileIcon size={18} className="shrink-0 text-teal-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-mist-100">{file.name}</p>
                    <p className="text-xs text-mist-500">{formatBytes(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    aria-label="Remove attachment"
                    className="cursor-pointer rounded-lg p-1.5 text-mist-500 hover:bg-rose-500/10 hover:text-rose-400"
                  >
                    <X size={15} />
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
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors duration-150 ${
                    dragOver ? "border-teal-400 bg-teal-500/5" : "border-ink-600 hover:border-ink-500"
                  }`}
                >
                  <Upload size={22} className="text-mist-500" />
                  <p className="text-sm text-mist-300">
                    <span className="font-medium text-teal-400">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-mist-500">Up to {formatBytes(MAX_FILE_BYTES)} — saved to the team Drive folder</p>
                </div>
              )}
            </div>

            <Button type="submit" loading={submitting} icon={<Send size={16} />}>
              Submit EOD report
            </Button>
          </form>
        </Card>
      )}

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-mist-100">Report history</h3>
        {loading ? null : pastReports.length === 0 ? (
          <EmptyState icon={<Paperclip size={28} />} title="No reports submitted yet" />
        ) : (
          <ul className="space-y-3">
            <AnimatePresence>
              {pastReports.map((r, i) => (
                <motion.li
                  key={r._id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3) }}
                  className="rounded-xl border border-ink-700/50 px-4 py-3.5"
                >
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-mist-100">{formatDisplayDate(r.date)}</p>
                    <Badge tone="teal">
                      {r.tasksCompleted}/{r.tasksPlanned} tasks
                    </Badge>
                  </div>
                  <p className="text-sm text-mist-300">{r.summary}</p>
                  {r.blockers && <p className="mt-1 text-xs text-amber-400/90">Blockers: {r.blockers}</p>}
                  {r.fileUrl && (
                    <a
                      href={r.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-teal-400 hover:text-teal-300"
                    >
                      {(r.fileName?.match(/\.(jpg|jpeg|png|gif|webp)$/i) || r.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)) ? (
                        <img src={r.fileUrl} alt="Preview" className="w-8 h-8 object-cover rounded" />
                      ) : (
                        <Paperclip size={12} />
                      )}
                      <span>{r.fileName || "Attachment"}</span>
                    </a>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Card>
    </div>
  );
}

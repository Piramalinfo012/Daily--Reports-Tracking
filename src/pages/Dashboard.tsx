import { motion } from "framer-motion";
import { CheckCircle2, Circle, Flame, ListTodo, FileText, ArrowRight, AlertCircle } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { plansCache, reportsCache, useSheetCache } from "../lib/dataCache";
import type { EODReport, PlanTask } from "../lib/types";
import { formatDisplayDate, toLocalISODate, todayISO } from "../lib/utils";
import { Badge, Button, Card, EmptyState, ProgressBar, Spinner } from "../components/ui";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: allPlans, error: plansError } = useSheetCache(plansCache);
  const { data: allReports, error: reportsError } = useSheetCache(reportsCache);
  const error = plansError || reportsError;

  const plans = useMemo(
    () => (allPlans ? allPlans.filter((x) => x.userId.toLowerCase() === (user?.userId ?? "").toLowerCase()) : null),
    [allPlans, user],
  );
  const reports = useMemo(
    () => (allReports ? allReports.filter((x) => x.userId.toLowerCase() === (user?.userId ?? "").toLowerCase()) : null),
    [allReports, user],
  );

  const today = todayISO();
  const todaysPlans = useMemo(() => (plans ?? []).filter((p) => p.date === today), [plans, today]);
  const completedToday = todaysPlans.filter((p) => p.status === "Completed").length;
  const pct = todaysPlans.length ? Math.round((completedToday / todaysPlans.length) * 100) : 0;

  const streak = useMemo(() => computeStreak(reports ?? []), [reports]);
  const recentReports = useMemo(() => [...(reports ?? [])].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5), [reports]);
  const todaysReportSubmitted = (reports ?? []).some((r) => r.date === today);

  const loading = plans === null || reports === null;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h2 className="text-2xl font-semibold text-mist-100">
          Hey {user?.name?.split(" ")[0]} 👋
        </h2>
        <p className="mt-1 text-sm text-mist-500">{formatDisplayDate(today)} — here's where your day stands.</p>
      </motion.div>

      {error && (
        <Card className="border-rose-500/30">
          <div className="flex items-center gap-2 text-rose-300">
            <AlertCircle size={16} />
            <p className="text-sm">{error}</p>
          </div>
        </Card>
      )}

      {loading && !error ? (
        <div className="flex items-center justify-center py-24 text-mist-500">
          <Spinner size={28} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              icon={<ListTodo size={18} />}
              label="Today's progress"
              value={todaysPlans.length ? `${completedToday}/${todaysPlans.length}` : "—"}
              tone="teal"
              footer={<ProgressBar value={pct} className="mt-3" />}
            />
            <StatCard
              icon={<Flame size={18} />}
              label="EOD streak"
              value={`${streak} day${streak === 1 ? "" : "s"}`}
              tone="amber"
              footer={<p className="mt-3 text-xs text-mist-500">Consecutive days with a submitted report</p>}
            />
            <StatCard
              icon={<FileText size={18} />}
              label="Today's EOD report"
              value={todaysReportSubmitted ? "Submitted" : "Pending"}
              tone={todaysReportSubmitted ? "teal" : "amber"}
              footer={
                !todaysReportSubmitted && (
                  <Link to="/report" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-amber-400 hover:text-amber-300">
                    Submit now <ArrowRight size={12} />
                  </Link>
                )
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-mist-100">Today's plan</h3>
                <Link to="/tracker">
                  <Button variant="ghost" className="!px-2.5 !py-1.5 text-xs">
                    Open tracker <ArrowRight size={12} />
                  </Button>
                </Link>
              </div>

              {todaysPlans.length === 0 ? (
                <EmptyState
                  icon={<ListTodo size={28} />}
                  title="No plan for today yet"
                  subtitle="Head to Daily Tracker each morning to lay out what you want to get done."
                />
              ) : (
                <ul className="space-y-2">
                  {todaysPlans.map((p, i) => (
                    <motion.li
                      key={p._id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 rounded-xl border border-ink-700/50 px-3.5 py-2.5"
                    >
                      {p.status === "Completed" ? (
                        <CheckCircle2 size={18} className="shrink-0 text-teal-400" />
                      ) : (
                        <Circle size={18} className="shrink-0 text-mist-600" />
                      )}
                      <span className={`flex-1 truncate text-sm ${p.status === "Completed" ? "text-mist-500 line-through" : "text-mist-100"}`}>
                        {p.task}
                      </span>
                      <PriorityBadge priority={p.priority} />
                    </motion.li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-mist-100">Recent EOD reports</h3>
                <Link to="/report">
                  <Button variant="ghost" className="!px-2.5 !py-1.5 text-xs">
                    View all <ArrowRight size={12} />
                  </Button>
                </Link>
              </div>

              {recentReports.length === 0 ? (
                <EmptyState icon={<FileText size={28} />} title="No reports yet" subtitle="Your submitted EOD reports will show up here." />
              ) : (
                <ul className="space-y-3">
                  {recentReports.map((r, i) => (
                    <motion.li
                      key={r._id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="rounded-xl border border-ink-700/50 px-3.5 py-3"
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-xs font-medium text-mist-400">{formatDisplayDate(r.date)}</p>
                        <Badge tone="teal">
                          {r.tasksCompleted}/{r.tasksPlanned} done
                        </Badge>
                      </div>
                      <p className="line-clamp-2 text-sm text-mist-200">{r.summary}</p>
                    </motion.li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
  footer,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "teal" | "amber";
  footer?: React.ReactNode;
}) {
  return (
    <Card glow={tone}>
      <div className="flex items-center gap-2 text-mist-400">
        <span className={tone === "teal" ? "text-teal-400" : "text-amber-400"}>{icon}</span>
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold text-mist-100">{value}</p>
      {footer}
    </Card>
  );
}

function PriorityBadge({ priority }: { priority: PlanTask["priority"] }) {
  const tone = priority === "High" ? "rose" : priority === "Medium" ? "amber" : "slate";
  return <Badge tone={tone}>{priority}</Badge>;
}

function computeStreak(reports: EODReport[]): number {
  const dates = new Set(reports.map((r) => r.date));
  let streak = 0;
  const cursor = new Date();
  // If today has no report yet, start counting from yesterday so an
  // in-progress day doesn't zero out an active streak.
  if (!dates.has(todayISO())) cursor.setDate(cursor.getDate() - 1);

  for (;;) {
    const iso = toLocalISODate(cursor);
    if (!dates.has(iso)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Circle, Plus, Sunrise, Sunset, Trash2, AlertCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";
import { plansCache, useSheetCache } from "../lib/dataCache";
import { plansRepo } from "../lib/repo";
import type { PlanTask, Priority } from "../lib/types";
import { genId, getDaypart, todayISO } from "../lib/utils";
import { Badge, Button, Card, EmptyState, Input, Spinner, Textarea } from "../components/ui";

const PRIORITIES: Priority[] = ["Low", "Medium", "High"];

export default function DailyTracker() {
  const { user } = useAuth();
  const { data: allPlans, error } = useSheetCache(plansCache);
  const [mode, setMode] = useState<"morning" | "evening">(getDaypart() === "evening" ? "evening" : "morning");

  const [taskText, setTaskText] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [adding, setAdding] = useState(false);
  const [busyRow, setBusyRow] = useState<string | null>(null);

  const today = todayISO();

  const plans = useMemo(
    () =>
      allPlans
        ? allPlans.filter((p) => p.userId.toLowerCase() === (user?.userId ?? "").toLowerCase() && p.date === today)
        : null,
    [allPlans, user, today],
  );

  const sorted = useMemo(() => {
    if (!plans) return [];
    const rank: Record<Priority, number> = { High: 0, Medium: 1, Low: 2 };
    return [...plans].sort((a, b) => rank[a.priority] - rank[b.priority]);
  }, [plans]);

  const completed = sorted.filter((p) => p.status === "Completed").length;

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !taskText.trim()) return;

    const newTask: Omit<PlanTask, "_id" | "createdAt"> = {
      planId: genId("plan"),
      date: today,
      userId: user.userId,
      task: taskText.trim(),
      priority,
      status: "Pending",
      notes: "",
      completedAt: "",
    };

    plansCache.mutate((cur) => [...(cur ?? []), { ...newTask, _id: "__optimistic__", createdAt: new Date().toISOString() }]);
    setTaskText("");
    setPriority("Medium");
    setAdding(true);
    try {
      const created = await plansRepo.create(newTask);
      // Replace optimistic entry with server-confirmed entry (has real _id)
      plansCache.mutate((cur) => (cur ?? []).map((x) => (x._id === "__optimistic__" ? created : x)));
      toast.success("Task added to today's plan");
    } catch (e) {
      plansCache.mutate((cur) => (cur ?? []).filter((p) => p._id !== "__optimistic__"));
      toast.error(e instanceof Error ? e.message : "Could not add task");
    } finally {
      setAdding(false);
    }
  }

  async function toggleStatus(p: PlanTask) {
    const nextStatus = p.status === "Completed" ? "Pending" : "Completed";
    const completedAt = nextStatus === "Completed" ? new Date().toISOString() : "";

    plansCache.mutate((cur) => (cur ?? []).map((x) => (x._id === p._id ? { ...x, status: nextStatus, completedAt } : x)));
    setBusyRow(p._id);
    try {
      await plansRepo.setStatus(p._id, nextStatus, completedAt);
    } catch (e) {
      plansCache.mutate((cur) => (cur ?? []).map((x) => (x._id === p._id ? { ...x, status: p.status, completedAt: p.completedAt } : x)));
      toast.error(e instanceof Error ? e.message : "Could not update task");
    } finally {
      setBusyRow(null);
    }
  }

  async function removeTask(p: PlanTask) {
    setBusyRow(p._id);
    plansCache.mutate((cur) => (cur ?? []).filter((x) => x._id !== p._id));
    try {
      await plansRepo.remove(p._id);
      toast.success("Task removed");
    } catch (e) {
      plansCache.refresh(true); // restore true state after a failed optimistic removal
      toast.error(e instanceof Error ? e.message : "Could not remove task");
    } finally {
      setBusyRow(null);
    }
  }

  async function saveNotes(p: PlanTask, notes: string) {
    plansCache.mutate((cur) => (cur ?? []).map((x) => (x._id === p._id ? { ...x, notes } : x)));
    try {
      await plansRepo.setNotes(p._id, notes);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save notes");
    }
  }

  const loading = plans === null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-mist-100">Daily Tracker</h2>
          <p className="mt-1 text-sm text-mist-500">
            {sorted.length > 0 ? `${completed} of ${sorted.length} tasks completed today` : "Lay out your plan, then close the loop tonight."}
          </p>
        </div>

        <div className="flex rounded-xl border border-ink-700/60 p-1 text-sm">
          <ModeButton active={mode === "morning"} onClick={() => setMode("morning")} icon={<Sunrise size={14} />} label="Morning Plan" />
          <ModeButton active={mode === "evening"} onClick={() => setMode("evening")} icon={<Sunset size={14} />} label="Evening Review" />
        </div>
      </div>

      {error && (
        <Card className="border-rose-500/30">
          <div className="flex items-center gap-2 text-rose-300">
            <AlertCircle size={16} />
            <p className="text-sm">{error}</p>
          </div>
        </Card>
      )}

      <AnimatePresence mode="wait">
        {mode === "morning" ? (
          <motion.div key="morning" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.2 }}>
            <Card glow="teal">
              <form onSubmit={handleAddTask} className="flex flex-col gap-3 sm:flex-row">
                <Input
                  value={taskText}
                  onChange={(e) => setTaskText(e.target.value)}
                  placeholder="What do you want to get done today?"
                  className="flex-1"
                />
                <div className="flex gap-3">
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="field-surface rounded-xl border border-ink-600 bg-ink-900/60 px-3 py-2.5 text-sm text-mist-100 outline-none focus:border-teal-400"
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p} priority
                      </option>
                    ))}
                  </select>
                  <Button type="submit" loading={adding} icon={<Plus size={16} />} disabled={!taskText.trim()}>
                    Add
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="evening" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
            <Card glow="amber">
              <p className="text-sm text-mist-400">
                Check off what you finished, and jot a quick note on anything that slipped — it'll help when you write your EOD report.
              </p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card>
        <h3 className="mb-4 text-sm font-semibold text-mist-100">Today's tasks</h3>
        {loading ? (
          <div className="flex justify-center py-14 text-mist-500">
            <Spinner size={26} />
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState icon={<Sunrise size={28} />} title="No tasks yet" subtitle="Add your first task above to start planning your day." />
        ) : (
          <ul className="space-y-2.5">
            {sorted.map((p) => (
              <motion.li
                key={p._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="rounded-xl border border-ink-700/50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleStatus(p)}
                    disabled={busyRow === p._id || p._id === "__optimistic__"}
                    aria-label={p.status === "Completed" ? "Mark as pending" : "Mark as completed"}
                    className="shrink-0 cursor-pointer text-mist-500 transition-colors duration-150 hover:text-teal-400 disabled:opacity-50"
                  >
                    {p._id === "__optimistic__" ? (
                      <Spinner size={16} />
                    ) : p.status === "Completed" ? (
                      <CheckCircle2 size={20} className="text-teal-400" />
                    ) : (
                      <Circle size={20} />
                    )}
                  </button>

                  <span className={`flex-1 text-sm ${p.status === "Completed" ? "text-mist-500 line-through" : "text-mist-100"}`}>{p.task}</span>

                  <PriorityBadge priority={p.priority} />

                  <button
                    onClick={() => removeTask(p)}
                    disabled={busyRow === p._id || p._id === "__optimistic__"}
                    aria-label="Delete task"
                    className="shrink-0 cursor-pointer rounded-lg p-1.5 text-mist-600 transition-colors duration-150 hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {mode === "evening" && (
                  <div className="mt-3 pl-8">
                    <NotesField initial={p.notes} onSave={(notes) => saveNotes(p, notes)} />
                  </div>
                )}
              </motion.li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ModeButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-medium transition-colors duration-200 cursor-pointer ${
        active ? "text-ink-950" : "text-mist-400 hover:text-mist-200"
      }`}
    >
      {active && (
        <motion.span
          className="absolute inset-0 rounded-lg bg-gradient-to-r from-teal-400 to-teal-500"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
        />
      )}
      <span className="relative z-10 flex items-center gap-1.5">
        {icon}
        {label}
      </span>
    </button>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const tone = priority === "High" ? "rose" : priority === "Medium" ? "amber" : "slate";
  return <Badge tone={tone}>{priority}</Badge>;
}

function NotesField({ initial, onSave }: { initial: string; onSave: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(true);

  return (
    <div className="flex items-start gap-2">
      <Textarea
        rows={1}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        placeholder="Add a note (blocker, follow-up, context)…"
        className="!py-2 text-xs"
      />
      <Button
        variant="ghost"
        className="!px-2.5 !py-2 text-xs"
        onClick={() => {
          onSave(value);
          setSaved(true);
        }}
        disabled={saved}
      >
        Save
      </Button>
    </div>
  );
}

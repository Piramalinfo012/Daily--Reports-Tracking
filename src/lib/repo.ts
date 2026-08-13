import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "./apiClient";
import {
  type EODReport,
  type MdReportEntry,
  type PlanTask,
  type User,
} from "./types";

/**
 * Repository layer — one object per collection.
 * Each method maps to an Express REST endpoint in server/routes/.
 * No sheet-row concepts: MongoDB _id is used for all updates/deletes.
 */

// ── Users ─────────────────────────────────────────────────────────────────────

export const usersRepo = {
  async all(): Promise<User[]> {
    return apiGet<User[]>("/api/users");
  },

  async create(user: Omit<User, "_id" | "createdAt">): Promise<User> {
    return apiPost<User>("/api/users", user);
  },

  async update(_id: string, patch: Partial<Omit<User, "_id">>): Promise<User> {
    return apiPut<User>(`/api/users/${_id}`, patch);
  },

  async touchLastLogin(_id: string, iso: string): Promise<void> {
    await apiPatch(`/api/users/${_id}/lastLogin`, { lastLogin: iso });
  },
};

// ── Plans ─────────────────────────────────────────────────────────────────────

export const plansRepo = {
  async all(): Promise<PlanTask[]> {
    return apiGet<PlanTask[]>("/api/plans");
  },

  async create(plan: Omit<PlanTask, "_id" | "createdAt">): Promise<PlanTask> {
    return apiPost<PlanTask>("/api/plans", plan);
  },

  async setStatus(
    _id: string,
    status: PlanTask["status"],
    completedAt: string,
  ): Promise<void> {
    await apiPut(`/api/plans/${_id}`, { status, completedAt });
  },

  async setNotes(_id: string, notes: string): Promise<void> {
    await apiPut(`/api/plans/${_id}`, { notes });
  },

  async remove(_id: string): Promise<void> {
    await apiDelete(`/api/plans/${_id}`);
  },
};

// ── EOD Reports ───────────────────────────────────────────────────────────────

export const reportsRepo = {
  async all(): Promise<EODReport[]> {
    return apiGet<EODReport[]>("/api/reports");
  },

  async create(
    report: Omit<EODReport, "_id" | "createdAt">,
  ): Promise<EODReport> {
    return apiPost<EODReport>("/api/reports", report);
  },
};

// ── MD Reports ────────────────────────────────────────────────────────────────

export const mdReportsRepo = {
  async all(): Promise<MdReportEntry[]> {
    return apiGet<MdReportEntry[]>("/api/md-reports");
  },

  async create(
    entry: Omit<MdReportEntry, "_id">,
  ): Promise<MdReportEntry> {
    return apiPost<MdReportEntry>("/api/md-reports", entry);
  },

  async updateCategory(_id: string, category: string): Promise<void> {
    await apiPut(`/api/md-reports/${_id}`, { category });
  },

  async updateCompletion(
    _id: string,
    completedDate: string,
    completedFileUrl: string,
    completedRemark: string,
  ): Promise<void> {
    await apiPut(`/api/md-reports/${_id}`, {
      category: "Completed",
      completedDate,
      completedFileUrl,
      completedRemark,
    });
  },

  async updateEntry(
    _id: string,
    patch: Partial<Omit<MdReportEntry, "_id">>,
  ): Promise<void> {
    await apiPut(`/api/md-reports/${_id}`, patch);
  },

  async deleteEntry(_id: string): Promise<void> {
    await apiDelete(`/api/md-reports/${_id}`);
  },
};

// ── Master (working persons) ──────────────────────────────────────────────────
export const masterRepo = {
  async personNames(): Promise<string[]> {
    const persons = await apiGet<any[]>("/api/working-persons");
    return persons.map((p) => p.name).filter(Boolean);
  },
  
  async addPersonName(name: string): Promise<void> {
    await apiPost("/api/working-persons", { name });
  },
};

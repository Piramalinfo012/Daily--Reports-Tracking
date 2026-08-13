export type Priority = "Low" | "Medium" | "High";
export type PlanStatus = "Pending" | "Completed" | "Skipped";
export type Role = "Admin" | "Member";

export interface User {
  _id: string; // MongoDB ObjectId (as string)
  name: string;
  userId: string; // login ID / employee code — unique
  password: string;
  lastLogin: string;
  role: Role;
  department: string;
  avatarColor: string;
  avatarUrl?: string;
  allowedPages?: string[];
  createdAt: string;
}

export interface PlanTask {
  _id: string;
  planId: string; // client-generated UUID
  date: string; // YYYY-MM-DD
  userId: string;
  task: string;
  priority: Priority;
  status: PlanStatus;
  notes: string;
  createdAt: string;
  completedAt: string;
}

export interface EODReport {
  _id: string;
  reportId: string; // client-generated UUID
  date: string;
  userId: string;
  summary: string;
  highlights: string;
  blockers: string;
  tasksPlanned: number;
  tasksCompleted: number;
  fileUrl: string;
  fileName: string;
  createdAt: string;
}

export type MdWorkCategory = "Completed" | "Pending" | "Nextday Priority";

export interface MdReportEntry {
  _id: string;
  entryId: string; // client-generated UUID
  timestamp: string; // ISO — log date is derived from this
  category: MdWorkCategory;
  workDescription: string;
  workingPerson: string;
  remarks: string;
  attachmentUrl?: string;
  completedDate?: string;
  completedFileUrl?: string;
  completedRemark?: string;
}

/** Collection names — kept for reference, not used in fetch calls anymore */
export const COLLECTION_NAMES = {
  users: "users",
  plans: "plans",
  reports: "reports",
  mdReports: "md-reports",
} as const;

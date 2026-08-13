import { useEffect, useState } from "react";
import type { User } from "../lib/types";
import { apiGet, apiPost, apiDelete, apiPut } from "../lib/apiClient";
import { Card, Button, Input, Label, Badge } from "./ui";
import { Users, Trash2, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const ALL_PAGES = ["Dashboard", "Daily Tracker", "EOD Report", "MD Report", "Settings"];

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUserId, setNewUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"Admin" | "Member">("Member");
  const [newDepartment, setNewDepartment] = useState("");
  const [newAllowedPages, setNewAllowedPages] = useState<string[]>([...ALL_PAGES]);

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editAllowedPages, setEditAllowedPages] = useState<string[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const data = await apiGet("/api/users");
      setUsers(data);
    } catch (e) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newName || !newUserId || !newPassword) {
      toast.error("Name, ID, and Password are required");
      return;
    }
    try {
      const newUser = {
        name: newName,
        userId: newUserId,
        password: newPassword,
        role: newRole,
        department: newDepartment,
        allowedPages: newAllowedPages,
        avatarColor: "#" + Math.floor(Math.random() * 16777215).toString(16)
      };
      await apiPost("/api/users", newUser);
      toast.success("User created successfully");
      setShowAddForm(false);
      // Reset form
      setNewName(""); setNewUserId(""); setNewPassword(""); setNewRole("Member"); setNewDepartment(""); setNewAllowedPages([...ALL_PAGES]);
      fetchUsers();
    } catch (e: any) {
      toast.error(e.message || "Failed to create user");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await apiDelete(`/api/users/${id}`);
      toast.success("User deleted");
      fetchUsers();
    } catch (e: any) {
      toast.error("Failed to delete user");
    }
  }

  async function handleSavePermissions(user: User) {
    try {
      await apiPut(`/api/users/${user._id}`, { ...user, allowedPages: editAllowedPages });
      toast.success("Permissions updated");
      setEditingUserId(null);
      fetchUsers();
    } catch (e: any) {
      toast.error("Failed to update permissions");
    }
  }

  const togglePage = (page: string, list: string[], setList: (l: string[]) => void) => {
    if (list.includes(page)) {
      setList(list.filter((p) => p !== page));
    } else {
      setList([...list, page]);
    }
  };

  if (loading) return <div className="text-mist-500 text-sm">Loading users...</div>;

  return (
    <Card className="mt-6 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-500 mb-5">
        <Users size={16} /> Admin Controls: User Management
      </div>

      {!showAddForm ? (
        <Button variant="secondary" onClick={() => setShowAddForm(true)} className="mb-6">
          + Create New User
        </Button>
      ) : (
        <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="glass p-4 rounded-xl mb-6 space-y-4" onSubmit={handleAddUser}>
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-semibold text-mist-100">Add New User</h4>
            <button type="button" onClick={() => setShowAddForm(false)} className="text-mist-500 hover:text-mist-300"><X size={16}/></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Full Name</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. John Doe" />
            </div>
            <div>
              <Label>Login ID</Label>
              <Input value={newUserId} onChange={(e) => setNewUserId(e.target.value)} placeholder="e.g. EMP001" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div>
              <Label>Department</Label>
              <Input value={newDepartment} onChange={(e) => setNewDepartment(e.target.value)} placeholder="e.g. Sales" />
            </div>
            <div>
              <Label>Role</Label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value as "Admin"|"Member")} className="w-full rounded-xl border border-ink-700 bg-transparent px-3 py-2 text-[13px] text-inherit placeholder-mist-600 focus:border-teal-500/50 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all duration-200">
                <option value="Member">Member</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="mt-2">
            <Label>Allowed Pages</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {ALL_PAGES.map((page) => (
                <label key={page} className="flex items-center gap-1.5 text-xs text-mist-300 cursor-pointer bg-ink-800/20 px-2 py-1 rounded">
                  <input type="checkbox" checked={newAllowedPages.includes(page)} onChange={() => togglePage(page, newAllowedPages, setNewAllowedPages)} className="rounded bg-transparent border-ink-600 text-teal-500 focus:ring-teal-500" />
                  {page}
                </label>
              ))}
            </div>
          </div>
          <Button type="submit" variant="primary">Create User</Button>
        </motion.form>
      )}

      <div className="space-y-3">
        {users.map((u) => (
          <div key={u._id} className="p-3 glass rounded-xl flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center transition-colors hover:bg-ink-800/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-mist-100 text-sm">{u.name}</span>
                <Badge tone={u.role === "Admin" ? "amber" : "slate"}>{u.role}</Badge>
              </div>
              <p className="text-xs text-mist-500 mt-0.5">ID: {u.userId} {u.department ? `• ${u.department}` : ""}</p>
            </div>
            
            <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
              {editingUserId === u._id ? (
                <div className="glass p-2 rounded-lg border border-teal-500/30 w-full sm:w-auto">
                  <p className="text-[10px] uppercase text-mist-500 mb-1 font-semibold">Edit Permissions</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {ALL_PAGES.map((page) => (
                      <label key={page} className="flex items-center gap-1.5 text-xs text-mist-300 cursor-pointer">
                        <input type="checkbox" checked={editAllowedPages.includes(page)} onChange={() => togglePage(page, editAllowedPages, setEditAllowedPages)} className="rounded bg-transparent border-ink-600 text-teal-500 focus:ring-teal-500" />
                        {page}
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="primary" onClick={() => handleSavePermissions(u)} className="px-2 py-1 h-auto text-xs"><Check size={12} className="mr-1"/> Save</Button>
                    <Button variant="secondary" onClick={() => setEditingUserId(null)} className="px-2 py-1 h-auto text-xs">Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {u.allowedPages?.map((p) => <span key={p} className="text-[10px] bg-ink-700/20 text-inherit px-1.5 py-0.5 rounded">{p}</span>)}
                  </div>
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => { setEditingUserId(u._id); setEditAllowedPages(u.allowedPages || [...ALL_PAGES]); }} className="text-xs flex items-center gap-1 text-teal-400 hover:text-teal-300 bg-teal-500/10 px-2 py-1 rounded">
                      <Edit2 size={12} /> Edit Pages
                    </button>
                    <button onClick={() => handleDelete(u._id)} className="text-xs flex items-center gap-1 text-rose-400 hover:text-rose-300 bg-rose-500/10 px-2 py-1 rounded">
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

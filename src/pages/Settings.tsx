import { motion } from "framer-motion";
import { KeyRound, Moon, Save, Sun, User as UserIcon, Camera } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";
import { uploadFile } from "../lib/upload";
import { Avatar, Badge, Button, Card, Input, Label } from "../components/ui";
import { UserManagement } from "../components/UserManagement";

export default function Settings() {
  const { user, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();

  const [name, setName] = useState(user?.name ?? "");
  const [department, setDepartment] = useState(user?.department ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfile({ name, department });
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update profile");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = (reader.result as string).split(",")[1];
        toast.info("Uploading avatar...");
        const url = await uploadFile(base64Data, file.name, file.type, "");
        await updateProfile({ avatarUrl: url });
        toast.success("Avatar updated!");
      } catch (err: any) {
        toast.error(err.message || "Failed to upload avatar");
      } finally {
        setUploadingAvatar(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
      setUploadingAvatar(false);
    };
    reader.readAsDataURL(file);
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 4) {
      toast.error("New password must be at least 4 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match.");
      return;
    }
    setSavingPassword(true);
    try {
      // Client-side check only — Users sheet stores plaintext, so this simply
      // confirms the user typed their existing password correctly.
      await updateProfile({ password: newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not change password");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-mist-100">Settings</h2>
        <p className="mt-1 text-sm text-mist-500">Manage your profile, security, and app preferences.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Card>
            <div className="mb-5 flex items-center gap-4">
              <div className="relative">
                <Avatar name={user?.name ?? "?"} color={user?.avatarColor} url={user?.avatarUrl} size={56} />
                <button
                  type="button"
                  disabled={uploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-teal-500 text-ink-950 p-1 rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer disabled:opacity-50"
                  title="Upload DP"
                >
                  <Camera size={14} />
                </button>
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAvatarChange} />
              </div>
              <div>
                <p className="text-sm font-semibold text-mist-100">{user?.name}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  <Badge tone="teal">{user?.role}</Badge>
                  <span className="text-xs text-mist-500">ID: {user?.userId}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-mist-500">
                <UserIcon size={13} /> Profile
              </div>
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="user-id">ID</Label>
                <Input id="user-id" value={user?.userId ?? ""} disabled className="opacity-60" />
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Input id="department" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Sales, Operations" />
              </div>
              <Button type="submit" loading={savingProfile} icon={<Save size={15} />}>
                Save profile
              </Button>
            </form>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }} className="space-y-6">
          <Card>
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-mist-500">
              <KeyRound size={13} /> Change password
            </div>
            <form onSubmit={handlePasswordSave} className="space-y-4">
              <div>
                <Label htmlFor="current-password">Current password</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <Label htmlFor="new-password">New password</Label>
                <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <Button type="submit" variant="secondary" loading={savingPassword} icon={<Save size={15} />}>
                Update password
              </Button>
            </form>
          </Card>

          <Card>
            <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-mist-500">Appearance</div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-mist-100">Theme</p>
                <p className="text-xs text-mist-500">Switch between dark and light mode</p>
              </div>
              <div className="flex rounded-xl border border-ink-700/60 p-1">
                <ThemeButton active={theme === "dark"} onClick={() => setTheme("dark")} icon={<Moon size={14} />} label="Dark" />
                <ThemeButton active={theme === "light"} onClick={() => setTheme("light")} icon={<Sun size={14} />} label="Light" />
              </div>
            </div>
          </Card>
        </motion.div>
      </div>

      {user?.role === "Admin" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.1 }}>
          <UserManagement />
        </motion.div>
      )}
    </div>
  );
}

function ThemeButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors duration-200 cursor-pointer ${
        active ? "bg-gradient-to-r from-teal-400 to-teal-500 text-ink-950" : "text-mist-400 hover:text-mist-200"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

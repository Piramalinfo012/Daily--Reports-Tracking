import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usersRepo } from "./repo";
import type { User } from "./types";
import { colorForSeed, genId } from "./utils";

const SESSION_KEY = "dailyops.session.v1";

type PublicUser = Omit<User, "password">;

interface AuthContextValue {
  user: PublicUser | null;
  isLoading: boolean;
  error: string | null;
  login: (id: string, password: string) => Promise<void>;
  signup: (name: string, id: string, password: string, department: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateProfile: (patch: { name?: string; department?: string; password?: string; avatarUrl?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function stripPassword(u: User): PublicUser {
  const { password: _password, ...rest } = u;
  return rest;
}

function readSession(): PublicUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as PublicUser) : null;
  } catch {
    return null;
  }
}

function writeSession(u: PublicUser | null) {
  if (u) localStorage.setItem(SESSION_KEY, JSON.stringify(u));
  else localStorage.removeItem(SESSION_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(() => readSession());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    writeSession(user);
  }, [user]);

  const login = useCallback(async (id: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const users = await usersRepo.all();
      const match = users.find((u) => u.userId.trim().toLowerCase() === id.trim().toLowerCase());
      if (!match) throw new Error("No account found with that ID.");
      if (match.password !== password) throw new Error("Incorrect password.");

      const now = new Date().toISOString();
      usersRepo.touchLastLogin(match._id, now).catch(() => {
        // Non-fatal — don't block login if the Last Login write fails.
      });
      setUser(stripPassword({ ...match, lastLogin: now }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Login failed.";
      setError(msg);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (name: string, id: string, password: string, department: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const users = await usersRepo.all();
      const exists = users.some((u) => u.userId.trim().toLowerCase() === id.trim().toLowerCase());
      if (exists) throw new Error("An account with that ID already exists.");
      const now = new Date().toISOString();
      const newUser: Omit<User, "_id" | "createdAt"> = {
        name: name.trim(),
        userId: id.trim(),
        password,
        lastLogin: now,
        role: users.length === 0 ? "Admin" : "Member",
        department: department.trim(),
        avatarColor: colorForSeed(id || genId()),
      };
      const created = await usersRepo.create(newUser);
      setUser(stripPassword(created));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sign up failed.";
      setError(msg);
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    const users = await usersRepo.all();
    const match = users.find((u) => u.userId === user.userId);
    if (match) setUser(stripPassword(match));
  }, [user]);

  const updateProfile = useCallback(
    async (patch: { name?: string; department?: string; password?: string; avatarUrl?: string }) => {
      if (!user) return;
      const users = await usersRepo.all();
      const match = users.find((u) => u.userId === user.userId);
      if (!match) throw new Error("Could not locate your account to update.");
      const updated: User = {
        ...match,
        name: patch.name?.trim() || match.name,
        department: patch.department?.trim() ?? match.department,
        password: patch.password || match.password,
        avatarUrl: patch.avatarUrl ?? match.avatarUrl,
      };
      await usersRepo.update(match._id, updated);
      setUser(stripPassword(updated));
    },
    [user],
  );

  const value = useMemo(
    () => ({ user, isLoading, error, login, signup, logout, refreshUser, updateProfile }),
    [user, isLoading, error, login, signup, logout, refreshUser, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

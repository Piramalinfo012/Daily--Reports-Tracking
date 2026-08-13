import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Lock, IdCard, Sparkles, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";
import { Button, Input, Label } from "../components/ui";

export default function Login() {
  const { user, login, signup, isLoading } = useAuth();
  const navigate = useNavigate();

  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    try {
      if (!id.trim()) throw new Error("Please enter your ID.");
      if (isSignUp) {
        if (!name.trim()) throw new Error("Please enter your name.");
        await signup(name, id, password, department);
        toast.success("Account created successfully!");
      } else {
        await login(id, password);
        toast.success("Welcome back!");
      }
      navigate("/", { replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="surface-app relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 px-4">
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PHBhdGggZD0iTTAgMGgyNHYyNEgwemIiIGZpbGw9Im5vbmUiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxIiBmaWxsPSJyZ2JhKDE1MCwgMTUwLCAxNTAsIDAuMSkiLz48L3N2Zz4=')] opacity-50 dark:opacity-20" />
      
      {/* Ambient blobs */}
      <motion.div
        className="pointer-events-none absolute -top-[15%] -left-[10%] h-[500px] w-[500px] rounded-full bg-teal-500/20 mix-blend-multiply dark:mix-blend-color-dodge blur-[100px]"
        animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-[15%] -right-[10%] h-[600px] w-[600px] rounded-full bg-amber-500/15 mix-blend-multiply dark:mix-blend-color-dodge blur-[120px]"
        animate={{ scale: [1, 1.3, 1], x: [0, -50, 0], y: [0, -30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="glass relative z-10 w-full max-w-[420px] rounded-[2rem] p-8 md:p-10 shadow-2xl backdrop-blur-3xl border border-white/10 dark:border-white/5"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <motion.div 
            whileHover={{ scale: 1.05, rotate: 5 }}
            className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-amber-400 font-bold text-2xl text-ink-950 shadow-[0_8px_32px_-8px_rgba(20,184,166,0.6)]"
          >
            D
          </motion.div>
          <h1 className="text-2xl font-bold text-mist-100 tracking-tight">
            Welcome to <span className="text-gradient">DailyOps</span>
          </h1>
          <p className="mt-2 text-[13px] font-medium text-mist-500">Piramal Petroleum · Daily plan & EOD tracker</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4.5">
          {isSignUp && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                className="mt-1.5"
              />
            </motion.div>
          )}

          <div>
            <Label htmlFor="user-id">ID</Label>
            <div className="relative mt-1.5">
              <IdCard size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mist-500/70" />
              <Input
                id="user-id"
                required
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="e.g. EMP1024"
                className="pl-11"
              />
            </div>
          </div>

          {isSignUp && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Operations"
                className="mt-1.5"
              />
            </motion.div>
          )}

          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative mt-1.5">
              <Lock size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mist-500/70" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-11 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-mist-500 hover:text-teal-400 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {formError && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                className="overflow-hidden"
              >
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-[13px] font-medium text-rose-500 dark:text-rose-400 flex items-start gap-2">
                  <div className="mt-0.5 min-w-[14px]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  </div>
                  {formError}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pt-2">
            <Button type="submit" fullWidth loading={isLoading} icon={<ArrowRight size={18} />} className="h-11 text-[15px]">
              {isSignUp ? "Create Account" : "Sign in"}
            </Button>
          </div>
          
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setFormError(null);
              }}
              className="text-[13px] font-medium text-teal-500 hover:text-teal-600 dark:text-teal-400 dark:hover:text-teal-300 transition-colors"
            >
              {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-ink-700/30 dark:border-white/5">
          <p className="flex items-center justify-center gap-2 text-center text-[11px] font-medium text-mist-500 uppercase tracking-wide">
            <Sparkles size={12} className="text-amber-400" /> Secure Cloud Sync
          </p>
        </div>
      </motion.div>

      {/* Global Footer */}
      <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
        <p className="text-[10px] font-bold tracking-[0.2em] text-mist-500/60 uppercase">Developed by Deepak Sahu</p>
      </div>
    </div>
  );
}

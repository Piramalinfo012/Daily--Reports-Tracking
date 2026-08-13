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
      {/* Ambient blobs */}
      <motion.div
        className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-teal-500/20 blur-[120px]"
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-amber-500/15 blur-[120px]"
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="glass relative z-10 w-full max-w-md rounded-3xl p-8 shadow-2xl"
      >
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-amber-400 font-bold text-xl text-ink-950 shadow-[0_8px_24px_-8px_rgba(20,184,166,0.6)]">
            D
          </div>
          <h1 className="text-xl font-semibold text-mist-100">
            Welcome to <span className="text-gradient">DailyOps</span>
          </h1>
          <p className="mt-1 text-sm text-mist-500">Piramal Petroleum · Daily plan &amp; EOD tracker</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
              />
            </div>
          )}

          <div>
            <Label htmlFor="user-id">ID</Label>
            <div className="relative">
              <IdCard size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mist-500" />
              <Input
                id="user-id"
                required
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="e.g. EMP1024"
                className="pl-10"
              />
            </div>
          </div>

          {isSignUp && (
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Operations"
              />
            </div>
          )}

          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mist-500" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-mist-500 hover:text-mist-300 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {formError && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300"
              >
                {formError}
              </motion.p>
            )}
          </AnimatePresence>

          <Button type="submit" fullWidth loading={isLoading} icon={<ArrowRight size={16} />}>
            {isSignUp ? "Create Account" : "Sign in"}
          </Button>
          
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setFormError(null);
              }}
              className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
            >
              {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
            </button>
          </div>
        </form>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-mist-500">
          <Sparkles size={12} /> Your plans sync straight to the team's database
        </p>
      </motion.div>

      {/* Global Footer */}
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-[10px] font-bold tracking-widest text-mist-600/60 uppercase">Developed by Deepak Sahu</p>
      </div>
    </div>
  );
}

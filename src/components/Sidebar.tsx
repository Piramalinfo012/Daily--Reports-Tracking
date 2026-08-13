import { motion } from "framer-motion";
import { LayoutDashboard, ListChecks, FileText, ShieldCheck, Settings, LogOut, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Avatar } from "./ui";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/tracker", label: "Daily Tracker", icon: ListChecks },
  { to: "/report", label: "EOD Report", icon: FileText },
  { to: "/md-report", label: "MD Report", icon: ShieldCheck },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (user?.role === "Admin") return true;
    return user?.allowedPages?.includes(item.label) ?? true;
  });

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 pb-6 pt-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-amber-400 font-bold text-ink-950">
          D
        </div>
        <div>
          <p className="text-sm font-semibold text-mist-100">DailyOps</p>
          <p className="text-[11px] text-mist-500">Piramal Petroleum</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="ml-auto rounded-lg p-1.5 text-mist-500 hover:bg-white/5 hover:text-mist-100 md:hidden cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {visibleNavItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors duration-150 cursor-pointer ${
                isActive ? "text-ink-950" : "text-mist-400 hover:bg-white/5 hover:text-mist-100"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-teal-400 to-teal-500"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon size={18} className="relative z-10" />
                <span className="relative z-10">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mx-3 mb-3 rounded-xl border border-ink-700/60 p-3">
        <div className="flex items-center gap-2.5">
          {user?.avatarUrl ? (
            <div 
              className="cursor-pointer hover:opacity-80 transition-opacity" 
              onClick={() => window.open(user.avatarUrl, "_blank")}
              title="View Profile Picture"
            >
              <Avatar name={user?.name ?? "?"} color={user?.avatarColor} url={user?.avatarUrl} size={34} />
            </div>
          ) : (
            <Avatar name={user?.name ?? "?"} color={user?.avatarColor} size={34} />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-mist-100">{user?.name}</p>
            <p className="truncate text-[11px] text-mist-500">{user?.department || user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-ink-600 py-2 text-xs font-medium text-mist-400 transition-colors duration-150 hover:border-rose-400/50 hover:text-rose-400 cursor-pointer"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="sidebar-surface glass hidden w-64 shrink-0 border-r md:flex">{content}</aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60"
          />
          <motion.div
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="sidebar-surface glass absolute inset-y-0 left-0 w-72 border-r"
          >
            {content}
          </motion.div>
        </div>
      )}
    </>
  );
}

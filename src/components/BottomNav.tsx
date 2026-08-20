import { motion } from "framer-motion";
import { LayoutDashboard, ListChecks, FileText, ShieldCheck, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../lib/auth";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/tracker", label: "Tracker", icon: ListChecks },
  { to: "/report", label: "EOD", icon: FileText },
  { to: "/md-report", label: "MD", icon: ShieldCheck },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const { user } = useAuth();

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (user?.role === "Member" && item.label === "MD") return false;
    if (user?.role === "Admin") return true;
    const fullLabel = item.label === "Tracker" ? "Daily Tracker" : item.label === "EOD" ? "EOD Report" : item.label === "MD" ? "MD Report" : item.label;
    return user?.allowedPages?.includes(fullLabel) ?? true;
  });

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-ink-950 border-t border-ink-200 dark:border-white/10 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.02)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.2)]">
      <div className="flex items-center justify-around px-2 py-2">
        {visibleNavItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `relative flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-2xl transition-all duration-200 ${
                isActive ? "text-teal-600 dark:text-teal-400" : "text-mist-500 hover:text-mist-700 dark:text-mist-400 dark:hover:text-mist-200"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="bottom-nav-active"
                    className="absolute inset-0 rounded-2xl bg-teal-50 dark:bg-teal-500/10"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <Icon size={22} className="relative z-10" strokeWidth={isActive ? 2.5 : 2} />
                <span className="relative z-10 text-[10px] font-medium leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

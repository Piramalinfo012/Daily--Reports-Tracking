import { Menu, Sun, Moon, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "../lib/theme";
import { formatDisplayDate, todayISO } from "../lib/utils";

export function Topbar({ onMenuClick, title, subtitle }: { onMenuClick: () => void; title: string; subtitle?: string }) {
  const { theme, toggle } = useTheme();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <header className="glass sticky top-0 z-30 flex items-center gap-3 border-b px-4 py-3.5 md:px-8">
      <button
        onClick={onMenuClick}
        aria-label="Open menu"
        className="hidden rounded-lg p-2 text-mist-400 hover:bg-white/5 hover:text-mist-100 cursor-pointer"
      >
        <Menu size={20} />
      </button>

      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold text-mist-100">{title}</h1>
        {subtitle && <p className="truncate text-xs text-mist-500">{subtitle}</p>}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden items-center gap-1.5 rounded-full border border-ink-700/60 px-3 py-1.5 text-xs text-mist-400 sm:flex">
          <Clock size={13} />
          <span>{formatDisplayDate(todayISO())}</span>
          <span className="text-mist-600">•</span>
          <span>{now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
        </div>

        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="rounded-full border border-ink-700/60 p-2 text-mist-400 transition-colors duration-150 hover:border-teal-400/50 hover:text-teal-300 cursor-pointer"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}

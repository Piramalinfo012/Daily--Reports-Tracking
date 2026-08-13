
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ErrorBoundary } from "./ErrorBoundary";
import { BottomNav } from "./BottomNav";

const TITLES: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "Your day at a glance" },
  "/tracker": { title: "Daily Tracker", subtitle: "Plan your morning, close out your evening" },
  "/report": { title: "EOD Report", subtitle: "Submit today's end-of-day summary" },
  "/settings": { title: "Settings", subtitle: "Manage your profile and preferences" },
};

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const meta = TITLES[location.pathname] ?? { title: "DailyOps", subtitle: "" };

  return (
    <div className="surface-app flex h-screen overflow-hidden bg-ink-950">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileOpen(true)} title={meta.title} subtitle={meta.subtitle} />

        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 pb-24 md:pb-8">
            <div className="mx-auto w-full max-w-6xl animate-in fade-in slide-in-from-bottom-2 duration-300">
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </div>
          
          <footer className="mt-auto pt-10 pb-4 text-center">
            <p className="text-[10px] font-bold tracking-widest text-mist-600/60 uppercase">Developed by Deepak Sahu</p>
          </footer>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}

import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  KeyRound,
  PhoneCall,
  LogOut,
  ChevronRight,
} from "lucide-react";
import clsx from "clsx";

import { useAuth } from "@/lib/auth";
import { BrandLockup } from "./Brand";
import { ThemeToggle } from "./ThemeToggle";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/agents", label: "Agents", icon: Users },
  { to: "/api-keys", label: "API Keys", icon: KeyRound },
  { to: "/calls", label: "Calls", icon: PhoneCall },
];

export function Layout() {
  const { logout } = useAuth();

  return (
    <div className="flex h-full">
      <aside className="w-64 shrink-0 border-r border-border bg-surface/60 backdrop-blur-sm flex flex-col">
        <div className="px-5 py-5 border-b border-border">
          <BrandLockup />
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  clsx(
                    "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150",
                    isActive
                      ? "bg-accent/10 text-text shadow-[inset_0_0_0_1px_rgba(124,92,255,0.2)]"
                      : "text-muted hover:text-text hover:bg-surface-2",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={clsx(
                        "h-4 w-4",
                        isActive ? "text-accent-400" : "text-muted group-hover:text-text",
                      )}
                    />
                    <span className="flex-1">{item.label}</span>
                    {isActive && (
                      <ChevronRight className="h-3.5 w-3.5 text-accent-400" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border space-y-2">
          <div className="rounded-lg border border-border bg-surface-2 p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-2 mb-1">
              Quick start
            </div>
            <div className="text-xs text-muted leading-relaxed">
              Add your API keys, build an agent, and place a test call.
            </div>
          </div>
          <ThemeToggle />
          <button onClick={logout} className="btn btn-ghost w-full justify-start">
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-10 py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

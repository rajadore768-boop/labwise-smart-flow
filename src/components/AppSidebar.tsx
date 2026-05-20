import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Boxes, Users, Sparkles, BarChart3, LogOut,
  FileText, Inbox, CalendarDays, ClipboardCheck, Bell, Send, UserCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type NavItem = { to: string; label: string; icon: any; group: string };

const adminNav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Management" },
  { to: "/labs", label: "Lab Inventory", icon: Boxes, group: "Management" },
  { to: "/sections", label: "Sections", icon: Users, group: "Management" },
  { to: "/allocate", label: "Allocation Engine", icon: Sparkles, group: "Optimization" },
  { to: "/analytics", label: "Analytics", icon: BarChart3, group: "Optimization" },
  { to: "/reports", label: "Reports", icon: FileText, group: "Optimization" },
  { to: "/requests-admin", label: "Requests Inbox", icon: Inbox, group: "Governance" },
];

const facultyNav: NavItem[] = [
  { to: "/my-schedule", label: "My Schedule", icon: CalendarDays, group: "Workspace" },
  { to: "/my-labs", label: "Assigned Labs", icon: Boxes, group: "Workspace" },
  { to: "/attendance", label: "Attendance", icon: ClipboardCheck, group: "Workspace" },
  { to: "/requests", label: "My Requests", icon: Send, group: "Communication" },
  { to: "/notifications", label: "Notifications", icon: Bell, group: "Communication" },
  { to: "/profile", label: "Profile", icon: UserCircle, group: "Account" },
];

export function AppSidebar({ userName, role }: { userName: string; role: string }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  }

  const nav = role === "admin" ? adminNav : facultyNav;
  const groups = Array.from(new Set(nav.map((n) => n.group)));

  return (
    <aside className="w-64 border-r border-border bg-surface sticky top-0 h-screen flex flex-col">
      <div className="p-6 border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <div className="size-6 rounded-sm bg-primary" />
          <span className="font-display text-lg">SmartLab</span>
        </Link>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {groups.map((g) => (
          <div key={g}>
            <div className="px-3 pt-4 pb-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {g}
            </div>
            {nav.filter((n) => n.group === g).map((item) => {
              const active = path === item.to || path.startsWith(item.to + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="size-8 rounded-full bg-surface-muted border border-border grid place-items-center text-xs font-bold">
            {userName.slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold truncate">{userName}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{role}</div>
          </div>
          <button
            onClick={signOut}
            className="p-1.5 rounded-md hover:bg-surface-muted text-muted-foreground"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

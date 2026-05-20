import { useEffect, useState } from "react";
import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { loading, session, role } = useAuth();
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!loading && !session) nav({ to: "/login" });
  }, [loading, session, nav]);

  // Redirect default landing per role
  useEffect(() => {
    if (loading || !role) return;
    if (path === "/" || path === "/_authenticated") {
      nav({ to: role === "admin" ? "/dashboard" : "/my-schedule" });
    }
  }, [loading, role, path, nav]);

  if (loading || !session) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-sm text-muted-foreground font-mono">Loading…</div>
      </div>
    );
  }

  const fullName =
    (session.user.user_metadata?.full_name as string) ||
    session.user.email ||
    "User";

  async function claimAdmin() {
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_admin_if_none");
    setClaiming(false);
    if (error) return toast.error(error.message);
    if (data) {
      toast.success("Admin access granted.");
      window.location.reload();
    } else {
      toast.info("An admin already exists for this workspace.");
    }
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <AppSidebar userName={fullName} role={role ?? "faculty"} />
      <main className="flex-1 min-w-0 flex flex-col">
        {role !== "admin" && (
          <div className="border-b border-border bg-warning/10 px-6 py-3 flex items-center justify-between text-sm">
            <span>
              Signed in as <strong>faculty</strong>. Need admin access to manage the institution?
            </span>
            <button
              onClick={claimAdmin}
              disabled={claiming}
              className="rounded-md bg-foreground text-background px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              {claiming ? "Claiming…" : "Claim admin (if none)"}
            </button>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}


import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { loading, role } = useAuth();
  if (loading) return <div className="p-10 text-sm text-muted-foreground font-mono">Checking access…</div>;
  if (role !== "admin") {
    return (
      <div className="p-10 max-w-xl mx-auto mt-12">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-3">
          <ShieldAlert className="size-8 mx-auto text-destructive" />
          <h2 className="font-display text-xl">Admin access required</h2>
          <p className="text-sm text-muted-foreground">
            This module is restricted to administrators. Faculty accounts cannot view or modify it.
          </p>
          <Link to="/my-schedule" className="inline-block text-xs font-semibold text-primary uppercase tracking-wider">
            Go to faculty workspace →
          </Link>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

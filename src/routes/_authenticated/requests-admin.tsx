import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/Page";
import { RequireAdmin } from "@/components/RequireAdmin";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/requests-admin")({
  component: () => <RequireAdmin><AdminRequests /></RequireAdmin>,
  head: () => ({ meta: [{ title: "Requests Inbox — SmartLab" }] }),
});

function AdminRequests() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const { data: requests = [] } = useQuery({
    queryKey: ["requests-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requests")
        .select("*, profiles:faculty_id(full_name, email), labs:suggested_lab_id(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const review = useMutation({
    mutationFn: async ({ id, status, note, faculty_id, title }: { id: string; status: "approved" | "rejected"; note?: string; faculty_id: string; title: string }) => {
      const { error } = await supabase
        .from("requests")
        .update({ status, admin_note: note ?? null, reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      await supabase.from("notifications").insert({
        user_id: faculty_id,
        title: `Request ${status}: ${title}`,
        body: note || `Your request was ${status} by admin.`,
      });
    },
    onSuccess: () => {
      toast.success("Decision recorded");
      qc.invalidateQueries({ queryKey: ["requests-admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const visible = (requests as any[]).filter((r) => statusFilter === "all" || r.status === statusFilter);

  return (
    <>
      <PageHeader title="Requests Inbox" subtitle="Faculty requests awaiting review" badge="ADMIN" />
      <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex gap-2">
          {(["pending", "approved", "rejected", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition ${
                statusFilter === s ? "bg-foreground text-background" : "bg-surface-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {visible.map((r: any) => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-muted">{r.type}</span>
                    <StatusBadge status={r.status} />
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="font-semibold mt-2">{r.title}</h3>
                  {r.details && <p className="text-sm text-muted-foreground mt-1">{r.details}</p>}
                  <div className="mt-3 text-xs text-muted-foreground">
                    From <strong className="text-foreground">{r.profiles?.full_name ?? r.profiles?.email ?? "Faculty"}</strong>
                    {r.labs?.name && <> · suggested lab: <strong className="text-foreground">{r.labs.name}</strong></>}
                  </div>
                  {r.admin_note && (
                    <div className="mt-2 text-xs bg-surface-muted rounded p-2">
                      <strong>Admin note:</strong> {r.admin_note}
                    </div>
                  )}
                </div>
                {r.status === "pending" && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => {
                        const note = window.prompt("Optional note for faculty:") ?? undefined;
                        review.mutate({ id: r.id, status: "approved", note, faculty_id: r.faculty_id, title: r.title });
                      }}
                      className="px-3 py-1.5 rounded-md bg-accent text-accent-foreground text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Check className="size-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => {
                        const note = window.prompt("Reason for rejection:") ?? undefined;
                        review.mutate({ id: r.id, status: "rejected", note, faculty_id: r.faculty_id, title: r.title });
                      }}
                      className="px-3 py-1.5 rounded-md border border-destructive/40 text-destructive text-xs font-semibold flex items-center gap-1.5"
                    >
                      <X className="size-3.5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {visible.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              No {statusFilter !== "all" && statusFilter} requests.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === "approved" ? "bg-accent/10 text-accent ring-accent/20"
    : status === "rejected" ? "bg-destructive/10 text-destructive ring-destructive/20"
    : "bg-warning/10 text-warning ring-warning/20";
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ring-1 ${cls}`}>{status}</span>;
}

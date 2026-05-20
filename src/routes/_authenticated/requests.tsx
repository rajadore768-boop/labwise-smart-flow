import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/Page";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/requests")({
  component: MyRequests,
  head: () => ({ meta: [{ title: "My Requests — SmartLab" }] }),
});

function MyRequests() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: requests = [] } = useQuery({
    queryKey: ["my-requests", uid],
    enabled: !!uid,
    queryFn: async () => (await supabase
      .from("requests")
      .select("*, labs:suggested_lab_id(name)")
      .eq("faculty_id", uid!)
      .order("created_at", { ascending: false })).data ?? [],
  });

  return (
    <>
      <PageHeader
        title="My Requests"
        subtitle="Lab change, timetable & resource requests"
        badge="FACULTY"
        actions={
          <button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground text-sm px-4 py-1.5 rounded-md font-medium flex items-center gap-2">
            <Plus className="size-4" /> New Request
          </button>
        }
      />
      <div className="p-8 max-w-5xl mx-auto w-full space-y-3">
        {(requests as any[]).map((r) => (
          <div key={r.id} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-muted">{r.type}</span>
              <StatusBadge status={r.status} />
              <span className="text-[10px] font-mono text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
            </div>
            <h3 className="font-semibold mt-2">{r.title}</h3>
            {r.details && <p className="text-sm text-muted-foreground mt-1">{r.details}</p>}
            {r.labs?.name && <p className="text-xs mt-2">Suggested lab: <strong>{r.labs.name}</strong></p>}
            {r.admin_note && (
              <div className="mt-3 text-xs bg-surface-muted rounded p-2">
                <strong>Admin response:</strong> {r.admin_note}
              </div>
            )}
          </div>
        ))}
        {requests.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No requests yet. Click "New Request" to send one.
          </div>
        )}
      </div>
      {open && <NewRequestModal uid={uid!} onClose={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["my-requests"] }); }} />}
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls = status === "approved" ? "bg-accent/10 text-accent ring-accent/20"
    : status === "rejected" ? "bg-destructive/10 text-destructive ring-destructive/20"
    : "bg-warning/10 text-warning ring-warning/20";
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ring-1 ${cls}`}>{status}</span>;
}

function NewRequestModal({ uid, onClose }: { uid: string; onClose: () => void }) {
  const [form, setForm] = useState({ type: "lab_change", title: "", details: "", suggested_lab_id: "" });

  const { data: labs = [] } = useQuery({
    queryKey: ["labs-public"],
    queryFn: async () => (await supabase.from("labs").select("id, name").order("name")).data ?? [],
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("requests").insert({
        faculty_id: uid,
        type: form.type as any,
        title: form.title,
        details: form.details || null,
        suggested_lab_id: form.suggested_lab_id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Request submitted (pending admin review)"); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm grid place-items-center p-4 z-50" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-display">New Request</h2>
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Type</span>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="mt-1.5 w-full px-3 py-2 bg-surface-muted border border-border rounded-md text-sm">
              <option value="lab_change">Lab Change</option>
              <option value="timetable">Timetable Modification</option>
              <option value="resource">Resource Request</option>
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Title</span>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="mt-1.5 w-full px-3 py-2 bg-surface-muted border border-border rounded-md text-sm" />
          </label>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Details</span>
            <textarea rows={3} value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })}
              className="mt-1.5 w-full px-3 py-2 bg-surface-muted border border-border rounded-md text-sm" />
          </label>
          {form.type === "lab_change" && (
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Suggested lab (optional)</span>
              <select value={form.suggested_lab_id} onChange={(e) => setForm({ ...form, suggested_lab_id: e.target.value })}
                className="mt-1.5 w-full px-3 py-2 bg-surface-muted border border-border rounded-md text-sm">
                <option value="">— none —</option>
                {labs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </label>
          )}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-md border border-border text-sm">Cancel</button>
            <button disabled={create.isPending} className="flex-1 py-2 rounded-md bg-foreground text-background text-sm font-medium disabled:opacity-50">
              {create.isPending ? "Sending…" : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

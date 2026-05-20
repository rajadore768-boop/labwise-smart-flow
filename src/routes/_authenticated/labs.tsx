import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/Page";
import { RequireAdmin } from "@/components/RequireAdmin";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/labs")({
  component: () => <RequireAdmin><LabsPage /></RequireAdmin>,
  head: () => ({ meta: [{ title: "Lab Inventory — SmartLab" }] }),
});

type Lab = {
  id: string;
  name: string;
  capacity: number;
  floor: number;
  systems: number;
  status: string;
  ac: boolean;
  lab_type: string;
};

function LabsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(false);

  const { data: labs = [] } = useQuery({
    queryKey: ["labs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("labs").select("*").order("capacity");
      if (error) throw error;
      return data as Lab[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("labs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lab deleted");
      qc.invalidateQueries({ queryKey: ["labs"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const visible = labs.filter((l) => l.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <>
      <PageHeader
        title="Lab Inventory"
        subtitle={`${labs.length} labs · total capacity ${labs.reduce((a, l) => a + l.capacity, 0)} seats`}
        actions={
          <button
            onClick={() => setOpen(true)}
            className="bg-primary text-primary-foreground text-sm px-4 py-1.5 rounded-md font-medium flex items-center gap-2"
          >
            <Plus className="size-4" /> Add Lab
          </button>
        }
      />
      <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search labs…"
          className="w-full max-w-sm px-3 py-2 bg-surface-muted border border-border rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/30"
        />

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-surface-muted/40 border-b border-border">
                {["Lab", "Capacity", "Floor", "Systems", "Type", "AC", "Status", ""].map((h) => (
                  <th key={h} className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.map((l) => (
                <tr key={l.id}>
                  <td className="px-6 py-4 font-medium">{l.name}</td>
                  <td className="px-6 py-4 font-mono">{l.capacity}</td>
                  <td className="px-6 py-4">L{l.floor}</td>
                  <td className="px-6 py-4">{l.systems}</td>
                  <td className="px-6 py-4 text-muted-foreground">{l.lab_type}</td>
                  <td className="px-6 py-4">{l.ac ? "Yes" : "No"}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ring-1 ${
                      l.status === "available"
                        ? "bg-accent/10 text-accent ring-accent/20"
                        : "bg-warning/10 text-warning ring-warning/20"
                    }`}>
                      {l.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => del.mutate(l.id)}
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    No labs yet. Click "Add Lab" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && <AddLabModal onClose={() => setOpen(false)} />}
    </>
  );
}

function AddLabModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    capacity: 30,
    floor: 1,
    systems: 30,
    lab_type: "Computer",
    ac: false,
    status: "available",
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("labs").insert(form);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lab created");
      qc.invalidateQueries({ queryKey: ["labs"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm grid place-items-center p-4 z-50" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-display">Add Lab</h2>
        <form
          onSubmit={(e) => { e.preventDefault(); create.mutate(); }}
          className="mt-6 space-y-4"
        >
          <Input label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Capacity" type="number" value={form.capacity} onChange={(v) => setForm({ ...form, capacity: +v })} />
            <Input label="Floor" type="number" value={form.floor} onChange={(v) => setForm({ ...form, floor: +v })} />
            <Input label="Systems" type="number" value={form.systems} onChange={(v) => setForm({ ...form, systems: +v })} />
            <Select label="Type" value={form.lab_type} onChange={(v) => setForm({ ...form, lab_type: v })}
              options={["Computer", "Electronics", "Mechanical", "Chemistry", "Physics", "Networking"]} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.ac} onChange={(e) => setForm({ ...form, ac: e.target.checked })} />
            Air conditioned
          </label>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-md border border-border text-sm">Cancel</button>
            <button disabled={create.isPending} className="flex-1 py-2 rounded-md bg-foreground text-background text-sm font-medium disabled:opacity-50">
              {create.isPending ? "Creating…" : "Create lab"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string | number; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        required type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full px-3 py-2 bg-surface-muted border border-border rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/30"
      />
    </label>
  );
}
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full px-3 py-2 bg-surface-muted border border-border rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/30"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

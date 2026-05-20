import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/Page";
import { RequireAdmin } from "@/components/RequireAdmin";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sections")({
  component: () => <RequireAdmin><SectionsPage /></RequireAdmin>,
  head: () => ({ meta: [{ title: "Sections — SmartLab" }] }),
});

type Section = {
  id: string;
  section_name: string;
  department: string;
  semester: number;
  student_count: number;
};

function SectionsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: sections = [] } = useQuery({
    queryKey: ["sections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sections").select("*").order("section_name");
      if (error) throw error;
      return data as Section[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Section deleted"); qc.invalidateQueries({ queryKey: ["sections"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Sections"
        subtitle={`${sections.length} sections · ${sections.reduce((a, s) => a + s.student_count, 0)} students`}
        actions={
          <button onClick={() => setOpen(true)} className="bg-primary text-primary-foreground text-sm px-4 py-1.5 rounded-md font-medium flex items-center gap-2">
            <Plus className="size-4" /> Add Section
          </button>
        }
      />
      <div className="p-8 max-w-7xl mx-auto w-full">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-surface-muted/40 border-b border-border">
                {["Section", "Department", "Semester", "Students", ""].map((h) => (
                  <th key={h} className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sections.map((s) => (
                <tr key={s.id}>
                  <td className="px-6 py-4 font-medium">{s.section_name}</td>
                  <td className="px-6 py-4 text-muted-foreground">{s.department}</td>
                  <td className="px-6 py-4 font-mono">Sem {s.semester}</td>
                  <td className="px-6 py-4 font-mono">{s.student_count}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => del.mutate(s.id)} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {sections.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-sm text-muted-foreground">No sections yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {open && <AddSectionModal onClose={() => setOpen(false)} />}
    </>
  );
}

function AddSectionModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ section_name: "", department: "CSE", semester: 1, student_count: 30 });
  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sections").insert(form);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Section created"); qc.invalidateQueries({ queryKey: ["sections"] }); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="fixed inset-0 bg-foreground/40 backdrop-blur-sm grid place-items-center p-4 z-50" onClick={onClose}>
      <div className="bg-card rounded-2xl border border-border w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-display">Add Section</h2>
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="mt-6 space-y-4">
          <Field label="Section name">
            <input required value={form.section_name} onChange={(e) => setForm({ ...form, section_name: e.target.value })}
              className="inp" placeholder="CSE-A" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Dept">
              <input required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="inp" />
            </Field>
            <Field label="Semester">
              <input required type="number" min={1} max={10} value={form.semester} onChange={(e) => setForm({ ...form, semester: +e.target.value })} className="inp" />
            </Field>
            <Field label="Students">
              <input required type="number" min={1} value={form.student_count} onChange={(e) => setForm({ ...form, student_count: +e.target.value })} className="inp" />
            </Field>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-md border border-border text-sm">Cancel</button>
            <button disabled={create.isPending} className="flex-1 py-2 rounded-md bg-foreground text-background text-sm font-medium disabled:opacity-50">
              {create.isPending ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
        <style>{`.inp{width:100%;padding:.5rem .75rem;background:var(--surface-muted);border:1px solid var(--border);border-radius:.375rem;font-size:.875rem;outline:none}`}</style>
      </div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

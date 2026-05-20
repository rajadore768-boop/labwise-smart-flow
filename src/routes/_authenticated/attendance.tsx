import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/Page";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/attendance")({
  component: AttendancePage,
  head: () => ({ meta: [{ title: "Attendance — SmartLab" }] }),
});

function AttendancePage() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const uid = session?.user.id;

  const { data: allocs = [] } = useQuery({
    queryKey: ["my-alloc-list", uid],
    enabled: !!uid,
    queryFn: async () => (await supabase
      .from("allocations")
      .select("*, labs(name), sections(section_name, student_count)")
      .eq("faculty_id", uid!)
      .order("date", { ascending: false })).data ?? [],
  });

  const { data: records = [] } = useQuery({
    queryKey: ["attendance", uid],
    enabled: !!uid,
    queryFn: async () => (await supabase.from("attendance").select("*").eq("faculty_id", uid!)).data ?? [],
  });

  const recordsMap = new Map(records.map((r) => [r.allocation_id, r]));

  return (
    <>
      <PageHeader title="Attendance" subtitle="Mark attendance for your assigned classes" badge="FACULTY" />
      <div className="p-8 max-w-5xl mx-auto w-full space-y-3">
        {(allocs as any[]).map((a) => {
          const rec = recordsMap.get(a.id);
          return <AttendanceRow key={a.id} alloc={a} record={rec} uid={uid!} onSaved={() => qc.invalidateQueries({ queryKey: ["attendance"] })} />;
        })}
        {allocs.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No assigned classes to mark attendance for.
          </div>
        )}
      </div>
    </>
  );
}

function AttendanceRow({ alloc, record, uid, onSaved }: any) {
  const [present, setPresent] = useState(record?.present_count ?? "");
  const total = alloc.sections?.student_count ?? 0;

  const save = useMutation({
    mutationFn: async () => {
      const presentNum = parseInt(String(present)) || 0;
      if (record) {
        const { error } = await supabase.from("attendance").update({
          present_count: presentNum, total_count: total,
        }).eq("id", record.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("attendance").insert({
          allocation_id: alloc.id, faculty_id: uid, present_count: presentNum, total_count: total,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Attendance saved"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="font-medium">{alloc.sections?.section_name} · {alloc.labs?.name}</p>
        <p className="text-xs text-muted-foreground font-mono">{alloc.date} · {alloc.time_slot} · {total} enrolled</p>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="number" min={0} max={total} value={present}
          onChange={(e) => setPresent(e.target.value)}
          placeholder="Present"
          className="w-24 px-3 py-2 bg-surface-muted border border-border rounded-md text-sm"
        />
        <span className="text-sm text-muted-foreground">/ {total}</span>
        <button onClick={() => save.mutate()} disabled={save.isPending}
          className="px-4 py-2 rounded-md bg-foreground text-background text-xs font-semibold disabled:opacity-50">
          {record ? "Update" : "Mark"}
        </button>
      </div>
    </div>
  );
}

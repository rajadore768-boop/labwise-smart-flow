import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/Page";
import { useAuth } from "@/hooks/useAuth";
import { Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/my-schedule")({
  component: MySchedule,
  head: () => ({ meta: [{ title: "My Schedule — SmartLab" }] }),
});

function MySchedule() {
  const { session } = useAuth();
  const uid = session?.user.id;

  const { data: allocs = [] } = useQuery({
    queryKey: ["my-schedule", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allocations")
        .select("*, labs(name, capacity, floor), sections(section_name, department, student_count)")
        .eq("faculty_id", uid!)
        .order("date")
        .order("time_slot");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function exportPdf() {
    const [{ jsPDF }, autoTable] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("My Teaching Schedule", 14, 18);
    autoTable.default(doc, {
      startY: 26,
      head: [["Date", "Time", "Lab", "Section", "Dept", "Students"]],
      body: (allocs as any[]).map((a) => [
        a.date, a.time_slot, a.labs?.name ?? "—",
        a.sections?.section_name ?? "—", a.sections?.department ?? "—",
        a.sections?.student_count ?? 0,
      ]),
      headStyles: { fillColor: [30, 30, 30] },
    });
    doc.save("my-schedule.pdf");
    toast.success("Schedule downloaded");
  }

  return (
    <>
      <PageHeader
        title="My Schedule"
        subtitle={`${allocs.length} upcoming class allocations`}
        badge="FACULTY"
        actions={
          <button onClick={exportPdf} disabled={allocs.length === 0}
            className="bg-primary text-primary-foreground text-sm px-4 py-1.5 rounded-md font-medium flex items-center gap-2 disabled:opacity-40">
            <Download className="size-4" /> Download
          </button>
        }
      />
      <div className="p-8 max-w-6xl mx-auto w-full">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-surface-muted/40 border-b border-border">
                {["Date", "Time", "Lab", "Section", "Dept", "Students"].map((h) => (
                  <th key={h} className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(allocs as any[]).map((a) => (
                <tr key={a.id}>
                  <td className="px-6 py-4 font-mono text-xs">{a.date}</td>
                  <td className="px-6 py-4">{a.time_slot}</td>
                  <td className="px-6 py-4 font-medium">{a.labs?.name ?? "—"}</td>
                  <td className="px-6 py-4">{a.sections?.section_name ?? "—"}</td>
                  <td className="px-6 py-4 text-muted-foreground">{a.sections?.department ?? "—"}</td>
                  <td className="px-6 py-4 font-mono">{a.sections?.student_count ?? 0}</td>
                </tr>
              ))}
              {allocs.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                  No classes assigned yet. Admin assigns labs to faculty during allocation.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

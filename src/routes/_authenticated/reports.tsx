import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard } from "@/components/Page";
import { RequireAdmin } from "@/components/RequireAdmin";
import { Download, Filter } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reports")({
  component: () => <RequireAdmin><ReportsPage /></RequireAdmin>,
  head: () => ({ meta: [{ title: "Reports — SmartLab" }] }),
});

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dayOf(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00").getDay(); // 0=Sun
  return DAYS[(d + 6) % 7];
}

function ReportsPage() {
  const [labId, setLabId] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [search, setSearch] = useState("");

  const { data: labs = [] } = useQuery({
    queryKey: ["labs"],
    queryFn: async () => (await supabase.from("labs").select("*").order("name")).data ?? [],
  });

  const { data: allocs = [] } = useQuery({
    queryKey: ["allocations", labId],
    enabled: !!labId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allocations")
        .select("*, sections(section_name, department, student_count), labs(name, capacity), profiles:faculty_id(full_name, email)")
        .eq("lab_id", labId)
        .order("date")
        .order("time_slot");
      if (error) throw error;
      return data ?? [];
    },
  });

  const lab = labs.find((l) => l.id === labId);

  const filtered = useMemo(() => {
    return (allocs as any[]).filter((a) => {
      if (dayFilter && dayOf(a.date) !== dayFilter) return false;
      if (deptFilter && a.sections?.department !== deptFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!`${a.sections?.section_name} ${a.sections?.department} ${a.time_slot} ${a.date}`.toLowerCase().includes(q))
          return false;
      }
      return true;
    });
  }, [allocs, dayFilter, deptFilter, search]);

  const depts = Array.from(new Set((allocs as any[]).map((a) => a.sections?.department).filter(Boolean)));

  const totalStudents = filtered.reduce((a, x: any) => a + (x.sections?.student_count ?? 0), 0);
  const totalCapacity = filtered.reduce((a, x: any) => a + (x.labs?.capacity ?? 0), 0);
  const occupancy = totalCapacity ? Math.round((totalStudents / totalCapacity) * 100) : 0;
  const waste = filtered.reduce((a, x) => a + x.unused_seats, 0);

  async function exportPdf() {
    if (!lab) return toast.error("Select a lab first");
    const [{ jsPDF }, autoTable] = await Promise.all([
      import("jspdf"),
      import("jspdf-autotable"),
    ]);
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Lab Allocation Report — ${lab.name}`, 14, 18);
    doc.setFontSize(10);
    doc.text(`Capacity: ${lab.capacity}  •  Allocations: ${filtered.length}  •  Occupancy: ${occupancy}%  •  Unused seats: ${waste}`, 14, 26);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 32);

    autoTable.default(doc, {
      startY: 38,
      head: [["Day", "Date", "Time Slot", "Section", "Dept", "Faculty", "Students", "Unused"]],
      body: filtered.map((a: any) => [
        dayOf(a.date),
        a.date,
        a.time_slot,
        a.sections?.section_name ?? "—",
        a.sections?.department ?? "—",
        a.profiles?.full_name ?? "Unassigned",
        a.sections?.student_count ?? 0,
        a.unused_seats,
      ]),
      headStyles: { fillColor: [30, 30, 30] },
      styles: { fontSize: 9 },
    });
    doc.save(`${lab.name}-report.pdf`);
  }

  return (
    <>
      <PageHeader
        title="Lab Reports"
        subtitle="Per-lab schedule, allocation history & occupancy"
        badge="ADMIN ONLY"
        actions={
          <button
            onClick={exportPdf}
            disabled={!labId || filtered.length === 0}
            className="bg-primary text-primary-foreground text-sm px-4 py-1.5 rounded-md font-medium flex items-center gap-2 disabled:opacity-40"
          >
            <Download className="size-4" /> Export PDF
          </button>
        }
      />
      <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
        <section className="bg-card border border-border rounded-xl p-6 grid lg:grid-cols-4 gap-4">
          <Field label="Lab">
            <select value={labId} onChange={(e) => setLabId(e.target.value)} className="inp">
              <option value="">— Select a lab —</option>
              {labs.map((l) => (
                <option key={l.id} value={l.id}>{l.name} · cap {l.capacity}</option>
              ))}
            </select>
          </Field>
          <Field label="Day">
            <select value={dayFilter} onChange={(e) => setDayFilter(e.target.value)} className="inp">
              <option value="">All days</option>
              {DAYS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Department">
            <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="inp">
              <option value="">All departments</option>
              {depts.map((d) => <option key={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Search">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Section, slot…" className="inp" />
          </Field>
        </section>

        {!labId ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            <Filter className="size-6 mx-auto mb-3 opacity-50" />
            Select a lab to view its complete schedule and allocation history.
          </div>
        ) : (
          <>
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard label="Allocations" value={filtered.length} hint={lab?.name} />
              <StatCard label="Total Students" value={totalStudents} />
              <StatCard label="Occupancy" value={`${occupancy}%`} bar={occupancy} accent={occupancy > 80 ? "good" : "warn"} />
              <StatCard label="Unused Seats" value={waste} accent={waste > 30 ? "warn" : "good"} />
            </section>

            <section className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border bg-surface-muted/40 flex justify-between items-center">
                <h2 className="font-semibold text-sm">Day-wise Schedule</h2>
                <span className="text-[10px] font-mono text-muted-foreground uppercase">{filtered.length} entries</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[800px]">
                  <thead>
                    <tr className="bg-surface-muted/30 border-b border-border">
                      {["Day", "Date", "Time Slot", "Section", "Dept", "Faculty", "Students", "Unused", "Status"].map((h) => (
                        <th key={h} className="px-4 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((a: any) => {
                      const stud = a.sections?.student_count ?? 0;
                      const cap = a.labs?.capacity ?? 0;
                      const pct = cap ? Math.round((stud / cap) * 100) : 0;
                      return (
                        <tr key={a.id}>
                          <td className="px-4 py-3 font-mono text-xs">{dayOf(a.date)}</td>
                          <td className="px-4 py-3 font-mono text-xs">{a.date}</td>
                          <td className="px-4 py-3">{a.time_slot}</td>
                          <td className="px-4 py-3 font-medium">{a.sections?.section_name ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{a.sections?.department ?? "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{a.profiles?.full_name ?? "Unassigned"}</td>
                          <td className="px-4 py-3 font-mono">{stud}/{cap}</td>
                          <td className="px-4 py-3 font-mono">{a.unused_seats}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ring-1 ${
                              pct >= 80 ? "bg-accent/10 text-accent ring-accent/20" : "bg-warning/10 text-warning ring-warning/20"
                            }`}>
                              {pct >= 80 ? "Optimal" : "Underused"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">No allocations match the filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
      <style>{`.inp{width:100%;padding:.55rem .75rem;background:var(--surface-muted);border:1px solid var(--border);border-radius:.5rem;font-size:.875rem;outline:none}.inp:focus{box-shadow:0 0 0 3px color-mix(in oklab,var(--primary) 20%, transparent)}`}</style>
    </>
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

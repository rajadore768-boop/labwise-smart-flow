import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard } from "@/components/Page";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Dashboard — SmartLab" }] }),
});

function Dashboard() {
  const labsQ = useQuery({
    queryKey: ["labs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("labs").select("*").order("capacity");
      if (error) throw error;
      return data ?? [];
    },
  });
  const sectionsQ = useQuery({
    queryKey: ["sections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sections").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });
  const allocQ = useQuery({
    queryKey: ["allocations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allocations")
        .select("*, sections(section_name, department, student_count), labs(name, capacity)")
        .order("date", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const labs = labsQ.data ?? [];
  const sections = sectionsQ.data ?? [];
  const allocs = allocQ.data ?? [];

  const totalStudents = sections.reduce((a, s) => a + s.student_count, 0);
  const allocStudents = allocs.reduce(
    (a, x: any) => a + (x.sections?.student_count ?? 0),
    0,
  );
  const allocCapacity = allocs.reduce(
    (a, x: any) => a + (x.labs?.capacity ?? 0),
    0,
  );
  const utilization = allocCapacity ? Math.round((allocStudents / allocCapacity) * 100) : 0;
  const wasteSeats = allocs.reduce((a, x) => a + x.unused_seats, 0);

  return (
    <>
      <PageHeader
        title="Institutional Dashboard"
        subtitle="Resource management & optimization at a glance"
        badge="SYSTEM: OPTIMIZED"
        actions={
          <Link
            to="/allocate"
            className="bg-primary text-primary-foreground text-sm px-4 py-1.5 rounded-md font-medium hover:opacity-90 transition"
          >
            New Allocation
          </Link>
        }
      />
      <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-6 animate-in-up">
          <StatCard label="Total Labs" value={labs.length} hint="Operational" accent="good" />
          <StatCard label="Avg. Utilization" value={`${utilization}%`} bar={utilization} accent="good" />
          <StatCard label="Total Students" value={totalStudents} hint={`${sections.length} sections`} />
          <StatCard label="Active Allocations" value={allocs.length} hint={`${wasteSeats} unused seats total`} accent={wasteSeats > 50 ? "warn" : "good"} />
        </section>

        <section className="grid lg:grid-cols-3 gap-8 animate-in-up">
          <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-surface-muted/40">
              <h2 className="font-semibold text-sm">Recent Allocations</h2>
              <span className="text-[10px] font-mono text-muted-foreground uppercase">Last 20</span>
            </div>
            {allocs.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                No allocations yet.{" "}
                <Link to="/allocate" className="text-primary font-medium">Run the engine</Link>.
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-surface-muted/30 border-b border-border">
                    {["Section", "Lab", "Date", "Slot", "Util.", "Waste"].map((h) => (
                      <th key={h} className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allocs.map((a: any) => {
                    const stud = a.sections?.student_count ?? 0;
                    const cap = a.labs?.capacity ?? 0;
                    const pct = cap ? Math.round((stud / cap) * 100) : 0;
                    return (
                      <tr key={a.id}>
                        <td className="px-6 py-4 font-medium">{a.sections?.section_name ?? "—"}</td>
                        <td className="px-6 py-4">{a.labs?.name ?? "—"}</td>
                        <td className="px-6 py-4 font-mono text-xs">{a.date}</td>
                        <td className="px-6 py-4 text-muted-foreground">{a.time_slot}</td>
                        <td className="px-6 py-4">
                          <span className="font-mono">{stud}/{cap}</span>{" "}
                          <span className={`text-[10px] font-bold ${pct >= 80 ? "text-accent" : "text-warning"}`}>{pct}%</span>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{a.unused_seats}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="font-semibold text-sm mb-4">Live Occupancy</h2>
              <div className="space-y-3">
                {labs.slice(0, 6).map((l) => {
                  const live = allocs.filter((a) => a.lab_id === l.id);
                  const used = live.reduce((acc, a: any) => acc + (a.sections?.student_count ?? 0), 0);
                  const pct = Math.min(100, Math.round((used / Math.max(1, l.capacity * Math.max(1, live.length))) * 100));
                  return (
                    <div key={l.id}>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground truncate">{l.name}</span>
                        <span className="font-mono">{used}/{l.capacity}</span>
                      </div>
                      <div className="h-1.5 bg-surface-muted rounded-full mt-1">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {labs.length === 0 && (
                  <p className="text-sm text-muted-foreground">No labs yet. Add some from Lab Inventory.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

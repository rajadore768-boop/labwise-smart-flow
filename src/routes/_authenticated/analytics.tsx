import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/Page";
import { RequireAdmin } from "@/components/RequireAdmin";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export const Route = createFileRoute("/_authenticated/analytics")({
  component: () => <RequireAdmin><Analytics /></RequireAdmin>,
  head: () => ({ meta: [{ title: "Analytics — SmartLab" }] }),
});

function Analytics() {
  const { data: labs = [] } = useQuery({
    queryKey: ["labs"],
    queryFn: async () => (await supabase.from("labs").select("*")).data ?? [],
  });
  const { data: allocs = [] } = useQuery({
    queryKey: ["allocations"],
    queryFn: async () => (await supabase.from("allocations").select("*, labs(name, capacity), sections(student_count)")).data ?? [],
  });

  const perLab = labs.map((l) => {
    const own = allocs.filter((a: any) => a.lab_id === l.id);
    const seatsUsed = own.reduce((acc, a: any) => acc + (a.sections?.student_count ?? 0), 0);
    const seatsOffered = l.capacity * Math.max(1, own.length);
    const util = own.length ? Math.round((seatsUsed / seatsOffered) * 100) : 0;
    const waste = own.reduce((acc, a: any) => acc + a.unused_seats, 0);
    return { name: l.name, util, waste, allocs: own.length };
  });

  const totalSeatsOffered = perLab.reduce((a, p) => a + p.allocs, 0);
  const overallUtil = perLab.length
    ? Math.round(perLab.reduce((a, p) => a + p.util, 0) / Math.max(1, perLab.filter(p=>p.allocs>0).length || 1))
    : 0;

  return (
    <>
      <PageHeader title="Analytics" subtitle="Institution-wide optimization insights" />
      <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <Stat label="Seat Utilization" value={`${overallUtil}%`} accent="good" />
          <Stat label="Total Allocations" value={allocs.length} />
          <Stat label="Total Wasted Seats" value={allocs.reduce((a, x) => a + x.unused_seats, 0)} accent="warn" />
          <Stat label="Labs in Use" value={perLab.filter((p) => p.allocs > 0).length} hint={`of ${labs.length}`} />
        </section>

        <section className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-sm mb-4">Capacity Efficiency by Lab</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perLab}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" unit="%" />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="util" radius={[6, 6, 0, 0]}>
                  {perLab.map((p, i) => (
                    <Cell key={i} fill={p.util >= 80 ? "var(--accent)" : p.util >= 50 ? "var(--primary)" : "var(--warning)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <RankCard title="Most Efficient Labs" rows={[...perLab].filter(p=>p.allocs>0).sort((a, b) => b.util - a.util).slice(0, 5)} />
          <RankCard title="Most Wasted Seats" rows={[...perLab].sort((a, b) => b.waste - a.waste).slice(0, 5)} metric="waste" />
        </section>
      </div>
    </>
  );
}

function Stat({ label, value, hint, accent }: { label: string; value: string | number; hint?: string; accent?: "good" | "warn" }) {
  return (
    <div className="bg-card p-5 border border-border rounded-xl">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-display mt-1">{value}</p>
      {hint && (
        <p className={`mt-2 text-[10px] font-mono ${accent === "warn" ? "text-warning" : "text-muted-foreground"}`}>{hint}</p>
      )}
    </div>
  );
}

function RankCard({ title, rows, metric = "util" }: { title: string; rows: any[]; metric?: "util" | "waste" }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <h3 className="font-semibold text-sm mb-4">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r, i) => (
            <li key={r.name} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-3">
                <span className="size-6 rounded bg-surface-muted grid place-items-center text-[10px] font-bold text-muted-foreground">{i + 1}</span>
                {r.name}
              </span>
              <span className="font-mono text-xs">
                {metric === "util" ? `${r.util}%` : `${r.waste} seats`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

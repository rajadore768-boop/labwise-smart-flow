import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/Page";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/my-labs")({
  component: MyLabs,
  head: () => ({ meta: [{ title: "Assigned Labs — SmartLab" }] }),
});

function MyLabs() {
  const { session } = useAuth();
  const uid = session?.user.id;

  const { data: allocs = [] } = useQuery({
    queryKey: ["my-allocs", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allocations")
        .select("lab_id, labs(*)")
        .eq("faculty_id", uid!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const uniqueLabs = Array.from(
    new Map((allocs as any[]).map((a) => [a.lab_id, a.labs])).values(),
  ).filter(Boolean);

  return (
    <>
      <PageHeader title="Assigned Labs" subtitle={`${uniqueLabs.length} labs in your rotation`} badge="FACULTY" />
      <div className="p-8 max-w-6xl mx-auto w-full grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {uniqueLabs.map((l: any) => (
          <div key={l.id} className="bg-card border border-border rounded-xl p-5">
            <div className="flex justify-between items-start">
              <h3 className="font-display text-lg">{l.name}</h3>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-muted">{l.lab_type}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Floor {l.floor} · {l.systems} systems · {l.ac ? "AC" : "Non-AC"}</p>
            <div className="mt-4 pt-4 border-t border-border flex justify-between">
              <div>
                <p className="text-[10px] uppercase text-muted-foreground">Capacity</p>
                <p className="font-display text-xl">{l.capacity}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase text-muted-foreground">Status</p>
                <p className="text-xs font-bold uppercase text-accent">{l.status}</p>
              </div>
            </div>
          </div>
        ))}
        {uniqueLabs.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No labs assigned yet.
          </div>
        )}
      </div>
    </>
  );
}

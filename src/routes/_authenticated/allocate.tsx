import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/Page";
import { RequireAdmin } from "@/components/RequireAdmin";
import { bestFit } from "@/lib/bestFit";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/allocate")({
  component: () => <RequireAdmin><AllocateEngine /></RequireAdmin>,
  head: () => ({ meta: [{ title: "Allocation Engine — SmartLab" }] }),
});

const TIME_SLOTS = [
  "09:00-10:00",
  "10:00-11:00",
  "11:00-12:00",
  "13:00-14:00",
  "14:00-15:00",
  "15:00-16:00",
];

function AllocateEngine() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState(TIME_SLOTS[0]);

  const { data: labs = [] } = useQuery({
    queryKey: ["labs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("labs").select("*").order("capacity");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: sections = [] } = useQuery({
    queryKey: ["sections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sections").select("*").order("section_name");
      if (error) throw error;
      return data ?? [];
    },
  });
  // Conflict pre-check: existing allocations for this date+slot
  const { data: conflicts = [] } = useQuery({
    queryKey: ["conflicts", date, slot],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("allocations")
        .select("lab_id")
        .eq("date", date)
        .eq("time_slot", slot);
      if (error) throw error;
      return (data ?? []).map((c) => c.lab_id as string);
    },
  });

  const section = sections.find((s) => s.id === sectionId);
  const studentCount = section?.student_count ?? 0;

  // Filter out conflicting labs BEFORE running Best Fit.
  const availableLabs = useMemo(
    () => labs.filter((l) => !conflicts.includes(l.id)),
    [labs, conflicts],
  );

  const result = useMemo(
    () => (section ? bestFit(availableLabs as any, studentCount) : null),
    [availableLabs, studentCount, section],
  );

  const allocate = useMutation({
    mutationFn: async () => {
      if (!section || !result?.lab) throw new Error("Pick a section first");
      // Re-verify conflict at submission time (race protection) — pre-check only.
      const { data: existing, error: ce } = await supabase
        .from("allocations")
        .select("id")
        .eq("date", date)
        .eq("time_slot", slot)
        .eq("lab_id", result.lab.id)
        .maybeSingle();
      if (ce) throw ce;
      if (existing) throw new Error("Conflict detected: lab booked for this slot");

      const { error } = await supabase.from("allocations").insert({
        section_id: section.id,
        lab_id: result.lab.id,
        date,
        time_slot: slot,
        unused_seats: result.unusedSeats,
      });
      if (error) throw error;
      // NOTE: success path does NOT re-run the conflict scan.
      // Previously the bug was: after a successful insert, the page would
      // re-query allocations including the just-inserted row and flag it
      // as a self-conflict. We avoid that entirely.
    },
    onSuccess: () => {
      toast.success(
        `Allocated ${result?.lab?.name} · ${result?.unusedSeats ?? 0} unused seats`,
      );
      // Invalidate after success so dashboard/recent allocations refresh,
      // but the engine UI keeps showing the same successful result.
      qc.invalidateQueries({ queryKey: ["allocations"] });
      qc.invalidateQueries({ queryKey: ["conflicts"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Smart Allocation Engine"
        subtitle="Best-Fit greedy allocator · minimize seat wastage"
        badge="ALGORITHM v1"
      />
      <div className="p-8 max-w-7xl mx-auto w-full space-y-8">
        <section className="bg-card border border-border rounded-xl overflow-hidden animate-in-up">
          <div className="px-6 py-4 border-b border-border bg-surface-muted/40 flex items-center justify-between">
            <h2 className="font-semibold text-sm">Configure allocation</h2>
            <span className="text-[10px] font-mono text-muted-foreground uppercase">Best Fit · Greedy</span>
          </div>
          <div className="p-6 grid lg:grid-cols-3 gap-6">
            <Field label="Section">
              <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className="inp">
                <option value="">— Pick a section —</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.section_name} · {s.department} · {s.student_count} students
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="inp" />
            </Field>
            <Field label="Time slot">
              <select value={slot} onChange={(e) => setSlot(e.target.value)} className="inp">
                {TIME_SLOTS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
          </div>
        </section>

        {section && (
          <section className="grid lg:grid-cols-3 gap-8 animate-in-up">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card border border-border rounded-xl p-6">
                <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-2">Input</label>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-lg font-display">{section.section_name}</p>
                    <p className="text-sm text-muted-foreground">Semester {section.semester} · {section.department}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-3xl font-display">{section.student_count}</span>
                    <span className="text-xs text-muted-foreground block">Students</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 py-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-mono text-muted-foreground">CANDIDATE LABS · CONFLICT-FILTERED</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {availableLabs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-warning/40 bg-warning/5 p-6 text-sm">
                  <strong>No available labs for this slot.</strong>
                  <p className="text-muted-foreground mt-1">All labs are already booked at {slot} on {date}.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {result?.considered.map((c) => {
                    const isPicked = result.lab?.id === c.id;
                    return (
                      <div
                        key={c.id}
                        className={`p-3 rounded-md relative transition ${
                          isPicked
                            ? "border-2 border-accent bg-accent/5"
                            : c.fits
                              ? "border border-border opacity-70"
                              : "border border-border opacity-40"
                        }`}
                      >
                        <p className="text-[10px] font-mono uppercase">{c.name} · Cap {c.capacity}</p>
                        <p className={`text-[10px] font-bold mt-1 uppercase ${
                          isPicked ? "text-accent" : !c.fits ? "text-destructive" : "text-muted-foreground"
                        }`}>
                          {!c.fits ? "Insufficient" : isPicked ? `Best Fit (waste ${c.waste})` : `Waste ${c.waste}`}
                        </p>
                        {isPicked && (
                          <div className="absolute -top-2 -right-2 size-4 bg-accent rounded-full grid place-items-center text-[8px] text-accent-foreground">
                            <Check className="size-3" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {conflicts.length > 0 && (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <X className="size-3" />
                  {conflicts.length} lab(s) filtered out due to existing bookings at this slot.
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="aspect-square bg-foreground rounded-xl p-5 flex flex-col justify-between text-background">
                <p className="text-[10px] font-mono opacity-60 uppercase">Waste Analysis</p>
                <div>
                  <p className="text-4xl font-display text-accent">
                    {result?.lab ? String(result.unusedSeats).padStart(2, "0") : "—"}
                  </p>
                  <p className="text-[10px] font-mono uppercase">Unused Seats</p>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{
                      width: result?.lab
                        ? `${Math.round((result.unusedSeats / result.lab.capacity) * 100)}%`
                        : "0%",
                    }}
                  />
                </div>
              </div>

              <button
                onClick={() => allocate.mutate()}
                disabled={!result?.lab || allocate.isPending}
                className="w-full py-3 bg-primary text-primary-foreground rounded-lg text-xs font-bold uppercase tracking-widest hover:opacity-90 disabled:opacity-40 transition"
              >
                {allocate.isPending ? "Allocating…" : "Confirm allocation"}
              </button>

              {!result?.lab && section && availableLabs.length > 0 && (
                <p className="text-xs text-warning">No lab is large enough for {studentCount} students.</p>
              )}
            </div>
          </section>
        )}

        {!section && (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            Pick a section above to run the Best Fit engine.
          </div>
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

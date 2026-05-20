import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/Page";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "Profile — SmartLab" }] }),
});

function ProfilePage() {
  const qc = useQueryClient();
  const { session, role } = useAuth();
  const uid = session?.user.id;
  const [fullName, setFullName] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["profile", uid],
    enabled: !!uid,
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", uid!).maybeSingle()).data,
  });

  useEffect(() => {
    if (profile) setFullName(profile.full_name ?? "");
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", uid!);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profile updated"); qc.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader title="Profile" subtitle="Account settings" />
      <div className="p-8 max-w-2xl mx-auto w-full">
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Email</span>
            <p className="mt-1 text-sm">{profile?.email ?? session?.user.email}</p>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Role</span>
            <p className="mt-1 text-sm uppercase font-semibold">{role ?? "faculty"}</p>
          </div>
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Full name</span>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="mt-1.5 w-full px-3 py-2 bg-surface-muted border border-border rounded-md text-sm" />
          </label>
          <button onClick={() => save.mutate()} disabled={save.isPending}
            className="px-4 py-2 rounded-md bg-foreground text-background text-sm font-semibold disabled:opacity-50">
            {save.isPending ? "Saving…" : "Save profile"}
          </button>
        </div>
      </div>
    </>
  );
}

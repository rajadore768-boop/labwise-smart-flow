import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/Page";
import { useAuth } from "@/hooks/useAuth";
import { Bell, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
  head: () => ({ meta: [{ title: "Notifications — SmartLab" }] }),
});

function NotificationsPage() {
  const qc = useQueryClient();
  const { session } = useAuth();
  const uid = session?.user.id;

  const { data: items = [] } = useQuery({
    queryKey: ["notifications", uid],
    enabled: !!uid,
    queryFn: async () => (await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", uid!)
      .order("created_at", { ascending: false })).data ?? [],
  });

  const mark = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <>
      <PageHeader title="Notifications" subtitle={`${items.filter((i) => !i.read).length} unread`} />
      <div className="p-8 max-w-3xl mx-auto w-full space-y-2">
        {items.map((n) => (
          <div key={n.id} className={`border border-border rounded-xl p-4 flex items-start gap-3 ${n.read ? "bg-card" : "bg-primary/5"}`}>
            <Bell className={`size-4 mt-0.5 shrink-0 ${n.read ? "text-muted-foreground" : "text-primary"}`} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{n.title}</p>
              {n.body && <p className="text-xs text-muted-foreground mt-1">{n.body}</p>}
              <p className="text-[10px] font-mono text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
            </div>
            {!n.read && (
              <button onClick={() => mark.mutate(n.id)} className="text-muted-foreground hover:text-foreground p-1">
                <Check className="size-4" />
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No notifications yet.
          </div>
        )}
      </div>
    </>
  );
}

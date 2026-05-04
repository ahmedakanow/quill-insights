import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PenLine } from "lucide-react";

export const Route = createFileRoute("/reflections/")({
  component: () => <RequireAuth><AppShell><ReflectionsList /></AppShell></RequireAuth>,
});

function ReflectionsList() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    if (!user) return;
    supabase.from("reflections").select("*, books(title, author, cover_image_url)")
      .eq("user_id", user.id).order("updated_at", { ascending: false })
      .then(({ data }) => setItems(data ?? []));
  }, [user]);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 lg:px-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Reflections</h1>
          <p className="mt-1 text-sm text-muted-foreground">Five questions to turn reading into thinking.</p>
        </div>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={PenLine} title="No reflections yet" message="Pick a finished book and write your first reflection." ctaLabel="Browse my books" ctaTo="/my-books" />
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li key={r.id}>
              <Link to="/reflections/$id" params={{ id: r.id }} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-warm transition-quill hover:shadow-warm-lg">
                {r.books?.cover_image_url && <img src={r.books.cover_image_url} alt="" className="h-16 w-12 rounded object-cover" />}
                <div className="min-w-0 flex-1">
                  <div className="font-display text-lg font-semibold">{r.books?.title}</div>
                  <div className="text-xs text-muted-foreground">{r.books?.author}</div>
                  <div className="mt-1 line-clamp-1 text-sm text-muted-foreground">{r.argument_summary?.slice(0, 120) || "No summary yet."}</div>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${r.is_complete ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"}`}>
                  {r.is_complete ? "Complete" : "In progress"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

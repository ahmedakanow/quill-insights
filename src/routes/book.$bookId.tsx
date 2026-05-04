import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { categoryLabel, difficultyClass } from "@/lib/quill-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/book/$bookId")({
  component: () => <RequireAuth><AppShell><BookDetail /></AppShell></RequireAuth>,
});

function BookDetail() {
  const { bookId } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [book, setBook] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [annotations, setAnnotations] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("books").select("*").eq("id", bookId).maybeSingle().then(({ data }) => setBook(data));
    if (user) {
      supabase.from("reading_progress").select("*").eq("user_id", user.id).eq("book_id", bookId)
        .maybeSingle().then(({ data }) => setProgress(data));
      supabase.from("annotations").select("*").eq("user_id", user.id).eq("book_id", bookId)
        .order("position_percent").then(({ data }) => setAnnotations(data ?? []));
    }
  }, [bookId, user]);

  async function startReading() {
    if (!user) return;
    await supabase.from("reading_progress").upsert({
      user_id: user.id, book_id: bookId, status: "reading",
      started_at: progress?.started_at ?? new Date().toISOString(),
      last_read_at: new Date().toISOString(),
    }, { onConflict: "user_id,book_id" });
    nav({ to: "/read/$bookId", params: { bookId } });
  }

  async function addToList() {
    if (!user) return;
    await supabase.from("reading_progress").upsert({
      user_id: user.id, book_id: bookId, status: "want_to_read",
    }, { onConflict: "user_id,book_id" });
    toast.success("Added to your list");
  }

  if (!book) return <div className="mx-auto max-w-5xl p-8 text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 lg:px-8">
      <div className="grid gap-8 md:grid-cols-[260px_1fr]">
        <img src={book.cover_image_url} alt={book.title} className="w-full rounded-lg shadow-warm-lg" />
        <div>
          <h1 className="font-display text-4xl font-semibold leading-tight">{book.title}</h1>
          <p className="mt-2 text-lg text-muted-foreground">{book.author}</p>
          {book.publisher && <p className="text-xs text-muted-foreground">{book.publisher}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className={cn("rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide", difficultyClass(book.difficulty))}>{book.difficulty}</span>
            <Badge variant="secondary">{categoryLabel(book.category)}</Badge>
            <Badge variant="outline">{Math.round(book.estimated_read_minutes / 60)}h read</Badge>
            {book.subjects.map((s: string) => <Badge key={s} variant="outline">{s}</Badge>)}
          </div>
          <p className="mt-6 whitespace-pre-line font-serif-reading text-base leading-relaxed">{book.description}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button onClick={startReading}>{progress?.status === "reading" ? "Continue reading" : progress?.status === "finished" ? "Read again" : "Start reading"}</Button>
            {!progress && <Button variant="outline" onClick={addToList}>Add to my books</Button>}
            {progress?.status === "finished" && (
              <Button variant="outline" asChild><Link to="/reflections/new" search={{ bookId } as any}>Write reflection</Link></Button>
            )}
          </div>
        </div>
      </div>

      {book.chapter_titles?.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl font-semibold">Chapters</h2>
          <ol className="divide-y divide-border rounded-xl border border-border bg-card text-sm">
            {book.chapter_titles.map((c: string, i: number) => (
              <li key={i} className="flex items-center gap-3 p-3">
                <span className="font-display text-muted-foreground">{i + 1}.</span>
                <span className="font-serif-reading">{c}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {annotations.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-xl font-semibold">Your annotations</h2>
          <ul className="space-y-2">
            {annotations.map((a) => (
              <li key={a.id} className="rounded-lg border border-border bg-card p-3 text-sm">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{a.type}</div>
                {a.selected_text && <div className={`mt-1 font-serif-reading hl-${a.color}`}>"{a.selected_text}"</div>}
                {a.note_content && <div className="mt-1 text-muted-foreground">{a.note_content}</div>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

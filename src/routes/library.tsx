import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { BookCard, type BookCardData } from "@/components/book-card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Search } from "lucide-react";

export const Route = createFileRoute("/library")({
  component: () => <RequireAuth><AppShell><LibraryPage /></AppShell></RequireAuth>,
});

function LibraryPage() {
  const { user } = useAuth();
  const [books, setBooks] = useState<BookCardData[]>([]);
  const [progress, setProgress] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [subject, setSubject] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("books").select("*").then(({ data }) => setBooks(data ?? []));
    if (user) {
      supabase.from("profiles").select("target_subject").eq("id", user.id).maybeSingle()
        .then(({ data }) => setSubject(data?.target_subject ?? null));
      supabase.from("reading_progress").select("book_id, status").eq("user_id", user.id)
        .then(({ data }) => {
          const m: Record<string, string> = {};
          (data ?? []).forEach((r: any) => { m[r.book_id] = r.status; });
          setProgress(m);
        });
    }
  }, [user]);

  const filtered = useMemo(() => {
    let list = books;
    if (q) {
      const ql = q.toLowerCase();
      list = list.filter((b) => b.title.toLowerCase().includes(ql) || b.author.toLowerCase().includes(ql));
    }
    if (cat !== "all") list = list.filter((b) => b.category === cat);
    // Relevance sort: target subject first
    if (subject) {
      list = [...list].sort((a, b) => {
        const ai = a.subjects.includes(subject) ? 0 : 1;
        const bi = b.subjects.includes(subject) ? 0 : 1;
        return ai - bi;
      });
    }
    return list;
  }, [books, q, cat, subject]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 lg:px-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">Library</h1>
        <p className="mt-1 text-sm text-muted-foreground">Curated reading for Oxbridge applicants.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by title or author…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <Tabs value={cat} onValueChange={setCat}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="super_curricular">Super-curricular</TabsTrigger>
          <TabsTrigger value="core_text">Core texts</TabsTrigger>
          <TabsTrigger value="wider_reading">Wider reading</TabsTrigger>
          <TabsTrigger value="interview_prep">Interview prep</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {filtered.map((b) => (
          <BookCard key={b.id} book={b} status={progress[b.id] as any} />
        ))}
      </div>
    </div>
  );
}

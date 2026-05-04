import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/require-auth";
import { AppShell } from "@/components/app-shell";
import { BookCard } from "@/components/book-card";
import { EmptyState } from "@/components/empty-state";
import { BookGridSkeleton } from "@/components/skeletons";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Bookmark } from "lucide-react";

export const Route = createFileRoute("/my-books")({
  component: () => <RequireAuth><AppShell><MyBooks /></AppShell></RequireAuth>,
});

function MyBooks() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[] | null>(null);
  useEffect(() => {
    if (!user) return;
    supabase.from("reading_progress").select("*, books(*)").eq("user_id", user.id)
      .then(({ data }) => setItems(data ?? []));
  }, [user]);
  const by = (s: string) => (items ?? []).filter((i) => i.status === s && i.books);

  const Section = ({ s }: { s: string }) => {
    if (items === null) return <BookGridSkeleton count={4} />;
    const list = by(s);
    if (list.length === 0)
      return (
        <EmptyState
          icon={Bookmark}
          title="Nothing here yet"
          message="Books you save will show up here."
          ctaLabel="Browse the library"
          ctaTo="/library"
          estimatedTime="Adding a book takes 10 seconds."
        />
      );
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {list.map((r) => <BookCard key={r.id} book={r.books} status={r.status} progress={r.scroll_position} />)}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 lg:px-8">
      <h1 className="font-display text-3xl font-semibold">My books</h1>
      <Tabs defaultValue="reading">
        <TabsList>
          <TabsTrigger value="reading">Currently reading</TabsTrigger>
          <TabsTrigger value="finished">Finished</TabsTrigger>
          <TabsTrigger value="want_to_read">Want to read</TabsTrigger>
        </TabsList>
        <TabsContent value="reading" className="mt-6"><Section s="reading" /></TabsContent>
        <TabsContent value="finished" className="mt-6"><Section s="finished" /></TabsContent>
        <TabsContent value="want_to_read" className="mt-6"><Section s="want_to_read" /></TabsContent>
      </Tabs>
    </div>
  );
}

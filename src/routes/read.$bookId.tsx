import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Settings, Highlighter, StickyNote, Bookmark, BookCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { checkAchievements } from "@/lib/achievements";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/read/$bookId")({ component: Reader });

const COLORS = ["yellow", "green", "blue", "pink", "purple"] as const;
const THEMES = [
  { k: "light", label: "Cream" },
  { k: "sepia", label: "Sepia" },
  { k: "dark", label: "Dark" },
  { k: "contrast", label: "Contrast" },
] as const;

function Reader() {
  const { bookId } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [book, setBook] = useState<any>(null);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [scrollPct, setScrollPct] = useState(0);
  const [selection, setSelection] = useState<{ text: string; pct: number; x: number; y: number } | null>(null);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);

  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [width, setWidth] = useState(720);
  const [theme, setTheme] = useState<typeof THEMES[number]["k"]>("light");
  const [fontFamily, setFontFamily] = useState("var(--font-serif)");

  const containerRef = useRef<HTMLDivElement>(null);
  const sessionStart = useRef(Date.now());
  const lastFlush = useRef(Date.now());

  // Load preferences
  useEffect(() => {
    const p = localStorage.getItem("quill-reader-prefs");
    if (p) {
      try {
        const v = JSON.parse(p);
        if (v.fontSize) setFontSize(v.fontSize);
        if (v.lineHeight) setLineHeight(v.lineHeight);
        if (v.width) setWidth(v.width);
        if (v.theme) setTheme(v.theme);
        if (v.fontFamily) setFontFamily(v.fontFamily);
      } catch {}
    }
  }, []);
  useEffect(() => {
    localStorage.setItem("quill-reader-prefs", JSON.stringify({ fontSize, lineHeight, width, theme, fontFamily }));
  }, [fontSize, lineHeight, width, theme, fontFamily]);

  useEffect(() => {
    supabase.from("books").select("*").eq("id", bookId).maybeSingle().then(({ data }) => setBook(data));
    if (user) {
      supabase.from("annotations").select("*").eq("user_id", user.id).eq("book_id", bookId)
        .then(({ data }) => setAnnotations(data ?? []));
      supabase.from("reading_progress").select("scroll_position").eq("user_id", user.id).eq("book_id", bookId)
        .maybeSingle().then(({ data }) => {
          if (data?.scroll_position && containerRef.current) {
            setTimeout(() => {
              window.scrollTo({ top: document.documentElement.scrollHeight * data.scroll_position });
            }, 100);
          }
        });
    }
  }, [bookId, user]);

  // Track scroll position
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      setScrollPct(pct);
    };
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [book]);

  // Save reading session every 60s
  useEffect(() => {
    if (!user) return;
    const flush = async () => {
      const now = Date.now();
      const min = Math.floor((now - lastFlush.current) / 60000);
      if (min < 1) return;
      lastFlush.current = now;
      await supabase.from("reading_sessions").insert({
        user_id: user.id, book_id: bookId, duration_minutes: min,
        session_date: new Date().toISOString().slice(0, 10),
      });
      const { data: existing } = await supabase
        .from("reading_progress")
        .select("total_reading_minutes")
        .eq("user_id", user.id).eq("book_id", bookId).maybeSingle();
      const newTotal = (existing?.total_reading_minutes ?? 0) + min;
      await supabase.from("reading_progress").update({
        scroll_position: scrollPct, last_read_at: new Date().toISOString(),
        total_reading_minutes: newTotal,
      }).eq("user_id", user.id).eq("book_id", bookId);
    };
    const id = setInterval(flush, 60000);
    return () => { clearInterval(id); flush(); };
  }, [user, bookId, scrollPct]);

  // Selection handler
  const onMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) { setSelection(null); return; }
    const text = sel.toString().trim();
    if (!text || !containerRef.current) { setSelection(null); return; }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const pct = max > 0 ? window.scrollY / max : 0;
    setSelection({ text, pct, x: rect.left + rect.width / 2, y: rect.top - 8 });
  };

  async function addAnnotation(type: "highlight" | "note" | "bookmark", color = "yellow", note?: string) {
    if (!user) return;
    const payload: any = {
      user_id: user.id, book_id: bookId, type, color,
      selected_text: selection?.text ?? null, note_content: note ?? null,
      position_percent: selection?.pct ?? scrollPct,
    };
    const { data } = await supabase.from("annotations").insert(payload).select().maybeSingle();
    if (data) setAnnotations((a) => [...a, data]);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
    toast.success(type === "bookmark" ? "Bookmarked" : type === "note" ? "Note saved" : "Highlighted");
  }

  async function markFinished() {
    if (!user) return;
    await supabase.from("reading_progress").update({
      status: "finished", finished_at: new Date().toISOString(), scroll_position: 1,
    }).eq("user_id", user.id).eq("book_id", bookId);
    const newly = await checkAchievements(user.id);
    newly.forEach((t) => toast.success(`Achievement unlocked: ${t.replace(/_/g, " ")}`));
    nav({ to: "/book/$bookId", params: { bookId } });
  }

  if (!book) return <div className="grid min-h-screen place-items-center">Loading…</div>;

  return (
    <div className={`min-h-screen reader-theme-${theme} paper-grain`}>
      {/* Top progress bar */}
      <div className="fixed left-0 right-0 top-0 z-40 h-0.5 bg-transparent">
        <div className="h-full bg-accent transition-quill" style={{ width: `${scrollPct * 100}%` }} />
      </div>

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-black/5 bg-inherit/80 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-5xl items-center gap-3 px-4">
          <button onClick={() => nav({ to: "/book/$bookId", params: { bookId } })} className="grid h-8 w-8 place-items-center rounded hover:bg-black/5">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 truncate text-center font-display text-sm">{book.title}</div>
          <div className="text-xs opacity-70">{Math.round(scrollPct * 100)}%</div>
          <Sheet>
            <SheetTrigger asChild>
              <button className="grid h-8 w-8 place-items-center rounded hover:bg-black/5"><Settings className="h-4 w-4" /></button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader><SheetTitle>Reading settings</SheetTitle></SheetHeader>
              <div className="mt-6 space-y-6 text-sm">
                <div>
                  <div className="mb-2 font-medium">Font size: {fontSize}px</div>
                  <Slider value={[fontSize]} min={14} max={28} step={1} onValueChange={(v) => setFontSize(v[0])} />
                </div>
                <div>
                  <div className="mb-2 font-medium">Line height: {lineHeight.toFixed(1)}</div>
                  <Slider value={[lineHeight * 10]} min={14} max={24} step={1} onValueChange={(v) => setLineHeight(v[0] / 10)} />
                </div>
                <div>
                  <div className="mb-2 font-medium">Width: {width}px</div>
                  <Slider value={[width]} min={480} max={800} step={20} onValueChange={(v) => setWidth(v[0])} />
                </div>
                <div>
                  <div className="mb-2 font-medium">Font</div>
                  <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="w-full rounded-md border border-border bg-background p-2">
                    <option value="var(--font-serif)">Source Serif 4</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="'Atkinson Hyperlegible', sans-serif">Atkinson Hyperlegible</option>
                    <option value="system-ui, sans-serif">System sans-serif</option>
                  </select>
                </div>
                <div>
                  <div className="mb-2 font-medium">Theme</div>
                  <div className="flex gap-2">
                    {THEMES.map((t) => (
                      <button key={t.k} onClick={() => setTheme(t.k)}
                        className={cn("h-10 w-10 rounded-full border-2", theme === t.k ? "border-accent" : "border-border", `reader-theme-${t.k}`)}
                        title={t.label} />
                    ))}
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Reading column */}
      <article
        ref={containerRef}
        onMouseUp={onMouseUp}
        onTouchEnd={onMouseUp}
        className="mx-auto px-6 py-12 font-serif-reading"
        style={{ maxWidth: `${width}px`, fontSize: `${fontSize}px`, lineHeight, fontFamily }}
      >
        {book.content_text.split("\n\n").map((para: string, i: number) => (
          <p key={i} className="mb-6 whitespace-pre-line">{para}</p>
        ))}

        <div className="mt-12 flex justify-center">
          <Button onClick={markFinished} variant="outline" className="gap-2">
            <BookCheck className="h-4 w-4" /> Mark as finished
          </Button>
        </div>
      </article>

      {/* Selection toolbar */}
      {selection && (
        <div
          className="fixed z-50 flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-warm-lg"
          style={{ left: Math.max(10, Math.min(window.innerWidth - 280, selection.x - 140)), top: Math.max(10, selection.y - 50) }}
        >
          {COLORS.map((c) => (
            <button key={c} onClick={() => addAnnotation("highlight", c)}
              className={`h-6 w-6 rounded-full hl-${c} border border-black/10`} title={`Highlight ${c}`} />
          ))}
          <span className="mx-1 h-5 w-px bg-border" />
          <button className="grid h-7 w-7 place-items-center rounded hover:bg-muted" title="Note"
            onClick={() => { const n = prompt("Add a note"); if (n) addAnnotation("note", "yellow", n); }}>
            <StickyNote className="h-4 w-4" />
          </button>
          <button className="grid h-7 w-7 place-items-center rounded hover:bg-muted" title="Bookmark"
            onClick={() => addAnnotation("bookmark")}>
            <Bookmark className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Bookmarks margin (desktop) */}
      <div className="pointer-events-none fixed right-2 top-20 hidden lg:block">
        {annotations.filter((a) => a.type === "bookmark").map((b) => (
          <div key={b.id} className="absolute right-0" style={{ top: `${b.position_percent * 70}vh` }}>
            <Bookmark className="h-3 w-3 text-accent" />
          </div>
        ))}
      </div>
    </div>
  );
}

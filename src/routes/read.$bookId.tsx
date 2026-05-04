import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Settings, StickyNote, Bookmark, BookCheck, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { checkAchievements } from "@/lib/achievements";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/read/$bookId")({ component: Reader });

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function renderParagraphWithHighlights(para: string, annotations: any[]): string {
  const matches = annotations.filter((a) => (a.type === "highlight" || a.type === "note") && a.selected_text && para.includes(a.selected_text));
  if (matches.length === 0) return escapeHtml(para);
  matches.sort((a, b) => b.selected_text.length - a.selected_text.length);
  let html = escapeHtml(para);
  for (const a of matches) {
    const safe = escapeHtml(a.selected_text);
    const re = new RegExp(escapeRegex(safe), "g");
    const cls = `hl-${a.color || "yellow"}`;
    const title = a.note_content ? ` title="${escapeHtml(a.note_content)}"` : "";
    html = html.replace(re, `<mark class="${cls} rounded px-0.5"${title}>${safe}</mark>`);
  }
  return html;
}

const COLORS = ["yellow", "green", "blue", "pink", "purple"] as const;
const THEMES = [
  { k: "light", label: "Cream" },
  { k: "sepia", label: "Sepia" },
  { k: "dark", label: "Dark" },
  { k: "contrast", label: "Contrast" },
] as const;

const SHORTCUTS: Array<[string, string]> = [
  ["Esc", "Back to book detail"],
  ["↓ / J", "Scroll down one paragraph"],
  ["↑ / K", "Scroll up one paragraph"],
  ["?", "Show this help"],
];

function Reader() {
  const { bookId } = Route.useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [book, setBook] = useState<any>(null);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [scrollPct, setScrollPct] = useState(0);
  const [selection, setSelection] = useState<{ text: string; pct: number; x: number; y: number } | null>(null);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [showHint, setShowHint] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("quill-reader-hint-dismissed") !== "1";
  });

  const [fontSize, setFontSize] = useState(18);
  const [lineHeight, setLineHeight] = useState(1.8);
  const [widthCh, setWidthCh] = useState(65);
  const [theme, setTheme] = useState<typeof THEMES[number]["k"]>("light");
  const [fontFamily, setFontFamily] = useState("var(--font-serif)");

  const containerRef = useRef<HTMLDivElement>(null);
  const lastFlush = useRef(Date.now());

  useEffect(() => {
    const p = localStorage.getItem("quill-reader-prefs");
    if (p) {
      try {
        const v = JSON.parse(p);
        if (v.fontSize) setFontSize(v.fontSize);
        if (v.lineHeight) setLineHeight(v.lineHeight);
        if (v.widthCh) setWidthCh(v.widthCh);
        else if (v.width) setWidthCh(Math.round(v.width / 11)); // legacy px → approx ch
        if (v.theme) setTheme(v.theme);
        if (v.fontFamily) setFontFamily(v.fontFamily);
      } catch {}
    }
  }, []);
  useEffect(() => {
    localStorage.setItem("quill-reader-prefs", JSON.stringify({ fontSize, lineHeight, widthCh, theme, fontFamily }));
  }, [fontSize, lineHeight, widthCh, theme, fontFamily]);

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

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === "Escape") {
        e.preventDefault();
        nav({ to: "/book/$bookId", params: { bookId } });
        return;
      }
      const step = Math.round(parseFloat(getComputedStyle(document.body).fontSize || "16") * lineHeight * 4);
      if (e.key === "ArrowDown" || e.key === "j" || e.key === "J") {
        e.preventDefault();
        window.scrollBy({ top: step, behavior: "smooth" });
      } else if (e.key === "ArrowUp" || e.key === "k" || e.key === "K") {
        e.preventDefault();
        window.scrollBy({ top: -step, behavior: "smooth" });
      } else if (e.key === "?") {
        e.preventDefault();
        setHelpOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bookId, nav, lineHeight]);

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

  if (!book) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl space-y-4 px-6 py-16">
          <h1 className="sr-only">Loading book</h1>
          {["w-full", "w-11/12", "w-10/12", "w-full", "w-9/12", "w-11/12", "w-8/12", "w-10/12"].map((w, i) => (
            <Skeleton key={i} className={`h-4 ${w}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen reader-theme-${theme} paper-grain`}>
      {/* Top progress bar */}
      <div className="fixed left-0 right-0 top-0 z-40 h-0.5 bg-transparent">
        <div className="h-full bg-accent transition-quill" style={{ width: `${scrollPct * 100}%` }} />
      </div>

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-black/5 bg-inherit/80 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-5xl items-center gap-3 px-4">
          <button
            onClick={() => nav({ to: "/book/$bookId", params: { bookId } })}
            aria-label="Back to book detail"
            className="grid min-h-[44px] min-w-[44px] place-items-center rounded hover:bg-black/5"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="flex-1 truncate text-center font-display text-sm">{book.title}</h1>
          <div className="text-xs opacity-70">{Math.round(scrollPct * 100)}%</div>
          <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
            <DialogTrigger asChild>
              <button
                aria-label="Keyboard shortcuts"
                className="grid min-h-[44px] min-w-[44px] place-items-center rounded hover:bg-black/5"
              >
                <HelpCircle className="h-4 w-4" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader><DialogTitle>Keyboard shortcuts</DialogTitle></DialogHeader>
              <table className="w-full text-sm">
                <tbody>
                  {SHORTCUTS.map(([key, action]) => (
                    <tr key={key} className="border-b border-border last:border-0">
                      <td className="py-2 pr-4">
                        <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs">{key}</kbd>
                      </td>
                      <td className="py-2 text-muted-foreground">{action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DialogContent>
          </Dialog>
          <Sheet>
            <SheetTrigger asChild>
              <button
                aria-label="Reading settings"
                className="grid min-h-[44px] min-w-[44px] place-items-center rounded hover:bg-black/5"
              >
                <Settings className="h-4 w-4" />
              </button>
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
                  <div className="mb-2 font-medium">Width: {widthCh} characters</div>
                  <Slider value={[widthCh]} min={45} max={90} step={1} onValueChange={(v) => setWidthCh(v[0])} />
                </div>
                <div>
                  <div className="mb-2 font-medium">Font</div>
                  <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="w-full rounded-md border border-border bg-background p-2">
                    <option value="var(--font-serif)">Source Serif 4</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value='"Atkinson Hyperlegible", sans-serif'>Atkinson Hyperlegible</option>
                    <option value='"OpenDyslexic", sans-serif'>OpenDyslexic</option>
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

      {/* First-visit hint */}
      {showHint && (
        <div className="mx-auto mt-3 flex max-w-2xl items-start gap-3 rounded-lg border border-border bg-card/80 px-4 py-2 text-sm shadow-warm">
          <span className="mt-0.5">💡</span>
          <div className="flex-1">
            <span className="font-medium">Tip:</span> Select any text to highlight it, add a note, or bookmark the spot. Press <kbd className="rounded border border-border bg-muted px-1 font-mono text-xs">?</kbd> for keyboard shortcuts.
          </div>
          <button
            onClick={() => { setShowHint(false); localStorage.setItem("quill-reader-hint-dismissed", "1"); }}
            className="text-xs text-muted-foreground hover:text-foreground"
            aria-label="Dismiss tip"
          >
            Got it
          </button>
        </div>
      )}

      {/* Reading column */}
      <article
        ref={containerRef}
        lang="en"
        onMouseUp={onMouseUp}
        onTouchEnd={onMouseUp}
        className="mx-auto px-6 py-12 font-serif-reading reading-column"
        style={{
          maxWidth: `${widthCh}ch`,
          fontSize: `${fontSize}px`,
          lineHeight,
          fontFamily,
          textRendering: "optimizeLegibility",
          fontFeatureSettings: '"liga", "kern"',
          hyphens: "auto",
        }}
      >
        {book.content_text.split("\n\n").map((para: string, i: number) => (
          <p
            key={i}
            className="whitespace-pre-line"
            style={{ marginBottom: "1.5em" }}
            dangerouslySetInnerHTML={{ __html: renderParagraphWithHighlights(para, annotations) }}
          />
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
          // Prevent the toolbar (or any of its buttons) from stealing the
          // text selection. Without this, mousedown on a swatch collapses
          // the selection before our click handler runs and the highlighted
          // appearance disappears mid-action.
          onMouseDown={(e) => e.preventDefault()}
          className="fixed z-50 flex flex-col gap-1 rounded-lg border border-border bg-card p-2 shadow-warm-lg"
          style={{ left: Math.max(10, Math.min(window.innerWidth - 300, selection.x - 150)), top: Math.max(10, selection.y - 70) }}
        >
          <div className="px-1 pb-1 text-[11px] text-muted-foreground">
            Highlighting:{" "}
            <span className="font-medium text-foreground">
              “{selection.text.length > 60 ? selection.text.slice(0, 60) + "…" : selection.text}”
            </span>
          </div>
          <div className="flex items-center gap-1">
            {COLORS.map((c) => (
              <button key={c} onClick={() => addAnnotation("highlight", c)}
                aria-label={`Highlight ${c}`}
                className={`hl-swatch h-6 w-6 rounded-full hl-${c} border border-black/10`} title={`Highlight ${c}`} />
            ))}
            <span className="mx-1 h-5 w-px bg-border" />
            <button className="grid min-h-[36px] min-w-[36px] place-items-center rounded hover:bg-muted" title="Add a note to this passage"
              aria-label="Add note"
              onClick={() => setNoteDraft("")}>
              <StickyNote className="h-4 w-4" />
            </button>
            <button className="grid min-h-[36px] min-w-[36px] place-items-center rounded hover:bg-muted" title="Bookmark this spot"
              aria-label="Bookmark"
              onClick={() => addAnnotation("bookmark")}>
              <Bookmark className="h-4 w-4" />
            </button>
          </div>
          {noteDraft !== null && (
            <div className="flex flex-col gap-2 p-2 w-64">
              <textarea
                autoFocus
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Write a note…"
                className="min-h-[72px] w-full resize-none rounded border border-border bg-background p-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setNoteDraft(null)}>Cancel</Button>
                <Button size="sm" onClick={() => {
                  if (noteDraft && noteDraft.trim()) addAnnotation("note", "yellow", noteDraft.trim());
                  setNoteDraft(null);
                }}>Save note</Button>
              </div>
            </div>
          )}
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

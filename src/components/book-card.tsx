import { Link } from "@tanstack/react-router";
import { Bookmark, BookCheck, BookOpen as BookIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { categoryLabel, difficultyClass } from "@/lib/quill-data";
import { cn } from "@/lib/utils";

export interface BookCardData {
  id: string;
  title: string;
  author: string;
  cover_image_url: string | null;
  subjects: string[];
  difficulty: string;
  category: string;
  estimated_read_minutes: number;
}

export function BookCard({
  book,
  status,
  progress,
}: {
  book: BookCardData;
  status?: "not_started" | "reading" | "finished" | "want_to_read";
  progress?: number;
}) {
  return (
    <Link
      to="/book/$bookId"
      params={{ bookId: book.id }}
      className="group block overflow-hidden rounded-lg border border-border bg-card shadow-warm transition-quill hover:shadow-warm-lg hover:-translate-y-0.5"
    >
      <div className="aspect-[2/3] w-full overflow-hidden bg-muted">
        {book.cover_image_url ? (
          <img
            src={book.cover_image_url}
            alt={book.title}
            loading="lazy"
            className="h-full w-full object-cover transition-quill group-hover:scale-[1.02]"
          />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground">
            <BookIcon className="h-10 w-10" />
          </div>
        )}
      </div>
      <div className="space-y-2 p-3">
        <h3 className="font-display text-base font-semibold leading-snug line-clamp-2">
          {book.title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-1">{book.author}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
              difficultyClass(book.difficulty),
            )}
          >
            {book.difficulty}
          </span>
          <Badge variant="secondary" className="text-[10px] font-normal">
            {categoryLabel(book.category)}
          </Badge>
          <span className="ml-auto text-[10px] text-muted-foreground">
            {Math.round(book.estimated_read_minutes / 60)}h
          </span>
        </div>
        {status === "reading" && typeof progress === "number" && (
          <div className="space-y-1 pt-1">
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-accent transition-quill"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{Math.round(progress * 100)}% read</span>
              <span>
                {Math.max(1, Math.round(book.estimated_read_minutes * (1 - progress)))} min left
              </span>
            </div>
          </div>
        )}
        {status === "finished" && (
          <div className="flex items-center gap-1.5 pt-1 text-[11px] text-emerald-700 dark:text-emerald-300">
            <BookCheck className="h-3.5 w-3.5" /> Finished
          </div>
        )}
        {status === "want_to_read" && (
          <div className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
            <Bookmark className="h-3.5 w-3.5" /> Want to read
          </div>
        )}
      </div>
    </Link>
  );
}

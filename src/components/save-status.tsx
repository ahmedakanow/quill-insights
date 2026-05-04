import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved";

export function SaveStatusIndicator({
  status,
  savedAt,
  className,
}: {
  status: SaveStatus;
  savedAt: number | null;
  className?: string;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (status !== "saved" || !savedAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(id);
  }, [status, savedAt]);

  function relTime(ts: number) {
    const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 5) return "just now";
    if (s < 60) return `${s}s ago`;
    const m = Math.round(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    return `${h}h ago`;
  }

  return (
    <div
      className={cn("flex items-center gap-1.5 text-xs", className)}
      aria-live="polite"
      aria-atomic="true"
    >
      {status === "saving" && (
        <>
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Saving…</span>
        </>
      )}
      {status === "dirty" && (
        <span className="text-amber-700 dark:text-amber-400">Unsaved changes</span>
      )}
      {status === "saved" && savedAt && (
        <>
          <Check className="h-3 w-3 text-emerald-600" />
          <span className="text-muted-foreground">Saved · {relTime(savedAt)}</span>
        </>
      )}
      {status === "idle" && <span className="text-muted-foreground/60">Not yet saved</span>}
    </div>
  );
}

/** Visually-hidden polite announcer for screen readers. */
export function LiveRegion({ message }: { message: string }) {
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}

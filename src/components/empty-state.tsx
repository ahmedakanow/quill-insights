import { BookOpen, Clock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function EmptyState({
  icon: Icon = BookOpen,
  title,
  message,
  ctaLabel,
  ctaTo,
  estimatedTime,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  message: string;
  ctaLabel?: string;
  ctaTo?: string;
  estimatedTime?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border/80 bg-card/40 p-10 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-secondary text-accent">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      {ctaLabel && ctaTo && (
        <div className="mt-5 flex justify-center">
          <Button asChild>
            <Link to={ctaTo}>{ctaLabel}</Link>
          </Button>
        </div>
      )}
      {estimatedTime && (
        <p className="mx-auto mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground/80">
          <Clock className="h-3 w-3" /> {estimatedTime}
        </p>
      )}
    </div>
  );
}

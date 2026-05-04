import { BookOpen } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function EmptyState({
  icon: Icon = BookOpen,
  title,
  message,
  ctaLabel,
  ctaTo,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  message: string;
  ctaLabel?: string;
  ctaTo?: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border/80 bg-card/40 p-10 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-secondary text-accent">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
      {ctaLabel && ctaTo && (
        <Button asChild className="mt-5">
          <Link to={ctaTo}>{ctaLabel}</Link>
        </Button>
      )}
    </div>
  );
}

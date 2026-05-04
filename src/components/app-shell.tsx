import { Link, useRouterState } from "@tanstack/react-router";
import { useRouteFocus } from "@/hooks/use-route-focus";
import {
  LayoutDashboard,
  Library,
  Bookmark,
  PenLine,
  FileText,
  Star,
  Settings,
  BookOpen,
  Repeat2,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/review", label: "Daily Review", icon: Repeat2 },
  { to: "/library", label: "Library", icon: Library },
  { to: "/my-books", label: "My Books", icon: Bookmark },
  { to: "/reflections", label: "Reflections", icon: PenLine },
  { to: "/personal-statement", label: "Personal Statement", icon: FileText },
  { to: "/achievements", label: "Achievements", icon: Star },
  { to: "/timeline", label: "Timeline", icon: CalendarDays },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const MOBILE_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/review", label: "Review", icon: Repeat2 },
  { to: "/library", label: "Library", icon: Library },
  { to: "/reflections", label: "Reflections", icon: PenLine },
  { to: "/timeline", label: "Timeline", icon: CalendarDays },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();
  useRouteFocus();
  const initial = (user?.email ?? "Q").slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
          <Link to="/dashboard" className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-accent" />
            <span className="font-display text-xl font-semibold tracking-tight">Quill</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/library" className="hidden sm:inline-flex">
              <Button variant="ghost" size="sm">Search the library</Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground font-display text-sm shadow-warm transition-quill hover:opacity-90">
                  {initial}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{user?.email}</div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut()}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 border-r border-border bg-sidebar md:block">
          <nav className="p-3 space-y-0.5">
            {NAV.map((n) => {
              const active = path.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-quill",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                  )}
                >
                  <n.icon className="h-4 w-4" />
                  {n.label}
                  {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main */}
        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 pb-20 md:pb-8">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {MOBILE_NAV.map((n) => {
            const active = path.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex min-h-[48px] w-full flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium",
                  active ? "text-accent" : "text-muted-foreground",
                )}
              >
                <n.icon className="h-5 w-5" />
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

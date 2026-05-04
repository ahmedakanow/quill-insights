import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

/**
 * Wraps protected routes: redirects to /login if no session,
 * and to /onboarding if profile is incomplete.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    // Check onboarding
    if (path === "/onboarding") return;
    supabase
      .from("profiles")
      .select("target_university, target_subject")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data?.target_university || !data?.target_subject) {
          navigate({ to: "/onboarding" });
        }
      });
  }, [user, loading, navigate, path]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">
        <div className="font-display text-2xl">Quill</div>
      </div>
    );
  }
  return <>{children}</>;
}

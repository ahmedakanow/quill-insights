import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

/**
 * On every route change, focus the page's H1 so screen readers announce the
 * new view. Falls back silently if no H1 exists.
 */
export function useRouteFocus() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    // Defer so newly mounted h1s exist before we query.
    const id = window.setTimeout(() => {
      const h1 = document.querySelector("h1");
      if (h1 instanceof HTMLElement) {
        h1.setAttribute("tabindex", "-1");
        h1.focus({ preventScroll: true });
      }
    }, 50);
    return () => window.clearTimeout(id);
  }, [pathname]);
}

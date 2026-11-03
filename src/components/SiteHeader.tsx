import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";

export function SiteHeader() {
  const { session, ready } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const onAuthPage = useRouterState({ select: (s) => s.location.pathname === "/auth" });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="site-header no-print sticky top-0 z-40">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5">
        <Link to="/" className="font-serif text-lg font-semibold tracking-tight text-heading">
          Growth Health Check
        </Link>
        {/* Reserve the nav's height while the session loads so the header never jumps. */}
        <nav aria-label="Main" className="flex min-h-8 items-center gap-1.5 text-sm sm:gap-2">
          {!ready ? null : session ? (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link to="/assessment" activeProps={{ "aria-current": "page", className: "bg-muted" }}>
                    New assessment
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/reports" activeProps={{ "aria-current": "page", className: "bg-muted" }}>
                    My reports
                  </Link>
                </Button>
                <span className="hidden max-w-48 truncate font-medium text-foreground/70 md:inline">
                  {session.user.email}
                </span>
                <Button variant="outline" size="sm" onClick={signOut}>
                  Sign out
                </Button>
              </>
            ) : onAuthPage ? null : (
              <Button asChild size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
            )}
        </nav>
      </div>
    </header>
  );
}

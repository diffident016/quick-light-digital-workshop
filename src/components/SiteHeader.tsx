import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";

export function SiteHeader() {
  const { session, ready } = useSession();
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="no-print border-b border-border bg-card/70">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
        <Link to="/" className="font-serif text-lg font-semibold text-foreground">
          Growth Health Check
        </Link>
        {ready && (
          <nav className="flex items-center gap-2 text-sm">
            {session ? (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/reports">My reports</Link>
                </Button>
                <span className="hidden text-muted-foreground sm:inline">{session.user.email}</span>
                <Button variant="outline" size="sm" onClick={signOut}>
                  Sign out
                </Button>
              </>
            ) : (
              <Button asChild size="sm">
                <Link to="/auth">Sign in</Link>
              </Button>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}

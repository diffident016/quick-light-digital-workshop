import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

// Only same-origin relative paths are honoured, so the redirect can't be used to bounce users off-site.
function safeRedirect(value: unknown): string | undefined {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")
    ? value
    : undefined;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const redirect = safeRedirect(search["redirect"]);
    return redirect ? { redirect } : {};
  },
  head: () => ({
    meta: [
      { title: "Sign in — Growth Health Check" },
      { name: "description", content: "Sign in or create an account to take the Growth Health Check." },
      { property: "og:title", content: "Sign in — Growth Health Check" },
      { property: "og:description", content: "Sign in to take your assessment and view your reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const goNext = () => (redirect ? navigate({ href: redirect }) : navigate({ to: "/assessment" }));
  const [mode, setMode] = useState<Mode>("signin");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email"));
    const password = String(f.get("password") ?? "");
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        goNext();
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: String(f.get("full_name")), company: String(f.get("company")) },
          },
        });
        if (error) throw error;
        if (data.session) goNext();
        else setSent("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent("If that email has an account, a reset link is on its way.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const title = mode === "signin" ? "Sign in" : mode === "signup" ? "Create your account" : "Reset your password";

  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <div className="rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-raised)] sm:p-9">
        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Sign in to take the Growth Health Check and see your reports."
            : mode === "signup"
              ? "Your reports are saved to your account and visible only to you."
              : "Enter your email and we'll send you a link to set a new password."}
        </p>
        {sent ? (
          <p role="status" className="mt-6 rounded-lg bg-muted p-4 text-foreground">{sent}</p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <Field name="full_name" label="Full name" autoComplete="name" required />
                <Field name="company" label="Company" autoComplete="organization" required />
              </>
            )}
            <Field name="email" label="Email" type="email" autoComplete="email" inputMode="email" required autoFocus />
            {mode !== "forgot" && (
              <Field
                name="password"
                label="Password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                hint={mode === "signup" ? "At least 6 characters." : undefined}
              />
            )}
            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
            </Button>
          </form>
        )}
        <div className="mt-6 flex flex-wrap justify-between gap-2 text-sm">
          {mode !== "signin" && <Switch onClick={() => { setMode("signin"); setSent(null); }}>Back to sign in</Switch>}
          {mode === "signin" && <Switch onClick={() => setMode("signup")}>Create an account</Switch>}
          {mode === "signin" && <Switch onClick={() => setMode("forgot")}>Forgot password?</Switch>}
        </div>
      </div>
    </main>
  );
}

function Switch(props: { onClick: () => void; children: string }) {
  return <button type="button" onClick={props.onClick} className="font-medium text-primary underline-offset-4 hover:underline">{props.children}</button>;
}

function Field({
  label,
  name,
  hint,
  ...rest
}: { label: string; name: string; hint?: string | undefined } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      {/* user-invalid only flags a field after the user has interacted with it, not on first paint. */}
      <Input
        id={name}
        name={name}
        aria-describedby={hint ? `${name}-hint` : undefined}
        className="h-11 user-invalid:border-destructive user-invalid:ring-destructive/30"
        {...rest}
      />
      {hint && (
        <p id={`${name}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

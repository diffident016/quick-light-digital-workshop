import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
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
        navigate({ to: "/assessment" });
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
        if (data.session) navigate({ to: "/assessment" });
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
      <div className="rounded-xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
        <h1 className="text-3xl font-semibold">{title}</h1>
        {sent ? (
          <p className="mt-6 text-muted-foreground">{sent}</p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <Field name="full_name" label="Full name" required />
                <Field name="company" label="Company" required />
              </>
            )}
            <Field name="email" label="Email" type="email" required />
            {mode !== "forgot" && <Field name="password" label="Password" type="password" required minLength={6} />}
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

function Field({ label, name, ...rest }: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} className="h-11" {...rest} />
    </div>
  );
}

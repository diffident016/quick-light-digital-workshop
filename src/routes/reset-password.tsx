import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password — Growth Health Check" },
      { name: "description", content: "Choose a new password for your Growth Health Check account." },
      { property: "og:title", content: "Set a new password" },
      { property: "og:description", content: "Reset your Growth Health Check password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password"));
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    navigate({ to: "/assessment" });
  }

  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
        <h1 className="text-3xl font-semibold">Set a new password</h1>
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <Input id="password" name="password" type="password" minLength={6} required className="h-11" />
        </div>
        <Button type="submit" className="h-11 w-full" disabled={loading}>
          {loading ? "Saving…" : "Update password"}
        </Button>
      </form>
    </main>
  );
}

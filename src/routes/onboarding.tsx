import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { SUBJECTS } from "@/lib/quill-data";
import { cn } from "@/lib/utils";
import { RequireAuth } from "@/components/require-auth";

export const Route = createFileRoute("/onboarding")({
  component: () => <RequireAuth><Onboarding /></RequireAuth>,
});

function Onboarding() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [uni, setUni] = useState<"oxford" | "cambridge" | "both" | "">("");
  const [subject, setSubject] = useState("");
  const [goal, setGoal] = useState(30);
  const [saving, setSaving] = useState(false);

  async function finish() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        target_university: uni || null,
        target_subject: subject,
        daily_reading_goal_minutes: goal,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    nav({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className={cn("h-1.5 flex-1 rounded-full", n <= step ? "bg-accent" : "bg-muted")} />
          ))}
        </div>

        {step === 1 && (
          <div>
            <h1 className="font-display text-3xl font-semibold">Which university are you targeting?</h1>
            <p className="mt-2 text-muted-foreground">You can apply to one — but planning helps shape your reading.</p>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {([
                { v: "oxford", l: "Oxford" },
                { v: "cambridge", l: "Cambridge" },
                { v: "both", l: "Either / Both" },
              ] as const).map((o) => (
                <button
                  key={o.v}
                  onClick={() => setUni(o.v)}
                  className={cn(
                    "rounded-xl border-2 p-6 text-left font-display text-xl transition-quill",
                    uni === o.v ? "border-accent bg-accent/10" : "border-border bg-card hover:border-accent/50",
                  )}
                >
                  {o.l}
                </button>
              ))}
            </div>
            <div className="mt-8 flex justify-end">
              <Button disabled={!uni} onClick={() => setStep(2)}>Continue</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="font-display text-3xl font-semibold">What subject?</h1>
            <p className="mt-2 text-muted-foreground">We'll tailor your library and recommendations.</p>
            <div className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-3">
              {SUBJECTS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  className={cn(
                    "rounded-lg border p-3 text-sm font-medium transition-quill",
                    subject === s ? "border-accent bg-accent/10 text-foreground" : "border-border bg-card hover:border-accent/50",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <Button disabled={!subject} onClick={() => setStep(3)}>Continue</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="font-display text-3xl font-semibold">Set your daily reading goal</h1>
            <p className="mt-2 text-muted-foreground">
              Consistency matters more than duration. We won't shame you for missing a day.
            </p>
            <div className="mt-10 rounded-xl border border-border bg-card p-8 text-center shadow-warm">
              <div className="font-display text-6xl font-semibold text-accent">{goal}</div>
              <div className="mt-1 text-sm text-muted-foreground">minutes per day</div>
              <div className="mt-8">
                <Slider value={[goal]} min={15} max={60} step={5} onValueChange={(v) => setGoal(v[0])} />
                <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                  <span>15 min</span><span>60 min</span>
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
              <Button onClick={finish} disabled={saving}>{saving ? "Saving…" : "Start reading"}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import Header from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, UploadCloud } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAuth } from '@/hooks/useAuth';

type FormState = {
  description: string;
  contract: string;
  prize: string; // keep as string for input, parse to int on submit
  expiration: string; // datetime-local string
  training_data: string;
  image: string;
  performance_threshold: string; // JSON text
};

const DEFAULT_JSON = `{
  "metric": "f1",
  "target": 0.97
}`;

const CreateBounty = () => {
  const navigate = useNavigate();

  const { user, loading } = useAuth();

  const name =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email 

  const [form, setForm] = useState<FormState>({
    description: "",
    contract: "",
    prize: "",
    expiration: "",
    training_data: "",
    image: "",
    performance_threshold: DEFAULT_JSON,
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const jsonError = useMemo(() => {
    try {
      const parsed = JSON.parse(form.performance_threshold);
      // Optional: ensure it’s an object (jsonb can be any JSON, but object is usually expected)
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        return "performance_threshold must be a JSON object (e.g., {\"metric\":\"...\",\"target\":0.9}).";
      }
      return "";
    } catch (e: any) {
      return "Invalid JSON. Fix syntax (quotes, commas, braces).";
    }
  }, [form.performance_threshold]);

  const prizeError = useMemo(() => {
    if (!form.prize.trim()) return "Prize is required.";
    const n = Number(form.prize);
    if (!Number.isFinite(n)) return "Prize must be a number.";
    if (!Number.isInteger(n)) return "Prize must be an integer.";
    if (n <= 0) return "Prize must be > 0.";
    return "";
  }, [form.prize]);

  const expirationIso = useMemo(() => {
    // datetime-local produces local time without TZ; convert to ISO.
    if (!form.expiration) return null;
    const d = new Date(form.expiration);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }, [form.expiration]);

  const expirationError = useMemo(() => {
    if (!form.expiration) return "";
    if (!expirationIso) return "Invalid expiration date/time.";
    return "";
  }, [form.expiration, expirationIso]);

  const requiredErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!form.description.trim()) errs.description = "Description is required.";
    if (!form.contract.trim()) errs.contract = "Contract is required.";
    if (!form.training_data.trim()) errs.training_data = "Training data is required.";
    if (!form.image.trim()) errs.image = "Image URL is required.";
    if (jsonError) errs.performance_threshold = jsonError;
    if (prizeError) errs.prize = prizeError;
    if (expirationError) errs.expiration = expirationError;
    return errs;
  }, [form, jsonError, prizeError, expirationError]);

  const canSubmit = useMemo(() => Object.keys(requiredErrors).length === 0, [requiredErrors]);
  
  //TODO: 
  function issueSolanaSmartContract(){

  }

  const createMutation = useMutation({
    mutationFn: async () => {
      const performance_threshold_obj = JSON.parse(form.performance_threshold);

      // Create solana smart contract and put stake in it
      
      issueSolanaSmartContract()

      const payload = {
        author: name,
        description: form.description.trim(),
        contract: form.contract.trim(),
        prize: parseInt(form.prize, 10),
        expiration: expirationIso, // can be null if you want to allow no expiration
        training_data: form.training_data.trim(),
        image: form.image.trim(),
        performance_threshold: performance_threshold_obj,
      };



      const { error } = await supabase.from("bounties").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      navigate("/bounties"); // adjust if your list route is "/"
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      description: true,
      contract: true,
      prize: true,
      expiration: true,
      training_data: true,
      image: true,
      performance_threshold: true,
    });
    if (!canSubmit) return;
    createMutation.mutate();
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const fieldError = (key: keyof FormState) => {
    if (!touched[key]) return "";
    return requiredErrors[key] ?? "";
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-28 px-8 md:px-16 pb-24">
        {/* Top bar */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <Link
                to="/bounties"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Bounties
              </Link>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-foreground mb-2">Create Bounty</h1>
            <p className="text-muted-foreground">
              Define the task, thresholds, and payout. Builders will use this to decide if they want to compete.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <span className="text-sm text-muted-foreground">Have a spec doc?</span>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="rounded-full border border-border bg-card px-6 py-2.5 text-sm font-semibold text-foreground transition-all hover:border-primary/40 hover:shadow-[0_0_24px_-8px_hsl(var(--primary)/0.2)]"
            >
              <span className="inline-flex items-center gap-2">
                <UploadCloud className="h-4 w-4" />
                Import (soon)
              </span>
            </a>
          </div>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur p-6 md:p-8 shadow-[0_0_40px_-20px_rgba(0,0,0,0.7)]">
          <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: main fields */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, description: true }))}
                  placeholder="Describe what builders must do and what 'success' looks like..."
                  className="w-full min-h-[140px] rounded-xl border border-border bg-background/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                />
                {fieldError("description") ? (
                  <p className="text-xs text-destructive">{fieldError("description")}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Keep it concrete. Mention datasets, evaluation protocol, and constraints.
                  </p>
                )}
              </div>

              {/* Performance threshold (JSON) */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Performance Threshold (JSON)</label>
                <textarea
                  value={form.performance_threshold}
                  onChange={(e) => setField("performance_threshold", e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, performance_threshold: true }))}
                  className="w-full min-h-[160px] font-mono rounded-xl border border-border bg-background/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                  spellCheck={false}
                />
                {fieldError("performance_threshold") ? (
                  <p className="text-xs text-destructive">{fieldError("performance_threshold")}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Stored as <code className="font-mono">jsonb</code>. Example: {"{ \"metric\": \"auroc\", \"target\": 0.90 }"}
                  </p>
                )}
              </div>

              {/* Contract */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Contract</label>
                <input
                  value={form.contract}
                  onChange={(e) => setField("contract", e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, contract: true }))}
                  placeholder="e.g., Solana program id / EVM contract address / repo link"
                  className="w-full rounded-xl border border-border bg-background/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                />
                {fieldError("contract") ? (
                  <p className="text-xs text-destructive">{fieldError("contract")}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Where the bounty is enforced/verified (or a link to how payout is handled).
                  </p>
                )}
              </div>

              {/* Training data */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Training Data</label>
                <input
                  value={form.training_data}
                  onChange={(e) => setField("training_data", e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, training_data: true }))}
                  placeholder="URL or reference to dataset (S3, HuggingFace, GDrive, etc.)"
                  className="w-full rounded-xl border border-border bg-background/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                />
                {fieldError("training_data") ? (
                  <p className="text-xs text-destructive">{fieldError("training_data")}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Put a stable link. If gated, explain access steps in description.</p>
                )}
              </div>
            </div>

            {/* Right: prize + meta + preview */}
            <div className="space-y-6">
              {/* Prize */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Prize (integer)</label>
                <input
                  value={form.prize}
                  onChange={(e) => setField("prize", e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, prize: true }))}
                  placeholder="e.g., 2500"
                  inputMode="numeric"
                  className="w-full rounded-xl border border-border bg-background/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                />
                {fieldError("prize") ? (
                  <p className="text-xs text-destructive">{fieldError("prize")}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Displayed as the bounty payout amount.</p>
                )}
              </div>

              {/* Expiration */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Expiration (optional)</label>
                <input
                  type="datetime-local"
                  value={form.expiration}
                  onChange={(e) => setField("expiration", e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, expiration: true }))}
                  className="w-full rounded-xl border border-border bg-background/40 px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                />
                {fieldError("expiration") ? (
                  <p className="text-xs text-destructive">{fieldError("expiration")}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Stored as <code className="font-mono">timestamptz</code>. We convert local time → ISO.
                  </p>
                )}
              </div>

              {/* Image */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Image (URL)</label>
                <input
                  value={form.image}
                  onChange={(e) => setField("image", e.target.value)}
                  onBlur={() => setTouched((t) => ({ ...t, image: true }))}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-border bg-background/40 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
                />
                {fieldError("image") ? (
                  <p className="text-xs text-destructive">{fieldError("image")}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Used for the card preview image.</p>
                )}
              </div>

              {/* Preview card */}
              <div className="rounded-2xl border border-border bg-background/30 p-5">
                <p className="text-xs text-muted-foreground mb-3">Preview</p>
                <div className="rounded-xl border border-border bg-card p-5 shadow-[0_0_24px_-16px_rgba(0,0,0,0.6)]">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground mb-2">by {name}</p>
                      <p className="text-sm font-semibold text-foreground line-clamp-3">
                        {form.description.trim() || "Your bounty description will appear here..."}
                      </p>
                    </div>
                    <div className="shrink-0 rounded-2xl bg-primary/10 px-4 py-3 border border-primary/20">
                      <p className="text-primary font-black text-xl tabular-nums">
                        {form.prize.trim() ? `$${form.prize}` : "$—"}
                      </p>
                      <p className="text-[10px] text-muted-foreground text-center -mt-0.5">PRIZE</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-background/30 p-4">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">THRESHOLDS</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">metric</span>
                      <span className="text-foreground font-semibold">
                        {(() => {
                          try {
                            const o = JSON.parse(form.performance_threshold);
                            return o?.metric ?? "—";
                          } catch {
                            return "—";
                          }
                        })()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs mt-2">
                      <span className="text-muted-foreground">target</span>
                      <span className="text-foreground font-semibold">
                        {(() => {
                          try {
                            const o = JSON.parse(form.performance_threshold);
                            return o?.target ?? "—";
                          } catch {
                            return "—";
                          }
                        })()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 text-xs">
                    <span className="text-muted-foreground">
                      {expirationIso ? `Expires: ${new Date(expirationIso).toLocaleString()}` : "No expiration"}
                    </span>
                    <span className="rounded-full px-3 py-1 bg-primary/10 border border-primary/20 text-primary">
                      Draft
                    </span>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={createMutation.isPending || !canSubmit}
                className="w-full rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition-all hover:border-primary/40 hover:shadow-[0_0_24px_-8px_hsl(var(--primary)/0.2)] disabled:opacity-50 disabled:hover:shadow-none disabled:hover:border-border"
              >
                {createMutation.isPending ? "Posting..." : "Post Bounty"}
              </button>

              {createMutation.isError ? (
                <p className="text-xs text-destructive">
                  {(createMutation.error as any)?.message ?? "Failed to create bounty."}
                </p>
              ) : null}

              {!canSubmit && Object.keys(touched).length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Fix the highlighted fields to submit.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  By posting, you agree to your platform’s bounty terms.
                </p>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default CreateBounty;
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, ArrowUpDown } from "lucide-react";
import Header from "@/components/Header";
import { triggerModalInference } from "@/services/modalService";
import { toast } from "sonner";

type SortOption = "newest" | "oldest";

const sortLabels: Record<SortOption, string> = {
  newest: "Newest First",
  oldest: "Oldest First",
};

type InferenceProvider = "runpod" | "modal";

const ModelSubmissions = () => {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [inferenceProvider, setInferenceProvider] = useState<InferenceProvider>("runpod");
  const [evaluatingModelId, setEvaluatingModelId] = useState<number | null>(null);

  const { data: models, isLoading, error: queryError } = useQuery({
    queryKey: ["models"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("models" as any)
        .select("*");

      console.log("Models query result:", { data, error });

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }
      return data as any[];
    },
  });

  const filtered = useMemo(() => {
    if (!models) return [];
    let result = models.filter((m) => {
      const q = search.toLowerCase();
      return m.submitter?.toLowerCase().includes(q);
    });

    result.sort((a, b) => {
      const aTime = a.submission_time ? new Date(a.submission_time).getTime() : 0;
      const bTime = b.submission_time ? new Date(b.submission_time).getTime() : 0;

      if (sort === "newest") {
        return bTime - aTime;
      } else {
        return aTime - bTime;
      }
    });

    return result;
  }, [models, search, sort]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-28 px-8 md:px-16 pb-24">
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-foreground mb-2">Model Submissions</h1>
            <p className="text-muted-foreground">View all model submissions across challenges.</p>
          </div>
        </div>

        {/* Inference Provider Selection */}
        <div className="rounded-lg border border-border bg-card p-4 mb-6">
          <p className="text-sm font-semibold text-foreground mb-3">Run inference on:</p>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="inference-provider"
                value="runpod"
                checked={inferenceProvider === "runpod"}
                onChange={(e) => setInferenceProvider(e.target.value as InferenceProvider)}
                className="w-4 h-4 text-primary border-border focus:ring-primary/40"
              />
              <span className="text-sm text-foreground">Runpod</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="inference-provider"
                value="modal"
                checked={inferenceProvider === "modal"}
                onChange={(e) => setInferenceProvider(e.target.value as InferenceProvider)}
                className="w-4 h-4 text-primary border-border focus:ring-primary/40"
              />
              <span className="text-sm text-foreground">Modal</span>
            </label>
          </div>
        </div>

        {/* Search & Sort Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by submitter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow"
            />
          </div>

          <div className="relative shrink-0">
            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="appearance-none rounded-lg border border-border bg-card pl-10 pr-8 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-shadow cursor-pointer"
            >
              {Object.entries(sortLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Debug info */}
        {queryError && (
          <div className="rounded-xl border border-red-500 bg-red-500/10 p-4 mb-4">
            <p className="text-sm text-red-500">Error: {(queryError as Error).message}</p>
          </div>
        )}

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-6 h-[200px] animate-pulse" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <>
            <p className="text-xs text-muted-foreground mb-4">{filtered.length} submissions found</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((model, i) => (
                <div
                  key={model.id}
                  style={{ animationDelay: `${i * 80}ms` }}
                  className="rounded-xl border border-border bg-card/80 backdrop-blur p-6 hover:border-primary/40 hover:shadow-[0_0_24px_-8px_hsl(var(--primary)/0.2)] transition-all"
                >
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Submitter</p>
                      <p className="text-sm font-semibold text-foreground">{model.submitter || "Unknown"}</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Submitted</p>
                      <p className="text-sm text-foreground">
                        {model.submission_time
                          ? new Date(model.submission_time).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Unknown"}
                      </p>
                    </div>

                    {model.challenge_id && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Challenge ID</p>
                        <p className="text-sm font-mono text-foreground truncate">{model.challenge_id}</p>
                      </div>
                    )}

                    <button
                      onClick={async () => {
                        if (inferenceProvider === "modal") {
                          setEvaluatingModelId(model.id);
                          try {
                            // Fetch the bounty to get test_data URL
                            const { data: bounty, error: bountyError } = await supabase
                              .from("bounties" as any)
                              .select("test_data")
                              .eq("id", model.challenge_id)
                              .single();

                            if (bountyError || !bounty) {
                              throw new Error(`Failed to fetch bounty: ${bountyError?.message || "Bounty not found"}`);
                            }

                            const result = await triggerModalInference({
                              modelPath: model.model_path,
                              testDataUrl: (bounty as any).test_data,
                            });

                            if (result.success) {
                              // Update the model with the performance/accuracy
                              if (result.data?.accuracy !== null && result.data?.accuracy !== undefined) {
                                const { error: updateError } = await supabase
                                  .from("models" as any)
                                  .update({ performance: result.data.accuracy })
                                  .eq("id", model.id);

                                if (updateError) {
                                  console.error("Failed to update performance:", updateError);
                                  toast.warning("Inference completed but failed to save performance", {
                                    description: `Accuracy: ${result.data.accuracy.toFixed(2)}%`,
                                  });
                                } else {
                                  toast.success("Inference completed!", {
                                    description: `Accuracy: ${result.data.accuracy.toFixed(2)}% (${result.data.total_samples} samples)`,
                                  });
                                }
                              } else {
                                toast.success("Inference completed!", {
                                  description: result.message,
                                });
                              }
                            } else {
                              toast.error("Failed to start inference", {
                                description: result.message,
                              });
                            }
                          } catch (error) {
                            toast.error("Error triggering inference", {
                              description: error instanceof Error ? error.message : "Unknown error",
                            });
                          } finally {
                            setEvaluatingModelId(null);
                          }
                        } else {
                          toast.info("Runpod inference not yet implemented");
                        }
                      }}
                      disabled={evaluatingModelId === model.id}
                      className="w-full rounded-lg border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition-all hover:bg-primary/20 hover:shadow-[0_0_16px_-4px_hsl(var(--primary)/0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {evaluatingModelId === model.id ? "Starting..." : "Evaluate"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              {search ? `No submissions matching "${search}"` : "No submissions yet."}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ModelSubmissions;
import { formatDistanceToNow } from "date-fns";
import { useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import TrainingDataViewer from "@/components/TrainingDataViewer";

import FileDropField from '@/components/DropField'
import uploadToPublicModel from '@/lib/uploadModel'

interface BountyCardProps {
  id: string;
  author: string;
  description: string;
  prize: number;
  expiration: string | null;
  performanceThreshold: unknown;
  contract?: string | null;
  trainingData?: string | null;
  image?: string | null;
}

type CsvPreview = {
  headers: string[];
  rows: string[][];
  truncated: boolean;
};

// (CSV preview logic lives in TrainingDataViewer now.)

function formatThresholdValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function thresholdToRows(
  threshold: unknown,
  options?: { maxRows?: number },
): Array<{ key: string; value: string }> {
  const maxRows = options?.maxRows;
  if (!threshold) return [];

  // If it's already a plain object, show key/value rows.
  if (typeof threshold === "object" && !Array.isArray(threshold)) {
    const entries = Object.entries(threshold as Record<string, unknown>);
    const normalized = entries
      .filter(([k]) => k && k !== "type")
      .map(([key, value]) => ({ key, value: formatThresholdValue(value) }));

    if (!maxRows || normalized.length <= maxRows) return normalized;
    return normalized.slice(0, maxRows);
  }

  // Fallback: single row display.
  return [{ key: "threshold", value: formatThresholdValue(threshold) }];
}

const BountyCard = ({
  id,
  author,
  description,
  prize,
  expiration,
  performanceThreshold,
  contract,
  trainingData,
  image,
}: BountyCardProps) => {

  const { publicKey, connected } = useWallet();

  const submitterWalletDefault = publicKey?.toBase58() ?? "";
  // Submission field state
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [submitterWallet, setSubmitterWallet] = useState(submitterWalletDefault); // ideally from wallet adapter
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState<string | null>(null);

  async function handleSubmitModel() {
    setSubmitError(null);
    setSubmitOk(null);

    if (!submitterWallet.trim()) {
      setSubmitError("Enter/connect a wallet address first.");
      return;
    }
    if (!submissionFile) {
      setSubmitError("Drop or choose a file first.");
      return;
    }

    setSubmitting(true);

    // compute a hash of model, send to solana
    

    try {
      await uploadToPublicModel({
        challengeId: id, // your bounty id (uuid)
        submitter: submitterWallet.trim(),
        file: submissionFile,
      });

      setSubmitOk("Submitted!");
      setSubmissionFile(null);
    } catch (e: any) {
      setSubmitError(e?.message ?? "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  }

  // ------------


  const [open, setOpen] = useState(false);

  const isExpired = expiration ? new Date(expiration) < new Date() : false;
  const timeLeft = expiration
    ? formatDistanceToNow(new Date(expiration), { addSuffix: true })
    : null;

  // Render all rows; the table body is scrollable.
  const thresholdRows = thresholdToRows(performanceThreshold);

  const trainingDataUrl = useMemo(() => {
    const raw = (trainingData ?? "").trim();
    if (!raw) return null;
    // For now this component expects a fetchable URL (public object or already-signed URL).
    // If you later store "bucket/path" instead, convert it to a signed/public URL first.
    return raw;
  }, [trainingData]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group h-[280px] w-full overflow-hidden rounded-xl border border-border bg-card p-6 text-left transition-all hover:border-primary/40 hover:shadow-[0_0_24px_-8px_hsl(var(--primary)/0.15)] opacity-0 animate-fade-in flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          aria-label={`View bounty details: ${description}`}
        >
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            <div className="flex items-start justify-between gap-4 shrink-0">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground mb-2">by {author}</p>
                <p className="text-sm text-foreground leading-relaxed line-clamp-3">
                  {description}
                </p>
              </div>
              <div className="shrink-0 rounded-lg bg-primary/10 px-4 py-2 text-center">
                <p className="text-lg font-bold text-primary">${prize.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Prize</p>
              </div>
            </div>

            {thresholdRows.length > 0 && (
              <div className="mt-4 min-h-0 overflow-hidden rounded-lg border border-border/60 bg-secondary/30">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Thresholds
                  </span>
                  <span className="text-[10px] text-muted-foreground/80 opacity-0 transition-opacity group-hover:opacity-100">
                    Click for details
                  </span>
                </div>
                <div className="px-3 pb-3 h-[120px] overflow-y-auto overscroll-contain pr-1">
                  <table className="w-full text-xs table-fixed">
                    <thead>
                      <tr className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
                        <th className="pb-1 text-left font-medium w-[55%]">Metric</th>
                        <th className="pb-1 text-right font-medium w-[45%]">Target</th>
                      </tr>
                    </thead>
                    <tbody>
                      {thresholdRows.map((row, idx) => (
                        <tr key={`${row.key}:${idx}`} className="border-t border-border/50">
                          <td className="py-1 pr-2 text-muted-foreground truncate">{row.key}</td>
                          <td className="py-1 pl-2 text-right font-medium text-foreground truncate">
                            {row.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="mt-auto pt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>{isExpired ? "Expired" : timeLeft ? `Expires ${timeLeft}` : "No expiration"}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${isExpired ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}
            >
              {isExpired ? "Closed" : "Active"}
            </span>
          </div>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
        <DialogHeader>
          <DialogTitle className="text-xl md:text-2xl font-black tracking-tight">
            Bounty details
          </DialogTitle>
          <DialogDescription>
            by <span className="text-foreground/90">{author}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{isExpired ? "Expired" : timeLeft ? `Expires ${timeLeft}` : "No expiration"}</span>
              <span className="text-muted-foreground/60">•</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${isExpired ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}
              >
                {isExpired ? "Closed" : "Active"}
              </span>
            </div>
            <div className="rounded-lg border border-border/60 bg-primary/10 px-4 py-2 text-center w-fit">
              <p className="text-lg font-bold text-primary">${prize.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Prize</p>
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card/50 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Description
            </div>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {description}
            </p>
          </div>

          {(contract || trainingData || image) && (
            <div className="rounded-xl border border-border/60 bg-secondary/10 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Resources
              </div>
              <div className="grid gap-3">
                {trainingDataUrl ? <TrainingDataViewer url={trainingDataUrl} /> : null}

                {contract && (
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-foreground">Contract</div>
                      <div className="text-xs text-muted-foreground font-mono break-all">{contract}</div>
                    </div>
                  </div>
                )}

                {image && (
                  <div className="grid gap-2">
                    <div className="text-xs font-medium text-foreground">Image</div>
                    <img
                      src={image}
                      alt="Bounty"
                      className="w-full max-h-[260px] object-cover rounded-lg border border-border/60"
                      loading="lazy"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {thresholdRows.length > 0 && (
            <div className="rounded-xl border border-border/60 bg-secondary/20 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Performance thresholds
              </div>
              <div className="overflow-hidden rounded-lg border border-border/60 bg-background/30">
                <div className="max-h-[240px] overflow-y-auto overscroll-contain">
                  <table className="w-full text-sm table-fixed">
                    <thead className="sticky top-0 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                      <tr className="text-[10px] uppercase tracking-wider text-muted-foreground/80">
                        <th className="px-3 py-2 text-left font-medium w-[55%]">Metric</th>
                        <th className="px-3 py-2 text-right font-medium w-[45%]">Target</th>
                      </tr>
                    </thead>
                    <tbody>
                      {thresholdRows.map((row, idx) => (
                        <tr key={`${row.key}:${idx}`} className="border-t border-border/50">
                          <td className="px-3 py-2 pr-2 text-muted-foreground truncate">{row.key}</td>
                          <td className="px-3 py-2 pl-2 text-right font-medium text-foreground truncate">
                            {row.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* --- Submission (BOTTOM OF DIALOG) --- */}
<div className="mt-2 rounded-xl border border-border/60 bg-card/50 p-4 grid gap-3">
  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
    Submission
  </div>

  {/* If you already have wallet adapter, replace this input with publicKey.toBase58() */}
  <div className="grid gap-2">
    <div className="text-xs font-medium text-foreground">Submitter wallet</div>
    <input
      value={submitterWallet}
      onChange={(e) => setSubmitterWallet(e.target.value)}
      disabled={submitting}
      placeholder="Solana wallet address (pubkey)"
      className="h-10 rounded-lg border border-border/60 bg-background/50 px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40"
    />
  </div>

    <FileDropField
      file={submissionFile}
      onFile={setSubmissionFile}
      disabled={submitting}
    />

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs">
          {submitError ? <span className="text-destructive">{submitError}</span> : null}
          {submitOk ? <span className="text-primary">{submitOk}</span> : null}
        </div>

        <button
          type="button"
          onClick={handleSubmitModel}
          disabled={submitting || !submissionFile || !submitterWallet.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </div>
    </div>
      </DialogContent>
    </Dialog>
  );
};

export default BountyCard;

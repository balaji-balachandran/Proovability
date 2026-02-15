"use client";

import { formatDistanceToNow } from "date-fns";

export interface BountyCardProps {
  author: string;
  description: string;
  prize: number;
  expiration: string | null;
  performanceThreshold: unknown;
}

export default function BountyCard({
  author,
  description,
  prize,
  expiration,
  performanceThreshold,
}: BountyCardProps) {
  const isExpired = expiration ? new Date(expiration) < new Date() : false;
  const timeLeft = expiration ? formatDistanceToNow(new Date(expiration), { addSuffix: true }) : null;

  return (
    <div className="group rounded-xl border border-border bg-card p-6 opacity-0 transition-all hover:border-primary/40 hover:shadow-[0_0_24px_-8px_hsl(var(--primary)/0.15)] animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-xs text-muted-foreground">by {author}</p>
          <p className="line-clamp-3 text-sm leading-relaxed text-foreground">{description}</p>
        </div>
        <div className="shrink-0 rounded-lg bg-primary/10 px-4 py-2 text-center">
          <p className="text-lg font-bold text-primary">${prize.toLocaleString()}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Prize</p>
        </div>
      </div>

      {performanceThreshold ? (
        <div className="mt-4 rounded-md bg-secondary px-3 py-2">
          <p className="text-xs text-muted-foreground">
            Threshold:{" "}
            {typeof performanceThreshold === "object" ? JSON.stringify(performanceThreshold) : String(performanceThreshold)}
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>{isExpired ? "Expired" : timeLeft ? `Expires ${timeLeft}` : "No expiration"}</span>
        <span
          className={[
            "rounded-full px-2 py-0.5 text-[10px] font-medium",
            isExpired ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
          ].join(" ")}
        >
          {isExpired ? "Closed" : "Active"}
        </span>
      </div>
    </div>
  );
}


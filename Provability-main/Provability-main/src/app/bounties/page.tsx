"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, ArrowUpDown } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import BountyCard from "@/components/BountyCard";

type SortOption = "newest" | "oldest" | "prize_high" | "prize_low" | "expiring_soon";

const sortLabels: Record<SortOption, string> = {
  newest: "Newest First",
  oldest: "Oldest First",
  prize_high: "Highest Prize",
  prize_low: "Lowest Prize",
  expiring_soon: "Expiring Soon",
};

type BountyRow = {
  id: string;
  created_at: string;
  author: string | null;
  description: string | null;
  prize: number | null;
  expiration: string | null;
  performance_threshold: unknown;
  contract: string | null;
  training_data: string | null;
  image: string | null;
};

export default function BountiesPage() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("newest");

  const { data: bounties, isLoading } = useQuery({
    queryKey: ["bounties"],
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase.from("bounties").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BountyRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = (bounties ?? []).filter((b) => {
      if (!q) return true;
      const desc = (b.description ?? "").toLowerCase();
      const author = (b.author ?? "").toLowerCase();
      return desc.includes(q) || author.includes(q);
    });

    result = result.slice().sort((a, b) => {
      switch (sort) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "prize_high":
          return (b.prize ?? 0) - (a.prize ?? 0);
        case "prize_low":
          return (a.prize ?? 0) - (b.prize ?? 0);
        case "expiring_soon": {
          const aExp = a.expiration ? new Date(a.expiration).getTime() : Number.POSITIVE_INFINITY;
          const bExp = b.expiration ? new Date(b.expiration).getTime() : Number.POSITIVE_INFINITY;
          return aExp - bExp;
        }
        default:
          return 0;
      }
    });

    return result;
  }, [bounties, search, sort]);

  return (
    <div className="min-h-screen bg-background">
      <main className="px-8 pb-24 pt-28 md:px-16">
        <h1 className="mb-2 text-4xl font-black tracking-tight text-foreground">Bounties</h1>
        <p className="mb-10 text-muted-foreground">Browse open bounties and find your next challenge.</p>

        <div className="mb-8 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search bounties by description or author..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div className="relative shrink-0">
            <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="cursor-pointer appearance-none rounded-lg border border-border bg-card py-2.5 pl-10 pr-8 text-sm text-foreground transition-shadow focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {Object.entries(sortLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl border border-border bg-card p-6" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <>
            <p className="mb-4 text-xs text-muted-foreground">{filtered.length} bounties found</p>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((bounty, i) => (
                <div key={bounty.id} style={{ animationDelay: `${i * 80}ms` }}>
                  <BountyCard
                    id={bounty.id}
                    author={bounty.author ?? "Unknown"}
                    description={bounty.description ?? ""}
                    prize={bounty.prize ?? 0}
                    expiration={bounty.expiration}
                    performanceThreshold={bounty.performance_threshold}
                    contract={bounty.contract}
                    trainingData={bounty.training_data}
                    image={bounty.image}
                  />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">{search ? `No bounties matching "${search}"` : "No bounties yet."}</p>
          </div>
        )}
      </main>
    </div>
  );
}


"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import BountyCard from "./BountyCard";

type BountyRow = {
  id: string;
  author: string;
  description: string;
  prize: number;
  expiration: string | null;
  performance_threshold: unknown;
  created_at?: string;
};

export default function BountiesSection() {
  const { data: bounties, isLoading } = useQuery({
    queryKey: ["bounties"],
    queryFn: async () => {
      if (!supabase) return [];
      const { data, error } = await supabase.from("bounties").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BountyRow[];
    },
  });

  return (
    <section className="px-8 pb-24 md:px-16">
      <h2 className="mb-8 text-2xl font-bold text-foreground">Open Bounties</h2>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl border border-border bg-card p-6" />
          ))}
        </div>
      ) : bounties && bounties.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {bounties.map((bounty, i) => (
            <div key={bounty.id} style={{ animationDelay: `${i * 100}ms` }}>
              <BountyCard
                author={bounty.author}
                description={bounty.description}
                prize={bounty.prize}
                expiration={bounty.expiration}
                performanceThreshold={bounty.performance_threshold}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">No bounties yet. Be the first to submit one.</p>
        </div>
      )}
    </section>
  );
}


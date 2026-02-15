import { Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, ArrowUpDown } from "lucide-react";
import Header from "@/components/Header";
import BountyCard from "@/components/BountyCard";

type SortOption = "newest" | "oldest" | "prize_high" | "prize_low" | "expiring_soon";

const sortLabels: Record<SortOption, string> = {
  newest: "Newest First",
  oldest: "Oldest First",
  prize_high: "Highest Prize",
  prize_low: "Lowest Prize",
  expiring_soon: "Expiring Soon",
};

const Bounties = () => {
  const [search, setSearch] = useState("");
  // Table doesn't have created_at, so default to an actually supported sort.
  const [sort, setSort] = useState<SortOption>("expiring_soon");

  const { data: bounties, isLoading } = useQuery({
    queryKey: ["bounties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bounties")
        .select("*");
      if (error) throw error;
      return data;
    },
  });

  const filtered = useMemo(() => {
    if (!bounties) return [];
    let result = bounties.filter((b) => {
      const q = search.toLowerCase();
      return (
        b.description.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q)
      );
    });

    result.sort((a, b) => {
      switch (sort) {
        // Note: no created_at column in this table; keep stable fetch order.
        case "newest":
        case "oldest":
          return 0;
        case "prize_high":
          return b.prize - a.prize;
        case "prize_low":
          return a.prize - b.prize;
        case "expiring_soon": {
          const aExp = a.expiration ? new Date(a.expiration).getTime() : Infinity;
          const bExp = b.expiration ? new Date(b.expiration).getTime() : Infinity;
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
      <Header />

      <main className="pt-28 px-8 md:px-16 pb-24">
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-foreground mb-2">Bounties</h1>
            <p className="text-muted-foreground">Browse open bounties and find your next challenge.</p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <span className="text-sm text-muted-foreground">Not a builder?</span>
            <Link
              to="/CreateBounty"
              className="rounded-full border border-border bg-card px-6 py-2.5 text-sm font-semibold text-foreground transition-all hover:border-primary/40 hover:shadow-[0_0_24px_-8px_hsl(var(--primary)/0.2)]"
            >
              Post a Bounty
            </Link>
          </div>
        </div>

        {/* Search & Sort Bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search bounties by description or author..."
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

        {/* Results */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-6 h-[280px] animate-pulse" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <>
            <p className="text-xs text-muted-foreground mb-4">{filtered.length} bounties found</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((bounty, i) => (
                <div key={bounty.id} style={{ animationDelay: `${i * 80}ms` }}>
                  <BountyCard
                    id={bounty.id}
                    author={bounty.author}
                    description={bounty.description}
                    prize={bounty.prize}
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
            <p className="text-muted-foreground">
              {search ? `No bounties matching "${search}"` : "No bounties yet."}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Bounties;

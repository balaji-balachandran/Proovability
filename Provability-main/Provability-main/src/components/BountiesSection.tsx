import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import BountyCard from "./BountyCard";

const BountiesSection = () => {
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

  return (
    <section className="px-8 md:px-16 pb-24">
      <h2 className="text-2xl font-bold text-foreground mb-8">Open Bounties</h2>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-6 h-[280px] animate-pulse" />
          ))}
        </div>
      ) : bounties && bounties.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {bounties.map((bounty, i) => (
            <div key={bounty.id} style={{ animationDelay: `${i * 100}ms` }}>
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
      ) : (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-muted-foreground">No bounties yet. Be the first to submit one.</p>
        </div>
      )}
    </section>
  );
};

export default BountiesSection;

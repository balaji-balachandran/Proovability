import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { useTypewriter } from "@/hooks/useTypewriter";

const Index = () => {
  const { text, shouldBlinkCaret } = useTypewriter({
    text: "Provable rewards for builders.",
    // Slower + more human: non-uniform delays and extra pauses on spaces/punctuation
    typeMs: 122,
    deleteMs: 90,
    typeJitterMs: 191,
    deleteJitterMs: 160,
    spacePauseMs: 191,
    punctuationPauseMs: 626,
    // Noticeable end-of-line pause before deleting
    pauseAfterTypeMs: 1700,
    pauseAfterDeleteMs: 650,
    startDelayMs: 350,
    loop: true,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex min-h-screen flex-col items-center justify-center px-8">
        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-foreground whitespace-nowrap">
          Provability <span className="text-primary">|</span>{" "}
          <span className="text-primary font-medium text-3xl md:text-5xl">
            {text}
            <span
              className={[
                "inline-block w-[0.6ch] translate-y-[0.06em] align-baseline text-primary/80",
                shouldBlinkCaret ? "animate-caret-blink" : "",
              ].join(" ")}
            >
              |
            </span>
          </span>
        </h1>
        <Link
          to="/bounties"
          className={[
            "group mt-10 inline-flex items-center gap-2 rounded-full px-8 py-3 text-sm font-semibold",
            "text-foreground/90",
            "border border-[hsl(var(--border)/0.6)] bg-[hsl(var(--card)/0.22)] backdrop-blur-md",
            "shadow-[0_0_0_1px_hsl(var(--primary)/0.06),0_12px_40px_-20px_rgba(0,0,0,0.9)]",
            "transition-all duration-200",
            "hover:border-[hsl(var(--primary)/0.35)] hover:bg-[hsl(var(--card)/0.32)] hover:text-foreground hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.12),0_18px_60px_-28px_hsl(var(--primary)/0.45)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--primary)/0.55)] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "active:translate-y-[1px] active:bg-[hsl(var(--card)/0.38)]",
          ].join(" ")}
        >
          Explore Bounties
          <span className="translate-x-0 transition-transform duration-200 group-hover:translate-x-0.5">
            →
          </span>
        </Link>
      </div>
    </div>
  );
};

export default Index;

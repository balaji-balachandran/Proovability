import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const Header = () => {
  const { user, loading } = useAuth();

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const name =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "there";

  return (
    <header className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-8 py-6 md:px-16 bg-background/80 backdrop-blur-md">
      <div className="flex items-center gap-8">
        <Link to="/" className="text-lg font-bold tracking-tight text-foreground">
          Provability
        </Link>
        <Link
          to="/submissions"
          className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Models
        </Link>
      </div>

      {/* Optional: avoid flicker while auth loads */}
      {!loading && (
        user ? (
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-foreground">Hey {name}</span>
            <div className="flex items-center gap-3">
              <WalletMultiButton className="!bg-primary/10 !text-foreground !border !border-primary/20 !rounded-full !px-5 !py-2 !text-xs !font-semibold hover:!shadow-[0_0_24px_-8px_hsl(var(--primary)/0.3)] !transition-all" style={{ borderRadius: '9999px' }} />
              <button
                onClick={signOut}
                className="rounded-full bg-foreground text-background px-9 py-3.5 text-base font-semibold transition-colors hover:bg-muted-foreground"
              >
                Logout
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <WalletMultiButton className="!bg-primary/10 !text-foreground !border !border-primary/20 !rounded-full !px-6 !py-2.5 !text-sm !font-semibold hover:!shadow-[0_0_24px_-8px_hsl(var(--primary)/0.3)] !transition-all !h-[42px]" style={{ borderRadius: '9999px' }} />
            <button
              onClick={signInWithGoogle}
              className="rounded-full bg-foreground text-background px-8 py-3 text-sm font-semibold transition-colors hover:bg-muted-foreground"
            >
              Sign In / Register
            </button>
          </div>
        )
      )}
    </header>
  );
};

export default Header;
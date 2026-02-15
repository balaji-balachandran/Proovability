import { createClient } from "@supabase/supabase-js";

function requireEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(
    `Missing Supabase env var. Set one of: ${names.join(", ")}`
  );
}

export function createSupabaseServerClient() {
  const url = requireEnv("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function getPublicBucketUrl(objectPath: string) {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  const bucket =
    process.env.NEXT_PUBLIC_SUPABASE_BOUNTY_IMAGE_BUCKET ??
    process.env.SUPABASE_BOUNTY_IMAGE_BUCKET ??
    "bounty-images";

  // objectPath example: "bounties/<bounty_id>/cover.png"
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${objectPath.replace(
    /^\//,
    ""
  )}`;
}

import { createBrowserClient } from "@supabase/ssr";

// Create singleton browser client
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

export const supabase = (() => {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return supabaseClient;
})();

// Re-export createClient for convenience
export { createBrowserClient } from "@supabase/ssr";
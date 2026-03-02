import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Robust Supabase Server Client for Next.js App Router.
 *
 * Key goals:
 * - Works across Next.js cookie store API differences (pre/post getAll/set).
 * - Ensures auth is available server-side for RLS-protected queries.
 * - Avoids "cookies is defined multiple times" + "cookieStore.getAll is not a function" class of issues.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase env vars. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
    );
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        // Newer Next.js cookie store has getAll(). Older implementations may not.
        const anyStore = cookieStore as unknown as {
          getAll?: () => Array<{ name: string; value: string }>;
          get?: (name: string) => { name: string; value: string } | undefined;
        };

        if (typeof anyStore.getAll === "function") {
          return anyStore.getAll();
        }

        // If getAll isn't available, we can't reliably enumerate cookies.
        // Returning [] is safer than throwing; auth may still work in some edge cases,
        // but usually indicates the runtime isn't compatible with Supabase SSR auth.
        return [];
      },
      setAll(cookiesToSet) {
        // Next.js App Router cookies() is mutable in Server Actions/Route Handlers,
        // but can throw in some server component contexts. We swallow errors to avoid hard crashes.
        for (const { name, value, options } of cookiesToSet) {
          try {
            cookieStore.set(name, value, options as CookieOptions);
          } catch {
            // no-op (commonly: "Cookies can only be modified in a Server Action or Route Handler")
          }
        }
      },
    },
  });
}

/**
 * Helper to get the current authed user on the server.
 * Returns null if not logged in.
 */
export async function getServerUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) return null;
  return data.user ?? null;
}

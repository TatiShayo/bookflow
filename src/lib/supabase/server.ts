import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

type Database = Record<string, unknown>;

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // set may fail in middleware, ignore
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // remove may fail in middleware, ignore
          }
        },
      },
    }
  );
}

export type ServerClient = Awaited<ReturnType<typeof createClient>>;

let _serviceClient: ReturnType<typeof createSupabaseJsClient<Database>> | null = null;

/**
 * Service-role client. Bypasses RLS entirely — every caller MUST have already
 * established identity and ownership before using it.
 *
 * Built from the plain `supabase-js` client rather than the SSR wrapper: the SSR
 * wrapper treats the key as a *session* key and may emit or refresh `sb-`
 * cookies on responses, which is meaningless (and confusing) with a service-role
 * key. `persistSession: false` also avoids the O(n) memory cost of a session
 * cache in a serverless invocation.
 *
 * Memoised per process so webhook deliveries and repeated calls do not redo
 * connection setup.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_URL) is not configured. " +
        "Add it to your environment (see .env.example)."
    );
  }
  if (!_serviceClient) {
    _serviceClient = createSupabaseJsClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _serviceClient;
}

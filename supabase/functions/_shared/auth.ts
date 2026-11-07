import { createClient } from "npm:@supabase/supabase-js@2";
import { HttpError } from "./http.ts";

export async function requireUser(req: Request): Promise<string> {
  const auth = req.headers.get("Authorization");
  if (!auth) throw new HttpError(401, "UNAUTHORIZED");
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new HttpError(401, "UNAUTHORIZED");
  return data.user.id;
}

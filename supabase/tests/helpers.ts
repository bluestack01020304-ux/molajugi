import postgres from "postgres";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const authOpts = { auth: { persistSession: false, autoRefreshToken: false } };

export const sql = postgres(Deno.env.get("DB_URL")!);
await sql`select 1`; // connect at import time (outside any test) so sanitizers stay quiet

export async function createUser(
  prefix: string,
): Promise<{ id: string; jwt: string; client: SupabaseClient }> {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, authOpts);
  const email = `${prefix}-${crypto.randomUUID()}@test.local`;
  const password = "test1234";
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (cErr) throw cErr;
  const client = createClient(SUPABASE_URL, ANON_KEY, authOpts);
  const { data: signed, error: sErr } = await client.auth.signInWithPassword({ email, password });
  if (sErr) throw sErr;
  return { id: created.user.id, jwt: signed.session!.access_token, client };
}

export async function callFn(
  name: string,
  jwt: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<{ status: number; json: any }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}`, ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

export async function setBalance(userId: string, balance: number) {
  await sql`update wallets set balance = ${balance} where user_id = ${userId}`;
}

export function kstDateOffset(days: number): string {
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date());
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function insertListing(
  sellerId: string,
  o: Partial<{
    face_value: number;
    probability: 25 | 50 | 75;
    price: number;
    expires_on: string;
    status: string;
    category: string;
  }> = {},
): Promise<string> {
  const [row] = await sql`
    insert into listings (seller_id, category, brand, product_name, face_value, expires_on, probability, price, status)
    values (${sellerId}, ${o.category ?? "cafe"}, 'brand', 'product', ${o.face_value ?? 2000},
            ${o.expires_on ?? kstDateOffset(30)}, ${o.probability ?? 50}, ${o.price ?? 1000}, ${o.status ?? "active"})
    returning id`;
  const id = row.id as string;
  await sql`insert into listing_secrets (listing_id, image_path, barcode_number)
            values (${id}, ${`${sellerId}/${id}.jpg`}, '1234 5678')`;
  return id;
}

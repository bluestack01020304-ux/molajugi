import postgres from "npm:postgres@3";

export const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false });
export type Sql = typeof sql;
export type Tx = Parameters<Parameters<typeof sql.begin>[0]>[0];

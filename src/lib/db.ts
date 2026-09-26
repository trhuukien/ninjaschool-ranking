import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * The D1 binding, configured in wrangler.jsonc as `DB`. Schema lives in
 * migrations/*.sql (applied via `wrangler d1 migrations apply`), not created
 * here at runtime — D1 doesn't support that the way the old node:sqlite file
 * did.
 */
export async function getDb(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

// GOOGLE_SERVICE_ACCOUNT_JSON isn't declared as a wrangler.jsonc "var" on
// purpose (see the comment there) — it's a dashboard/`wrangler secret`-only
// value, so its type has to be declared here instead of in the generated
// cloudflare-env.d.ts.
declare namespace Cloudflare {
  interface Env {
    GOOGLE_SERVICE_ACCOUNT_JSON: string;
  }
}

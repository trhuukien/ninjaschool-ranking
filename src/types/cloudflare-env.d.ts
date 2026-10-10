// ADMIN_SETUP_TOKEN isn't declared as a wrangler.jsonc "var" on purpose:
// wrangler.jsonc is git-controlled and a Git-connected deploy re-syncs vars
// from it, which would overwrite the real secret. Set it with
// `wrangler secret put ADMIN_SETUP_TOKEN` (and in .dev.vars locally), so its
// type has to be declared here instead of in the generated cloudflare-env.d.ts.
declare namespace Cloudflare {
  interface Env {
    /** Required by /admin/setup to create the first admin account. */
    ADMIN_SETUP_TOKEN?: string;
  }
}

// getCloudflareContext() types its env as CloudflareEnv.
interface CloudflareEnv {
  ADMIN_SETUP_TOKEN?: string;
}

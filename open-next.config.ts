import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No revalidation/ISR to cache — every route in this app is `force-dynamic`
// (live DB reads), so the default in-memory incremental cache is enough;
// no R2 bucket needed.
export default defineCloudflareConfig();

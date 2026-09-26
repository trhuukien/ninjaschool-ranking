// Shared Tailwind class strings for form controls, kept in one place so every
// <select>/<input> gets an explicit opaque background + text color (native
// select popups render with their own surface — "transparent" backgrounds
// leave option text unreadable) and the same ninja-dark look everywhere.
export const fieldClass =
  "rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent";

export const cardClass = "rounded-lg border border-border bg-surface";

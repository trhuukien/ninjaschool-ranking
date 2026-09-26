export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-background px-4 py-4 text-center text-xs text-muted">
      <p>© {year} Copyright Ninja School — Ninjaschool Ranking</p>
    </footer>
  );
}

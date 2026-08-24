import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <strong>Kameng Library</strong>
        <span>Seat availability and fair-use reservations.</span>
      </div>
      <nav aria-label="Legal links">
        <Link href="/privacy">Privacy policy</Link>
        <Link href="/terms">Terms of service</Link>
      </nav>
    </footer>
  );
}

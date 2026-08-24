import Link from "next/link";
import type { ReactNode } from "react";
import type { LibraryStats, SeatStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: SeatStatus | "ACTIVE" | "PENDING" | "RESOLVED" | "EXPIRED" }) {
  const labels: Record<string, string> = {
    AVAILABLE: "Available",
    OCCUPIED: "Occupied",
    GRACE: "Grace period",
    MAINTENANCE: "Maintenance",
    DISABLED: "Disabled",
    ACTIVE: "Active",
    PENDING: "Pending",
    RESOLVED: "Resolved",
    EXPIRED: "Expired"
  };
  return <span className={`status-badge status-${status.toLowerCase()}`}>{labels[status] ?? status}</span>;
}

export function StatCards({ stats }: { stats: LibraryStats }) {
  const cards = [
    { label: "Available now", value: stats.free, accent: "green" },
    { label: "In use", value: stats.occupied, accent: "amber" },
    { label: "Grace period", value: stats.grace, accent: "blue" },
    { label: "Unavailable", value: stats.maintenance + stats.disabled, accent: "stone" }
  ];
  return (
    <div className="stat-grid">
      {cards.map((card) => (
        <section className={`stat-card stat-${card.accent}`} key={card.label}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
          <small>of {stats.total} registered seats</small>
        </section>
      ))}
    </div>
  );
}

export function PageIntro({ eyebrow, title, children, action }: { eyebrow?: string; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <section className="page-intro">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {children && <div className="page-intro-copy">{children}</div>}
      </div>
      {action && <div className="page-intro-action">{action}</div>}
    </section>
  );
}

export function AdminNav() {
  const links = [
    ["Overview", "/admin"],
    ["Layout studio", "/admin/layout"],
    ["Seat register", "/admin/seats"],
    ["QR studio", "/admin/qr"],
    ["Live projection", "/admin/projection"],
    ["Sessions", "/admin/sessions"],
    ["Geofences", "/admin/geofences"],
    ["Challenges", "/admin/challenges"],
    ["Analytics", "/admin/analytics"],
    ["Audit trail", "/admin/audit"],
    ["Settings", "/admin/settings"]
  ];
  return (
    <nav className="admin-nav" aria-label="Admin navigation">
      {links.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
    </nav>
  );
}

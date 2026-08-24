"use client";

import { useEffect, useState } from "react";
import type { LibraryStats } from "@/lib/types";

export function ProjectionBoard({ initialStats }: { initialStats: LibraryStats }) {
  const [stats, setStats] = useState(initialStats);
  const [updatedAt, setUpdatedAt] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(async () => {
      const response = await fetch("/api/admin/stats");
      if (!response.ok) return;
      const body = await response.json();
      setStats(body.stats);
      setUpdatedAt(new Date());
    }, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const availablePercent = stats.total ? Math.round((stats.free / stats.total) * 100) : 0;
  const occupiedPercent = stats.total ? Math.round((stats.occupied / stats.total) * 100) : 0;
  return <section className="projection-board"><div className="projection-brand">KAMENG LIBRARY <span>LIVE OCCUPANCY</span></div><div className="projection-numbers"><div><span>Available</span><strong>{stats.free}</strong></div><div><span>Occupied</span><strong>{stats.occupied}</strong></div><div><span>Total seats</span><strong>{stats.total}</strong></div></div><div className="projection-bars"><div><span>Available</span><i><b style={{ width: `${availablePercent}%` }} /></i><strong>{availablePercent}%</strong></div><div><span>Occupied</span><i className="occupied"><b style={{ width: `${occupiedPercent}%` }} /></i><strong>{occupiedPercent}%</strong></div></div><p>Last refreshed {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })} · Scan a QR to reserve an available seat</p></section>;
}

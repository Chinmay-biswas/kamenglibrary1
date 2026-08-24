"use client";

import Link from "next/link";
import { useState } from "react";
import type { SeatRecord } from "@/lib/types";
import { StatusBadge } from "@/components/ui";

export function SeatManager({ initialSeats }: { initialSeats: SeatRecord[] }) {
  const [seats, setSeats] = useState(initialSeats);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function transition(seat: SeatRecord, action: "enable" | "disable" | "maintenance") {
    setMessage("");
    setError("");
    const response = await fetch(`/api/admin/seats/${seat.id}/${action}`, { method: "POST" });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Could not change seat status.");
      return;
    }
    setSeats((items) => items.map((item) => item.id === seat.id ? body.seat : item));
    setMessage(`${seat.code} is now ${body.seat.status.toLowerCase()}.`);
  }

  return (
    <section className="panel panel-pad">
      <div className="split-row"><div><p className="panel-kicker">Seat register</p><h2 className="panel-title">Manage physical seat status.</h2><p className="muted">Create and place new seats from the Layout Studio so they appear on the live floor plan immediately.</p></div><Link className="button" href="/admin/layout">Open Layout Studio</Link></div>
      <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Seat</th><th>Location</th><th>QR</th><th>Status</th><th>Actions</th></tr></thead><tbody>{seats.map((seat) => <tr key={seat.id}><td><strong>{seat.code}</strong><br /><span className="muted">{seat.label}</span></td><td>{seat.floor ?? "Ground"} · Zone {seat.zone ?? "—"}</td><td>v{seat.qrVersion}</td><td><StatusBadge status={seat.status} /></td><td><div className="table-actions">{seat.status !== "AVAILABLE" && <button className="text-button" type="button" onClick={() => void transition(seat, "enable")}>Enable</button>}{seat.status !== "MAINTENANCE" && <button className="text-button" type="button" onClick={() => void transition(seat, "maintenance")}>Maintenance</button>}{seat.status !== "DISABLED" && <button className="text-button danger" type="button" onClick={() => void transition(seat, "disable")}>Disable</button>}</div></td></tr>)}</tbody></table></div>
      {message && <p className="notice">{message}</p>}{error && <p className="notice notice-error">{error}</p>}
    </section>
  );
}

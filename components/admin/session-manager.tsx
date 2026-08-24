"use client";

import { useState } from "react";
import type { SeatRecord } from "@/lib/types";
import { StatusBadge } from "@/components/ui";

export function SessionManager({ initialSeats }: { initialSeats: SeatRecord[] }) {
  const [seats, setSeats] = useState(initialSeats);
  const [message, setMessage] = useState("");
  async function forceRelease(seat: SeatRecord) {
    const response = await fetch(`/api/admin/sessions/${seat.id}/release`, { method: "POST" });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error ?? "Unable to release this session.");
      return;
    }
    setSeats((items) => items.filter((item) => item.id !== seat.id));
    setMessage(`${seat.code} was force-released.`);
  }
  return <section className="panel panel-pad"><div className="split-row"><div><p className="panel-kicker">Active sessions</p><h2 className="panel-title">Seats currently in use.</h2></div><span className="session-total">{seats.length} active</span></div>{seats.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Seat</th><th>Ends</th><th>Status</th><th>Action</th></tr></thead><tbody>{seats.map((seat) => <tr key={seat.id}><td><strong>{seat.code}</strong><br /><span className="muted">{seat.label}</span></td><td>{seat.occupiedUntil ? new Date(seat.occupiedUntil).toLocaleString() : "—"}</td><td><StatusBadge status={seat.status} /></td><td><button className="text-button danger" type="button" onClick={() => void forceRelease(seat)}>Force release</button></td></tr>)}</tbody></table></div> : <div className="empty-state"><strong>No active seat sessions.</strong><span>Reservations will appear here as students scan seat QR labels.</span></div>}{message && <p className="notice">{message}</p>}</section>;
}

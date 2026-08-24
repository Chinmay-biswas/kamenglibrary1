"use client";

import { useState } from "react";
import type { SeatChallengeRecord, SeatRecord } from "@/lib/types";

export function ChallengeManager({ initialChallenges, seats }: { initialChallenges: SeatChallengeRecord[]; seats: SeatRecord[] }) {
  const [challenges, setChallenges] = useState(initialChallenges);
  const [message, setMessage] = useState("");
  const seatsById = new Map(seats.map((seat) => [seat.id, seat]));
  async function resolve(challenge: SeatChallengeRecord, action: "resolve" | "cancel") {
    const response = await fetch(action === "resolve" ? `/api/admin/challenges/${challenge.id}` : `/api/admin/challenges/${challenge.id}/cancel`, { method: action === "resolve" ? "PATCH" : "POST" });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.error ?? "Could not update the challenge.");
      return;
    }
    setChallenges((items) => items.map((item) => item.id === challenge.id ? body.challenge : item));
    setMessage(`Challenge for ${seatsById.get(challenge.seatId)?.code ?? "seat"} updated.`);
  }
  return <section className="panel panel-pad"><div className="split-row"><div><p className="panel-kicker">Attendance checks</p><h2 className="panel-title">Empty-seat challenges.</h2></div><span className="session-total">{challenges.filter((challenge) => challenge.status === "PENDING").length} pending</span></div>{challenges.length ? <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Seat</th><th>Opened</th><th>Expires</th><th>Status</th><th>Action</th></tr></thead><tbody>{challenges.map((challenge) => <tr key={challenge.id}><td><strong>{seatsById.get(challenge.seatId)?.code ?? challenge.seatId}</strong></td><td>{new Date(challenge.createdAt).toLocaleString()}</td><td>{new Date(challenge.expiresAt).toLocaleTimeString()}</td><td>{challenge.status}</td><td>{challenge.status === "PENDING" && <div className="table-actions"><button className="text-button" type="button" onClick={() => void resolve(challenge, "resolve")}>Mark returned</button><button className="text-button danger" type="button" onClick={() => void resolve(challenge, "cancel")}>Cancel</button></div>}</td></tr>)}</tbody></table></div> : <div className="empty-state"><strong>No attendance challenges.</strong><span>Challenges appear here after a student reports an occupied seat as physically empty.</span></div>}{message && <p className="notice">{message}</p>}</section>;
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SeatReleaseButton({ seatId }: { seatId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "working" | "error">("idle");
  const [message, setMessage] = useState("");

  async function release() {
    setState("working");
    setMessage("");
    const response = await fetch("/api/seats/release", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seatId })
    });
    const body = await response.json();
    if (!response.ok) {
      setState("error");
      setMessage(body.error ?? "Unable to release this seat.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="stack-tight">
      <button className="button button-danger" type="button" disabled={state === "working"} onClick={release}>
        {state === "working" ? "Releasing…" : "Release this seat"}
      </button>
      {message && <p className="inline-error">{message}</p>}
    </div>
  );
}

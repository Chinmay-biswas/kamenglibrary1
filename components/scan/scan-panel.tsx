"use client";

import { useEffect, useRef, useState } from "react";

type OwnerSummary = { name: string; rollNo?: string; hostelRoomNo?: string; phoneNumber?: string };
type Result = {
  message?: string;
  error?: string;
  type?: "SEAT" | "CHALLENGE";
  challenge?: { id: string; expiresAt: string };
  seat?: { id: string; code: string };
  owner?: OwnerSummary;
};

async function getLocation() {
  if (!navigator.geolocation) return undefined;
  return await new Promise<{ latitude: number; longitude: number; accuracy?: number } | undefined>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }),
      () => resolve(undefined),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  });
}

function formatRemaining(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function ScanPanel({ initialToken = "" }: { initialToken?: string }) {
  const [token, setToken] = useState(initialToken);
  const [result, setResult] = useState<Result | null>(null);
  const [working, setWorking] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const submittedRef = useRef("");
  const scannerClearRef = useRef<(() => Promise<void>) | null>(null);
  const submitScanRef = useRef<(value?: string) => Promise<void>>(async () => undefined);

  async function submitScan(value = token) {
    const cleaned = value.trim();
    if (!cleaned || working || submittedRef.current === cleaned) return;
    submittedRef.current = cleaned;
    setWorking(true);
    setResult(null);
    try {
      const location = await getLocation();
      const response = await fetch("/api/seats/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: cleaned, location })
      });
      const body = await response.json() as Result;
      setResult(response.ok ? body : { error: body.error ?? "The scan could not be completed." });
    } catch {
      setResult({ error: "The scan could not reach the server. Check your connection and try again." });
    } finally {
      setWorking(false);
      submittedRef.current = "";
    }
  }

  useEffect(() => {
    submitScanRef.current = submitScan;
  });

  useEffect(() => {
    if (!result?.challenge?.expiresAt) return;
    setCurrentTime(Date.now());
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 1000);
    const delay = Math.max(0, Date.parse(result.challenge.expiresAt) - Date.now()) + 250;
    const expiryRefresh = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch(`/api/seats/challenges/${result.challenge?.id}/status`, { cache: "no-store" });
          const body = await response.json() as { currentSeat?: { id: string; code: string } };
          setResult((previous) => {
            if (!previous?.challenge) return previous;
            const transferred = body.currentSeat?.id === previous.seat?.id;
            return {
              ...previous,
              type: transferred ? "SEAT" : previous.type,
              challenge: undefined,
              owner: undefined,
              message: transferred
                ? `${body.currentSeat?.code ?? "This seat"} is now reserved for you.`
                : "The attendance period ended. Seat availability has been refreshed."
            };
          });
        } catch {
          setResult((previous) => previous ? { ...previous, message: "The attendance period ended. Refresh My Seat to see the latest reservation." } : previous);
        }
      })();
    }, delay);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(expiryRefresh);
    };
  }, [result?.challenge?.expiresAt, result?.challenge?.id]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const previousClear = scannerClearRef.current;
      scannerClearRef.current = null;
      if (previousClear) {
        try { await previousClear(); } catch { /* clear failure is ignored */ }
      }
      if (!mounted) return;
      try {
        const { Html5QrcodeScanner } = await import("html5-qrcode");
        if (!mounted) return;
        const scanner = new Html5QrcodeScanner("kameng-qr-reader", { fps: 10, qrbox: { width: 230, height: 230 } }, false);
        scanner.render((decodedText: string) => { void submitScanRef.current(decodedText); }, () => undefined);
        scannerClearRef.current = () => scanner.clear();
      } catch {
        // The manual field below is intentionally kept as a reliable fallback.
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    return () => {
      const leftover = scannerClearRef.current;
      scannerClearRef.current = null;
      if (leftover) void leftover().catch(() => undefined);
    };
  }, []);

  return (
    <section className="scan-panel">
      <div id="kameng-qr-reader" className="qr-reader" />
      <p className="scan-help">Allow camera and location access. Location is checked against the library areas set by the admin.</p>
      <div className="manual-scan">
        <label htmlFor="qr-token">No camera? Paste the QR link or signed token.</label>
        <div><input id="qr-token" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste QR link or token" /><button className="button button-secondary" type="button" disabled={working} onClick={() => void submitScan()}>{working ? "Checking…" : "Verify scan"}</button></div>
      </div>
      {result?.message && <div className="notice">{result.message}</div>}
      {result?.type === "CHALLENGE" && result.challenge && <section className="challenge-result" aria-live="polite">
        <div><span>Owner return time</span><strong>{formatRemaining(Date.parse(result.challenge.expiresAt) - currentTime)}</strong></div>
        <div><span>Current seat holder</span><strong>{result.owner?.name ?? "Current seat holder"}</strong></div>
        {result.owner?.rollNo && <div><span>Roll number</span><strong>{result.owner.rollNo}</strong></div>}
        {result.owner?.hostelRoomNo && <div><span>Hostel room</span><strong>{result.owner.hostelRoomNo}</strong></div>}
        {result.owner?.phoneNumber && <div><span>Phone number</span><strong>{result.owner.phoneNumber}</strong></div>}
      </section>}
      {result?.error && <div className="notice notice-error">{result.error}</div>}
    </section>
  );
}

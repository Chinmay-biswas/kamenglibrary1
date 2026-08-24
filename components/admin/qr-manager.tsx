"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { SeatRecord } from "@/lib/types";
import { StatusBadge } from "@/components/ui";

type Preview = { title: string; dataUrl: string; scanUrl: string; version?: number; filename: string };

function downloadDataUrl(dataUrl: string, filename: string) {
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

async function responseError(response: Response) {
  try {
    const body = await response.json();
    return body.error ?? "The request could not be completed.";
  } catch {
    return "The request could not be completed.";
  }
}

export function QrManager({ initialSeats }: { initialSeats: SeatRecord[] }) {
  const [seats, setSeats] = useState(initialSeats);
  const [selected, setSelected] = useState<string[]>([]);
  const [previewSeatId, setPreviewSeatId] = useState(initialSeats[0]?.id ?? "");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (initialSeats[0]) void showSeat(initialSeats[0]);
    else void showGate();
  }, [initialSeats]);

  function toggleSeat(id: string) {
    setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  }

  async function showGate() {
    setError("");
    const response = await fetch("/api/admin/qr/gate");
    if (!response.ok) {
      setError(await responseError(response));
      return;
    }
    const gate = await response.json();
    setPreview({ title: "Library availability", dataUrl: gate.dataUrl, scanUrl: gate.scanUrl, filename: "kameng-library-availability-qr.png" });
  }

  async function showSeat(seat: SeatRecord) {
    setError("");
    const response = await fetch(`/api/admin/qr/seat/${seat.id}`);
    if (!response.ok) {
      setError(await responseError(response));
      return;
    }
    const body = await response.json();
    setPreviewSeatId(seat.id);
    setPreview({ title: `${seat.code} QR`, dataUrl: body.dataUrl, scanUrl: body.scanUrl, version: seat.qrVersion, filename: `kameng-library-${seat.code.toLowerCase()}-qr.png` });
  }

  function showSelectedSeat() {
    const seat = seats.find((item) => item.id === previewSeatId) ?? seats[0];
    if (seat) void showSeat(seat);
  }

  async function exportPdf(mode: "ALL" | "SELECTED") {
    setWorking(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/qr/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode, ids: selected }) });
      if (!response.ok) throw new Error(await responseError(response));
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `kameng-library-seat-qrs-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage(mode === "ALL" ? "The complete printable seat-label PDF has been downloaded." : `${selected.length} selected QR labels were downloaded as a PDF.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not export QR labels.");
    } finally {
      setWorking(false);
    }
  }

  async function rotate(seat: SeatRecord) {
    setWorking(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/qr/rotate/${seat.id}`, { method: "POST" });
      if (!response.ok) throw new Error(await responseError(response));
      const body = await response.json();
      setSeats((items) => items.map((item) => item.id === seat.id ? body.seat : item));
      setMessage(`${seat.code} is now on QR version ${body.seat.qrVersion}. Download and replace its printed label.`);
      await showSeat(body.seat);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not rotate this QR.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="qr-studio">
      <section className="qr-preview panel panel-pad">
        <div className="split-row"><div><p className="panel-kicker">Preview</p><h2 className="panel-title">{preview?.title ?? "Choose a QR"}</h2></div><div className="inline-actions"><button className="text-button" type="button" onClick={() => void showGate()}>Website QR</button><select aria-label="Choose seat QR" value={previewSeatId} disabled={!seats.length} onChange={(event) => setPreviewSeatId(event.target.value)}><option value="">Choose seat</option>{seats.map((seat) => <option key={seat.id} value={seat.id}>{seat.code}</option>)}</select><button className="text-button" type="button" disabled={!seats.length} onClick={showSelectedSeat}>Seat QR</button></div></div>
        {preview ? <><div className="qr-image-frame"><Image src={preview.dataUrl} alt={`${preview.title} code`} width={600} height={600} unoptimized /></div>{preview.version !== undefined && <p className="qr-version">QR version {preview.version}</p>}<div className="inline-actions"><button className="button button-secondary" type="button" onClick={() => downloadDataUrl(preview.dataUrl, preview.filename)}>Download PNG</button><button className="button button-quiet" type="button" onClick={() => navigator.clipboard?.writeText(preview.scanUrl)}>Copy {preview.version === undefined ? "website link" : "scan link"}</button></div></> : <div className="empty-state"><strong>Loading website QR…</strong></div>}
      </section>
      <section className="panel panel-pad qr-register">
        <div className="split-row"><div><p className="panel-kicker">Seat labels</p><h2 className="panel-title">Print and manage every seat QR.</h2></div><div className="inline-actions"><button className="button button-secondary" type="button" disabled={working || !selected.length} onClick={() => void exportPdf("SELECTED")}>Export selected ({selected.length})</button><button className="button" type="button" disabled={working} onClick={() => void exportPdf("ALL")}>Export all labels</button></div></div>
        <div className="data-table-wrap"><table className="data-table"><thead><tr><th><input aria-label="Select all seat QRs" type="checkbox" checked={selected.length === seats.length && seats.length > 0} onChange={(event) => setSelected(event.target.checked ? seats.map((seat) => seat.id) : [])} /></th><th>Seat</th><th>Zone</th><th>Version</th><th>Status</th><th>Actions</th></tr></thead><tbody>{seats.map((seat) => <tr key={seat.id}><td><input aria-label={`Select ${seat.code}`} type="checkbox" checked={selected.includes(seat.id)} onChange={() => toggleSeat(seat.id)} /></td><td><strong>{seat.code}</strong><br /><span className="muted">{seat.label}</span></td><td>{seat.zone ?? "—"}</td><td>v{seat.qrVersion}</td><td><StatusBadge status={seat.status} /></td><td><div className="table-actions"><button className="text-button" type="button" onClick={() => void showSeat(seat)}>Preview</button><button className="text-button" type="button" onClick={() => void showSeat(seat).then(() => undefined)}>Generate</button><button className="text-button danger" type="button" disabled={working} onClick={() => void rotate(seat)}>Rotate</button></div></td></tr>)}</tbody></table></div>
        {message && <p className="notice">{message}</p>}{error && <p className="notice notice-error">{error}</p>}
      </section>
    </div>
  );
}

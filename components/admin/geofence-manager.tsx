"use client";

import { useState } from "react";
import type { GeofenceRecord } from "@/lib/types";

const blank = { name: "", latitude: "", longitude: "", radiusMeters: "100", appliesToGate: true, appliesToSeats: true };

export function GeofenceManager({ initialGeofences }: { initialGeofences: GeofenceRecord[] }) {
  const [geofences, setGeofences] = useState(initialGeofences);
  const [form, setForm] = useState(blank);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function update(field: keyof typeof blank, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function addGeofence(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    const response = await fetch("/api/admin/geofences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, latitude: Number(form.latitude), longitude: Number(form.longitude), radiusMeters: Number(form.radiusMeters), enabled: true })
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Could not add the geofence.");
      return;
    }
    setGeofences((items) => [...items, body.geofence]);
    setForm(blank);
    setMessage("Allowed scan area added.");
  }

  async function toggle(geofence: GeofenceRecord) {
    const response = await fetch(`/api/admin/geofences/${geofence.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !geofence.enabled }) });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Could not update the geofence.");
      return;
    }
    setGeofences((items) => items.map((item) => item.id === geofence.id ? body.geofence : item));
  }

  async function remove(geofence: GeofenceRecord) {
    const response = await fetch("/api/admin/geofences", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: geofence.id }) });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error ?? "Could not remove the geofence.");
      return;
    }
    setGeofences((items) => items.filter((item) => item.id !== geofence.id));
    setMessage("Allowed scan area removed.");
  }

  return (
    <div className="two-column geofence-layout">
      <section className="panel panel-pad"><p className="panel-kicker">New scan area</p><h2 className="panel-title">Add a real library coordinate.</h2><p className="muted">Use a point recorded from inside the building, then choose a generous radius based on real phone tests.</p><form className="stack" onSubmit={addGeofence}><div className="form-field"><label>Name</label><input required value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Main Reading Hall" /></div><div className="form-grid"><div className="form-field"><label>Latitude</label><input required inputMode="decimal" value={form.latitude} onChange={(event) => update("latitude", event.target.value)} /></div><div className="form-field"><label>Longitude</label><input required inputMode="decimal" value={form.longitude} onChange={(event) => update("longitude", event.target.value)} /></div></div><div className="form-field"><label>Radius in metres</label><input required min="10" inputMode="numeric" value={form.radiusMeters} onChange={(event) => update("radiusMeters", event.target.value)} /></div><label className="check-control"><input type="checkbox" checked={form.appliesToGate} onChange={(event) => update("appliesToGate", event.target.checked)} /> Gate scans</label><label className="check-control"><input type="checkbox" checked={form.appliesToSeats} onChange={(event) => update("appliesToSeats", event.target.checked)} /> Seat scans</label><button className="button" type="submit">Add geofence</button></form></section>
      <section className="panel panel-pad"><p className="panel-kicker">Configured areas</p><h2 className="panel-title">Where scans are allowed.</h2><div className="geofence-list">{geofences.map((geofence) => <article key={geofence.id}><div><strong>{geofence.name}</strong><span>{geofence.latitude.toFixed(6)}, {geofence.longitude.toFixed(6)} · {geofence.radiusMeters} m</span><small>{geofence.appliesToGate ? "Gate" : ""}{geofence.appliesToGate && geofence.appliesToSeats ? " + " : ""}{geofence.appliesToSeats ? "Seat" : ""} scans</small></div><div className="inline-actions"><button className="text-button" type="button" onClick={() => void toggle(geofence)}>{geofence.enabled ? "Disable" : "Enable"}</button><button className="text-button danger" type="button" onClick={() => void remove(geofence)}>Remove</button></div><span className={`geofence-state ${geofence.enabled ? "is-on" : ""}`}>{geofence.enabled ? "Active" : "Off"}</span></article>)}</div>{message && <p className="notice">{message}</p>}{error && <p className="notice notice-error">{error}</p>}</section>
    </div>
  );
}

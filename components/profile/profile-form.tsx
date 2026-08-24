"use client";

import { useState } from "react";

export function ProfileForm({ email, initialName = "", redirectTo = "/dashboard" }: { email: string; initialName?: string; redirectTo?: string }) {
  const [form, setForm] = useState({ name: initialName, rollNo: "", hostelRoomNo: "", phoneNumber: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error ?? "Could not save your profile.");
      setSaving(false);
      return;
    }
    window.location.href = redirectTo;
  }

  return <form className="profile-form panel panel-pad" onSubmit={submit}><p className="panel-kicker">First-time setup</p><h2 className="panel-title">Tell us who you are.</h2><p className="muted">This information helps library staff identify reservations. Your sign-in email is <strong>{email}</strong>.</p><div className="form-field"><label htmlFor="name">Full name</label><input id="name" required value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Your full name" /></div><div className="form-grid"><div className="form-field"><label htmlFor="rollNo">Roll number</label><input id="rollNo" required value={form.rollNo} onChange={(event) => update("rollNo", event.target.value)} placeholder="e.g. 220101001" /></div><div className="form-field"><label htmlFor="hostelRoomNo">Hostel room number</label><input id="hostelRoomNo" required value={form.hostelRoomNo} onChange={(event) => update("hostelRoomNo", event.target.value)} placeholder="e.g. D-204" /></div></div><div className="form-field"><label htmlFor="phoneNumber">Phone number</label><input id="phoneNumber" required type="tel" value={form.phoneNumber} onChange={(event) => update("phoneNumber", event.target.value)} placeholder="Your contact number" /></div>{error && <p className="notice notice-error">{error}</p>}<button className="button" disabled={saving} type="submit">{saving ? "Saving profile…" : "Continue"}</button></form>;
}

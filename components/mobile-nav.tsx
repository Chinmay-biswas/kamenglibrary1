"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  signedIn: boolean;
  profileComplete: boolean;
  admin: boolean;
};

export function MobileNav({ signedIn, profileComplete, admin }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mobile-nav">
      <button
        type="button"
        className="mobile-nav-toggle"
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="mobile-nav-icon" aria-hidden="true">{open ? "✕" : "☰"}</span>
      </button>
      {open && (
        <nav className="mobile-nav-menu" aria-label="Mobile navigation">
          <Link href="/seats" onClick={() => setOpen(false)}>Availability</Link>
          {signedIn && profileComplete && <Link href="/dashboard" onClick={() => setOpen(false)}>My dashboard</Link>}
          {admin && <Link href="/admin" onClick={() => setOpen(false)}>Admin</Link>}
          {!signedIn && <Link href="/login" onClick={() => setOpen(false)}>Sign in</Link>}
        </nav>
      )}
    </div>
  );
}
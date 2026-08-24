"use client";

import { useEffect } from "react";

export function SignedInRedirect({ destination }: { destination: string }) {
  useEffect(() => {
    window.location.replace(destination);
  }, [destination]);

  return (
    <main className="page-shell content-narrow redirect-page">
      <section className="panel panel-pad">
        <p className="panel-kicker">Signed in</p>
        <h1 className="panel-title">Opening your requested page...</h1>
        <p className="muted">If this page does not open automatically, use the link below.</p>
        <a className="button" href={destination}>Continue</a>
      </section>
    </main>
  );
}

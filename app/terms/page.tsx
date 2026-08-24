import { PageIntro } from "@/components/ui";

export const metadata = { title: "Terms of Service | Kameng Library" };

export default function TermsPage() {
  return (
    <main className="page-shell content-narrow policy-page">
      <PageIntro eyebrow="Kameng Library" title="Terms of service.">
        Last updated: August 24, 2026.
      </PageIntro>
      <article className="panel panel-pad policy-content">
        <h2>Using the library system</h2>
        <p>Use your own Google account and provide accurate profile details. A student may hold one active seat at a time and must release it when leaving.</p>
        <h2>Seat QR labels</h2>
        <p>Reserve a seat only by scanning its physical QR label while at the library. Do not share, alter, or misuse QR labels or another student&apos;s account.</p>
        <h2>Attendance checks</h2>
        <p>If an occupied seat is empty, another student may begin an attendance check. The existing holder has 15 minutes to return and scan the same seat QR. If they do not return, the reservation may transfer to the waiting student.</p>
        <h2>Fair use</h2>
        <p>Administrators may disable seats, resolve challenges, or restrict access when the system is misused or when maintenance is required.</p>
      </article>
    </main>
  );
}

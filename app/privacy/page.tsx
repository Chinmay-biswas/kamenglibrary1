import { PageIntro } from "@/components/ui";

export const metadata = { title: "Privacy Policy | Kameng Library" };

export default function PrivacyPage() {
  return (
    <main className="page-shell content-narrow policy-page">
      <PageIntro eyebrow="Kameng Library" title="Privacy policy.">
        Last updated: August 24, 2026.
      </PageIntro>
      <article className="panel panel-pad policy-content">
        <h2>Information we collect</h2>
        <p>When you sign in and complete your profile, we store your name, email address, roll number, hostel room number, and phone number. We also store seat reservations, QR attendance checks, and relevant administration records.</p>
        <h2>How we use information</h2>
        <p>Information is used only to operate library reservations, show current seat ownership during an attendance check, prevent duplicate reservations, and help library administrators keep seats available and fair for students.</p>
        <h2>Sharing and retention</h2>
        <p>We do not sell personal information. Limited seat-holder details may be shown to a student who starts an attendance check for the same occupied seat. Information is retained while it is needed for library operations and administration.</p>
        <h2>Security and contact</h2>
        <p>Access to administrative tools is restricted to designated administrators. If you need to correct or remove profile information, contact the Kameng Library administrator.</p>
      </article>
    </main>
  );
}

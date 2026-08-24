# Kameng Library Seat Management

A full Next.js library seat system with Google or Microsoft sign-in, mobile live availability, printable seat QR labels, attendance checks, and an editable physical floor plan.

## What Works

- Microsoft Entra sign-in restricted to the configured institute email domain.
- Optional Google sign-in with mandatory first-time profile completion for full name, roll number, hostel room number, and phone number.
- Live student dashboard, availability map, QR camera/manual scanner, current-seat release, and notifications.
- A normal entrance Website QR that opens mobile live availability, plus signed Seat QR codes with QR version rotation.
- Printable A4 PDF QR labels for selected or all active seats.
- A student can hold only one seat at a time. Each reservation runs for two hours, then a 10-minute re-scan grace period. Scanning an occupied seat starts a separate 15-minute attendance check, notifies the current holder, and transfers the seat if they do not return.
- Admin dashboard, live projection, seat controls, geofences, challenges, session controls, audit trail, analytics, and readiness checks.
- Visual layout studio: create rooms, walls, doors, tables, pillars, labels, and seats; click to place them, drag to move them, and edit their size/position in the inspector.

## Run Locally

1. Create a local environment file from the provided example:

```powershell
Copy-Item .env.example .env.local
```

2. Add `NEXT_PUBLIC_APP_URL=http://localhost:3000` to `.env.local` for local QR labels. For deployment, use the exact public HTTPS site URL instead.

3. Install and start the app:

```powershell
npm install
npm run dev
```

4. Open `http://localhost:3000`.

## Microsoft Entra Setup

Register the app in Microsoft Entra ID, then add this redirect URI:

```text
http://localhost:3000/api/auth/callback/microsoft-entra-id
```

Add it under **Authentication → Add a platform → Web → Redirect URIs**. Do not add it under SPA, and do not add `/login`; Microsoft must return to the Auth.js callback route exactly. If you test with the LAN address, add this second URI too:

```text
http://192.168.1.106:3000/api/auth/callback/microsoft-entra-id
```

The `AADSTS500113: No reply address is registered` error means this URI is missing from the same app registration whose client ID is in `.env.local`. Save the portal change before trying again.

For deployment, add the same path under the production `NEXT_PUBLIC_APP_URL` domain. Put the generated Application (client) ID, client secret, and issuer URL into the `AUTH_MICROSOFT_ENTRA_ID_*` variables in `.env.local`.

### Microsoft Entra tenant error

If Microsoft shows `AADSTS50020` or says the user does not exist in the tenant, the application registration and the user account are in different directories. `ALLOWED_EMAIL_DOMAIN=iitg.ac.in` cannot fix a tenant mismatch because Microsoft rejects the account before the app receives the email.

For this library, the recommended setup is:

1. Ask an administrator of the IITG Microsoft Entra tenant to create or transfer the app registration there.
2. Set Supported account types to `Accounts in this organizational directory only`.
3. Use the IITG tenant ID in the issuer URL:

```text
https://login.microsoftonline.com/<IITG_TENANT_ID>/v2.0
```

4. Add the redirect URI shown above to that new registration.
5. Copy its new client ID and client secret into `.env.local`, then restart `npm run dev`.

The alternative is multi-tenant access. Change Supported account types to `Accounts in any organizational directory`, use this issuer, and obtain tenant/admin consent as required by Microsoft:

```text
https://login.microsoftonline.com/common/v2.0
```

Do not use `common` while the registration is still single-tenant. The tenant ID in the issuer, the app registration, and the account you are testing must agree.

## Required Environment Variables

- `MONGODB_URI`: MongoDB connection string. If MongoDB is unavailable, the interface uses the durable local fallback at `data/local-store.json`.
- `AUTH_SECRET`: Auth.js session signing secret.
- `AUTH_MICROSOFT_ENTRA_ID_ID`: Microsoft Entra application/client ID.
- `AUTH_MICROSOFT_ENTRA_ID_SECRET`: Microsoft Entra client secret value.
- `AUTH_MICROSOFT_ENTRA_ID_ISSUER`: Tenant issuer URL ending in `/v2.0`.
- `ALLOWED_EMAIL_DOMAIN`: Institute domain, such as `iitg.ac.in`.
- `SUPER_ADMIN_EMAIL`: First super-admin account.
- `QR_SIGNING_SECRET`: Secret used to sign printed QR payloads.
- `CRON_SECRET`: Bearer secret required by maintenance endpoints.
- `NEXT_PUBLIC_APP_URL`: Public base URL encoded into printable QR labels.
- `AUTH_GOOGLE_ID`: Google OAuth web client ID.
- `AUTH_GOOGLE_SECRET`: Google OAuth client secret.
- `RESEND_API_KEY`: Optional Resend API key for email copies of reservation and attendance alerts.
- `EMAIL_FROM`: A verified Resend sender, such as `Kameng Library <alerts@your-domain.example>`.

Never commit `.env.local`. Rotate any credentials that were ever shared in a repository, chat, or screenshot.

## Google Sign-In Setup

In Google Cloud Console, create an OAuth client of type **Web application**. Add this authorized redirect URI:

```text
http://localhost:3000/api/auth/callback/google
```

Put the client ID and secret into `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`, restart the app, and the **Continue with Google** button will appear. For deployment, add the production callback URI with the same `/api/auth/callback/google` path.

## Seat Timing And Alerts

- A reservation is `OCCUPIED` for two hours.
- It then enters `GRACE` for 10 minutes. The holder keeps the seat only by scanning that same printed Seat QR again during those 10 minutes.
- If the holder does not re-scan, the seat becomes `AVAILABLE` for everyone.
- When another student scans an occupied seat, the holder receives an immediate in-app notification and, when configured, an email. The separate attendance-check timer is 15 minutes.

Email delivery is optional but recommended. Create a Resend API key, verify a sender domain, and add `RESEND_API_KEY` plus `EMAIL_FROM` in Vercel. The app still records in-app notifications when those values are absent.

The repository includes `.github/workflows/seat-maintenance.yml`, which calls the secure production maintenance endpoint every five minutes. In the GitHub repository, add an Actions secret named `CRON_SECRET` with the exact same value as the Vercel `CRON_SECRET`. Optionally add the repository variable `KAMENG_APP_URL` if the production URL is not `https://kamenglibrary1.vercel.app`.

## Useful Checks

```powershell
npm run typecheck
npm run build
```

See [CHANGELOG_GUIDE.md](CHANGELOG_GUIDE.md) for the implementation log and feature guide.

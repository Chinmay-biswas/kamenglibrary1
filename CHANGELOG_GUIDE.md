# Change Guide

This file tracks the implementation changes made in the project so far.

## 2026-08-24

- Changed the entrance Gate QR into a normal Website QR that opens `/seats` on a mobile device without requiring sign-in or creating a gate visit.
- Removed the Gate QR prerequisite from seat reservations; students now view availability first and reserve only by scanning the printed QR on their chosen seat.
- Preserved old Gate QR links by redirecting them to live availability instead of leaving users at an obsolete gate scanner.
- Extended empty-seat attendance checks from five minutes to 15 minutes, including the owner notification, admin challenge guidance, and student-facing status copy.
- Added a live countdown and current-holder details (name, roll number, hostel room, and phone number) after a student scans an occupied seat.
- Kept the one-seat-per-student rule before location verification, so a student must release their current seat before scanning another seat QR.
- Made expiry dependable without a deployment-specific scheduler: a scan first processes elapsed challenges, and an active challenger countdown performs a protected status refresh exactly when its 15 minutes end.
- Updated the public floor-plan map on `/` and `/seats` to calculate the actual saved layout bounds, including rotated elements, so rooms and seats placed outside the original board are fitted into view instead of being clipped.
- Added public Privacy Policy and Terms of Service pages, with a responsive site footer linking to both, for production Google OAuth branding.
- Made the configured `SUPER_ADMIN_EMAIL` override an older stored student role immediately, including durable local fallback users, so production admin access remains correct after environment changes.
- Fixed Google sign-in callback handling to use Auth.js&apos;s normalized account email before optional provider-profile fields, preventing false Access Denied responses for valid Google accounts.
- Fixed MongoDB Google sign-in failure for the configured super-admin: the user upsert now writes `role` through only one MongoDB update operator, avoiding the `Updating the path 'role' would create a conflict` error.
- Fixed stale-session admin redirects by allowing the configured `SUPER_ADMIN_EMAIL` through the edge middleware before its JWT role claim is refreshed; server pages and APIs retain their independent role checks.
- Preserved safe internal `callbackUrl` destinations through existing sign-in sessions and first-time profile setup, so an admin request returns to `/admin` instead of always landing on the student dashboard.
- Replaced the invisible signed-in login redirect with a client-side handoff and visible Continue fallback, preventing a blank `/login?callbackUrl=/admin` page when browser navigation is delayed or intercepted.

## 2026-08-19

- Added `package.json` with the app dependencies and scripts for Next.js, TypeScript, and linting.
- Added `tsconfig.json` with strict TypeScript settings and `@/*` path alias support.
- Added `next-env.d.ts` and `next.config.mjs` for Next.js project compatibility.
- Added `.gitignore` for common build and environment artifacts.
- Added `README.md` as the project entry point.
- Added `CHANGELOG_GUIDE.md` to serve as the running implementation guide.
- Added `app/layout.tsx` and `app/globals.css` for the shared application shell and visual base styles.
- Added `app/page.tsx` for the home page with live stats and navigation links.
- Added `app/dashboard/page.tsx`, `app/scan/page.tsx`, `app/seats/page.tsx`, `app/my-seat/page.tsx`, and `app/notifications/page.tsx` as the first student-facing screens.
- Added `app/admin/page.tsx` as the first admin landing page with links to core admin areas.
- Added `lib/types.ts`, `lib/seat-store.ts`, `lib/seat-service.ts`, `lib/qr.ts`, `lib/validators.ts`, `lib/permissions.ts`, `lib/mongodb.ts`, and `lib/auth.ts` to provide shared seat, QR, validation, auth, and data helpers.
- Added API routes for seat listing, seat stats, seat scan, seat release, gate scan, admin stats, QR generation, and one cron job endpoint.
- Added a simple in-memory seat model with default seat records so the app has functional demo behavior before MongoDB wiring is completed.
- Added geofence, notification, occupancy, layout, and seat-challenge helper services to cover the remaining product workflows.
- Added full admin route and page surfaces for seats, sessions, layout, analytics, challenges, geofences, QR management, audit, projection, and settings.
- Added supporting APIs for user info, notifications, push subscription endpoints, seat-specific challenge endpoints, geofence CRUD, QR export, and QR rotation.
- Added Mongoose model definitions for the core domain entities so the codebase matches the blueprint data model.
- Fixed dynamic route handler signatures for Next.js 15 route type checking.
- Added a local `qrcode` type declaration and adjusted `tsconfig.json` so plain `tsc` does not depend on generated `.next` files.
- Verified the project with `npm run typecheck` and `npm run build` successfully on 2026-08-19.
- Added a MongoDB connector with lazy connection handling and database-backed seat, geofence, and challenge storage.
- Added Auth.js v5 / NextAuth integration with Microsoft Entra ID provider support, JWT role claims, and DB-backed user upsert.
- Added `app/api/auth/[...nextauth]/route.ts` and edge-safe admin protection in `middleware.ts` using the signed JWT role.
- Marked Mongo-backed pages as dynamic so production builds do not prerender live database views.
- Re-verified the project with `npm run typecheck` after restoring the plain TypeScript config.
- Wired push subscribe/unsubscribe endpoints to Mongo-backed push subscription storage.
- Wired the audit page and settings page to Mongo-backed audit logs and system settings.
- Added audit logging for admin seat state changes, QR rotation, geofence CRUD, and force-release actions.
- Restored the repo-friendly `tsconfig.json` include list so plain `tsc` stays clean even after Next build runs.
- Replaced the scaffold-only UI with a complete responsive visual design, including the global navigation shell, landing page, sign-in page, student dashboard, live availability map, reservation page, notifications page, and camera/manual QR scanner.
- Added a polished `/login` page that uses Microsoft Entra through Auth.js and clearly shows when local authentication variables still need to be configured.
- Added signed QR payloads with HMAC verification, QR scan URLs, Gate QR previews, Seat QR previews, QR version rotation, PNG download, and real A4 PDF seat-label export.
- Documented `NEXT_PUBLIC_APP_URL` because physical QR labels must encode the real public site URL.
- Added `html5-qrcode` for browser camera scanning, while retaining a manual paste field for development or camera-denied devices.
- Rebuilt the admin dashboard into a command centre with quick access to layout, QR labels, geofences, and live projection.
- Added a functional `/admin/layout` Layout Studio with click-to-place tools for rooms, seats, walls, doors, tables, pillars, and labels; drag-to-move behavior; size/coordinate inspector editing; auto seat numbering; and soft-disable/remove seat handling.
- Added persistent layout records in MongoDB with an in-memory local fallback and a seeded starter floor plan so the map is immediately useful.
- Added a proper seat register, QR Studio, geofence manager, session monitor, challenge manager, analytics panel, audit table, system readiness page, and auto-refreshing projection screen.
- Replaced placeholder admin layout, QR, audit, analytics, challenge, session, geofence, settings, and projection responses with working services and APIs.
- Added server-side admin authorization checks to the admin APIs in addition to middleware protection; admin fetches now receive JSON authorization errors instead of sign-in HTML.
- Added fallback audit, settings, push-subscription, layout, and seat storage paths so the local UI does not crash when `MONGODB_URI` is absent.
- Added Gate-visit tracking, geofence-aware signed QR scanning, current-user seat ownership checks, five-minute empty-seat challenges, owner return verification, and scheduled challenge expiry/transfer handling.
- Secured cron routes with `CRON_SECRET`, secured notification reads to the logged-in user, and removed client-controlled user IDs from push subscriptions.
- Fixed persistence defects in seat state changes, QR version rotation, challenge state changes, and geofence CRUD.
- Verified TypeScript after the feature rebuild with `npm run typecheck` on 2026-08-19.
- Fixed startup crashes when `MONGODB_URI` is configured but the MongoDB SRV endpoint is unreachable: the first failed connection now disables Mongo access for the process and all public pages use the in-memory demo store instead of returning a 500.
- Hardened Auth.js callbacks so an unreachable MongoDB does not break sign-in setup; roles can still fall back to the configured super-admin email in local/demo mode.
- Kept stale Auth.js JWT cookies non-fatal by treating decryption failures as signed out users; users with an old secret should clear the site cookies once and sign in again.
- Verified the rebuilt local app returns `200` for `/`, `/seats`, and `/login` with the current unreachable-Mongo environment.
- Documented the Microsoft Entra `AADSTS50020` tenant-mismatch fix, including the recommended IITG single-tenant setup and the optional multi-tenant `/common/v2.0` setup.
- Switched the local Microsoft Entra issuer to `https://login.microsoftonline.com/common/v2.0` for the user-controlled multi-tenant setup.
- Documented the `AADSTS500113` reply-address fix and the exact Auth.js Web redirect URIs for localhost and LAN testing.
- Added optional Google OAuth sign-in with `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` configuration.
- Added first-login profile completion for full name, roll number, hostel room number, and phone number, with a required `/profile/setup` step before dashboard, scanning, or reservations.
- Added profile persistence to the User model and local fallback store, including session profile-completion state.
- Replaced volatile in-memory fallback data with a durable local `data/local-store.json` store for profiles, seats, layout elements, geofences, challenges, and audit records whenever MongoDB is unreachable.
- Fixed layout placement so new seats, rooms, walls, doors, tables, pillars, and labels can be placed over the existing floor-plan elements instead of only on uncovered background space.
- Fixed layout drag persistence to save the final drop coordinates, added permanent seat deletion, and shortened failed MongoDB connection attempts to keep the admin UI responsive.
- Added Layout Studio keyboard controls: Shift + click multi-selection, Delete/Backspace removal of selected map placements, arrow-key nudging, Shift + arrow fast nudging, and Escape to clear the selection.
- Added advanced Layout Studio canvas controls: Ctrl/Cmd + mouse-wheel zoom, zoom buttons and reset, Ctrl/Cmd + A select-all, Ctrl/Cmd + plus/minus zoom shortcuts, and a visible drag corner for resizing selected layout items.
- Improved desktop Layout Studio handling by capturing the mouse pointer during drag/resize, keeping the board at a full fitted size when zooming out, and limiting zoom to Ctrl/Cmd + mouse-wheel over the board so browser zoom shortcuts are not triggered.
- Restored zoom-out support down to 50% and centered the reduced board in its viewport for a usable desktop overview.
- Reworked layout zoom so the grid always fills the complete board while objects scale around its center; added direct custom zoom entry from 10% to 500% and zoom-aware placement, movement, and resizing coordinates.
- Removed the old 0–100 layout boundary: objects can now be placed, moved, resized, and saved beyond the initial visible grid, with Space + drag or middle-mouse panning to navigate the extended canvas.
- Fixed scaled layout text so labels shrink and grow with their objects; added direct left-drag panning from empty grid space alongside Space-drag and middle-mouse panning.
- Replaced percentage-based layout zoom entry with smooth multiplicative canvas zoom via Ctrl/Cmd + wheel and relative zoom controls.
- Expanded the protected continuous Layout Studio zoom range to 0.01% through 100,000%, preventing mathematical/browser failures without imposing a practical editing limit.
- Removed native browser confirmation dialogs from admin layout deletion, permanent seat deletion, QR rotation, geofence removal, and session force-release actions; the admin UI now runs actions immediately and reports results in-page.
- Changed Layout Studio drag and resize persistence to a 450 ms silent save after release, keeping interactions responsive while still reporting failed background saves in-page.
- Added Layout Studio undo/redo history for drag, resize, and keyboard-nudge operations, accessible through Ctrl/Cmd + Z, Ctrl/Cmd + Y, Ctrl/Cmd + Shift + Z, and the visible Undo/Redo controls.
- Extended Layout Studio undo/redo to restore and re-remove keyboard-deleted layout placements, including placed seat elements; permanent seat-record deletion remains deliberately irreversible.
- Clarified the admin command centre data by showing both registered seat records and floor-plan placements, including any registered seats that are not currently placed.
- Made Layout Studio the single source of truth for operational seats: only placed seat elements now appear in availability, Admin counts, the seat register, and QR Studio; older unplaced records remain safely stored but are hidden.
- Removed the generated ten-seat starter inventory for new local or MongoDB setups, so admins can create and place any number of seats from Layout Studio without a fixed limit.
- Protected direct seat-QR preview, rotation, and scan routes with the same floor-plan check, so an old QR for a removed layout seat cannot be used outside the visible admin screens.
- Added reusable Layout Studio blueprints: admins can name and save the current rooms, furniture, labels, and placed-seat definitions; use a saved blueprint to replace the live floor plan; or delete an obsolete blueprint directly from the toolbox.
- Stored layout blueprints in MongoDB when connected and in the durable local JSON fallback when offline, with audit records for save, apply, and deletion actions.
- Fixed the Admin Settings page when MongoDB is unreachable: settings now use durable local storage instead of buffering a Mongoose query and returning a 500; the readiness panel also reports actual Mongo availability.
- Changed MongoDB connection failure handling from a permanent process lockout to a 15-second retry cooldown, so the site automatically reconnects after a temporary DNS or network outage.
- Fixed Layout Studio group dragging: Ctrl/Cmd + A and Shift-selected items now move together while preserving their relative positions, saving each changed item silently and restoring the whole group through undo/redo.
- Fixed Layout Studio deselection: clicking an empty grid now clears an active selection instead of beginning an unintended pan; Escape and a visible Clear selection control provide additional direct ways to deselect.

## 2026-08-22 - Security and Verification Pass

- Removed real credentials from `.env.example`; it now contains safe placeholders and setup-only examples. Local secrets remain in `.env.local` and were not modified.
- Started a full verification pass across authentication, MongoDB fallback, seat/layout persistence, QR workflows, and admin routes.
- Added a non-interactive ESLint 9 flat configuration and pinned `eslint-config-next` to the installed Next.js 15 line so `npm run lint` performs a repeatable check.
- Scoped linting to project source directories so generated graph/build artifacts cannot make the check excessively slow; the current check reports warnings only and no errors.
- Corrected the README storage description to match the durable local fallback that is actually used when MongoDB is unavailable.
- Fixed same-session profile completion by reading the current user record instead of relying on a JWT claim created before the profile form was saved.
- Made Gate and Seat QR tokens stable for a given QR version; regenerating or reloading a label no longer changes its signed value, while explicit QR rotation still changes the version and invalidates old labels.
- Linked direct seat deletion to floor-plan cleanup, so deleting a seat through the admin API also removes every placement that references it.
- Cleared final lint warnings by keeping QR previews in sync with changed seat props, using the current scan callback for camera events, and declaring Layout Studio keyboard-action dependencies.

## 2026-08-19 - Comprehensive Verification & Testing

- Verified all core QR generation and verification logic:
  - HMAC-SHA256 signed QR payloads with base64url encoding
  - Gate QR (type: GATE) and Seat QR (type: SEAT) generation
  - QR version rotation invalidates old printed labels
  - Tampered/invalid QR tokens properly rejected
  - URL token extraction from scan links works correctly
  - Missing seatId for SEAT type properly rejected

- Verified geofence validation logic:
  - Haversine distance calculation accurate (tested inside/outside/boundary)
  - Gate and seat geofence checks use correct coordinates
  - Multiple geofence support with appliesToGate/appliesToSeats flags

- Verified seat state transition logic:
  - OCCUPIED -> GRACE (after 2 hours) -> AVAILABLE (after 10 min grace)
  - AVAILABLE, MAINTENANCE, DISABLED states remain stable
  - occupiedUntil/graceUntil/assignedTo properly managed

- Verified challenge system logic:
  - 5-minute attendance challenges created correctly
  - PENDING -> RESOLVED (RETURN/TRANSFER) / EXPIRED / CANCELLED transitions
  - Expired challenges transfer seat to challenger when possible

- Verified full scan flow:
  - Gate QR scan creates/refreshes library visit
  - Seat QR scan validates version, location, ownership, challenges
  - Seat reservation, challenge creation, owner return all work
  - Version mismatch detection (rotated QR codes)

- Verified QR PDF export:
  - A4 layout with 3x4 grid (12 labels per page)
  - PNG QR codes embedded at 600px with error correction M
  - Seat code, label, and instructional text on each label
  - Multi-page PDF generation for >12 seats

- Verified responsive UI across breakpoints:
  - 1100px: Admin layout editor adapts, inspector moves below
  - 900px: Navigation collapses, grids become single column, login aside hides
  - 560px: Stats grid 2x1, library map smaller, form grids single column, editor canvas 390px

- Verified all admin pages load without errors:
  - /admin (overview), /admin/qr (QR Studio), /admin/seats (Seat Register)
  - /admin/layout (Layout Studio), /admin/projection (Live Projection)
  - /admin/sessions (Session Monitor), /admin/geofences (Geofence Manager)
  - /admin/challenges (Challenge Manager), /admin/analytics, /admin/audit, /admin/settings

- Verified student-facing pages:
  - / (home with live stats), /seats (availability map), /scan (QR scanner)
  - /dashboard (student workspace), /my-seat (reservation), /notifications
  - /login (Google/Microsoft sign-in), /profile/setup (profile completion)

- TypeScript compilation: `npm run typecheck` - PASSED (no errors)
- Production build: `npm run build` - PASSED (all 32 pages generated)
- Dev server: All pages return HTTP 200 OK
- Local store persistence: data/local-store.json maintains seats, layout, geofences, challenges, audit logs across restarts

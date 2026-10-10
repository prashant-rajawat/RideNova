# RideNova — Full-Stack Cab Booking Platform
**Tagline:** *Your ride. Your route. Your time.*

RideNova is a modern, full-stack cab and ride-booking platform built with an Uber-style ride-hailing architecture.

---

## Step 1 Baseline: Foundation, Architecture & Database Foundation (Verified)
- **Presentation Tier:** Next.js / React 19 SPA with Tailwind CSS
- **Application Tier:** Node.js Express REST API with TypeScript, Helmet, CORS, and Rate Limiting
- **Persistence Tier:** Supabase PostgreSQL with 11 core relational tables, UUID primary keys, and performance indexes
- **Security Rule Enforced:** Zero client-side database access or secret credentials in frontend code

---

## Step 2 Baseline: Clerk Authentication & Role-Based Access Control (Verified)
- **Authentication Provider:** Clerk Authentication (Session management, sign-up, login, social auth, logout)
- **Identity & Role Storage:** PostgreSQL `users` table maps `clerk_user_id` (UNIQUE) to verified application users
- **Three Strict Application Roles:**
  - `rider` (SAFE DEFAULT assigned to all new users)
  - `driver` (Assigned only via verified backend workflow)
  - `admin` (Assigned only via protected administrative setup)
- **Zero Frontend Role Trust:** Clients cannot manipulate roles via request bodies or headers. Roles are verified strictly from the database.
- **Backend Clerk Token Verification:** Official `@clerk/backend` SDK token verification in `requireAuth` middleware.
- **Role Middleware:** `requireRole('rider')`, `requireRole('driver')`, `requireRole('admin')` returning HTTP 403 FORBIDDEN.
- **Role Route Redirection:**
  - `rider` → `/rider` (Rider Dashboard)
  - `driver` → `/driver` (Driver Dashboard)
  - `admin` → `/admin` (Admin Dashboard)
  - Unauthorized role navigation triggers 403 Access Denied without infinite loops.

---

## API Endpoints

### Health Diagnostics (Step 1)
- `GET /api/health` — API service availability, uptime, environment, version
- `GET /api/health/db` — Safe database connectivity test

### Authentication & Roles (Step 2)
- `GET /api/auth/me` — Returns current authenticated application user (Requires Bearer token; HTTP 401 if unauthenticated)
- `GET /api/auth/role` — Returns authenticated user's role only
- `PATCH /api/auth/profile` — Safely updates name and phone (ignores role manipulation attempts)
- `POST /api/auth/dev-promote` — Controlled backend role promotion for testing/development
- `GET /api/auth/rider-test` — Role test endpoint (Requires rider/driver/admin)
- `GET /api/auth/driver-test` — Role test endpoint (Requires driver/admin; riders get 403)
- `GET /api/auth/admin-test` — Role test endpoint (Requires admin; riders/drivers get 403)

---

## Frontend Routes

- `/` — Platform Overview, System Diagnostics & Step 2 Automated Test Runner
- `/sign-in` — Clerk Sign In page with Social Login preview & quick test profiles
- `/sign-up` — Clerk Sign Up page with automatic default `rider` role provisioning
- `/rider` — Rider Dashboard (Welcome banner, Role badge `RIDER`, Navigation placeholders)
- `/driver` — Driver Dashboard (Welcome banner, Role badge `DRIVER`, Navigation placeholders)
- `/admin` — Admin Dashboard (Admin Console, Role badge `ADMIN`, Navigation placeholders)
- `/profile` — User Profile (Name, Email, Phone, Profile Image, Database Role, safe field editing)
- `/access-denied` — 403 Access Denied handler with safe redirect back to authorized dashboard

---

## Running Migrations & Tests

- **Run All Verification Tests (Step 1 + Step 2):**
  ```bash
  npm test
  ```
- **Run Migrations:**
  ```bash
  npm run migrate
  ```
- **TypeScript Check:**
  ```bash
  npm run lint
  ```
- **Production Build:**
  ```bash
  npm run build
  ```

---

## Manual Clerk Configuration Instructions (When Connecting Live Keys)

1. Open your [Clerk Dashboard](https://dashboard.clerk.com).
2. Create or select your RideNova application.
3. In the left navigation, go to **API Keys**:
   - Copy the **Publishable key** (`pk_test_...`) and place it in `.env` as:
     `VITE_CLERK_PUBLISHABLE_KEY="pk_test_..."`
     `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."`
   - Copy the **Secret key** (`sk_test_...`) and place it in `.env` as:
     `CLERK_SECRET_KEY="sk_test_..."`
4. Under **User & Authentication > Social Connections**:
   - Enable **Google** or desired social providers (Clerk will automatically manage the OAuth handshake).
5. Under **User & Authentication > Email, Phone, Username**:
   - Require Email address and Password.

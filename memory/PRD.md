# Cutting Corners - Gemstone Cutting Business Website

## Original Problem Statement
Full-stack web application for a professional gemstone cutting business based in Tempe, Arizona. Features include gallery, shop, booking, sell inquiry, admin panel, user authentication, and email services.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: Python FastAPI + MongoDB
- **Typography**: Self-hosted custom fonts with role-based CSS system
- **Persistence**: MongoDB-backed (DB mode) — all stores survive restarts

## Production Configuration (Feb 10, 2026)
- `ENV=production` — security enforces env vars only
- `JWT_SECRET` — 64-char cryptographic random from env
- `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH` — loaded from env (no dev fallbacks)
- `CORS_ORIGINS=*` — open for deployment flexibility
- `DB_NAME=cutting_corners_production` — separate from test DB
- `PERSISTENCE_MODE=DB` — Studio, Negotiations, Orders all MongoDB-backed

## Core Features Implemented
- Gallery, Shop, Cart, Booking, Sell Inquiry pages
- Admin panel with full CRUD for products, gallery, inquiries, users
- JWT Authentication with Forgot/Reset Password flow (fully functional)
- Provider-agnostic email engine (SendGrid, Resend, Mailgun, Postmark, AWS SES)
- Admin soft-delete & purchase blocking, user self-delete
- Stripe payment integration (configurable)
- Studio page with before/after comparison
- Continuity gate preflight script
- Full DB persistence for all stores (Content, Negotiation, Order, PurchaseToken)
- Admin Data Delete Controls: Soft-delete, restore, and hard-purge for all user-interaction data

## Forgot Password Feature (Feb 2026 - Completed)
- "Forgot password?" link in login modal (`AuthModal.js`)
- Dedicated form view with email input and submit
- Backend: `POST /api/auth/forgot-password` — generates reset token, returns generic message
- Success confirmation state with "Back to Sign In" navigation
- `POST /api/auth/reset-password` — completes reset with valid token
- NOTE: Email provider is MOCKED — tokens generated but emails not delivered until admin configures a provider

## Admin Delete Controls (Feb 10, 2026)
- `POST /api/admin/{domain}/{id}/delete` — Soft-delete with reason
- `POST /api/admin/{domain}/{id}/restore` — Restore soft-deleted
- `DELETE /api/admin/{domain}/{id}?hard=true` — Permanent purge
- All list endpoints support `?include_deleted=true` filter
- Supported domains: bookings, sold, product-inquiries, sell-inquiries, nyp-inquiries, messages, orders, negotiations

## Typography System
- **Display (Oranienbaum)**: `.title-xl`, `.page-title`, `.hero-title` — with 0.04em letter-spacing
- **Hero**: `.hero-title` at 4.5rem
- **Name**: `.name-title` at 7rem
- **Section titles**: `.title-xl` at 3rem

## Landing Page Section Order
1. Hero Section (with Industry badge)
2. Philosophy Section ("My Four C's")
3. Services Section
4. The Cutter Section (with "View Portfolio" -> Gallery)
5. CTA Section

## Admin Per-User HB/NYP Override (Feb 2026 - Completed)
- `PATCH /api/admin/users/{user_id}/entitlements` — toggle `override_enabled` with optional `note`
- Persists `nyp_override_enabled`, `nyp_override_note`, `nyp_override_set_at` in MongoDB user record
- When enabled: `unlocked_nyp=true`, `spend_to_unlock=0`, `override_enabled=true` in entitlements
- Unlocks both Humble Beginnings (Gallery) and Name Your Price (Shop/Dashboard)
- Admin UI: toggle + note input in expanded user card, "OVERRIDE ON" badge
- Does NOT modify existing purchase/entitlements math — adds an override path only

## Admin Users Show Deleted Toggle (Feb 2026 - Completed)
- Added `include_deleted` query parameter to `GET /api/admin/users`
- "Show deleted" checkbox toggle on Admin Users page (`data-testid="show-deleted-toggle"`)
- Matches existing pattern from AdminInquiries, AdminSold, AdminNegotiations
- No changes to existing delete/block logic

## Backlog
- P2: Optimize N+1 queries in admin endpoints (performance)
- P2: Configure real email provider for password reset delivery
- P2: Activate Stripe payments

## Key Files
- `/app/frontend/src/components/AuthModal.js` — Auth modal with forgot password flow
- `/app/frontend/src/pages/Home.js` — Landing page
- `/app/frontend/src/components/Layout.js` — Navigation & footer
- `/app/frontend/src/styles/typography.lock.css` — Font role definitions
- `/app/backend/server.py` — All API endpoints
- `/app/frontend/src/pages/admin/AdminInquiries.js` — Inquiry management with delete controls
- `/app/frontend/src/pages/admin/AdminSold.js` — Sold items with delete controls
- `/app/frontend/src/pages/admin/AdminNegotiations.js` — Negotiations with delete controls

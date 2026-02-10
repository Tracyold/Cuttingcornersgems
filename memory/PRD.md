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
- `CORS_ORIGINS` — restricted to deployed frontend domain
- `DB_NAME=cutting_corners_production` — separate from test DB
- `PERSISTENCE_MODE=DB` — Studio, Negotiations, Orders all MongoDB-backed

## Core Features Implemented
- Gallery, Shop, Cart, Booking, Sell Inquiry pages
- Admin panel with full CRUD for products, gallery, inquiries, users
- JWT Authentication with Forgot/Reset Password flow
- Provider-agnostic email engine (SendGrid, Resend, Mailgun, Postmark, AWS SES)
- Admin soft-delete & purchase blocking, user self-delete
- Stripe payment integration (configurable)
- Studio page with before/after comparison
- Continuity gate preflight script
- Full DB persistence for all stores (Content, Negotiation, Order, PurchaseToken)

## Typography System
- **Display (Oranienbaum)**: `.title-xl`, `.page-title`, `.hero-title` — with 0.04em letter-spacing
- **Hero**: `.hero-title` at 4.5rem
- **Name**: `.name-title` at 7rem
- **Section titles**: `.title-xl` at 3rem
- **Subtitle (Montserrat)**: `.title-sm`
- **Body (Comfortaa)**: Default body text
- **UI (Nexa Rust Sans)**: Nav, buttons, menus
- **Mono (AHAMONO)**: Prices, codes

## Landing Page Section Order
1. Hero Section (with Industry badge)
2. Philosophy Section ("My Four C's")
3. Services Section
4. The Cutter Section (with "View Portfolio" → Gallery)
5. CTA Section

## Backlog
- No pending tasks. Awaiting user instructions.

## Key Files
- `/app/frontend/src/pages/Home.js` — Landing page
- `/app/frontend/src/components/Layout.js` — Navigation & footer
- `/app/frontend/src/styles/typography.lock.css` — Font role definitions
- `/app/backend/server.py` — All API endpoints
- `/app/backend/services/content_store.py` — Studio content persistence (DB-backed)
- `/app/backend/services/negotiation_store.py` — Negotiation persistence (DB-backed)
- `/app/backend/services/order_store.py` — Order persistence (DB-backed)
- `/app/backend/config/security.py` — JWT & admin credential management
- `/app/backend/config/persistence.py` — Persistence mode configuration

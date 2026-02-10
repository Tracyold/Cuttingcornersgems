# Cutting Corners - Gemstone Cutting Business Website

## Original Problem Statement
Full-stack web application for a professional gemstone cutting business based in Tempe, Arizona. Features include gallery, shop, booking, sell inquiry, admin panel, user authentication, and email services.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: Python FastAPI + MongoDB
- **Typography**: Self-hosted custom fonts with role-based CSS system

## Core Features Implemented
- Gallery, Shop, Cart, Booking, Sell Inquiry pages
- Admin panel with full CRUD for products, gallery, inquiries, users
- JWT Authentication with Forgot/Reset Password flow
- Provider-agnostic email engine (SendGrid, Resend, Mailgun, Postmark, AWS SES)
- Admin soft-delete & purchase blocking, user self-delete
- Stripe payment integration
- Studio page (admin-toggleable)
- Continuity gate preflight script

## Typography System
- **Display (Oranienbaum)**: `.title-xl`, `.page-title` — enforced at `text-2xl` globally
- **Subtitle (Montserrat)**: `.title-sm`, headings by default
- **Body (Comfortaa)**: Default body text
- **UI (Nexa Rust Sans)**: Nav, buttons, menus
- **Mono (AHAMONO)**: Prices, codes, measurements
- Controlled via `/app/frontend/src/styles/typography.lock.css`

## Landing Page Section Order (as of Feb 2026)
1. Hero Section
2. Philosophy Section ("My Four C's")
3. Services Section
4. About Section (with "View Portfolio" button → Gallery)
5. CTA Section

## What's Been Implemented (Feb 10, 2026)
- Applied `text-2xl` to all Oranienbaum (`.title-xl`) titles globally via CSS
- Increased philosophy section text size (`text-xl md:text-2xl`)
- Decreased "Studio" overlay text to `text-sm`
- Changed "Book a Consultation" → "View Portfolio" linking to `/gallery`
- Increased hero subtitle size (`text-lg md:text-xl lg:text-2xl`)
- Decreased "Cutting Corners" nav logo to `text-sm`
- Swapped Services ↔ Philosophy section order on landing page
- Scroll reveal effects preserved with IntersectionObserver

## Backlog
- No pending tasks. Awaiting user instructions.

## Key Files
- `/app/frontend/src/pages/Home.js` — Landing page
- `/app/frontend/src/components/Layout.js` — Navigation & footer
- `/app/frontend/src/styles/typography.lock.css` — Font role definitions
- `/app/frontend/src/styles/typography.roles.css` — @font-face declarations
- `/app/backend/server.py` — All API endpoints
- `/app/tools/preflight_continuity_gate.py` — Continuity checks

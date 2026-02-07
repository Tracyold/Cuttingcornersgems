# Cutting Corners - PRD (Product Requirements Document)

## Original Problem Statement
Create a modern and compelling website for a gemstone cutter called "Cutting Corners" by Michael Wall in Tempe, Arizona. The site needs to draw people in with effects and subtle color schemes. Professional yet edgy and laid back aesthetic. Features include: gallery, shop, booking page. Users can create accounts for booking, buying, and custom work.

## User Personas
1. **Gemstone Collector** - Looking for unique, precision-cut gemstones
2. **Jewelry Maker** - Needs custom cutting services for their designs
3. **Casual Buyer** - Interested in purchasing finished gemstones
4. **Custom Work Client** - Wants consultation for re-cutting or special projects

## Core Requirements (Static)
- JWT-based user authentication
- Gallery with left sidebar categories, right grid with lightbox
- Shop with product listings and cart functionality
- Booking form with service/stone type dropdowns
- Thank you screen with phone number (480-285-4595)
- User dashboard for orders and bookings

## What's Been Implemented (Jan 7, 2026)
- ✅ Full-stack application (React + FastAPI + MongoDB)
- ✅ Dark theme with Playfair Display + Manrope fonts
- ✅ Home page with hero, services, featured gems, about Michael
- ✅ Gallery with category sidebar (Sapphire, Tourmaline, Emerald, Tanzanite, Aquamarine, Garnet, Other)
- ✅ Lightbox for image viewing with navigation
- ✅ Shop with product grid and category filters
- ✅ Cart functionality with checkout flow
- ✅ Booking form with dropdowns (services: Cut, Re-cut, Re-polish, Cut Design, Consultation)
- ✅ Stone type dropdown (NO diamond included)
- ✅ Thank you screen with phone number 480-285-4595
- ✅ User registration and login (JWT)
- ✅ User dashboard with orders, bookings, account tabs
- ✅ Responsive design
- ✅ API seeding with sample gallery and products

## Technology Stack
- Frontend: React 19, Tailwind CSS, Shadcn UI, Sonner (toasts)
- Backend: FastAPI, MongoDB (Motor async driver)
- Auth: JWT with bcrypt password hashing
- Fonts: Playfair Display, Manrope, JetBrains Mono

## Prioritized Backlog

### P0 (Critical - Done)
- [x] Core authentication flow
- [x] Gallery with filtering
- [x] Booking system
- [x] Shop functionality

### P1 (High Priority)
- [ ] Stripe payment integration for actual checkout
- [ ] Email notifications for bookings
- [ ] Admin panel for managing products/bookings
- [ ] Better product images from real inventory

### P2 (Nice to Have)
- [ ] Image upload for booking requests
- [ ] Advanced search/filtering
- [ ] Customer reviews/testimonials
- [ ] Blog/news section

## Next Tasks
1. Integrate Stripe for actual payment processing
2. Add email notifications (SendGrid/Resend) for booking confirmations
3. Create admin dashboard for managing inventory
4. Replace placeholder images with actual gemstone photos

# Cutting Corners - PRD (Product Requirements Document)

## Original Problem Statement
Create a modern and compelling website for a gemstone cutter called "Cutting Corners" by Michael Wall in Tempe, Arizona. The site needs to draw people in with effects and subtle color schemes. Professional yet edgy and laid back aesthetic. Features include: gallery, shop, booking page. Users can create accounts for booking, buying, and custom work.

## User Personas
1. **Gemstone Collector** - Looking for unique, precision-cut gemstones
2. **Jewelry Maker** - Needs custom cutting services for their designs
3. **Casual Buyer** - Interested in purchasing finished gemstones
4. **Custom Work Client** - Wants consultation for re-cutting or special projects
5. **Admin/Owner** - Michael Wall managing the business operations

## Core Requirements (Static)
- JWT-based user authentication
- Gallery with left sidebar categories, right grid with lightbox
- Shop with product listings and cart functionality
- Booking form with service/stone type dropdowns
- Thank you screen with phone number (480-285-4595)
- User dashboard for orders and bookings
- Comprehensive admin panel for business management

## Technology Stack
- Frontend: React 19, Tailwind CSS, Shadcn UI, Sonner (toasts)
- Backend: FastAPI, MongoDB (Motor async driver)
- Auth: JWT with bcrypt password hashing
- Fonts: Playfair Display, Manrope, JetBrains Mono

## What's Been Implemented

### Core Website (Completed Jan 2026)
- ✅ Full-stack application (React + FastAPI + MongoDB)
- ✅ Dark theme with Playfair Display + Manrope fonts
- ✅ Home page with hero, services, featured gems, about Michael
- ✅ Gallery with category sidebar (Sapphire, Tourmaline, Emerald, Tanzanite, Aquamarine, Garnet, Other)
- ✅ Lightbox for image viewing with navigation
- ✅ Shop with product grid and category filters
- ✅ Mobile-specific layouts (single column, dedicated pages)
- ✅ Desktop layouts (popups, categories)
- ✅ Cart functionality with checkout flow
- ✅ Booking form with dropdowns (services: Cut, Re-cut, Re-polish, Cut Design, Consultation)
- ✅ Stone type dropdown (NO diamond included)
- ✅ Thank you screen with phone number 480-285-4595
- ✅ User registration and login (JWT)
- ✅ User dashboard with orders, bookings, account tabs
- ✅ Sell Inquiry page with photo uploads and negotiable pricing
- ✅ Responsive design
- ✅ API seeding with sample gallery and products

### Admin Panel V2 (Completed Feb 2026)
- ✅ Secure admin login (postvibe/adm1npa$$word)
- ✅ **Dynamic Dashboard** with live backend stats:
  - Products, Gallery Items, Bookings, Users, Orders, Sold Items counts
  - Total Revenue calculation
  - Pending Bookings
  - Inquiry Breakdown (Product, Sell, Name Your Price)
  - Recent Activity feed
- ✅ **Products Management**:
  - CRUD operations for products
  - Bulk Add (max 10 entries) with Next/Back/Done buttons
  - Saved items panel during bulk add
  - GIA Reports and Name Your Price options
- ✅ **Gallery Management**:
  - CRUD operations for gallery items
  - Bulk Add (max 10 entries) with same UX as Products
- ✅ **Inquiries Page**:
  - Tabs: Bookings, Product Inquiries, Sell Inquiries, Name Your Price
  - Expandable cards showing full form details
  - Name Your Price shows product info with thumbnail
  - Links to product pages
- ✅ **Sold Items Page**:
  - Invoice display with expandable details
  - Tracking number entry (auto-populates to user account)
  - User notes feature
  - Email verification status
  - Price breakdown (item, shipping, total)
  - Buyer information display
- ✅ **Settings Pages** (all with enable/disable toggles & date connected):
  - **Stripe/Payments**: Test/Live mode, API keys, webhook secret, test connection
  - **Cloud Storage**: Multiple providers (Cloudinary, S3, GCS, Bunny, Backblaze)
  - **Security**: SMS (Twilio, Vonage, etc.) and CAPTCHA (reCAPTCHA, hCaptcha, Turnstile)
  - **Email Service**: SendGrid, Resend, Mailgun, SES, Postmark with auto-email triggers
- ✅ **Users Management**: View all registered users
- ✅ **Help Center**: Setup guides for all integrations

## Prioritized Backlog

### P0 (Critical - Completed)
- [x] Core authentication flow
- [x] Gallery with filtering
- [x] Booking system
- [x] Shop functionality
- [x] Admin panel with full management capabilities

### P1 (High Priority - Configurable, Ready for Keys)
- [ ] Stripe payment integration (settings UI ready, needs API keys)
- [ ] Email notifications (settings UI ready, needs provider API key)
- [ ] SMS/2FA verification (settings UI ready, needs provider credentials)
- [ ] Cloud storage for images (settings UI ready, needs provider credentials)
- [ ] CAPTCHA protection (settings UI ready, needs site/secret keys)

### P2 (Nice to Have)
- [ ] Advanced search/filtering in shop
- [ ] Customer reviews/testimonials
- [ ] Blog/news section
- [ ] Order analytics/reporting

## Next Tasks
1. Connect Stripe with real API keys for payment processing
2. Configure email service (SendGrid recommended) for notifications
3. Add real product images via cloud storage
4. Enable CAPTCHA for form protection

## API Endpoints Reference

### Public
- `/api/auth/register`, `/api/auth/login` - User authentication
- `/api/gallery/items` - Gallery items
- `/api/shop/products` - Shop products
- `/api/booking` - Submit booking
- `/api/sell-inquiry` - Submit sell inquiry

### Admin (Protected)
- `/api/admin/login` - Admin authentication
- `/api/admin/dashboard/stats` - Live dashboard statistics
- `/api/admin/products` - CRUD products
- `/api/admin/products/bulk` - Bulk add products
- `/api/admin/gallery` - CRUD gallery items
- `/api/admin/gallery/bulk` - Bulk add gallery items
- `/api/admin/bookings` - View bookings
- `/api/admin/product-inquiries` - View product inquiries
- `/api/admin/sell-inquiries` - View sell inquiries
- `/api/admin/name-your-price-inquiries` - View NYP inquiries
- `/api/admin/sold` - View/update sold items
- `/api/admin/settings` - Site settings CRUD
- `/api/admin/settings/test-email` - Test email connection
- `/api/admin/users` - View users
- `/api/admin/orders` - View orders

## Test Credentials
- **Admin**: postvibe / adm1npa$$word
- **Preview URL**: https://lapidary-hub.preview.emergentagent.com

## Notes
- All 3rd party integrations (Stripe, Email, SMS, CAPTCHA, Storage) are **CONFIGURABLE PLACEHOLDERS** with test connection buttons
- Test connections simulate success for known providers but don't make real API calls
- Settings persist to MongoDB and show "date connected" when configured

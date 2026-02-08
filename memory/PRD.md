# Cutting Corners - PRD (Product Requirements Document)

## Original Problem Statement
Create a modern and compelling website for a gemstone cutter called "Cutting Corners" by Michael Wall in Tempe, Arizona. The site needs to draw people in with effects and subtle color schemes. Professional yet edgy and laid back aesthetic. Features include: gallery, shop, booking page. Users can create accounts for booking, buying, and custom work.

## User Personas
1. **Gemstone Collector** - Looking for unique, precision-cut gemstones
2. **Jewelry Maker** - Needs custom cutting services for their designs
3. **Casual Buyer** - Interested in purchasing finished gemstones
4. **Custom Work Client** - Wants consultation for re-cutting or special projects
5. **Admin/Owner** - Michael Wall managing the business operations

## Technology Stack
- Frontend: React 19, Tailwind CSS, Shadcn UI, Sonner (toasts)
- Backend: FastAPI, MongoDB (Motor async driver)
- Auth: JWT with bcrypt password hashing
- Fonts: Playfair Display, Manrope, JetBrains Mono

## What's Been Implemented

### Core Website (Completed Jan 2026)
- ✅ Full-stack application (React + FastAPI + MongoDB)
- ✅ Dark theme with custom fonts
- ✅ Home page with hero, services, featured gems
- ✅ Gallery with category sidebar and lightbox
- ✅ Shop with product grid, mobile/desktop layouts
- ✅ Booking form with service/stone dropdowns
- ✅ User registration and login (JWT)
- ✅ User dashboard
- ✅ Sell Inquiry page

### Admin Panel V2 (Completed Feb 2026)
- ✅ Secure admin login (postvibe/adm1npa$$word)
- ✅ **Dynamic Dashboard** with live backend stats
- ✅ **Products Management** with Bulk Add (max 10)
- ✅ **Gallery Management** with Bulk Add (max 10)
- ✅ **Inquiries Page** with expandable cards and tabs
- ✅ **Sold Items Page** with full invoice details
- ✅ **Settings Pages** with enable/disable toggles

### Admin Panel V3 - Data & Archives (Completed Feb 2026)
- ✅ **Data & Archives Page** with 6 tabs:
  - Sold (30+ days old)
  - Inquiries (30+ days old)
  - Bookings (90+ days old)
  - Deleted Gallery
  - Deleted Products
  - All Deleted Items
- ✅ **Auto-Archive System**:
  - Manual archive button for bookings
  - Auto-archive runs on schedule (30/90 day thresholds)
  - Archives compressed to .txt files with standard format
  - Batch download as .md files
- ✅ **Pre-Deletion Data Extraction**:
  - All deleted items archived before removal
  - Captures: date created, date deleted, views, clicks, meta links, cache
- ✅ **Analytics & Data Collection Settings**:
  - Enable/disable toggle (default OFF)
  - Provider selection (Google Analytics, Plausible, Fathom, Mixpanel, Amplitude, Heap, PostHog, Custom)
  - Test connection button (MOCKED)
  - Data collection type toggles (browser, device, clicks, views, duration, interaction rate)
- ✅ **Test Data Seed** for admin testing:
  - Creates test product inquiry
  - Creates test sell inquiry
  - Creates test Name Your Price inquiry
  - Creates test sold item with full invoice details

## Prioritized Backlog

### P0 (Critical - Completed)
- [x] Core website functionality
- [x] Admin panel with full management
- [x] Data & Archives system
- [x] Analytics settings placeholder

### P1 (High Priority - Ready for Keys)
- [ ] Stripe payment integration (settings UI ready)
- [ ] Email notifications (settings UI ready)
- [ ] SMS/2FA verification (settings UI ready)
- [ ] Cloud storage for images (settings UI ready)
- [ ] CAPTCHA protection (settings UI ready)
- [ ] Analytics service connection (settings UI ready)

### P2 (Nice to Have)
- [ ] Advanced search/filtering
- [ ] Customer reviews
- [ ] Blog section
- [ ] Order analytics/reporting

## API Endpoints

### Public
- `/api/auth/register`, `/api/auth/login` - User auth
- `/api/gallery/items`, `/api/shop/products` - Content
- `/api/booking`, `/api/sell-inquiry` - Inquiries

### Admin (Protected)
- `/api/admin/login` - Admin auth
- `/api/admin/dashboard/stats` - Live stats
- `/api/admin/products`, `/api/admin/gallery` - CRUD
- `/api/admin/bookings/{id}/archive` - Manual archive
- `/api/admin/sold`, `/api/admin/sold/{id}` - Sold items
- `/api/admin/data/archived/*` - Archive data
- `/api/admin/data/archive/run` - Run auto-archive
- `/api/admin/data/download/*` - Download archives
- `/api/admin/data/purge/*` - Purge archives
- `/api/admin/settings/test-analytics` - Test analytics
- `/api/admin/seed-test-data` - Create test data

## Test Credentials
- **Admin**: postvibe / adm1npa$$word
- **Preview URL**: https://lapidary-hub.preview.emergentagent.com

## Notes
- All 3rd party integrations are **CONFIGURABLE PLACEHOLDERS**
- Analytics test connection is **MOCKED**
- Archives are empty until items reach age threshold (30/90 days)
- Delete operations now archive data before removal

# Cutting Corners Gems - Product Requirements Document

## Original Problem Statement
A gemstone portfolio website for showcasing gem cutting work, with features for galleries, journeys (before/after transformations), designs, shop, and booking.

## Core Features Implemented

### Public Pages
- **Home/Landing Page** - Main landing with brand overview
- **Portfolio** (formerly Gallery) - Three views:
  - Galleries - Photo grid with amber titles
  - Journeys - Before/after slider thumbnails with timeline popup
  - Designs - Cutting diagrams and patterns
- **Shop** - Product listings with categories
- **Sell** - Inquiry form for selling gems
- **Book** - Booking page
- **Studio** - Studio content page

### Portfolio Features (Latest - Feb 2026)
- **Galleries View**: Photo grid with amber/gold titles below each image
- **Journeys View**: 
  - Before/after slider thumbnails (square format)
  - Black slider handle with chevron arrows
  - Two-click to open: first click shows "Click to see timeline", second opens
  - Timeline popup: 4 photos per row, up to 8 photos, actual arrows between
  - Photos left-aligned, inner vignette effect
- **Designs View**: Grid of cutting designs with popup detail view

### Admin Features
- Dashboard with statistics
- Products management
- Gallery management (removed "FUTURE" from eras)
- **Journeys management**
  - Add/edit/delete journeys
  - Slider thumbnail images (before/after URLs)
  - Timeline images (up to 8 URLs)
  - Accent color picker
- **Designs management**
  - Add/edit/delete designs
  - Image URL, title, category, description
- **User management with Message Notifications** (Feb 2026)
  - Red badge on "Users" nav link showing total unread messages
  - Per-user red badges showing unread count on user cards
  - Auto mark-as-read when user card is expanded
  - Color-coded message styling:
    - ADMIN messages: gold/amber tag and background
    - USER messages: teal tag and background
  - Send message to user functionality
- Various settings (Stripe, Storage, Security, Email, Analytics)

### Navigation
- Removed "Home" from nav bar
- Logo "Cutting Corners Gems" links to home page
- Nav items: Portfolio | Studio | Shop | Sell | Book

### UI/UX Details
- Dark theme with amber/gold accents
- Left menu with gold active states for icons and text
- Changed "Category" to "Gem Type" in Portfolio sidebar
- Changed "Gallery" to "Galleries" in VIEW section

## Tech Stack
- Frontend: React with Tailwind CSS
- Backend: FastAPI with MongoDB
- Auth: JWT-based admin authentication

## API Endpoints

### Public
- `GET /api/journeys` - List all journeys
- `GET /api/designs` - List all designs
- `GET /api/gallery` - List gallery items
- `GET /api/products` - List shop products

### Admin (requires auth)
- `POST/GET/PATCH/DELETE /api/admin/journeys` - Journey CRUD
- `POST/GET/PATCH/DELETE /api/admin/designs` - Design CRUD
- `POST/GET/PATCH/DELETE /api/admin/gallery` - Gallery CRUD
- `POST/GET/PATCH/DELETE /api/admin/products` - Product CRUD

## Database Collections
- `journeys` - Journey stories data
- `designs` - Cutting designs data
- `gallery` - Gallery items
- `products` - Shop products
- `users` - User accounts
- `inquiries` - Contact inquiries

## Backlog / Future Tasks
- Image upload integration (currently URL-based)
- Reorder functionality for journeys/designs
- Mobile responsiveness testing
- Performance optimization

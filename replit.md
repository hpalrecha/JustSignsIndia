# Just Signs India - Master Distributor Website

## Overview

A modern, responsive website for Just Signs India Pvt. Ltd., the Master Distributor of 3M Wrap Films, PPF, Window Films & Signage Solutions across India. The platform features a public-facing website showcasing products and services, along with an admin dashboard for managing contact submissions and warranty claims.

**Core Features:**
- Multi-page informational website (Home, About, Products, Blog, Downloads, Warranty Claim, Contact)
- Contact form submission system
- Warranty claim submission with image upload capability
- Blog system with full CRUD management in admin dashboard
- Marketing collateral downloads with file upload support (PDFs, images, documents)
- Admin authentication and dashboard
- Export functionality for submissions (CSV format)
- Mobile-responsive design with blood-red (#B70F20) brand color scheme

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework:** React 18 with TypeScript, using Vite as the build tool

**UI Component Library:** shadcn/ui (New York style variant)
- Radix UI primitives for accessible components
- Tailwind CSS for styling with custom design tokens
- Custom color palette centered on blood-red primary color (#B70F20)

**Routing:** wouter for client-side routing
- File-based page structure in `client/src/pages/`
- Routes: `/`, `/about`, `/products`, `/blog`, `/blog/:slug`, `/downloads`, `/warranty-claim`, `/contact`, `/admin`, `/admin/dashboard`

**State Management:**
- TanStack React Query for server state and data fetching
- React Hook Form with Zod validation for form handling
- Session-based authentication state

**Design System:**
- Typography: Montserrat (bold, geometric) and Poppins (clean, readable)
- Spacing: Tailwind's utility classes with consistent rhythm (4, 6, 8, 12, 16, 20, 24)
- Responsive grid layouts: 4-column → 2-column → 1-column breakpoints
- Full-width hero sections with overlay gradients

### Backend Architecture

**Framework:** Express.js with TypeScript (ES modules)

**API Structure:**
- RESTful endpoints under `/api` prefix
- Session-based authentication for admin routes
- Middleware for authentication guard (`isAdminAuthenticated`)

**Key Endpoints:**
- `POST /api/contact` - Contact form submission
- `POST /api/warranty-claims` - Warranty claim submission with image URLs
- `GET /api/blog` - Get all published blog posts
- `GET /api/blog/:slug` - Get single blog post by slug
- `GET /api/marketing-collateral` - Get all marketing collateral
- `POST /api/admin/login` - Admin authentication
- `POST /api/admin/logout` - Session termination
- `GET /api/admin/contact-submissions` - Retrieve all contact submissions
- `GET /api/admin/warranty-claims` - Retrieve all warranty claims
- `GET /api/admin/blog` - Retrieve all blog posts (including drafts)
- `POST/PUT/DELETE /api/admin/blog/:id` - CRUD operations for blog posts
- `GET /api/admin/marketing-collateral` - Retrieve all marketing collateral
- `POST/PUT/DELETE /api/admin/marketing-collateral/:id` - CRUD operations for marketing collateral
- `GET /api/admin/export/contacts` - Export contacts as CSV
- `GET /api/admin/export/warranty-claims` - Export claims as CSV

**Development vs Production:**
- Development: Vite dev server integration with HMR
- Production: Static file serving from compiled build

### Data Storage

**Database:** PostgreSQL via Neon serverless

**ORM:** Drizzle ORM with schema-first approach
- Schema defined in `shared/schema.ts`
- Migrations managed in `migrations/` directory

**Tables:**
1. `admin_users` - Admin authentication (username, bcrypt-hashed password)
2. `contact_submissions` - Contact form data (name, phone, email, city, message)
3. `warranty_claims` - Warranty claim data (customer details, product info, issue description, image URLs)
4. `blog_posts` - Blog content (title, slug, excerpt, content, featuredImageUrl, published status, timestamps)
5. `marketing_collateral` - Downloadable files (title, description, category, fileUrl, fileType, fileName, timestamps)
6. `session` - Express session store (auto-created by connect-pg-simple)

**Data Validation:**
- Zod schemas generated from Drizzle schema using `drizzle-zod`
- Shared validation between frontend and backend
- Runtime validation on API endpoints

### Authentication & Authorization

**Session Management:**
- `express-session` with PostgreSQL store (connect-pg-simple)
- HTTP-only cookies with 7-day TTL
- Secure flag enabled in production

**Password Security:**
- bcrypt hashing with salt rounds
- Password verification on login
- Default admin credentials seeded via `server/seed.ts`

**Route Protection:**
- Middleware-based authentication checks
- Session validation against database
- Unauthorized requests return 401 status

### File Upload & Storage

**Image Storage:** Google Cloud Storage via Replit Object Storage
- Configuration through `@google-cloud/storage` SDK
- Token-based authentication via Replit sidecar
- Private bucket directory from `PRIVATE_OBJECT_DIR` environment variable

**Upload Flow:**
1. Frontend requests signed upload URL from backend
2. Client uploads directly to Google Cloud Storage
3. Public URL stored in warranty claim record

**File Constraints:**
- Maximum 5 images per warranty claim
- Supported formats managed client-side

## External Dependencies

### Third-Party Services

**Google Cloud Storage:**
- Purpose: Image storage for warranty claim submissions
- Integration: Replit Object Storage with GCS backend
- Authentication: Service account via Replit sidecar endpoint

**Neon PostgreSQL:**
- Purpose: Primary database (serverless PostgreSQL)
- Connection: Via `@neondatabase/serverless` with WebSocket support
- Configuration: `DATABASE_URL` environment variable

### Development Tools

**Replit Integrations:**
- `@replit/vite-plugin-runtime-error-modal` - Error overlay
- `@replit/vite-plugin-cartographer` - Dev tooling
- `@replit/vite-plugin-dev-banner` - Dev environment banner

### Key NPM Packages

**UI & Styling:**
- `tailwindcss` - Utility-first CSS framework
- `class-variance-authority` - Component variants
- `clsx` / `tailwind-merge` - Conditional class merging

**Data Handling:**
- `drizzle-orm` - Type-safe ORM
- `drizzle-kit` - Schema migrations
- `zod` - Runtime validation
- `react-hook-form` - Form state management
- `@hookform/resolvers` - Zod integration

**Authentication & Security:**
- `bcrypt` - Password hashing
- `express-session` - Session middleware
- `connect-pg-simple` - PostgreSQL session store

**Export Functionality:**
- `json2csv` - CSV generation for data exports

**Asset Management:**
- Static assets served from `attached_assets/` directory
- Generated images referenced from `@assets` alias
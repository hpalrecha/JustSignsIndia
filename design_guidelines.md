# Design Guidelines: Just Signs India Pvt. Ltd.

## Design Approach
**Reference-Based**: Premium automotive/industrial B2B websites with bold, confident aesthetics. Draw inspiration from Tesla's product showcases, 3M's professional presentation style, and modern automotive brand experiences.

## Core Brand Identity
**Color Palette** (Logo-Based):
- Primary: Coral Red (#C7493E / HSL 5° 72% 46%) - Use for CTAs, headers, accents, hover states (adjusted from logo color for WCAG AA accessibility compliance - 4.5:1 contrast ratio)
- Background: White (#FFFFFF) - Primary background for clean, premium feel
- Typography: Black (#000000) - Main text, headings
- Secondary: Light gray (#F5F5F5) - Section backgrounds for contrast
- Accent: Dark gray (#333333) - Supporting text, borders

**Typography** (User-Specified):
- Primary Font: Montserrat (bold, geometric, modern)
- Secondary Font: Poppins (clean, readable)
- Heading Hierarchy: Bold weights (700-800) for impact
- Body Text: Regular (400) and Medium (500) weights
- Size Scale: Use large, confident headings (48px-72px desktop hero, 32px-48px section headers, 16px-18px body)

## Layout System
**Spacing**: Use Tailwind units of 4, 6, 8, 12, 16, 20, 24 for consistent rhythm
- Section padding: py-16 to py-24 (desktop), py-12 (mobile)
- Component spacing: gap-6 to gap-8
- Container max-width: max-w-7xl with px-4 to px-8

**Grid Strategy**:
- Home stats: 4-column grid (desktop), 2-column (tablet), 1-column (mobile)
- Product tiles: 3-column grid (desktop), 2-column (tablet), 1-column (mobile)
- Features: 2-3 column layouts

## Page-Specific Guidelines

### Home Page
**Hero Section**:
- Full-width hero banner with automotive/architectural imagery showing 3M products in application
- Large bold headline: "One-Stop Solution for Automotive & Architectural Protection Films"
- Coral-red CTA button with white text: "Explore Our Products"
- Height: 85vh with centered content overlay

**Company Stats Section**:
- 4-column grid showcasing achievements
- Large numbers in coral-red, black supporting text
- Icons above each stat (cityscape, projects, customers, anniversary)
- Stats: "82+ Cities", "1200+ Projects", "95% Returning Customers", "10+ Years"

**Product Carousel**:
- Full-width image cards with product names
- Categories: Wraps, PPF, Printable Wraps, Bike Styling, Signage
- Minimal navigation dots in coral-red

### About Us Page
- Hero banner with company/facility image
- 2-column layout: text content + supporting images
- Highlight sections: 3M Association, Infrastructure, E-store
- Use white cards with subtle shadows on light gray background

### Products Page
- Category grid: 2-column layout (desktop), stack on mobile
- Each category card: Image background with overlay, bold title, short description
- Individual product tiles within categories: 3-column grid
- Product tile: Image, name, brief specs, "Get Quote" button in coral-red

### Warranty Claim & Contact Pages
- Clean, single-column forms (max-w-2xl centered)
- Form fields with subtle borders, focus state in coral-red
- Large, prominent submit button in coral-red
- Contact page: Split layout with form on left, contact details on right

## Component Library

**Buttons**:
- Primary: Coral-red background, white text, rounded corners (rounded-lg)
- Secondary: White background, coral-red border and text
- Sizes: Generous padding (px-8 py-4 for primary CTAs)
- Blur background when overlaying images

**Cards**:
- White background with subtle shadow (shadow-md)
- Rounded corners (rounded-xl)
- 1px border in light gray
- Hover: Slight lift effect (shadow-lg)

**Icons**:
- Use Font Awesome or Heroicons via CDN
- Coral-red color for feature icons
- Size: 48px-64px for feature highlights, 24px for UI elements

**Navigation**:
- Sticky header with white background
- Company logo on left, navigation links center/right
- Coral-red text color for active page
- Mobile: Hamburger menu with slide-in panel

## Images
**Required Images**:
1. **Home Hero**: High-quality image of luxury car with 3M wrap/PPF application or architectural glass with film - full-width, 1920x1080px minimum
2. **Product Categories**: 6 professional product images showing wraps, PPF, bike styling in action - 800x600px each
3. **About Us Hero**: Company facility or team photo - full-width
4. **Product Tiles**: Individual product shots on clean backgrounds - 400x400px minimum, 18+ images total

**Image Treatment**: Professional, high-resolution, minimal editing, show products in real-world applications

## Accessibility
- Minimum contrast ratio 4.5:1 for all text
- Focus indicators in coral-red outline
- Form labels clearly associated with inputs
- Responsive touch targets (minimum 44px)

## Animations
Use sparingly:
- Subtle fade-in on scroll for stats/features
- Smooth hover transitions (0.3s ease)
- No complex animations - keep premium and fast

This design creates a bold, professional B2B presence that communicates Just Signs India's premium market position while maintaining excellent usability across all devices.
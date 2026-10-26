# Frontend Third-Party Assets, Template Artwork & Attribution

This frontend utilizes open-source typography, icons, original CSS/SVG layouts, and SoraKaze Air template artwork assets used exclusively for educational and academic demonstration purposes.

> [!NOTE]
> **Academic Project Notice**: The images `plane.png`, `map.png`, and `baggage.png` in `frontend/assets/` represent template artwork assets used specifically for this university academic DBMS project. They are strictly for this academic demonstration only and **not for commercial redistribution**. Truly transparent RGBA assets (`plane-clean.png`/`.webp`, `map-clean.png`/`.webp`, `baggage-clean.png`/`.webp`) and the SoraKaze Air brand lockups (`logo-clean.png`, `logo.webp`, `logo-mark.png`, `logo-white.png`) have been created and optimized for web delivery.

## Asset Inventory & Image Optimization

All photographic and raster illustration assets are served using modern HTML `<picture>` elements featuring high-compression **WebP** formats with automatic **PNG** fallbacks, explicit `width` and `height` attributes to prevent Layout Shifts (CLS 0), and `loading="lazy"` attributes on below-the-fold content:

| Asset Name | Fallback Path | WebP Path | Dimensions | Usage & Loading Strategy | License / Notice |
|---|---|---|---|---|---|
| **Commercial Airliner (Clean Transparency)** | `assets/plane-clean.png` | `assets/plane-clean.webp` | 1241 × 481 | Landing Hero (`fetchpriority="high"`) and Popular Routes section backdrop (`loading="lazy"`) with trailing speed lines. True RGBA transparent background without boxes. | Academic Project Use Only |
| **Dotted Earth Globe (Clean Transparency)** | `assets/map-clean.png` | `assets/map-clean.webp` | 849 × 816 | Popular Domestic & Metro Routes background with GPU-accelerated 140s continuous linear rotation (`loading="lazy"`). | Academic Project Use Only |
| **Baggage & Luggage (Clean Transparency)** | `assets/baggage-clean.png` | `assets/baggage-clean.webp` | 333 × 315 | Manage Booking / Check-in (`manage.html`) and E-Ticket Confirmation (`confirmation.html`) baggage allowance panel (`loading="lazy"`). | Academic Project Use Only |
| **SoraKaze Air Full Lockup** | `assets/logo-clean.png` | `assets/logo.webp` | 2076 × 692 | Primary brand identity header, footer badge, auth pages, and ticket headers. | SoraKaze Air Brand Identity |
| **SoraKaze Air Logo Mark (Swoosh)** | `assets/logo-mark.png` | `assets/logo-mark.webp` | 937 × 692 | Compact brand badge, ticket stubs, staff navbar, and favicon sources (32, 180, 512). | SoraKaze Air Brand Identity |

## Open-Source Libraries & Design Tokens

| Asset / Library | Source / Creator | License | Purpose |
|-----------------|------------------|---------|---------|
| **Google Fonts (Plus Jakarta Sans)** | Tokyo Type Directors Club / Google Fonts | SIL Open Font License 1.1 | Modern typography across all customer & staff pages |
| **Lucide Icons** | Lucide Project (lucide.dev) via unpkg CDN | ISC / MIT License | Consistent, accessible interface iconography |
| **Animated Ticket Card Architecture** | Adapted from Uiverse.io by Cobp | MIT / Open community | Adapted for My Bookings ticket cards using SoraKaze blue token palette, responsive fluid width, and IntersectionObserver |
| **Original Seat Map Vector Graphics** | Custom designed SVG & CSS Grid | Open / Project Original | Interactive A-F physical cabin layout with row-locking and aisle spacing |
| **Original Airline Identity (SoraKaze Air)** | Custom branding and styling | Project Original | Brand identity, logos, color tokens, and elevation design system |

All CSS token stylesheets, animations, reactive JavaScript controllers, and HTML semantic templates are modularly designed and integrated with the PostgreSQL + FastAPI backend service.

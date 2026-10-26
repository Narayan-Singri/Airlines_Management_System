# Frontend Third-Party Assets, Template Artwork & Attribution

This frontend utilizes open-source typography, icons, original CSS/SVG layouts, and FlyNow template artwork assets used exclusively for educational and academic demonstration purposes.

> [!NOTE]
> **Academic Project Notice**: The images `plane.png`, `map.png`, and `baggage.png` (and their optimized `.webp` companion files) in `frontend/assets/` represent FlyNow template artwork assets used specifically for this university academic DBMS project. They are strictly for this academic demonstration only and **not for commercial redistribution**.

## Asset Inventory & Image Optimization

All photographic and raster illustration assets are served using modern HTML `<picture>` elements featuring high-compression **WebP** formats with automatic **PNG** fallbacks, explicit `width` and `height` attributes to prevent Layout Shifts (CLS 0), and `loading="lazy"` attributes on below-the-fold content:

| Asset Name | Fallback Path | WebP Path | Dimensions | Usage & Loading Strategy | License / Notice |
|---|---|---|---|---|---|
| **Commercial Airliner** | `assets/plane.png` | `assets/plane.webp` | 1267 × 481 | Landing Hero (`fetchpriority="high"`) and Popular Routes section backdrop (`loading="lazy"`) with trailing speed lines. | FlyNow Template Artwork (Academic Project Use Only) |
| **Dotted Earth Globe** | `assets/map.png` | `assets/map.webp` | 849 × 828 | Popular Domestic & Metro Routes background with GPU-accelerated 140s continuous linear rotation (`loading="lazy"`). | FlyNow Template Artwork (Academic Project Use Only) |
| **Baggage & Luggage** | `assets/baggage.png` | `assets/baggage.webp` | 333 × 315 | Manage Booking / Check-in (`manage.html`) and E-Ticket Confirmation (`confirmation.html`) baggage allowance panel (`loading="lazy"`). | FlyNow Template Artwork (Academic Project Use Only) |

## Open-Source Libraries & Design Tokens

| Asset / Library | Source / Creator | License | Purpose |
|-----------------|------------------|---------|---------|
| **Google Fonts (Plus Jakarta Sans)** | Tokyo Type Directors Club / Google Fonts | SIL Open Font License 1.1 | Modern typography across all customer & staff pages |
| **Lucide Icons** | Lucide Project (lucide.dev) via unpkg CDN | ISC / MIT License | Consistent, accessible interface iconography |
| **Animated Ticket Card Architecture** | Adapted from Uiverse.io by Cobp | MIT / Open community | Adapted for My Bookings ticket cards using FlyNow blue token palette, responsive fluid width, and IntersectionObserver |
| **Original Seat Map Vector Graphics** | Custom designed SVG & CSS Grid | Open / Project Original | Interactive A-F physical cabin layout with row-locking and aisle spacing |
| **Original Airline Identity (FlyNow)** | Custom branding and styling | Project Original | Brand identity, logos, color tokens, and elevation design system |

All CSS token stylesheets, animations, reactive JavaScript controllers, and HTML semantic templates are modularly designed and integrated with the PostgreSQL + FastAPI backend service.

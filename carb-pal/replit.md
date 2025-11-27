# CarbPal - Carbohydrate Calculator

## Overview

CarbPal is a web-based carbohydrate tracking and calculation application designed for diabetes management. It helps users calculate carbohydrates from food weight, perform reverse calculations (finding weight for target carbs), analyze nutrition labels, and build recipes. The application features a comprehensive food database through external API integrations, meal logging capabilities, and daily tracking dashboards. It aims to provide a freemium model where a free tier offers USDA database access, and a premium tier provides access to branded/restaurant foods and barcode scanning. The project's ambition is to become a leading tool for precise carbohydrate tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React with TypeScript
- Vite for fast builds and HMR
- Wouter for lightweight client-side routing

**UI Component System**
- Shadcn/ui built on Radix UI for accessible components
- Tailwind CSS for styling
- Material Design 3 principles
- Custom theme system with light/dark modes
- Inter font for text, JetBrains Mono for numeric displays

**State Management**
- TanStack Query (React Query) for server state and caching
- React hooks for local UI state
- LocalStorage for offline-first data persistence (meal logs, custom foods, user preferences)

**Key Design Decisions**
- Mobile-first responsive design with improved autoscroll (500ms delay, center alignment)
- Progressive Web App capabilities
- Accessibility-first approach
- Branded food display differentiates between per-100g and per-serving carb information
- Consistent green banner headers and branding across all pages
- Streamlined calculator tabs: text-only labels (no icons) for better mobile spacing
- Calculator "Menus" tab (formerly "Restaurants") uses autocomplete dropdown search (search as you type)
- Unified "My Foods" page combines Recipes and Custom Foods with two action buttons
- Recipe Builder auto-scroll: scrolls to recipe name on open and to weight input when ingredient added
- Conditional weight input: hidden for FatSecret branded items (fixed serving), shown for USDA whole foods
- Increased base font size for desktop readability

### Backend Architecture

**Server Framework**
- Express.js for HTTP server and API routing
- ESM for modern JavaScript modules
- TypeScript for type safety

**Data Storage Strategy**
- Primary: In-memory storage with localStorage sync on frontend
- Database Support: Drizzle ORM configured for PostgreSQL (via Neon driver), offering a migration path.

**API Architecture**
- RESTful API design (`/api` prefix)
- JSON format for requests/responses
- Error handling and request logging middleware

**Key Architectural Patterns**
- Storage abstraction layer for flexible data storage.
- Shared Zod schemas for client/server type validation.
- Hybrid data strategy: LocalStorage for offline UX, API for sync and backup.

### Technical Implementations
- **Menus Search with Autocomplete & Smart Grouping**: Renamed "Restaurants" tab to "Menus" with autocomplete dropdown search. Uses FatSecret OAuth 2.0 API with debounced search (500ms), results appear as you type in Command/Popover dropdown. Features brand/restaurant search, menu browsing with intelligent grouping (collapses size variations like Small/Medium/Large into expandable groups), and running meal total with add/remove/clear functionality. Groups are alphabetically sorted with expand/collapse chevrons and item count badges. Implements premium gate with blurred carb values and locked Crown buttons for free users. Menu data cached in localStorage with 24-hour TTL for offline-first performance.
- **My Foods Page**: Unified page combining Recipes and Custom Foods into single interface. Two action buttons ("New Recipe" and "New Custom Food") at top. Displays both item types in chronological list with visual badges to distinguish recipes from custom foods. All CRUD operations preserved.
- **Recipe Builder Auto-Scroll**: Mobile-optimized auto-scroll functionality. Scrolls to recipe name input (centered) when builder opens, and scrolls to latest ingredient's weight input (centered) when ingredient added. Uses 500ms delay with smooth scrolling to prevent keyboard interference.
- **Freemium Conversion Strategy**: FatSecret results visible to ALL users with crown icons, but carb numbers blurred ("•••") for free users. Premium gates on Quick Calc, Reverse Calc (calculation blocked for FatSecret items), Label Calc (barcode scanner), Recipe Creator (barcode scanner), and Menus Search (add to meal blocked). Cache isolation prevents data leakage between free and premium tiers. All crown icons are clickable and navigate to /pricing for consistent upgrade flow.
- **Simplified Calculator Tabs**: Quick and Reverse calculator tabs now show USDA-only foods (allowFatSecret=false) with search dropdown + input fields visible from start. No conditional UI logic - straightforward weight-based calculations for whole foods. Removed branded food banners and complex conditional rendering.
- **Real-Time History Sync**: Calculator dispatches custom 'carbpal_history_changed' event when adding or clearing history. History page listens for both localStorage 'storage' event and custom event for instant cross-page synchronization.
- **Mobile-Optimized History Page**: Responsive layout with calendar hidden on mobile (<md breakpoint), quick filter buttons (Today, Last 7 Days, Last 30 Days, All Time) displayed in 2×2 grid at top. Desktop shows full sidebar with calendar and filters.
- **Pricing-First Signup Flow**: Settings page implements conversion-optimized flow for non-logged-in users: primary "View Pricing & Subscribe" CTA with premium features description, secondary "Already have an account? Sign in" link. Account creation happens during checkout.
- **Conditional Food Type Handling**: FatSecret branded items (restaurants, packaged foods) show fixed serving carbs without weight input. USDA whole foods allow weight-based calculation with per-100g ratios.
- **Auto-Backup to Google Drive**: Intelligent, throttled auto-backup to Google Drive after data changes, with user toggle in settings.
- **Google Drive Integration**: Client-side OAuth 2.0 integration for backup/restore of user data (custom foods, recipes, history).
- **Forgot Password Flow**: Secure password reset feature with email-based token delivery. Users can request password reset from login dialog, receive reset link via Resend email API, and set new password on dedicated reset page (/reset-password). Tokens are cryptographically secure (32-byte random), expire after 1 hour, and are cleared after successful reset. Email enumeration prevention implemented.
- **Guest Checkout with Auto-Account Creation**: Stripe webhook system automatically creates user accounts for guest checkouts. Handles race conditions between checkout.session.completed and customer.subscription.created webhooks through resilient logic that fetches customer email from Stripe when needed. New users get cryptographically secure random passwords (32-byte) and can reset via forgot password. Existing users are automatically linked to their Stripe customer ID. Premium status updates correctly regardless of webhook arrival order.
- **Update App Button**: Settings page includes "Update App Now" button that forces a hard refresh by clearing service worker caches and reloading the page. Helps users get latest app version when browser caching prevents automatic updates. Vite build system uses content hashing for cache busting (assets/[name]-[hash].js format).

## External Dependencies

**Third-Party APIs**
- **USDA FoodData Central API**: Primary food database for nutritional information and comprehensive food search.
- **FatSecret Platform API**: Secondary food database providing branded/restaurant food data, using OAuth 2.0 client credentials flow. **IMPORTANT**: Requires IP whitelisting - add Replit server IP (34.23.244.214) to FatSecret Platform account for API access.
- **Google Drive API**: For client-side data backup and restore, utilizing OAuth 2.0.
- **Resend**: For sending password reset emails and admin email notifications for user suggestions.

**Database**
- **Neon Serverless PostgreSQL**: Configured with Drizzle ORM, though not actively used in the current in-memory implementation.

**UI Component Libraries**
- Radix UI: Headless components for accessibility.
- Embla Carousel: Touch-enabled carousel.
- CMDK: Command palette/search.
- React Hook Form with Zod resolvers: For form validation.
- date-fns: For date manipulation.
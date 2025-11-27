# Carb Tracker App - Design Guidelines

## Design Approach
**Selected Approach:** Design System-Based with Health App Patterns
- **Primary System:** Material Design 3 principles for clean data visualization and intuitive interactions
- **Reference Inspiration:** MyFitnessPal and Cronometer for health tracking patterns
- **Key Principles:** Clarity, efficiency, trust, and data accessibility

## Color Palette

### Light Mode
- **Primary:** 79 65% 48% (Energetic teal-blue for health/wellness)
- **Primary Hover:** 79 65% 42%
- **Background:** 0 0% 100%
- **Surface:** 0 0% 98%
- **Surface Elevated:** 0 0% 100%
- **Border:** 0 0% 90%
- **Text Primary:** 0 0% 15%
- **Text Secondary:** 0 0% 45%
- **Success:** 142 71% 45% (for logged meals/achievements)
- **Warning:** 38 92% 50% (for high carb warnings)

### Dark Mode
- **Primary:** 79 65% 58%
- **Primary Hover:** 79 65% 65%
- **Background:** 0 0% 8%
- **Surface:** 0 0% 12%
- **Surface Elevated:** 0 0% 16%
- **Border:** 0 0% 24%
- **Text Primary:** 0 0% 95%
- **Text Secondary:** 0 0% 65%
- **Success:** 142 71% 55%
- **Warning:** 38 92% 60%

## Typography

### Font Families
- **Primary:** 'Inter' (clean, modern, excellent readability for data)
- **Numeric Display:** 'JetBrains Mono' (for carb ratios and calculations)

### Font Scales
- **Hero/Display:** text-4xl to text-5xl, font-bold
- **Page Titles:** text-3xl, font-semibold
- **Section Headers:** text-xl to text-2xl, font-semibold
- **Body Text:** text-base, font-normal
- **Data Labels:** text-sm, font-medium
- **Numeric Values:** text-lg to text-2xl, font-mono, font-semibold
- **Helper Text:** text-sm, text-muted-foreground

## Layout System

### Spacing Primitives
**Core Units:** 2, 4, 8, 12, 16 (Tailwind units: p-2, p-4, p-8, p-12, p-16)
- Component padding: p-4 to p-6
- Section spacing: py-12 to py-16
- Card gaps: gap-4 to gap-6
- List item padding: p-4
- Form field spacing: space-y-4

### Container Widths
- **Mobile:** Full width with px-4 padding
- **Tablet/Desktop:** max-w-6xl mx-auto
- **Data Tables:** max-w-7xl
- **Forms:** max-w-2xl mx-auto

## Component Library

### Navigation
- **Top Bar:** Fixed header with app logo, search icon, user menu
- **Bottom Navigation (Mobile):** 4 tabs - Search, Log, History, Profile
- **Desktop Sidebar:** Persistent navigation with icons and labels

### Food Database & Search
- **Search Bar:** Prominent sticky search with instant filtering, category pills below
- **Food Cards:** Compact list items with:
  - Food name (text-base, font-medium)
  - Category badge (text-xs, rounded-full, bg-muted)
  - Carb ratio (text-lg, font-mono, text-primary)
  - Tap to select or view details
- **Category Filters:** Horizontal scrolling pills (Fruits, Vegetables, Nuts/Seeds, Grains/Snacks, Other)

### Meal Logging
- **Add Meal Form:**
  - Food selection (autocomplete search)
  - Weight input (large numeric keypad-friendly input)
  - Live carb calculation display (prominent, color-coded)
  - Time/meal type selector (Breakfast, Lunch, Dinner, Snack)
- **Quick Log Button:** Floating action button (FAB) bottom-right on mobile

### Data Display
- **Daily Summary Card:**
  - Large circular progress indicator showing daily carb total
  - Breakdown by meal type (horizontal bar segments)
  - Color-coded ranges (low/target/high)
- **History Timeline:**
  - Chronological meal list with timestamps
  - Swipe-to-delete on mobile
  - Expandable entries for details

### Forms & Inputs
- **Text Inputs:** Rounded borders, focus ring in primary color, clear labels above
- **Number Inputs:** Large touch targets (min-h-12), numeric keyboard trigger
- **Search Input:** Leading magnifying glass icon, trailing clear button when active
- **Select/Autocomplete:** Dropdown with smooth animation, selected state highlighted

### Cards & Surfaces
- **Elevated Cards:** bg-surface, border border-border, rounded-lg, shadow-sm
- **Interactive Cards:** hover:shadow-md transition, cursor-pointer
- **Data Cards:** Dense padding (p-4), clear visual hierarchy

### Buttons
- **Primary CTA:** bg-primary, text-white, rounded-lg, px-6 py-3
- **Secondary:** variant-outline with border-2
- **Icon Buttons:** Circular, p-2, hover:bg-muted
- **FAB (Add Meal):** Circular, shadow-lg, size-14, fixed positioning

### Data Visualization
- **Progress Circles:** SVG-based, animated on load, color transitions at thresholds
- **Bar Charts:** Horizontal bars for meal breakdown, stacked for categories
- **Trend Graphs:** Simple line charts for weekly/monthly trends (if time permits)

### Modals & Overlays
- **Food Detail Modal:** Centered on desktop, full-screen bottom sheet on mobile
- **Confirmation Dialogs:** Compact, clear action buttons
- **Toast Notifications:** Top-right on desktop, top-center on mobile, auto-dismiss

## Key Screens Structure

### 1. Home/Dashboard
- Daily summary card with progress circle
- Recent meals list (last 3-5)
- Quick add meal button
- Daily carb goal indicator

### 2. Food Database/Search
- Sticky search bar at top
- Category filter pills
- Scrolling food list with carb ratios
- Tap food to log or view details

### 3. Meal Log
- Add meal form (food search, weight input, calculation)
- Meal type selector
- Submit button prominent
- Recent foods quick-add section

### 4. History
- Calendar date picker at top
- Chronological meal timeline
- Daily totals summarized
- Week/month view toggle

### 5. Profile/Settings
- User preferences (carb goals, units)
- Custom food additions
- Data export options
- Dark mode toggle

## Images
**No hero images needed** - This is a utility app where function over form is critical. Any imagery should be:
- **Food Icons:** Category icons (fruit, vegetable, grain symbols) - use Heroicons for consistency
- **Empty States:** Simple illustrations for "no meals logged yet" (use subtle, line-art style)
- **Onboarding:** Optional 2-3 simple screens explaining core features

## Responsive Behavior
- **Mobile-First:** Bottom navigation, full-width forms, stack all elements
- **Tablet:** Side-by-side layouts for forms, persistent search
- **Desktop:** Sidebar navigation, multi-column data views, hover interactions

## Animation & Motion
**Minimal and purposeful only:**
- Smooth page transitions (150ms ease)
- Progress circle animations on load (500ms)
- Toast slide-in/fade-out (200ms)
- Modal/sheet slide-up (250ms)
- NO decorative animations

## Accessibility
- High contrast in both modes (WCAG AA minimum)
- Clear focus indicators (2px ring in primary color)
- Touch targets minimum 44px
- Screen reader labels on all interactive elements
- Numeric inputs with appropriate input modes
# Requirements Document

## Introduction

This feature covers two related UI improvements to the Aivory marketing homepage (Next.js + Tailwind CSS): a footer redesign implementing a 5-column grid layout matching the production index.html, and scroll-triggered fade-in animations applied to all homepage sections using the existing `useScrollAnimation` hook and `animate-on-scroll` CSS classes.

## Glossary

- **Footer**: The bottom navigation component of the homepage containing link columns, contact info, logo, and copyright
- **Homepage_Section**: Any of the main content sections on the homepage (HeroSection, AIReadySection, FeatureCards, StatsSection, PricingStepOne, PricingStepTwo, PrivacySection, PreFooterCTA, Footer)
- **Scroll_Animation_System**: The combination of `useScrollAnimation` hook, IntersectionObserver API, and `.animate-on-scroll` / `.is-visible` CSS classes
- **IntersectionObserver**: Browser API used to detect when elements enter the viewport
- **Reduced_Motion**: The `prefers-reduced-motion: reduce` media query indicating the user prefers no animations

## Requirements

### Requirement 1: Footer 5-Column Grid Layout

**User Story:** As a visitor, I want to see a well-organized footer with clear navigation categories, so that I can easily find links to different parts of the site.

#### Acceptance Criteria

1. THE Footer SHALL render a responsive grid with 5 columns on desktop (md+ breakpoint) and 2 columns on mobile
2. THE Footer SHALL display columns in the order: Product, Company, Legal, Get in touch, Logo
3. THE Footer Product column SHALL contain exactly 6 navigation links
4. THE Footer Company column SHALL contain exactly 4 navigation links
5. THE Footer Legal column SHALL contain exactly 3 navigation links
6. THE Footer Get in touch column SHALL contain a mailto link to hello@aivory.uk
7. THE Footer Logo column SHALL display the Aivory logo image with appropriate alt text

### Requirement 2: Footer Styling and Copyright

**User Story:** As a visitor, I want a visually consistent footer that matches the brand design, so that the site feels polished and professional.

#### Acceptance Criteria

1. THE Footer SHALL use a dark background color (#050505)
2. THE Footer SHALL display column headings in a muted gray color
3. WHEN a user hovers over a footer link, THE Footer SHALL transition the link color to the accent color (#0ae8af)
4. THE Footer SHALL display copyright text "© 2026 Aivory. All rights reserved." below the grid
5. THE Footer SHALL render a horizontal border divider between the grid and the page bottom

### Requirement 3: Scroll Fade-In Animation Integration

**User Story:** As a visitor, I want homepage sections to smoothly fade in as I scroll, so that the page feels dynamic and engaging.

#### Acceptance Criteria

1. WHEN a homepage section enters the viewport at 15% visibility, THE Scroll_Animation_System SHALL add the `is-visible` class to trigger the fade-in animation
2. THE Scroll_Animation_System SHALL apply the `animate-on-scroll` class to all homepage sections (excluding Navbar)
3. WHILE a section has the `animate-on-scroll` class without `is-visible`, THE Homepage_Section SHALL remain at opacity 0 with a 40px downward offset
4. WHEN a section receives the `is-visible` class, THE Homepage_Section SHALL transition to opacity 1 and translateY(0) over 700ms with ease-out timing

### Requirement 4: Animation One-Time Trigger Behavior

**User Story:** As a visitor, I want sections to stay visible once they appear, so that content does not disappear when I scroll back up.

#### Acceptance Criteria

1. WHEN a section animation has triggered, THE Scroll_Animation_System SHALL unobserve the element and retain the `is-visible` class permanently
2. THE Scroll_Animation_System SHALL use the `once: true` option by default to prevent re-animation on scroll reversal

### Requirement 5: Reduced Motion Accessibility

**User Story:** As a user with motion sensitivity, I want content to appear immediately without animation, so that I can browse without discomfort.

#### Acceptance Criteria

1. WHILE the user has `prefers-reduced-motion: reduce` enabled, THE Scroll_Animation_System SHALL set all sections to immediately visible without any transition
2. WHILE the user has `prefers-reduced-motion: reduce` enabled, THE useScrollAnimation hook SHALL return `isVisible: true` immediately without observing
3. THE globals.css SHALL include a `prefers-reduced-motion: reduce` media query that overrides `.animate-on-scroll` to have opacity 1, no transform, and no transition

### Requirement 6: Client Component Directive

**User Story:** As a developer, I want each animated section to be a client component, so that React hooks function correctly within the Next.js app router.

#### Acceptance Criteria

1. WHEN a section component uses the useScrollAnimation hook, THE component file SHALL include the `'use client'` directive at the top
2. IF a section component lacks the `'use client'` directive while using useScrollAnimation, THEN THE Next.js build process SHALL report an error preventing deployment of broken code

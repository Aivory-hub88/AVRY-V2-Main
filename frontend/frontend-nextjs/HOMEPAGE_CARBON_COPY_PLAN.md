# Homepage Carbon Copy Plan

This document tracks parity with the legacy live-frontend-repo/index.html.

## Sections

### Hero Section
- Centered with `flex flex-col items-center w-full` in main container

### Features Section
- Check alignment and spacing

### Pricing Section
- [x] Structure matches legacy
- [x] Card layout with `max-w-7xl mx-auto` for centering
- [x] Black full-width banner moved inside main section (matches legacy)
- [x] Verify button styles

### Subscription Section
- [x] Structure matches legacy
- [x] Tier cards layout with `max-w-7xl mx-auto`
- [x] Feature list styling
- [x] IC explanation section

### Credit Marketplace Section
- [x] Credit packs layout with `max-w-7xl mx-auto`
- [x] Grid arrangements (2 cols mobile, 5 cols desktop for starter; 1 col mobile, 3 cols desktop for scale)
- [x] Add/Get buttons styling

### Privacy Section
- [x] Privacy badges layout with `max-w-7xl mx-auto`
- [x] "Need Expert Guidance?" section with service cards and CTA buttons

### Footer
- [x] 5-column grid layout (3 cols link + 1 spacer + 1 brand on desktop)
- [x] Brand logo right-aligned on desktop (`md:justify-end`)
- [x] Copyright and legal links

## Changes Made

1. **page.tsx**: Added `flex flex-col items-center w-full` to main container for centering
2. **pricing-section.tsx**: Moved black banner inside main container (was outside)
3. **subscription-section.tsx**: Updated IC explanation margin from `mb-12` to `mb-16` for parity

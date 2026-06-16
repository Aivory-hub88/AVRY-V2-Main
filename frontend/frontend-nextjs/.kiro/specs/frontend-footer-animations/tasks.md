# Implementation Plan

## Overview

Implement footer redesign (5-column grid) and scroll fade-in animations for all homepage sections using the existing useScrollAnimation hook and animate-on-scroll CSS classes.

## Tasks

- [ ] 1. Redesign Footer component with 5-column grid layout
  - [ ] 1.1 Replace Footer.tsx content with 5-column responsive grid (grid-cols-2 mobile, md:grid-cols-5 desktop)
  - [ ] 1.2 Define productLinks array with 6 items: Deep Diagnostic, AI Blueprint, AI Roadmap, Workflow Builder, AI Agents, Template Library
  - [ ] 1.3 Define companyLinks array with 4 items: About, Blog, Careers, Contact
  - [ ] 1.4 Define legalLinks array with 3 items: Privacy Policy, Terms of Service, Cookie Policy
  - [ ] 1.5 Add Get in touch column with mailto:hello@aivory.uk link
  - [ ] 1.6 Add Logo column with Next/Image rendering Aivory logo SVG with alt text
  - [ ] 1.7 Style footer with bg-[#050505], gray headings, hover:text-[#0ae8af] on links
  - [ ] 1.8 Add copyright text and horizontal border divider below grid
- [ ] 2. Add scroll fade-in animation to HeroSection
  - [ ] 2.1 Add 'use client' directive to HeroSection.tsx
  - [ ] 2.2 Import useScrollAnimation and apply ref + animate-on-scroll/is-visible classes
- [ ] 3. Add scroll fade-in animation to AIReadySection
  - [ ] 3.1 Add 'use client' directive to AIReadySection.tsx if not present
  - [ ] 3.2 Import useScrollAnimation and apply ref + animate-on-scroll/is-visible classes
- [ ] 4. Add scroll fade-in animation to FeatureCards
  - [ ] 4.1 Add 'use client' directive to FeatureCards.tsx if not present
  - [ ] 4.2 Import useScrollAnimation and apply ref + animate-on-scroll/is-visible classes
- [ ] 5. Add scroll fade-in animation to StatsSection
  - [ ] 5.1 Add 'use client' directive to StatsSection.tsx if not present
  - [ ] 5.2 Import useScrollAnimation and apply ref + animate-on-scroll/is-visible classes
- [ ] 6. Add scroll fade-in animation to PricingStepOne
  - [ ] 6.1 Add 'use client' directive to PricingStepOne.tsx if not present
  - [ ] 6.2 Import useScrollAnimation and apply ref + animate-on-scroll/is-visible classes
- [ ] 7. Add scroll fade-in animation to PricingStepTwo
  - [ ] 7.1 Add 'use client' directive to PricingStepTwo.tsx if not present
  - [ ] 7.2 Import useScrollAnimation and apply ref + animate-on-scroll/is-visible classes
- [ ] 8. Add scroll fade-in animation to PrivacySection
  - [ ] 8.1 Add 'use client' directive to PrivacySection.tsx if not present
  - [ ] 8.2 Import useScrollAnimation and apply ref + animate-on-scroll/is-visible classes
- [ ] 9. Add scroll fade-in animation to PreFooterCTA
  - [ ] 9.1 Add 'use client' directive to PreFooterCTA.tsx if not present
  - [ ] 9.2 Import useScrollAnimation and apply ref + animate-on-scroll/is-visible classes
- [ ] 10. Add scroll fade-in animation to Footer
  - [ ] 10.1 Add 'use client' directive to Footer.tsx
  - [ ] 10.2 Import useScrollAnimation and apply ref + animate-on-scroll/is-visible classes to footer wrapper
- [ ] 11. Verify reduced motion accessibility
  - [ ] 11.1 Confirm globals.css has @media (prefers-reduced-motion: reduce) rule for .animate-on-scroll
  - [ ] 11.2 Confirm useScrollAnimation hook sets isVisible=true immediately when reduced motion is active
- [ ] 12. Ensure Aivory logo SVG exists in public directory
  - [ ] 12.1 Verify or copy Aivory logo SVG to public/ at the path referenced by Footer component

## Task Dependency Graph

```json
{
  "waves": [
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12],
    [11]
  ]
}
```

## Notes

- Tasks 2–10 follow the same pattern: add 'use client', import hook, wrap in animate-on-scroll div. They are independent and can be done in parallel.
- Task 1 is independent of tasks 2–10 and can be done at any time.
- Task 12 should be done before or alongside Task 1 since the Footer references the logo.
- Task 11 is a verification step that should be done last to confirm everything works together.

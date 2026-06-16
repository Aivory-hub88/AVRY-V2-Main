// @ts-nocheck
/**
 * Homepage Responsive Layout Test (Task 13.4)
 *
 * Property 6: Responsive single-column collapse.
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7**
 *
 * The legacy homepage collapses every multi-column grid to the legacy-specified
 * column count at <=768px (Tailwind's `md` breakpoint is `min-width:768px`, so the
 * unprefixed utility is the <=768px "mobile" rule and the `md:` utility is the
 * desktop rule). This CI-safe DOM test renders the real `page.tsx` (`Home`) and
 * asserts each region carries the responsive utility classes that produce the
 * legacy column counts:
 *
 *   | Region (Req)              | Element                  | Mobile (<=768px) | Desktop (md:)    |
 *   | ------------------------- | ------------------------ | ---------------- | ---------------- |
 *   | Features (6.1)            | card grid                | grid-cols-1      | md:grid-cols-3   |
 *   | Pricing (6.2)             | tier grid                | grid-cols-1      | md:grid-cols-3   |
 *   | Pricing (6.2)             | Full Stack banner        | flex-col         | md:flex-row      |
 *   | Subscription (6.3)        | tier grid                | grid-cols-1      | md:grid-cols-3   |
 *   | Privacy (6.4)             | pillar grid              | grid-cols-1      | md:grid-cols-3   |
 *   | Privacy (6.4)             | badges container         | flex-wrap        | (wraps)          |
 *   | Credit marketplace (6.5)  | starter grid             | grid-cols-2      | md:grid-cols-5   |
 *   | Credit marketplace (6.5)  | scale grid               | grid-cols-1      | md:grid-cols-3   |
 *   | Footer (6.6)              | link/logo grid           | grid-cols-2      | md:grid-cols-5   |
 *   | Navbar (6.7)              | nav container            | flex-col + center| md:flex-row ...  |
 *   | Navbar (6.7)              | Dashboard control        | text-[13px]/px-16| md:text-[15px]/28|
 *
 * Both Pricing and Subscription expose a `grid-cols-1 md:grid-cols-3` grid, and
 * Credit-marketplace + Footer both expose a `*-cols-2 md:*-cols-5` grid, so every
 * lookup is scoped to its region by the region's stable id / landmark to avoid
 * cross-region matches. The two credit-marketplace grids (starter vs scale) are
 * disambiguated via a known pack-credits label's closest `div.grid` (50 IC for
 * starter, 10,000 IC for scale).
 *
 * Mocking matches the sibling page-level tests (page.section-order /
 * page.background-rhythm): `next/navigation`, `@/lib/payment`, `@/lib/auth`, and
 * `next/image` (used by `BrandLogo`) are mocked so the composed client + server
 * section tree renders in isolation. `@/lib/pricing` is intentionally NOT mocked
 * (the credit labels come from the real catalog). `next/link` is mocked in the
 * shared test setup.
 *
 * CI-safe: DOM (jsdom + Testing Library, no browser).
 */

import React from 'react';
import { render, within } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import fc from 'fast-check';

// ---------------------------------------------------------------------------
// Mocks (hoisted so the factories can reference the spies safely)
// ---------------------------------------------------------------------------

const { pushMock, isAuthenticatedMock, logoutMock, openPaymentModalMock } =
  vi.hoisted(() => ({
    pushMock: vi.fn(),
    isAuthenticatedMock: vi.fn<[], boolean>(() => false),
    logoutMock: vi.fn(),
    openPaymentModalMock: vi.fn(() => Promise.resolve()),
  }));

// next/navigation — navbar + pricing read useRouter().push.
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

// @/lib/auth — navbar auth state (signed-out so Sign In + Dashboard render).
vi.mock('@/lib/auth', () => ({
  isAuthenticated: isAuthenticatedMock,
  logout: logoutMock,
}));

// @/lib/payment — pricing/subscription/credit sections + the Midtrans loader.
vi.mock('@/lib/payment', () => ({
  openPaymentModal: (...args: unknown[]) => openPaymentModalMock(...args),
  loadMidtransSnap: vi.fn(() => Promise.resolve()),
  PAYMENT_CONFIG: { products: { BLUEPRINT: 'ai_blueprint' } },
}));

// next/image — BrandLogo (navbar + footer) renders the SVG via next/image.
// Render a plain <img> and drop non-DOM props to avoid React warnings.
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    className,
  }: {
    src: string;
    alt: string;
    className?: string;
  }) => React.createElement('img', { src, alt, className }),
}));

import Home from './page';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Locate a region by selector; fail loudly (not silently null) if missing. */
function region(container: HTMLElement, selector: string): HTMLElement {
  const el = container.querySelector(selector);
  expect(el, `region "${selector}" must be present in the DOM`).not.toBeNull();
  return el as HTMLElement;
}

/**
 * Find the first descendant of `root` whose classList contains *all* of the
 * given class tokens. Used for elements that cannot be addressed by a simple
 * `querySelector` (e.g. responsive utilities containing a `:` such as
 * `md:flex-row`, which are awkward to escape in a selector but trivially
 * matched via `classList.contains`).
 */
function findByClassTokens(
  root: HTMLElement,
  tokens: readonly string[],
): HTMLElement | null {
  const match = Array.from(root.querySelectorAll<HTMLElement>('*')).find((el) =>
    tokens.every((t) => el.classList.contains(t)),
  );
  return match ?? null;
}

/**
 * The responsive specification: for each region element, the responsive utility
 * classes that must be present to produce the legacy <=768px column behavior.
 * `locate` is scoped to the region so cross-region grids never collide.
 */
interface ResponsiveSpec {
  name: string;
  requirement: string;
  locate: (container: HTMLElement) => HTMLElement | null;
  classes: readonly string[];
}

const RESPONSIVE_SPECS: readonly ResponsiveSpec[] = [
  {
    name: 'Features card grid',
    requirement: '6.1',
    locate: (c) => region(c, '#features').querySelector<HTMLElement>('div.grid'),
    classes: ['grid-cols-1', 'md:grid-cols-3'],
  },
  {
    name: 'Pricing tier grid',
    requirement: '6.2',
    locate: (c) =>
      region(c, '#pricing-section').querySelector<HTMLElement>('div.grid'),
    classes: ['grid-cols-1', 'md:grid-cols-3'],
  },
  {
    name: 'Pricing Full Stack banner',
    requirement: '6.2',
    locate: (c) =>
      findByClassTokens(region(c, '#pricing-section'), [
        'flex-col',
        'md:flex-row',
      ]),
    classes: ['flex-col', 'md:flex-row'],
  },
  {
    name: 'Subscription tier grid',
    requirement: '6.3',
    locate: (c) =>
      region(c, '#subscription-section').querySelector<HTMLElement>('div.grid'),
    classes: ['grid-cols-1', 'md:grid-cols-3'],
  },
  {
    name: 'Privacy pillar grid',
    requirement: '6.4',
    locate: (c) =>
      region(c, '#privacy-section').querySelector<HTMLElement>('div.grid'),
    classes: ['grid-cols-1', 'md:grid-cols-3'],
  },
  {
    name: 'Privacy badges container',
    requirement: '6.4',
    locate: (c) => findByClassTokens(region(c, '#privacy-section'), ['flex-wrap']),
    classes: ['flex-wrap'],
  },
  {
    name: 'Credit marketplace starter grid',
    requirement: '6.5',
    locate: (c) =>
      within(region(c, '#credit-marketplace-section'))
        .getByText('50 IC')
        .closest('div.grid') as HTMLElement | null,
    classes: ['grid-cols-2', 'md:grid-cols-5'],
  },
  {
    name: 'Credit marketplace scale grid',
    requirement: '6.5',
    locate: (c) =>
      within(region(c, '#credit-marketplace-section'))
        .getByText('10,000 IC')
        .closest('div.grid') as HTMLElement | null,
    classes: ['grid-cols-1', 'md:grid-cols-3'],
  },
  {
    name: 'Footer link/logo grid',
    requirement: '6.6',
    locate: (c) => region(c, 'footer').querySelector<HTMLElement>('div.grid'),
    classes: ['grid-cols-2', 'md:grid-cols-5'],
  },
  {
    name: 'Navbar container',
    requirement: '6.7',
    locate: (c) =>
      findByClassTokens(region(c, 'nav'), [
        'flex-col',
        'items-center',
        'justify-center',
        'md:flex-row',
        'md:justify-between',
      ]),
    classes: [
      'flex-col',
      'items-center',
      'justify-center',
      'md:flex-row',
      'md:justify-between',
    ],
  },
  {
    name: 'Navbar Dashboard control',
    requirement: '6.7',
    locate: (c) =>
      within(region(c, 'nav')).getByRole('button', {
        name: /dashboard/i,
      }),
    classes: ['text-[13px]', 'px-[16px]', 'md:text-[15px]', 'md:px-[28px]'],
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  isAuthenticatedMock.mockReturnValue(false);
});

describe('Property 6: Responsive single-column collapse', () => {
  // -------------------------------------------------------------------------
  // Universal property: every specified region carries its responsive classes.
  // fast-check samples across the full spec table so the invariant must hold
  // for ALL regions, not just a hand-picked few.
  // -------------------------------------------------------------------------
  it('holds for every responsive region spec (Req 6.1-6.7)', () => {
    const { container } = render(<Home />);

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: RESPONSIVE_SPECS.length - 1 }),
        (i) => {
          const spec = RESPONSIVE_SPECS[i];
          const el = spec.locate(container);
          expect(
            el,
            `${spec.name} (Req ${spec.requirement}) must be locatable`,
          ).not.toBeNull();
          for (const cls of spec.classes) {
            expect(
              (el as HTMLElement).classList.contains(cls),
              `${spec.name} (Req ${spec.requirement}) must carry "${cls}"`,
            ).toBe(true);
          }
        },
      ),
    );
  });

  // -------------------------------------------------------------------------
  // Per-region example assertions (clearer failure messages than the property)
  // -------------------------------------------------------------------------
  it.each(RESPONSIVE_SPECS)(
    '$name carries [$classes] [Req $requirement]',
    ({ locate, classes }) => {
      const { container } = render(<Home />);
      const el = locate(container);
      expect(el).not.toBeNull();
      expect(el as HTMLElement).toHaveClass(...classes);
    },
  );

  // -------------------------------------------------------------------------
  // Focused checks for the non-grid responsive rules called out in the spec.
  // -------------------------------------------------------------------------
  describe('Pricing Full Stack banner stacks at <=768px (Req 6.2)', () => {
    it('renders the banner flex-col on mobile and md:flex-row on desktop', () => {
      const { container } = render(<Home />);
      const banner = findByClassTokens(region(container, '#pricing-section'), [
        'flex-col',
        'md:flex-row',
      ]);
      expect(banner).not.toBeNull();
      // The banner is the one carrying the legacy black top border + the
      // "Save 13%" copy, distinguishing it from the tier-card columns.
      expect(
        within(banner as HTMLElement).getByText(
          /Save 13%/i,
        ),
      ).toBeInTheDocument();
    });
  });

  describe('Privacy trust badges wrap at <=768px (Req 6.4)', () => {
    it('renders the badges container with flex-wrap', () => {
      const { container } = render(<Home />);
      const badges = findByClassTokens(region(container, '#privacy-section'), [
        'flex-wrap',
      ]);
      expect(badges).not.toBeNull();
      expect(badges as HTMLElement).toHaveClass('flex-wrap');
    });
  });

  describe('Credit marketplace starter vs scale collapse (Req 6.5)', () => {
    it('renders starter packs at grid-cols-2 and scale packs at grid-cols-1 on mobile', () => {
      const { container } = render(<Home />);
      const credit = region(container, '#credit-marketplace-section');

      const starterGrid = within(credit)
        .getByText('50 IC')
        .closest('div.grid');
      const scaleGrid = within(credit)
        .getByText('10,000 IC')
        .closest('div.grid');

      expect(starterGrid).not.toBeNull();
      expect(scaleGrid).not.toBeNull();
      // Distinct grids (starter is not scale).
      expect(starterGrid).not.toBe(scaleGrid);

      expect(starterGrid as HTMLElement).toHaveClass('grid-cols-2', 'md:grid-cols-5');
      expect(scaleGrid as HTMLElement).toHaveClass('grid-cols-1', 'md:grid-cols-3');
    });
  });

  describe('Navbar mobile rules (Req 6.7)', () => {
    it('centers the nav container at <=768px and restores the spread row at md:', () => {
      const { container } = render(<Home />);
      const navContainer = findByClassTokens(region(container, 'nav'), [
        'flex-col',
        'items-center',
        'justify-center',
        'md:flex-row',
        'md:justify-between',
      ]);
      expect(navContainer).not.toBeNull();
      expect(navContainer as HTMLElement).toHaveClass(
        'flex-col',
        'items-center',
        'justify-center',
        'md:flex-row',
        'md:justify-between',
      );
    });

    it('shrinks the Dashboard control to 13px / 0 16px on mobile and restores 15px / 0 28px at md:', () => {
      const { container } = render(<Home />);
      const dashboard = within(region(container, 'nav')).getByRole('button', {
        name: /dashboard/i,
      });
      expect(dashboard).toHaveClass(
        'text-[13px]',
        'px-[16px]',
        'md:text-[15px]',
        'md:px-[28px]',
      );
    });
  });
});

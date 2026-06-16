// @ts-nocheck
/**
 * Hero Reduced-Motion Tests
 *
 * Property 8: Reduced motion respected
 * Validates: Requirements 8.1, 8.2, 8.4
 *
 * The live legacy hero baseline is static text + a decorative muted looping
 * video. There is NO <canvas> and NO typewriter / requestAnimationFrame
 * JS-driven hero animation. Requirement 8 is therefore VACUOUSLY satisfied:
 * with `prefers-reduced-motion: reduce` reported as matching, there is no
 * animation loop to start (8.4), the final title text renders immediately with
 * no typing/reveal effect (8.2), and the hero presents static text plus the
 * decorative muted looping video only (8.1).
 *
 * These tests mock `window.matchMedia` to report reduced motion and assert the
 * hero honors the preference by construction.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { Hero } from './hero';

/**
 * Install a `window.matchMedia` mock that reports `prefers-reduced-motion: reduce`
 * as matching. jsdom does not implement matchMedia, so any code that queried it
 * would throw; this both provides the API and forces the reduced-motion branch.
 */
function mockReducedMotion(matches: boolean) {
  const matchMediaMock = vi.fn((query: string) => ({
    matches: query.includes('prefers-reduced-motion: reduce') ? matches : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(), // deprecated, kept for completeness
    removeListener: vi.fn(), // deprecated, kept for completeness
    dispatchEvent: vi.fn(),
  }));

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: matchMediaMock,
  });

  return matchMediaMock;
}

describe('Hero — reduced motion respected (Property 8)', () => {
  let rafSpy: ReturnType<typeof vi.spyOn>;
  let matchMediaMock: ReturnType<typeof mockReducedMotion>;

  beforeEach(() => {
    // Reduced motion is active for the duration of these tests.
    matchMediaMock = mockReducedMotion(true);
    // Track any animation loop attempts; the hero must not start one.
    rafSpy = vi.spyOn(window, 'requestAnimationFrame');
  });

  afterEach(() => {
    rafSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('renders the final H1 title text immediately (no typing/reveal animation)', () => {
    render(<Hero />);

    // The H1 splits the accent period into a <span>, so assert on the full
    // element text content to confirm the COMPLETE final title is present.
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Make AI make sense.');
  });

  it('renders the final H2 subheadline text immediately', () => {
    render(<Hero />);

    expect(screen.getByText(/Start with clarity\./i)).toBeInTheDocument();
    expect(
      screen.getByText(/End with a system that runs\./i)
    ).toBeInTheDocument();
  });

  it('contains no <canvas> element (no JS-driven hero background)', () => {
    const { container } = render(<Hero />);

    expect(container.querySelector('canvas')).toBeNull();
  });

  it('does not start an animation loop under reduced motion', () => {
    render(<Hero />);

    // Vacuously satisfied: the hero has no rAF-driven effect, so none starts.
    expect(rafSpy).not.toHaveBeenCalled();
  });

  it('presents the hero with the decorative muted looping video as the only motion element', () => {
    const { container } = render(<Hero />);

    const heroSection = screen.getByRole('region', { name: /hero section/i });

    // Exactly one motion element: the decorative video. No canvas alongside it.
    const videos = container.querySelectorAll('video');
    expect(videos).toHaveLength(1);
    expect(container.querySelector('canvas')).toBeNull();

    const video = videos[0] as HTMLVideoElement;
    // The video is decorative (muted, looping, autoplay) and hidden from a11y.
    // Note: React applies `muted` as a DOM *property*, not a reflected HTML
    // attribute, so assert on the property here rather than hasAttribute.
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute('loop');
    expect(video).toHaveAttribute('playsinline');
    expect(video).toHaveAttribute('autoplay');
    expect(video).toHaveAttribute('aria-hidden', 'true');

    // The video lives inside the hero region.
    expect(heroSection).toContainElement(video);
  });
});

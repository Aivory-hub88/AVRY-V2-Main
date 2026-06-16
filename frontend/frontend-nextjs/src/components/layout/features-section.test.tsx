/**
 * FeaturesSection Component Tests
 *
 * DOM assertions verifying card elements, headings, and descriptions
 * for the new GSAP visual layout.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { FeaturesSection } from './features-section';

// Mock GSAP and ScrollTrigger so they don't perform actual scroll bindings in jsdom environment
vi.mock('gsap', () => {
  const gsapMock = {
    registerPlugin: vi.fn(),
    set: vi.fn(),
    to: vi.fn(),
    utils: {
      toArray: vi.fn((selector) => {
        if (typeof document !== 'undefined') {
          return Array.from(document.querySelectorAll(selector || ''));
        }
        return [];
      }),
    },
    matchMedia: vi.fn(() => ({
      add: vi.fn(),
      revert: vi.fn(),
    })),
  };
  return {
    default: gsapMock,
    gsap: gsapMock,
  };
});

vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: {
    registerPlugin: vi.fn(),
    batch: vi.fn(),
  },
}));

// Mock requestAnimationFrame for mock-canvas ticks
beforeEach(() => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    return setTimeout(cb, 16) as any;
  });
});

const EXPECTED_CARDS = [
  {
    title: 'AI Readiness Deep Diagnostic',
    description:
      'Not a generic quiz. A structured multi-phase analysis across your business objective, data readiness, and constraints — so you know exactly where you stand before building anything.',
  },
  {
    title: 'AI System Blueprint',
    description:
      'Aivory turns your diagnostic into a readiness score with KPI targets and a recommended AI architecture built specifically for your business — your score, your gaps, your next move.',
  },
  {
    title: 'AI Roadmap',
    description:
      'Month by month. Milestone by milestone. With KPI targets and sequenced actions so your team knows exactly what to do next — a plan built to be executed, not just presented.',
  },
  {
    title: 'Workflow Builder',
    description:
      'Tell the builder what you want to automate in plain language. It generates the entire flow, connects your tools, and outputs it ready to export or deploy — no coding required.',
  },
  {
    title: 'AI Agent',
    description:
      'Purpose-built agents for email, customer service, sales, and more. Deploy to Telegram, Slack, or wherever your team works — the right agent, everywhere you need it.',
  },
  {
    title: 'Automation Template Library',
    description:
      'Start with proven workflows instead of building from scratch. Choose from a growing library of ready-to-use automations for sales, operations, support, marketing, and more—then customize them to fit your business.',
  },
] as const;

describe('FeaturesSection', () => {
  it('exposes the stable queryable region identifier', () => {
    const { container } = render(<FeaturesSection />);
    const region = container.querySelector('#features');
    expect(region).toBeInTheDocument();
  });

  describe('cards', () => {
    it('renders correct cards and descriptions', () => {
      render(<FeaturesSection />);
      EXPECTED_CARDS.forEach(({ title, description }) => {
        expect(screen.getByText(title)).toBeInTheDocument();
        expect(screen.getByText(description)).toBeInTheDocument();
      });
    });

    it('renders template badge indicator', () => {
      render(<FeaturesSection />);
      expect(screen.getByText('50+')).toBeInTheDocument();
    });
  });
});

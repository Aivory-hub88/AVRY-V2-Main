/**
 * Customer-facing service descriptions + "what's included" feature lists for
 * the checkout order-summary popup. Copy is kept in sync with the /pricing
 * cards (PricingStepOne / PricingStepTwo) so the checkout never contradicts
 * what the customer saw before clicking through.
 */

import { PRODUCT_IDS, TIER_IDS } from '@/lib/pricing';

export interface CheckoutServiceInfo {
  /** One-line explanation of what the service is / who it's for. */
  description: string;
  /** Bullet list of what the purchase includes. */
  features: string[];
}

const CHECKOUT_SERVICE_INFO: Record<string, CheckoutServiceInfo> = {
  [PRODUCT_IDS.DEEP_DIAGNOSTIC]: {
    description:
      'Gain a clear understanding of how your organisation operates before making AI decisions.',
    features: [
      'Operational maturity assessment',
      'Business objective alignment',
      'Operational bottleneck analysis',
      'AI opportunity mapping',
      'Process and data readiness',
    ],
  },
  [PRODUCT_IDS.BLUEPRINT]: {
    description:
      'Transform operational insights into a practical blueprint for business transformation and governed AI deployment.',
    features: [
      'Operational transformation blueprint',
      'Future-state workflow architecture',
      'AI deployment strategy',
      'Integration recommendations',
      'Executive implementation framework',
    ],
  },
  [PRODUCT_IDS.FULL_STACK]: {
    description:
      'Everything required to move from operational assessment to a clear transformation strategy.',
    features: [
      'Business Operations Assessment',
      'Transformation Blueprint',
      'Transformation Roadmap',
      'AI opportunity prioritisation',
      'Executive implementation plan',
    ],
  },
  [PRODUCT_IDS.OPERATIONAL]: {
    description:
      'For organisations beginning their operational transformation journey.',
    features: [
      'Operational Workspace',
      'Business Workflows',
      '1 AI Workforce',
      'Operational Dashboard',
      'Standard Governance',
      'Telegram or Slack',
      'Multilingual',
    ],
  },
  [PRODUCT_IDS.BUSINESS]: {
    description:
      'For growing organisations modernising multiple business functions.',
    features: [
      'Multi-team Workspace',
      'Advanced Business Workflows',
      '3 AI Workforce Units',
      'Executive Dashboard',
      'Department Governance',
      'Multi-channel Deployment',
      'Operational Orchestration',
      'Usage Analytics',
    ],
  },
  [TIER_IDS.ENTERPRISE]: {
    description:
      'For organisation-wide transformation with enterprise governance.',
    features: [
      'Unlimited Operational Workspaces',
      'Unlimited AI Workforce',
      'Unlimited Business Workflows',
      'Enterprise Integrations',
      'Advanced Governance',
      'Audit Logs',
      'SSO',
      'Private Deployment',
      'Dedicated Success Manager',
      'SLA',
    ],
  },
};

/** Resolve service copy for a product id (handles `credits_<n>` packs too). */
export function getServiceInfo(id: string): CheckoutServiceInfo | undefined {
  if (id?.startsWith('credits_')) {
    const credits = parseInt(id.slice('credits_'.length), 10);
    if (!Number.isNaN(credits)) {
      return {
        description: `A one-time top-up of ${credits.toLocaleString(
          'en-US'
        )} Intelligence Credits, applied instantly to your workspace balance.`,
        features: [
          `${credits.toLocaleString('en-US')} Intelligence Credits`,
          'Never expires',
          'Usable across every agent and workflow',
        ],
      };
    }
  }
  return CHECKOUT_SERVICE_INFO[id];
}

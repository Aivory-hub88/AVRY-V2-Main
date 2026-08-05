import React from 'react';
import {
  ONE_TIME_PRODUCTS,
  PRODUCT_IDS,
  SUBSCRIPTION_PRODUCTS,
  type Product,
} from '@/lib/pricing';

/** The sole public origin for canonical URLs, metadata, and structured data. */
export const AIVORY_UK_URL = 'https://aivory.uk' as const;
export type PublicSiteUrl = typeof AIVORY_UK_URL;

/** Build-time origin for sitemap, robots, and every non-request URL. */
export const SITE_URL = AIVORY_UK_URL;

export const SITE_NAME = 'Aivory';
export const DEFAULT_OG_IMAGE = '/hero-video-poster.jpg';

const ORGANIZATION_DESCRIPTION =
  'Aivory (also known as Aivory AI) is an AI-powered business transformation and operational intelligence platform that helps organisations move from operational clarity to governed AI agents and autonomous workflows.';
const ORGANIZATION_DISAMBIGUATION =
  'Business transformation and AI operations platform (United Kingdom / global). Distinct from dental practice software, HRMS platforms, code-compliance tooling, consumer AI apps, or creative studios that share a similar name.';
const WEBSITE_DESCRIPTION =
  'AI-powered business transformation platform — from operational assessment to autonomous AI agents.';
const HOMEPAGE_DESCRIPTION =
  'AI-powered business transformation for operational intelligence, governed AI agents, and workflow automation. Assess operations, design your blueprint, and deploy with confidence.';
const PLATFORM_DESCRIPTION =
  'AI operations platform that guides organisations from business operations assessment to governed AI agent deployment, workflow automation, and operational intelligence.';
const BASTION_DESCRIPTION =
  'AI-powered autonomous infrastructure defence platform combining continuous monitoring, adaptive threat response, zero-trust posture, and operational resilience.';
const FOUNDER_DESCRIPTION =
  'Founder of Aivory. Focused on practical AI adoption through operational clarity, governed systems, and business transformation that starts with how organisations actually work.';

/**
 * Canonical metadata must never depend on the incoming hostname. The legacy
 * domain is redirected before rendering; this fallback protects crawlers that
 * reach the application directly while that redirect is being propagated.
 *
 * Both of these used to inspect the request (proxy/forwarded host, or a
 * next/headers() ReadonlyHeaders) before the domain consolidated to
 * aivory.uk-only. They're pure now, so callers should NOT pass headers() /
 * host values anymore -- doing so only forces the calling route into
 * per-request dynamic rendering (no static generation, no CDN caching) for
 * zero behavioural benefit.
 */
export function resolvePublicSiteUrl(
  _proxyHost?: string | null,
  _forwardedHost?: string | null,
  _host?: string | null,
): PublicSiteUrl {
  return AIVORY_UK_URL;
}

export function siteUrlFromHeaders(): PublicSiteUrl {
  return AIVORY_UK_URL;
}

export function absoluteUrlForSite(siteUrl: string, path = '/'): string {
  const cleanOrigin = siteUrl.replace(/\/$/, '');
  if (path === '/') return `${cleanOrigin}/`;
  return `${cleanOrigin}${path.startsWith('/') ? path : `/${path}`}`;
}

export function absoluteUrl(path = '/'): string {
  return absoluteUrlForSite(SITE_URL, path);
}

export function createFounder(siteUrl: PublicSiteUrl) {
  return {
    '@type': 'Person',
    '@id': `${siteUrl}/#founder`,
    name: 'Irfan Reichmann',
    jobTitle: 'Founder & CEO',
    worksFor: { '@id': `${siteUrl}/#organisation` },
    url: absoluteUrlForSite(siteUrl, '/about'),
    sameAs: ['https://www.linkedin.com/in/irfan-reichmann/'],
    description: FOUNDER_DESCRIPTION,
  };
}

export function createOrganization(siteUrl: PublicSiteUrl) {
  return {
    '@type': 'Organization',
    '@id': `${siteUrl}/#organisation`,
    name: 'Aivory AI',
    alternateName: ['Aivory', 'Aivory Platform', 'Aivory UK'],
    legalName: 'Aivory',
    url: `${siteUrl}/`,
    logo: {
      '@type': 'ImageObject',
      '@id': `${siteUrl}/#logo`,
      url: absoluteUrlForSite(siteUrl, '/icon.svg'),
      contentUrl: absoluteUrlForSite(siteUrl, '/icon.svg'),
      caption: 'Aivory logo',
    },
    image: { '@id': `${siteUrl}/#logo` },
    slogan: 'Make AI Make Sense®',
    description: ORGANIZATION_DESCRIPTION,
    disambiguatingDescription: ORGANIZATION_DISAMBIGUATION,
    foundingDate: '2024',
    founder: { '@id': `${siteUrl}/#founder` },
    employee: [{ '@id': `${siteUrl}/#founder` }],
    areaServed: {
      '@type': 'Place',
      name: 'Worldwide',
    },
    knowsAbout: [
      'AI Business Transformation',
      'Operational Intelligence',
      'Autonomous AI Agents',
      'Business Operations Assessment',
      'AI Readiness Diagnostic',
      'Workflow Automation',
      'Autonomous Infrastructure Defence',
      'Governed AI Systems',
    ],
    sameAs: [
      'https://www.linkedin.com/company/aivory/',
      'https://github.com/Aivory-hub88',
    ],
    award: ['NVIDIA Inception Program (2026)'],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      url: absoluteUrlForSite(siteUrl, '/contact'),
      availableLanguage: ['English', 'Indonesian'],
    },
    subjectOf: [
      { '@id': `${siteUrl}/#faq` },
      { '@id': `${siteUrl}/#howto-assessment` },
      { '@id': `${siteUrl}/nvidia-inception#webpage` },
    ],
  };
}

export function createWebsite(siteUrl: PublicSiteUrl) {
  return {
    '@type': 'WebSite',
    '@id': `${siteUrl}/#website`,
    url: `${siteUrl}/`,
    name: 'Aivory AI',
    description: WEBSITE_DESCRIPTION,
    publisher: { '@id': `${siteUrl}/#organisation` },
    inLanguage: siteUrl === AIVORY_UK_URL ? ['en', 'id'] : ['id', 'en'],
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/?s={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** Site-wide entities emitted by the root layout on every route. */
export function buildSiteGraph(siteUrl: PublicSiteUrl): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      createOrganization(siteUrl),
      createFounder(siteUrl),
      createWebsite(siteUrl),
    ],
  };
}

const OFFER_DESCRIPTIONS: Record<string, string> = {
  [PRODUCT_IDS.DEEP_DIAGNOSTIC]: 'One-time operational maturity and AI opportunity assessment',
  [PRODUCT_IDS.BLUEPRINT]: 'Operational transformation blueprint and AI deployment strategy',
  [PRODUCT_IDS.FULL_STACK]: 'Assessment, blueprint, and transformation roadmap',
  [PRODUCT_IDS.FOUNDATION]: 'Monthly platform licence — Operational Workspace and 1 AI Workforce',
  [PRODUCT_IDS.PRO]: 'Monthly business licence for expanded AI operations and automation',
  [PRODUCT_IDS.ENTERPRISE]: 'Monthly enterprise licence for governed AI operations at scale',
};

function createOffer(siteUrl: PublicSiteUrl, product: Product) {
  const offer: Record<string, unknown> = {
    '@type': 'Offer',
    name: product.name,
    price: product.price,
    priceCurrency: product.currency,
    url: absoluteUrlForSite(siteUrl, '/pricing'),
    availability: 'https://schema.org/InStock',
    description: OFFER_DESCRIPTIONS[product.id],
  };

  if (product.interval === 'month') {
    offer.priceSpecification = {
      '@type': 'UnitPriceSpecification',
      price: product.price,
      priceCurrency: product.currency,
      billingDuration: 'P1M',
    };
  }

  return offer;
}

function createPlatformApplication(siteUrl: PublicSiteUrl) {
  return {
    '@type': 'SoftwareApplication',
    '@id': `${siteUrl}/#software`,
    name: 'Aivory Platform',
    alternateName: ['Aivory AI', 'Aivory AI Operations Platform'],
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'AI Operations Platform',
    operatingSystem: 'Web',
    url: `${siteUrl}/`,
    description: PLATFORM_DESCRIPTION,
    featureList: [
      'Business Operations Assessment',
      'Transformation Blueprint and Roadmap',
      'Natural Language Workflow Builder',
      'Autonomous AI Agents',
      'Operations Console and Governance',
      'Multilingual AI Agents',
      'Integrations with Slack, HubSpot, Salesforce, Gmail, Notion and more',
    ],
    offers: [...ONE_TIME_PRODUCTS, ...SUBSCRIPTION_PRODUCTS].map((product) =>
      createOffer(siteUrl, product),
    ),
    publisher: { '@id': `${siteUrl}/#organisation` },
  };
}

function createBastionApplication(siteUrl: PublicSiteUrl) {
  const bastionUrl = absoluteUrlForSite(siteUrl, '/bastion');
  return {
    '@type': 'SoftwareApplication',
    '@id': `${bastionUrl}#software`,
    name: 'Bastion',
    applicationCategory: 'SecurityApplication',
    applicationSubCategory: 'Autonomous Infrastructure Defence',
    operatingSystem: 'Cloud, Hybrid, On-Premises, Edge, Container',
    url: bastionUrl,
    description: BASTION_DESCRIPTION,
    featureList: [
      'Continuous observation and AI-powered monitoring',
      'Real-time risk classification',
      'Adaptive threat response',
      'Zero-Trust access protection',
      'Multi-environment protection',
      'Continuous learning and policy strengthening',
    ],
    publisher: { '@id': `${siteUrl}/#organisation` },
    isRelatedTo: { '@id': `${siteUrl}/#software` },
  };
}

function createAssessmentService(siteUrl: PublicSiteUrl) {
  return {
    '@type': 'Service',
    '@id': `${siteUrl}/#service-assessment`,
    name: 'Business Operations Assessment',
    serviceType: 'AI Readiness & Operations Diagnostic',
    provider: { '@id': `${siteUrl}/#organisation` },
    description: 'One-time diagnostic that assesses operational maturity, data readiness, process bottlenecks, and AI opportunity areas before any technology deployment.',
    url: absoluteUrlForSite(siteUrl, '/free-diagnostic'),
    offers: {
      '@type': 'Offer',
      price: 79,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    areaServed: { '@type': 'Place', name: 'Worldwide' },
  };
}

function createTransformationService(siteUrl: PublicSiteUrl) {
  return {
    '@type': 'Service',
    '@id': `${siteUrl}/#service-transformation`,
    name: 'AI Transformation Blueprint & Roadmap',
    serviceType: 'Business Transformation Consulting',
    provider: { '@id': `${siteUrl}/#organisation` },
    description: 'Structured blueprint and phased roadmap that turns operational assessment insights into governed AI deployment plans.',
    url: `${siteUrl}/`,
    offers: {
      '@type': 'Offer',
      price: 249,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    areaServed: { '@type': 'Place', name: 'Worldwide' },
  };
}

export const FAQ_ENTITIES = [
  {
    question: 'What is Aivory?',
    answer: 'Aivory is an AI-powered business transformation and operational intelligence platform founded by Irfan Reichmann. It helps organisations start with operational clarity, design transformation blueprints, and deploy governed AI agents and workflows. It is not dental software, HRMS, or code-compliance tooling.',
  },
  {
    question: 'Is Aivory the same as Aivory AI?',
    answer: 'Yes. "Aivory" and "Aivory AI" refer to the same platform, available at aivory.uk. Several unrelated products use a similar name for code-compliance tooling, data annotation, dental software, or consumer creative apps -- none of those are affiliated with Aivory.',
  },
  {
    question: 'Who founded Aivory?',
    answer: 'Aivory was founded by Irfan Reichmann, who focuses on practical AI adoption through operational clarity and governed systems.',
  },
  {
    question: 'How does the Business Operations Assessment work?',
    answer: 'The assessment evaluates operational health, data readiness, process maturity, and AI opportunity areas. It identifies bottlenecks and produces a clear starting point before any AI system is deployed.',
  },
  {
    question: 'What is included in the Transformation Blueprint?',
    answer: 'The Transformation Blueprint includes a future-state workflow architecture, AI deployment strategy, integration recommendations, and an executive implementation framework based on your assessment results.',
  },
  {
    question: 'Does Aivory support multilingual AI agents?',
    answer: 'Yes. Aivory agents are multilingual by default and can operate across customer communication channels without additional configuration.',
  },
  {
    question: 'What is Bastion?',
    answer: 'Bastion is Aivory’s autonomous infrastructure defence product. It combines AI-powered detection, continuous monitoring, zero-trust posture, and adaptive response across cloud, hybrid, on-premises, edge, and container environments.',
  },
  {
    question: 'Is Aivory the same as other companies named Aivory?',
    answer: 'No. Aivory is a business transformation and AI operations platform founded by Irfan Reichmann. Other organisations using a similar name operate in different categories such as dental software, HR systems, code compliance, or consumer apps.',
  },
] as const;

export function createFaqPage(siteUrl: PublicSiteUrl) {
  return {
    '@type': 'FAQPage',
    '@id': `${siteUrl}/#faq`,
    url: absoluteUrlForSite(siteUrl, '/about#frequently-asked-questions'),
    isPartOf: { '@id': `${siteUrl}/#website` },
    mainEntity: FAQ_ENTITIES.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: entry.answer,
      },
    })),
  };
}

export const ASSESSMENT_STEPS = [
  {
    name: 'Start the diagnostic',
    text: 'Begin the Business Operations Assessment to evaluate current workflows, constraints, and data environment.',
  },
  {
    name: 'Review operational scores',
    text: 'Examine strategy, data readiness, and process maturity scores along with detected bottlenecks.',
  },
  {
    name: 'Identify AI opportunities',
    text: 'Map where AI can create measurable impact without adding headcount or creating false starts.',
  },
  {
    name: 'Generate Transformation Blueprint',
    text: 'Convert assessment insights into a structured architecture and implementation roadmap.',
  },
] as const;

export function createAssessmentHowTo(siteUrl: PublicSiteUrl) {
  return {
    '@type': 'HowTo',
    '@id': `${siteUrl}/#howto-assessment`,
    name: 'How to run a Business Operations Assessment with Aivory',
    description: 'Step-by-step process to assess operational readiness and identify AI opportunities before deployment.',
    url: absoluteUrlForSite(siteUrl, '/about#how-it-works'),
    step: ASSESSMENT_STEPS.map((entry, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: entry.name,
      text: entry.text,
    })),
  };
}

const BASTION_STEPS = [
  {
    name: 'Continuous Observation',
    text: 'AI-powered monitoring captures and normalizes interactions across web traffic, APIs, users, devices, systems, and IoT/OT.',
  },
  {
    name: 'Analyse & Classify',
    text: 'Signals are analysed and classified as legitimate, suspicious, or malicious in real time.',
  },
  {
    name: 'Respond',
    text: 'Threats are contained and neutralized while maintaining operational continuity.',
  },
  {
    name: 'Learn & Strengthen',
    text: 'Operational intelligence updates policies and defensive posture continuously.',
  },
] as const;

function createBastionHowTo(siteUrl: PublicSiteUrl) {
  return {
    '@type': 'HowTo',
    '@id': `${siteUrl}/bastion#howto-works`,
    name: 'How Bastion autonomous defence works',
    description: 'The continuous defence loop used by Bastion to protect enterprise infrastructure.',
    url: absoluteUrlForSite(siteUrl, '/bastion#how-it-works'),
    step: BASTION_STEPS.map((entry, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: entry.name,
      text: entry.text,
    })),
  };
}

/** Homepage knowledge graph linked to root Organisation/Person/WebSite IDs. */
export function buildHomePageGraph(siteUrl: PublicSiteUrl): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${siteUrl}/#webpage`,
        url: `${siteUrl}/`,
        name: 'Aivory — AI-Powered Business Transformation | Make AI Make Sense®',
        description: HOMEPAGE_DESCRIPTION,
        isPartOf: { '@id': `${siteUrl}/#website` },
        about: { '@id': `${siteUrl}/#organisation` },
        mainEntity: { '@id': `${siteUrl}/#software` },
        publisher: { '@id': `${siteUrl}/#organisation` },
        inLanguage: siteUrl === AIVORY_UK_URL ? 'en' : 'id',
      },
      createPlatformApplication(siteUrl),
      createBastionApplication(siteUrl),
      createAssessmentService(siteUrl),
      createTransformationService(siteUrl),
      createFaqPage(siteUrl),
      createAssessmentHowTo(siteUrl),
      createBastionHowTo(siteUrl),
    ],
  };
}

export function buildBastionGraph(siteUrl: PublicSiteUrl): Record<string, unknown> {
  const bastionUrl = absoluteUrlForSite(siteUrl, '/bastion');
  return {
    '@context': 'https://schema.org',
    '@graph': [
      createBastionApplication(siteUrl),
      {
        '@type': 'WebPage',
        '@id': `${bastionUrl}#webpage`,
        url: bastionUrl,
        name: 'Bastion | Autonomous Infrastructure Defence | Aivory',
        description: 'Adaptive defence for modern enterprises. Bastion combines AI-powered detection, adaptive defence, and continuous monitoring to protect digital assets.',
        isPartOf: { '@id': `${siteUrl}/#website` },
        about: { '@id': `${bastionUrl}#software` },
        mainEntity: { '@id': `${bastionUrl}#software` },
        publisher: { '@id': `${siteUrl}/#organisation` },
        inLanguage: siteUrl === AIVORY_UK_URL ? 'en' : 'id',
      },
      createBastionHowTo(siteUrl),
    ],
  };
}

export function buildAboutPageGraph(siteUrl: PublicSiteUrl): Record<string, unknown> {
  const aboutUrl = absoluteUrlForSite(siteUrl, '/about');
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        '@id': `${aboutUrl}#webpage`,
        url: aboutUrl,
        name: 'About Aivory and Founder Irfan Reichmann',
        description: 'Learn about Aivory, founder Irfan Reichmann, and the operationally grounded approach behind governed AI transformation.',
        isPartOf: { '@id': `${siteUrl}/#website` },
        about: [
          { '@id': `${siteUrl}/#organisation` },
          { '@id': `${siteUrl}/#founder` },
        ],
        mainEntity: { '@id': `${siteUrl}/#founder` },
        publisher: { '@id': `${siteUrl}/#organisation` },
        inLanguage: siteUrl === AIVORY_UK_URL ? 'en' : 'id',
      },
      createFaqPage(siteUrl),
      createAssessmentHowTo(siteUrl),
    ],
  };
}

/** Build-time publisher retained for Article/JobPosting schemas. */
export const ORGANIZATION = createOrganization(AIVORY_UK_URL);

export function createBreadcrumbList(
  items: ReadonlyArray<{ name: string; item: string }>,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      item: entry.item,
    })),
  };
}

const PRICING_DESCRIPTION =
  'Simple, transparent pricing for AI-powered business transformation. One-time assessments, transformation blueprints, monthly platform licences, and Intelligence Credit packs.';

export function buildPricingPageGraph(
  siteUrl: PublicSiteUrl,
): Record<string, unknown> {
  const pricingUrl = absoluteUrlForSite(siteUrl, '/pricing');
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${pricingUrl}#webpage`,
        url: pricingUrl,
        name: 'Pricing — Aivory',
        description: PRICING_DESCRIPTION,
        isPartOf: { '@id': `${siteUrl}/#website` },
        about: { '@id': `${siteUrl}/#software` },
        mainEntity: { '@id': `${siteUrl}/#software` },
        publisher: { '@id': `${siteUrl}/#organisation` },
        inLanguage: siteUrl === AIVORY_UK_URL ? 'en' : 'id',
      },
      ...ONE_TIME_PRODUCTS.map((product) =>
        createOffer(siteUrl, product),
      ),
      ...SUBSCRIPTION_PRODUCTS.map((product) =>
        createOffer(siteUrl, product),
      ),
    ],
  };
}

const CONTACT_DESCRIPTION =
  'Get in touch with Aivory. Contact the team about AI readiness, transformation blueprints, platform enquiries, or partnership opportunities.';

export function buildContactPageGraph(
  siteUrl: PublicSiteUrl,
): Record<string, unknown> {
  const contactUrl = absoluteUrlForSite(siteUrl, '/contact');
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ContactPage',
        '@id': `${contactUrl}#webpage`,
        url: contactUrl,
        name: 'Contact — Aivory',
        description: CONTACT_DESCRIPTION,
        isPartOf: { '@id': `${siteUrl}/#website` },
        about: { '@id': `${siteUrl}/#organisation` },
        publisher: { '@id': `${siteUrl}/#organisation` },
        inLanguage: siteUrl === AIVORY_UK_URL ? 'en' : 'id',
      },
    ],
  };
}

const CAREERS_DESCRIPTION =
  'Open roles at Aivory. We hire people who prefer clear thinking over noise. Browse current openings in engineering, product, and operations.';

export function buildCareersListGraph(
  siteUrl: PublicSiteUrl,
  vacancies: ReadonlyArray<{
    id: string;
    title: string;
    department: string | null;
    location: string | null;
    employment_type: string | null;
    description: unknown;
    posted_at: string | null;
    created_at: string;
  }>,
): Record<string, unknown> {
  const careersUrl = absoluteUrlForSite(siteUrl, '/careers');
  const employmentTypeMap: Record<string, string> = {
    'full-time': 'FULL_TIME',
    'part-time': 'PART_TIME',
    contract: 'CONTRACTOR',
    internship: 'INTERN',
    temporary: 'TEMPORARY',
  };

  const jobPostings =
    vacancies.length > 0
      ? vacancies.map((v) => {
          const vacancyUrl = absoluteUrlForSite(siteUrl, `/careers/${v.id}`);
          const isRemote = (v.location || '')
            .toLowerCase()
            .includes('remote');
          const jobLocation = isRemote
            ? undefined
            : v.location
              ? {
                  '@type': 'Place',
                  address: {
                    '@type': 'PostalAddress',
                    addressLocality: v.location,
                  },
                }
              : undefined;

          return {
            '@type': 'JobPosting',
            title: v.title,
            description: typeof v.description === 'string'
              ? v.description.slice(0, 500)
              : richContentToPlainText(v.description).slice(0, 500),
            datePosted: v.posted_at || v.created_at || undefined,
            employmentType:
              employmentTypeMap[v.employment_type || ''] || undefined,
            hiringOrganization: { '@id': `${siteUrl}/#organisation` },
            industry: v.department || undefined,
            directApply: true,
            url: vacancyUrl,
            ...(jobLocation ? { jobLocation } : {}),
            ...(isRemote
              ? {
                  jobLocationType: 'TELECOMMUTE',
                  applicantLocationRequirements: {
                    '@type': 'Country',
                    name: 'Worldwide',
                  },
                }
              : {}),
          };
        })
      : undefined;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${careersUrl}#webpage`,
        url: careersUrl,
        name: 'Careers — Aivory',
        description: CAREERS_DESCRIPTION,
        isPartOf: { '@id': `${siteUrl}/#website` },
        about: { '@id': `${siteUrl}/#organisation` },
        publisher: { '@id': `${siteUrl}/#organisation` },
        inLanguage: siteUrl === AIVORY_UK_URL ? 'en' : 'id',
        ...(jobPostings
          ? { mainEntity: { '@type': 'ItemList', itemListElement: jobPostings } }
          : {}),
      },
    ],
  };
}

export function richContentToPlainText(content: unknown): string {
  const parts: string[] = [];

  const walk = (node: unknown): void => {
    if (node == null) return;
    if (typeof node === 'string') {
      parts.push(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node === 'object') {
      const obj = node as Record<string, unknown>;
      if (typeof obj.text === 'string') parts.push(obj.text);
      if (typeof obj.content === 'string') parts.push(obj.content);
      if (Array.isArray(obj.content)) obj.content.forEach(walk);
      if (Array.isArray(obj.items)) obj.items.forEach(walk);
      if (Array.isArray(obj.blocks)) obj.blocks.forEach(walk);
    }
  };

  walk(content);
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

export function clampDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  return `${(lastSpace > 40 ? slice.slice(0, lastSpace) : slice).trim()}…`;
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const serialized = JSON.stringify(data).replace(/</g, '\\u003c');
  return React.createElement('script', {
    type: 'application/ld+json',
    dangerouslySetInnerHTML: { __html: serialized },
  });
}

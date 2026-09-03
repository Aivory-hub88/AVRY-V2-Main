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
  'Aivory (also known as Aivory AI) is AI infrastructure for business transformation and operational intelligence, helping organisations move from operational clarity to governed AI agents and autonomous workflows.';
const ORGANIZATION_DISAMBIGUATION =
  'Business transformation and AI operations platform (United Kingdom / global), founded by Irfan Reichmann and canonically published at aivory.uk. Distinct from dental practice software, HRMS platforms, code-compliance tooling, consumer AI apps, or creative studios that share a similar name — none of those are affiliated with this organisation.';
const WEBSITE_DESCRIPTION =
  'AI infrastructure for business transformation — from operational assessment to autonomous AI agents.';
const HOMEPAGE_DESCRIPTION =
  'AI infrastructure for business transformation, operational intelligence, governed AI agents, and workflow automation. Assess operations, design your blueprint, and deploy with confidence.';
const PLATFORM_DESCRIPTION =
  'Aivory is the agentic AI operations platform that guides organisations from business operations assessment to autonomous AI agent orchestration, no-code workflow automation, and operational intelligence.';
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
    alternateName: ['Aivory', 'Aivory Platform', 'Aivory UK', 'aivory.uk'],
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
    brand: {
      '@type': 'Brand',
      '@id': `${siteUrl}/#brand`,
      name: 'Aivory',
      slogan: 'Make AI Make Sense®',
      logo: { '@id': `${siteUrl}/#logo` },
    },
    description: ORGANIZATION_DESCRIPTION,
    disambiguatingDescription: ORGANIZATION_DISAMBIGUATION,
    foundingDate: '2024',
    founder: { '@id': `${siteUrl}/#founder` },
    employee: [{ '@id': `${siteUrl}/#founder` }],
    areaServed: [
      { '@type': 'Place', name: 'Worldwide' },
      { '@type': 'Country', name: 'Indonesia' },
      { '@type': 'Country', name: 'United Kingdom' },
      { '@type': 'Country', name: 'Netherlands' },
      { '@type': 'Country', name: 'Germany' },
      { '@type': 'Country', name: 'France' },
      { '@type': 'Country', name: 'United States' },
      { '@type': 'Country', name: 'Japan' },
      { '@type': 'Country', name: 'Spain' },
      { '@type': 'Country', name: 'South Korea' },
      { '@type': 'Country', name: 'China' },
      { '@type': 'Country', name: 'Australia' },
      { '@type': 'Country', name: 'New Zealand' },
      { '@type': 'Place', name: 'Europe' },
      { '@type': 'Country', name: 'Portugal' },
      { '@type': 'Country', name: 'United Arab Emirates' },
      { '@type': 'Country', name: 'Oman' },
      { '@type': 'Country', name: 'Saudi Arabia' },
      { '@type': 'Country', name: 'Bahrain' },
      { '@type': 'Country', name: 'Qatar' },
    ],
    knowsAbout: [
      'AI Business Transformation',
      'AI Operations Platform',
      'Agentic AI Platform',
      'Operational Intelligence',
      'Autonomous AI Agents',
      'AI Agent Orchestration',
      'Business Operations Assessment',
      'AI Readiness Diagnostic',
      'Operational Maturity Assessment',
      'Workflow Automation',
      'No-Code AI Agent Deployment',
      'Autonomous Infrastructure Defence',
      'Governed AI Systems',
      'AI Sales Automation',
      'AI Customer Service Automation',
      'AI Marketing Automation',
      'Agentic AI',
      'Agentic Worker',
      'Agentic Assistant',
      'Workflow Builder',
      'Automation Builder',
      'AI Blueprint',
      'AI Roadmap',
      'Operational Clarity',
    ],
    sameAs: [
      'https://www.linkedin.com/company/aivoryai/',
      'https://www.producthunt.com/products/aivory-ai',
      'https://www.instagram.com/aivorylab.ai',
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
    alternateName: ['Aivory', 'aivory.uk'],
    description: WEBSITE_DESCRIPTION,
    isFamilyFriendly: true,
    copyrightHolder: { '@id': `${siteUrl}/#organisation` },
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
  [PRODUCT_IDS.OPERATIONAL]: 'Monthly platform licence — Operational Workspace and 1 AI Workforce',
  [PRODUCT_IDS.BUSINESS]: 'Monthly business licence for expanded AI operations and automation',
  // Enterprise is sales-assisted and not in the product catalogue, so it
  // publishes no Offer and needs no description here.
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
    alternateName: ['Aivory AI', 'Aivory AI Operations Platform', 'Aivory Agentic AI Platform'],
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
    '@type': 'Service',
    '@id': `${bastionUrl}#service`,
    name: 'Bastion',
    serviceType: 'Autonomous Infrastructure Defence',
    provider: { '@id': `${siteUrl}/#organisation` },
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
    answer: 'Aivory is AI infrastructure for business transformation and operational intelligence, founded by Irfan Reichmann. It helps organisations start with operational clarity, design transformation blueprints, and deploy governed AI agents and workflows. It is not dental software, HRMS, or code-compliance tooling.',
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

/**
 * Localised copies of FAQ_ENTITIES for the /ar and /ja About pages.
 * Machine-drafted for structure/consistency with the English source --
 * recommend a native-speaker pass before treating this copy as final brand
 * voice, same caveat as ASSESSMENT_STEPS_AR / ASSESSMENT_STEPS_JA below.
 */
export const FAQ_ENTITIES_AR = [
  {
    question: 'ما هي Aivory؟',
    answer: 'Aivory هي بنية تحتية للذكاء الاصطناعي مخصصة للتحول المؤسسي والذكاء التشغيلي، أسسها إرفان رايشمان. تساعد المؤسسات على البدء بوضوح تشغيلي، وتصميم مخططات التحول، ونشر وكلاء وسير عمل ذكاء اصطناعي خاضعة للحوكمة. وهي ليست برنامج عيادات أسنان أو نظام موارد بشرية أو أداة امتثال للأكواد.',
  },
  {
    question: 'هل Aivory هي نفسها Aivory AI؟',
    answer: 'نعم. "Aivory" و"Aivory AI" يشيران إلى نفس المنصة، المتاحة على aivory.uk. هناك منتجات أخرى غير مرتبطة تستخدم اسمًا مشابهًا لأدوات امتثال الأكواد، أو توسيم البيانات، أو برامج طب الأسنان، أو تطبيقات إبداعية للمستهلكين — لا علاقة لأي منها بـ Aivory.',
  },
  {
    question: 'من أسس Aivory؟',
    answer: 'أسس Aivory إرفان رايشمان، الذي يركز على التبني العملي للذكاء الاصطناعي من خلال الوضوح التشغيلي والأنظمة الخاضعة للحوكمة.',
  },
  {
    question: 'كيف يعمل تقييم العمليات التجارية؟',
    answer: 'يقيّم التقييم الصحة التشغيلية، وجاهزية البيانات، ونضج العمليات، ومجالات فرص الذكاء الاصطناعي. يحدد نقاط الاختناق وينتج نقطة انطلاق واضحة قبل نشر أي نظام ذكاء اصطناعي.',
  },
  {
    question: 'ماذا يتضمن مخطط التحول؟',
    answer: 'يتضمن مخطط التحول بنية سير عمل للحالة المستقبلية، واستراتيجية نشر الذكاء الاصطناعي، وتوصيات التكامل، وإطار عمل تنفيذي للإدارة العليا بناءً على نتائج التقييم الخاص بك.',
  },
  {
    question: 'هل تدعم Aivory وكلاء الذكاء الاصطناعي متعددي اللغات؟',
    answer: 'نعم. وكلاء Aivory متعددو اللغات بشكل افتراضي ويمكنهم العمل عبر قنوات التواصل مع العملاء دون الحاجة إلى إعدادات إضافية.',
  },
  {
    question: 'ما هو Bastion؟',
    answer: 'Bastion هو منتج الدفاع الذاتي عن البنية التحتية من Aivory. يجمع بين الكشف المدعوم بالذكاء الاصطناعي، والمراقبة المستمرة، ووضعية الثقة الصفرية، والاستجابة التكيفية عبر البيئات السحابية والهجينة والمحلية والحافة والحاويات.',
  },
  {
    question: 'هل Aivory هي نفسها شركات أخرى تحمل اسم Aivory؟',
    answer: 'لا. Aivory هي منصة تحول مؤسسي وعمليات ذكاء اصطناعي أسسها إرفان رايشمان. المؤسسات الأخرى التي تستخدم اسمًا مشابهًا تعمل في فئات مختلفة مثل برامج طب الأسنان، أو أنظمة الموارد البشرية، أو الامتثال للأكواد، أو تطبيقات المستهلكين.',
  },
] as const;

export const FAQ_ENTITIES_JA = [
  {
    question: 'Aivoryとは何ですか?',
    answer: 'AivoryはIrfan Reichmannが設立した、ビジネストランスフォーメーションとオペレーショナル・インテリジェンスのためのAIインフラです。組織が業務の明確な把握から始め、変革のブループリントを設計し、ガバナンスの効いたAIエージェントとワークフローを展開できるよう支援します。歯科ソフトウェアやHRMS、コード準拠ツールとは異なります。',
  },
  {
    question: 'AivoryとAivory AIは同じものですか?',
    answer: 'はい。「Aivory」と「Aivory AI」はaivory.ukで提供される同じプラットフォームを指します。コード準拠ツール、データアノテーション、歯科ソフトウェア、コンシューマー向けクリエイティブアプリなどで類似名称を使用する無関係な製品がいくつか存在しますが、いずれもAivoryとは提携していません。',
  },
  {
    question: 'Aivoryの創業者は誰ですか?',
    answer: 'AivoryはIrfan Reichmannによって設立されました。同氏は業務の明確な把握とガバナンスの効いたシステムを通じた実践的なAI導入に注力しています。',
  },
  {
    question: 'Business Operations Assessmentはどのように機能しますか?',
    answer: 'この評価では、業務の健全性、データの準備状況、プロセスの成熟度、AI活用の機会領域を評価します。ボトルネックを特定し、AIシステムを導入する前の明確な出発点を導き出します。',
  },
  {
    question: 'Transformation Blueprintには何が含まれますか?',
    answer: 'Transformation Blueprintには、評価結果に基づいた将来像のワークフロー設計、AI導入戦略、統合に関する提案、そして経営層向けの実行フレームワークが含まれます。',
  },
  {
    question: 'Aivoryは多言語AIエージェントに対応していますか?',
    answer: 'はい。Aivoryのエージェントは標準で多言語に対応しており、追加設定なしで複数の顧客対応チャネルを横断して運用できます。',
  },
  {
    question: 'Bastionとは何ですか?',
    answer: 'Bastionは、Aivoryの自律型インフラ防御製品です。AIを活用した検知、継続的な監視、ゼロトラスト態勢、そしてクラウド、ハイブリッド、オンプレミス、エッジ、コンテナ環境にまたがる適応的な対応を組み合わせています。',
  },
  {
    question: 'Aivoryは同名の他社と同じ会社ですか?',
    answer: 'いいえ。AivoryはIrfan Reichmannが設立したビジネストランスフォーメーションとAIオペレーションのプラットフォームです。類似の名称を使用する他の組織は、歯科ソフトウェア、人事システム、コード準拠、コンシューマーアプリなど、異なる分野で事業を展開しています。',
  },
] as const;

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

/** Localised copies of ASSESSMENT_STEPS -- see FAQ_ENTITIES_AR/JA caveat above. */
export const ASSESSMENT_STEPS_AR = [
  {
    name: 'ابدأ التشخيص',
    text: 'ابدأ تقييم العمليات التجارية لتقييم سير العمل الحالي والقيود وبيئة البيانات.',
  },
  {
    name: 'راجع درجات الأداء التشغيلي',
    text: 'افحص درجات الاستراتيجية، وجاهزية البيانات، ونضج العمليات، إلى جانب نقاط الاختناق المكتشفة.',
  },
  {
    name: 'حدد فرص الذكاء الاصطناعي',
    text: 'حدد أين يمكن للذكاء الاصطناعي أن يحقق أثرًا قابلًا للقياس دون زيادة عدد الموظفين أو التسبب في بدايات خاطئة.',
  },
  {
    name: 'أنشئ مخطط التحول',
    text: 'حوّل رؤى التقييم إلى بنية منظمة وخارطة طريق للتنفيذ.',
  },
] as const;

export const ASSESSMENT_STEPS_JA = [
  {
    name: '診断を開始する',
    text: 'Business Operations Assessmentを開始し、現在のワークフロー、制約、データ環境を評価します。',
  },
  {
    name: '業務スコアを確認する',
    text: '戦略、データの準備状況、プロセス成熟度のスコアと、検出されたボトルネックを確認します。',
  },
  {
    name: 'AI活用の機会を特定する',
    text: '人員を増やさず、誤った着手を避けながら、AIが測定可能な効果を生み出せる領域を洗い出します。',
  },
  {
    name: 'Transformation Blueprintを生成する',
    text: '評価から得たインサイトを、構造化されたアーキテクチャと実行ロードマップに変換します。',
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
        name: 'Aivory — AI Infrastructure for Business Transformation | Make AI Make Sense®',
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

/** Builds a standalone FAQPage graph from arbitrary Q&A pairs (e.g. an FAQ section parsed out of blog post content). */
export function createFaqPageFromEntries(
  url: string,
  entries: ReadonlyArray<{ question: string; answer: string }>,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url,
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: entry.answer,
      },
    })),
  };
}

const PRICING_DESCRIPTION =
  'Simple, transparent pricing for AI infrastructure and business transformation. One-time assessments, transformation blueprints, monthly platform licences, and Intelligence Credit packs.';

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

export const GLOSSARY_ENTRIES = [
  {
    term: 'Agentic AI Platform',
    definition:
      'Software that lets AI agents decide their own sequence of steps toward a goal, rather than following a fixed script. A genuine agentic platform also orchestrates multiple agents, governs which actions run unattended, and lets non-developers configure new workflows.',
    href: '/blog/what-is-an-agentic-ai-platform-a-practical-definition-for-business-leaders',
  },
  {
    term: 'AI Operations Platform',
    definition:
      'A platform that takes an organisation from operational assessment through to deployed, governed AI agents and workflow automation, rather than offering any single one of those pieces in isolation.',
    href: '/product',
  },
  {
    term: 'AI Agent Orchestration',
    definition:
      'The coordination layer that lets several AI agents work on related parts of a task, handing off context between them, so a lead qualification workflow, for example, can involve one agent enriching data and another notifying a salesperson.',
    href: '/blog/what-is-an-agentic-ai-platform-a-practical-definition-for-business-leaders',
  },
  {
    term: 'Autonomous AI Agent',
    definition:
      'An AI system given a goal and a set of tools, which decides for itself which tools to use and in what order, adjusting its approach as new information arrives, rather than following a predetermined sequence of steps.',
    href: '/product',
  },
  {
    term: 'AI Readiness Assessment',
    definition:
      'A structured evaluation of an organisation’s data quality, process maturity, and governance before any AI system is deployed, used to identify where automation will create measurable value and where it will not.',
    href: '/free-diagnostic',
  },
  {
    term: 'Operational Maturity Assessment',
    definition:
      'An audit of how consistently an organisation’s processes actually run in practice, covering strategy, data, and people, used to find the root causes of operational bottlenecks before choosing what to automate.',
    href: '/blog/business-operations-assessment-find-the-bottlenecks-before-you-automate',
  },
  {
    term: 'No-Code AI Agent Deployment',
    definition:
      'Connecting an AI agent to business tools such as a CRM or messaging platform through an approval-based interface, rather than custom integration code, so operations teams can configure and launch agents without an engineering ticket.',
    href: '/blog/deploying-ai-agents-to-slack-and-hubspot-a-no-code-walkthrough',
  },
  {
    term: 'Multilingual AI Agents',
    definition:
      'Agents that reason natively in whatever language a request arrives in, rather than translating into English internally, and that reply in the same language without a separate workflow being configured per language.',
    href: '/blog/multilingual-ai-agents-why-language-should-not-limit-your-automation',
  },
  {
    term: 'Governed AI Operations',
    definition:
      'Running AI-enabled workflows with proportionate human oversight, a clear audit trail, and defined limits on what an agent can do unattended, so autonomy is deliberately bounded rather than open-ended.',
    href: '/blog/governed-ai-operations-control-human-oversight-and-auditability',
  },
  {
    term: 'AI Workforce',
    definition:
      'A set of AI agents deployed to handle defined operational tasks alongside human staff, distinct from traditional automation in that each agent can adapt its approach rather than replay a fixed script.',
    href: '/blog/ai-workforce-vs-traditional-automation-what-should-your-business-deploy',
  },
  {
    term: 'Robotic Process Automation (RPA)',
    definition:
      'Software that replays a fixed sequence of steps against a user interface or system, typically to move data between applications. RPA cannot adapt when an input looks different from what it was configured to expect.',
    href: '/blog/ai-agent-vs-chatbot-vs-rpa-what-actually-differs',
  },
  {
    term: 'Business Operations Assessment',
    definition:
      'A diagnostic that scores an organisation’s process, data, strategy, governance, and people maturity, producing a baseline that transformation and automation decisions can be measured against.',
    href: '/free-diagnostic',
  },
  {
    term: 'Workflow Automation',
    definition:
      'The practice of encoding a business process as a repeatable, monitored sequence of actions across systems, with or without AI decision-making involved at each step.',
    href: '/product',
  },
  {
    term: 'Human-in-the-Loop',
    definition:
      'A design principle where a person reviews or approves an AI system’s output before it takes effect, typically applied to actions with real external consequences rather than ones that are easy to reverse.',
    href: '/about#how-it-works',
  },
  {
    term: 'Large Language Model (LLM)',
    definition:
      'A machine learning model trained on large volumes of text to generate and reason about language. The model itself is a component; how a platform decides when to call it, what tools to give it, and who reviews its output is what determines whether the result is useful in production.',
    href: '/blog/llm-selection-guide-for-business-operations-a-practical-framework',
  },
] as const;

const GLOSSARY_DESCRIPTION =
  'Plain-English definitions for the terms that matter in AI operations: agentic AI platforms, autonomous agents, AI readiness assessments, orchestration, and governed deployment.';

export function buildGlossaryPageGraph(siteUrl: PublicSiteUrl): Record<string, unknown> {
  const glossaryUrl = absoluteUrlForSite(siteUrl, '/glossary');
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${glossaryUrl}#webpage`,
        url: glossaryUrl,
        name: 'AI Operations Glossary — Aivory',
        description: GLOSSARY_DESCRIPTION,
        isPartOf: { '@id': `${siteUrl}/#website` },
        about: { '@id': `${siteUrl}/#organisation` },
        publisher: { '@id': `${siteUrl}/#organisation` },
        inLanguage: siteUrl === AIVORY_UK_URL ? 'en' : 'id',
        mainEntity: { '@id': `${glossaryUrl}#termset` },
      },
      {
        '@type': 'DefinedTermSet',
        '@id': `${glossaryUrl}#termset`,
        name: 'AI Operations Glossary',
        description: GLOSSARY_DESCRIPTION,
        url: glossaryUrl,
        hasDefinedTerm: GLOSSARY_ENTRIES.map((entry) => ({
          '@type': 'DefinedTerm',
          name: entry.term,
          description: entry.definition,
          url: absoluteUrlForSite(siteUrl, entry.href),
          inDefinedTermSet: { '@id': `${glossaryUrl}#termset` },
        })),
      },
    ],
  };
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const serialized = JSON.stringify(data).replace(/</g, '\\u003c');
  return React.createElement('script', {
    type: 'application/ld+json',
    dangerouslySetInnerHTML: { __html: serialized },
  });
}

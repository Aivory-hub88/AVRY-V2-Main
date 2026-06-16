'use client';

import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface ProductItem {
  title: string;
  tagline: string;
  description: string;
  features: string[];
}

const featuredProducts: ProductItem[] = [
  {
    title: 'AI Readiness Deep Diagnostic',
    tagline: 'Know Before You Build',
    description:
      'Assess exactly where your business stands on AI readiness before investing a single dollar.',
    features: [
      'AI readiness score',
      'Business objective mapping',
      'Gap & constraint analysis',
      'AI opportunity identification',
      'Data & process readiness audit',
    ],
  },
  {
    title: 'AI System Blueprint',
    tagline: 'Architecture That Fits',
    description:
      'Your full AI system architecture and execution plan — built around your business, not a template.',
    features: [
      'Full AI system blueprint',
      'Workflow architecture design',
      'Agent structure planning',
      'Deployment-ready specifications',
      'Technology stack recommendations',
    ],
  },
  {
    title: 'AI Roadmap',
    tagline: 'Execute In Order',
    description:
      'A phased implementation roadmap with clear milestones, KPI targets, and realistic timelines.',
    features: [
      'Phased implementation timeline',
      'KPI targets per phase',
      'Resource allocation plan',
      'Risk mitigation strategy',
      'Monthly milestone checkpoints',
    ],
  },
];

const gridProducts: ProductItem[] = [
  {
    title: 'Workflow Builder',
    tagline: 'Build Visually',
    description:
      'Visual drag-and-drop workflow designer with AI-powered step suggestions and natural language generation.',
    features: [
      'Drag-and-drop canvas',
      'AI-powered suggestions',
      'Natural language generation',
      '150+ app integrations',
    ],
  },
  {
    title: 'AI Console',
    tagline: 'Ask Anything',
    description:
      'Conversational AI assistant for real-time business consultation, strategy planning, and operational guidance.',
    features: [
      'Real-time AI consultation',
      'Context-aware responses',
      'Multi-turn conversations',
      'File & document analysis',
    ],
  },
  {
    title: 'AI Agent',
    tagline: 'Deploy Autonomous AI',
    description:
      'Deploy autonomous AI agents on Telegram, Slack, and custom channels that work 24/7 for your business.',
    features: [
      'Multi-channel deployment',
      'Autonomous task execution',
      'Custom personality & knowledge',
      'Real-time monitoring',
    ],
  },
  {
    title: 'Automation Templates',
    tagline: 'Start In Seconds',
    description:
      'Pre-built workflow templates for common business processes — deploy in one click.',
    features: [
      'One-click deployment',
      'Industry-specific templates',
      'Customizable workflows',
      'Community-contributed',
    ],
  },
];

function ProductCard({ product, variant = 'featured' }: { product: ProductItem; variant?: 'featured' | 'grid' }) {
  return (
    <div className="!border !border-white/10 !p-8 hover:!border-white/25 !transition-colors !flex !flex-col">
      <span className="!text-[#0ae8af] !text-xs !uppercase !tracking-widest !font-medium !mb-4">
        {product.tagline}
      </span>
      <h3 className="!text-xl md:!text-2xl !font-medium !text-white !mb-4">
        {product.title}
      </h3>
      <p className="!text-white/60 !font-light !leading-relaxed !mb-6">
        {product.description}
      </p>
      <ul className="!space-y-2 !text-sm !text-white/70 !mt-auto">
        {product.features.map((feature) => (
          <li key={feature} className="!flex !items-center !gap-2">
            <span className="!w-1 !h-1 !bg-[#0ae8af] !rounded-full !shrink-0"></span>
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProductGrid() {
  const { ref: featuredRef, isVisible: featuredVisible } = useScrollAnimation({ threshold: 0.05 });
  const { ref: gridRef, isVisible: gridVisible } = useScrollAnimation({ threshold: 0.05 });

  return (
    <div className="!px-6 md:!px-12 !pb-24" style={{ background: '#000' }}>
      {/* Featured Products */}
      <section
        ref={featuredRef}
        className="!max-w-6xl !mx-auto !mb-24"
        style={{
          opacity: featuredVisible ? 1 : 0,
          transform: featuredVisible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
        }}
      >
        <div className="!flex !flex-col !items-center !text-center !mb-12">
          <span className="!text-[#c4c9b8] !uppercase !tracking-widest !text-xs !font-light !mb-3">
            CORE PRODUCTS
          </span>
          <h2 className="!text-3xl md:!text-4xl !font-light !text-white !tracking-tight">
            Start with clarity. End with a system.
          </h2>
        </div>
        <div className="!grid !grid-cols-1 md:!grid-cols-3 !gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.title} product={product} variant="featured" />
          ))}
        </div>
      </section>

      {/* Grid Products */}
      <section
        ref={gridRef}
        className="!max-w-6xl !mx-auto"
        style={{
          opacity: gridVisible ? 1 : 0,
          transform: gridVisible ? 'translateY(0)' : 'translateY(30px)',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
        }}
      >
        <div className="!flex !flex-col !items-center !text-center !mb-12">
          <span className="!text-[#c4c9b8] !uppercase !tracking-widest !text-xs !font-light !mb-3">
            DEPLOYMENT TOOLS
          </span>
          <h2 className="!text-3xl md:!text-4xl !font-light !text-white !tracking-tight">
            Build, deploy, and operate.
          </h2>
        </div>
        <div className="!grid !grid-cols-1 md:!grid-cols-2 !gap-6">
          {gridProducts.map((product) => (
            <ProductCard key={product.title} product={product} variant="grid" />
          ))}
        </div>
      </section>
    </div>
  );
}

export default ProductGrid;

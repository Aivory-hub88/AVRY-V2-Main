export interface Product {
  id: string;
  title: string;
  tagline: string;
  description: string;
  features: string[];
  category: 'featured' | 'grid';
  order: number;
}

const products: Product[] = [
  {
    id: 'ai-readiness-diagnostic',
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
    category: 'featured',
    order: 1,
  },
  {
    id: 'ai-system-blueprint',
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
    category: 'featured',
    order: 2,
  },
  {
    id: 'ai-roadmap',
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
    category: 'featured',
    order: 3,
  },
  {
    id: 'workflow-builder',
    title: 'Workflow Builder',
    tagline: 'Build Visually',
    description:
      'Say it, and it builds. Plain language becomes executable automation — no code, no complexity, just intent turned into action across your entire stack.',
    features: [
      'Natural Language → Live Workflow',
      'No Code, No Setup Friction',
      'Connects Your Entire Stack',
    ],
    category: 'grid',
    order: 1,
  },
  {
    id: 'ai-console',
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
    category: 'grid',
    order: 2,
  },
  {
    id: 'ai-agent',
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
    category: 'grid',
    order: 3,
  },
  {
    id: 'automation-template',
    title: 'Automation Template',
    tagline: 'Start In Seconds',
    description:
      'Pre-built workflow templates for common business processes — deploy in one click.',
    features: [
      'One-click deployment',
      'Industry-specific templates',
      'Customizable workflows',
      'Community-contributed',
    ],
    category: 'grid',
    order: 4,
  },
];

/**
 * Returns products split by category and sorted by order within each category.
 */
export function getProductData(): { featured: Product[]; grid: Product[] } {
  const featured = products
    .filter((p) => p.category === 'featured')
    .sort((a, b) => a.order - b.order);

  const grid = products
    .filter((p) => p.category === 'grid')
    .sort((a, b) => a.order - b.order);

  return { featured, grid };
}

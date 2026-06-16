/**
 * Use Cases Grid Component
 * 
 * Displays a responsive grid of use cases with capability tags.
 * Each use case card shows title, description, tags, and a quote.
 * 
 * @example
 * // Basic usage
 * <UseCasesGrid />
 * 
 * // With custom use cases
 * <UseCasesGrid useCases={customUseCases} />
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UseCase } from '@/types/homepage';

export interface UseCasesGridProps {
  useCases?: UseCase[];
}

const defaultUseCases: UseCase[] = [
  {
    id: "ai-blueprint",
    title: "AI Blueprint Generator",
    description: "Create comprehensive AI blueprints for your organization with our advanced diagnostic tools.",
    tags: ["AI Strategy", "Architecture", "Roadmap"],
    quote: "Transform your AI strategy with data-driven insights",
  },
  {
    id: "console-management",
    title: "Console Management",
    description: "Manage your AI workflows and monitor execution in real-time.",
    tags: ["Workflow", "Monitoring", "Analytics"],
    quote: "Real-time visibility into your AI operations",
  },
  {
    id: "performance-analytics",
    title: "Performance Analytics",
    description: "Track and measure your AI model performance with detailed metrics.",
    tags: ["Metrics", "Reporting", "Optimization"],
    quote: "Data-driven decisions for AI optimization",
  },
];

/**
 * UseCasesGrid component with responsive grid layout
 * 
 * @param useCases - Array of use cases to display (defaults to defaultUseCases)
 * 
 * @returns React component
 */
export function UseCasesGrid({ useCases = defaultUseCases }: UseCasesGridProps) {
  return (
    <section 
      id="use-cases" 
      className="py-20 bg-bg-primary"
      aria-labelledby="use-cases-title"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 
            id="use-cases-title" 
            className="text-4xl font-light text-text-primary mb-4"
          >
            What You Can Build
          </h2>
          <p className="text-text-secondary text-lg max-w-2xl mx-auto">
            Aivory helps you build AI-powered solutions tailored to your needs
          </p>
        </div>
        
        <div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          role="list"
          aria-label="Available use cases"
        >
          {useCases.map((useCase) => (
            <Card 
              key={useCase.id} 
              interactive
              className="h-full"
              aria-labelledby={`use-case-${useCase.id}-title`}
            >
              <div className="flex flex-col h-full">
                <h3 
                  id={`use-case-${useCase.id}-title`}
                  className="text-2xl font-light text-text-primary mb-4"
                >
                  {useCase.title}
                </h3>
                
                <p className="text-text-secondary mb-6 flex-grow">
                  {useCase.description}
                </p>
                
                <div className="flex flex-wrap gap-2 mb-6" role="list" aria-label="Capabilities">
                  {useCase.tags.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="info"
                      className="text-xs"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
                
                <p className="text-text-tertiary text-sm italic mt-auto pt-4 border-t border-border-subtle">
                  "{useCase.quote}"
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export default UseCasesGrid;

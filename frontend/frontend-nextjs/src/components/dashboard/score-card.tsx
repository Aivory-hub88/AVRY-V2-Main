"use client";

import { ReactNode } from "react";

/**
 * Score Card Props
 */
interface ScoreCardProps {
  title: string;
  score: number;
  maxScore?: number;
  icon?: ReactNode;
  className?: string;
}

/**
 * Score Card Component
 * Displays a readiness score with visualization
 */
export function ScoreCard({ 
  title, 
  score, 
  maxScore = 100, 
  icon,
  className = "" 
}: ScoreCardProps) {
  const percentage = Math.min(100, Math.round((score / maxScore) * 100));
  
  // Determine color based on score
  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-brand-mint";
    if (score >= 60) return "text-success";
    if (score >= 40) return "text-warning";
    return "text-error";
  };

  return (
    <div className={`bg-bg-secondary rounded-lg border border-border-default p-6 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-text-primary font-medium">{title}</h3>
        {icon && <div className="text-brand-mint">{icon}</div>}
      </div>
      
      <div className="flex items-baseline gap-2 mb-2">
        <div className={`text-4xl font-bold ${getScoreColor(score)}`}>
          {score}
        </div>
        <div className="text-text-secondary text-sm">/ {maxScore}</div>
      </div>
      
      <div className="text-text-secondary text-sm mb-4">
        {percentage}% Complete
      </div>
      
      <div className="w-full bg-bg-tertiary rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-500 ${
            percentage >= 80 ? "bg-brand-mint" :
            percentage >= 60 ? "bg-success" :
            percentage >= 40 ? "bg-warning" : "bg-error"
          }`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}

/**
 * Category Grid Item Props
 */
interface CategoryGridItemProps {
  title: string;
  score: number;
  maxScore?: number;
  description: string;
  icon?: ReactNode;
}

/**
 * Category Grid Item Component
 */
export function CategoryGridItem({ 
  title, 
  score, 
  maxScore = 100, 
  description,
  icon
}: CategoryGridItemProps) {
  const percentage = Math.min(100, Math.round((score / maxScore) * 100));
  
  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-brand-mint";
    if (score >= 60) return "text-success";
    if (score >= 40) return "text-warning";
    return "text-error";
  };

  return (
    <div className="bg-bg-secondary rounded-lg border border-border-default p-5 hover:border-brand-mint/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <h4 className="text-text-primary font-medium">{title}</h4>
        {icon && <div className="text-brand-mint">{icon}</div>}
      </div>
      
      <div className="flex items-baseline gap-2 mb-2">
        <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
          {score}
        </div>
        <div className="text-text-secondary text-xs">/ {maxScore}</div>
      </div>
      
      <p className="text-text-secondary text-sm mb-3">
        {description}
      </p>
      
      <div className="w-full bg-bg-tertiary rounded-full h-1.5">
        <div 
          className={`h-1.5 rounded-full transition-all duration-500 ${
            percentage >= 80 ? "bg-brand-mint" :
            percentage >= 60 ? "bg-success" :
            percentage >= 40 ? "bg-warning" : "bg-error"
          }`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
}

/**
 * Category Grid Props
 */
interface CategoryGridProps {
  categories: Array<{
    title: string;
    score: number;
    maxScore?: number;
    description: string;
    icon?: ReactNode;
  }>;
}

/**
 * Category Grid Component
 * Displays multiple category scores in a grid layout
 */
export function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {categories.map((category, index) => (
        <CategoryGridItem 
          key={index}
          title={category.title}
          score={category.score}
          maxScore={category.maxScore}
          description={category.description}
          icon={category.icon}
        />
      ))}
    </div>
  );
}

/**
 * Tier Card Props
 */
interface TierCardProps {
  title: string;
  description: string;
  price?: string;
  features: string[];
  isCurrent?: boolean;
  isPopular?: boolean;
  onUpgrade?: () => void;
}

/**
 * Tier Card Component
 * Displays tier information with upgrade CTA
 */
export function TierCard({ 
  title, 
  description, 
  price, 
  features, 
  isCurrent = false,
  isPopular = false,
  onUpgrade
}: TierCardProps) {
  return (
    <div className={`relative bg-bg-secondary rounded-lg border p-6 ${
      isCurrent 
        ? "border-brand-mint shadow-glow" 
        : "border-border-default"
    } ${isPopular ? "ring-2 ring-brand-purple/20" : ""}`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-brand-purple text-white text-xs font-semibold rounded-full">
          Most Popular
        </div>
      )}
      
      <h3 className="text-xl font-semibold text-text-primary mb-2">
        {title}
      </h3>
      
      <p className="text-text-secondary text-sm mb-4">
        {description}
      </p>
      
      {price && (
        <div className="mb-4">
          <div className="text-3xl font-bold text-text-primary">
            {price}
          </div>
          <div className="text-text-secondary text-sm">/ month</div>
        </div>
      )}
      
      <ul className="space-y-2 mb-6">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2 text-text-primary text-sm">
            <span className={`mt-0.5 ${isCurrent ? "text-brand-mint" : "text-text-secondary"}`}>
              {isCurrent ? "✓" : "•"}
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      
      {onUpgrade && !isCurrent && (
        <button
          onClick={onUpgrade}
          className="w-full py-2 px-4 bg-brand-mint text-bg-primary font-semibold rounded-lg hover:bg-brand-mint-hover transition-colors"
        >
          Upgrade Now
        </button>
      )}
      
      {isCurrent && (
        <div className="w-full py-2 px-4 bg-bg-tertiary text-text-secondary font-semibold rounded-lg text-center">
          Current Tier
        </div>
      )}
    </div>
  );
}

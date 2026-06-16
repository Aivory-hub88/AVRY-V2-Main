/**
 * Diagnostic Questions Library
 * Defines all diagnostic questions and scoring logic
 */

/**
 * Question type
 */
export type QuestionType = "single-choice" | "multi-choice" | "scale";

/**
 * Section type
 */
export type DiagnosticSection = "strategy" | "technology" | "people" | "execution";

/**
 * Diagnostic question interface
 */
export interface DiagnosticQuestion {
  id: string;
  section: DiagnosticSection;
  question: string;
  description?: string;
  type: QuestionType;
  options?: Array<{ label: string; value: number }>;
  min?: number;
  max?: number;
  step?: number;
  scoreWeight: number;
  required?: boolean;
}

/**
 * Free diagnostic questions (12 total)
 */
export const FREE_DIAGNOSTIC_QUESTIONS: DiagnosticQuestion[] = [
  // Strategy (3 questions)
  {
    id: "q_strategy_1",
    section: "strategy",
    question: "How clearly defined is your organization's AI strategy?",
    description: "Consider alignment with business goals and executive commitment",
    type: "single-choice",
    options: [
      { label: "No formal AI strategy", value: 0 },
      { label: "Strategy in early stages", value: 1 },
      { label: "Documented strategy with some execution", value: 2 },
      { label: "Well-defined strategy with clear roadmap", value: 3 },
      { label: "Strategy actively executed and measured", value: 4 },
    ],
    scoreWeight: 25,
    required: true,
  },
  {
    id: "q_strategy_2",
    section: "strategy",
    question: "What is your current level of AI investment?",
    description: "Including tools, infrastructure, and personnel",
    type: "single-choice",
    options: [
      { label: "No AI investment", value: 0 },
      { label: "Minimal exploration phase", value: 1 },
      { label: "Moderate investments in select areas", value: 2 },
      { label: "Significant across multiple initiatives", value: 3 },
      { label: "Major strategic investment across organization", value: 4 },
    ],
    scoreWeight: 25,
    required: true,
  },
  {
    id: "q_strategy_3",
    section: "strategy",
    question: "How mature is your AI governance and ethics framework?",
    description: "Including policies, oversight, and ethical guidelines",
    type: "single-choice",
    options: [
      { label: "No formal governance", value: 0 },
      { label: "Ad-hoc governance approach", value: 1 },
      { label: "Emerging formal governance", value: 2 },
      { label: "Established governance with oversight", value: 3 },
      { label: "Comprehensive governance aligned to industry standards", value: 4 },
    ],
    scoreWeight: 25,
    required: true,
  },

  // Technology (3 questions)
  {
    id: "q_tech_1",
    section: "technology",
    question: "What is the maturity of your data infrastructure?",
    description: "Consider data quality, accessibility, and governance",
    type: "single-choice",
    options: [
      { label: "Legacy systems with data silos", value: 0 },
      { label: "Some data integration, limited quality", value: 1 },
      { label: "Moderate data infrastructure, some governance", value: 2 },
      { label: "Modern data platforms with good governance", value: 3 },
      { label: "Enterprise-grade data infrastructure", value: 4 },
    ],
    scoreWeight: 25,
    required: true,
  },
  {
    id: "q_tech_2",
    section: "technology",
    question: "What is your cloud adoption level?",
    description: "Including infrastructure, applications, and analytics",
    type: "single-choice",
    options: [
      { label: "No cloud adoption", value: 0 },
      { label: "Limited cloud usage (IaaS only)", value: 1 },
      { label: "Moderate cloud adoption (multi-service)", value: 2 },
      { label: "Significant cloud presence", value: 3 },
      { label: "Cloud-native architecture", value: 4 },
    ],
    scoreWeight: 25,
    required: true,
  },
  {
    id: "q_tech_3",
    section: "technology",
    question: "How ready are you with ML/AI tools and platforms?",
    description: "Including ML frameworks, AI platforms, and automation tools",
    type: "single-choice",
    options: [
      { label: "No ML/AI tools in use", value: 0 },
      { label: "Limited experimentation with open-source", value: 1 },
      { label: "Some commercial AI tools deployed", value: 2 },
      { label: "Multiple AI platforms in use", value: 3 },
      { label: "Comprehensive AI/ML technology stack", value: 4 },
    ],
    scoreWeight: 25,
    required: true,
  },

  // People (3 questions)
  {
    id: "q_people_1",
    section: "people",
    question: "How available is AI talent in your organization?",
    description: "Including data scientists, engineers, and AI specialists",
    type: "single-choice",
    options: [
      { label: "No AI talent available", value: 0 },
      { label: "Very limited, mostly external consultants", value: 1 },
      { label: "Some internal talent, some gaps", value: 2 },
      { label: "Solid team with minor skill gaps", value: 3 },
      { label: "Strong in-house AI expertise", value: 4 },
    ],
    scoreWeight: 25,
    required: true,
  },
  {
    id: "q_people_2",
    section: "people",
    question: "What is your assessment of skill gaps for AI adoption?",
    description: "Across technical and business teams",
    type: "single-choice",
    options: [
      { label: "Significant gaps, limited awareness", value: 0 },
      { label: "Major gaps in key areas", value: 1 },
      { label: "Moderate gaps, some training plans", value: 2 },
      { label: "Minor gaps with active training", value: 3 },
      { label: "Well-equipped team, continuous learning", value: 4 },
    ],
    scoreWeight: 25,
    required: true,
  },
  {
    id: "q_people_3",
    section: "people",
    question: "Do you have formal AI training programs?",
    description: "Including executive awareness and technical training",
    type: "single-choice",
    options: [
      { label: "No formal training programs", value: 0 },
      { label: "Ad-hoc training and courses", value: 1 },
      { label: "Some formal programs, inconsistent", value: 2 },
      { label: "Established training programs", value: 3 },
      { label: "Comprehensive, continuous learning programs", value: 4 },
    ],
    scoreWeight: 25,
    required: true,
  },

  // Execution (3 questions)
  {
    id: "q_exec_1",
    section: "execution",
    question: "How mature are your innovation and experimentation processes?",
    description: "Including agile, experimentation culture, and innovation labs",
    type: "single-choice",
    options: [
      { label: "Rigid, waterfall-based processes", value: 0 },
      { label: "Some agile adoption, limited experimentation", value: 1 },
      { label: "Emerging innovation culture", value: 2 },
      { label: "Well-established innovation processes", value: 3 },
      { label: "Innovation-driven culture with rapid iteration", value: 4 },
    ],
    scoreWeight: 25,
    required: true,
  },
  {
    id: "q_exec_2",
    section: "execution",
    question: "How do you currently manage AI-related risks?",
    description: "Including bias, security, compliance, and operational risks",
    type: "single-choice",
    options: [
      { label: "No formal risk management", value: 0 },
      { label: "Basic risk awareness, no formal process", value: 1 },
      { label: "Emerging risk management practices", value: 2 },
      { label: "Established risk management framework", value: 3 },
      { label: "Comprehensive risk management with monitoring", value: 4 },
    ],
    scoreWeight: 25,
    required: true,
  },
  {
    id: "q_exec_3",
    section: "execution",
    question: "Have you identified quick wins or pilot AI projects?",
    description: "Projects that could deliver value in 3-6 months",
    type: "single-choice",
    options: [
      { label: "No identified opportunities", value: 0 },
      { label: "Some ideas, not well-defined", value: 1 },
      { label: "Defined pilots with moderate potential", value: 2 },
      { label: "Clear quick wins identified and ready", value: 3 },
      { label: "Already executing successful pilots", value: 4 },
    ],
    scoreWeight: 25,
    required: true,
  },
];

/**
 * Calculate diagnostic score
 * @param answers - Object with question IDs as keys and answers as values
 * @returns Score 0-100
 */
export function calculateDiagnosticScore(answers: Record<string, number>): number {
  let totalScore = 0;
  let totalWeight = 0;

  for (const question of FREE_DIAGNOSTIC_QUESTIONS) {
    const answer = answers[question.id];
    if (answer !== undefined && answer !== null) {
      // Normalize answer to 0-4 scale
      let normalizedAnswer = answer;
      if (question.type === "scale" && question.max) {
        normalizedAnswer = (answer / question.max) * 4;
      }
      totalScore += normalizedAnswer * question.scoreWeight;
      totalWeight += question.scoreWeight;
    }
  }

  // Calculate percentage (0-100)
  const score = totalWeight > 0 ? (totalScore / (totalWeight * 4)) * 100 : 0;
  return Math.round(score);
}

/**
 * Get category from score
 * @param score - Score 0-100
 * @returns Category name
 */
export function getCategory(score: number): "Foundational" | "Emerging" | "Established" | "Advanced" {
  if (score >= 80) return "Advanced";
  if (score >= 60) return "Established";
  if (score >= 40) return "Emerging";
  return "Foundational";
}

/**
 * Get category explanation
 * @param score - Score 0-100
 * @returns Explanation text
 */
export function getCategoryExplanation(score: number): string {
  if (score >= 80) {
    return "Excellent! Your organization is well-prepared for AI adoption. You have a strong foundation across strategy, technology, people, and execution.";
  }
  if (score >= 60) {
    return "Good! Your organization has a solid foundation for AI adoption. Focus on addressing key gaps to accelerate your AI maturity.";
  }
  if (score >= 40) {
    return "Fair! Your organization can benefit from AI with focused preparation. Start with foundational elements before advanced initiatives.";
  }
  return "Needs Improvement! Your organization should focus on building AI readiness fundamentals before major transformation.";
}

/**
 * Get recommendations based on score
 * @param score - Score 0-100
 * @returns Array of recommendation strings
 */
export function getRecommendations(score: number): string[] {
  const recommendations: string[] = [];

  if (score >= 80) {
    recommendations.push(
      "You're ready for advanced AI solutions. Consider AI Blueprint for comprehensive implementation planning.",
      "Explore innovative use cases to drive competitive advantage.",
      "Establish centers of excellence to scale AI across the organization.",
      "Focus on governance and ethical AI practices as you scale."
    );
  } else if (score >= 60) {
    recommendations.push(
      "Your foundation is solid. Start with AI Snapshot to get detailed insights.",
      "Prioritize closing identified gaps in your weakest areas.",
      "Build internal capability and reduce reliance on external consultants.",
      "Launch pilot projects to build momentum and demonstrate value."
    );
  } else if (score >= 40) {
    recommendations.push(
      "Focus on modernizing your data infrastructure.",
      "Build your AI talent pipeline through hiring and training.",
      "Develop a clear, executive-aligned AI strategy.",
      "Start with low-risk pilot projects to build organizational confidence."
    );
  } else {
    recommendations.push(
      "Begin with AI education and awareness programs for leadership.",
      "Establish basic data governance and infrastructure foundations.",
      "Start recruiting or training your first AI team members.",
      "Identify one high-impact quick win to demonstrate AI value.",
      "Develop a realistic 12-24 month AI maturity roadmap."
    );
  }

  return recommendations;
}

/**
 * Get insights based on answers
 * @param answers - Object with question IDs as keys and answers as values
 * @returns Array of insight strings
 */
export function getInsights(answers: Record<string, number>): string[] {
  const insights: string[] = [];

  // Calculate section averages
  const sectionScores: Record<DiagnosticSection, { total: number; count: number }> = {
    strategy: { total: 0, count: 0 },
    technology: { total: 0, count: 0 },
    people: { total: 0, count: 0 },
    execution: { total: 0, count: 0 },
  };

  for (const question of FREE_DIAGNOSTIC_QUESTIONS) {
    const answer = answers[question.id];
    if (answer !== undefined && answer !== null) {
      let normalizedAnswer = answer;
      if (question.type === "scale" && question.max) {
        normalizedAnswer = (answer / question.max) * 4;
      }
      sectionScores[question.section].total += normalizedAnswer;
      sectionScores[question.section].count += 1;
    }
  }

  // Identify strengths and weaknesses
  const avgScores = Object.entries(sectionScores).map(([section, data]) => ({
    section,
    avg: data.count > 0 ? data.total / data.count : 0,
  }));

  const strongest = avgScores.sort((a, b) => b.avg - a.avg)[0];
  const weakest = avgScores.sort((a, b) => a.avg - b.avg)[0];

  if (strongest) {
    const strengthText = {
      strategy: "strong strategic alignment and leadership support",
      technology: "solid technology foundation and infrastructure",
      people: "strong talent and organizational readiness",
      execution: "mature execution capabilities and processes",
    };
    insights.push(`✓ Strength: Your ${strongest.section} area shows ${strengthText[strongest.section as DiagnosticSection]}.`);
  }

  if (weakest && weakest.avg < 3) {
    const weaknessText = {
      strategy: "clarifying AI strategy and alignment",
      technology: "modernizing technology infrastructure",
      people: "building AI talent and skills",
      execution: "establishing clear execution frameworks",
    };
    insights.push(`↑ Opportunity: Focus on ${weaknessText[weakest.section as DiagnosticSection]}.`);
  }

  return insights;
}

/**
 * Validate all answers are provided
 * @param answers - Object with question IDs as keys and answers as values
 * @returns True if all required questions answered
 */
export function validateAnswers(answers: Record<string, number>): boolean {
  for (const question of FREE_DIAGNOSTIC_QUESTIONS) {
    if (question.required && (answers[question.id] === undefined || answers[question.id] === null)) {
      return false;
    }
  }
  return true;
}

/**
 * Get list of unanswered required questions
 * @param answers - Object with question IDs as keys and answers as values
 * @returns Array of question IDs
 */
export function getUnansweredQuestions(answers: Record<string, number>): string[] {
  return FREE_DIAGNOSTIC_QUESTIONS.filter(
    (q) => q.required && (answers[q.id] === undefined || answers[q.id] === null)
  ).map((q) => q.id);
}

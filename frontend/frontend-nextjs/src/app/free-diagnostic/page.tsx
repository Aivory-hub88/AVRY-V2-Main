'use client';

import { useState, useRef, useCallback, type ReactNode } from 'react';

// ============================================================================
// TYPES
// ============================================================================
type Step = 'profile' | 'question' | 'results';

interface Question {
  id: string;
  question: string;
  options: string[];
}

interface DimensionInfo {
  id: string;
  label: string;
  score: number;
  weight: number;
}

interface InsightItem {
  title: string;
  desc: string;
  type: 'strength' | 'blocker';
}

// ============================================================================
// DATA
// ============================================================================
const QUESTIONS: Question[] = [
  { id: 'business_objective', question: 'What is your primary business objective for AI?', options: ['No clear goal yet', 'Vague / directional goals', 'Specific goal defined', 'Quantified goal with KPIs'] },
  { id: 'current_ai_usage', question: 'Where is your organization on AI today?', options: ['No AI usage at all', 'Exploring / reading about it', 'Running pilots or experiments', 'AI deployed in production'] },
  { id: 'data_availability', question: 'How is your business data organized and accessible?', options: ['No centralized data', 'Siloed across systems', 'Partially centralized', 'Fully centralized and clean'] },
  { id: 'process_documentation', question: 'How well are your business processes documented?', options: ['Nothing documented', "Informal / in people's heads", 'Some SOPs exist', 'Comprehensive SOPs and runbooks'] },
  { id: 'workflow_standardization', question: 'How standardized are your day-to-day workflows?', options: ['Ad-hoc, varies per person', 'Some consistency', 'Mostly standardized', 'Fully standardized across teams'] },
  { id: 'erp_integration', question: 'How integrated are your core business systems (ERP, CRM, etc.)?', options: ['No systems in place', 'Disconnected / manual sync', 'Partially integrated', 'Fully integrated with APIs'] },
  { id: 'automation_level', question: 'What percentage of repetitive tasks are currently automated?', options: ['Fully manual', 'Less than 10%', '10–50% automated', 'Over 50% automated'] },
  { id: 'decision_speed', question: 'How quickly does your team make key business decisions?', options: ['Takes months', 'Takes weeks', 'Takes days', 'Same day or within hours'] },
  { id: 'leadership_alignment', question: 'How aligned is your leadership team on AI adoption?', options: ['No alignment or interest', 'Some interest, not committed', 'Supportive and budgeting', 'Actively championing AI'] },
  { id: 'budget_ownership', question: 'What is your current budget situation for AI investment?', options: ['No budget discussed', 'Exploring options', 'Budget allocated', 'Dedicated AI budget with an owner'] },
  { id: 'change_readiness', question: 'How open is your organization to changing how work gets done?', options: ['Resistant to change', 'Cautious', 'Open to it', 'Actively embracing change'] },
  { id: 'internal_capability', question: "How strong is your internal team's AI or technical capability?", options: ['No technical team', 'Limited digital skills', 'Some AI exposure', 'Dedicated AI / data team'] },
];

const WEIGHTS: Record<string, number> = {
  business_objective: 1.5, current_ai_usage: 1.0, data_availability: 1.5,
  process_documentation: 1.0, workflow_standardization: 1.0, erp_integration: 0.8,
  automation_level: 1.2, decision_speed: 0.8, leadership_alignment: 1.5,
  budget_ownership: 1.2, change_readiness: 1.0, internal_capability: 1.2,
};
const MAX_RAW = 43.5;

const DIMENSION_LABELS: Record<string, string> = {
  business_objective: 'Business Objective', current_ai_usage: 'Current AI Usage',
  data_availability: 'Data Availability', process_documentation: 'Process Documentation',
  workflow_standardization: 'Workflow Standardization', erp_integration: 'System Integration',
  automation_level: 'Automation Level', decision_speed: 'Decision Speed',
  leadership_alignment: 'Leadership Alignment', budget_ownership: 'Budget Ownership',
  change_readiness: 'Change Readiness', internal_capability: 'Internal Capability',
};

const INDUSTRIES = [
  { value: '', label: 'Select industry...' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'retail', label: 'Retail & e-commerce' },
  { value: 'financial', label: 'Financial services' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'logistics', label: 'Logistics & supply chain' },
  { value: 'professional', label: 'Professional services' },
  { value: 'property', label: 'Property & construction' },
  { value: 'technology', label: 'Technology' },
  { value: 'education', label: 'Education' },
  { value: 'other', label: 'Other' },
];

const SIZES = [
  { value: '', label: 'Select company size...' },
  { value: 'micro', label: '1–10 (Micro)' },
  { value: 'small', label: '11–50 (Small)' },
  { value: 'medium', label: '51–200 (Medium)' },
  { value: 'large', label: '201–1000 (Large)' },
  { value: 'enterprise', label: '1000+ (Enterprise)' },
];

const MATURITY_STAGES = ['Initial', 'Developing', 'Defined', 'Managed', 'Optimizing'];
const FALLBACK_BLOCKER_IDS = ['business_objective', 'decision_speed', 'erp_integration'];

const INSIGHT_DESCRIPTIONS: Record<string, { strength: string; blocker: string }> = {
  business_objective: {
    strength: "Clear, quantified AI objectives ensure every project aligns directly with bottom-line revenue and operational efficiency.",
    blocker: "Without clear, quantified KPIs, AI projects risk becoming disconnected science experiments with no measurable ROI."
  },
  current_ai_usage: {
    strength: "Active AI deployment creates internal momentum, upskills teams, and establishes proven operational frameworks.",
    blocker: "Staying in the exploratory phase while competitors deploy AI creates an expanding operational capability gap."
  },
  data_availability: {
    strength: "Centralized, clean data pipelines provide the essential fuel needed for advanced AI models and automated workflows.",
    blocker: "Data siloed across legacy systems prevents AI from seeing the full operational picture, limiting ROI significantly."
  },
  process_documentation: {
    strength: "Comprehensive SOPs and runbooks make it easy to identify automation bottlenecks and deploy agentic workflows.",
    blocker: "Informal, undocumented processes make it nearly impossible to map and automate complex operational workflows."
  },
  workflow_standardization: {
    strength: "Standardized day-to-day workflows allow AI solutions to scale seamlessly across multiple teams and departments.",
    blocker: "Ad-hoc, inconsistent workflows mean AI solutions must be custom-tailored for individual users, destroying scalability."
  },
  erp_integration: {
    strength: "Fully integrated core systems via APIs allow AI agents to take direct action and synchronize data instantly.",
    blocker: "Disconnected systems require manual data entry and synchronization, creating friction that negates automation gains."
  },
  automation_level: {
    strength: "High automation of repetitive tasks frees up valuable human capital for high-leverage strategic initiatives.",
    blocker: "Heavy reliance on manual, repetitive tasks drains team energy and creates unnecessary operational overhead."
  },
  decision_speed: {
    strength: "Rapid decision-making cycles allow your organization to iterate quickly and capitalize on new AI advancements.",
    blocker: "Slow, bureaucratic decision loops prevent your team from deploying and iterating on AI solutions effectively."
  },
  leadership_alignment: {
    strength: "Your C-suite is actively championing AI adoption, this is the hardest thing to build and you have it.",
    blocker: "Lack of leadership buy-in and alignment starves AI initiatives of the essential resources and strategic focus needed."
  },
  budget_ownership: {
    strength: "Dedicated AI budget with clear ownership ensures continuous funding and accountability for strategic deployment.",
    blocker: "Without a dedicated AI budget or clear ownership, initiatives get stalled in endless financial approval cycles."
  },
  change_readiness: {
    strength: "An organization open to embracing change can seamlessly adopt AI-driven operating models without cultural friction.",
    blocker: "Internal resistance to change creates cultural inertia that can sabotage even the most well-designed AI tools."
  },
  internal_capability: {
    strength: "Strong internal technical capability enables rapid prototyping, custom integration, and secure AI governance.",
    blocker: "Limited internal digital capability forces over-reliance on external vendors and slows down execution speed."
  }
};

// ============================================================================
// SCORING ENGINE
// ============================================================================
function computeScore(answers: Record<string, number>): number {
  let rawScore = 0;
  for (const [dim, val] of Object.entries(answers)) {
    rawScore += val * (WEIGHTS[dim] || 1.0);
  }
  return Math.round((rawScore / MAX_RAW) * 100);
}

function getMaturityLevel(score: number): string {
  if (score <= 39) return 'Initial';
  if (score <= 59) return 'Developing';
  if (score <= 74) return 'Defined';
  if (score <= 89) return 'Managed';
  return 'Optimizing';
}

function getMaturityIndicatorPercent(level: string): number {
  const stageIndex = Math.max(0, MATURITY_STAGES.indexOf(level));
  return ((stageIndex + 0.5) / MATURITY_STAGES.length) * 100;
}

function getFramingSentence(level: string, score: number): string {
  const sentences: Record<string, string> = {
    Initial: `A score of ${score}/100 means you're at the starting line — but that's a valid place to begin.`,
    Developing: `At ${score}/100, the foundation is forming. Focus on quick wins to build momentum.`,
    Defined: `${score}/100 — solid ground. You're ready to move from experiments to structured implementation.`,
    Managed: `${score}/100 puts you ahead of most. Time to scale what's working and optimize further.`,
    Optimizing: `${score}/100 — elite territory. AI is part of your operational DNA.`
  };
  return sentences[level] || '';
}

function getTopAndBottom(answers: Record<string, number>): { top: DimensionInfo[]; bottom: DimensionInfo[] } {
  const dims: DimensionInfo[] = Object.entries(answers).map(([id, score]) => ({
    id, score, label: DIMENSION_LABELS[id] || id, weight: WEIGHTS[id] || 1
  }));
  dims.sort((a, b) => b.score !== a.score ? b.score - a.score : b.weight - a.weight);
  return { top: dims.slice(0, 3), bottom: dims.slice(-3).reverse() };
}

function getStrengths(answers: Record<string, number>): DimensionInfo[] {
  return Object.entries(answers)
    .filter(([, v]) => v >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, score]) => ({ id, label: DIMENSION_LABELS[id] || id, score, weight: WEIGHTS[id] || 1 }));
}

function getBlockers(answers: Record<string, number>): DimensionInfo[] {
  const scoredBlockers: DimensionInfo[] = Object.entries(answers)
    .filter(([, v]) => v <= 1)
    .sort((a, b) => a[1] !== b[1] ? a[1] - b[1] : (WEIGHTS[b[0]] || 1) - (WEIGHTS[a[0]] || 1))
    .map(([id, score]) => ({ id, label: DIMENSION_LABELS[id] || id, score, weight: WEIGHTS[id] || 1 }));

  for (const id of FALLBACK_BLOCKER_IDS) {
    if (scoredBlockers.length >= 3) break;
    if (scoredBlockers.some(item => item.id === id)) continue;
    if ((answers[id] ?? 3) > 1) continue;
    scoredBlockers.push({ id, label: DIMENSION_LABELS[id] || id, score: answers[id] ?? 1, weight: WEIGHTS[id] || 1 });
  }

  return scoredBlockers.slice(0, 3);
}

function getImprovementAreas(answers: Record<string, number>, blockers: DimensionInfo[]): DimensionInfo[] {
  if (blockers.length) return blockers;
  return Object.entries(answers)
    .filter(([, score]) => score < 3)
    .sort((a, b) => a[1] !== b[1] ? a[1] - b[1] : (WEIGHTS[b[0]] || 1) - (WEIGHTS[a[0]] || 1))
    .slice(0, 2)
    .map(([id, score]) => ({ id, label: DIMENSION_LABELS[id] || id, score, weight: WEIGHTS[id] || 1 }));
}

function getQuickNote(score: number, maturity: string, strengths: DimensionInfo[], improvementAreas: DimensionInfo[]): { title: string; body: string } {
  const strongest = strengths[0];
  const improvementText = improvementAreas.map(item => `${item.label} (${item.score}/3)`).join(', ');

  if (!improvementAreas.length) {
    return {
      title: `Quick note: ${score}/100 — ${maturity}`,
      body: `All tracked dimensions are scoring strongly. ${strongest ? `${strongest.label} is the clearest current strength.` : 'The current answers show a balanced AI readiness base.'}`
    };
  }

  return {
    title: `Quick note: ${score}/100 — ${maturity}`,
    body: `${strongest ? `Strongest signal: ${strongest.label} (${strongest.score}/3). ` : ''}Needs improvement: ${improvementText}.`
  };
}

function getNarrative(companyName: string, score: number, maturity: string): string {
  const templates: Record<string, string> = {
    Initial: `For ${companyName}, the current score of ${score}/100 indicates an early stage of AI readiness. This is a valid starting point — many successful organizations began here. The recommendation is to start with one small, well-scoped pilot, measure results, then scale gradually.`,
    Developing: `For ${companyName}, a score of ${score}/100 shows the foundation is beginning to take shape, but critical gaps remain. Organizations at this stage benefit most from quick wins — choose an AI use case where ROI can be demonstrated within 30–90 days.`,
    Defined: `For ${companyName}, a score of ${score}/100 indicates solid readiness — processes are defined and several foundations are in place. This is the right moment to move from experimentation to structured implementation with measurable business targets.`,
    Managed: `For ${companyName}, a score of ${score}/100 reflects advanced maturity — AI is managed and delivering real value. The next step is expanding into more complex use cases and building tighter ROI monitoring systems.`,
    Optimizing: `For ${companyName}, a score of ${score}/100 places you among elite organizations that have made AI a core part of their operational DNA. The focus now is generative AI, agentic workflows, and AI-driven competitive differentiation.`
  };
  return templates[maturity] || '';
}

// Bolds the score fraction and day-range callouts inside the narrative
// (e.g. "42/100", "30–90 days"), matching the reference design's emphasis.
function renderNotesWithBold(text: string): ReactNode[] {
  const parts = text.split(/(\d+\/100|\d+(?:–\d+)?\s*days)/g);
  return parts.map((part, i) => (/^\d+\/100$|days$/.test(part) ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>));
}

function generateDiagnosticId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let r = '';
  for (let i = 0; i < 8; i++) r += chars.charAt(Math.floor(Math.random() * chars.length));
  return 'DIAG_' + r;
}


// ============================================================================
// COMPONENT
// ============================================================================
export default function FreeDiagnosticPage() {
  const [step, setStep] = useState<Step>('profile');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [companyName, setCompanyName] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [industry, setIndustry] = useState('');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [downloading, setDownloading] = useState(false);

  const slide1Ref = useRef<HTMLDivElement>(null);
  const slide2Ref = useRef<HTMLDivElement>(null);

  const isProfileValid = companyName.trim().length >= 2 && companySize !== '' && industry !== '';

  const handleProfileContinue = () => {
    if (!isProfileValid) return;
    setStep('question');
    setQuestionIndex(0);
  };

  const handleOptionSelect = (idx: number) => {
    const q = QUESTIONS[questionIndex];
    setAnswers(prev => ({ ...prev, [q.id]: idx }));
  };

  const handleBack = () => {
    if (questionIndex === 0) {
      setStep('profile');
    } else {
      setQuestionIndex(i => i - 1);
    }
  };

  const handleNext = () => {
    const q = QUESTIONS[questionIndex];
    if (answers[q.id] === undefined) return;
    if (questionIndex < 11) {
      setQuestionIndex(i => i + 1);
    } else {
      setStep('results');
    }
  };

  const downloadDiagnosticCards = useCallback(async () => {
    setDownloading(true);
    try {
      const { toPng } = await import('html-to-image');
      const slides = [
        { ref: slide1Ref, suffix: 'Card_1' },
        { ref: slide2Ref, suffix: 'Card_2' },
      ];

      // document.fonts.ready only resolves fonts the page has *already*
      // triggered a load for — if a specific weight (e.g. Doto 600) hasn't
      // been rendered anywhere yet when this runs, it can resolve before
      // that weight is actually available, and html-to-image captures
      // whatever the browser falls back to. Explicitly request every
      // family/weight the card actually uses before capturing.
      const fontSpecs = [
        '400 16px Manrope', '500 16px Manrope', '600 16px Manrope', '700 16px Manrope',
        '400 16px Doto', '600 16px Doto', '700 16px Doto',
      ];
      await Promise.all(fontSpecs.map(spec => document.fonts.load(spec)));
      await document.fonts.ready;

      for (const slide of slides) {
        const node = slide.ref.current;
        if (!node) continue;

        // html-to-image renders through the browser's own engine (SVG
        // foreignObject), so text baselines, ellipsis, line-clamp and web
        // fonts come out exactly as on screen — unlike html2canvas.
        const dataUrl = await toPng(node, {
          width: 1080,
          height: 1350,
          pixelRatio: 3,
          backgroundColor: '#f2f0ea',
          cacheBust: true,
          // Capture the node at its native size, ignoring the preview
          // transform:scale applied by the parent wrapper.
          style: {
            transform: 'none',
            transformOrigin: 'top left',
            margin: '0',
          },
        });

        const link = document.createElement('a');
        link.download = `${companyName.trim() || 'Company'}_AI_Diagnostic_${slide.suffix}.png`;
        link.href = dataUrl;
        link.click();

        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    } catch (err) {
      console.error('Failed to generate images:', err);
      alert('Failed to generate images. Please try again.');
    } finally {
      setDownloading(false);
    }
  }, [companyName]);

  // Compute results
  const score = computeScore(answers);
  const maturity = getMaturityLevel(score);
  const { top, bottom } = getTopAndBottom(answers);
  const strengths = getStrengths(answers);
  const blockers = getBlockers(answers);
  const improvementAreas = getImprovementAreas(answers, blockers);
  const quickNote = getQuickNote(score, maturity, strengths, improvementAreas);
  const indicatorPercent = getMaturityIndicatorPercent(maturity);
  const industryLabel = INDUSTRIES.find(i => i.value === industry)?.label || industry;
  const sizeLabel = SIZES.find(s => s.value === companySize)?.label || companySize;

  // Build insight items for slide 2
  const insightItems: InsightItem[] = [];
  const primaryStrength = strengths[0] || (top[0]?.score >= 2 ? top[0] : null);
  if (primaryStrength) {
    insightItems.push({
      title: primaryStrength.label,
      desc: INSIGHT_DESCRIPTIONS[primaryStrength.id]?.strength || "Strong capability in this dimension provides a solid foundation for scaling AI initiatives.",
      type: 'strength'
    });
  }
  blockers.forEach((blocker, index) => {
    if (insightItems.length >= 3) return;
    insightItems.push({
      title: blocker.label,
      desc: INSIGHT_DESCRIPTIONS[blocker.id]?.blocker || (index === 0
        ? "Critical gap in this area creates operational friction that must be addressed to ensure AI success."
        : "Addressing this constraint will unlock significant efficiency gains and improve overall AI readiness."),
      type: 'blocker'
    });
  });
  if (insightItems.length < 3) {
    const secondaryStrength = strengths.find(item => !insightItems.some(ins => ins.title === item.label));
    if (secondaryStrength) {
      insightItems.push({ title: secondaryStrength.label, desc: INSIGHT_DESCRIPTIONS[secondaryStrength.id]?.strength || "Solid performance here accelerates your ability to deploy practical AI initiatives.", type: 'strength' });
    }
  }

  const PREVIEW_SCALE = 0.6;
  const previewWidth = 1080 * PREVIEW_SCALE;
  const previewHeight = 1350 * PREVIEW_SCALE;

  return (
    <div className={`diagnostic-app ${step === 'results' ? 'results-mode' : ''}`}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      
      {/* Close button */}
      <a href="/" className="close-diagnostic-btn" title="Close Diagnostic" aria-label="Close Diagnostic">✕</a>
        {/* ===== PROFILE STEP ===== */}
        {step === 'profile' && (
          <>
            <div className="progress-bar-container">
              <div className="progress-bar-fill" style={{ width: '0%' }} />
            </div>
            <div className="step-container" key="profile">
              <div className="profile-header">
                <h1>Let&apos;s start with your company</h1>
                <p>This helps us tailor the diagnostic to your context.</p>
              </div>
              <div className="form-group">
                <label htmlFor="company-name">Company name</label>
                <input
                  type="text"
                  id="company-name"
                  placeholder="e.g. PT Maju Bersama"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="company-size">Company size</label>
                <select id="company-size" value={companySize} onChange={e => setCompanySize(e.target.value)}>
                  {SIZES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="industry">Industry</label>
                <select id="industry" value={industry} onChange={e => setIndustry(e.target.value)}>
                  {INDUSTRIES.map(i => (
                    <option key={i.value} value={i.value}>{i.label}</option>
                  ))}
                </select>
              </div>
              <button className="btn-primary" disabled={!isProfileValid} onClick={handleProfileContinue}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', marginRight: 4 }}><path d="M7 7l10 10M17 7v10H7" /></svg>
                Continue
              </button>
            </div>
          </>
        )}

        {/* ===== QUESTION STEP ===== */}
        {step === 'question' && (() => {
          const q = QUESTIONS[questionIndex];
          const totalSteps = QUESTIONS.length + 1;
          const progress = ((questionIndex + 1) / totalSteps) * 100;
          const selectedAnswer = answers[q.id];

          return (
            <>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="step-container" key={`q${questionIndex}`}>
                <div className="question-header">
                  <div className="question-number">Question {questionIndex + 1} of 12</div>
                  <div className="question-text">{q.question}</div>
                </div>
                <div className="options-list">
                  {q.options.map((opt, i) => (
                    <div
                      key={i}
                      className={`option-card ${selectedAnswer === i ? 'selected' : ''}`}
                      onClick={() => handleOptionSelect(i)}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
                <div className="nav-row">
                  <button className="btn-back" onClick={handleBack}>
                    {questionIndex === 0 ? '← Back to profile' : '← Previous'}
                  </button>
                  <button
                    className="btn-next"
                    disabled={selectedAnswer === undefined}
                    onClick={handleNext}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', marginRight: 4 }}><path d="M7 7l10 10M17 7v10H7" /></svg>
                    {questionIndex === 11 ? 'See results' : 'Next'}
                  </button>
                </div>
              </div>
            </>
          );
        })()}

        {/* ===== RESULTS STEP ===== */}
        {step === 'results' && (
          <>
            {/* Action Header */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1.5rem' }}>Your AI Readiness Diagnostic Report</h1>
              <button
                className="btn-primary"
                onClick={downloadDiagnosticCards}
                disabled={downloading}
                style={{ maxWidth: 400, margin: '0 auto' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                {downloading ? 'Generating PNGs...' : 'Download Diagnostic Cards (PNG)'}
              </button>
            </div>

            {/* Card Previews */}
            <div className="ig-preview-area" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40, marginBottom: 60, width: '100%' }}>

              {/* Slide 1 */}
              <div className="ig-slide-wrapper" style={{ width: previewWidth, height: previewHeight, maxWidth: '100%', overflow: 'auto', display: 'flex', justifyContent: 'flex-start', background: '#ffffff', padding: 0, border: '1px solid #d8e0e0', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <div style={{ width: 1080, height: 1350, flexShrink: 0, transform: `scale(${PREVIEW_SCALE})`, transformOrigin: 'top left' }}>
                  <div ref={slide1Ref} id="ig-slide-1" style={{ width: 1080, height: 1350, overflow: 'hidden', background: 'radial-gradient(120% 90% at 28% 0%, #ffffff 0%, #fbfaf7 45%, #f2f0ea 100%)', padding: '80px 90px 100px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontFamily: "var(--font-manrope), 'Manrope', sans-serif", color: '#111111', position: 'relative' }}>
                    <div>
                      {/* Header — logo left, title right, matching the report spec */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/Aivory_Signature_Grey.svg" alt="Aivory" style={{ height: '46px', width: 'auto', display: 'block', flexShrink: 0 }} />
                        <div style={{ fontSize: 28, fontWeight: 400, lineHeight: 1.35, color: '#111', textAlign: 'right', textTransform: 'uppercase' }}>Quick Assessment<br />of AI Readiness</div>
                      </div>
                      <div style={{ borderBottom: '1px solid #111', marginBottom: 32 }} />

                      {/* Company info grid */}
                      <div style={{ paddingBottom: 22, marginBottom: 40, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, overflow: 'hidden' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#111', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Company Name<div style={{ fontSize: 18, fontWeight: 400, color: '#333', marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{companyName.trim() || 'Acme Industry LLC'}</div></div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#111', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Industry Category<div style={{ fontSize: 18, fontWeight: 400, color: '#333', marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{industryLabel}</div></div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#111', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Industry Size<div style={{ fontSize: 18, fontWeight: 400, color: '#333', marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sizeLabel}</div></div>
                      </div>

                      {/* Score section — no box, soft tactile dial */}
                      <div style={{ marginBottom: 40 }}>
                        <div style={{ display: 'inline-block', background: '#111', color: '#fff', fontFamily: "var(--font-doto), 'Doto', monospace", fontSize: 15, letterSpacing: '0.04em', padding: '7px 18px', borderRadius: 9999, marginBottom: 28 }}>&gt;&gt; {maturity.toUpperCase()} &lt;&lt;</div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
                          {/* Gauge — dotted ring + single needle tick, soft raised disc */}
                          <div style={{ position: 'relative', width: 176, height: 176, flexShrink: 0, filter: 'drop-shadow(0 12px 20px rgba(17,17,17,0.14))' }}>
                            <svg width="176" height="176" viewBox="0 0 200 200">
                              <defs>
                                {/* Soft embossed dome — top-left light source, like a physical dial */}
                                <radialGradient id="dialDome" cx="35%" cy="28%" r="75%">
                                  <stop offset="0%" stopColor="#ffffff" />
                                  <stop offset="55%" stopColor="#faf9f6" />
                                  <stop offset="100%" stopColor="#eae8e2" />
                                </radialGradient>
                                <linearGradient id="dialBevelLight" x1="10%" y1="0%" x2="90%" y2="100%">
                                  <stop offset="0%" stopColor="#ffffff" />
                                  <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
                                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                                </linearGradient>
                                <linearGradient id="dialBevelShadow" x1="10%" y1="0%" x2="90%" y2="100%">
                                  <stop offset="0%" stopColor="#c7c5bb" stopOpacity="0" />
                                  <stop offset="55%" stopColor="#c7c5bb" stopOpacity="0" />
                                  <stop offset="100%" stopColor="#c7c5bb" />
                                </linearGradient>
                              </defs>
                              <g transform="translate(100,100)">
                                {Array.from({ length: 60 }).map((_, i) => {
                                  const angle = (i / 60) * 360;
                                  return <line key={i} x1="0" y1="-92" x2="0" y2="-84" stroke="#d6d6d1" strokeWidth="2.5" strokeLinecap="round" transform={`rotate(${angle})`} />;
                                })}
                              </g>
                              <g transform={`translate(100,100) rotate(${(score / 100) * 360})`}>
                                <line x1="0" y1="-96" x2="0" y2="-79" stroke="#ff5757" strokeWidth="4" strokeLinecap="round" />
                              </g>
                              <circle cx="100" cy="100" r="70" fill="url(#dialDome)" />
                              <circle cx="100" cy="100" r="69" fill="none" stroke="url(#dialBevelShadow)" strokeWidth="2" />
                              <circle cx="100" cy="100" r="69" fill="none" stroke="url(#dialBevelLight)" strokeWidth="2" />
                            </svg>
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '176px', height: '176px' }}>
                              <div style={{ position: 'absolute', top: '58px', width: '100%', textAlign: 'center', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#999' }}>score</div>
                              <div style={{ position: 'absolute', top: '78px', width: '100%', textAlign: 'center', fontFamily: "var(--font-doto), 'Doto', monospace", fontSize: 46, fontWeight: 700, lineHeight: 1, color: '#111' }}>{score}</div>
                            </div>
                          </div>
                          <div>
                            <h3 style={{ fontSize: 25, fontWeight: 700, lineHeight: 1.25, color: '#111', marginBottom: 12 }}>{quickNote.title}</h3>
                            <p style={{ fontSize: 17, color: '#333', lineHeight: 1.4 }}>{quickNote.body}</p>
                          </div>
                        </div>
                      </div>

                      {/* Dimension grid — plain, airy, no boxes */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: 26, columnGap: 40, marginBottom: 36 }}>
                        {[...top, ...bottom].map(d => {
                          let iconChar = '→';
                          let iconColor = '#d9942f';
                          if (d.score >= 2) { iconChar = '↗'; iconColor = '#6b9b5e'; }
                          else if (d.score === 0) { iconChar = '↓'; iconColor = '#ff5757'; }
                          return (
                            <div key={d.id}>
                              <div style={{ fontSize: 17, fontWeight: 700, color: '#111', textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 8 }}>{d.label}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 18, color: iconColor, fontWeight: 700 }}>{iconChar}</span>
                                <span style={{ fontFamily: "var(--font-doto), 'Doto', monospace", fontSize: 17, fontWeight: 600, color: '#333' }}>Score {d.score}/3</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: 16, borderTop: '1px solid #dcdcd7' }}>
                      <div style={{ fontSize: 20, fontWeight: 500, color: '#111', paddingTop: 20 }}>© 2026 Aivory. All rights reserved.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Slide 2 */}
              <div className="ig-slide-wrapper" style={{ width: previewWidth, height: previewHeight, maxWidth: '100%', overflow: 'auto', display: 'flex', justifyContent: 'flex-start', background: '#ffffff', padding: 0, border: '1px solid #d8e0e0', borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <div style={{ width: 1080, height: 1350, flexShrink: 0, transform: `scale(${PREVIEW_SCALE})`, transformOrigin: 'top left' }}>
                  <div ref={slide2Ref} id="ig-slide-2" style={{ width: 1080, height: 1350, background: 'radial-gradient(120% 90% at 28% 0%, #ffffff 0%, #fbfaf7 45%, #f2f0ea 100%)', padding: '100px 100px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontFamily: "var(--font-manrope), 'Manrope', sans-serif", color: '#111111', position: 'relative' }}>
                    <div>
                      {/* Strengths & Blockers table */}
                      <div style={{ marginBottom: 50 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, paddingBottom: 16, borderBottom: '1px solid #111', fontSize: 24, fontWeight: 700, color: '#111', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                          <div>Strength</div>
                          <div>Blocker</div>
                        </div>
                        {Array.from({ length: Math.max(strengths.length, blockers.length) }).map((_, i) => {
                          const s = strengths[i]?.label || '-';
                          const b = blockers[i]?.label || '-';
                          return (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, padding: '20px 0', borderBottom: '1px solid #dcdcd7', fontSize: 22, color: '#111', fontWeight: 500 }}>
                              <div>{s}</div>
                              <div>{b}</div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Insight items */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 36, marginBottom: 50 }}>
                        {insightItems.map((ins, i) => (
                          <div key={i}>
                            <div style={{ fontSize: 22, fontWeight: 700, color: '#111', textTransform: 'uppercase', letterSpacing: '0.01em', marginBottom: 10 }}>{ins.title}</div>
                            <div style={{ borderBottom: '1px solid #111', marginBottom: 12 }} />
                            <div style={{ fontSize: 20, color: '#333', lineHeight: 1.4, display: 'flex', gap: 10 }}>
                              {ins.type === 'blocker' && <span style={{ color: '#ff5757', fontWeight: 700, flexShrink: 0 }}>→</span>}
                              <span>{ins.desc}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Notes */}
                      <div style={{ marginBottom: 40 }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: '#111', textTransform: 'uppercase', letterSpacing: '0.01em', marginBottom: 12 }}>Notes</div>
                        <div style={{ fontSize: 20, color: '#111', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical' }}>
                          {renderNotesWithBold(getNarrative(companyName.trim() || 'your company', score, maturity))}
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid #dcdcd7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 500, color: '#111' }}>© 2026 Aivory. All rights reserved.</div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/Aivory_Signature_Grey.svg" alt="Aivory" style={{ height: '24px', width: 'auto', display: 'block' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Conversion CTA */}
            <div className="upgrade-section">
              <div className="upgrade-grid">
                <div className="upgrade-card">
                  <div className="upgrade-eyebrow">Upgrade path 01</div>
                  <h3>AI Readiness Deep Diagnostic</h3>
                  <div className="upgrade-price">$29 <span>one time</span></div>
                  <p className="upgrade-summary">Move from a quick score to a complete readiness analysis built around your specific use case and not generic.</p>
                  <div className="comparison-note"><strong>Why it beats the free diagnostic:</strong> the free report gives a snapshot. Deep Diagnostic maps 30 data points across workflow maturity, data infrastructure, automation exposure, and organizational readiness.</div>
                  <ul className="cta-features">
                    <li>Detailed gap and constraint analysis</li>
                    <li>Business objective and AI opportunity mapping</li>
                    <li>Data and process readiness breakdown</li>
                    <li>Prioritized use-case recommendations</li>
                  </ul>
                  <a href="/#pricing-section" className="btn-cta">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', marginRight: 4 }}><path d="M7 7l10 10M17 7v10H7" /></svg>
                    Upgrade to Deep Diagnostic
                  </a>
                </div>

                <div className="upgrade-card">
                  <div className="upgrade-eyebrow">Best next step</div>
                  <h3>Full Stack Bundle</h3>
                  <div className="upgrade-price">$99 <span>one time</span></div>
                  <p className="upgrade-summary">Get the complete planning stack: Deep Diagnostic + Blueprint + Roadmap in one bundled path.</p>
                  <div className="comparison-note"><strong>Why bundle:</strong> it connects diagnosis to execution, so you do not stop at insights. You get the system design and a phased plan to act on it.</div>
                  <ul className="cta-features">
                    <li>Everything in Deep Diagnostic</li>
                    <li>AI system blueprint and workflow architecture</li>
                    <li>Phased implementation roadmap</li>
                    <li>KPI targets and deployment priorities</li>
                  </ul>
                  <a href="/#pricing-section" className="btn-cta">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', marginRight: 4 }}><path d="M7 7l10 10M17 7v10H7" /></svg>
                    Get Full Stack Bundle
                  </a>
                </div>
              </div>

              <div className="strategy-card">
                <div className="upgrade-eyebrow">Prefer to talk it through?</div>
                <h3>Schedule a debrief with an AI strategist</h3>
                <p>Review your score, clarify what is blocking adoption, and decide whether Deep Diagnostic or the Full Stack Bundle is the right next move.</p>
                <a href="https://calendly.com" target="_blank" rel="noopener noreferrer" className="btn-cta">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', marginRight: 4 }}><path d="M7 7l10 10M17 7v10H7" /></svg>
                  Book strategist debrief
                </a>
              </div>
            </div>
          </>
        )}
      </div>
  );
}


// ============================================================================
// STYLES (migrated from inline <style> in original HTML)
// ============================================================================
const STYLES = `
/* === RESET & BASE === */
.diagnostic-app *,
.diagnostic-app *::before,
.diagnostic-app *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif !important;
  background: #ffffff !important;
  color: #111111 !important;
  min-height: 100vh;
  line-height: 1.6;
  overflow-x: hidden;
  position: relative;
}

/* === VARIABLES === */
:root {
  --bg: #ffffff;
  --bg-card: #ffffff;
  --bg-card-hover: #fafafa;
  --accent: #000000;
  --purple: #000000;
  --purple-hover: #333333;
  --text-primary: #111111;
  --text-secondary: #555555;
  --text-muted: #888888;
  --border: #eaeaea;
  --border-strong: #000000;
  --green: #000000;
  --amber: #ffb020;
  --red: #ff5757;
  --radius: 12px;
  --radius-sm: 8px;
}

/* === CLOSE BUTTON === */
.close-diagnostic-btn {
  position: absolute;
  top: 2rem;
  right: 2rem;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #ffffff;
  border: 1px solid #eaeaea;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #000000;
  font-size: 1.25rem;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.close-diagnostic-btn:hover {
  background: #f0f0f0;
  transform: scale(1.05);
  border-color: #cccccc;
}

/* === LAYOUT === */
.diagnostic-app {
  max-width: 680px;
  margin: 0 auto;
  padding: 4rem 1.5rem 2rem;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.diagnostic-app.results-mode {
  max-width: 1200px;
}

/* === PROGRESS BAR === */
.progress-bar-container {
  width: 100%;
  height: 4px;
  background: #eaeaea;
  border-radius: 2px;
  margin-bottom: 2.5rem;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: #000000;
  border-radius: 2px;
  transition: width 0.4s ease;
}

/* === STEP CONTAINER === */
.step-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* === COMPANY PROFILE (Step 0) === */
.profile-header {
  margin-bottom: 2.5rem;
  border-bottom: 2px solid #000000;
  padding-bottom: 1.5rem;
}

.profile-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #111111;
  margin-bottom: 0.5rem;
  line-height: 1.1;
}

.profile-header p {
  color: var(--text-secondary);
  font-size: 1.1rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.875rem 1rem;
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  font-size: 1rem;
  font-family: inherit;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #000000;
  box-shadow: 0 0 0 1px #000000;
}

.form-group input::placeholder {
  color: var(--text-muted);
}

.form-group select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='rgba(0,0,0,0.5)' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 1rem center;
  padding-right: 2.5rem;
}

.form-group select option {
  background: #ffffff;
  color: #111111;
}

/* === BUTTONS === */
.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem 2.5rem;
  background: #ffffff;
  color: #000000;
  border: 2px solid #000000;
  border-radius: 0px;
  font-size: 1rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  margin-top: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.btn-primary:hover:not(:disabled) {
  background: #000000;
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn-primary:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

/* === QUESTION SCREEN === */
.question-header {
  margin-bottom: 2.5rem;
  border-bottom: 2px solid #000000;
  padding-bottom: 1.5rem;
}

.question-number {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.75rem;
}

.question-text {
  font-size: 2.25rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.15;
  color: #111111;
}

/* === ANSWER OPTIONS === */
.options-list {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  margin-bottom: 2.5rem;
}

.option-card {
  padding: 1.125rem 1.5rem;
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1rem;
  font-weight: 400;
  color: var(--text-secondary);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.option-card:hover {
  background: var(--bg-card-hover);
  border-color: #cccccc;
  color: var(--text-primary);
  transform: translateY(-1px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.04);
}

.option-card.selected {
  background: #fafafa;
  border: 2px solid #000000;
  color: #111111;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

/* === NAVIGATION === */
.nav-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}

.btn-back {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.95rem;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  padding: 0.5rem 0;
  transition: color 0.2s;
}

.btn-back:hover {
  color: var(--text-primary);
}

.btn-next {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 2.5rem;
  background: #ffffff;
  color: #000000;
  border: 2px solid #000000;
  border-radius: 0px;
  font-size: 0.95rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.btn-next:hover:not(:disabled) {
  background: #000000;
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.btn-next:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  box-shadow: none;
  transform: none;
}

/* === RESULTS PAGE === */
.results-header {
  text-align: center;
  margin-bottom: 3rem;
  padding-bottom: 2rem;
  border-bottom: 2px solid #000000;
}

.results-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: #111111;
  margin-bottom: 0.5rem;
  line-height: 1.1;
}

.results-header .meta {
  font-size: 0.95rem;
  color: var(--text-muted);
  font-weight: 500;
}

/* Conversion CTA */
.upgrade-section {
  max-width: 1100px;
  margin: 0 auto;
}

.upgrade-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.25rem;
  align-items: stretch;
}

.upgrade-card,
.strategy-card {
  border: 2px solid #000000;
  border-radius: var(--radius);
  padding: 2rem;
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
}

.upgrade-card {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.upgrade-eyebrow {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: 0.75rem;
}

.upgrade-card h3,
.strategy-card h3 {
  font-size: 1.55rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #111111;
  margin-bottom: 0.5rem;
  line-height: 1.1;
}

.upgrade-price {
  font-size: 2.5rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: #111111;
  margin: 1rem 0 0.35rem;
}

.upgrade-price span {
  font-size: 0.85rem;
  font-weight: 500;
  letter-spacing: 0;
  color: var(--text-muted);
}

.upgrade-summary,
.strategy-card p {
  font-size: 0.98rem;
  color: var(--text-secondary);
  line-height: 1.55;
  margin-bottom: 1.5rem;
}

.comparison-note {
  padding: 1rem;
  background: #fafafa;
  border: 1px solid var(--border);
  border-left: 4px solid #000000;
  font-size: 0.92rem;
  color: #333333;
  line-height: 1.5;
  margin-bottom: 1.25rem;
}

.cta-features {
  list-style: none;
  text-align: left;
  margin: 0 0 1.75rem;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  flex: 1;
}

.cta-features li {
  font-size: 0.95rem;
  color: #333333;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  font-weight: 500;
  line-height: 1.4;
}

.cta-features li::before {
  content: '✓';
  color: #000000;
  font-weight: 700;
  line-height: 1.4;
}

.btn-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1rem 2.5rem;
  background: #ffffff;
  color: #000000;
  border: 2px solid #000000;
  border-radius: 0px;
  font-size: 1rem;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  width: 100%;
  margin-top: auto;
}

.btn-cta:hover {
  background: #000000;
  color: #ffffff;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.strategy-card {
  margin-top: 1.25rem;
  text-align: center;
}

.strategy-card .btn-cta {
  max-width: 430px;
  margin-left: auto;
  margin-right: auto;
}

/* === RESPONSIVE === */
@media (max-width: 768px) {
  .close-diagnostic-btn {
    top: 1rem;
    right: 1rem;
    width: 36px;
    height: 36px;
    font-size: 1rem;
  }

  .diagnostic-app {
    padding: 3.5rem 1rem 1.5rem;
  }

  .diagnostic-app.results-mode {
    max-width: 100%;
  }

  .profile-header h1 {
    font-size: 1.75rem;
  }

  .profile-header p {
    font-size: 0.95rem;
  }

  .question-text {
    font-size: 1.5rem;
  }

  .question-header {
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
  }

  .option-card {
    padding: 0.875rem 1rem;
    font-size: 0.9rem;
  }

  .options-list {
    gap: 0.625rem;
    margin-bottom: 1.5rem;
  }

  .btn-next {
    padding: 0.75rem 1.5rem;
    font-size: 0.9rem;
  }

  .btn-primary {
    padding: 0.875rem 1.5rem;
    font-size: 0.9rem;
  }

  .ig-preview-area {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .ig-slide-wrapper {
    border-radius: 8px !important;
  }

  .upgrade-grid {
    grid-template-columns: 1fr;
  }

  .upgrade-card,
  .strategy-card {
    padding: 1.25rem;
  }

  .upgrade-card h3,
  .strategy-card h3 {
    font-size: 1.25rem;
  }

  .upgrade-price {
    font-size: 2rem;
  }

  .nav-row {
    gap: 0.5rem;
  }

  .btn-back {
    font-size: 0.85rem;
  }
}
`;


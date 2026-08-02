'use client';

import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';

import { trackEvent } from '@/lib/analytics';

// ============================================================================
// TYPES
// ============================================================================
type Step = 'profile' | 'question' | 'results';

/**
 * The paid product's scoring dimensions. Every free question maps to one, so
 * the free profile and the paid radar speak the same language and the upgrade
 * reads as "same instrument, more depth" rather than a second, unrelated quiz.
 *
 * `security` is deliberately absent: it is a paid-only depth area, and one of
 * the honest "what you are not seeing yet" lines.
 */
type Dimension = 'process' | 'data' | 'strategy' | 'governance' | 'people';

interface Question {
  id: string;
  question: string;
  options: string[];
  dim: Dimension;
}

interface DimensionInfo {
  id: string;
  label: string;
  score: number;
  weight: number;
}

/** One of the five aggregated dimensions, plus the questions behind it. */
interface DimensionScore {
  key: Dimension;
  label: string;
  score: number;   // 0-100, the mean of its member answers rescaled
  mean: number;    // 0-3, on the raw answer scale
  weakest: DimensionInfo;
  strongest: DimensionInfo;
  members: DimensionInfo[];
}

interface InsightItem {
  title: string;
  driver: string;  // the question that drove the dimension's position
  desc: string;
  type: 'strength' | 'blocker';
}

interface CapturedCard {
  suffix: string;
  fileName: string;
  dataUrl: string;
}

// ============================================================================
// DATA
// ============================================================================
/**
 * Twelve operational questions — no question mentions AI.
 *
 * The free tier's job is to answer two of the five executive questions ("where
 * are we today", "what is slowing us down") credibly, and to leave the other
 * three ("what should change first", "what is it worth", "where does AI help
 * most") visibly unanswered. Those three are what the paid Business Operations
 * Assessment sells, so any question that would let a visitor answer them on
 * their own belongs in the paid intake, not here.
 *
 * Grouped as: baseline (1-4), friction (5-8), capacity to change (9-12). The
 * grouping is internal — the UI still shows one question per screen.
 */
const QUESTIONS: Question[] = [
  { id: 'process_documentation', dim: 'process', question: 'How are your core processes captured today?', options: ['Nothing written down', "In people's heads, informally", 'Some SOPs, partly current', 'Documented and kept current'] },
  { id: 'workflow_standardization', dim: 'process', question: 'If two people do the same task, how similar is the result?', options: ['Completely different', 'Broadly similar', 'Mostly consistent', 'Identical, by design'] },
  { id: 'data_availability', dim: 'data', question: 'Where does the data you run the business on live?', options: ['Nowhere central', 'Scattered across tools and spreadsheets', 'Partly consolidated', 'One system of record'] },
  { id: 'systems_integration', dim: 'data', question: 'Do your core systems pass information to each other?', options: ['No real systems yet', 'People move data by hand', 'Some connected, some manual', 'Connected end to end'] },
  { id: 'manual_workload', dim: 'process', question: "How much of your team's week goes to repetitive manual work?", options: ['Most of it', 'About half', 'Some, but contained', 'Very little'] },
  { id: 'rework_rate', dim: 'governance', question: 'How often does completed work have to be corrected or redone?', options: ['Constantly', 'Weekly', 'Occasionally', 'Rarely'] },
  { id: 'handoff_delay', dim: 'process', question: 'When work passes between teams or systems, what happens?', options: ['It stalls, often for days', 'It waits, then someone chases', 'Minor delays', 'It moves without waiting'] },
  { id: 'decision_latency', dim: 'strategy', question: 'From "we need to decide this" to an actual decision, how long?', options: ['Months', 'Weeks', 'Days', 'Same day'] },
  { id: 'ownership_clarity', dim: 'governance', question: 'Does each core workflow have a named owner?', options: ['No one owns them', 'Ownership is implied, not stated', 'Most have an owner', 'Every one, and they are accountable'] },
  { id: 'improvement_mandate', dim: 'strategy', question: 'Is there budget and a mandate to change how work gets done?', options: ['Neither', 'Interest, but nothing committed', 'Budget being discussed', 'Funded, with an owner'] },
  { id: 'change_readiness', dim: 'people', question: 'How does the organisation react to changing how work is done?', options: ['Resists it', 'Cautious', 'Open to it', 'Actively pushes for it'] },
  { id: 'internal_capability', dim: 'people', question: 'Do you have people who can implement operational change?', options: ['No one', 'Limited digital skills', 'Some capable people', 'A dedicated team'] },
];

/**
 * Carried over verbatim wherever a question survived the rework, so scores
 * stay comparable across the cutover: the total is still 13.7, exactly as it
 * was under the AI-readiness set.
 */
const WEIGHTS: Record<string, number> = {
  process_documentation: 1.0, workflow_standardization: 1.0, data_availability: 1.5,
  systems_integration: 0.8, manual_workload: 1.2, rework_rate: 1.2,
  handoff_delay: 1.0, decision_latency: 0.8, ownership_clarity: 1.5,
  improvement_mandate: 1.5, change_readiness: 1.0, internal_capability: 1.2,
};

/** Bumped whenever the question set changes shape. Stored with every lead so
 *  future analysis never silently mixes two incompatible instruments. */
const QUESTION_SET_VERSION = 2;
// Derived, never hard-coded: the previous literal (43.5) did not match the
// weights above, so a perfect run topped out at 94/100 and 100 was unreachable.
// Deriving it means the ceiling follows the weights whenever questions change.
const MAX_RAW = Object.values(WEIGHTS).reduce((sum, w) => sum + w, 0) * 3;

/** The five aggregated dimensions, named exactly as the paid radar names them. */
const DIM_LABELS: Record<Dimension, string> = {
  process: 'Process', data: 'Data', strategy: 'Strategy',
  governance: 'Governance', people: 'People',
};

/** Per-question labels — the traceability line under each dimension. */
const DIMENSION_LABELS: Record<string, string> = {
  process_documentation: 'Process Documentation', workflow_standardization: 'Workflow Consistency',
  data_availability: 'Data Availability', systems_integration: 'Systems Integration',
  manual_workload: 'Manual Workload', rework_rate: 'Rework Rate',
  handoff_delay: 'Handoff Flow', decision_latency: 'Decision Speed',
  ownership_clarity: 'Ownership Clarity', improvement_mandate: 'Improvement Mandate',
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
  { value: 'marketing', label: 'Marketing' },
  { value: 'advertising', label: 'Advertising' },
  { value: 'food_beverage', label: 'Food & Beverages' },
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

// Matches the paid product's `maturityFromScore` (avry-user-dashboard
// services/deepDiagnostic.ts) name for name. The two tiers previously used
// different ladders, so the same word sat at a different position in each — a
// visitor scoring "Defined" free and "Developing" paid read the upgrade as a
// downgrade. Both tiers spell the top band "Optimising"; leads captured before
// 2026-08-02 carry the old "Optimizing" in assessment_leads.maturity.
const MATURITY_STAGES = ['Nascent', 'Initiating', 'Developing', 'Defined', 'Optimising'];

/**
 * Cause → effect, in operational terms. Same explanatory shape as the paid
 * product's DIM_CONSEQUENCE_CHAINS (readinessNarrative.ts), so a weak area is
 * explained the same way in both tiers. Nothing here names a remedy — naming
 * what to fix first is what the paid assessment sells.
 */
const INSIGHT_DESCRIPTIONS: Record<string, { strength: string; blocker: string }> = {
  process_documentation: {
    strength: "Written, current processes make operations repeatable — new people get productive faster, and improvements stick instead of decaying back.",
    blocker: "Undocumented processes live in individual heads, so operations stay person-dependent and every absence or departure becomes an outage."
  },
  workflow_standardization: {
    strength: "The same task produces the same result whoever runs it, so quality is predictable and capacity can be added without diluting output.",
    blocker: "The same task produces a different result depending on who does it, so quality stays unpredictable and no fix can be rolled out reliably."
  },
  data_availability: {
    strength: "One system of record means everyone argues from the same numbers, and decisions stop waiting on someone to reconcile spreadsheets.",
    blocker: "Data scattered across tools and spreadsheets means nobody sees the whole picture, and every decision starts by rebuilding the same view by hand."
  },
  systems_integration: {
    strength: "Systems that pass information to each other remove an entire class of manual re-entry, along with the errors and delay it introduces.",
    blocker: "Moving data between systems by hand costs hours nobody tracks, and introduces errors that surface downstream after they have already cost something."
  },
  manual_workload: {
    strength: "Little of the week goes to repetitive work, so the team's hours are spent on judgement rather than keystrokes.",
    blocker: "Repetitive work consumes most of the week, so capacity goes to maintaining the business rather than improving it."
  },
  rework_rate: {
    strength: "Work is rarely redone, which means problems are caught where they start rather than after the cost is already sunk.",
    blocker: "Frequent rework is the clearest sign quality is inspected in at the end rather than built in, and every correction is paid for twice."
  },
  handoff_delay: {
    strength: "Work moves between teams without waiting, so elapsed time reflects the actual work rather than the queue between the steps.",
    blocker: "Work stalls every time it changes hands, so most of the elapsed time on a task is spent waiting rather than being worked on."
  },
  decision_latency: {
    strength: "Decisions land in days, so improvements start paying back while the reason for them is still current.",
    blocker: "Decisions that take weeks or months mean improvements are stale by the time they are approved, and the cost of waiting never appears on any report."
  },
  ownership_clarity: {
    strength: "Every core workflow has a named, accountable owner — which is what makes an improvement hold after the attention moves elsewhere.",
    blocker: "Workflows with no named owner have nobody to notice when they drift, so problems only escalate once a customer feels them."
  },
  improvement_mandate: {
    strength: "Funded change with a named owner means an identified improvement can actually be executed rather than added to a list.",
    blocker: "Without committed budget and a clear mandate, identified improvements stay identified — the diagnosis costs nothing, the delay does."
  },
  change_readiness: {
    strength: "An organisation that pushes for better ways of working adopts change under its own momentum instead of having to be driven through it.",
    blocker: "Resistance to changing how work is done means even well-designed improvements are quietly abandoned once the rollout attention ends."
  },
  internal_capability: {
    strength: "Having people who can implement operational change means improvements get built and maintained in-house rather than rented indefinitely.",
    blocker: "With nobody able to implement change, every improvement depends on an outside vendor, which caps both the pace and the depth of what is possible."
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

/** Start of the Defined band. A dimension at or above this is not a constraint. */
const DEFINED_BAND_FLOOR = 65;
/** Start of the Developing band. Below this, a dimension is not a strength. */
const DEVELOPING_BAND_FLOOR = 50;

// Thresholds mirror the paid `maturityFromScore` exactly (80 / 65 / 50 / 35).
function getMaturityLevel(score: number): string {
  if (score >= 80) return 'Optimising';
  if (score >= 65) return 'Defined';
  if (score >= 50) return 'Developing';
  if (score >= 35) return 'Initiating';
  return 'Nascent';
}

function getMaturityIndicatorPercent(level: string): number {
  const stageIndex = Math.max(0, MATURITY_STAGES.indexOf(level));
  return ((stageIndex + 0.5) / MATURITY_STAGES.length) * 100;
}

/**
 * The twelve answers aggregated into the paid product's five dimensions.
 *
 * This is the point of the whole rework: the free card becomes a smaller
 * version of the paid radar rather than a different artefact, so upgrading
 * reads as "same instrument, more depth" instead of "another quiz". Every
 * dimension is shown — five rows, not a top-3/bottom-3 slice of twelve.
 *
 * `driver` is the member question that most explains the dimension's position
 * (its weakest answer for a low dimension, its strongest for a high one), a
 * light version of the paid product's score traceability.
 */
function getDimensionProfile(answers: Record<string, number>): DimensionScore[] {
  return (Object.keys(DIM_LABELS) as Dimension[]).map(key => {
    const members: DimensionInfo[] = QUESTIONS
      .filter(q => q.dim === key)
      .map(q => ({ id: q.id, label: DIMENSION_LABELS[q.id] || q.id, score: answers[q.id] ?? 0, weight: WEIGHTS[q.id] || 1 }));

    const mean = members.reduce((sum, m) => sum + m.score, 0) / members.length;
    // Heavier weight breaks ties, so the driver cited is the one that matters most.
    const byWeakest = [...members].sort((a, b) => a.score !== b.score ? a.score - b.score : b.weight - a.weight);

    return {
      key,
      label: DIM_LABELS[key],
      score: Math.round((mean / 3) * 100),
      mean,
      weakest: byWeakest[0],
      strongest: byWeakest[byWeakest.length - 1],
      members,
    };
  });
}

/**
 * The three weakest dimensions, weakest first.
 *
 * Phase 1 replaced a fallback list that could never fire (it filtered to the
 * weakest answers first, then "topped up" from ids the filter had already
 * taken). Selection now happens across the five dimensions rather than the
 * twelve questions, so a gap is reported where the paid product would report
 * it.
 *
 * A dimension sitting in the Defined band or above is not a constraint, so it
 * is never listed as one. This matters more here than it did over twelve
 * questions: the weakest three of five is a majority, and without the cut-off
 * a perfectly healthy 67/100 dimension gets called a blocker. Most real runs
 * still return three; a genuinely strong operation returns fewer, which is the
 * honest answer.
 */
function getBlockers(profile: DimensionScore[]): DimensionScore[] {
  return profile
    .filter(d => d.score < DEFINED_BAND_FLOOR)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);
}

/**
 * The strongest remaining dimensions, blockers excluded so nothing is listed
 * as both.
 *
 * A floor matters as much here as the ceiling does for blockers. Without it,
 * a run answered 1/3 across the board hands its least-bad dimension the
 * strength treatment — the card would claim "work is rarely redone" off the
 * back of an answer that said the opposite. Below Developing, a dimension is
 * simply not a strength, and the STRENGTH column is left empty rather than
 * filled with something the answers do not support.
 */
function getStrengths(profile: DimensionScore[], exclude: Set<string>): DimensionScore[] {
  return profile
    .filter(d => !exclude.has(d.key) && d.score >= DEVELOPING_BAND_FLOOR)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function getQuickNote(score: number, maturity: string, strengths: DimensionScore[], blockers: DimensionScore[]): { title: string; body: string } {
  const strongest = strengths[0];
  const improvementText = blockers.map(d => `${d.label} (${d.score}/100)`).join(', ');

  if (!blockers.length) {
    return {
      title: `Quick note: ${score}/100 — ${maturity}`,
      body: `All five dimensions are scoring strongly. ${strongest ? `${strongest.label} is the clearest current strength.` : 'The current answers show a balanced operational base.'}`
    };
  }

  return {
    title: `Quick note: ${score}/100 — ${maturity}`,
    body: `${strongest ? `Strongest dimension: ${strongest.label} (${strongest.score}/100). ` : ''}Needs improvement: ${improvementText}.`
  };
}

function getNarrative(companyName: string, score: number, maturity: string): string {
  const templates: Record<string, string> = {
    Nascent: `For ${companyName}, a score of ${score}/100 points to an early stage of operational maturity. That is a valid starting point — many well-run organisations began here. The groundwork comes first: pick one core workflow, write down how it actually runs today, and make it consistent before changing anything else.`,
    Initiating: `For ${companyName}, a score of ${score}/100 shows the foundation beginning to take shape while critical gaps remain. Organisations at this stage gain most from one narrow, visible win — a single handoff or a single source of rework, fixed where the result can be measured within 30–90 days.`,
    Developing: `For ${companyName}, a score of ${score}/100 indicates solid ground — core processes are defined and several foundations are in place. This is the moment to move from isolated fixes to a structured improvement plan with targets attached to it.`,
    Defined: `For ${companyName}, a score of ${score}/100 reflects advanced operational maturity — work is standardised, owned, and measured. The next step is scaling what already works into the areas it has not reached yet, and tightening how outcomes are tracked.`,
    Optimising: `For ${companyName}, a score of ${score}/100 places you among organisations whose operations are genuinely well-run. At this level the remaining gains compound: shortening the distance between deciding and acting, and removing the last places where work still waits on a person.`
  };
  return templates[maturity] || '';
}

// Bolds the score fraction and day-range callouts inside the narrative
// (e.g. "42/100", "30–90 days"), matching the reference design's emphasis.
function renderNotesWithBold(text: string): ReactNode[] {
  const parts = text.split(/(\d+\/100|\d+(?:–\d+)?\s*days)/g);
  return parts.map((part, i) => (/^\d+\/100$|days$/.test(part) ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>));
}

/**
 * Re-encodes a card PNG at a smaller width for email.
 *
 * The download-grade capture is 3240x4050 — far too heavy to attach. A single
 * canvas draw is orders of magnitude cheaper than asking html-to-image for a
 * second, smaller render of the same DOM. Falls back to the original data URL
 * if anything about the decode fails, so the email still goes out.
 */
async function downscalePng(dataUrl: string, targetWidth: number): Promise<string> {
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('card image failed to decode'));
      img.src = dataUrl;
    });

    if (!img.naturalWidth || img.naturalWidth <= targetWidth) return dataUrl;

    const scale = targetWidth / img.naturalWidth;
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Could not downscale report card, sending original:', err);
    return dataUrl;
  }
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
  const [email, setEmail] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [submittingLead, setSubmittingLead] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  const slide1Ref = useRef<HTMLDivElement>(null);
  const slide2Ref = useRef<HTMLDivElement>(null);

  const isProfileValid = companyName.trim().length >= 2 && companySize !== '' && industry !== '';

  const handleProfileContinue = () => {
    if (!isProfileValid) return;
    trackEvent('assessment_start', { industry, company_size: companySize });
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

  // Per-screen funnel events. Without these there is no way to see which
  // question people abandon the assessment on.
  useEffect(() => {
    if (step !== 'question') return;
    trackEvent('assessment_step', {
      step_number: questionIndex + 1,
      question_id: QUESTIONS[questionIndex].id,
    });
  }, [step, questionIndex]);

  /**
   * Renders both report cards to PNG data URLs.
   *
   * This is the expensive step — the cost is dominated by serialising the card
   * DOM and its embedded fonts, not by pixelRatio, so it is worth doing once
   * per click and reusing the result rather than capturing again per consumer.
   */
  const captureCards = useCallback(async (pixelRatio: number) => {
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

    const captured: CapturedCard[] = [];
    for (const slide of slides) {
      const node = slide.ref.current;
      if (!node) continue;

      // html-to-image renders through the browser's own engine (SVG
      // foreignObject), so text baselines, ellipsis, line-clamp and web
      // fonts come out exactly as on screen — unlike html2canvas.
      const dataUrl = await toPng(node, {
        width: 1080,
        height: 1350,
        pixelRatio,
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

      captured.push({
        suffix: slide.suffix,
        fileName: `${companyName.trim() || 'Company'}_Business_Operations_Assessment_${slide.suffix}.png`,
        dataUrl,
      });
    }
    return captured;
  }, [companyName]);

  const downloadDiagnosticCards = useCallback(async (): Promise<CapturedCard[]> => {
    setDownloading(true);
    trackEvent('assessment_download');
    try {
      const cards = await captureCards(3);
      for (const card of cards) {
        const link = document.createElement('a');
        link.download = card.fileName;
        link.href = card.dataUrl;
        link.click();

        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      return cards;
    } catch (err) {
      console.error('Failed to generate images:', err);
      alert('Failed to generate images. Please try again.');
      return [];
    } finally {
      setDownloading(false);
    }
  }, [captureCards]);

  // Compute results
  const score = computeScore(answers);
  const maturity = getMaturityLevel(score);
  const profile = getDimensionProfile(answers);
  const blockers = getBlockers(profile);
  const strengths = getStrengths(profile, new Set(blockers.map(b => b.key)));
  const quickNote = getQuickNote(score, maturity, strengths, blockers);
  const indicatorPercent = getMaturityIndicatorPercent(maturity);
  const industryLabel = INDUSTRIES.find(i => i.value === industry)?.label || industry;
  const sizeLabel = SIZES.find(s => s.value === companySize)?.label || companySize;

  useEffect(() => {
    if (step !== 'results') return;
    trackEvent('assessment_complete', { score, maturity, industry, company_size: companySize });
    // Fire once on arrival at the results screen, not on every score recompute.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /**
   * Email gate. The score, maturity and strengths/blockers are already visible
   * above — this trades the downloadable report cards for an address, at the
   * point where the visitor has seen what they are getting.
   *
   * A failed submission still unlocks the download: the visitor kept their side
   * of the deal, and a backend problem is ours to see in the logs, not theirs.
   */
  const handleUnlock = async () => {
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setEmailError('');
    setSubmittingLead(true);

    try {
      const res = await fetch('/api/assessment-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmed,
          companyName: companyName.trim(),
          industry: industryLabel,
          companySize: sizeLabel,
          score,
          maturity,
          answers,
          strengths: strengths.map(s => s.label),
          blockers: blockers.map(b => b.label),
          source: 'free-assessment',
          questionSetVersion: QUESTION_SET_VERSION,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`lead capture responded ${res.status}`);
      trackEvent('assessment_lead_submitted', { score, maturity, industry });
    } catch (err) {
      console.error('Lead capture failed:', err);
      trackEvent('assessment_lead_error', { score, maturity, industry });
    } finally {
      setSubmittingLead(false);
    }

    setSubmittedEmail(trimmed);
    setUnlocked(true);

    // The download runs first and the emailed copy reuses its output, so the
    // visitor waits for exactly one capture rather than two.
    void downloadDiagnosticCards().then(cards => emailReportCards(trimmed, cards));
  };

  /**
   * Ships a copy of the cards to the n8n workflow that emails them.
   *
   * The cards only exist in this browser tab, so delivery has to start here.
   * Never blocks the download — the visitor already has the files either way,
   * so a delivery failure is a background problem, not theirs.
   */
  const emailReportCards = async (recipient: string, cards: CapturedCard[]) => {
    if (cards.length === 0) {
      setDeliveryStatus('failed');
      return;
    }
    setDeliveryStatus('sending');
    try {
      const emailCards = await Promise.all(
        cards.map(async card => ({
          fileName: card.fileName,
          dataUrl: await downscalePng(card.dataUrl, 1080),
        })),
      );
      const res = await fetch('/api/assessment-report-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: recipient,
          companyName: companyName.trim(),
          score,
          maturity,
          strengths: strengths.map(s => s.label),
          blockers: blockers.map(b => b.label),
          questionSetVersion: QUESTION_SET_VERSION,
          cards: emailCards,
        }),
        signal: AbortSignal.timeout(45000),
      });
      if (!res.ok) throw new Error(`report email responded ${res.status}`);
      setDeliveryStatus('sent');
      trackEvent('assessment_report_emailed', { score, maturity });
    } catch (err) {
      console.error('Report card email failed:', err);
      setDeliveryStatus('failed');
      trackEvent('assessment_report_email_error', { score, maturity });
    }
  };

  // Insight items for slide 2 — one dimension per item, each naming the
  // question that drove it so the reader can see what the score rests on.
  const insightItems: InsightItem[] = [];
  const primaryStrength = strengths[0];
  if (primaryStrength) {
    insightItems.push({
      title: primaryStrength.label,
      driver: `${primaryStrength.strongest.label} — ${primaryStrength.strongest.score}/3`,
      desc: INSIGHT_DESCRIPTIONS[primaryStrength.strongest.id]?.strength || "Strength here is a foundation the rest of the operation can be built on rather than worked around.",
      type: 'strength'
    });
  }
  blockers.forEach((blocker, index) => {
    if (insightItems.length >= 3) return;
    insightItems.push({
      title: blocker.label,
      driver: `${blocker.weakest.label} — ${blocker.weakest.score}/3`,
      desc: INSIGHT_DESCRIPTIONS[blocker.weakest.id]?.blocker || (index === 0
        ? "A gap here creates friction that everything downstream has to absorb, usually as time nobody is measuring."
        : "This constraint quietly caps how much any other improvement can deliver."),
      type: 'blocker'
    });
  });
  if (insightItems.length < 3) {
    const secondaryStrength = strengths.find(d => !insightItems.some(ins => ins.title === d.label));
    if (secondaryStrength) {
      insightItems.push({
        title: secondaryStrength.label,
        driver: `${secondaryStrength.strongest.label} — ${secondaryStrength.strongest.score}/3`,
        desc: INSIGHT_DESCRIPTIONS[secondaryStrength.strongest.id]?.strength || "Solid performance here removes one of the constraints that usually slows operational change down.",
        type: 'strength'
      });
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
              <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.75rem' }}>Your Business Operations Assessment Report</h1>
              <p className="results-subhead">
                Score <strong>{score}/100</strong> · <strong>{maturity}</strong> maturity — your full breakdown is below.
              </p>

              {unlocked ? (
                <>
                  <button
                    className="btn-primary"
                    onClick={downloadDiagnosticCards}
                    disabled={downloading}
                    style={{ maxWidth: 400, margin: '0 auto' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                    {downloading ? 'Generating PNGs...' : 'Download report cards again (PNG)'}
                  </button>
                  {deliveryStatus !== 'idle' && (
                    <div className={`delivery-status delivery-${deliveryStatus}`} role="status">
                      {deliveryStatus === 'sending' && `Emailing a copy to ${submittedEmail}…`}
                      {deliveryStatus === 'sent' && `A copy is on its way to ${submittedEmail}.`}
                      {deliveryStatus === 'failed' && 'We could not email a copy just now — your download above has the full report.'}
                    </div>
                  )}
                </>
              ) : (
                <div className="email-gate">
                  <div className="email-gate-label">Where should we send a copy of this report?</div>
                  <div className="email-gate-row">
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      aria-label="Work email"
                      aria-invalid={emailError ? true : undefined}
                      value={email}
                      onChange={e => { setEmail(e.target.value); if (emailError) setEmailError(''); }}
                      onKeyDown={e => { if (e.key === 'Enter' && !submittingLead) handleUnlock(); }}
                      disabled={submittingLead || downloading}
                    />
                    <button
                      className="btn-primary"
                      onClick={handleUnlock}
                      disabled={submittingLead || downloading}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                      {submittingLead || downloading ? 'Preparing…' : 'Get my report cards'}
                    </button>
                  </div>
                  {emailError && <div className="email-gate-error" role="alert">{emailError}</div>}
                  <div className="email-gate-note">
                    Unlocks the downloadable report cards below. No spam — we use this to send your report and nothing else.
                  </div>
                </div>
              )}
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
                        <div style={{ fontSize: 28, fontWeight: 400, lineHeight: 1.35, color: '#111', textAlign: 'right', textTransform: 'uppercase' }}>Quick Assessment<br />of Business Operations</div>
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

                      {/* Dimension profile — all five, each with the question driving it.
                          One row per dimension rather than a 2-up grid: five is an odd
                          count, and a full-width bar reads as a profile instead of a list. */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 30 }}>
                        {profile.map(d => {
                          let iconChar = '→';
                          let iconColor = '#d9942f';
                          if (d.score >= 67) { iconChar = '↗'; iconColor = '#6b9b5e'; }
                          else if (d.score <= 33) { iconChar = '↓'; iconColor = '#ff5757'; }
                          const driver = d.score >= 67 ? d.strongest : d.weakest;
                          return (
                            <div key={d.key}>
                              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, marginBottom: 6 }}>
                                <span style={{ fontSize: 17, fontWeight: 700, color: '#111', textTransform: 'uppercase', letterSpacing: '0.02em' }}>{d.label}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                                  <span style={{ fontSize: 16, color: iconColor, fontWeight: 700 }}>{iconChar}</span>
                                  <span style={{ fontFamily: "var(--font-doto), 'Doto', monospace", fontSize: 17, fontWeight: 600, color: '#333' }}>{d.score}/100</span>
                                </span>
                              </div>
                              <div style={{ height: 5, background: '#e4e2dc', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                                <div style={{ width: `${d.score}%`, height: '100%', background: iconColor, borderRadius: 3 }} />
                              </div>
                              <div style={{ fontSize: 13, color: '#777', letterSpacing: '0.01em' }}>
                                {driver.label} · {driver.score}/3
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
                            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 20, marginBottom: 10 }}>
                              <span style={{ fontSize: 22, fontWeight: 700, color: '#111', textTransform: 'uppercase', letterSpacing: '0.01em' }}>{ins.title}</span>
                              <span style={{ fontSize: 15, color: '#777', flexShrink: 0, textAlign: 'right' }}>{ins.driver}</span>
                            </div>
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
                  <h3>Business Operations Assessment</h3>
                  <div className="upgrade-price">$79 <span>one time</span></div>
                  <p className="upgrade-summary">Move from a quick score to a complete operational analysis built around your specific use case and not generic.</p>
                  <div className="comparison-note"><strong>Why it beats the free diagnostic:</strong> the free report gives a snapshot. The Business Operations Assessment maps 30 data points across workflow maturity, data infrastructure, automation exposure, and organisational readiness.</div>
                  <ul className="cta-features">
                    <li>Detailed gap and constraint analysis</li>
                    <li>Business objective and AI opportunity mapping</li>
                    <li>Data and process readiness breakdown</li>
                    <li>Prioritised use-case recommendations</li>
                  </ul>
                  <a
                    href="/#pricing-section"
                    className="btn-cta"
                    onClick={() => trackEvent('assessment_upgrade_click', { plan: 'business_operations_assessment', score, maturity })}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', marginRight: 4 }}><path d="M7 7l10 10M17 7v10H7" /></svg>
                    Upgrade to Business Operations Assessment
                  </a>
                </div>

                <div className="upgrade-card">
                  <div className="upgrade-eyebrow">Best next step</div>
                  <h3>Complete Transformation Package</h3>
                  <div className="upgrade-price">$299 <span>one time</span></div>
                  <p className="upgrade-summary">Get the complete planning stack: Business Operations Assessment + Transformation Blueprint + Transformation Roadmap in one bundled path.</p>
                  <div className="comparison-note"><strong>Why bundle:</strong> it connects diagnosis to execution, so you do not stop at insights. You get the system design and a phased plan to act on it.</div>
                  <ul className="cta-features">
                    <li>Everything in Business Operations Assessment</li>
                    <li>AI system blueprint and workflow architecture</li>
                    <li>Phased implementation roadmap</li>
                    <li>KPI targets and deployment priorities</li>
                  </ul>
                  <a
                    href="/#pricing-section"
                    className="btn-cta"
                    onClick={() => trackEvent('assessment_upgrade_click', { plan: 'complete_transformation_package', score, maturity })}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', marginRight: 4 }}><path d="M7 7l10 10M17 7v10H7" /></svg>
                    Start Transformation
                  </a>
                </div>
              </div>
              {/* The "Schedule a debrief" card was removed: its CTA pointed at
                  https://calendly.com (Calendly's own homepage), so the
                  highest-intent button on the page went nowhere. Restore it
                  once a real booking URL exists. */}
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

.upgrade-card {
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

.upgrade-card h3 {
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

.upgrade-summary {
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

/* === RESULTS: EMAIL GATE === */
.results-subhead {
  font-size: 1rem;
  color: var(--text-secondary);
  margin-bottom: 1.75rem;
}

.email-gate {
  max-width: 560px;
  margin: 0 auto;
  padding: 1.5rem;
  border: 2px solid #000000;
  border-radius: var(--radius);
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  text-align: left;
}

.email-gate-label {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
}

.email-gate-row {
  display: flex;
  gap: 0.75rem;
  align-items: stretch;
}

.email-gate-row input {
  flex: 1;
  min-width: 0;
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

.email-gate-row input:focus {
  outline: none;
  border-color: #000000;
  box-shadow: 0 0 0 1px #000000;
}

.email-gate-row input::placeholder {
  color: var(--text-muted);
}

.email-gate-row input[aria-invalid='true'] {
  border-color: var(--red);
}

/* .btn-primary is full-width with a top margin for the standalone step
   buttons; inside the gate it sits inline next to the input. */
.email-gate-row .btn-primary {
  width: auto;
  flex-shrink: 0;
  margin-top: 0;
  padding: 0.875rem 1.5rem;
  white-space: nowrap;
}

.email-gate-error {
  margin-top: 0.625rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--red);
}

.email-gate-note {
  margin-top: 0.75rem;
  font-size: 0.82rem;
  line-height: 1.5;
  color: var(--text-muted);
}

.delivery-status {
  max-width: 400px;
  margin: 0.875rem auto 0;
  font-size: 0.85rem;
  line-height: 1.5;
  color: var(--text-muted);
}

.delivery-sent {
  color: #111111;
  font-weight: 600;
}

.delivery-failed {
  color: var(--text-secondary);
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

  .upgrade-card {
    padding: 1.25rem;
  }

  .upgrade-card h3 {
    font-size: 1.25rem;
  }

  .upgrade-price {
    font-size: 2rem;
  }

  .email-gate {
    padding: 1.25rem;
  }

  /* Side-by-side input + button leaves the input too narrow to read a typed
     address on a phone — stack them instead. */
  .email-gate-row {
    flex-direction: column;
  }

  .email-gate-row .btn-primary {
    width: 100%;
  }

  .nav-row {
    gap: 0.5rem;
  }

  .btn-back {
    font-size: 0.85rem;
  }
}
`;


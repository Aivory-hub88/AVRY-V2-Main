'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './HeroOrbit.module.css';

/** Things a business would actually ask Aivory to run. They type themselves
 *  into the empty field one after another. No full stops (on-screen copy rule). */
const EXAMPLES = [
  'Reconcile Odoo invoices with Stripe and flag mismatches',
  'Forecast next quarter’s cash flow and brief the board',
  'Reorder stock before any SKU runs low',
  'Score inbound leads and route the best to sales',
  'Find where approvals stall and fix the flow',
  'Close the books by day three, variance report included',
];

const ICONS = '/integrations/icons';
const APPS: [string, string][] = [
  ['Slack', `${ICONS}/slack.svg`],
  ['Gmail', `${ICONS}/gmail.svg`],
  ['Notion', `${ICONS}/notion.svg`],
  ['HubSpot', '/landing/hero/app-hubspot.svg'],
  ['Google Calendar', `${ICONS}/google-calendar.svg`],
  ['Google Drive', `${ICONS}/google-drive.svg`],
  ['Microsoft Teams', `${ICONS}/microsoft-teams.svg`],
  ['Outlook', `${ICONS}/outlook.svg`],
  ['Jira', `${ICONS}/jira.svg`],
  ['Salesforce', `${ICONS}/salesforce.svg`],
  ['Shopify', `${ICONS}/shopify.svg`],
  ['Odoo', `${ICONS}/odoo.svg`],
  ['WhatsApp', `${ICONS}/whatsapp.svg`],
];

/** Where a prompt typed into the hero is handed over (read after sign-up). */
export const HERO_PROMPT_KEY = 'aivory:hero-prompt';
const TARGET = '/free-diagnostic';

/** Types each example in, holds it, deletes it, moves on. Stops while the
 *  visitor has focus or text in the field, and under reduced motion. */
function useTypedExample(paused: boolean) {
  const [text, setText] = useState(EXAMPLES[0]);
  useEffect(() => {
    if (paused) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let i = 0;
    let n = EXAMPLES[0].length;
    let deleting = false;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => {
      const full = EXAMPLES[i];
      if (!deleting && n >= full.length) {
        deleting = true;
        t = setTimeout(tick, 2600);
        return;
      }
      if (deleting && n <= 0) {
        deleting = false;
        i = (i + 1) % EXAMPLES.length;
        t = setTimeout(tick, 320);
        return;
      }
      n += deleting ? -1 : 1;
      setText(EXAMPLES[i].slice(0, n));
      t = setTimeout(tick, deleting ? 14 : 34 + Math.random() * 30);
    };
    t = setTimeout(tick, 2600);
    return () => clearTimeout(t);
  }, [paused]);
  return text;
}

/**
 * The console composer from the dashboard, on the hero: message on top, + and
 * send in a toolbar row, and the "connect your apps" strip underneath. Sending
 * keeps the prompt for after sign-up and opens the free analysis.
 */
export default function HeroPrompt() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const example = useTypedExample(focused || value.length > 0);

  const send = (e?: FormEvent) => {
    e?.preventDefault();
    const prompt = value.trim();
    if (prompt) {
      try {
        sessionStorage.setItem(HERO_PROMPT_KEY, prompt);
      } catch {
        /* storage blocked: the prompt is a nicety, the link still works */
      }
    }
    router.push(TARGET);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) send(e);
  };

  return (
    <form className={styles.prompt} onSubmit={send}>
      <div className={styles.promptCard}>
        <textarea
          ref={ref}
          rows={2}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={onKey}
          placeholder={example}
          aria-label="Tell Aivory what to take off your plate"
          className={styles.promptInput}
        />
        <div className={styles.promptBar}>
          <button
            type="button"
            className={styles.promptIcon}
            aria-label="Add a file"
            onClick={() => ref.current?.focus()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button type="submit" className={styles.promptSend} aria-label="Send">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 10 4 15 9 20" />
              <path d="M20 4v7a4 4 0 0 1-4 4H4" />
            </svg>
          </button>
        </div>
      </div>
      <div className={styles.promptApps}>
        <span className={styles.promptAppIcons} aria-hidden>
          {APPS.map(([name, src]) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={name}
              src={src}
              alt=""
              title={name}
              width={16}
              height={16}
              loading="lazy"
              decoding="async"
              className={name === 'Odoo' ? styles.promptWordmark : undefined}
            />
          ))}
        </span>
        <span className={styles.promptAppsLabel}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0V8ZM12 18v4" />
          </svg>
          Connect your apps to do more
        </span>
      </div>
    </form>
  );
}

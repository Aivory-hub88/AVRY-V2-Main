import s from './landing.module.css';
import LandingCta from './LandingCta';

// Only claims Aivory already makes elsewhere on the site; no third-party
// certification marks.
const STARS = Array.from({ length: 12 }, (_, k) => {
  const a = (k * Math.PI) / 6;
  return { cx: (24 + 19 * Math.cos(a)).toFixed(1), cy: (24 + 19 * Math.sin(a)).toFixed(1) };
});

export default function PrivacyPanel() {
  return (
    <section id="privacy-section" className={`${s.band} ${s.light}`}>
      <div className={s.wrap}>
        <div className={s.secGrid}>
          <div className={s.secCopy}>
            <h2 className={s.h2}>
              Scale with <span className={s.dim}>privacy</span>
            </h2>
            <p>Aivory runs on infrastructure you control. We don&apos;t train on your data and we don&apos;t keep copies.</p>
            <div className={s.row}>
              <LandingCta href="/free-diagnostic">Start free diagnostic</LandingCta>
              <LandingCta ghost external href="https://book.aivory.uk/book/aivory-call">
                Talk to sales
              </LandingCta>
            </div>
          </div>
          <div className={s.secBadges}>
            <div className={s.ticks}><i /><i /><i /><i /><i /></div>
            <div className={s.marks}>
              <div className={s.mark}>
                <svg viewBox="0 0 48 48" aria-hidden="true">
                  <g fill="currentColor">{STARS.map((p) => <circle key={`${p.cx}-${p.cy}`} cx={p.cx} cy={p.cy} r="1.8" />)}</g>
                  <path d="M17 24.5l5 5 9-10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <b>GDPR</b><small>By design</small>
              </div>
              <div className={s.mark}>
                <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" aria-hidden="true">
                  <rect x="10" y="21" width="28" height="20" rx="4" /><path d="M16 21v-5a8 8 0 0116 0v5" />
                  <circle cx="24" cy="31" r="2.5" fill="currentColor" stroke="none" />
                </svg>
                <b>AES-256</b><small>Encrypted at rest</small>
              </div>
              <div className={s.mark}>
                <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                  <rect x="9" y="9" width="30" height="30" rx="5" /><path d="M16 18h16M16 24h10M16 30h6" /><path d="M8 40L40 8" />
                </svg>
                <b>Zero logs</b><small>No transcripts kept</small>
              </div>
              <div className={s.mark}>
                <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" aria-hidden="true">
                  <path d="M24 6l15 6v11c0 9.5-6.4 16.4-15 19-8.6-2.6-15-9.5-15-19V12z" /><path d="M17 23h14v9H17z" />
                </svg>
                <b>Private</b><small>Your own network</small>
              </div>
            </div>
            <div className={s.ticks}><i /><i /><i /><i /><i /></div>
          </div>
        </div>
        <div className={s.secList}>
          <div><b>No third-party sharing</b><span>Nothing goes to advertisers or analytics vendors.</span></div>
          <div><b>End-to-end private</b><span>Encrypted in transit from first request to response.</span></div>
          <div><b>Enterprise grade</b><span>Roles, audit trails and SSO in every workspace.</span></div>
          <div><b>No model training</b><span>Prompts, documents and outputs never train a model.</span></div>
        </div>
      </div>
    </section>
  );
}

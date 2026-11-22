import s from './landing.module.css';
import LandingCta from './LandingCta';
import WorkflowBuilderDemo from './WorkflowBuilderDemo';

/* How Aivory works, told through Aivory Aether (this section absorbed the
   former "How it works" band, so the page carries one story instead of two).
   Aivory Aether: the reasoning layer behind the Deep Diagnostic.
   Positioned as Aivory's brain and engine, never as a model of its own:
   it decides what to ask, what to recommend and what to build.
   Each card mirrors a real stage of the diagnostic state machine
   (website context -> adaptive questions -> recommendation), then the
   workflow builder, where Aether turns a brief into a workflow, and last
   the governed agents that run it (approval + audit trail). The example
   company and numbers are illustrative. */

const ICONS = {
  understands: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  reasons: 'M6 3v12M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 9a9 9 0 0 1-9 9',
  recommends: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9',
  builds: 'M4 4h6v6H4zM14 14h6v6h-6zM7 10v4a3 3 0 0 0 3 3h4M17 14V7l-3 3m3-3 3 3',
  runs: 'M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3zM9 12l2 2 4-4',
} as const;

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <span className={s.aeIcon} aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d={ICONS[name]} />
      </svg>
    </span>
  );
}

function Understands() {
  return (
    <div className={s.hwMock} aria-hidden="true">
      <div className={s.aeSource}>
        <span className={s.aeLive} />
        <span>Reading northwind-logistics.com</span>
        <span className={s.aeBar}><i /></span>
      </div>
      <dl className={s.aeProfile}>
        <div><dt>Industry</dt><dd>Freight forwarding</dd></div>
        <div><dt>Team</dt><dd>40 people</dd></div>
      </dl>
      <div className={s.aeTools}>
        <span data-c="violet">Odoo</span>
        <span data-c="red">Gmail</span>
        <span data-c="green">Sheets</span>
      </div>
    </div>
  );
}

function Reasons() {
  return (
    <div className={s.hwMock} aria-hidden="true">
      <ol className={s.aePath}>
        <li data-done>Profile</li>
        <li data-on>Approvals</li>
        <li>Costs</li>
        <li>Plan</li>
      </ol>
      <div className={s.aeEcho}>Invoices wait about 3 days for approval</div>
      <div className={s.aeAsk}>
        <span className={s.aeOrb} />
        Who signs them off today, and in which app?
      </div>
      <div className={s.aeChips}>
        <span data-sel>✓ Finance lead, by email</span>
        <span>Owner, in Odoo</span>
        <span>Nobody owns it</span>
      </div>
    </div>
  );
}

function Recommends() {
  return (
    <div className={s.aePlanWrap} aria-hidden="true">
      <div className={`${s.hwMock} ${s.aePlanCard}`}>
        <div className={s.aePlanHead}>Your plan<small>Built from 18 answers</small></div>
        <ol className={s.aePlan}>
          <li><b data-c="blue">1</b><span>Match invoices to POs in Odoo</span><em>12 h/week</em></li>
          <li><b data-c="orange">2</b><span>Route approvals over $500 to Finance</span><em>3 days → 4 h</em></li>
          <li><b data-c="green">3</b><span>Chase late payers automatically</span><em>DSO −9 days</em></li>
        </ol>
      </div>
      <div className={`${s.hwMock} ${s.aeReady}`}>
        <span className={s.aeReadyRing}><i /></span>
        <b>Blueprint ready</b>
        <small>3 automations, ranked by impact</small>
        <span className={s.aeReadyBtn}>Open blueprint</span>
      </div>
    </div>
  );
}

function Runs() {
  return (
    <div className={s.hwDeploy} aria-hidden="true">
      <div className={`${s.hwMock} ${s.hwApprove}`}>
        <div className={s.hwApproveTop}>
          <span className={s.hwAv}>FA</span>
          <div>
            <b>Refund over $500</b>
            <small>Requested by Finance agent</small>
          </div>
          <span className={s.hwChip}>Needs approval</span>
        </div>
        <div className={s.hwBtns}><span data-p>Approve</span><span>Decline</span></div>
      </div>
      <ol className={`${s.hwMock} ${s.hwAudit}`}>
        <li><i />Finance agent drafted the refund<small>09:41</small></li>
        <li><i />Sent to Finance lead for approval<small>09:41</small></li>
        <li><i data-ok />Approved and posted to Odoo<small>09:43</small></li>
      </ol>
    </div>
  );
}

const CARDS = [
  { key: 'understands' as const, cls: s.aeA, tone: 'teal', title: 'Understands', body: 'Learns your business before it asks a single question', mock: <Understands /> },
  { key: 'reasons' as const, cls: s.aeB, tone: 'peach', title: 'Reasons', body: 'Every next question depends on your last answer', mock: <Reasons /> },
  { key: 'recommends' as const, cls: s.aeC, tone: 'indigo', title: 'Recommends', body: 'Ends with a plan you can act on, not a chat log', mock: <Recommends /> },
];

export default function AetherSection() {
  return (
    <section id="aether" className={`${s.band} ${s.light}`}>
      <div className={s.wrap}>
        <div className={s.head}>
          <img
            className={s.aeLockup}
            src="/landing/aether/aivory-aether-black.svg"
            alt="Aivory Aether"
            width={421}
            height={40}
          />
          <h2 className={s.h2}>
            Aether understands and streamlines
            <br />
            <span className={s.dim}>messy operations in 5&nbsp;minutes</span>
          </h2>
          <p className={s.lede}>
            The brain and engine behind Aivory learns your business, plans the change, then builds and runs it with governed agents
          </p>
        </div>
        <div className={s.ae}>
          {CARDS.map((c) => (
            <article key={c.key} className={`${s.hwCard} ${c.cls}`} data-ae={c.tone}>
              <div className={s.hwCopy}>
                <Icon name={c.key} />
                <h3>
                  {c.title} <span>{c.body}</span>
                </h3>
              </div>
              {c.mock}
            </article>
          ))}
          <article id="workflow-builder" className={`${s.hwCard} ${s.aeD}`} data-ae="mint">
            <div className={s.hwCopy}>
              <Icon name="builds" />
              <h3>
                Builds <span>Describe a process in plain language, Aether turns it into a workflow you review before it goes live</span>
              </h3>
            </div>
            <WorkflowBuilderDemo />
          </article>
          <article className={`${s.hwCard} ${s.aeE}`} data-tone="green">
            <div className={s.hwCopy}>
              <Icon name="runs" />
              <h3>
                Runs <span>Governed agents work inside your stack with approvals, audit trails and role-based access</span>
              </h3>
            </div>
            <Runs />
          </article>
        </div>
        <div className={`${s.row} ${s.aeCta}`}>
          <LandingCta href="/free-diagnostic">Meet Aether in your Deep Diagnostic</LandingCta>
        </div>
      </div>
    </section>
  );
}

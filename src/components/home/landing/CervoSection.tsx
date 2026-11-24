/* eslint-disable @next/next/no-img-element */
import { ChartColumn, CircleDollarSign, Headset, Monitor, Package, Scale, Settings2, TrendingUp, Users, type LucideIcon } from 'lucide-react';
import GrainBanner, { PALETTES } from './GrainBanner';
import s from './landing.module.css';

// 7 x 5 grid; the MCP tile sits mid-grid and is the lit one. `tint` colours
// icons whose SVGs are white-only (drawn for dark backgrounds).
const APP_ICONS: Array<{ name: string; src: string; wide?: boolean; tint?: string }> = [
  { name: 'Aivory Mail', src: 'aivory-mail.svg' },
  { name: 'Slack', src: 'slack.svg' },
  { name: 'Gmail', src: 'gmail.svg' },
  { name: 'Odoo', src: 'odoo.svg', wide: true },
  { name: 'HubSpot', src: 'hubspot-svgrepo-com.svg', tint: '#ff7a59' },
  { name: 'Notion', src: 'notion.svg' },
  { name: 'GitHub', src: 'github.svg' },
  { name: 'Salesforce', src: 'salesforce.svg' },
  { name: 'Telegram', src: 'telegram.svg' },
  { name: 'WhatsApp', src: 'whatsapp.svg' },
  { name: 'Discord', src: 'discord.svg' },
  { name: 'Jira', src: 'jira.svg' },
  { name: 'Linear', src: 'linear.svg' },
  { name: 'Microsoft Teams', src: 'microsoft-teams.svg' },
  { name: 'Trello', src: 'trello.svg' },
  { name: 'Google Drive', src: 'google-drive.svg' },
  { name: 'Zendesk', src: 'zendesk.svg', tint: '#03363d' },
  { name: 'MCP', src: 'MCP' },
  { name: 'Outlook', src: 'outlook.svg' },
  { name: 'Shopify', src: 'shopify.svg' },
  { name: 'Dropbox', src: 'dropbox.svg' },
  { name: 'OpenAI', src: 'openai.svg', tint: '#000000' },
  { name: 'Claude', src: 'claude.svg' },
  { name: 'Gemini', src: 'gemini.svg' },
  { name: 'Airtable', src: 'airtable.svg' },
  { name: 'Intercom', src: 'intercom.svg' },
  { name: 'Stripe', src: 'stripe-v2-svgrepo-com.svg', tint: '#635bff' },
  { name: 'Zoom', src: 'zoom.svg' },
  { name: 'Google Calendar', src: 'google-calendar.svg' },
  { name: 'Mailchimp', src: 'mailchimp.svg' },
  { name: 'Twilio', src: 'twilio.svg' },
  { name: 'SendGrid', src: 'sendgrid.svg' },
  { name: 'AWS', src: 'aws.svg' },
  { name: 'Amazon S3', src: 'aws-s3.svg' },
  { name: 'Tencent Cloud', src: 'tencent-cloud.svg' },
];

// Role glyphs: Lucide icons on graphite squircles, the same treatment as the
// How it works numbers and the Aether stage icons.
const ROLES: Array<{ label: string; Icon: LucideIcon }> = [
  { label: 'Finance', Icon: CircleDollarSign },
  { label: 'Sales', Icon: TrendingUp },
  { label: 'Operations', Icon: Settings2 },
  { label: 'Support', Icon: Headset },
  { label: 'People', Icon: Users },
  { label: 'Procurement', Icon: Package },
  { label: 'Legal', Icon: Scale },
  { label: 'IT', Icon: Monitor },
  { label: 'Analytics', Icon: ChartColumn },
];

function Line({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function AgentPic({ type, className }: { type: string; className?: string }) {
  return <img className={`${s.agentPic} ${className ?? ''}`} src={`/landing/agents/${type}.svg`} alt="" />;
}

function Task({ src, badge, tone, text, result, working }: {
  src: string; badge: string; tone: 'ok' | 'blue' | 'amb'; text: string; result: string; working?: boolean;
}) {
  return (
    <div className={s.task}>
      <div className={s.th}>
        <span className={s.thSrc}>{src}</span>
        <span className={`${s.bdg} ${s[tone]}`}>{badge}</span>
      </div>
      <p>{text}</p>
      <div className={`${s.res} ${working ? s.resDots : ''}`}>
        {working ? (<><i /><i /><i /></>) : <span aria-hidden="true">→</span>}
        {result}
      </div>
    </div>
  );
}

export default function CervoSection() {
  return (
    <section id="cervo" className={`${s.band} ${s.light}`}>
      <div className={s.wrap}>
        <div className={s.head}>
          <span className={s.eyebrow}><span className={s.eyebrowLogo} role="img" aria-label="Aivory" />Cervo</span>
          <h2 className={s.h2}>
            Agents that work like teammates
            <br />
            <span className={s.dim}>not like a chat window</span>
          </h2>
        </div>

        <div
          className={`${s.fb} ${s.fbCervo}`}
          role="img"
          aria-label="Aivory Cervo: a team of AI agents, each with its own brain, memory and computer"
        >
          <i className={`${s.fbGlow} ${s.g1}`} />
          <i className={`${s.fbGlow} ${s.g2}`} />
          <i className={`${s.fbGlow} ${s.g3}`} />
          <GrainBanner
            palette={PALETTES.ember}
            lockup="/landing/brand/cervo-lockup.svg"
            lockupWidth={38.5}
            lockupRatio={664 / 78}
            copy={<>A team of AI agents,<br />each with its own brain,<br />memory and computer</>}
          />
          <img className={s.fbPeople} src="/landing/cervo-team.webp?v=3" alt="" width={1600} height={739} />
        </div>

        {/* Connectivity strip, as in Figma (node 13:8902). */}
        <div className={s.caps} aria-label="Connectivity">
          <div className={s.cap}>
            <span>100+ Apps Integrations</span>
            <span className={s.chip}>
              <img className={s.chipIc} src="/landing/strip/puzzle.svg" alt="" />
              Integrations
              <span className={s.stack} aria-hidden="true">
                <i><img src="/landing/strip/gmail.svg" alt="" /></i>
                <i><img src="/integrations/icons/google-calendar.svg" alt="" /></i>
                <i><img src="/landing/strip/salesforce.svg" alt="" /></i>
                <i><img src="/landing/strip/hubspot.svg" alt="" /></i>
              </span>
            </span>
          </div>
          <div className={s.cap}>
            <span>MCP Connection</span>
            <span className={s.chip}><img className={s.chipIc} src="/landing/mcp.svg" alt="" />Model Context Protocol</span>
          </div>
          <div className={s.cap}>
            <span>A2A Protocol</span>
            <span className={s.chip}>
              <img className={s.chipA2a} src="/landing/strip/a2a.svg" alt="" />
              <img className={s.chipText} src="/landing/strip/agent2agent-text.svg" alt="Agent2Agent" />
            </span>
          </div>
        </div>

        <div className={s.ig} aria-label="What every Cervo agent has">
          <article className={s.igc}>
            <h4>Memory &amp; Context</h4>
            <p className={s.igd}>Each agent remembers customers, vendors and past decisions, then applies them to the next task without being told twice.</p>
            <div className={`${s.igp} ${s.chatp}`}>
              <div className={s.chatH}>
                <AgentPic type="finance_invoice_ops" className={s.cvm} />
                <div><b>Finn</b><small>Finance &amp; Invoice Ops · Memory</small></div>
                <span className={s.pips} aria-hidden="true"><i /><i /><i /></span>
              </div>
              <div className={s.chatB}>
                <div className={`${s.bub} ${s.bubMe}`}>Send Acme Ltd their March invoice</div>
                <div className={`${s.bub} ${s.bubAg}`}>
                  <span className={s.agL}><i />Finn</span>
                  Sent INV-0412 in GBP with net 30 terms, as Acme Ltd prefers. PO number attached.
                </div>
              </div>
            </div>
          </article>

          <article className={s.igc}>
            <h4>100+ Apps &amp; Any MCP</h4>
            <p className={s.igd}>Agents read and write in the tools your teams already use. Plug in any MCP server and it becomes a new skill.</p>
            <div className={`${s.igp} ${s.icons}`}>
              {APP_ICONS.map((app) =>
                app.src === 'MCP' ? (
                  <span key={app.name} className={`${s.icoT} ${s.icoHot}`}><img src="/landing/mcp.svg" alt="MCP" /></span>
                ) : (
                  <span key={app.name} className={`${s.icoT} ${app.wide ? s.icoWide : ''}`}>
                    {app.tint ? (
                      <span
                        className={s.icoTint}
                        role="img"
                        aria-label={app.name}
                        style={{
                          backgroundColor: app.tint,
                          WebkitMaskImage: `url(/integrations/icons/${app.src})`,
                          maskImage: `url(/integrations/icons/${app.src})`,
                        }}
                      />
                    ) : (
                      <img src={`/integrations/icons/${app.src}`} alt={app.name} />
                    )}
                  </span>
                ),
              )}
            </div>
          </article>

          <article className={s.igc}>
            <h4>A Brain for Every Role</h4>
            <p className={s.igd}>Give each agent the reasoning model and toolkit its role needs. Finance thinks like finance, sales like sales.</p>
            <div className={`${s.igp} ${s.roles}`}>
              {ROLES.map((r) => (
                <div key={r.label} className={s.role}><span className={s.roleIc}><r.Icon strokeWidth={1.8} aria-hidden="true" /></span><span>{r.label}</span></div>
              ))}
            </div>
          </article>

          <article className={s.igc}>
            <h4>Its Own Computer</h4>
            <p className={s.igd}>Every agent works in an isolated workspace with a browser and files, so it finishes the task instead of describing it.</p>
            <div className={`${s.igp} ${s.agentp}`}>
              <div className={s.st}><i />Active · Browser · Files · Sandbox</div>
              <div className={s.flow}>
                <span className={s.bx}><Line d="M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3z" /></span>
                <span className={s.ln} />
                <span className={s.bx}><Line d="M9 12h6M9 16h6M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h5.6L19 9.4V19a2 2 0 01-2 2z" /></span>
                <span className={s.ln} />
                <span className={s.bx}><img src="/integrations/icons/google-drive.svg" alt="Google Drive" /></span>
              </div>
              <Task src="Odoo · Aged receivables" badge="Processing" tone="blue" text="“Export overdue invoices for March”" result="Opening browser · Filtering 214 rows" working />
              <Task src="Sheets · Cash forecast" badge="Synced" tone="ok" text="“Update the 13-week forecast”" result="Forecast refreshed, #finance notified" />
            </div>
          </article>

          <article className={s.igc}>
            <h4>Agents That Work as a Team</h4>
            <p className={s.igd}>Built on the full A2A protocol, agents talk to each other and work as a team, inside Aivory and beyond.</p>
            <div className={`${s.igp} ${s.agentp}`}>
              <div className={s.st}><i />Active · A2A · Team chat</div>
              <div className={s.flow}>
                <AgentPic type="leads_qualifier" className={s.flowPic} /><small className={s.fl}>Lex</small>
                <span className={s.arr}><Line d="M16 3l4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16" /></span>
                <AgentPic type="finance_invoice_ops" className={s.flowPic} /><small className={s.fl}>Finn</small>
              </div>
              <Task src="Lex (Sales) ↔ Finn (Finance)" badge="Agreed" tone="ok" text="“Acme Ltd closed, 12 seats. Net 30?”" result="Finn: yes, INV-0412 drafted with deal terms" />
              <Task src="Support ↔ Operations" badge="Working" tone="blue" text="“Replacement unit for order #9042”" result="Checking stock · Booking courier" working />
            </div>
          </article>

          <article className={s.igc}>
            <h4>Governed by Approvals</h4>
            <p className={s.igd}>Agents ask before they act on anything that matters. Approve or deny from the console or straight from Slack.</p>
            <div className={`${s.igp} ${s.agentp}`}>
              <div className={s.st}><i />Active · Approvals · Audit log</div>
              <div className={s.flow}>
                <span className={`${s.tg} ${s.tgOn}`}>Policy</span>
                <span className={`${s.tg} ${s.tgOn}`}>Limit</span>
                <span className={`${s.tg} ${s.tgOn}`}>Approver</span>
                <span className={s.tg}>Audit</span>
              </div>
              <Task src="Finance · Refund $640" badge="Pending" tone="amb" text="“Refund order #9042 for Acme Ltd”" result="Waiting for Rachel in Slack" />
              <Task src="Operations · PO $2,400" badge="Approved" tone="ok" text="“Restock 40 units from Northwind Logistics”" result="Approved by Ben, logged to audit trail" />
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

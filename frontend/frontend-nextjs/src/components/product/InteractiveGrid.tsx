'use client';

import { MouseEvent, useRef, useEffect, useState } from 'react';
import Image from 'next/image';

// Reusable Spotlight Card Component
function SpotlightCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cardRef.current.style.setProperty('--mouse-x', `${x}px`);
    cardRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={`spotlight-card rounded-2xl border border-white/5 bg-zinc-950/65 shadow-lg ${className}`}
    >
      {children}
    </div>
  );
}

// ── Autonomous Agent Card ─────────────────────────────────
// Animated chat conversation cycling through Slack, WhatsApp, Telegram interfaces
function AutonomousAgentAnimation() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase(p => (p + 1) % 3);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const platforms = [
    {
      name: 'Slack',
      icon: '/integrations/icons/slack.svg',
      bg: '#1a1a2e',
      headerBg: '#2D2D3F',
      channel: '#sales-leads',
      messages: [
        { from: 'user', text: 'New lead from contact form — urgent' },
        { from: 'agent', text: 'Lead triaged. Priority: High. CRM updated, Slack alert sent to sales team.' },
      ],
    },
    {
      name: 'WhatsApp',
      icon: '/integrations/icons/whatsapp.svg',
      bg: '#0b141a',
      headerBg: '#1F2C33',
      channel: 'Customer Support',
      messages: [
        { from: 'user', text: 'Hi, I need help with my order #4821' },
        { from: 'agent', text: 'Order #4821 found. Status: shipped. ETA: Tomorrow. Tracking link sent.' },
      ],
    },
    {
      name: 'Telegram',
      icon: '/integrations/icons/telegram.svg',
      bg: '#17212b',
      headerBg: '#242F3D',
      channel: 'Ops Notifications',
      messages: [
        { from: 'user', text: 'Schedule a follow-up with prospect ABC Corp' },
        { from: 'agent', text: 'Follow-up scheduled for tomorrow 2PM. Calendar invite sent. Email draft ready.' },
      ],
    },
  ];

  const current = platforms[phase];

  return (
    <div className="w-full h-full flex flex-col rounded-xl overflow-hidden border border-white/5 transition-all duration-700">
      {/* Platform Header */}
      <div
        className="flex items-center gap-2.5 px-4 py-2.5 border-b border-white/5 transition-colors duration-700"
        style={{ backgroundColor: current.headerBg }}
      >
        <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 bg-white/10 flex items-center justify-center">
          <Image src={current.icon} alt={current.name} width={14} height={14} />
        </div>
        <div className="flex flex-col">
          <span className="text-[11px] text-white/90 font-medium">{current.name}</span>
          <span className="text-[9px] text-white/40">{current.channel}</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {platforms.map((p, i) => (
            <div
              key={p.name}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                i === phase ? 'bg-white/80 w-4' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div
        className="flex-1 flex flex-col gap-3 px-4 py-4 transition-colors duration-700 relative overflow-hidden"
        style={{ backgroundColor: current.bg }}
      >
        {current.messages.map((msg, i) => (
          <div
            key={`${phase}-${i}`}
            className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'} opacity-0 animate-fade-in-up`}
            style={{ animationDelay: `${i * 0.6 + 0.3}s`, animationFillMode: 'forwards' }}
          >
            <div
              className={`max-w-[85%] px-3 py-2 rounded-xl text-[11px] leading-relaxed ${
                msg.from === 'user'
                  ? 'bg-white/10 text-white/90 rounded-br-sm'
                  : 'bg-white/5 border border-white/10 text-white/70 rounded-bl-sm'
              }`}
            >
              {msg.from === 'agent' && (
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-3 h-3 rounded-full bg-white/20 flex items-center justify-center">
                    <svg className="w-2 h-2 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className="text-[9px] text-white/40 font-medium uppercase tracking-wider">Aivory Agent</span>
                </div>
              )}
              {msg.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Template Library Card ─────────────────────────────────
// Grid of thumbnail cards with outline SVG icons
function TemplateLibraryAnimation() {
  const templates = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      ),
      label: 'Email Triage',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      ),
      label: 'Lead Routing',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
      label: 'Doc Parsing',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
      ),
      label: 'Alerts',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
      label: 'Analytics',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
        </svg>
      ),
      label: 'Chatbot',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: 'Invoice',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
        </svg>
      ),
      label: 'CRM Sync',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
      label: 'Scheduler',
    },
  ];

  return (
    <div className="w-full h-full grid grid-cols-3 gap-2.5">
      {templates.map((tmpl, i) => (
        <div
          key={tmpl.label}
          className="flex flex-col items-center justify-center gap-2 bg-[#111111] border border-white/5 rounded-xl p-3 hover:border-white/15 hover:bg-white/[0.03] transition-all duration-300 cursor-default group"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          <div className="text-white/40 group-hover:text-white/70 transition-colors duration-300">
            {tmpl.icon}
          </div>
          <span className="text-[9px] text-white/40 group-hover:text-white/60 font-medium uppercase tracking-wider transition-colors duration-300 text-center leading-tight">
            {tmpl.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── App Integrations Card ─────────────────────────────────
// Grid of real integration logos from the Aivory Dashboard
function AppIntegrationsAnimation() {
  const apps = [
    { name: 'Slack', icon: '/integrations/icons/slack.svg' },
    { name: 'Gmail', icon: '/integrations/icons/gmail.svg' },
    { name: 'HubSpot', icon: '/integrations/icons/hubspot-svgrepo-com.svg' },
    { name: 'Notion', icon: '/integrations/icons/notion.svg' },
    { name: 'GitHub', icon: '/integrations/icons/github.svg' },
    { name: 'Salesforce', icon: '/integrations/icons/salesforce.svg' },
    { name: 'Telegram', icon: '/integrations/icons/telegram.svg' },
    { name: 'WhatsApp', icon: '/integrations/icons/whatsapp.svg' },
    { name: 'Discord', icon: '/integrations/icons/discord.svg' },
    { name: 'Stripe', icon: '/integrations/icons/stripe-v2-svgrepo-com.svg' },
    { name: 'Airtable', icon: '/integrations/icons/airtable.svg' },
    { name: 'Jira', icon: '/integrations/icons/jira.svg' },
    { name: 'MS Teams', icon: '/integrations/icons/microsoft-teams.svg' },
    { name: 'Trello', icon: '/integrations/icons/trello.svg' },
    { name: 'Google Drive', icon: '/integrations/icons/google-drive.svg' },
    { name: 'Mailchimp', icon: '/integrations/icons/mailchimp.svg' },
    { name: 'Outlook', icon: '/integrations/icons/outlook.svg' },
    { name: 'SendGrid', icon: '/integrations/icons/sendgrid.svg' },
    { name: 'Linear', icon: '/integrations/icons/linear.svg' },
    { name: 'Dropbox', icon: '/integrations/icons/dropbox.svg' },
    { name: 'OpenAI', icon: '/integrations/icons/openai.svg' },
    { name: 'Twilio', icon: '/integrations/icons/twilio.svg' },
    { name: 'Intercom', icon: '/integrations/icons/intercom.svg' },
    { name: 'Zendesk', icon: '/integrations/icons/zendesk.svg' },
    { name: 'Shopify', icon: '/integrations/icons/shopify.svg' },
    { name: 'Calendar', icon: '/integrations/icons/google-calendar.svg' },
    { name: 'AWS S3', icon: '/integrations/icons/aws-s3.svg' },
    { name: 'HTTP API', icon: '/integrations/icons/http-api.svg' },
  ];

  return (
    <div className="w-full h-full grid grid-cols-7 gap-2">
      {apps.map((app, i) => (
        <div
          key={app.name}
          className="flex items-center justify-center aspect-square bg-[#111111] border border-white/5 rounded-lg hover:border-white/15 hover:bg-white/[0.03] transition-all duration-300 cursor-default group"
        >
          {/* Using standard img for SVG to prevent Next.js Image lazy loading/optimization issues */}
          <img
            src={app.icon}
            alt={app.name}
            width={22}
            height={22}
            className="opacity-70 group-hover:opacity-100 transition-opacity duration-300"
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}

export function InteractiveGrid() {
  return (
    <section className="bg-black text-white py-24 px-6 md:px-16 lg:px-24 border-b border-white/10 relative">
      {/* Background grid line overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />

      <div className="w-full !max-w-6xl !mx-auto relative z-10">
        <div className="text-center mb-16 !max-w-xl !mx-auto">
          <h2 className="text-[#c4c9b8] uppercase tracking-widest text-xs font-manrope font-light mb-3">
            Core Utilities
          </h2>
          <h3 className="text-4xl md:text-5xl font-light tracking-tight mb-4">
            And much more
          </h3>
          <p className="text-white/60 max-w-xl mx-auto font-light leading-relaxed">
            Standard utilities to bridge automation across your operations, connect apps, and customize pre-built templates.
          </p>
        </div>

        {/* 3-Column Grid Layout matching Grok style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Card 1: Autonomous AI Agent */}
          <SpotlightCard className="flex flex-col p-6">
            <div className="relative z-10 mb-5">
              <h4 className="text-lg font-medium text-white mb-2">Autonomous AI Agent</h4>
              <p className="text-white/50 text-[13px] font-light leading-relaxed">
                Deploy autonomous agents inside your communication hubs. They triage, respond, and update your CRM 24/7.
              </p>
            </div>
            {/* Animated chat interface */}
            <div className="relative z-10 flex-1 min-h-[220px]">
              <AutonomousAgentAnimation />
            </div>
          </SpotlightCard>

          {/* Card 2: App Integrations */}
          <SpotlightCard className="flex flex-col p-6">
            <div className="relative z-10 mb-5">
              <h4 className="text-lg font-medium text-white mb-2">App Integrations</h4>
              <p className="text-white/50 text-[13px] font-light leading-relaxed">
                Connect your external applications and seamlessly search across conversations, documents and emails.
              </p>
            </div>
            {/* Integration logos grid */}
            <div className="relative z-10 flex-1 min-h-[220px]">
              <AppIntegrationsAnimation />
            </div>
          </SpotlightCard>

          {/* Card 3: Template Library */}
          <SpotlightCard className="flex flex-col p-6">
            <div className="relative z-10 mb-5">
              <h4 className="text-lg font-medium text-white mb-2">Template Library</h4>
              <p className="text-white/50 text-[13px] font-light leading-relaxed">
                Speed up deployment with pre-built template flows. Connect tools and route notifications instantly.
              </p>
            </div>
            {/* Template thumbnails */}
            <div className="relative z-10 flex-1 min-h-[220px]">
              <TemplateLibraryAnimation />
            </div>
          </SpotlightCard>

        </div>
        
        {/* NEW AGENT CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          {NEW_AGENTS.map((agent, idx) => (
            <AgentCard key={idx} agent={agent} />
          ))}
        </div>
        
        {/* Scrolling Logo Marquee */}
        <IntegrationsMarquee />
        
      </div>
    </section>
  );
}

function IntegrationsMarquee() {
  const logos = [
    { name: 'Zoom', icon: '/integrations/icons/discord.svg' }, // using placeholder icons if real ones missing
    { name: 'Letta', icon: '/integrations/icons/stripe-v2-svgrepo-com.svg' },
    { name: 'Glean', icon: '/integrations/icons/google-drive.svg' },
    { name: 'HubSpot', icon: '/integrations/icons/hubspot-svgrepo-com.svg' },
    { name: 'Slack', icon: '/integrations/icons/slack.svg' },
    { name: 'Salesforce', icon: '/integrations/icons/salesforce.svg' },
    { name: 'OpenAI', icon: '/integrations/icons/openai.svg' },
    { name: 'Zendesk', icon: '/integrations/icons/zendesk.svg' },
    { name: 'GitHub', icon: '/integrations/icons/github.svg' },
  ];

  // duplicate logos for seamless scrolling
  const marqueeItems = [...logos, ...logos];

  return (
    <div className="w-full mt-32 mb-10 overflow-hidden relative opacity-40 hover:opacity-100 transition-opacity duration-700">
      {/* gradient masks for smooth edges */}
      <div className="absolute top-0 left-0 w-32 md:w-64 h-full bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
      <div className="absolute top-0 right-0 w-32 md:w-64 h-full bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
      
      <div className="flex w-[200%] animate-marquee">
        {marqueeItems.map((item, idx) => (
          <div key={idx} className="flex flex-1 items-center justify-center gap-3 grayscale transition-all duration-300 px-8">
            {item.name === 'Zoom' || item.name === 'Glean' ? null : (
              <img src={item.icon} alt={item.name} className="w-7 h-7 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />
            )}
            <span className="text-white/80 font-semibold text-xl tracking-tight" style={{ fontFamily: item.name === 'Zoom' ? 'sans-serif' : 'inherit' }}>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const NEW_AGENTS = [
  {
    color: '#9B91EE',
    title: 'Customer Service Agent',
    description: 'Handle inbound support 24/7. Automatically triage, resolve, and escalate to a human if necessary.',
    messages: [
      { from: 'user', text: 'Hi, where is my order? It was supposed to arrive today.' },
      { from: 'agent', sender: 'Customer Service', text: 'Hello! Your order has been processed. Estimated delivery: 2-3 business days.' }
    ],
    status: 'Active · 24/7 · WhatsApp + Telegram'
  },
  {
    color: '#3ECFA0',
    title: 'Leads Qualifier Agent',
    description: 'Filter inbound leads using the BANT framework. Qualified leads are automatically routed to sales.',
    messages: [
      { from: 'user', text: "I'm interested in the Enterprise plan for my team of 50." },
      { from: 'agent', sender: 'Leads Qualifier', text: 'BANT Score: 7/8 — QUALIFIED ✓\nRouting to Sales Outreach...' }
    ],
    status: 'Active · BANT scoring · CRM sync'
  },
  {
    color: '#F5C068',
    title: 'Meeting Intelligence',
    description: 'Turn meeting transcripts into summaries, action items, & decisions synced directly to Notion & Slack.',
    messages: [
      { from: 'user', text: 'Can you summarize the Q3 Planning meeting?' },
      { from: 'agent', sender: 'Meeting Intelligence', text: '3 action items detected · 1 decision · Sent to #general' }
    ],
    status: 'Active · Notion + Slack + Sheets'
  }
];

function AgentCard({ agent }: { agent: typeof NEW_AGENTS[0] }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Add a random initial offset to stagger the cards slightly
    const randomOffset = Math.random() * 1500;
    
    let timer: NodeJS.Timeout;
    const startCycle = () => {
      const delays = [500, 1500, 2000, 4500]; // 0: clear, 1: user msg, 2: typing, 3: reply
      const nextStep = (current: number) => {
        const next = (current + 1) % 4;
        setStep(next);
        timer = setTimeout(() => nextStep(next), delays[next]);
      };
      // start immediately from step 0
      timer = setTimeout(() => nextStep(0), delays[0]);
    };
    
    const initTimer = setTimeout(startCycle, randomOffset);
    return () => {
      clearTimeout(initTimer);
      clearTimeout(timer);
    };
  }, []);

  return (
    <SpotlightCard className="group flex flex-col p-6 relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-white/10 cursor-default">
      <div className="relative z-10 mb-5 flex-shrink-0">
        <h4 className="text-lg font-medium text-white mb-2">
          {agent.title}
        </h4>
        <p className="text-white/50 text-[13px] font-light leading-relaxed">
          {agent.description}
        </p>
      </div>

      {/* Animation Element */}
      <div className="relative z-10 flex-1 min-h-[250px] bg-[#0A0A0A] border border-white/5 rounded-xl mt-auto overflow-hidden flex flex-col pt-14 pb-4">
        
        {/* Status Header */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <div className="relative flex items-center justify-center w-2 h-2">
            <span className="absolute inline-flex w-full h-full rounded-full bg-green-500 opacity-75 animate-ping" />
            <span className="relative inline-flex w-2 h-2 rounded-full bg-green-500" />
          </div>
          <span className="text-[9px] text-white/40 uppercase tracking-wider font-medium">
            {agent.status}
          </span>
        </div>

        {/* Conversation Area */}
        <div className="w-full px-5 flex flex-col gap-4 mt-2">
          
          {/* User Message */}
          <div className={`flex justify-end transition-all duration-500 ease-out ${step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            <div className="bg-white/10 p-3 rounded-2xl rounded-br-sm max-w-[85%] border border-white/5 shadow-sm">
               <div className="text-white/90 text-[11px] leading-relaxed">
                 {agent.messages[0].text}
               </div>
            </div>
          </div>

          {/* Agent Side */}
          <div className="relative min-h-[70px]">
            {/* Typing Dots */}
            <div className={`absolute left-0 transition-all duration-300 ${step === 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
              <div className="flex space-x-1.5 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm w-fit">
                <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>

            {/* Agent Reply */}
            <div className={`absolute left-0 w-full transition-all duration-500 ease-out ${step >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
              <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl rounded-bl-sm shadow-lg backdrop-blur-md max-w-[95%]">
                 <div className="text-[9px] uppercase tracking-wider font-bold text-[#c4c9b8] mb-1.5">
                    {agent.messages[1].sender}
                 </div>
                 <div className="text-white/90 text-[11px] leading-relaxed whitespace-pre-wrap">
                   {agent.messages[1].text}
                 </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </SpotlightCard>
  )
}

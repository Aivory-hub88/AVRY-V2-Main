import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/Footer";
import { JsonLd, absoluteUrl, createBreadcrumbList } from "@/lib/seo";

export const metadata: Metadata = {
  title: "AI Lead Qualification Workflow | Aivory",
  description:
    'AI lead qualification workflow that scores, enriches and routes inbound leads in one pass. Deploy on Aivory in a day.',
  alternates: { canonical: "/templates/lead-qualification" },
  openGraph: {
    type: "website",
    title: "AI Lead Qualification Workflow | Aivory",
    description:
      "Score, enrich and route inbound leads with an AI workflow. Deploy on Aivory in a day.",
    url: "/templates/lead-qualification",
    images: ["/hero-video-poster.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Lead Qualification Workflow | Aivory",
    description:
      "Score, enrich and route inbound leads with an AI workflow. Deploy on Aivory in a day.",
    images: ["/hero-video-poster.jpg"],
  },
};

const STEPS = [
  {
    title: "1. Capture",
    body: "New inbound leads land from your website form, CRM, inbox or a shared spreadsheet. No rigid schema required — the workflow reads whatever the prospect actually wrote.",
  },
  {
    title: "2. Classify & qualify",
    body: "AI scores the lead against your ideal-customer profile, extracts firmographics and intent signals, and pulls budget and timeline context from the message.",
  },
  {
    title: "3. Route & log",
    body: "The vetted lead is pushed to your CRM or Slack channel with a qualifier score, summary and suggested next step. Sales stops triaging and starts closing.",
  },
];

const FAQS = [
  {
    question: "What counts as an inbound lead?",
    answer:
      "Anything that arrives with contact intent: a website form submission, a sales inbox email, a HubSpot or Salesforce record, or a row in a shared spreadsheet. The workflow accepts all of them.",
  },
  {
    question: "How is a lead scored?",
    answer:
      "You define the ideal-customer profile — industry, company size, budget, use case, timeline. Aivory's AI reads the inbound message and assigns a qualifier score and route decision against those rules.",
  },
  {
    question: "Does this replace our CRM?",
    answer:
      "No. Aivory writes into your CRM, but the workflow automates the qualification work — your CRM stays the source of truth.",
  },
  {
    question: "How long does deployment take?",
    answer:
      "One to two days for most teams. Aivory generates the workflow from your description, you connect your channels, and the first qualified lead lands without you touching a line of code.",
  },
];

function StepBlock({ title, body }: { title: string; body: string }) {
  return (
    <li className="border-t border-black/25 pt-6">
      <h3 className="text-[16px] font-medium text-[#11110f]">{title}</h3>
      <p className="mt-2 max-w-3xl text-[15px] font-light leading-[1.7] text-black/60">
        {body}
      </p>
    </li>
  );
}

export default function LeadQualificationTemplatePage() {
  const pageUrl = absoluteUrl("/templates/lead-qualification");

  const breadcrumb = createBreadcrumbList([
    { name: "Home", item: absoluteUrl("/") },
    { name: "AI Workflow Automation", item: absoluteUrl("/ai-workflow-automation") },
    { name: "Lead Qualification", item: pageUrl },
  ]);

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumb,
      {
        "@type": "WebPage",
        "@id": pageUrl,
        url: pageUrl,
        name: "AI Lead Qualification Workflow | Aivory",
        description:
          "Score, enrich and route inbound leads with an AI workflow. Deploy on Aivory in a day.",
        isPartOf: { "@id": absoluteUrl("/") },
      },
      {
        "@type": "HowTo",
        name: "How to automate lead qualification with Aivory",
        step: STEPS.map((s) => ({
          "@type": "HowToStep",
          name: s.title,
          text: s.body,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      },
    ],
  };

  return (
    <main className="min-h-screen bg-[#F6F4EF] text-[#11110f]">
      <Navbar />
      <section className="mx-auto max-w-5xl px-6 pt-24 pb-12 md:pt-32">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-black/45">
          Aivory Template · Lead Qualification
        </p>
        <h1 className="mt-6 max-w-3xl text-[38px] font-light leading-[1.05] tracking-[-0.045em] text-[#11110f] md:text-[60px]">
          AI Lead Qualification Workflow
        </h1>
        <p className="mt-6 max-w-2xl text-[16px] font-light leading-[1.7] text-black/65">
          Score, qualify and route every inbound lead without a manual pass.
          Aivory reads the message, decides whether it is worth a sales call,
          and drops the vetted lead into your CRM.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/free-diagnostic"
            className="rounded-full bg-[#11110f] px-6 py-3 text-[13px] font-medium text-white transition-opacity hover:opacity-80"
          >
            Start with a Free Assessment
          </Link>
          <Link
            href="/contact"
            className="rounded-full border border-black/20 px-6 py-3 text-[13px] font-medium text-[#11110f] transition-opacity hover:opacity-70"
          >
            Learn How to Deploy
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="text-[24px] font-light tracking-[-0.02em] text-[#11110f] md:text-[32px]">
          The problem it solves
        </h2>
        <p className="mt-4 max-w-3xl text-[15px] font-light leading-[1.7] text-black/65">
          Most sales teams lose leads in the gap between the form being
          submitted and someone being worth calling. Responses sit unread,
          low-intent contacts clog the pipeline, and high-intent leads go cold.
          This workflow closes that gap automatically.
        </p>
      </section>

      <section className="border-t border-black/10 bg-white/50">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-[24px] font-light tracking-[-0.02em] text-[#11110f] md:text-[32px]">
            How the workflow runs
          </h2>
          <ul className="mt-8 grid gap-8">
            {STEPS.map((s) => (
              <StepBlock key={s.title} title={s.title} body={s.body} />
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-[24px] font-light tracking-[-0.02em] text-[#11110f] md:text-[32px]">
          Integrations
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] font-light leading-[1.7] text-black/60">
          Reads and writes across the tools your revenue team already uses.
        </p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {["HubSpot", "Salesforce", "Gmail", "Slack", "Google Sheets", "Google Drive", "HTTP API"].map(
            (tool) => (
              <li
                key={tool}
                className="rounded-full border border-black/15 px-4 py-1.5 text-[13px] font-light text-black/70"
              >
                {tool}
              </li>
            ),
          )}
        </ul>
      </section>

      <section className="border-t border-black/10">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-[24px] font-light tracking-[-0.02em] text-[#11110f] md:text-[32px]">
            Expected outcome
          </h2>
          <p className="mt-4 max-w-3xl text-[15px] font-light leading-[1.7] text-black/65">
            A clean, prioritised pipeline. Every inbound lead is captured,
            scored and routed with no manual triage, and sales always knows
            which contact to call next.
          </p>
          <Link
            href="/ai-workflow-automation"
            className="group mt-6 inline-flex items-center gap-3 border-b border-black pb-1 text-[13px] font-light text-black transition-opacity hover:opacity-60"
          >
            Explore more AI workflow templates
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="text-[24px] font-light tracking-[-0.02em] text-[#11110f] md:text-[32px]">
          Common questions
        </h2>
        <div className="mt-8 grid gap-8">
          {FAQS.map((f) => (
            <div key={f.question} className="border-t border-black/25 pt-6">
              <h3 className="text-[16px] font-medium text-[#11110f]">{f.question}</h3>
              <p className="mt-2 max-w-3xl text-[15px] font-light leading-[1.7] text-black/60">
                {f.answer}
              </p>
            </div>
          ))}
        </div>
      </section>

      <JsonLd data={graph} />
      <Footer />
    </main>
  );
}
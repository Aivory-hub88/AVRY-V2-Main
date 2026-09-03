import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/Footer";
import {
  JsonLd,
  absoluteUrl,
  createBreadcrumbList,
  siteUrlFromHeaders,
} from "@/lib/seo";

export const metadata: Metadata = {
  title: "AI Workflow Automation for Business | Aivory",
  description:
    'Automate repetitive processes with AI workflow automation. Connect CRM, inbox and ops into intelligent workflows in days.',
  alternates: {
    canonical: "/ai-workflow-automation",
  },
  openGraph: {
    type: "website",
    title: "AI Workflow Automation for Business | Aivory",
    description:
      "Automate repetitive business processes with AI workflow automation. Connect your CRM, inbox and operations into intelligent no-code workflows.",
    url: "/ai-workflow-automation",
    images: ["/hero-video-poster.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Workflow Automation for Business | Aivory",
    description:
      "Automate repetitive business processes with AI workflow automation. Connect your CRM, inbox and operations into intelligent no-code workflows.",
    images: ["/hero-video-poster.jpg"],
  },
};

const FAQS = [
  {
    question: "What is AI workflow automation?",
    answer:
      "AI workflow automation uses an AI layer inside a workflow engine to classify, extract, route and generate. Instead of rigid if/then rules, the workflow reads unstructured inputs (email, tickets, documents, chat) and takes the right next action automatically.",
  },
  {
    question: "How is Aivory different from Zapier or Make?",
    answer:
      "Zapier and Make are excellent trigger-and-action tools. Aivory adds a governed AI layer: it classifies intent, extracts structured data from free text, drafts responses and decides routing. You get the reliability of a workflow builder with the judgment of an AI agent.",
  },
  {
    question: "Can I use AI workflow automation without code?",
    answer:
      "Yes. Aivory's workflow builder turns plain-language descriptions into executable workflows. Describe what you want — qualify leads, triage email, route support tickets — and Aivory generates the flow with connectors to your existing tools.",
  },
  {
    question: "What can I connect to my AI workflows?",
    answer:
      "Aivory connects to the tools you already use: Salesforce, HubSpot, Gmail, Google Drive, Slack, Discord, Telegram, Excel/Sheets, and HTTP APIs. Workflows can read, write and trigger across all of them.",
  },
  {
    question: "How long does it take to deploy?",
    answer:
      "A single AI workflow can go live in a day. The Aivory diagnostic tells you which processes are the highest ROI to automate first, and the blueprint maps the rollout so you avoid a stalled 'pilot that never ships'.",
  },
];

function WorkflowTemplate({
  title,
  href,
  description,
}: {
  title: string;
  href: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group border-t border-black/25 py-6 grid gap-2 md:grid-cols-[260px_minmax(0,1fr)] md:items-baseline"
    >
      <h3 className="text-[18px] font-light tracking-[-0.02em] text-[#11110f] group-hover:opacity-60 transition-opacity">
        {title}
      </h3>
      <p className="text-[14px] font-light leading-[1.7] text-black/60">
        {description}
      </p>
    </Link>
  );
}

export default function AIWorkflowAutomationPage() {
  const pageUrl = absoluteUrl("/ai-workflow-automation");

  const breadcrumb = createBreadcrumbList([
    { name: "Home", item: absoluteUrl("/") },
    { name: "AI Workflow Automation", item: pageUrl },
  ]);

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumb,
      {
        "@type": "WebPage",
        "@id": absoluteUrl("/ai-workflow-automation"),
        url: absoluteUrl("/ai-workflow-automation"),
        name: "AI Workflow Automation for Business | Aivory",
        description:
          "Automate repetitive business processes with AI workflow automation.",
        isPartOf: { "@id": absoluteUrl("/") },
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
          AI Operations · Workflow Automation
        </p>
        <h1 className="mt-6 max-w-3xl text-[40px] font-light leading-[1.02] tracking-[-0.045em] text-[#11110f] md:text-[68px]">
          Turn business processes into intelligent workflows.
        </h1>
        <p className="mt-6 max-w-2xl text-[16px] font-light leading-[1.7] text-black/65">
          Aivory automates the work between your tools. Route leads, triage
          tickets, process invoices and trigger decisions with AI that reads
          your unstructured input — no code, no brittle if-rules, no
          engineering ticket.
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
            Talk to the Team
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="text-[24px] font-light tracking-[-0.02em] text-[#11110f] md:text-[32px]">
          What AI workflow automation actually does
        </h2>
        <p className="mt-5 max-w-3xl text-[15px] font-light leading-[1.7] text-black/65">
          Traditional automation follows rigid rules: <em>if</em> the subject
          contains X, <em>then</em> do Y. That works for structured inputs and
          falls apart the moment language enters the picture. AI workflow
          automation adds three capabilities on top of a reliable workflow
          engine:
        </p>
        <ul className="mt-8 grid gap-8 md:grid-cols-3">
          <li className="border-t border-black/25 pt-5">
            <h3 className="text-[15px] font-medium text-[#11110f]">Classify</h3>
            <p className="mt-2 text-[14px] font-light leading-[1.7] text-black/60">
              Read the intent of an email, ticket, form or document and route
              it to the right queue, owner or workflow.
            </p>
          </li>
          <li className="border-t border-black/25 pt-5">
            <h3 className="text-[15px] font-medium text-[#11110f]">Extract</h3>
            <p className="mt-2 text-[14px] font-light leading-[1.7] text-black/60">
              Pull structured fields out of free text — company, budget, dates,
              invoice line items — and push them into your CRM or spreadsheet.
            </p>
          </li>
          <li className="border-t border-black/25 pt-5">
            <h3 className="text-[15px] font-medium text-[#11110f]">Act & generate</h3>
            <p className="mt-2 text-[14px] font-light leading-[1.7] text-black/60">
              Draft replies, create records, update statuses and kick off the
              next step — with clear approval boundaries.
            </p>
          </li>
        </ul>
      </section>

      <section className="border-t border-black/10 bg-white/50">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-[24px] font-light tracking-[-0.02em] text-[#11110f] md:text-[32px]">
            Start with ready-made templates
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] font-light leading-[1.7] text-black/60">
            Each template is a turnkey AI workflow: problem → flow →
            integrations → expected outcome. Deploy one today, customise
            tomorrow.
          </p>
          <div className="mt-10">
            <WorkflowTemplate
              title="Lead Qualification"
              href="/templates/lead-qualification"
              description="Score and route inbound leads, enrich them with a single AI pass, and hand the vetted list to sales."
            />
            <WorkflowTemplate
              title="Invoice Processing"
              href="/templates/invoice-processing"
              description="Extract line items from PDFs and emails, validate against purchase orders and flag exceptions."
            />
            <WorkflowTemplate
              title="Customer Onboarding"
              href="/templates/customer-onboarding"
              description="Detect new signups, gather the documents and CRM records, and trigger a personalised welcome flow."
            />
            <WorkflowTemplate
              title="Email Triage"
              href="/templates/email-triage"
              description="Classify inbound email by intent, auto-reply to routine asks and route the rest to the right team."
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="text-[24px] font-light tracking-[-0.02em] text-[#11110f] md:text-[32px]">
          Does my business need AI workflow automation?
        </h2>
        <p className="mt-4 max-w-2xl text-[15px] font-light leading-[1.7] text-black/60">
          Aivory's free AI readiness assessment will tell you in twelve
          questions. The output is an operational maturity score and a report
          card that aligns with the framework we use to design every customer's
          first workflow.
        </p>
        <Link
          href="/free-diagnostic"
          className="group mt-6 inline-flex items-center gap-3 border-b border-black pb-1 text-[13px] font-light text-black transition-opacity hover:opacity-60"
        >
          Take the Free Assessment
        </Link>
      </section>

      <section className="border-t border-black/10">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-[24px] font-light tracking-[-0.02em] text-[#11110f] md:text-[32px]">
            Common questions
          </h2>
          <div className="mt-8 grid gap-8">
            {FAQS.map((f) => (
              <div key={f.question} className="border-t border-black/25 pt-6">
                <h3 className="text-[16px] font-medium text-[#11110f]">
                  {f.question}
                </h3>
                <p className="mt-2 max-w-3xl text-[15px] font-light leading-[1.7] text-black/60">
                  {f.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <JsonLd data={graph} />
      <Footer />
    </main>
  );
}
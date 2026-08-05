import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/Footer";
import {
  AIVORY_UK_URL,
  SITE_URL,
  DEFAULT_OG_IMAGE,
  absoluteUrl,
  JsonLd,
  createBreadcrumbList,
} from "@/lib/seo";

export const revalidate = 3600;

const PAGE_TITLE = "NVIDIA Inception Program — Aivory";
const PAGE_DESCRIPTION =
  "Aivory AI is a member of the NVIDIA Inception Program (2026 cohort). The program supports startups advancing AI and data science with hardware, training, exposure, and technical go-to-market resources from NVIDIA.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: "/nvidia-inception",
    languages: { en: "/nvidia-inception", id: "/nvidia-inception" },
  },
  openGraph: {
    type: "website",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: "/nvidia-inception",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
};

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none">
      <path d="M3 13 13 3M6 3h7v7" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

const PROGRAM_BENEFITS = [
  {
    title: "Hardware Credits & Technical Support",
    body:
      "Access to NVIDIA GPU credits and priority engineering channels so Aivory can prototype, train, and serve inference workloads on the same hardware the rest of the NVIDIA ecosystem builds on.",
  },
  {
    title: "Deep Learning Institute Pathways",
    body:
      "Inception members receive curated courses and certifications from the NVIDIA Deep Learning Institute, keeping the Aivory team aligned with the latest CUDA, TensorRT, and inference optimisation practices.",
  },
  {
    title: "Go-to-Market Exposure",
    body:
      "Program-led introductions to NVIDIA Inception VC partners, conference stages at GTC, and the NVIDIA Enterprise partner ecosystem help Aivory reach the operators and buyers that ship AI into production.",
  },
  {
    title: "Hardware Reference Architectures",
    body:
      "Inception membership brings Aivory closer to NVIDIA reference architectures for sovereign deployment, hybrid cloud, and edge inference — important for governed AI systems and Bastion's autonomous infrastructure defence posture.",
  },
];

const WHY_IT_MATTERS = [
  "AI workloads behave differently from traditional SaaS: kernel selection, mixed precision, batching, and inference latency decide whether a deployment is cost-effective or un-shippable. NVIDIA Inception keeps the Aivory engineering team inside NVIDIA's hardware roadmap loop.",
  "For Aivory customers running governance-sensitive deployments (Bastion, autonomous AI agents, sovereign infrastructure), being inside the Inception ecosystem means reference architectures and supply relationships exist before customers need them — rather than after.",
  "Inception's co-marketing channels (GTC, partner directories, NVIDIA press releases) are an earned media amplifier for a smaller AI company competing against incumbents with much larger marketing budgets.",
];

export default function NvidiaInceptionPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#050505] font-manrope">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "@id": `${SITE_URL}/nvidia-inception#webpage`,
          url: `${SITE_URL}/nvidia-inception`,
          name: "NVIDIA Inception Program — Aivory",
          description: PAGE_DESCRIPTION,
          isPartOf: { "@id": `${SITE_URL}/#website` },
          about: {
            "@type": "Organization",
            name: "NVIDIA",
            url: "https://www.nvidia.com/en-us/startups/inception-program/",
          },
          publisher: { "@id": `${SITE_URL}/#organisation` },
          inLanguage: "en",
          mainEntity: {
            "@type": "Organization",
            name: "NVIDIA",
            sameAs: "https://www.nvidia.com/en-us/startups/inception-program/",
          },
        }}
      />
      <JsonLd
        data={createBreadcrumbList([
          { name: "Home", item: absoluteUrl("/") },
          { name: "NVIDIA Inception", item: absoluteUrl("/nvidia-inception") },
        ])}
      />

      <Navbar />

      <main
        className="flex-1 bg-[#efeee8] text-[#11110f]"
        style={{
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 300,
          background:
            "linear-gradient(to bottom, #050505 0, #050505 64px, #efeee8 64px, #efeee8 100%)",
        }}
      >
        <section className="mx-auto max-w-[1480px] px-6 pb-16 pt-40 md:px-12 md:pb-24 md:pt-52">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
            Affiliations
          </p>
          <h1 className="mt-5 max-w-[1180px] text-[52px] font-light leading-[0.95] tracking-[-0.055em] text-[#11110f] md:text-[82px] lg:text-[104px]">
            NVIDIA Inception Program Member.
          </h1>
          <p className="mt-8 max-w-2xl text-[16px] font-light leading-[1.7] text-black/70 md:text-[17px]">
            Aivory AI joined the 2026 cohort of the NVIDIA Inception Program.
            The program is NVIDIA&apos;s vehicle for working with startups that
            are advancing AI and data science; Aivory was accepted on the
            strength of its operational AI transformation and autonomous
            infrastructure defence work.
          </p>
        </section>

        <section className="mx-auto max-w-[1480px] px-6 pb-24 md:px-12 md:pb-36">
          <div className="grid border-t border-black/25 pt-8 lg:grid-cols-12 lg:gap-12">
            <div className="flex flex-col pb-10 lg:col-span-5 lg:min-h-[430px] lg:pb-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
                Membership badge
              </p>
              <h2 className="mt-6 max-w-xl text-[32px] font-light leading-[1.05] tracking-[-0.035em] md:text-[46px]">
                Recognised by NVIDIA as a company building the next generation
                of AI products.
              </h2>
              <p className="mt-8 max-w-md text-[15px] font-light leading-[1.7] text-black/70 md:text-[16px] lg:mt-auto">
                The badge below is the official NVIDIA Inception Program mark
                granted to Aivory AI for the 2026 cohort. The same mark appears
                in the footer of every Aivory web property as a continuous
                public attestation.
              </p>
            </div>

            <figure className="lg:col-span-7">
              <div className="flex aspect-[16/10] items-center justify-center overflow-hidden bg-[#11110f] p-12 md:p-16 lg:p-20">
                <img
                  src="/images/badges/nvidia-inception-badge-v2.svg"
                  alt="NVIDIA Inception Program 2026 badge — granted to Aivory AI"
                  width={620}
                  height={400}
                  className="h-full w-full max-w-2xl object-contain"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              </div>
              <figcaption className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-black/50">
                NVIDIA Inception Program · 2026 cohort · Aivory AI
              </figcaption>
            </figure>
          </div>
        </section>

        <section aria-labelledby="program-benefits-heading">
          <div className="mx-auto max-w-[1480px] px-6 pb-8 md:px-12 md:pb-12">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
              What the membership gives the product
            </p>
            <h2
              id="program-benefits-heading"
              className="text-[34px] font-light tracking-[-0.035em] md:text-[52px]"
            >
              Program benefits, mapped to the product.
            </h2>
          </div>

          <div className="mx-auto max-w-[1480px] px-6 pb-24 md:px-12 md:pb-36">
            <div className="grid gap-px border-t border-black/25">
              {PROGRAM_BENEFITS.map((benefit, index) => (
                <article
                  key={benefit.title}
                  className="grid gap-6 border-b border-black/25 py-10 md:grid-cols-[150px_minmax(0,1fr)_minmax(280px,0.8fr)] md:items-start md:py-12"
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="text-[24px] font-light leading-[1.1] tracking-[-0.025em] text-[#11110f] md:text-[34px]">
                      {benefit.title}
                    </h3>
                  </div>
                  <p className="max-w-xl text-[14px] font-light leading-[1.65] text-black/65 md:text-[15px]">
                    {benefit.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1480px] px-6 pb-24 md:px-12 md:pb-36">
          <div className="grid border-t border-black/25 pt-10 lg:grid-cols-12 lg:gap-12">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60 lg:col-span-3">
              Why it matters
            </p>
            <div className="mt-6 max-w-3xl lg:col-span-9 lg:mt-0">
              <h2 className="text-[28px] font-light leading-[1.1] tracking-[-0.03em] md:text-[38px]">
                Visibility for the Inception badge is not a vanity exercise.
              </h2>
              <div className="mt-8 space-y-6">
                {WHY_IT_MATTERS.map((paragraph, index) => (
                  <p
                    key={index}
                    className="text-[15px] font-light leading-[1.7] text-black/70 md:text-[16px]"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1480px] px-6 pb-24 md:px-12 md:pb-36">
          <div className="grid border-y border-black/25 py-10 md:grid-cols-[150px_minmax(0,1fr)_180px] md:items-center md:py-14">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/60">
              Talk to us
            </p>
            <h2 className="mt-6 max-w-3xl text-[30px] font-light leading-[1.08] tracking-[-0.03em] md:mt-0 md:text-[42px]">
              Curious about our AI stack or governance approach?
            </h2>
            <Link
              href="/contact"
              className="mt-8 inline-flex w-fit items-center gap-3 border-b border-black pb-1 text-[13px] font-light text-black transition-opacity hover:opacity-55 md:mt-0 md:justify-self-end"
            >
              Talk to us
              <ArrowIcon />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
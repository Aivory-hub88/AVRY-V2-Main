import type { Metadata } from 'next';
import Link from 'next/link';
import { TechnicalFrameButton } from '@/components/ui/TechnicalFrameButton';
import Navbar from '@/components/home/Navbar';
import Footer from '@/components/Footer';
import { AboutArchitecturalSignal } from '@/components/about/AboutArchitecturalSignal';
import { LocaleSuggestionBanner } from '@/components/locale/LocaleSuggestionBanner';
import { LocaleSwitcher } from '@/components/locale/LocaleSwitcher';
import { buildLanguageAlternates } from '@/lib/localeAlternates';
import { ASSESSMENT_STEPS_JA, FAQ_ENTITIES_JA } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'AivoryについてIrfan Reichmann創業者',
  description:
    'Aivory、創業者Irfan Reichmann、そしてガバナンスの効いたAIビジネストランスフォーメーションを支える業務起点のアプローチについてご紹介します。',
  alternates: {
    canonical: '/ja/about',
    languages: buildLanguageAlternates('about'),
  },
  openGraph: {
    title: 'AivoryについてIrfan Reichmann創業者',
    description:
      '実践的なAI導入は、業務の明確な把握、ガバナンスの効いたシステム、そして組織の実態への正直な理解から始まります。',
    url: '/ja/about',
  },
};

const PROCESS_LABELS = [
  '業務を理解する',
  'ベースラインを確立する',
  'システムを設計する',
  '変革の順序を決める',
] as const;

const OPERATING_PRINCIPLES = [
  {
    number: '01',
    title: '技術より明確さを優先',
    text: 'まずワークフロー、意思決定、データ、制約、そして人から始めます。技術はその後 — 業務の実態に従うものであり、その逆ではありません。',
  },
  {
    number: '02',
    title: '設計段階からのガバナンス',
    text: '統制、説明責任、人によるオーバーサイトは、導入後に追加するのではなく、最初からシステムに組み込みます。',
  },
  {
    number: '03',
    title: '測定可能な進捗',
    text: 'あらゆる変革は業務上の成果と結びつくべきです — 摩擦の低減、より良い意思決定、より強いレジリエンス、あるいは測定可能なキャパシティの向上。',
  },
] as const;

const ABOUT_HERO_BACKGROUND =
  'linear-gradient(to bottom, #050505 0, #050505 64px, #efeee8 64px, #efeee8 100%)';

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 7v10H7" />
      <path d="M7 7l10 10" />
    </svg>
  );
}

export default function AboutPageJapanese() {
  return (
    <main
      className="min-h-screen overflow-hidden bg-[#030408] text-white selection:bg-white selection:text-black"
      data-about-layout="editorial"
    >
      <Navbar />
      <LocaleSwitcher currentLocale="ja" path="about" />
      <LocaleSuggestionBanner currentLocale="ja" path="about" />

      <section
        className="text-[#11110f]"
        style={{ fontWeight: 300, background: ABOUT_HERO_BACKGROUND }}
      >
        <div className="mx-auto max-w-[1480px] px-6 pb-16 pt-40 md:px-12 lg:px-24 md:pb-24 md:pt-52">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">About Aivory / 01</p>
          <h1 className="mt-5 max-w-[1180px] text-[44px] font-light leading-[1.3] tracking-[-0.01em] text-[#11110f] md:text-[64px] lg:text-[76px]">
            明確さが先。知能は後からついてくる。
          </h1>
        </div>

        <div className="mx-auto max-w-[1480px] px-6 pb-20 md:px-12 lg:px-24 md:pb-28">
          <div className="grid border-t border-black/25 pt-8 lg:grid-cols-12 lg:gap-12">
            <div className="pb-8 lg:col-span-4 lg:pb-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">私たちが行うこと</p>
            </div>
            <div className="lg:col-span-8">
              <p className="max-w-2xl text-[16px] font-light leading-[1.9] text-black/70 md:text-[17px]">
                Aivoryは、組織が実際の業務の流れを理解し、適切な変革アーキテクチャを設計し、失敗のない形でガバナンスの効いたAIシステムを導入できるよう支援します。
              </p>
              <div className="mt-10 flex flex-wrap gap-x-10 gap-y-5">
                <Link
                  href="/free-diagnostic"
                  className="inline-flex items-center gap-3 border-b border-black pb-1 text-[13px] font-light text-black transition-opacity hover:opacity-55"
                >
                  評価を開始する
                  <ArrowIcon />
                </Link>
                <Link
                  href="/ja/company"
                  className="inline-flex items-center gap-3 border-b border-black pb-1 text-[13px] font-light text-black transition-opacity hover:opacity-55"
                >
                  会社概要
                  <ArrowIcon />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <AboutArchitecturalSignal />

      <section className="border-b border-white/10 px-6 py-20 md:px-12 lg:px-24 md:py-28 lg:px-24">
        <div className="mx-auto grid max-w-[1400px] gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">私たちがここにいる理由 / 02</p>
            <h2 className="mt-5 max-w-sm text-3xl font-light leading-[1.4] tracking-[-0.005em] md:text-[34px]">
              AIはツールではなく、ビジネスから始めるべきです。
            </h2>
          </div>

          <div className="space-y-8 lg:col-span-7 lg:col-start-6">
            <p className="text-xl font-light leading-[1.9] text-white/88 md:text-2xl">
              多くの組織は、自社の業務を明確に把握する前にAI導入を迫られています。その結果、ツールが分断され、責任の所在が曖昧なまま、仕組みの伴わない自動化に陥りがちです。
            </p>
            <div className="grid gap-7 border-t border-white/10 pt-8 text-[15px] font-light leading-8 text-white/58 md:grid-cols-2">
              <p>
                Aivoryは、この順序を逆転させるために生まれました。まず業務のベースラインを確立します — 意思決定がどう行われるか、どこで業務が滞るか、どのデータが信頼できるか、そしてどこで変化が測定可能な価値を生むかを明らかにします。
              </p>
              <p>
                その明確さが、変革のブループリント、インテリジェントなワークフロー、ガバナンスの効いたエージェント、そして組織そのものを中心に設計されたレジリエントな運用システムの土台となります。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 px-6 py-20 md:px-12 lg:px-24 md:py-28 lg:px-24">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">創業者 / 03</p>
              <div className="mt-10 border-t border-white/10 pt-6" data-founder-profile="linkedin-only">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">創業者兼CEO</p>
                <h2 className="mt-3 text-3xl font-light tracking-[-0.005em]">Irfan Reichmann</h2>
                <a
                  href="https://www.linkedin.com/in/irfan-reichmann/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-7 inline-flex items-center gap-3 border-b border-white/30 pb-1 text-sm text-white/70 transition-colors hover:border-white hover:text-white"
                >
                  LinkedInプロフィール <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>

            <div className="lg:col-span-7 lg:col-start-6">
              <blockquote className="max-w-4xl text-2xl font-light leading-[1.6] tracking-[-0.005em] text-white/92 md:text-[34px]">
                「実践的なAI導入は、業務の明確な把握から始まります — また別の単発ツールからではなく。」
              </blockquote>
              <div className="mt-10 grid gap-7 border-t border-white/10 pt-8 text-[15px] font-light leading-8 text-white/58 md:grid-cols-2">
                <p>
                  Irfan ReichmannはAivoryを、ビジネストランスフォーメーションを最初から構造化・測定可能・ガバナンスの効いたものにするために設立しました。
                </p>
                <p>
                  Aivoryはビジネストランスフォーメーションおよびそれと無関係な分野で類似の名称を用いる他社とは異なる、独立したAIオペレーションプラットフォームです。
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-b border-white/10 px-6 py-20 md:px-12 lg:px-24 md:py-28 lg:px-24">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid gap-10 pb-14 lg:grid-cols-12 lg:pb-20">
            <div className="lg:col-span-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">私たちが行うこと / 04</p>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <h2 className="text-3xl font-light leading-[1.4] tracking-[-0.005em] md:text-[34px]">
                業務の実態から、ガバナンスの効いた実行へ。
              </h2>
              <p className="mt-6 max-w-2xl text-[15px] font-light leading-8 text-white/55">
                体系立てられたプロセスが、ビジネス上の制約を実装可能な変革アーキテクチャへと変えます。
              </p>
            </div>
          </div>

          <ol className="border-b border-white/10">
            {ASSESSMENT_STEPS_JA.map((step, index) => (
              <li
                key={step.name}
                className="group grid gap-5 border-t border-white/10 py-8 transition-colors hover:bg-white/[0.018] md:py-10 lg:grid-cols-12"
              >
                <span className="font-mono text-[10px] text-white/35 lg:col-span-1">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="text-xl font-light tracking-[-0.005em] text-white/90 md:text-2xl lg:col-span-3">
                  {step.name}
                </h3>
                <p className="max-w-2xl text-sm font-light leading-8 text-white/52 lg:col-span-5 lg:col-start-6">
                  {step.text}
                </p>
                <p className="self-start text-[10px] uppercase tracking-[0.14em] text-white/32 lg:col-span-2 lg:text-right">
                  {PROCESS_LABELS[index]}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-white/10 px-6 py-20 md:px-12 lg:px-24 md:py-28 lg:px-24">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">目指す先 / 05</p>
              <h2 className="mt-5 max-w-md text-3xl font-light leading-[1.4] tracking-[-0.005em] md:text-[32px]">
                理解し、適応し、改善し続ける業務へ。
              </h2>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <p className="text-xl font-light leading-[1.9] text-white/82 md:text-2xl">
                目的は自動化そのものではありません。より明確な運用モデル、より優れた組織的な記憶、そして時間とともに蓄積されるガバナンスの効いた知能を持つ組織を実現することです。
              </p>
            </div>
          </div>

          <div className="mt-16 grid border-y border-white/10 md:grid-cols-3">
            {OPERATING_PRINCIPLES.map((principle, index) => (
              <div
                key={principle.number}
                className={`py-8 md:min-h-[260px] md:px-8 md:py-10 ${index > 0 ? 'border-t border-white/10 md:border-l md:border-t-0' : ''}`}
              >
                <span className="font-mono text-[10px] text-white/32">{principle.number}</span>
                <h3 className="mt-12 text-xl font-light tracking-[-0.005em]">{principle.title}</h3>
                <p className="mt-4 text-sm font-light leading-8 text-white/50">{principle.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="frequently-asked-questions" className="border-b border-white/10 px-6 py-20 md:px-12 lg:px-24 md:py-28 lg:px-24">
        <div className="mx-auto grid max-w-[1400px] gap-14 lg:grid-cols-12">
          <div className="lg:col-span-4 lg:sticky lg:top-28 lg:self-start">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">よくある質問 / 06</p>
            <h2 className="mt-5 max-w-sm text-3xl font-light leading-[1.4] tracking-[-0.005em] md:text-[32px]">
              Aivoryに関する明確な回答。
            </h2>
          </div>

          <div className="border-b border-white/10 lg:col-span-7 lg:col-start-6">
            {FAQ_ENTITIES_JA.map((entry, index) => (
              <details key={entry.question} className="group border-t border-white/10" open={index === 0}>
                <summary className="flex cursor-pointer list-none items-start gap-5 py-6 marker:content-none md:py-7">
                  <span className="pt-1 font-mono text-[9px] text-white/28">{String(index + 1).padStart(2, '0')}</span>
                  <span className="flex-1 text-base font-light leading-8 text-white/85 md:text-lg">{entry.question}</span>
                  <span className="text-xl font-light text-white/35 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="max-w-3xl pb-7 pl-9 text-sm font-light leading-8 text-white/52 md:pb-9">{entry.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-12 lg:px-24 md:py-28 lg:px-24" data-about-cta="square">
        <div className="mx-auto grid max-w-[1400px] gap-10 border-y border-white/15 py-12 md:py-16 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">明確さから始める / 07</p>
            <h2 className="mt-5 max-w-3xl text-3xl font-light leading-[1.4] tracking-[-0.005em] md:text-[34px]">
              AIを、あなたの業務にとって意味のあるものに。
            </h2>
          </div>
          <div className="flex flex-wrap gap-3 lg:col-span-5 lg:justify-end">
            <TechnicalFrameButton href="/free-diagnostic">
              <ArrowIcon /> 評価を開始する
            </TechnicalFrameButton>
            <TechnicalFrameButton href="/contact">
              お問い合わせ
            </TechnicalFrameButton>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

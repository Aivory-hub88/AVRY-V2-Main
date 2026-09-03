import type { Metadata } from 'next';
import Link from 'next/link';
import { TechnicalFrameButton } from '@/components/ui/TechnicalFrameButton';
import Navbar from '@/components/home/Navbar';
import Footer from '@/components/Footer';
import { AboutArchitecturalSignal } from '@/components/about/AboutArchitecturalSignal';
import { LocaleSuggestionBanner } from '@/components/locale/LocaleSuggestionBanner';
import { LocaleSwitcher } from '@/components/locale/LocaleSwitcher';
import { buildLanguageAlternates } from '@/lib/localeAlternates';
import { ASSESSMENT_STEPS_AR, FAQ_ENTITIES_AR } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'عن Aivory ومؤسسها إرفان رايشمان',
  description:
    'تعرف على Aivory، ومؤسسها إرفان رايشمان، والنهج العملي القائم على الوضوح التشغيلي وراء التحول المؤسسي بالذكاء الاصطناعي الخاضع للحوكمة.',
  alternates: {
    canonical: '/ar/about',
    languages: buildLanguageAlternates('about'),
  },
  openGraph: {
    title: 'عن Aivory ومؤسسها إرفان رايشمان',
    description:
      'يبدأ التبني العملي للذكاء الاصطناعي بالوضوح التشغيلي، وأنظمة خاضعة للحوكمة، وفهم صادق لكيفية عمل المؤسسات.',
    url: '/ar/about',
  },
};

const PROCESS_LABELS = [
  'فهم العملية',
  'وضع خط الأساس',
  'تصميم النظام',
  'ترتيب مراحل التغيير',
] as const;

const OPERATING_PRINCIPLES = [
  {
    number: '01',
    title: 'الوضوح قبل التقنية',
    text: 'نبدأ بسير العمل، والقرارات، والبيانات، والقيود، والأشخاص. التقنية تتبع الواقع التشغيلي — وليس العكس.',
  },
  {
    number: '02',
    title: 'الحوكمة بالتصميم',
    text: 'يتم تصميم الضوابط والمساءلة والإشراف البشري ضمن النظام منذ البداية، لا إضافتها بعد النشر.',
  },
  {
    number: '03',
    title: 'تقدّم قابل للقياس',
    text: 'يجب أن يرتبط كل تحول بنتيجة تشغيلية: احتكاك أقل، وقرارات أفضل، ومرونة أقوى، أو قدرة يمكن قياسها.',
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

export default function AboutPageArabic() {
  return (
    <main
      className="min-h-screen overflow-hidden bg-[#030408] text-white selection:bg-white selection:text-black"
      data-about-layout="editorial"
    >
      <Navbar />
      <LocaleSwitcher currentLocale="ar" path="about" />
      <LocaleSuggestionBanner currentLocale="ar" path="about" />

      <section
        className="text-[#11110f]"
        style={{ fontWeight: 300, background: ABOUT_HERO_BACKGROUND }}
      >
        <div className="mx-auto max-w-[1480px] px-6 pb-16 pt-40 md:px-12 lg:px-24 md:pb-24 md:pt-52">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">عن Aivory / 01</p>
          <h1 className="mt-5 max-w-[1180px] text-[44px] font-light leading-[1.1] tracking-[-0.02em] text-[#11110f] md:text-[64px] lg:text-[80px]">
            الوضوح أولًا. ويتبعه الذكاء.
          </h1>
        </div>

        <div className="mx-auto max-w-[1480px] px-6 pb-20 md:px-12 lg:px-24 md:pb-28">
          <div className="grid border-t border-black/25 pt-8 lg:grid-cols-12 lg:gap-12">
            <div className="pb-8 lg:col-span-4 lg:pb-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">ماذا نفعل</p>
            </div>
            <div className="lg:col-span-8">
              <p className="max-w-2xl text-[16px] font-light leading-[1.9] text-black/70 md:text-[17px]">
                تساعد Aivory المؤسسات على فهم كيفية سير العمل فعليًا، وتصميم بنية التحول المناسبة، ونشر أنظمة ذكاء اصطناعي خاضعة للحوكمة دون بدايات خاطئة.
              </p>
              <div className="mt-10 flex flex-wrap gap-x-10 gap-y-5">
                <Link
                  href="/free-diagnostic"
                  className="inline-flex items-center gap-3 border-b border-black pb-1 text-[13px] font-light text-black transition-opacity hover:opacity-55"
                >
                  ابدأ التقييم
                  <ArrowIcon />
                </Link>
                <Link
                  href="/ar/company"
                  className="inline-flex items-center gap-3 border-b border-black pb-1 text-[13px] font-light text-black transition-opacity hover:opacity-55"
                >
                  نظرة عامة على الشركة
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
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">لماذا نحن هنا / 02</p>
            <h2 className="mt-5 max-w-sm text-3xl font-light leading-[1.3] tracking-[-0.01em] md:text-[36px]">
              يجب أن يبدأ الذكاء الاصطناعي من الأعمال — لا من الأداة.
            </h2>
          </div>

          <div className="space-y-8 lg:col-span-7 lg:col-start-6">
            <p className="text-xl font-light leading-[1.9] tracking-[-0.005em] text-white/88 md:text-2xl">
              تخضع معظم المؤسسات لضغط لتبني الذكاء الاصطناعي قبل أن تمتلك رؤية واضحة لعملياتها الخاصة. والنتيجة غالبًا ما تكون أدوات مجزأة، وملكية غير واضحة، وأتمتة بلا نظام خلفها.
            </p>
            <div className="grid gap-7 border-t border-white/10 pt-8 text-[15px] font-light leading-8 text-white/58 md:grid-cols-2">
              <p>
                أُنشئت Aivory لعكس هذا التسلسل. نضع خط الأساس التشغيلي أولًا: كيف تُتخذ القرارات، وأين يتباطأ العمل، وأي البيانات يمكن الوثوق بها، وأين يمكن للتغيير أن يخلق قيمة قابلة للقياس.
              </p>
              <p>
                يصبح هذا الوضوح أساسًا لمخططات التحول، وسير العمل الذكي، والوكلاء الخاضعين للحوكمة، وأنظمة التشغيل المرنة المصممة حول المؤسسة نفسها.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 px-6 py-20 md:px-12 lg:px-24 md:py-28 lg:px-24">
        <div className="mx-auto max-w-[1400px]">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">المؤسس / 03</p>
              <div className="mt-10 border-t border-white/10 pt-6" data-founder-profile="linkedin-only">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">المؤسس والرئيس التنفيذي</p>
                <h2 className="mt-3 text-3xl font-light tracking-[-0.01em]">إرفان رايشمان</h2>
                <a
                  href="https://www.linkedin.com/in/irfan-reichmann/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-7 inline-flex items-center gap-3 border-b border-white/30 pb-1 text-sm text-white/70 transition-colors hover:border-white hover:text-white"
                >
                  الملف الشخصي على LinkedIn <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>

            <div className="lg:col-span-7 lg:col-start-6">
              <blockquote className="max-w-4xl text-3xl font-light leading-[1.5] tracking-[-0.01em] text-white/92 md:text-[38px]">
                «يبدأ التبني العملي للذكاء الاصطناعي بالوضوح التشغيلي — لا بأداة منفصلة أخرى.»
              </blockquote>
              <div className="mt-10 grid gap-7 border-t border-white/10 pt-8 text-[15px] font-light leading-8 text-white/58 md:grid-cols-2">
                <p>
                  أسس إرفان رايشمان Aivory لجعل التحول المؤسسي منظمًا وقابلًا للقياس وخاضعًا للحوكمة منذ البداية.
                </p>
                <p>
                  Aivory هي منصة تحول مؤسسي وعمليات ذكاء اصطناعي، مستقلة تمامًا عن أي شركات أخرى تستخدم اسمًا مشابهًا في فئات غير ذات صلة.
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
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">ماذا نفعل / 04</p>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <h2 className="text-3xl font-light leading-[1.3] tracking-[-0.01em] md:text-[38px]">
                من الواقع التشغيلي إلى التنفيذ الخاضع للحوكمة.
              </h2>
              <p className="mt-6 max-w-2xl text-[15px] font-light leading-8 text-white/55">
                مسار منظم يحوّل قيود الأعمال إلى بنية تحول جاهزة للتنفيذ.
              </p>
            </div>
          </div>

          <ol className="border-b border-white/10">
            {ASSESSMENT_STEPS_AR.map((step, index) => (
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
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">إلى أين نتجه / 05</p>
              <h2 className="mt-5 max-w-md text-3xl font-light leading-[1.3] tracking-[-0.01em] md:text-[34px]">
                نحو عمليات قادرة على الفهم والتكيّف والتحسّن.
              </h2>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <p className="text-xl font-light leading-[1.9] text-white/82 md:text-2xl">
                الهدف ليس الأتمتة لذاتها. بل مؤسسة بنموذج تشغيلي أوضح، وذاكرة مؤسسية أفضل، وذكاء خاضع للحوكمة يتراكم بمرور الوقت.
              </p>
            </div>
          </div>

          <div className="mt-16 grid border-y border-white/10 md:grid-cols-3">
            {OPERATING_PRINCIPLES.map((principle, index) => (
              <div
                key={principle.number}
                className={`py-8 md:min-h-[260px] md:px-8 md:py-10 ${index > 0 ? 'border-t border-white/10 md:border-r md:border-t-0' : ''}`}
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
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">الأسئلة / 06</p>
            <h2 className="mt-5 max-w-sm text-3xl font-light leading-[1.3] tracking-[-0.01em] md:text-[34px]">
              إجابات واضحة حول Aivory.
            </h2>
          </div>

          <div className="border-b border-white/10 lg:col-span-7 lg:col-start-6">
            {FAQ_ENTITIES_AR.map((entry, index) => (
              <details key={entry.question} className="group border-t border-white/10" open={index === 0}>
                <summary className="flex cursor-pointer list-none items-start gap-5 py-6 marker:content-none md:py-7">
                  <span className="pt-1 font-mono text-[9px] text-white/28">{String(index + 1).padStart(2, '0')}</span>
                  <span className="flex-1 text-base font-light leading-8 text-white/85 md:text-lg">{entry.question}</span>
                  <span className="text-xl font-light text-white/35 transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="max-w-3xl pb-7 pr-9 text-sm font-light leading-8 text-white/52 md:pb-9">{entry.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:px-12 lg:px-24 md:py-28 lg:px-24" data-about-cta="square">
        <div className="mx-auto grid max-w-[1400px] gap-10 border-y border-white/15 py-12 md:py-16 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/42">ابدأ بالوضوح / 07</p>
            <h2 className="mt-5 max-w-3xl text-3xl font-light leading-[1.3] tracking-[-0.01em] md:text-[38px]">
              اجعل الذكاء الاصطناعي منطقيًا لعملياتك.
            </h2>
          </div>
          <div className="flex flex-wrap gap-3 lg:col-span-5 lg:justify-end">
            <TechnicalFrameButton href="/free-diagnostic">
              <ArrowIcon /> ابدأ التقييم
            </TechnicalFrameButton>
            <TechnicalFrameButton href="/contact">
              تحدث معنا
            </TechnicalFrameButton>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

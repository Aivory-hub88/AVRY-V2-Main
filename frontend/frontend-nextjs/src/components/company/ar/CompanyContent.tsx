import Link from "next/link";

const waysOfWorking = [
  {
    number: "01",
    title: "ابدأ من الواقع",
    description:
      "افهم كيف يسير العمل اليوم فعليًا، وأين يتباطأ التقدم، وما الذي تحتاجه الأعمال حقًا.",
  },
  {
    number: "02",
    title: "اجعل الأولويات واضحة",
    description:
      "حوّل الأفكار المتنافسة إلى تسلسل مشترك من القرارات والمسؤوليات والنتائج القابلة للقياس.",
  },
  {
    number: "03",
    title: "ابنِ حول الأشخاص",
    description:
      "صمّم طرق عمل أفضل مع الفرق التي ستستخدمها وتملكها وتحسّنها كل يوم.",
  },
  {
    number: "04",
    title: "اترك القدرة خلفك",
    description:
      "أنشئ أنظمة وممارسات تعزز المؤسسة بدلًا من جعلها معتمدة على دعم خارجي.",
  },
];

const principles = [
  {
    title: "الوضوح فوق التعقيد",
    description:
      "التغيير المعقد يجب أن يبقى مفهومًا. نجعل القرارات والمفاضلات والخطوات التالية واضحة بما يكفي للتنفيذ.",
  },
  {
    title: "النتائج فوق المخرجات",
    description:
      "العرض التقديمي ليس تقدمًا. نقيس عملنا بما يصبح أوضح وأقوى وأكثر فائدة على أرض الواقع.",
  },
  {
    title: "الانضباط فوق الاستعراض",
    description:
      "التحول الجيد يكون مدروسًا. نفضّل الأدلة والملكية والتنفيذ الثابت على الإيماءات الكبيرة.",
  },
  {
    title: "الصدق كأساس",
    description:
      "التقنية ليست الحل لكل مشكلة. نكون صريحين حول ما يجب أن يتغير، وما يجب أن يبقى، ولماذا.",
  },
];

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none">
      <path d="M3 13 13 3M6 3h7v7" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function CompanyContentAr() {
  return (
    <div className="bg-[#efeee8] text-[#11110f]">
      <section className="mx-auto max-w-[1480px] px-6 pb-24 md:px-12 lg:px-24 md:pb-36">
        <div className="grid border-t border-black/25 pt-8 lg:grid-cols-12 lg:gap-12">
          <div className="pb-10 lg:col-span-4 lg:pb-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
              لماذا نحن موجودون
            </p>
          </div>
          <div className="lg:col-span-8">
            <h2 className="max-w-4xl text-[28px] font-light leading-[1.25] tracking-[-0.01em] md:text-[42px]">
              التحول يجب أن يجعل الأعمال أكثر قدرة — لا أكثر اعتمادًا.
            </h2>
            <p className="mt-8 max-w-2xl text-[16px] font-light leading-[1.9] text-black/70 md:text-[17px]">
              الكثير من التغيير يبدأ بحل وينتهي بتسليم. نحن نبدأ من الأعمال نفسها: طموحاتها وقيودها وأشخاصها وواقعها اليومي. والنتيجة تقدم تفهمه الفرق ويمكنها الاستمرار في امتلاكه.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="way-of-working-heading">
        <div className="mx-auto max-w-[1480px] px-6 pb-8 md:px-12 lg:px-24 md:pb-12">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
            كيف نعمل
          </p>
          <h2
            id="way-of-working-heading"
            className="text-[28px] font-light tracking-[-0.01em] md:text-[42px]"
          >
            طريق عملي للمضي قدمًا.
          </h2>
        </div>

        <div className="mx-auto max-w-[1480px] px-6 pb-24 md:px-12 lg:px-24 md:pb-36">
          {waysOfWorking.map((item) => (
            <article
              key={item.number}
              className="grid gap-6 border-t border-black/25 py-8 md:grid-cols-[150px_minmax(0,1fr)_minmax(280px,0.8fr)] md:items-start md:py-10"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">
                {item.number}
              </span>
              <h3 className="text-[22px] font-light leading-[1.25] tracking-[-0.005em] md:text-[30px]">
                {item.title}
              </h3>
              <p className="max-w-xl text-[14px] font-light leading-[1.85] text-black/65 md:text-[15px]">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1480px] px-6 pb-24 md:px-12 lg:px-24 md:pb-36">
        <div className="grid border-t border-black/25 lg:grid-cols-2">
          <article className="border-b border-black/25 py-10 lg:border-b-0 lg:border-l lg:py-14 lg:pl-12">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
              مهمتنا
            </p>
            <h2 className="mt-8 max-w-xl text-[26px] font-light leading-[1.3] tracking-[-0.01em] md:text-[36px]">
              جعل التحسين التشغيلي الحقيقي أسهل بدءًا واستمرارًا.
            </h2>
          </article>

          <article className="py-10 lg:py-14 lg:pr-12">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
              وجهة نظرنا
            </p>
            <h2 className="mt-8 max-w-xl text-[26px] font-light leading-[1.3] tracking-[-0.01em] md:text-[36px]">
              من هم الأقرب إلى العمل يجب أن يبقوا الأقرب إلى القرارات.
            </h2>
          </article>
        </div>
      </section>

      <section aria-labelledby="principles-heading">
        <div className="mx-auto max-w-[1480px] px-6 pb-8 md:px-12 lg:px-24 md:pb-12">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
            ما نؤمن به
          </p>
          <h2
            id="principles-heading"
            className="text-[28px] font-light tracking-[-0.01em] md:text-[42px]"
          >
            المبادئ التي تقوم عليها أعمالنا.
          </h2>
        </div>

        <div className="mx-auto max-w-[1480px] px-6 pb-24 md:px-12 lg:px-24 md:pb-36">
          {principles.map((principle, index) => (
            <article
              key={principle.title}
              className="grid gap-6 border-t border-black/25 py-8 md:grid-cols-[150px_minmax(0,1fr)_minmax(280px,0.8fr)] md:items-start md:py-10"
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/55">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="text-[22px] font-light leading-[1.25] tracking-[-0.005em] md:text-[30px]">
                {principle.title}
              </h3>
              <p className="max-w-xl text-[14px] font-light leading-[1.85] text-black/65 md:text-[15px]">
                {principle.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1480px] px-6 pb-24 md:px-12 lg:px-24 md:pb-36">
        <div className="grid border-y border-black/25 py-10 md:grid-cols-[150px_minmax(0,1fr)_180px] md:items-center md:py-14">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/60">
            ابدأ محادثة
          </p>
          <h2 className="mt-6 max-w-3xl text-[26px] font-light leading-[1.3] tracking-[-0.01em] md:mt-0 md:text-[36px]">
            أضف وضوحًا لما هو قادم.
          </h2>
          <Link
            href="/contact"
            className="mt-8 inline-flex w-fit items-center gap-3 border-b border-black pb-1 text-[13px] font-light text-black transition-opacity hover:opacity-55 md:mt-0 md:justify-self-end"
          >
            تحدث معنا
            <ArrowIcon />
          </Link>
        </div>
      </section>
    </div>
  );
}

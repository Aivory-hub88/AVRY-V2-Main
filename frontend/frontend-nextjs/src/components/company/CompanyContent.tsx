import Link from "next/link";

const waysOfWorking = [
  {
    number: "01",
    title: "Start with reality",
    description:
      "Understand how work moves today, where progress slows, and what the business genuinely needs.",
  },
  {
    number: "02",
    title: "Make priorities explicit",
    description:
      "Turn competing ideas into a shared sequence of decisions, responsibilities, and measurable outcomes.",
  },
  {
    number: "03",
    title: "Build around people",
    description:
      "Shape better ways of working with the teams who will use, own, and improve them every day.",
  },
  {
    number: "04",
    title: "Leave capability behind",
    description:
      "Create systems and practices that strengthen the organisation instead of making it dependent on outside support.",
  },
];

const principles = [
  {
    title: "Clarity over complexity",
    description:
      "Complex change should still be understandable. We make decisions, trade-offs, and next steps clear enough to act on.",
  },
  {
    title: "Outcomes over output",
    description:
      "A presentation is not progress. We measure our work by what becomes clearer, stronger, and more useful in practice.",
  },
  {
    title: "Discipline over theatre",
    description:
      "Good transformation is deliberate. We favour evidence, ownership, and steady execution over grand gestures.",
  },
  {
    title: "Honest by default",
    description:
      "Technology is not the answer to every problem. We are direct about what should change, what should stay, and why.",
  },
];

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none">
      <path d="M3 13 13 3M6 3h7v7" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function CompanyContent() {
  return (
    <div className="bg-[#efeee8] text-[#11110f]">
      <section className="mx-auto max-w-[1480px] px-6 pb-24 md:px-12 lg:px-24 md:pb-36">
        <div className="grid border-t border-black/25 pt-8 lg:grid-cols-12 lg:gap-12">
          <div className="pb-10 lg:col-span-4 lg:pb-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
              Why we exist
            </p>
          </div>
          <div className="lg:col-span-8">
            <h2 className="max-w-4xl text-[34px] font-light leading-[1.05] tracking-[-0.035em] md:text-[52px]">
              Transformation should make a business more capable—not more
              dependent.
            </h2>
            <p className="mt-8 max-w-2xl text-[16px] font-light leading-[1.7] text-black/70 md:text-[17px]">
              Too much change begins with a solution and ends with a handover.
              We begin with the business itself: its ambitions, constraints,
              people, and everyday reality. The result is progress that teams
              understand and can continue to own.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="way-of-working-heading">
        <div className="mx-auto max-w-[1480px] px-6 pb-8 md:px-12 lg:px-24 md:pb-12">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
            How we work
          </p>
          <h2
            id="way-of-working-heading"
            className="text-[34px] font-light tracking-[-0.035em] md:text-[52px]"
          >
            A practical way forward.
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
              <h3 className="text-[25px] font-light leading-[1.1] tracking-[-0.025em] md:text-[34px]">
                {item.title}
              </h3>
              <p className="max-w-xl text-[14px] font-light leading-[1.65] text-black/65 md:text-[15px]">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1480px] px-6 pb-24 md:px-12 lg:px-24 md:pb-36">
        <div className="grid border-t border-black/25 lg:grid-cols-2">
          <article className="border-b border-black/25 py-10 lg:border-b-0 lg:border-r lg:py-14 lg:pr-12">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
              Our mission
            </p>
            <h2 className="mt-8 max-w-xl text-[30px] font-light leading-[1.08] tracking-[-0.03em] md:text-[42px]">
              Make meaningful operational improvement easier to begin and easier
              to sustain.
            </h2>
          </article>

          <article className="py-10 lg:py-14 lg:pl-12">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
              Our point of view
            </p>
            <h2 className="mt-8 max-w-xl text-[30px] font-light leading-[1.08] tracking-[-0.03em] md:text-[42px]">
              The people closest to the work should remain closest to the
              decisions.
            </h2>
          </article>
        </div>
      </section>

      <section aria-labelledby="principles-heading">
        <div className="mx-auto max-w-[1480px] px-6 pb-8 md:px-12 lg:px-24 md:pb-12">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
            What we believe
          </p>
          <h2
            id="principles-heading"
            className="text-[34px] font-light tracking-[-0.035em] md:text-[52px]"
          >
            Principles behind the work.
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
              <h3 className="text-[25px] font-light leading-[1.1] tracking-[-0.025em] md:text-[34px]">
                {principle.title}
              </h3>
              <p className="max-w-xl text-[14px] font-light leading-[1.65] text-black/65 md:text-[15px]">
                {principle.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1480px] px-6 pb-24 md:px-12 lg:px-24 md:pb-36">
        <div className="grid border-y border-black/25 py-10 md:grid-cols-[150px_minmax(0,1fr)_180px] md:items-center md:py-14">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/60">
            Start a conversation
          </p>
          <h2 className="mt-6 max-w-3xl text-[30px] font-light leading-[1.08] tracking-[-0.03em] md:mt-0 md:text-[42px]">
            Bring clarity to what comes next.
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
    </div>
  );
}

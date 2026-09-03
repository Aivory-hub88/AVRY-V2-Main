export function CompanyHero() {
  return (
    <>
      <section className="mx-auto max-w-[1480px] px-6 pb-16 pt-40 md:px-12 lg:px-24 md:pb-24 md:pt-52">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
          Company
        </p>
        <h1 className="mt-5 max-w-[1180px] text-[44px] font-light leading-[1.15] tracking-[-0.02em] text-[#11110f] md:text-[64px] lg:text-[80px]">
          Better operations begin with clarity.
        </h1>
      </section>

      <section className="mx-auto max-w-[1480px] px-6 pb-24 md:px-12 lg:px-24 md:pb-32">
        <div className="grid border-t border-black/25 pt-8 lg:grid-cols-12 lg:gap-12">
          <div className="flex flex-col pb-10 lg:col-span-5 lg:min-h-[430px] lg:pb-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/60">
              About Aivory
            </p>
            <h2 className="mt-6 max-w-xl text-[32px] font-light leading-[1.05] tracking-[-0.035em] text-[#11110f] md:text-[46px]">
              We help ambitious teams make complex work easier to understand,
              improve, and run.
            </h2>
            <div className="mt-8 max-w-md space-y-5 text-[15px] font-light leading-[1.7] text-black/70 md:text-[16px] lg:mt-auto">
              <p>
                Aivory brings diagnosis, planning, and implementation into one
                connected way of working.
              </p>
              <p>
                The result is clearer decisions, stronger workflows, and systems
                that continue to work long after the first project is complete.
              </p>
            </div>
          </div>

          <figure className="lg:col-span-7">
            <div className="aspect-[16/9] overflow-hidden bg-[#11110f]">
              <img
                src="/images/Company/five-people-renaissance-meeting.webp"
                alt="Five Renaissance figures gathered around a table in a red and navy editorial illustration"
                width={1400}
                height={781}
                className="h-full w-full object-cover"
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
            </div>
            <figcaption className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-black/50">
              Built for business operations
            </figcaption>
          </figure>
        </div>
      </section>
    </>
  );
}

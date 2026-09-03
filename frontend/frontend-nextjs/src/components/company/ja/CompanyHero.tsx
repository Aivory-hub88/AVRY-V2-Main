export function CompanyHeroJa() {
  return (
    <>
      <section className="mx-auto max-w-[1480px] px-6 pb-16 pt-40 md:px-12 lg:px-24 md:pb-24 md:pt-52">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
          Company
        </p>
        <h1 className="mt-5 max-w-[1180px] text-[40px] font-light leading-[1.3] tracking-[-0.01em] text-[#11110f] md:text-[58px] lg:text-[68px]">
          より良い業務は、明確さから始まる。
        </h1>
      </section>

      <section className="mx-auto max-w-[1480px] px-6 pb-24 md:px-12 lg:px-24 md:pb-32">
        <div className="grid border-t border-black/25 pt-8 lg:grid-cols-12 lg:gap-12">
          <div className="flex flex-col pb-10 lg:col-span-5 lg:min-h-[430px] lg:pb-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/60">
              About Aivory
            </p>
            <h2 className="mt-6 max-w-xl text-[26px] font-light leading-[1.4] tracking-[-0.005em] text-[#11110f] md:text-[34px]">
              野心的なチームが複雑な業務を理解し、改善し、運用しやすくするお手伝いをします。
            </h2>
            <div className="mt-8 max-w-md space-y-5 text-[15px] font-light leading-[1.9] text-black/70 md:text-[16px] lg:mt-auto">
              <p>
                Aivoryは、診断・計画・実装を一つの連続した働き方の中で結びつけます。
              </p>
              <p>
                その結果、より明確な意思決定、より強固なワークフロー、そして最初のプロジェクトが完了した後も機能し続けるシステムが生まれます。
              </p>
            </div>
          </div>

          <figure className="lg:col-span-7">
            <div className="aspect-[16/9] overflow-hidden bg-[#11110f]">
              <img
                src="/images/Company/five-people-renaissance-meeting.webp"
                alt="赤と紺のエディトリアルイラストで、テーブルを囲むルネサンス風の5人の人物"
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

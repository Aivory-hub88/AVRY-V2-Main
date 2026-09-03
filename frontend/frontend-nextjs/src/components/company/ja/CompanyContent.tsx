import Link from "next/link";

const waysOfWorking = [
  {
    number: "01",
    title: "現実から始める",
    description:
      "今、業務がどのように動いているか、どこで進捗が滞っているか、ビジネスが本当に必要としているものは何かを理解します。",
  },
  {
    number: "02",
    title: "優先順位を明確にする",
    description:
      "競合するアイデアを、意思決定・責任・測定可能な成果からなる共有された順序へと変えます。",
  },
  {
    number: "03",
    title: "人を中心に組み立てる",
    description:
      "実際に使い、所有し、日々改善していくチームとともに、より良い働き方を形づくります。",
  },
  {
    number: "04",
    title: "組織に力を残す",
    description:
      "外部支援に依存させるのではなく、組織自体を強化するシステムと実践をつくります。",
  },
];

const principles = [
  {
    title: "複雑さより明確さ",
    description:
      "複雑な変革であっても理解できるものであるべきです。意思決定、トレードオフ、次のステップを、行動に移せるレベルまで明確にします。",
  },
  {
    title: "アウトプットより成果",
    description:
      "プレゼンテーションは進捗ではありません。実務において何がより明確に、より強く、より役立つものになったかで評価します。",
  },
  {
    title: "演出より規律",
    description:
      "良い変革は意図的なものです。大げさな身振りより、根拠、当事者意識、着実な実行を重視します。",
  },
  {
    title: "デフォルトで誠実に",
    description:
      "技術がすべての問題の答えではありません。何を変えるべきか、何を残すべきか、その理由を率直に伝えます。",
  },
];

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none">
      <path d="M3 13 13 3M6 3h7v7" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export function CompanyContentJa() {
  return (
    <div className="bg-[#efeee8] text-[#11110f]">
      <section className="mx-auto max-w-[1480px] px-6 pb-24 md:px-12 lg:px-24 md:pb-36">
        <div className="grid border-t border-black/25 pt-8 lg:grid-cols-12 lg:gap-12">
          <div className="pb-10 lg:col-span-4 lg:pb-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
              私たちが存在する理由
            </p>
          </div>
          <div className="lg:col-span-8">
            <h2 className="max-w-4xl text-[26px] font-light leading-[1.3] tracking-[-0.005em] md:text-[38px]">
              変革は、ビジネスをより依存させるのではなく、より能力を高めるものであるべきです。
            </h2>
            <p className="mt-8 max-w-2xl text-[16px] font-light leading-[1.9] text-black/70 md:text-[17px]">
              多くの変革はソリューションから始まり、引き渡しで終わってしまいます。私たちはビジネスそのもの — その野心、制約、人々、日々の現実から始めます。その結果生まれるのは、チームが理解し、自ら所有し続けられる進歩です。
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="way-of-working-heading">
        <div className="mx-auto max-w-[1480px] px-6 pb-8 md:px-12 lg:px-24 md:pb-12">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
            働き方
          </p>
          <h2
            id="way-of-working-heading"
            className="text-[26px] font-light tracking-[-0.005em] md:text-[38px]"
          >
            実践的な前進の道筋。
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
              <h3 className="text-[22px] font-light leading-[1.35] tracking-[-0.005em] md:text-[28px]">
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
          <article className="border-b border-black/25 py-10 lg:border-b-0 lg:border-r lg:py-14 lg:pr-12">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
              私たちの使命
            </p>
            <h2 className="mt-8 max-w-xl text-[24px] font-light leading-[1.35] tracking-[-0.005em] md:text-[32px]">
              意味のある業務改善を、始めやすく、続けやすくする。
            </h2>
          </article>

          <article className="py-10 lg:py-14 lg:pl-12">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
              私たちの視点
            </p>
            <h2 className="mt-8 max-w-xl text-[24px] font-light leading-[1.35] tracking-[-0.005em] md:text-[32px]">
              業務に最も近い人こそ、意思決定に最も近くあるべきです。
            </h2>
          </article>
        </div>
      </section>

      <section aria-labelledby="principles-heading">
        <div className="mx-auto max-w-[1480px] px-6 pb-8 md:px-12 lg:px-24 md:pb-12">
          <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.18em] text-black/60">
            私たちが信じること
          </p>
          <h2
            id="principles-heading"
            className="text-[26px] font-light tracking-[-0.005em] md:text-[38px]"
          >
            仕事を支える原則。
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
              <h3 className="text-[22px] font-light leading-[1.35] tracking-[-0.005em] md:text-[28px]">
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
            会話を始める
          </p>
          <h2 className="mt-6 max-w-3xl text-[24px] font-light leading-[1.35] tracking-[-0.005em] md:mt-0 md:text-[32px]">
            次のステップに明確さを。
          </h2>
          <Link
            href="/contact"
            className="mt-8 inline-flex w-fit items-center gap-3 border-b border-black pb-1 text-[13px] font-light text-black transition-opacity hover:opacity-55 md:mt-0 md:justify-self-end"
          >
            お問い合わせ
            <ArrowIcon />
          </Link>
        </div>
      </section>
    </div>
  );
}

import { FadeUp } from './FadeUp';

export default function BastionClosing() {
  return (
    <section className="bg-transparent text-white py-32">
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col items-center text-center">
        <FadeUp className="max-w-4xl">
          <h2 className="text-5xl md:text-7xl lg:text-[5.5rem] font-light leading-[1.05] tracking-tight text-[#FFFFFF] mb-8">
            Defend what matters.
          </h2>
          <div className="text-xl md:text-2xl text-[#B3B3B3] font-light leading-relaxed space-y-2">
            <p>Protect critical infrastructure.</p>
            <p>Strengthen operational resilience.</p>
            <p>Stay ahead of evolving threats.</p>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

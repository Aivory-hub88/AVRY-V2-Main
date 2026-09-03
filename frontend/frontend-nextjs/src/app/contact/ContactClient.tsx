'use client';

import { useState } from 'react';
import Image from 'next/image';
import Navbar from '@/components/home/Navbar';
import Footer from '@/components/Footer';
import { TechnicalFrameButton } from '@/components/ui/TechnicalFrameButton';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactClient() {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    message: '',
  });
  const [status, setStatus] = useState<SubmitState>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('submitting');
    try {
      const res = await fetch('/api/contact-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formType: 'contact', ...formData }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (!res.ok || !data.ok) throw new Error('submit_failed');
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <main className="relative bg-black min-h-screen font-manrope text-white overflow-hidden">
      {/* Sticky navigation bar */}
      <Navbar />

      {/* Hero Header */}
      <section className="relative pt-32 md:pt-48 pb-12 bg-black overflow-hidden">
        <div className="relative z-10 px-6 max-w-3xl mx-auto flex flex-col items-start w-full">
          {/* Eyebrow Logo */}
          <div className="mb-10">
            <Image
              src="/aivory-logo.svg"
              alt="Aivory Logo"
              width={90}
              height={24}
              className="h-4 w-auto opacity-70"
            />
          </div>
          
          <h1
            className="text-4xl sm:text-5xl md:text-[56px] font-light text-white mb-12 leading-[1.1] tracking-tight w-full"
            style={{ fontFamily: "var(--font-manrope), 'Manrope', sans-serif" }}
          >
            Contact
          </h1>
          
          {/* Divider Line */}
          <div className="w-full border-b border-white/20"></div>
        </div>
      </section>

      {/* Content */}
      <div className="bg-black pt-12 pb-32 px-6 md:px-16 lg:px-24 font-manrope">
        <div className="max-w-3xl mx-auto">

          {/* Book a demo directly, no waiting on a reply */}
          <div className="w-full bg-[#111111] rounded-xl border border-white/10 p-8 md:p-12 shadow-2xl mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight mb-3 text-white">
                Book a Demo
              </h2>
              <p className="text-white/75 text-base font-light">
                Prefer to talk it through? Grab a slot on our calendar and skip the back-and-forth.
              </p>
            </div>
            <TechnicalFrameButton
              href="https://book.aivory.uk/book/aivory-call"
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
            >
              Book a Call
            </TechnicalFrameButton>
          </div>

          {status !== 'success' ? (
            <div className="w-full bg-[#111111] rounded-xl border border-white/10 p-8 md:p-12 shadow-2xl">
              <h2 className="text-2xl font-bold tracking-tight mb-3 text-white">
                Get in Touch
              </h2>
              <p className="text-white/75 text-base mb-8 font-light">
                Have questions about Aivory? Want to discuss a custom plan or partnership? We&apos;d love to hear from you.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="contact-name" className="block text-sm font-medium mb-2 text-white/80">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="contact-name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. John Doe"
                    required
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors text-sm font-light"
                  />
                </div>

                <div>
                  <label htmlFor="contact-company" className="block text-sm font-medium mb-2 text-white/80">
                    Company *
                  </label>
                  <input
                    type="text"
                    id="contact-company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    placeholder="e.g. Acme Corporation"
                    required
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors text-sm font-light"
                  />
                </div>

                <div>
                  <label htmlFor="contact-email" className="block text-sm font-medium mb-2 text-white/80">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="contact-email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g. john@company.com"
                    required
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors text-sm font-light"
                  />
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-sm font-medium mb-2 text-white/80">
                    Message *
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={5}
                    placeholder="How can we help you?"
                    required
                    className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors resize-none text-sm font-light"
                  />
                </div>

                {status === 'error' && (
                  <p className="text-sm text-red-400">Something went wrong — please try again.</p>
                )}

                <TechnicalFrameButton
                  type="submit"
                  disabled={status === 'submitting'}
                  className="mt-4"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0 text-[#a3aa96]"
                  >
                    <path d="M7 7l10 10M17 7v10H7" />
                  </svg>
                  {status === 'submitting' ? 'Sending...' : 'Send Message'}
                </TechnicalFrameButton>
              </form>
            </div>
          ) : (
            <div className="bg-[#111111] rounded-xl border border-white/10 p-12 text-center shadow-2xl">
              <h3 className="text-2xl font-normal mb-4 text-white">✓ Thank you for your interest!</h3>
              <p className="text-white/75 text-lg mb-8 font-light">
                We&apos;ll be in touch soon to discuss your needs.
              </p>
              <button
                onClick={() => setStatus('idle')}
                className="flex items-center justify-center gap-2 mx-auto px-8 py-3.5 border border-white/20 text-white font-semibold hover:border-[#a3aa96] hover:bg-white/5 transition-all text-sm"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="rotate-180"
                >
                  <path d="M7 7l10 10M17 7v10H7" />
                </svg>
                Return
              </button>
            </div>
          )}

        </div>
      </div>

      <Footer />
    </main>
  );
}

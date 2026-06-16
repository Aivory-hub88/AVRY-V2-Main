'use client';

import { useState } from 'react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    message: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement form submission logic
    console.log('Form submitted:', formData);
    setIsSubmitted(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-[600px] bg-white rounded-xl shadow-2xl border border-[#eaeaea] p-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#888888] hover:text-[#111111] transition-colors text-2xl leading-none"
          aria-label="Close"
        >
          ✕
        </button>

        {!isSubmitted ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight mb-3 text-[#111111]">
              Contact Our Team for Full Consultation
            </h1>
            <p className="text-[#555555] text-base mb-6">
              Let&apos;s discuss how Aivory™ can help transform your organization.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="contact-name" className="block text-sm font-medium mb-1.5 text-[#111111]">
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
                  className="w-full px-3 py-2.5 bg-white border border-[#e0e0e0] text-[#111111] placeholder-[#888888] focus:outline-none focus:border-[#111111] transition-colors text-sm"
                />
              </div>

              <div>
                <label htmlFor="contact-company" className="block text-sm font-medium mb-1.5 text-[#111111]">
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
                  className="w-full px-3 py-2.5 bg-white border border-[#e0e0e0] text-[#111111] placeholder-[#888888] focus:outline-none focus:border-[#111111] transition-colors text-sm"
                />
              </div>

              <div>
                <label htmlFor="contact-email" className="block text-sm font-medium mb-1.5 text-[#111111]">
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
                  className="w-full px-3 py-2.5 bg-white border border-[#e0e0e0] text-[#111111] placeholder-[#888888] focus:outline-none focus:border-[#111111] transition-colors text-sm"
                />
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-sm font-medium mb-1.5 text-[#111111]">
                  What do you want to build? *
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={4}
                  placeholder="e.g. An AI-powered workflow automation system for our sales team..."
                  required
                  className="w-full px-3 py-2.5 bg-white border border-[#e0e0e0] text-[#111111] placeholder-[#888888] focus:outline-none focus:border-[#111111] transition-colors resize-none text-sm"
                />
              </div>

              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-[#111111] font-semibold hover:bg-[#111111] hover:text-white transition-colors text-base border border-[#111111]"
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
                >
                  <path d="M7 7l10 10M17 7v10H7" />
                </svg>
                Send Message
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-8">
            <h3 className="text-xl font-normal mb-3 text-[#111111]">✓ Thank you for your interest!</h3>
            <p className="text-[#555555] text-base mb-6">
              We&apos;ll be in touch soon to discuss your needs.
            </p>
            <button
              onClick={onClose}
              className="flex items-center justify-center gap-2 mx-auto px-6 py-3 border border-[#111111] text-[#111111] font-semibold hover:bg-[#111111] hover:text-white transition-colors text-base"
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
              >
                <path d="M7 7l10 10M17 7v10H7" />
              </svg>
              Return to Homepage
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

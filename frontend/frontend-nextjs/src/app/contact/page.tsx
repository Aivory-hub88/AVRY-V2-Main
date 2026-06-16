"use client"

import { useState } from "react"
import Link from "next/link"
import { HomeNavbar } from "@/components/layout/home-navbar"
import { HomeFooter } from "@/components/layout/home-footer"
import { getServiceUrl } from "@/lib/services"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    message: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch(
        `${getServiceUrl("backend")}/api/v1/contact`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      )

      if (!response.ok) {
        throw new Error("Failed to submit contact form")
      }

      setSuccess(true)
      setFormData({
        name: "",
        company: "",
        email: "",
        message: "",
      })

      // Auto-dismiss success message after 5 seconds
      setTimeout(() => {
        setSuccess(false)
      }, 5000)
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ background: '#050505' }}>
      <HomeNavbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20" style={{ background: '#050505' }}>
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h1 className="text-5xl font-bold text-white mb-6">Get in Touch</h1>
            <p className="text-xl text-text-secondary mb-8">
              Have questions about Aivory? Want to discuss a custom plan? We'd love to hear from you.
            </p>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-16" style={{ background: '#0a0a0a' }}>
          <div className="max-w-3xl mx-auto px-6">
            <div className="rounded-xl border border-white/10 p-8" style={{ background: '#111' }}>
              {/* Success Message */}
              {success && (
                <div className="mb-6 rounded-lg bg-green-500/10 border border-green-500/30 p-4">
                  <p className="text-sm text-green-300">
                    ✓ Thank you for your message! We'll get back to you soon.
                  </p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/30 p-4">
                  <p className="text-sm text-red-300">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name Field */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-lg bg-white/[0.05] border border-border-subtle text-white placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-mint focus:border-transparent disabled:opacity-50"
                    placeholder="John Doe"
                  />
                </div>

                {/* Company Field */}
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-white mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-lg bg-white/[0.05] border border-border-subtle text-white placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-mint focus:border-transparent disabled:opacity-50"
                    placeholder="Your Company"
                  />
                </div>

                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    className="w-full px-4 py-3 rounded-lg bg-white/[0.05] border border-border-subtle text-white placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-mint focus:border-transparent disabled:opacity-50"
                    placeholder="john@example.com"
                  />
                </div>

                {/* Message Field */}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-white mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    rows={6}
                    className="w-full px-4 py-3 rounded-lg bg-white/[0.05] border border-border-subtle text-white placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-mint focus:border-transparent disabled:opacity-50 resize-none"
                    placeholder="Tell us about your inquiry..."
                  />
                  <p className="text-xs text-text-tertiary mt-1">Minimum 10 characters</p>
                </div>

                {/* Submit Button */}
                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-brand-mint text-bg-primary font-medium rounded-lg hover:bg-brand-mint/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? "Sending..." : "Send Message"}
                  </button>
                  <Link
                    href="/"
                    className="px-6 py-3 bg-white/[0.05] text-white font-medium rounded-lg hover:bg-white/[0.1] transition-colors"
                  >
                    Cancel
                  </Link>
                </div>
              </form>

              {/* Alternative Contact Info */}
              <div className="mt-12 pt-8 border-t border-border-subtle">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-2">Email</h3>
                    <a
                      href="mailto:contact@aivory.id"
                      className="text-brand-mint hover:text-brand-mint/80 transition-colors"
                    >
                      contact@aivory.id
                    </a>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-2">Response Time</h3>
                    <p className="text-text-secondary">
                      We typically respond within 24 hours
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <HomeFooter />
    </div>
  )
}

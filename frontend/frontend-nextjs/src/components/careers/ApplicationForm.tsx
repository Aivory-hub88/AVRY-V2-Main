"use client"

import { useEffect, useState, useCallback } from "react"
import {
  getApplicationFormSchema,
  submitApplication,
  type ApplicationFormSchema,
  type ScreeningQuestion,
} from "@/lib/careers-api"

/** Allowed CV file extensions */
const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"]
/** Allowed MIME types for CV upload */
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]
/** Maximum file size in bytes (10 MB) */
const MAX_FILE_SIZE = 10 * 1024 * 1024

interface ApplicationFormProps {
  vacancyId: string
}

interface FormErrors {
  full_name?: string
  email?: string
  phone?: string
  cover_letter?: string
  github_url?: string
  linkedin_url?: string
  cv?: string
  screening?: Record<number, string>
  general?: string
}

type FormStatus = "idle" | "loading_schema" | "ready" | "submitting" | "success" | "error"

/**
 * ApplicationForm component renders a dynamic application form for a vacancy.
 * Fetches the form schema (including custom screening questions) from the API,
 * performs client-side validation, and submits via multipart POST.
 */
export function ApplicationForm({ vacancyId }: ApplicationFormProps) {
  const [status, setStatus] = useState<FormStatus>("loading_schema")
  const [schema, setSchema] = useState<ApplicationFormSchema | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Form field values
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [coverLetter, setCoverLetter] = useState("")
  const [githubUrl, setGithubUrl] = useState("")
  const [linkedinUrl, setLinkedinUrl] = useState("")
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [screeningResponses, setScreeningResponses] = useState<Record<number, string>>({})

  // Fetch form schema on mount
  useEffect(() => {
    async function loadSchema() {
      setStatus("loading_schema")
      const formSchema = await getApplicationFormSchema(vacancyId)
      if (formSchema) {
        setSchema(formSchema)
        setStatus("ready")
      } else {
        setStatus("error")
        setSubmitError("Failed to load application form. Please try again later.")
      }
    }
    loadSchema()
  }, [vacancyId])

  /**
   * Validates the file extension matches accepted formats.
   */
  const isValidFileExtension = useCallback((file: File): boolean => {
    const fileName = file.name.toLowerCase()
    return ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext))
  }, [])

  /**
   * Validates the file MIME type matches accepted formats.
   */
  const isValidFileMimeType = useCallback((file: File): boolean => {
    return ALLOWED_MIME_TYPES.includes(file.type)
  }, [])

  /**
   * Validates a basic email format.
   */
  const isValidEmail = useCallback((value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  }, [])

  /**
   * Validates a URL format (optional fields).
   */
  const isValidUrl = useCallback((value: string): boolean => {
    if (!value.trim()) return true // Optional, empty is fine
    try {
      new URL(value)
      return true
    } catch {
      return false
    }
  }, [])

  /**
   * Client-side validation of all form fields.
   * Returns true if valid, false otherwise (sets errors state).
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {}

    // Required: full_name
    if (!fullName.trim()) {
      newErrors.full_name = "Full name is required"
    }

    // Required: email
    if (!email.trim()) {
      newErrors.email = "Email address is required"
    } else if (!isValidEmail(email.trim())) {
      newErrors.email = "Please enter a valid email address"
    }

    // Optional: phone (no validation beyond presence)

    // Optional: github_url (validate format if provided)
    if (githubUrl.trim() && !isValidUrl(githubUrl.trim())) {
      newErrors.github_url = "Please enter a valid URL"
    }

    // Optional: linkedin_url (validate format if provided)
    if (linkedinUrl.trim() && !isValidUrl(linkedinUrl.trim())) {
      newErrors.linkedin_url = "Please enter a valid URL"
    }

    // Required: CV file
    if (!cvFile) {
      newErrors.cv = "CV/Resume file is required"
    } else {
      // Validate file size
      if (cvFile.size > MAX_FILE_SIZE) {
        newErrors.cv = "File size exceeds 10 MB limit"
      }
      // Validate file format
      else if (!isValidFileExtension(cvFile) && !isValidFileMimeType(cvFile)) {
        newErrors.cv = "Accepted formats: PDF, DOC, DOCX"
      }
    }

    // Validate required screening questions
    if (schema?.screening_questions) {
      const screeningErrors: Record<number, string> = {}
      schema.screening_questions.forEach((q, index) => {
        if (q.required && !screeningResponses[index]?.trim()) {
          screeningErrors[index] = "This field is required"
        }
      })
      if (Object.keys(screeningErrors).length > 0) {
        newErrors.screening = screeningErrors
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [
    fullName,
    email,
    githubUrl,
    linkedinUrl,
    cvFile,
    schema,
    screeningResponses,
    isValidEmail,
    isValidUrl,
    isValidFileExtension,
    isValidFileMimeType,
  ])

  /**
   * Handle form submission.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)

    if (!validateForm()) return

    setStatus("submitting")

    // Build FormData for multipart submission
    const formData = new FormData()
    formData.append("full_name", fullName.trim())
    formData.append("email", email.trim())
    if (phone.trim()) formData.append("phone", phone.trim())
    if (coverLetter.trim()) formData.append("cover_letter", coverLetter.trim())
    if (githubUrl.trim()) formData.append("github_url", githubUrl.trim())
    if (linkedinUrl.trim()) formData.append("linkedin_url", linkedinUrl.trim())
    if (cvFile) formData.append("cv", cvFile)

    // Append screening responses as JSON string
    if (schema?.screening_questions && schema.screening_questions.length > 0) {
      const responses = schema.screening_questions.map((q, index) => ({
        question: q.question,
        answer: screeningResponses[index] || "",
      }))
      formData.append("screening_responses", JSON.stringify(responses))
    }

    const result = await submitApplication(vacancyId, formData)

    if (result.success) {
      setStatus("success")
    } else {
      setStatus("ready")
      setSubmitError(result.error || "Submission failed. Please try again.")
    }
  }

  /**
   * Handle file input change with immediate validation feedback.
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setCvFile(file)

    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        setErrors((prev) => ({ ...prev, cv: "File size exceeds 10 MB limit" }))
      } else if (!isValidFileExtension(file) && !isValidFileMimeType(file)) {
        setErrors((prev) => ({ ...prev, cv: "Accepted formats: PDF, DOC, DOCX" }))
      } else {
        setErrors((prev) => {
          const { cv: _, ...rest } = prev
          return rest
        })
      }
    }
  }

  /**
   * Update a screening question response.
   */
  const handleScreeningChange = (index: number, value: string) => {
    setScreeningResponses((prev) => ({ ...prev, [index]: value }))
    // Clear error for this question if it was required and now has a value
    if (errors.screening?.[index] && value.trim()) {
      setErrors((prev) => {
        const updated = { ...prev.screening }
        delete updated[index]
        if (Object.keys(updated).length === 0) {
          const { screening: _, ...rest } = prev
          return rest
        }
        return { ...prev, screening: updated }
      })
    }
  }

  // --- Render helpers ---

  const inputClasses =
    "w-full px-4 py-3 rounded-lg bg-white/[0.05] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#c4c9b8] focus:border-transparent disabled:opacity-50"
  const inputErrorClasses =
    "w-full px-4 py-3 rounded-lg bg-white/[0.05] border border-red-500/50 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50"

  // Loading state
  if (status === "loading_schema") {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/10 rounded w-1/3" />
          <div className="h-10 bg-white/5 rounded w-full" />
          <div className="h-10 bg-white/5 rounded w-full" />
          <div className="h-10 bg-white/5 rounded w-full" />
          <div className="h-24 bg-white/5 rounded w-full" />
        </div>
      </div>
    )
  }

  // Error loading schema
  if (status === "error" && !schema) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center">
        <p className="text-red-300">{submitError || "Failed to load application form."}</p>
      </div>
    )
  }

  // Success state
  if (status === "success") {
    return (
      <div className="rounded-xl border border-[#c4c9b8]/30 bg-[#c4c9b8]/10 p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#c4c9b8]/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-[#c4c9b8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Application Submitted</h3>
        <p className="text-gray-400">
          Thank you for your application. We&apos;ll review your submission and get back to you soon.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8">
      <h2 className="text-2xl font-semibold text-white mb-6">Apply for this Position</h2>

      {/* General error banner */}
      {submitError && (
        <div className="mb-6 rounded-lg bg-red-500/10 border border-red-500/30 p-4">
          <p className="text-sm text-red-300">{submitError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Full Name */}
        <div>
          <label htmlFor="app-full-name" className="block text-sm font-medium text-white mb-2">
            Full Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            id="app-full-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={status === "submitting"}
            className={errors.full_name ? inputErrorClasses : inputClasses}
            placeholder="Jane Doe"
          />
          {errors.full_name && (
            <p className="text-xs text-red-400 mt-1">{errors.full_name}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="app-email" className="block text-sm font-medium text-white mb-2">
            Email Address <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            id="app-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "submitting"}
            className={errors.email ? inputErrorClasses : inputClasses}
            placeholder="jane@example.com"
          />
          {errors.email && (
            <p className="text-xs text-red-400 mt-1">{errors.email}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="app-phone" className="block text-sm font-medium text-white mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            id="app-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={status === "submitting"}
            className={errors.phone ? inputErrorClasses : inputClasses}
            placeholder="+1 (555) 123-4567"
          />
          {errors.phone && (
            <p className="text-xs text-red-400 mt-1">{errors.phone}</p>
          )}
        </div>

        {/* Cover Letter */}
        <div>
          <label htmlFor="app-cover-letter" className="block text-sm font-medium text-white mb-2">
            Cover Letter
          </label>
          <textarea
            id="app-cover-letter"
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            disabled={status === "submitting"}
            rows={5}
            className={`${errors.cover_letter ? inputErrorClasses : inputClasses} resize-none`}
            placeholder="Tell us why you're a great fit for this role..."
          />
          {errors.cover_letter && (
            <p className="text-xs text-red-400 mt-1">{errors.cover_letter}</p>
          )}
        </div>

        {/* GitHub URL */}
        <div>
          <label htmlFor="app-github" className="block text-sm font-medium text-white mb-2">
            GitHub Profile URL
          </label>
          <input
            type="url"
            id="app-github"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            disabled={status === "submitting"}
            className={errors.github_url ? inputErrorClasses : inputClasses}
            placeholder="https://github.com/username"
          />
          {errors.github_url && (
            <p className="text-xs text-red-400 mt-1">{errors.github_url}</p>
          )}
        </div>

        {/* LinkedIn URL */}
        <div>
          <label htmlFor="app-linkedin" className="block text-sm font-medium text-white mb-2">
            LinkedIn Profile URL
          </label>
          <input
            type="url"
            id="app-linkedin"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            disabled={status === "submitting"}
            className={errors.linkedin_url ? inputErrorClasses : inputClasses}
            placeholder="https://linkedin.com/in/username"
          />
          {errors.linkedin_url && (
            <p className="text-xs text-red-400 mt-1">{errors.linkedin_url}</p>
          )}
        </div>

        {/* CV Upload */}
        <div>
          <label htmlFor="app-cv" className="block text-sm font-medium text-white mb-2">
            CV / Resume <span className="text-red-400">*</span>
          </label>
          <div className={`relative rounded-lg border ${errors.cv ? "border-red-500/50" : "border-white/10"} bg-white/[0.05] p-4`}>
            <input
              type="file"
              id="app-cv"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
              disabled={status === "submitting"}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/[0.05] flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                {cvFile ? (
                  <p className="text-sm text-white truncate">{cvFile.name}</p>
                ) : (
                  <p className="text-sm text-gray-400">Click to upload or drag and drop</p>
                )}
                <p className="text-xs text-gray-500 mt-0.5">PDF, DOC, or DOCX (max 10 MB)</p>
              </div>
            </div>
          </div>
          {errors.cv && (
            <p className="text-xs text-red-400 mt-1">{errors.cv}</p>
          )}
        </div>

        {/* Custom Screening Questions */}
        {schema?.screening_questions && schema.screening_questions.length > 0 && (
          <div className="pt-4 border-t border-white/10">
            <h3 className="text-lg font-medium text-white mb-4">Screening Questions</h3>
            <div className="space-y-5">
              {schema.screening_questions.map((question, index) => (
                <ScreeningQuestionField
                  key={index}
                  question={question}
                  index={index}
                  value={screeningResponses[index] || ""}
                  onChange={handleScreeningChange}
                  error={errors.screening?.[index]}
                  disabled={status === "submitting"}
                  inputClasses={inputClasses}
                  inputErrorClasses={inputErrorClasses}
                />
              ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full px-6 py-3 bg-[#c4c9b8] text-[#050505] font-medium rounded-lg hover:bg-[#c4c9b8]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === "submitting" ? "Submitting Application..." : "Submit Application"}
          </button>
        </div>
      </form>
    </div>
  )
}

/**
 * Renders a single screening question based on its type (text, textarea, select).
 */
function ScreeningQuestionField({
  question,
  index,
  value,
  onChange,
  error,
  disabled,
  inputClasses,
  inputErrorClasses,
}: {
  question: ScreeningQuestion
  index: number
  value: string
  onChange: (index: number, value: string) => void
  error?: string
  disabled: boolean
  inputClasses: string
  inputErrorClasses: string
}) {
  const fieldId = `screening-${index}`
  const classes = error ? inputErrorClasses : inputClasses

  return (
    <div>
      <label htmlFor={fieldId} className="block text-sm font-medium text-white mb-2">
        {question.question}
        {question.required && <span className="text-red-400 ml-1">*</span>}
      </label>

      {question.type === "textarea" ? (
        <textarea
          id={fieldId}
          value={value}
          onChange={(e) => onChange(index, e.target.value)}
          disabled={disabled}
          rows={3}
          className={`${classes} resize-none`}
          placeholder="Your answer..."
        />
      ) : question.type === "select" && question.options ? (
        <select
          id={fieldId}
          value={value}
          onChange={(e) => onChange(index, e.target.value)}
          disabled={disabled}
          className={classes}
        >
          <option value="">Select an option...</option>
          {question.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          id={fieldId}
          value={value}
          onChange={(e) => onChange(index, e.target.value)}
          disabled={disabled}
          className={classes}
          placeholder="Your answer..."
        />
      )}

      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getApplicationFormSchema,
  submitApplication,
  type ApplicationFormSchema,
  type ScreeningQuestion,
} from "@/lib/careers-api";

/** Allowed CV file extensions */
const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];
/** Allowed MIME types for CV upload */
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
/** Maximum file size in bytes (10 MB) */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Muted brick tone used for validation feedback on the ivory canvas. */
const ERROR_TONE = "#8c2f20";

interface ApplicationFormProps {
  vacancyId: string;
}

interface FormErrors {
  full_name?: string;
  email?: string;
  phone?: string;
  cover_letter?: string;
  github_url?: string;
  linkedin_url?: string;
  cv?: string;
  screening?: Record<number, string>;
  general?: string;
}

type FormStatus =
  | "idle"
  | "loading_schema"
  | "ready"
  | "submitting"
  | "success"
  | "error";

/**
 * ApplicationForm component renders a dynamic application form for a vacancy.
 * Fetches the form schema (including custom screening questions) from the API,
 * performs client-side validation, and submits via multipart POST.
 */
export function ApplicationForm({ vacancyId }: ApplicationFormProps) {
  const [status, setStatus] = useState<FormStatus>("loading_schema");
  const [schema, setSchema] = useState<ApplicationFormSchema | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form field values
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [screeningResponses, setScreeningResponses] = useState<
    Record<number, string>
  >({});

  // Fetch form schema on mount
  useEffect(() => {
    async function loadSchema() {
      setStatus("loading_schema");
      const formSchema = await getApplicationFormSchema(vacancyId);
      if (formSchema) {
        setSchema(formSchema);
        setStatus("ready");
      } else {
        setStatus("error");
        setSubmitError(
          "Failed to load application form. Please try again later."
        );
      }
    }
    loadSchema();
  }, [vacancyId]);

  /**
   * Validates the file extension matches accepted formats.
   */
  const isValidFileExtension = useCallback((file: File): boolean => {
    const fileName = file.name.toLowerCase();
    return ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
  }, []);

  /**
   * Validates the file MIME type matches accepted formats.
   */
  const isValidFileMimeType = useCallback((file: File): boolean => {
    return ALLOWED_MIME_TYPES.includes(file.type);
  }, []);

  /**
   * Validates a basic email format.
   */
  const isValidEmail = useCallback((value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }, []);

  /**
   * Validates a URL format (optional fields).
   */
  const isValidUrl = useCallback((value: string): boolean => {
    if (!value.trim()) return true; // Optional, empty is fine
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }, []);

  /**
   * Client-side validation of all form fields.
   * Returns true if valid, false otherwise (sets errors state).
   */
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Required: full_name
    if (!fullName.trim()) {
      newErrors.full_name = "Full name is required";
    }

    // Required: email
    if (!email.trim()) {
      newErrors.email = "Email address is required";
    } else if (!isValidEmail(email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    // Optional: phone (no validation beyond presence)

    // Optional: github_url (validate format if provided)
    if (githubUrl.trim() && !isValidUrl(githubUrl.trim())) {
      newErrors.github_url = "Please enter a valid URL";
    }

    // Optional: linkedin_url (validate format if provided)
    if (linkedinUrl.trim() && !isValidUrl(linkedinUrl.trim())) {
      newErrors.linkedin_url = "Please enter a valid URL";
    }

    // Required: CV file
    if (!cvFile) {
      newErrors.cv = "CV/Resume file is required";
    } else {
      // Validate file size
      if (cvFile.size > MAX_FILE_SIZE) {
        newErrors.cv = "File size exceeds 10 MB limit";
      }
      // Validate file format
      else if (!isValidFileExtension(cvFile) && !isValidFileMimeType(cvFile)) {
        newErrors.cv = "Accepted formats: PDF, DOC, DOCX";
      }
    }

    // Validate required screening questions
    if (schema?.screening_questions) {
      const screeningErrors: Record<number, string> = {};
      schema.screening_questions.forEach((q, index) => {
        if (q.required && !screeningResponses[index]?.trim()) {
          screeningErrors[index] = "This field is required";
        }
      });
      if (Object.keys(screeningErrors).length > 0) {
        newErrors.screening = screeningErrors;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
  ]);

  /**
   * Handle form submission.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) return;

    setStatus("submitting");

    // Build FormData for multipart submission
    const formData = new FormData();
    formData.append("full_name", fullName.trim());
    formData.append("email", email.trim());
    if (phone.trim()) formData.append("phone", phone.trim());
    if (coverLetter.trim()) formData.append("cover_letter", coverLetter.trim());
    if (githubUrl.trim()) formData.append("github_url", githubUrl.trim());
    if (linkedinUrl.trim()) formData.append("linkedin_url", linkedinUrl.trim());
    if (cvFile) formData.append("cv", cvFile);

    // Append screening responses as JSON string
    if (schema?.screening_questions && schema.screening_questions.length > 0) {
      const responses = schema.screening_questions.map((q, index) => ({
        question: q.question,
        answer: screeningResponses[index] || "",
      }));
      formData.append("screening_responses", JSON.stringify(responses));
    }

    const result = await submitApplication(vacancyId, formData);

    if (result.success) {
      setStatus("success");
    } else {
      setStatus("ready");
      setSubmitError(result.error || "Submission failed. Please try again.");
    }
  };

  /**
   * Handle file input change with immediate validation feedback.
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setCvFile(file);

    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        setErrors((prev) => ({ ...prev, cv: "File size exceeds 10 MB limit" }));
      } else if (!isValidFileExtension(file) && !isValidFileMimeType(file)) {
        setErrors((prev) => ({
          ...prev,
          cv: "Accepted formats: PDF, DOC, DOCX",
        }));
      } else {
        setErrors((prev) => {
          const { cv: _, ...rest } = prev;
          return rest;
        });
      }
    }
  };

  /**
   * Update a screening question response.
   */
  const handleScreeningChange = (index: number, value: string) => {
    setScreeningResponses((prev) => ({ ...prev, [index]: value }));
    // Clear error for this question if it was required and now has a value
    if (errors.screening?.[index] && value.trim()) {
      setErrors((prev) => {
        const updated = { ...prev.screening };
        delete updated[index];
        if (Object.keys(updated).length === 0) {
          const { screening: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, screening: updated };
      });
    }
  };

  // --- Render helpers ---

  const inputClasses =
    "w-full border-b border-black/25 bg-transparent py-3 text-[15px] font-light text-[#11110f] placeholder-black/35 transition-colors focus:border-black focus:outline-none disabled:opacity-50";
  const inputErrorClasses =
    "w-full border-b border-[#8c2f20] bg-transparent py-3 text-[15px] font-light text-[#11110f] placeholder-black/35 transition-colors focus:border-[#8c2f20] focus:outline-none disabled:opacity-50";
  const labelClasses =
    "mb-2 block font-mono text-[10px] uppercase tracking-[0.16em] text-black/60";
  const errorTextClasses = "mt-2 text-[12px] font-light";

  // Loading state
  if (status === "loading_schema") {
    return (
      <div
        aria-hidden="true"
        className="animate-pulse border-t border-black/25 pt-10"
      >
        <div className="space-y-8">
          {[0, 1, 2, 3].map((row) => (
            <div key={row}>
              <div className="h-3 w-28 bg-black/10" />
              <div className="mt-4 h-6 w-full border-b border-black/15" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Error loading schema
  if (status === "error" && !schema) {
    return (
      <div className="border-y border-black/25 py-10">
        <p
          role="alert"
          className="text-[15px] font-light leading-[1.7]"
          style={{ color: ERROR_TONE }}
        >
          {submitError || "Failed to load application form."}
        </p>
      </div>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <div className="border-y border-black/25 py-12 md:py-16">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/60">
          Received
        </p>
        <h3 className="mt-6 max-w-2xl text-[30px] font-light leading-[1.08] tracking-[-0.03em] text-[#11110f] md:text-[42px]">
          Application Submitted
        </h3>
        <p className="mt-6 max-w-xl text-[15px] font-light leading-[1.7] text-black/70 md:text-[16px]">
          Thank you for your application. We&apos;ll review your submission and
          get back to you soon.
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-black/25 pt-10">
      <h2 className="text-[25px] font-light leading-[1.1] tracking-[-0.025em] text-[#11110f] md:text-[34px]">
        Apply for this Position
      </h2>

      {/* General error banner */}
      {submitError && (
        <p
          role="alert"
          className="mt-8 border-y border-black/25 py-5 text-[14px] font-light leading-[1.6]"
          style={{ color: ERROR_TONE }}
        >
          {submitError}
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-10 space-y-9" noValidate>
        {/* Full Name */}
        <div>
          <label htmlFor="app-full-name" className={labelClasses}>
            Full Name <span aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </label>
          <input
            type="text"
            id="app-full-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={status === "submitting"}
            required
            aria-invalid={Boolean(errors.full_name)}
            aria-describedby={
              errors.full_name ? "app-full-name-error" : undefined
            }
            className={errors.full_name ? inputErrorClasses : inputClasses}
            placeholder="Jane Doe"
          />
          {errors.full_name && (
            <p
              id="app-full-name-error"
              className={errorTextClasses}
              style={{ color: ERROR_TONE }}
            >
              {errors.full_name}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="app-email" className={labelClasses}>
            Email Address <span aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </label>
          <input
            type="email"
            id="app-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === "submitting"}
            required
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "app-email-error" : undefined}
            className={errors.email ? inputErrorClasses : inputClasses}
            placeholder="jane@example.com"
          />
          {errors.email && (
            <p
              id="app-email-error"
              className={errorTextClasses}
              style={{ color: ERROR_TONE }}
            >
              {errors.email}
            </p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="app-phone" className={labelClasses}>
            Phone Number
          </label>
          <input
            type="tel"
            id="app-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={status === "submitting"}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "app-phone-error" : undefined}
            className={errors.phone ? inputErrorClasses : inputClasses}
            placeholder="+1 (555) 123-4567"
          />
          {errors.phone && (
            <p
              id="app-phone-error"
              className={errorTextClasses}
              style={{ color: ERROR_TONE }}
            >
              {errors.phone}
            </p>
          )}
        </div>

        {/* Cover Letter */}
        <div>
          <label htmlFor="app-cover-letter" className={labelClasses}>
            Cover Letter
          </label>
          <textarea
            id="app-cover-letter"
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            disabled={status === "submitting"}
            rows={5}
            aria-invalid={Boolean(errors.cover_letter)}
            aria-describedby={
              errors.cover_letter ? "app-cover-letter-error" : undefined
            }
            className={`${
              errors.cover_letter ? inputErrorClasses : inputClasses
            } resize-none leading-[1.7]`}
            placeholder="Tell us why you're a great fit for this role..."
          />
          {errors.cover_letter && (
            <p
              id="app-cover-letter-error"
              className={errorTextClasses}
              style={{ color: ERROR_TONE }}
            >
              {errors.cover_letter}
            </p>
          )}
        </div>

        {/* GitHub URL */}
        <div>
          <label htmlFor="app-github" className={labelClasses}>
            GitHub Profile URL
          </label>
          <input
            type="url"
            id="app-github"
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            disabled={status === "submitting"}
            aria-invalid={Boolean(errors.github_url)}
            aria-describedby={
              errors.github_url ? "app-github-error" : undefined
            }
            className={errors.github_url ? inputErrorClasses : inputClasses}
            placeholder="https://github.com/username"
          />
          {errors.github_url && (
            <p
              id="app-github-error"
              className={errorTextClasses}
              style={{ color: ERROR_TONE }}
            >
              {errors.github_url}
            </p>
          )}
        </div>

        {/* LinkedIn URL */}
        <div>
          <label htmlFor="app-linkedin" className={labelClasses}>
            LinkedIn Profile URL
          </label>
          <input
            type="url"
            id="app-linkedin"
            value={linkedinUrl}
            onChange={(e) => setLinkedinUrl(e.target.value)}
            disabled={status === "submitting"}
            aria-invalid={Boolean(errors.linkedin_url)}
            aria-describedby={
              errors.linkedin_url ? "app-linkedin-error" : undefined
            }
            className={errors.linkedin_url ? inputErrorClasses : inputClasses}
            placeholder="https://linkedin.com/in/username"
          />
          {errors.linkedin_url && (
            <p
              id="app-linkedin-error"
              className={errorTextClasses}
              style={{ color: ERROR_TONE }}
            >
              {errors.linkedin_url}
            </p>
          )}
        </div>

        {/* CV Upload */}
        <div>
          <label htmlFor="app-cv" className={labelClasses}>
            CV / Resume <span aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </label>
          <div
            className={`relative border-b ${
              errors.cv ? "border-[#8c2f20]" : "border-black/25"
            } py-4 focus-within:border-black`}
          >
            <input
              type="file"
              id="app-cv"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
              disabled={status === "submitting"}
              required
              aria-invalid={Boolean(errors.cv)}
              aria-describedby="app-cv-hint"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            />
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-[15px] font-light text-[#11110f]">
                {cvFile ? cvFile.name : "Choose a file"}
              </p>
              <span
                aria-hidden="true"
                className="border-b border-black pb-0.5 text-[12px] font-light text-black"
              >
                Upload
              </span>
            </div>
            <p
              id="app-cv-hint"
              className="mt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-black/50"
            >
              PDF, DOC, or DOCX — max 10 MB
            </p>
          </div>
          {errors.cv && (
            <p className={errorTextClasses} style={{ color: ERROR_TONE }}>
              {errors.cv}
            </p>
          )}
        </div>

        {/* Custom Screening Questions */}
        {schema?.screening_questions &&
          schema.screening_questions.length > 0 && (
            <div className="border-t border-black/25 pt-10">
              <h3 className="text-[21px] font-light leading-[1.15] tracking-[-0.02em] text-[#11110f] md:text-[26px]">
                Screening Questions
              </h3>
              <div className="mt-8 space-y-8">
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
                    labelClasses={labelClasses}
                    errorTextClasses={errorTextClasses}
                  />
                ))}
              </div>
            </div>
          )}

        {/* Submit Button */}
        <div className="border-t border-black/25 pt-10">
          <button
            type="submit"
            disabled={status === "submitting"}
            className="inline-flex min-h-[44px] items-center gap-3 border border-black px-8 py-3 text-[13px] font-light uppercase tracking-[0.1em] text-black transition-colors hover:bg-[#11110f] hover:text-[#efeee8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "submitting"
              ? "Submitting Application..."
              : "Submit Application"}
          </button>
        </div>
      </form>
    </div>
  );
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
  labelClasses,
  errorTextClasses,
}: {
  question: ScreeningQuestion;
  index: number;
  value: string;
  onChange: (index: number, value: string) => void;
  error?: string;
  disabled: boolean;
  inputClasses: string;
  inputErrorClasses: string;
  labelClasses: string;
  errorTextClasses: string;
}) {
  const fieldId = `screening-${index}`;
  const errorId = `${fieldId}-error`;
  const classes = error ? inputErrorClasses : inputClasses;

  return (
    <div>
      <label htmlFor={fieldId} className={labelClasses}>
        {question.question}
        {question.required && (
          <>
            <span aria-hidden="true"> *</span>
            <span className="sr-only">(required)</span>
          </>
        )}
      </label>

      {question.type === "textarea" ? (
        <textarea
          id={fieldId}
          value={value}
          onChange={(e) => onChange(index, e.target.value)}
          disabled={disabled}
          rows={3}
          required={question.required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`${classes} resize-none leading-[1.7]`}
          placeholder="Your answer..."
        />
      ) : question.type === "select" && question.options ? (
        <select
          id={fieldId}
          value={value}
          onChange={(e) => onChange(index, e.target.value)}
          disabled={disabled}
          required={question.required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
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
          required={question.required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={classes}
          placeholder="Your answer..."
        />
      )}

      {error && (
        <p
          id={errorId}
          className={errorTextClasses}
          style={{ color: ERROR_TONE }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

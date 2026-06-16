import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ApplicationForm } from "./ApplicationForm"

// Mock the careers-api module
vi.mock("@/lib/careers-api", () => ({
  getApplicationFormSchema: vi.fn(),
  submitApplication: vi.fn(),
}))

import {
  getApplicationFormSchema,
  submitApplication,
} from "@/lib/careers-api"

const mockGetSchema = vi.mocked(getApplicationFormSchema)
const mockSubmit = vi.mocked(submitApplication)

const MOCK_SCHEMA = {
  vacancy_id: "test-vacancy-123",
  fields: {
    full_name: { required: true, label: "Full Name" },
    email: { required: true, label: "Email Address" },
    phone: { required: false, label: "Phone Number" },
    cover_letter: { required: false, label: "Cover Letter" },
    github_url: { required: false, label: "GitHub Profile URL" },
    linkedin_url: { required: false, label: "LinkedIn Profile URL" },
    cv: { required: true, label: "CV / Resume", max_size_mb: 10, accepted_formats: ["pdf", "doc", "docx"] },
  },
  screening_questions: [
    { question: "Why do you want to work here?", required: true, type: "textarea" as const },
    { question: "Years of experience", required: false, type: "text" as const },
  ],
}

describe("ApplicationForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSchema.mockResolvedValue(MOCK_SCHEMA)
    mockSubmit.mockResolvedValue({ success: true })
  })

  it("renders loading state initially", () => {
    mockGetSchema.mockReturnValue(new Promise(() => {})) // never resolves
    render(<ApplicationForm vacancyId="test-vacancy-123" />)
    // Should show loading skeleton (animate-pulse elements)
    expect(document.querySelector(".animate-pulse")).toBeTruthy()
  })

  it("renders form fields after schema loads", async () => {
    render(<ApplicationForm vacancyId="test-vacancy-123" />)

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    })

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/cover letter/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/github profile/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/linkedin profile/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/cv \/ resume/i)).toBeInTheDocument()
  })

  it("renders custom screening questions", async () => {
    render(<ApplicationForm vacancyId="test-vacancy-123" />)

    await waitFor(() => {
      expect(screen.getByText("Screening Questions")).toBeInTheDocument()
    })

    expect(screen.getByLabelText(/why do you want to work here/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/years of experience/i)).toBeInTheDocument()
  })

  it("shows error when schema fails to load", async () => {
    mockGetSchema.mockResolvedValue(null)
    render(<ApplicationForm vacancyId="test-vacancy-123" />)

    await waitFor(() => {
      expect(screen.getByText(/failed to load application form/i)).toBeInTheDocument()
    })
  })

  it("validates required fields on submit", async () => {
    const user = userEvent.setup()
    render(<ApplicationForm vacancyId="test-vacancy-123" />)

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    })

    // Submit without filling anything
    await user.click(screen.getByRole("button", { name: /submit application/i }))

    expect(screen.getByText("Full name is required")).toBeInTheDocument()
    expect(screen.getByText("Email address is required")).toBeInTheDocument()
    expect(screen.getByText("CV/Resume file is required")).toBeInTheDocument()
    // Required screening question
    expect(screen.getByText("This field is required")).toBeInTheDocument()

    // Should NOT have called submit
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it("validates email format", async () => {
    const user = userEvent.setup()
    render(<ApplicationForm vacancyId="test-vacancy-123" />)

    await waitFor(() => {
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/full name/i), "Jane Doe")
    await user.type(screen.getByLabelText(/email address/i), "invalid-email")

    // Create a valid file to avoid CV error
    const file = new File(["test"], "cv.pdf", { type: "application/pdf" })
    const fileInput = screen.getByLabelText(/cv \/ resume/i) as HTMLInputElement
    await userEvent.upload(fileInput, file)

    // Fill required screening question
    await user.type(screen.getByLabelText(/why do you want to work here/i), "I love coding")

    await user.click(screen.getByRole("button", { name: /submit application/i }))

    expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument()
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it("validates file size exceeds 10 MB", async () => {
    render(<ApplicationForm vacancyId="test-vacancy-123" />)

    await waitFor(() => {
      expect(screen.getByLabelText(/cv \/ resume/i)).toBeInTheDocument()
    })

    // Create a file larger than 10MB
    const largeContent = new Uint8Array(11 * 1024 * 1024)
    const file = new File([largeContent], "large.pdf", { type: "application/pdf" })

    const fileInput = screen.getByLabelText(/cv \/ resume/i) as HTMLInputElement
    await userEvent.upload(fileInput, file)

    expect(screen.getByText("File size exceeds 10 MB limit")).toBeInTheDocument()
  })

  it("validates file format", async () => {
    render(<ApplicationForm vacancyId="test-vacancy-123" />)

    await waitFor(() => {
      expect(screen.getByLabelText(/cv \/ resume/i)).toBeInTheDocument()
    })

    // Create a file with invalid format
    const file = new File(["test"], "image.png", { type: "image/png" })
    const fileInput = screen.getByLabelText(/cv \/ resume/i) as HTMLInputElement

    // Use fireEvent.change directly since userEvent.upload has JSDOM limitations
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByText("Accepted formats: PDF, DOC, DOCX")).toBeInTheDocument()
    })
  })

  it("submits valid application and shows confirmation", async () => {
    const user = userEvent.setup()
    render(<ApplicationForm vacancyId="test-vacancy-123" />)

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    })

    // Fill all required fields
    await user.type(screen.getByLabelText(/full name/i), "Jane Doe")
    await user.type(screen.getByLabelText(/email address/i), "jane@example.com")

    // Upload valid file
    const file = new File(["test content"], "resume.pdf", { type: "application/pdf" })
    const fileInput = screen.getByLabelText(/cv \/ resume/i) as HTMLInputElement
    await userEvent.upload(fileInput, file)

    // Fill required screening question
    await user.type(screen.getByLabelText(/why do you want to work here/i), "I love building products")

    // Submit
    await user.click(screen.getByRole("button", { name: /submit application/i }))

    await waitFor(() => {
      expect(screen.getByText("Application Submitted")).toBeInTheDocument()
    })

    expect(mockSubmit).toHaveBeenCalledWith("test-vacancy-123", expect.any(FormData))
  })

  it("displays error message on submission failure", async () => {
    mockSubmit.mockResolvedValue({ success: false, error: "File size exceeds 10 MB limit" })

    const user = userEvent.setup()
    render(<ApplicationForm vacancyId="test-vacancy-123" />)

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    })

    // Fill required fields
    await user.type(screen.getByLabelText(/full name/i), "Jane Doe")
    await user.type(screen.getByLabelText(/email address/i), "jane@example.com")

    const file = new File(["test"], "resume.pdf", { type: "application/pdf" })
    const fileInput = screen.getByLabelText(/cv \/ resume/i) as HTMLInputElement
    await userEvent.upload(fileInput, file)

    await user.type(screen.getByLabelText(/why do you want to work here/i), "Great company")

    await user.click(screen.getByRole("button", { name: /submit application/i }))

    await waitFor(() => {
      expect(screen.getByText("File size exceeds 10 MB limit")).toBeInTheDocument()
    })
  })

  it("renders select-type screening questions with options", async () => {
    const schemaWithSelect = {
      ...MOCK_SCHEMA,
      screening_questions: [
        {
          question: "Preferred start date",
          required: true,
          type: "select" as const,
          options: ["Immediately", "In 2 weeks", "In 1 month"],
        },
      ],
    }
    mockGetSchema.mockResolvedValue(schemaWithSelect)

    render(<ApplicationForm vacancyId="test-vacancy-123" />)

    await waitFor(() => {
      expect(screen.getByLabelText(/preferred start date/i)).toBeInTheDocument()
    })

    const select = screen.getByLabelText(/preferred start date/i) as HTMLSelectElement
    expect(select.tagName).toBe("SELECT")
    expect(screen.getByText("Immediately")).toBeInTheDocument()
    expect(screen.getByText("In 2 weeks")).toBeInTheDocument()
    expect(screen.getByText("In 1 month")).toBeInTheDocument()
  })

  it("disables form during submission", async () => {
    // Make submit hang to test disabled state
    mockSubmit.mockReturnValue(new Promise(() => {}))

    const user = userEvent.setup()
    render(<ApplicationForm vacancyId="test-vacancy-123" />)

    await waitFor(() => {
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument()
    })

    await user.type(screen.getByLabelText(/full name/i), "Jane Doe")
    await user.type(screen.getByLabelText(/email address/i), "jane@example.com")

    const file = new File(["test"], "resume.pdf", { type: "application/pdf" })
    const fileInput = screen.getByLabelText(/cv \/ resume/i) as HTMLInputElement
    await userEvent.upload(fileInput, file)

    await user.type(screen.getByLabelText(/why do you want to work here/i), "Great team")

    await user.click(screen.getByRole("button", { name: /submit application/i }))

    await waitFor(() => {
      expect(screen.getByText("Submitting Application...")).toBeInTheDocument()
    })

    // Button should be disabled
    expect(screen.getByRole("button", { name: /submitting/i })).toBeDisabled()
  })
})

/**
 * Unit Tests for CommentSection Component
 *
 * Tests rendering of threaded comments, comment form, reply form,
 * like/dislike buttons, and basic interactions.
 */

import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach } from "vitest"
import "@testing-library/jest-dom/vitest"
import { CommentSection } from "./CommentSection"

// Mock the blog-api module
vi.mock("@/lib/blog-api", () => ({
  getPostComments: vi.fn(),
  createComment: vi.fn(),
  createReply: vi.fn(),
  likeComment: vi.fn(),
  dislikeComment: vi.fn(),
}))

// Mock the services module
vi.mock("@/lib/services", () => ({
  getServiceUrl: vi.fn(() => "http://localhost:8089"),
}))

// Mock WebSocket
const mockWs = {
  onopen: null as (() => void) | null,
  onmessage: null as ((event: { data: string }) => void) | null,
  onclose: null as (() => void) | null,
  onerror: null as (() => void) | null,
  close: vi.fn(),
}

vi.stubGlobal(
  "WebSocket",
  vi.fn(() => mockWs)
)

import {
  getPostComments,
  createComment,
  createReply,
  likeComment,
  dislikeComment,
} from "@/lib/blog-api"

const mockGetPostComments = getPostComments as ReturnType<typeof vi.fn>
const mockCreateComment = createComment as ReturnType<typeof vi.fn>
const mockCreateReply = createReply as ReturnType<typeof vi.fn>
const mockLikeComment = likeComment as ReturnType<typeof vi.fn>
const mockDislikeComment = dislikeComment as ReturnType<typeof vi.fn>

const sampleComments = [
  {
    id: "c1",
    post_id: "post-1",
    parent_id: null,
    author_name: "Alice",
    body: "Great article!",
    like_count: 5,
    dislike_count: 1,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    replies: [
      {
        id: "c2",
        post_id: "post-1",
        parent_id: "c1",
        author_name: "Bob",
        body: "I agree!",
        like_count: 2,
        dislike_count: 0,
        created_at: new Date(Date.now() - 1800000).toISOString(),
        replies: [],
      },
    ],
  },
  {
    id: "c3",
    post_id: "post-1",
    parent_id: null,
    author_name: "Charlie",
    body: "Interesting perspective.",
    like_count: 0,
    dislike_count: 0,
    created_at: new Date(Date.now() - 600000).toISOString(),
    replies: [],
  },
]

describe("CommentSection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPostComments.mockResolvedValue(sampleComments)
    // Reset WebSocket mock
    mockWs.close.mockClear()
    mockWs.onopen = null
    mockWs.onmessage = null
    mockWs.onclose = null
    mockWs.onerror = null
  })

  describe("Loading and Rendering", () => {
    it("should show loading skeleton initially", () => {
      mockGetPostComments.mockReturnValue(new Promise(() => {})) // never resolves
      render(<CommentSection postId="post-1" />)
      expect(screen.getByLabelText("Comments")).toBeInTheDocument()
    })

    it("should render comments after loading", async () => {
      render(<CommentSection postId="post-1" />)

      await waitFor(() => {
        expect(screen.getByText("Great article!")).toBeInTheDocument()
      })
      expect(screen.getByText("Alice")).toBeInTheDocument()
      expect(screen.getByText("Interesting perspective.")).toBeInTheDocument()
      expect(screen.getByText("Charlie")).toBeInTheDocument()
    })

    it("should render threaded replies indented under parent", async () => {
      render(<CommentSection postId="post-1" />)

      await waitFor(() => {
        expect(screen.getByText("I agree!")).toBeInTheDocument()
      })
      expect(screen.getByText("Bob")).toBeInTheDocument()
    })

    it("should show total comment count including replies", async () => {
      render(<CommentSection postId="post-1" />)

      await waitFor(() => {
        expect(screen.getByText("(3)")).toBeInTheDocument()
      })
    })

    it("should show empty state when no comments exist", async () => {
      mockGetPostComments.mockResolvedValue([])
      render(<CommentSection postId="post-1" />)

      await waitFor(() => {
        expect(
          screen.getByText("No comments yet. Be the first to share your thoughts!")
        ).toBeInTheDocument()
      })
    })

    it("should show error state when fetching fails", async () => {
      mockGetPostComments.mockRejectedValue(new Error("Network error"))
      render(<CommentSection postId="post-1" />)

      await waitFor(() => {
        expect(screen.getByText("Network error")).toBeInTheDocument()
      })
      expect(screen.getByText("Try again")).toBeInTheDocument()
    })
  })

  describe("Comment Form", () => {
    it("should render the comment form with name and body fields", async () => {
      render(<CommentSection postId="post-1" />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Your name")).toBeInTheDocument()
      })
      expect(
        screen.getByPlaceholderText("Share your thoughts…")
      ).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: "Post Comment" })
      ).toBeInTheDocument()
    })

    it("should submit a new comment", async () => {
      const user = userEvent.setup()
      const newComment = {
        id: "c4",
        post_id: "post-1",
        parent_id: null,
        author_name: "Dave",
        body: "New comment!",
        like_count: 0,
        dislike_count: 0,
        created_at: new Date().toISOString(),
        replies: [],
      }
      mockCreateComment.mockResolvedValue(newComment)

      render(<CommentSection postId="post-1" />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText("Your name")).toBeInTheDocument()
      })

      await user.type(screen.getByPlaceholderText("Your name"), "Dave")
      await user.type(
        screen.getByPlaceholderText("Share your thoughts…"),
        "New comment!"
      )
      await user.click(screen.getByRole("button", { name: "Post Comment" }))

      await waitFor(() => {
        expect(mockCreateComment).toHaveBeenCalledWith(
          "post-1",
          "Dave",
          "New comment!"
        )
      })
    })

    it("should disable submit button when fields are empty", async () => {
      render(<CommentSection postId="post-1" />)

      await waitFor(() => {
        const submitBtn = screen.getByRole("button", { name: "Post Comment" })
        expect(submitBtn).toBeDisabled()
      })
    })
  })

  describe("Reply Form", () => {
    it("should show reply form when Reply button is clicked", async () => {
      const user = userEvent.setup()
      render(<CommentSection postId="post-1" />)

      await waitFor(() => {
        expect(screen.getByText("Great article!")).toBeInTheDocument()
      })

      // Click the first Reply button
      const replyButtons = screen.getAllByText("Reply")
      await user.click(replyButtons[0])

      expect(
        screen.getByPlaceholderText("Write a reply…")
      ).toBeInTheDocument()
      expect(
        screen.getByRole("button", { name: "Cancel" })
      ).toBeInTheDocument()
    })

    it("should hide reply form when Cancel is clicked", async () => {
      const user = userEvent.setup()
      render(<CommentSection postId="post-1" />)

      await waitFor(() => {
        expect(screen.getByText("Great article!")).toBeInTheDocument()
      })

      const replyButtons = screen.getAllByText("Reply")
      await user.click(replyButtons[0])

      expect(
        screen.getByPlaceholderText("Write a reply…")
      ).toBeInTheDocument()

      await user.click(screen.getByRole("button", { name: "Cancel" }))

      expect(
        screen.queryByPlaceholderText("Write a reply…")
      ).not.toBeInTheDocument()
    })
  })

  describe("Like/Dislike Buttons", () => {
    it("should display like and dislike counts", async () => {
      render(<CommentSection postId="post-1" />)

      await waitFor(() => {
        expect(screen.getByText("Great article!")).toBeInTheDocument()
      })

      // Alice's comment has 5 likes and 1 dislike
      expect(screen.getByText("5")).toBeInTheDocument()
      expect(screen.getByText("1")).toBeInTheDocument()
    })

    it("should call likeComment when like button is clicked", async () => {
      const user = userEvent.setup()
      mockLikeComment.mockResolvedValue(undefined)
      render(<CommentSection postId="post-1" />)

      await waitFor(() => {
        expect(screen.getByText("Great article!")).toBeInTheDocument()
      })

      const likeButton = screen.getByLabelText("Like comment by Alice")
      await user.click(likeButton)

      expect(mockLikeComment).toHaveBeenCalledWith("c1", expect.any(String))
    })

    it("should call dislikeComment when dislike button is clicked", async () => {
      const user = userEvent.setup()
      mockDislikeComment.mockResolvedValue(undefined)
      render(<CommentSection postId="post-1" />)

      await waitFor(() => {
        expect(screen.getByText("Great article!")).toBeInTheDocument()
      })

      const dislikeButton = screen.getByLabelText("Dislike comment by Alice")
      await user.click(dislikeButton)

      expect(mockDislikeComment).toHaveBeenCalledWith("c1", expect.any(String))
    })
  })

  describe("WebSocket Real-time Updates", () => {
    it("should connect to WebSocket on mount", async () => {
      render(<CommentSection postId="post-1" />)

      expect(WebSocket).toHaveBeenCalledWith("ws://localhost:8089/ws/blog")
    })

    it("should add new comment from WebSocket message", async () => {
      render(<CommentSection postId="post-1" />)

      await waitFor(() => {
        expect(screen.getByText("Great article!")).toBeInTheDocument()
      })

      // Simulate WebSocket message for new comment
      const wsMessage = {
        type: "new_comment",
        data: {
          id: "c5",
          post_id: "post-1",
          parent_id: null,
          author_name: "Eve",
          body: "Hello from WebSocket!",
          like_count: 0,
          dislike_count: 0,
          created_at: new Date().toISOString(),
          replies: [],
        },
      }

      if (mockWs.onmessage) {
        mockWs.onmessage({ data: JSON.stringify(wsMessage) })
      }

      await waitFor(() => {
        expect(screen.getByText("Hello from WebSocket!")).toBeInTheDocument()
      })
    })

    it("should update reaction counts from WebSocket message", async () => {
      render(<CommentSection postId="post-1" />)

      await waitFor(() => {
        expect(screen.getByText("Great article!")).toBeInTheDocument()
      })

      // Simulate reaction update via WebSocket
      const wsMessage = {
        type: "comment_reaction",
        data: {
          comment_id: "c1",
          like_count: 10,
          dislike_count: 3,
        },
      }

      if (mockWs.onmessage) {
        mockWs.onmessage({ data: JSON.stringify(wsMessage) })
      }

      await waitFor(() => {
        // Alice's like count should be 10, dislike should be 3
        const aliceLikeBtn = screen.getByLabelText("Like comment by Alice")
        expect(aliceLikeBtn).toHaveTextContent("10")
        const aliceDislikeBtn = screen.getByLabelText("Dislike comment by Alice")
        expect(aliceDislikeBtn).toHaveTextContent("3")
      })
    })
  })
})

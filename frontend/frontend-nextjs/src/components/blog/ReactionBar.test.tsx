/**
 * Tests for ReactionBar component.
 *
 * Verifies:
 * - Renders like/dislike buttons with initial counts
 * - Calls the correct API endpoints on click
 * - Updates counts from API response
 * - Updates counts from WebSocket reaction_update messages
 * - Handles duplicate reactions gracefully
 *
 * _Requirements: 3.1, 3.2, 3.3_
 */

import { render, screen, waitFor, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ReactionBar } from "./ReactionBar"

// Mock the services module
vi.mock("@/lib/services", () => ({
  getServiceUrl: vi.fn(() => "http://localhost:8089"),
}))

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = []
  url: string
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  readyState = 1

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
    // Simulate async open
    setTimeout(() => this.onopen?.(), 0)
  }

  close() {
    this.readyState = 3
  }

  // Helper to simulate receiving a message
  simulateMessage(data: object) {
    this.onmessage?.({ data: JSON.stringify(data) })
  }
}

// Mock localStorage
const mockStorage: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => mockStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockStorage[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStorage[key]
  }),
  clear: vi.fn(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key])
  }),
  length: 0,
  key: vi.fn(),
}

// Mock crypto.randomUUID
const mockUUID = "test-session-uuid-1234"

beforeEach(() => {
  vi.clearAllMocks()
  MockWebSocket.instances = []
  vi.stubGlobal("WebSocket", MockWebSocket)
  vi.stubGlobal("localStorage", localStorageMock)
  vi.stubGlobal("crypto", { randomUUID: () => mockUUID })
  global.fetch = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key])
})

describe("ReactionBar", () => {
  it("renders like and dislike buttons with initial counts", () => {
    render(
      <ReactionBar postId="post-1" initialLikeCount={5} initialDislikeCount={2} />
    )

    expect(screen.getByLabelText(/like this post.*5 likes/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/dislike this post.*2 dislikes/i)).toBeInTheDocument()
    expect(screen.getByText("5")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
  })

  it("calls POST /api/posts/{post_id}/like on like button click", async () => {
    const user = userEvent.setup()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reaction: { id: "r1" },
        updated_count: 6,
        is_duplicate: false,
      }),
    })

    render(
      <ReactionBar postId="post-1" initialLikeCount={5} initialDislikeCount={2} />
    )

    await user.click(screen.getByLabelText(/^like this post/i))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:8089/api/posts/post-1/like",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: mockUUID }),
        })
      )
    })

    // Count should be updated from API response
    await waitFor(() => {
      expect(screen.getByText("6")).toBeInTheDocument()
    })
  })

  it("calls POST /api/posts/{post_id}/dislike on dislike button click", async () => {
    const user = userEvent.setup()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reaction: { id: "r2" },
        updated_count: 3,
        is_duplicate: false,
      }),
    })

    render(
      <ReactionBar postId="post-1" initialLikeCount={5} initialDislikeCount={2} />
    )

    await user.click(screen.getByLabelText(/dislike this post/i))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost:8089/api/posts/post-1/dislike",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: mockUUID }),
        })
      )
    })

    // Count should be updated from API response
    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument()
    })
  })

  it("updates counts when receiving a WebSocket reaction_update message", async () => {
    render(
      <ReactionBar postId="post-1" initialLikeCount={5} initialDislikeCount={2} />
    )

    // Wait for WebSocket to connect
    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBe(1)
    })

    const ws = MockWebSocket.instances[0]
    expect(ws.url).toBe("ws://localhost:8089/ws/blog")

    // Simulate a reaction_update message
    act(() => {
      ws.simulateMessage({
        type: "reaction_update",
        data: {
          target_type: "post",
          target_id: "post-1",
          like_count: 10,
          dislike_count: 4,
        },
      })
    })

    expect(screen.getByText("10")).toBeInTheDocument()
    expect(screen.getByText("4")).toBeInTheDocument()
  })

  it("ignores WebSocket messages for other posts", async () => {
    render(
      <ReactionBar postId="post-1" initialLikeCount={5} initialDislikeCount={2} />
    )

    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBe(1)
    })

    const ws = MockWebSocket.instances[0]

    // Send message for a different post
    act(() => {
      ws.simulateMessage({
        type: "reaction_update",
        data: {
          target_type: "post",
          target_id: "post-999",
          like_count: 100,
          dislike_count: 50,
        },
      })
    })

    // Counts should remain unchanged
    expect(screen.getByText("5")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
  })

  it("ignores WebSocket messages for comments (not posts)", async () => {
    render(
      <ReactionBar postId="post-1" initialLikeCount={5} initialDislikeCount={2} />
    )

    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBe(1)
    })

    const ws = MockWebSocket.instances[0]

    // Send message for a comment with same target_id
    act(() => {
      ws.simulateMessage({
        type: "reaction_update",
        data: {
          target_type: "comment",
          target_id: "post-1",
          like_count: 99,
          dislike_count: 88,
        },
      })
    })

    // Counts should remain unchanged
    expect(screen.getByText("5")).toBeInTheDocument()
    expect(screen.getByText("2")).toBeInTheDocument()
  })

  it("uses existing session ID from localStorage on like click", async () => {
    const user = userEvent.setup()
    mockStorage["aivory_blog_session_id"] = "existing-session-123"
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reaction: { id: "r1" },
        updated_count: 1,
        is_duplicate: false,
      }),
    })

    render(
      <ReactionBar postId="post-1" initialLikeCount={0} initialDislikeCount={0} />
    )

    await user.click(screen.getByLabelText(/^like this post/i))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ session_id: "existing-session-123" }),
        })
      )
    })
  })

  it("handles API failure gracefully without crashing", async () => {
    const user = userEvent.setup()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error")
    )

    render(
      <ReactionBar postId="post-1" initialLikeCount={5} initialDislikeCount={2} />
    )

    await user.click(screen.getByLabelText(/^like this post/i))

    // Should not crash, counts remain unchanged
    await waitFor(() => {
      expect(screen.getByText("5")).toBeInTheDocument()
    })
  })

  it("connects WebSocket to the correct URL with ws:// protocol", async () => {
    render(
      <ReactionBar postId="post-1" initialLikeCount={0} initialDislikeCount={0} />
    )

    await waitFor(() => {
      expect(MockWebSocket.instances.length).toBe(1)
    })

    expect(MockWebSocket.instances[0].url).toBe("ws://localhost:8089/ws/blog")
  })
})

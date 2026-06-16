// @ts-nocheck
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, act, waitFor } from "@testing-library/react"
import React, { useEffect, useState } from "react"
import {
  BlogWebSocketProvider,
  useBlogWebSocket,
  calculateBackoffDelay,
  BlogWebSocketMessage,
} from "./BlogWebSocketProvider"

// ─── Mock WebSocket ──────────────────────────────────────────────────────────

class MockWebSocket {
  static instances: MockWebSocket[] = []
  url: string
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  readyState: number = 0 // CONNECTING

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  close() {
    this.readyState = 3 // CLOSED
    if (this.onclose) this.onclose()
  }

  // Simulate the server opening the connection
  simulateOpen() {
    this.readyState = 1 // OPEN
    if (this.onopen) this.onopen()
  }

  // Simulate receiving a message from the server
  simulateMessage(data: BlogWebSocketMessage) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) })
    }
  }

  // Simulate connection error
  simulateError() {
    if (this.onerror) this.onerror()
  }
}

// ─── Mock services ───────────────────────────────────────────────────────────

vi.mock("@/lib/services", () => ({
  getServiceUrl: () => "http://localhost:8089",
}))

// ─── Test Helper Component ───────────────────────────────────────────────────

function TestConsumer() {
  const { lastMessage, isConnected, subscribe } = useBlogWebSocket()
  const [reactionMsg, setReactionMsg] = useState<BlogWebSocketMessage | null>(null)

  useEffect(() => {
    const unsubscribe = subscribe("reaction_update", (msg) => {
      setReactionMsg(msg)
    })
    return unsubscribe
  }, [subscribe])

  return (
    <div>
      <span data-testid="connected">{String(isConnected)}</span>
      <span data-testid="last-message">
        {lastMessage ? JSON.stringify(lastMessage) : "none"}
      </span>
      <span data-testid="reaction-msg">
        {reactionMsg ? JSON.stringify(reactionMsg) : "none"}
      </span>
    </div>
  )
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("BlogWebSocketProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    MockWebSocket.instances = []
    ;(global as unknown as { WebSocket: typeof MockWebSocket }).WebSocket = MockWebSocket as unknown as typeof WebSocket
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("connects to the blog WebSocket URL on mount", () => {
    render(
      <BlogWebSocketProvider>
        <TestConsumer />
      </BlogWebSocketProvider>
    )

    expect(MockWebSocket.instances.length).toBe(1)
    expect(MockWebSocket.instances[0].url).toBe("ws://localhost:8089/ws/blog")
  })

  it("sets isConnected to true when WebSocket opens", () => {
    render(
      <BlogWebSocketProvider>
        <TestConsumer />
      </BlogWebSocketProvider>
    )

    expect(screen.getByTestId("connected").textContent).toBe("false")

    act(() => {
      MockWebSocket.instances[0].simulateOpen()
    })

    expect(screen.getByTestId("connected").textContent).toBe("true")
  })

  it("updates lastMessage when a WebSocket message arrives", () => {
    render(
      <BlogWebSocketProvider>
        <TestConsumer />
      </BlogWebSocketProvider>
    )

    act(() => {
      MockWebSocket.instances[0].simulateOpen()
    })

    const message: BlogWebSocketMessage = {
      type: "new_comment",
      payload: { post_id: "abc123", comment: "Hello" },
      timestamp: "2024-01-01T00:00:00Z",
    }

    act(() => {
      MockWebSocket.instances[0].simulateMessage(message)
    })

    expect(screen.getByTestId("last-message").textContent).toBe(JSON.stringify(message))
  })

  it("dispatches messages to type-specific subscribers", () => {
    render(
      <BlogWebSocketProvider>
        <TestConsumer />
      </BlogWebSocketProvider>
    )

    act(() => {
      MockWebSocket.instances[0].simulateOpen()
    })

    const reactionMessage: BlogWebSocketMessage = {
      type: "reaction_update",
      payload: { post_id: "xyz", like_count: 5 },
      timestamp: "2024-01-01T00:00:00Z",
    }

    act(() => {
      MockWebSocket.instances[0].simulateMessage(reactionMessage)
    })

    expect(screen.getByTestId("reaction-msg").textContent).toBe(
      JSON.stringify(reactionMessage)
    )
  })

  it("does not dispatch unrelated message types to subscribers", () => {
    render(
      <BlogWebSocketProvider>
        <TestConsumer />
      </BlogWebSocketProvider>
    )

    act(() => {
      MockWebSocket.instances[0].simulateOpen()
    })

    const commentMessage: BlogWebSocketMessage = {
      type: "new_comment",
      payload: { post_id: "abc" },
      timestamp: "2024-01-01T00:00:00Z",
    }

    act(() => {
      MockWebSocket.instances[0].simulateMessage(commentMessage)
    })

    // The reaction subscriber should NOT have been triggered
    expect(screen.getByTestId("reaction-msg").textContent).toBe("none")
  })

  it("attempts reconnection with exponential backoff on disconnect", () => {
    render(
      <BlogWebSocketProvider>
        <TestConsumer />
      </BlogWebSocketProvider>
    )

    const initialInstance = MockWebSocket.instances[0]

    // Simulate connection open then close
    act(() => {
      initialInstance.simulateOpen()
    })

    act(() => {
      initialInstance.readyState = 3
      if (initialInstance.onclose) initialInstance.onclose()
    })

    expect(screen.getByTestId("connected").textContent).toBe("false")

    // First retry after 1000ms
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(MockWebSocket.instances.length).toBe(2)
  })

  it("stops reconnecting after 5 retries", () => {
    render(
      <BlogWebSocketProvider>
        <TestConsumer />
      </BlogWebSocketProvider>
    )

    // Simulate 5 connect → close cycles
    for (let i = 0; i < MAX_RETRIES_FOR_TEST; i++) {
      const lastInstance = MockWebSocket.instances[MockWebSocket.instances.length - 1]
      act(() => {
        if (lastInstance.onclose) lastInstance.onclose()
      })
      const delay = calculateBackoffDelay(i + 1)
      act(() => {
        vi.advanceTimersByTime(delay)
      })
    }

    const countAfterMaxRetries = MockWebSocket.instances.length

    // Now the 6th close should NOT trigger another reconnect
    const lastInstance = MockWebSocket.instances[MockWebSocket.instances.length - 1]
    act(() => {
      if (lastInstance.onclose) lastInstance.onclose()
    })

    act(() => {
      vi.advanceTimersByTime(100000) // Wait a long time
    })

    expect(MockWebSocket.instances.length).toBe(countAfterMaxRetries)
  })

  it("throws when useBlogWebSocket is used outside of provider", () => {
    // Suppress React error boundary console output
    const spy = vi.spyOn(console, "error").mockImplementation(() => {})

    function BrokenConsumer() {
      useBlogWebSocket()
      return null
    }

    expect(() => render(<BrokenConsumer />)).toThrow(
      "useBlogWebSocket must be used within a BlogWebSocketProvider"
    )

    spy.mockRestore()
  })
})

// ─── calculateBackoffDelay unit tests ────────────────────────────────────────

describe("calculateBackoffDelay", () => {
  it("returns 1000ms for attempt 1", () => {
    expect(calculateBackoffDelay(1)).toBe(1000)
  })

  it("returns 2000ms for attempt 2", () => {
    expect(calculateBackoffDelay(2)).toBe(2000)
  })

  it("returns 4000ms for attempt 3", () => {
    expect(calculateBackoffDelay(3)).toBe(4000)
  })

  it("returns 8000ms for attempt 4", () => {
    expect(calculateBackoffDelay(4)).toBe(8000)
  })

  it("returns 16000ms for attempt 5", () => {
    expect(calculateBackoffDelay(5)).toBe(16000)
  })
})

const MAX_RETRIES_FOR_TEST = 5

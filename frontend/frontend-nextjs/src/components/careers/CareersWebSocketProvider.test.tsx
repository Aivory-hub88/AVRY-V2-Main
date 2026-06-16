import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import React from "react"
import {
  CareersWebSocketProvider,
  useCareersWebSocket,
  computeReconnectDelay,
} from "./CareersWebSocketProvider"

// Mock the services module
vi.mock("@/lib/services", () => ({
  getServiceUrl: () => "http://localhost:8090",
}))

/**
 * Minimal mock WebSocket for unit testing.
 */
class MockWebSocket {
  static instances: MockWebSocket[] = []
  url: string
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  readyState = 0

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
  }

  close() {
    this.readyState = 3
  }

  // Simulate receiving a message
  simulateMessage(data: string) {
    if (this.onmessage) {
      this.onmessage({ data })
    }
  }

  // Simulate open
  simulateOpen() {
    this.readyState = 1
    if (this.onopen) {
      this.onopen()
    }
  }

  // Simulate close
  simulateClose() {
    this.readyState = 3
    if (this.onclose) {
      this.onclose()
    }
  }
}

describe("CareersWebSocketProvider", () => {
  beforeEach(() => {
    MockWebSocket.instances = []
    vi.useFakeTimers()
    // @ts-expect-error - mocking WebSocket globally
    globalThis.WebSocket = MockWebSocket
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe("computeReconnectDelay", () => {
    it("returns 1000ms for attempt 1", () => {
      expect(computeReconnectDelay(1)).toBe(1000)
    })

    it("returns 2000ms for attempt 2", () => {
      expect(computeReconnectDelay(2)).toBe(2000)
    })

    it("returns 4000ms for attempt 3", () => {
      expect(computeReconnectDelay(3)).toBe(4000)
    })

    it("returns 8000ms for attempt 4", () => {
      expect(computeReconnectDelay(4)).toBe(8000)
    })

    it("returns 16000ms for attempt 5", () => {
      expect(computeReconnectDelay(5)).toBe(16000)
    })
  })

  describe("WebSocket connection", () => {
    it("connects to the correct WebSocket URL", () => {
      function TestConsumer() {
        const { lastMessage } = useCareersWebSocket()
        return <div data-testid="msg">{lastMessage ? lastMessage.type : "none"}</div>
      }

      render(
        <CareersWebSocketProvider>
          <TestConsumer />
        </CareersWebSocketProvider>
      )

      expect(MockWebSocket.instances.length).toBe(1)
      expect(MockWebSocket.instances[0].url).toBe("ws://localhost:8090/ws/careers")
    })

    it("provides lastMessage as null initially", () => {
      function TestConsumer() {
        const { lastMessage } = useCareersWebSocket()
        return <div data-testid="msg">{lastMessage === null ? "null" : "not-null"}</div>
      }

      render(
        <CareersWebSocketProvider>
          <TestConsumer />
        </CareersWebSocketProvider>
      )

      expect(screen.getByTestId("msg").textContent).toBe("null")
    })

    it("updates lastMessage when a valid message is received", () => {
      function TestConsumer() {
        const { lastMessage } = useCareersWebSocket()
        return <div data-testid="msg">{lastMessage ? lastMessage.type : "none"}</div>
      }

      render(
        <CareersWebSocketProvider>
          <TestConsumer />
        </CareersWebSocketProvider>
      )

      const ws = MockWebSocket.instances[0]
      act(() => {
        ws.simulateOpen()
      })

      act(() => {
        ws.simulateMessage(
          JSON.stringify({ type: "vacancy_published", data: { id: "123" } })
        )
      })

      expect(screen.getByTestId("msg").textContent).toBe("vacancy_published")
    })

    it("ignores non-JSON messages", () => {
      function TestConsumer() {
        const { lastMessage } = useCareersWebSocket()
        return <div data-testid="msg">{lastMessage ? lastMessage.type : "none"}</div>
      }

      render(
        <CareersWebSocketProvider>
          <TestConsumer />
        </CareersWebSocketProvider>
      )

      const ws = MockWebSocket.instances[0]
      act(() => {
        ws.simulateOpen()
        ws.simulateMessage("not json")
      })

      expect(screen.getByTestId("msg").textContent).toBe("none")
    })

    it("attempts reconnection with exponential backoff on close", () => {
      function TestConsumer() {
        const { lastMessage } = useCareersWebSocket()
        return <div data-testid="msg">{lastMessage ? lastMessage.type : "none"}</div>
      }

      render(
        <CareersWebSocketProvider>
          <TestConsumer />
        </CareersWebSocketProvider>
      )

      expect(MockWebSocket.instances.length).toBe(1)

      // Simulate connection close
      const ws = MockWebSocket.instances[0]
      act(() => {
        ws.simulateClose()
      })

      // After 1000ms (attempt 1), should reconnect
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      expect(MockWebSocket.instances.length).toBe(2)
    })

    it("stops reconnecting after 5 retries", () => {
      function TestConsumer() {
        const { lastMessage } = useCareersWebSocket()
        return <div data-testid="msg">{lastMessage ? lastMessage.type : "none"}</div>
      }

      render(
        <CareersWebSocketProvider>
          <TestConsumer />
        </CareersWebSocketProvider>
      )

      // Simulate 5 failed reconnection attempts
      for (let i = 0; i < 5; i++) {
        const ws = MockWebSocket.instances[MockWebSocket.instances.length - 1]
        act(() => {
          ws.simulateClose()
        })
        const delay = computeReconnectDelay(i + 1)
        act(() => {
          vi.advanceTimersByTime(delay)
        })
      }

      // After 5 retries we should have: 1 initial + 5 reconnects = 6 instances
      expect(MockWebSocket.instances.length).toBe(6)

      // Now the 6th one closes — should NOT create a 7th instance
      const lastWs = MockWebSocket.instances[MockWebSocket.instances.length - 1]
      act(() => {
        lastWs.simulateClose()
      })
      act(() => {
        vi.advanceTimersByTime(32000) // Well beyond any possible delay
      })

      expect(MockWebSocket.instances.length).toBe(6)
    })

    it("resets retry count on successful connection", () => {
      function TestConsumer() {
        const { lastMessage } = useCareersWebSocket()
        return <div data-testid="msg">{lastMessage ? lastMessage.type : "none"}</div>
      }

      render(
        <CareersWebSocketProvider>
          <TestConsumer />
        </CareersWebSocketProvider>
      )

      // Close the first connection
      const ws1 = MockWebSocket.instances[0]
      act(() => {
        ws1.simulateClose()
      })

      // Wait for reconnect (attempt 1)
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      expect(MockWebSocket.instances.length).toBe(2)

      // Simulate successful open on the new connection
      const ws2 = MockWebSocket.instances[1]
      act(() => {
        ws2.simulateOpen()
      })

      // Close again — should start fresh from attempt 1 (delay 1000ms)
      act(() => {
        ws2.simulateClose()
      })
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(MockWebSocket.instances.length).toBe(3)
    })
  })

  describe("useCareersWebSocket hook", () => {
    it("throws when used outside provider", () => {
      function BadConsumer() {
        useCareersWebSocket()
        return null
      }

      expect(() => render(<BadConsumer />)).toThrow(
        "useCareersWebSocket must be used within a CareersWebSocketProvider"
      )
    })
  })
})

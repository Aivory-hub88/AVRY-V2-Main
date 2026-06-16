"use client"

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react"
import { getServiceUrl } from "@/lib/services"

// ─── Message Types ───────────────────────────────────────────────────────────

export type BlogMessageType =
  | "post_published"
  | "post_hidden"
  | "post_edited"
  | "new_comment"
  | "reaction_update"

export interface BlogWebSocketMessage {
  type: BlogMessageType
  payload: Record<string, unknown>
  timestamp: string
}

// ─── Context Interface ───────────────────────────────────────────────────────

interface BlogWebSocketContextValue {
  /** The most recent WebSocket message received from the server. */
  lastMessage: BlogWebSocketMessage | null
  /** Whether the WebSocket connection is currently open. */
  isConnected: boolean
  /**
   * Subscribe to a specific message type.
   * Returns an unsubscribe function.
   */
  subscribe: (
    type: BlogMessageType,
    callback: (message: BlogWebSocketMessage) => void
  ) => () => void
}

const BlogWebSocketContext = createContext<BlogWebSocketContextValue | null>(null)

// ─── Constants ───────────────────────────────────────────────────────────────

const BASE_DELAY_MS = 1000
const MAX_RETRIES = 5

/**
 * Calculate the reconnection delay using exponential backoff.
 * Formula: base_delay * 2^(attempt - 1)
 * @param attempt - The retry attempt number (1-indexed, 1..5)
 */
export function calculateBackoffDelay(attempt: number): number {
  return BASE_DELAY_MS * Math.pow(2, attempt - 1)
}

// ─── Provider Component ──────────────────────────────────────────────────────

interface BlogWebSocketProviderProps {
  children: ReactNode
}

export function BlogWebSocketProvider({ children }: BlogWebSocketProviderProps) {
  const [lastMessage, setLastMessage] = useState<BlogWebSocketMessage | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const retriesRef = useRef(0)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const subscribersRef = useRef<Map<BlogMessageType, Set<(msg: BlogWebSocketMessage) => void>>>(
    new Map()
  )
  const mountedRef = useRef(true)

  const getWsUrl = useCallback((): string => {
    const httpUrl = getServiceUrl("blog")
    const wsUrl = httpUrl.replace(/^http/, "ws")
    return `${wsUrl}/ws/blog`
  }, [])

  const notifySubscribers = useCallback((message: BlogWebSocketMessage) => {
    const handlers = subscribersRef.current.get(message.type)
    if (handlers) {
      handlers.forEach((cb) => cb(message))
    }
  }, [])

  const connect = useCallback(() => {
    if (!mountedRef.current) return

    const url = getWsUrl()
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => {
      if (!mountedRef.current) return
      setIsConnected(true)
      retriesRef.current = 0
    }

    ws.onmessage = (event: MessageEvent) => {
      if (!mountedRef.current) return
      try {
        const message: BlogWebSocketMessage = JSON.parse(event.data)
        setLastMessage(message)
        notifySubscribers(message)
      } catch {
        // Ignore non-JSON messages (e.g., pings)
      }
    }

    ws.onclose = () => {
      if (!mountedRef.current) return
      setIsConnected(false)
      scheduleReconnect()
    }

    ws.onerror = () => {
      if (!mountedRef.current) return
      // Close will fire after error, triggering reconnect
      ws.close()
    }
  }, [getWsUrl, notifySubscribers])

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current) return

    retriesRef.current += 1
    if (retriesRef.current > MAX_RETRIES) {
      // Stop retrying after 5 attempts
      return
    }

    const delay = calculateBackoffDelay(retriesRef.current)
    reconnectTimerRef.current = setTimeout(() => {
      if (mountedRef.current) {
        connect()
      }
    }, delay)
  }, [connect])

  const subscribe = useCallback(
    (type: BlogMessageType, callback: (message: BlogWebSocketMessage) => void): (() => void) => {
      if (!subscribersRef.current.has(type)) {
        subscribersRef.current.set(type, new Set())
      }
      subscribersRef.current.get(type)!.add(callback)

      return () => {
        const handlers = subscribersRef.current.get(type)
        if (handlers) {
          handlers.delete(callback)
          if (handlers.size === 0) {
            subscribersRef.current.delete(type)
          }
        }
      }
    },
    []
  )

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connect])

  const value: BlogWebSocketContextValue = {
    lastMessage,
    isConnected,
    subscribe,
  }

  return (
    <BlogWebSocketContext.Provider value={value}>
      {children}
    </BlogWebSocketContext.Provider>
  )
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Hook to access blog WebSocket messages.
 *
 * Returns the latest message and connection state.
 * Optionally subscribe to specific message types with a callback.
 *
 * @example
 * ```tsx
 * const { lastMessage, isConnected, subscribe } = useBlogWebSocket()
 *
 * useEffect(() => {
 *   const unsubscribe = subscribe("reaction_update", (msg) => {
 *     // Handle reaction update
 *   })
 *   return unsubscribe
 * }, [subscribe])
 * ```
 */
export function useBlogWebSocket(): BlogWebSocketContextValue {
  const context = useContext(BlogWebSocketContext)
  if (!context) {
    throw new Error("useBlogWebSocket must be used within a BlogWebSocketProvider")
  }
  return context
}

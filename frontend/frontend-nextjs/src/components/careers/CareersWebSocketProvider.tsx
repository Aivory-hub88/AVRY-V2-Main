"use client"

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react"
import { getServiceUrl } from "@/lib/services"

/**
 * WebSocket message types broadcast by the avry-careers service
 * when vacancies are published, closed, or edited.
 */
export type CareersMessageType = "vacancy_published" | "vacancy_closed" | "vacancy_edited"

/**
 * Shape of a message received from the careers WebSocket channel.
 */
export interface CareersWebSocketMessage {
  type: CareersMessageType
  data: Record<string, unknown>
  timestamp?: string
}

interface CareersWebSocketContextValue {
  /** The latest message received from the WebSocket, or null if none yet. */
  lastMessage: CareersWebSocketMessage | null
}

const CareersWebSocketContext = createContext<CareersWebSocketContextValue | undefined>(undefined)

/** Base delay in milliseconds for exponential backoff. */
const BASE_DELAY = 1000

/** Maximum number of reconnection attempts before giving up. */
const MAX_RETRIES = 5

/**
 * Compute the reconnection delay using exponential backoff.
 * Formula: base_delay * 2^(attempt - 1)
 * @param attempt - The retry attempt number (1-indexed)
 * @returns Delay in milliseconds
 */
export function computeReconnectDelay(attempt: number): number {
  return BASE_DELAY * Math.pow(2, attempt - 1)
}

/**
 * Derives the WebSocket URL from the careers service HTTP URL.
 * Replaces http:// or https:// with ws:// or wss:// respectively.
 */
function getWebSocketUrl(): string {
  const httpUrl = getServiceUrl("careers")
  const wsUrl = httpUrl.replace(/^http/, "ws")
  return `${wsUrl}/ws/careers`
}

interface CareersWebSocketProviderProps {
  children: ReactNode
}

/**
 * CareersWebSocketProvider
 *
 * Establishes a WebSocket connection to the avry-careers service at
 * ws://{careers_service_url}/ws/careers. Provides real-time vacancy
 * updates (published, closed, edited) to child components via React Context.
 *
 * Reconnects with exponential backoff (base_delay * 2^(N-1)) for up to 5 retries
 * when the connection is lost.
 */
export function CareersWebSocketProvider({ children }: CareersWebSocketProviderProps) {
  const [lastMessage, setLastMessage] = useState<CareersWebSocketMessage | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const retryCountRef = useRef(0)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmountedRef = useRef(false)

  useEffect(() => {
    unmountedRef.current = false

    function connect() {
      if (unmountedRef.current) return

      const url = getWebSocketUrl()

      try {
        const ws = new WebSocket(url)
        wsRef.current = ws

        ws.onopen = () => {
          // Reset retry counter on successful connection
          retryCountRef.current = 0
        }

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as CareersWebSocketMessage
            if (message && message.type) {
              setLastMessage(message)
            }
          } catch {
            // Ignore non-JSON messages (e.g., pings)
          }
        }

        ws.onclose = () => {
          wsRef.current = null
          attemptReconnect()
        }

        ws.onerror = () => {
          // onclose will fire after onerror, which triggers reconnection
          ws.close()
        }
      } catch {
        // Connection failed immediately, attempt reconnect
        attemptReconnect()
      }
    }

    function attemptReconnect() {
      if (unmountedRef.current) return

      retryCountRef.current += 1
      if (retryCountRef.current > MAX_RETRIES) {
        // Stop retrying after max retries
        return
      }

      const delay = computeReconnectDelay(retryCountRef.current)
      retryTimeoutRef.current = setTimeout(() => {
        if (!unmountedRef.current) {
          connect()
        }
      }, delay)
    }

    connect()

    return () => {
      unmountedRef.current = true
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [])

  return (
    <CareersWebSocketContext.Provider value={{ lastMessage }}>
      {children}
    </CareersWebSocketContext.Provider>
  )
}

/**
 * Hook to access the latest message from the careers WebSocket channel.
 * Must be used within a CareersWebSocketProvider.
 *
 * @returns Object containing the latest WebSocket message (or null if none received yet)
 */
export function useCareersWebSocket(): CareersWebSocketContextValue {
  const context = useContext(CareersWebSocketContext)
  if (context === undefined) {
    throw new Error("useCareersWebSocket must be used within a CareersWebSocketProvider")
  }
  return context
}

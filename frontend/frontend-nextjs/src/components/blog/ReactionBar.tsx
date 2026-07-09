"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { getServiceUrl } from "@/lib/services"

/**
 * Get or create a persistent session ID for tracking reactions.
 * Stored in localStorage so it survives page refreshes.
 */
function getSessionId(): string {
  const STORAGE_KEY = "aivory_blog_session_id"

  if (typeof window === "undefined") {
    return "ssr-placeholder"
  }

  let sessionId = localStorage.getItem(STORAGE_KEY)
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, sessionId)
  }
  return sessionId
}

export interface ReactionBarProps {
  postId: string
  initialLikeCount: number
  initialDislikeCount: number
}

interface ReactionUpdateMessage {
  type: "reaction_update"
  data: {
    target_type: string
    target_id: string
    like_count: number
    dislike_count: number
  }
}

/**
 * ReactionBar component
 *
 * Displays like/dislike buttons with live counts for a blog post.
 * Calls the blog service API on click and listens for WebSocket
 * `reaction_update` messages to update counts in real time.
 */
export function ReactionBar({
  postId,
  initialLikeCount,
  initialDislikeCount,
}: ReactionBarProps) {
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [dislikeCount, setDislikeCount] = useState(initialDislikeCount)
  const [likeLoading, setLikeLoading] = useState(false)
  const [dislikeLoading, setDislikeLoading] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const retryCountRef = useRef(0)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const MAX_RETRIES = 5
  const BASE_DELAY = 1000

  const connectWebSocket = useCallback(() => {
    const blogUrl = getServiceUrl("blog")
    const wsUrl = blogUrl.replace(/^http/, "ws") + "/ws/blog"

    try {
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        retryCountRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as ReactionUpdateMessage
          if (
            message.type === "reaction_update" &&
            message.data.target_id === postId &&
            message.data.target_type === "post"
          ) {
            setLikeCount(message.data.like_count)
            setDislikeCount(message.data.dislike_count)
          }
        } catch {
          // Ignore non-JSON or irrelevant messages (e.g., pings)
        }
      }

      ws.onclose = () => {
        wsRef.current = null
        if (retryCountRef.current < MAX_RETRIES) {
          const delay = BASE_DELAY * Math.pow(2, retryCountRef.current)
          retryCountRef.current += 1
          retryTimeoutRef.current = setTimeout(connectWebSocket, delay)
        }
      }

      ws.onerror = () => {
        // onclose will fire after onerror, retry logic handled there
      }

      wsRef.current = ws
    } catch {
      // Connection failed, onclose logic handles retry
    }
  }, [postId])

  useEffect(() => {
    connectWebSocket()

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [connectWebSocket])

  // Sync initial counts when props change (e.g. parent re-fetches)
  useEffect(() => {
    setLikeCount(initialLikeCount)
  }, [initialLikeCount])

  useEffect(() => {
    setDislikeCount(initialDislikeCount)
  }, [initialDislikeCount])

  const handleLike = async () => {
    if (likeLoading) return
    setLikeLoading(true)

    try {
      const blogUrl = getServiceUrl("blog")
      const response = await fetch(`${blogUrl}/api/posts/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: getSessionId() }),
      })

      if (response.ok) {
        const data = await response.json()
        setLikeCount(data.updated_count)
      }
    } catch {
      // Silently fail - WebSocket will sync counts if available
    } finally {
      setLikeLoading(false)
    }
  }

  const handleDislike = async () => {
    if (dislikeLoading) return
    setDislikeLoading(true)

    try {
      const blogUrl = getServiceUrl("blog")
      const response = await fetch(`${blogUrl}/api/posts/${postId}/dislike`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: getSessionId() }),
      })

      if (response.ok) {
        const data = await response.json()
        setDislikeCount(data.updated_count)
      }
    } catch {
      // Silently fail - WebSocket will sync counts if available
    } finally {
      setDislikeLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      {/* Like button */}
      <button
        onClick={handleLike}
        disabled={likeLoading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 hover:border-[#c4c9b8]/40 hover:bg-white/[0.04] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
        aria-label={`Like this post (${likeCount} likes)`}
      >
        <svg
          className="w-4 h-4 text-gray-200 group-hover:text-[#dfe2d8] transition-colors"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zm-9 11H3a2 2 0 01-2-2v-7a2 2 0 012-2h2"
          />
        </svg>
        <span className="text-sm text-gray-100 tabular-nums">{likeCount}</span>
      </button>

      {/* Dislike button */}
      <button
        onClick={handleDislike}
        disabled={dislikeLoading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 hover:border-red-500/40 hover:bg-white/[0.04] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
        aria-label={`Dislike this post (${dislikeCount} dislikes)`}
      >
        <svg
          className="w-4 h-4 text-gray-200 group-hover:text-red-400 transition-colors"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 15V19a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10zm9-13h2a2 2 0 012 2v7a2 2 0 01-2 2h-2"
          />
        </svg>
        <span className="text-sm text-gray-100 tabular-nums">{dislikeCount}</span>
      </button>
    </div>
  )
}

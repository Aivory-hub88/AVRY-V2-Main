"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  BlogComment,
  getPostComments,
  createComment,
  createReply,
  likeComment,
  dislikeComment,
} from "@/lib/blog-api"
import { getServiceUrl } from "@/lib/services"

// ---------------------------------------------------------------------------
// Session ID helper — generates a persistent anonymous session identifier
// ---------------------------------------------------------------------------
function getSessionId(): string {
  if (typeof window === "undefined") return "ssr"
  const key = "aivory_blog_session_id"
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

// ---------------------------------------------------------------------------
// Date formatting helper
// ---------------------------------------------------------------------------
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 7) {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return "just now"
}

// ---------------------------------------------------------------------------
// CommentForm
// ---------------------------------------------------------------------------
interface CommentFormProps {
  onSubmit: (authorName: string, body: string) => Promise<void>
  placeholder?: string
  submitLabel?: string
  onCancel?: () => void
  compact?: boolean
}

function CommentForm({
  onSubmit,
  placeholder = "Write a comment…",
  submitLabel = "Post Comment",
  onCancel,
  compact = false,
}: CommentFormProps) {
  const [authorName, setAuthorName] = useState("")
  const [body, setBody] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authorName.trim() || !body.trim()) return

    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(authorName.trim(), body.trim())
      setBody("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input
        type="text"
        value={authorName}
        onChange={(e) => setAuthorName(e.target.value)}
        placeholder="Your name"
        required
        aria-label="Author name"
        className={`w-full px-3 ${compact ? "py-2 text-sm" : "py-2.5"} rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#c4c9b8]/50 transition-colors`}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        required
        rows={compact ? 2 : 3}
        aria-label="Comment body"
        className={`w-full px-3 ${compact ? "py-2 text-sm" : "py-2.5"} rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#c4c9b8]/50 transition-colors resize-none`}
      />
      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting || !authorName.trim() || !body.trim()}
          className={`${compact ? "px-3 py-1.5 text-sm" : "px-4 py-2"} rounded-lg bg-[#c4c9b8] text-[#050505] font-semibold hover:bg-[#b2b8a6] transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {submitting ? "Posting…" : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className={`${compact ? "px-3 py-1.5 text-sm" : "px-4 py-2"} rounded-lg text-gray-200 hover:text-white hover:bg-white/5 transition-colors`}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}


// ---------------------------------------------------------------------------
// SingleComment — renders a single comment with like/dislike and reply support
// ---------------------------------------------------------------------------
interface SingleCommentProps {
  comment: BlogComment
  postId: string
  onNewReply: (parentId: string, reply: BlogComment) => void
  onReactionUpdate: (commentId: string, likeCount: number, dislikeCount: number) => void
}

function SingleComment({ comment, postId, onNewReply, onReactionUpdate }: SingleCommentProps) {
  const [showReplyForm, setShowReplyForm] = useState(false)
  const sessionId = useRef(getSessionId())

  const handleReply = async (authorName: string, body: string) => {
    const reply = await createReply(comment.id, authorName, body)
    onNewReply(comment.id, reply)
    setShowReplyForm(false)
  }

  const handleLike = async () => {
    try {
      await likeComment(comment.id, sessionId.current)
      onReactionUpdate(comment.id, comment.like_count + 1, comment.dislike_count)
    } catch {
      // Silently ignore duplicate reaction errors
    }
  }

  const handleDislike = async () => {
    try {
      await dislikeComment(comment.id, sessionId.current)
      onReactionUpdate(comment.id, comment.like_count, comment.dislike_count + 1)
    } catch {
      // Silently ignore duplicate reaction errors
    }
  }

  return (
    <div className="group">
      <div className="flex gap-3">
        {/* Avatar circle */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold text-white/85">
          {comment.author_name.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-sm font-medium text-white">
              {comment.author_name}
            </span>
            <time
              dateTime={comment.created_at}
              className="text-xs text-gray-300"
            >
              {formatRelativeTime(comment.created_at)}
            </time>
          </div>

          {/* Body */}
          <p className="text-sm text-gray-100 whitespace-pre-wrap break-words">
            {comment.body}
          </p>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={handleLike}
              className="flex items-center gap-1 text-xs text-gray-300 hover:text-[#dfe2d8] transition-colors"
              aria-label={`Like comment by ${comment.author_name}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
              </svg>
              <span>{comment.like_count}</span>
            </button>

            <button
              onClick={handleDislike}
              className="flex items-center gap-1 text-xs text-gray-300 hover:text-red-400 transition-colors"
              aria-label={`Dislike comment by ${comment.author_name}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z" />
              </svg>
              <span>{comment.dislike_count}</span>
            </button>

            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="text-xs text-gray-300 hover:text-white transition-colors"
            >
              Reply
            </button>
          </div>

          {/* Reply form */}
          {showReplyForm && (
            <div className="mt-3">
              <CommentForm
                onSubmit={handleReply}
                placeholder="Write a reply…"
                submitLabel="Reply"
                onCancel={() => setShowReplyForm(false)}
                compact
              />
            </div>
          )}

          {/* Nested replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 pl-4 border-l border-white/10 space-y-4">
              {comment.replies.map((reply) => (
                <SingleComment
                  key={reply.id}
                  comment={reply}
                  postId={postId}
                  onNewReply={onNewReply}
                  onReactionUpdate={onReactionUpdate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// CommentSection — main exported component
// ---------------------------------------------------------------------------
interface CommentSectionProps {
  postId: string
}

export function CommentSection({ postId }: CommentSectionProps) {
  const [comments, setComments] = useState<BlogComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  // Fetch initial comments
  const fetchComments = useCallback(async () => {
    try {
      const data = await getPostComments(postId)
      setComments(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load comments")
    } finally {
      setLoading(false)
    }
  }, [postId])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  // WebSocket connection for real-time updates
  useEffect(() => {
    const blogUrl = getServiceUrl("blog")
    const wsUrl = blogUrl.replace(/^http/, "ws") + "/ws/blog"

    let reconnectAttempts = 0
    const maxRetries = 5
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null

    function connect() {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        reconnectAttempts = 0
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          handleWsMessage(message)
        } catch {
          // Ignore malformed messages
        }
      }

      ws.onclose = () => {
        if (reconnectAttempts < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 16000)
          reconnectAttempts++
          reconnectTimer = setTimeout(connect, delay)
        }
      }

      ws.onerror = () => {
        ws.close()
      }
    }

    connect()

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
      }
    }
  }, [postId])

  // Handle incoming WebSocket messages
  const handleWsMessage = useCallback(
    (message: { type: string; data: Record<string, unknown> }) => {
      switch (message.type) {
        case "new_comment": {
          const newComment = message.data as unknown as BlogComment
          if (newComment.post_id === postId && !newComment.parent_id) {
            setComments((prev) => {
              // Avoid duplicates
              if (prev.some((c) => c.id === newComment.id)) return prev
              return [{ ...newComment, replies: newComment.replies || [] }, ...prev]
            })
          }
          break
        }
        case "new_reply": {
          const reply = message.data as unknown as BlogComment
          if (reply.post_id === postId && reply.parent_id) {
            setComments((prev) => addReplyToTree(prev, reply.parent_id!, reply))
          }
          break
        }
        case "comment_reaction": {
          const { comment_id, like_count, dislike_count } = message.data as {
            comment_id: string
            like_count: number
            dislike_count: number
          }
          setComments((prev) =>
            updateReactionInTree(prev, comment_id, like_count, dislike_count)
          )
          break
        }
      }
    },
    [postId]
  )

  // Handle new top-level comment submission
  const handleNewComment = async (authorName: string, body: string) => {
    const comment = await createComment(postId, authorName, body)
    setComments((prev) => {
      if (prev.some((c) => c.id === comment.id)) return prev
      return [{ ...comment, replies: comment.replies || [] }, ...prev]
    })
  }

  // Handle reply added locally
  const handleNewReply = (parentId: string, reply: BlogComment) => {
    setComments((prev) => addReplyToTree(prev, parentId, reply))
  }

  // Handle reaction update locally
  const handleReactionUpdate = (
    commentId: string,
    likeCount: number,
    dislikeCount: number
  ) => {
    setComments((prev) =>
      updateReactionInTree(prev, commentId, likeCount, dislikeCount)
    )
  }

  return (
    <section aria-label="Comments" className="mt-10">
      <h2 className="text-xl font-semibold text-white mb-6">
        Comments{" "}
        <span className="text-gray-300 font-normal text-base">
          ({countAllComments(comments)})
        </span>
      </h2>

      {/* New comment form */}
      <div className="mb-8 p-4 rounded-xl border border-white/10 bg-white/[0.02]">
        <CommentForm
          onSubmit={handleNewComment}
          placeholder="Share your thoughts…"
          submitLabel="Post Comment"
        />
      </div>

      {/* Comments list */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-white/10 rounded w-24" />
                <div className="h-4 bg-white/5 rounded w-full" />
                <div className="h-4 bg-white/5 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <button
            onClick={fetchComments}
            className="text-sm text-[#dfe2d8] hover:underline"
          >
            Try again
          </button>
        </div>
      ) : comments.length === 0 ? (
        <p className="text-gray-300 text-sm text-center py-8">
          No comments yet. Be the first to share your thoughts!
        </p>
      ) : (
        <div className="space-y-6">
          {comments.map((comment) => (
            <SingleComment
              key={comment.id}
              comment={comment}
              postId={postId}
              onNewReply={handleNewReply}
              onReactionUpdate={handleReactionUpdate}
            />
          ))}
        </div>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Tree helpers
// ---------------------------------------------------------------------------

/** Recursively add a reply into the correct parent within the tree. */
function addReplyToTree(
  comments: BlogComment[],
  parentId: string,
  reply: BlogComment
): BlogComment[] {
  return comments.map((c) => {
    if (c.id === parentId) {
      const exists = c.replies?.some((r) => r.id === reply.id)
      if (exists) return c
      return {
        ...c,
        replies: [...(c.replies || []), { ...reply, replies: reply.replies || [] }],
      }
    }
    if (c.replies && c.replies.length > 0) {
      return { ...c, replies: addReplyToTree(c.replies, parentId, reply) }
    }
    return c
  })
}

/** Recursively update like/dislike counts for a comment in the tree. */
function updateReactionInTree(
  comments: BlogComment[],
  commentId: string,
  likeCount: number,
  dislikeCount: number
): BlogComment[] {
  return comments.map((c) => {
    if (c.id === commentId) {
      return { ...c, like_count: likeCount, dislike_count: dislikeCount }
    }
    if (c.replies && c.replies.length > 0) {
      return {
        ...c,
        replies: updateReactionInTree(c.replies, commentId, likeCount, dislikeCount),
      }
    }
    return c
  })
}

/** Count all comments and replies in the tree. */
function countAllComments(comments: BlogComment[]): number {
  return comments.reduce(
    (sum, c) => sum + 1 + countAllComments(c.replies || []),
    0
  )
}

export default CommentSection

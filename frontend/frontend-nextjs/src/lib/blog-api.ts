/**
 * Blog API Client
 *
 * Handles communication with the avry-blog microservice (port 8089).
 * Public endpoints do not require authentication.
 */

import { getServiceUrl } from "./services";

/** A single blog post as returned by the listing endpoint. */
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  author_name: string;
  thumbnail_url: string | null;
  published_at: string;
  like_count: number;
  dislike_count: number;
  comment_count: number;
}

/** Paginated response from GET /api/posts. */
export interface BlogPostsResponse {
  posts: BlogPost[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

/** Rich Editor block within a blog post body. */
export interface BlogContentBlock {
  type: string;
  text?: string;
  level?: number;
  language?: string;
  url?: string;
  alt?: string;
  href?: string;
  items?: string[];
  style?: string;
}

/** Full blog post detail as returned by GET /api/posts/{slug}. */
export interface BlogPostDetail {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: { blocks: BlogContentBlock[] };
  author_name: string;
  thumbnail_url: string | null;
  published_at: string;
  like_count: number;
  dislike_count: number;
  comment_count: number;
  redacted_sections: number[];
}

/**
 * Fetch paginated published blog posts from the blog service.
 * @param page - Page number (1-indexed)
 * @param limit - Number of posts per page
 */
export async function getBlogPosts(
  page: number = 1,
  limit: number = 9
): Promise<BlogPostsResponse> {
  const baseUrl = getServiceUrl("blog");
  const url = `${baseUrl}/api/posts?page=${page}&limit=${limit}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch blog posts: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Fetch a single blog post by slug.
 * Returns null if the post does not exist or is not published (404).
 * @param slug - The URL slug of the post
 */
export async function getBlogPost(
  slug: string
): Promise<BlogPostDetail | null> {
  const baseUrl = getServiceUrl("blog");
  const url = `${baseUrl}/api/posts/${encodeURIComponent(slug)}`;

  const response = await fetch(url);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch blog post: ${response.statusText}`);
  }

  return response.json();
}

/** A single comment as returned by the comments endpoint. */
export interface BlogComment {
  id: string;
  post_id: string;
  parent_id: string | null;
  author_name: string;
  body: string;
  like_count: number;
  dislike_count: number;
  created_at: string;
  replies: BlogComment[];
}

/**
 * Fetch threaded comments for a blog post.
 * @param postId - The UUID of the post
 */
export async function getPostComments(postId: string): Promise<BlogComment[]> {
  const baseUrl = getServiceUrl("blog");
  const url = `${baseUrl}/api/posts/${encodeURIComponent(postId)}/comments`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch comments: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Submit a new comment on a blog post.
 * @param postId - The UUID of the post
 * @param authorName - Display name of the commenter
 * @param body - Comment text content
 */
export async function createComment(
  postId: string,
  authorName: string,
  body: string
): Promise<BlogComment> {
  const baseUrl = getServiceUrl("blog");
  const url = `${baseUrl}/api/posts/${encodeURIComponent(postId)}/comments`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ author_name: authorName, body }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create comment: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Submit a reply to an existing comment.
 * @param commentId - The UUID of the parent comment
 * @param authorName - Display name of the replier
 * @param body - Reply text content
 */
export async function createReply(
  commentId: string,
  authorName: string,
  body: string
): Promise<BlogComment> {
  const baseUrl = getServiceUrl("blog");
  const url = `${baseUrl}/api/comments/${encodeURIComponent(commentId)}/reply`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ author_name: authorName, body }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create reply: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Like a comment.
 * @param commentId - The UUID of the comment
 * @param sessionId - Unique session identifier to prevent duplicate reactions
 */
export async function likeComment(
  commentId: string,
  sessionId: string
): Promise<void> {
  const baseUrl = getServiceUrl("blog");
  const url = `${baseUrl}/api/comments/${encodeURIComponent(commentId)}/like`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to like comment: ${response.statusText}`);
  }
}

/**
 * Dislike a comment.
 * @param commentId - The UUID of the comment
 * @param sessionId - Unique session identifier to prevent duplicate reactions
 */
export async function dislikeComment(
  commentId: string,
  sessionId: string
): Promise<void> {
  const baseUrl = getServiceUrl("blog");
  const url = `${baseUrl}/api/comments/${encodeURIComponent(commentId)}/dislike`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to dislike comment: ${response.statusText}`);
  }
}

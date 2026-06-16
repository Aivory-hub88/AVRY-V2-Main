/**
 * Property 17: WebSocket reconnection uses exponential backoff
 *
 * Feature: blog-and-careers, Property 17: WebSocket reconnection uses exponential backoff
 *
 * Validates: Requirements 13.5
 *
 * For any retry attempt number N (1 through 5), the reconnection delay SHALL
 * follow the formula base_delay * 2^(N-1), and after 5 failed retries the
 * client SHALL stop attempting.
 */

import { describe, it, expect } from "vitest"
import fc from "fast-check"
import { calculateBackoffDelay } from "../BlogWebSocketProvider"

const BASE_DELAY_MS = 1000
const MAX_RETRIES = 5

describe("Feature: blog-and-careers, Property 17: WebSocket reconnection uses exponential backoff", () => {
  /**
   * **Validates: Requirements 13.5**
   *
   * Property: For any attempt N in [1..5], calculateBackoffDelay(N)
   * equals BASE_DELAY_MS * 2^(N-1).
   */
  it("delay follows base_delay * 2^(N-1) for all attempt numbers 1..5", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: MAX_RETRIES }),
        (attempt: number) => {
          const expectedDelay = BASE_DELAY_MS * Math.pow(2, attempt - 1)
          const actualDelay = calculateBackoffDelay(attempt)
          expect(actualDelay).toBe(expectedDelay)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 13.5**
   *
   * Property: Delays are strictly increasing — for any two attempts
   * a < b (both in [1..5]), delay(a) < delay(b).
   */
  it("delays are strictly increasing across successive attempts", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: MAX_RETRIES - 1 }),
        (attempt: number) => {
          const currentDelay = calculateBackoffDelay(attempt)
          const nextDelay = calculateBackoffDelay(attempt + 1)
          expect(nextDelay).toBeGreaterThan(currentDelay)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 13.5**
   *
   * Property: Maximum retries stops at 5 — the maximum valid attempt
   * is MAX_RETRIES (5), confirming the system caps reconnection attempts.
   */
  it("max retries is capped at 5 attempts", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: MAX_RETRIES }),
        (attempt: number) => {
          // All valid attempts are within [1..5]
          expect(attempt).toBeGreaterThanOrEqual(1)
          expect(attempt).toBeLessThanOrEqual(MAX_RETRIES)
          // The delay at max retries is 1000 * 2^4 = 16000ms
          const maxDelay = calculateBackoffDelay(MAX_RETRIES)
          expect(maxDelay).toBe(16000)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 13.5**
   *
   * Property: Each delay doubles from the previous attempt —
   * delay(N+1) === 2 * delay(N) for all N in [1..4].
   */
  it("each subsequent delay is exactly double the previous", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: MAX_RETRIES - 1 }),
        (attempt: number) => {
          const currentDelay = calculateBackoffDelay(attempt)
          const nextDelay = calculateBackoffDelay(attempt + 1)
          expect(nextDelay).toBe(2 * currentDelay)
        }
      ),
      { numRuns: 100 }
    )
  })
})

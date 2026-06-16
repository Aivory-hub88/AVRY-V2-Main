/**
 * Property-based test: WebSocket reconnection uses exponential backoff
 *
 * Feature: blog-and-careers, Property 17: WebSocket reconnection uses exponential backoff
 * Validates: Requirements 13.6
 *
 * For any retry attempt number N (1 through 5), the reconnection delay SHALL
 * follow the exponential backoff formula: base_delay * 2^(N-1), where base_delay
 * is 1000ms. After 5 failed retries the client SHALL stop attempting.
 */

import { describe, it, expect } from "vitest"
import fc from "fast-check"
import { computeReconnectDelay } from "../CareersWebSocketProvider"

describe("Feature: blog-and-careers, Property 17: WebSocket reconnection uses exponential backoff", () => {
  it("computes delay as 1000 * 2^(N-1) for any attempt N in [1..5]", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (attempt) => {
          const delay = computeReconnectDelay(attempt)
          const expected = 1000 * Math.pow(2, attempt - 1)
          expect(delay).toBe(expected)
        },
      ),
      { numRuns: 100 },
    )
  })

  it("produces strictly increasing delays as attempt number increases", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }),
        (attempt) => {
          const current = computeReconnectDelay(attempt)
          const next = computeReconnectDelay(attempt + 1)
          expect(next).toBeGreaterThan(current)
        },
      ),
      { numRuns: 100 },
    )
  })

  it("doubles the delay for each successive attempt", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }),
        (attempt) => {
          const current = computeReconnectDelay(attempt)
          const next = computeReconnectDelay(attempt + 1)
          expect(next).toBe(current * 2)
        },
      ),
      { numRuns: 100 },
    )
  })

  it("returns a positive integer delay for all valid attempts", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (attempt) => {
          const delay = computeReconnectDelay(attempt)
          expect(delay).toBeGreaterThan(0)
          expect(Number.isInteger(delay)).toBe(true)
        },
      ),
      { numRuns: 100 },
    )
  })
})

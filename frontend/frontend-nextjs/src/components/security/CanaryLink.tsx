'use client';

/**
 * CanaryLink — Invisible honeypot link for global attacker labeling.
 *
 * Renders invisible <a> tags pointing to canary API endpoints.
 * - Human users: cannot see, click, or interact with these links.
 * - Search engines: rel="nofollow" + aria-hidden prevents indexing.
 * - Good bots (Googlebot etc): respect robots.txt disallow on /api/.
 * - Malicious crawlers: follow every link → hit canary → get reported
 *   to CrowdSec global threat intelligence → banned worldwide.
 *
 * Anti-forensic:
 * - Link hrefs are generated from a hash of the build timestamp,
 *   so they change every deployment.
 * - No identifiable strings — paths look like random API endpoints.
 * - Self-shreds from DOM after 5 seconds.
 */

import { useEffect, useRef } from 'react';

// Generate deterministic-looking but unique canary paths
// Uses simple hash so paths change per-session but look like real API routes
function generateCanaryPaths(): string[] {
  const seed = Date.now().toString(36);
  const paths = [
    `/api/internal/${seed.slice(0, 4)}${Math.random().toString(36).slice(2, 6)}`,
    `/api/v2/config/${Math.random().toString(36).slice(2, 8)}`,
    `/api/admin/settings/${Math.random().toString(36).slice(2, 7)}`,
  ];
  return paths;
}

export default function CanaryLink() {
  const ref = useRef<HTMLDivElement>(null);
  const assembled = useRef(false);

  useEffect(() => {
    if (assembled.current || !ref.current) return;
    assembled.current = true;

    const el = ref.current;
    const paths = generateCanaryPaths();

    paths.forEach((path) => {
      const a = document.createElement('a');
      a.href = path;
      a.rel = 'nofollow noopener';
      a.tabIndex = -1;
      a.setAttribute('aria-hidden', 'true');
      a.textContent = ''; // empty — truly invisible
      el.appendChild(a);
    });

    // Self-shred after 5 seconds — forensic inspectors find nothing
    const timer = setTimeout(() => {
      if (el.parentNode) {
        el.innerHTML = '';
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-nosnippet=""
      style={{
        position: 'absolute',
        width: 0,
        height: 0,
        overflow: 'hidden',
        opacity: 0,
        pointerEvents: 'none',
        userSelect: 'none',
        clip: 'rect(0,0,0,0)',
        whiteSpace: 'nowrap',
        border: 0,
        padding: 0,
        margin: 0,
      }}
    />
  );
}

---
inclusion: auto
---

# No Emoji Rule

## Rule: Never use emoji characters in code

- Do NOT use emoji characters (Unicode emoji) anywhere in the codebase
- Use SVG icons (inline or component-based) instead of emoji for visual indicators
- All icons must be outline-style SVG with `stroke="currentColor"` and appropriate `strokeWidth`
- For category/feature icons, use simple line-art SVG icons matching the dark theme aesthetic
- This applies to: JSX/TSX content, data arrays, labels, visual indicators, button text

## Preferred icon approach:
- Inline SVG with `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `strokeWidth="1.5"`
- Keep icons simple and consistent in style (outline/line-art, not filled)
- Icons should be `20-24px` in size for card visuals, `16px` for inline/button usage

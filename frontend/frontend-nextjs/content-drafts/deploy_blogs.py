#!/usr/bin/env python3
"""Deploy blog drafts to the Aivory blog API."""

import json
import re
import sys
import urllib.request

API_URL = "http://172.18.0.18:8089/api/admin/posts"
TOKEN = "eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJhY2NvdW50X3R5cGUiOiAic3VwZXJhZG1pbiIsICJzdWIiOiAiZGVwbG95LXNjcmlwdCIsICJpYXQiOiAxNzg1OTA2ODAzLCAiZXhwIjogMTc4NTkxMDQwM30.Feg4gRNQbmx51XQtUn46xL7emC7E8TYctWrOefUROs4"
AUTHOR = "Aivory Editorial"

def markdown_to_blocks(text):
    """Convert markdown text to BlogContentBlock array."""
    blocks = []
    lines = text.strip().split("\n")

    i = 0
    while i < len(lines):
        line = lines[i]

        # Skip empty lines
        if not line.strip():
            i += 1
            continue

        # Heading
        heading_match = re.match(r"^(#{1,4})\s+(.+)", line)
        if heading_match:
            level = len(heading_match.group(1))
            blocks.append({"type": "heading", "text": heading_match.group(2).strip(), "level": level})
            i += 1
            # Skip the blank line after heading if present
            if i < len(lines) and not lines[i].strip():
                i += 1
            continue

        # Horizontal rule - skip
        if re.match(r"^[-*_]{3,}\s*$", line):
            i += 1
            continue

        # Table row - skip (converted as paragraph below)
        if line.startswith("|"):
            # Skip until we exit the table
            table_lines = []
            while i < len(lines) and lines[i].startswith("|"):
                row = lines[i].strip()
                if not re.match(r"^\|[\s\-:|]+\|$", row):  # skip separator rows
                    cells = [c.strip() for c in row.strip("|").split("|")]
                    table_lines.append(" · ".join(cells))
                i += 1
            if table_lines:
                blocks.append({"type": "paragraph", "text": "\n".join(table_lines)})
            continue

        # Paragraph: collect until blank line
        para_lines = []
        while i < len(lines) and lines[i].strip():
            para_lines.append(lines[i].strip())
            i += 1
        if para_lines:
            text = " ".join(para_lines)
            # Convert inline markdown links to plain text
            text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
            blocks.append({"type": "paragraph", "text": text})
        continue

    return blocks

def extract_title_and_excerpt(text):
    """Extract title from first # heading and excerpt from first paragraph."""
    lines = text.strip().split("\n")
    title = ""
    excerpt = ""

    for line in lines:
        m = re.match(r"^#\s+(.+)", line)
        if m and not title:
            title = m.group(1).strip()
            continue
        if title and line.strip() and not line.startswith("#"):
            excerpt = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", line.strip())
            break

    return title, excerpt[:160] if excerpt else ""

def post_post(title, body_blocks, excerpt):
    """POST a blog post to the admin API."""
    payload = {
        "title": title,
        "author_name": AUTHOR,
        "excerpt": excerpt,
        "thumbnail_url": None,
        "body": {"blocks": body_blocks},
        "status": "published",
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        API_URL,
        data=data,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {TOKEN}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            result = json.loads(resp.read().decode())
            return True, result
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        return False, f"HTTP {e.code}: {body}"
    except Exception as e:
        return False, str(e)

def main():
    files = sorted(sys.argv[1:])
    if not files:
        print("Usage: deploy_blogs.py file1.md [file2.md ...]")
        sys.exit(1)

    for path in files:
        print(f"\n--- {path} ---")
        with open(path) as f:
            text = f.read()

        title, excerpt = extract_title_and_excerpt(text)
        blocks = markdown_to_blocks(text)

        print(f"Title: {title}")
        print(f"Excerpt: {excerpt[:80]}...")
        print(f"Blocks: {len(blocks)}")

        success, result = post_post(title, blocks, excerpt)
        if success:
            slug = result.get("slug", "unknown")
            print(f"OK - slug: {slug}")
        else:
            print(f"FAILED: {result}")

if __name__ == "__main__":
    main()
